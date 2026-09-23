// ============================================================
// SILAHAR LOCAL WEB APP - 01_ConfigAndBridge.gs (v2-ready)
// ------------------------------------------------------------
// Migrasi Library v2 — perubahan vs versi lama:
//   - HAPUS TEST_MODE total (B1). Exchange selalu ke SSO asli.
//   - getEnvProperty WAJIB oper store app (anti config-shared 30 app).
//   - TAMBAH MASTER_SPREADSHEET_ID; wrappers teruskan masterSsId (B4/B5).
//   - SESSION_PREFIX = default v2 'APP_SESSION_<appCode>_' (B2).
//   - TTL session 6 jam = cap v2 (B16).
//   - invalidateSheetCache oper dbId (B3).
//   - TAMBAH getAppConfig_/APP_CONFIG kontrak dispatcher (§2 migrasi).
//   - TAMBAH ZZ_TEST_CRUD untuk runCoreTests.
//
// Riwayat skema:
//   - Gate 0 (2026-09-17): AUDIT_LOGS & MAIN_DATA dipangkas (warisan, tak
//     ada pemakai; audit diurusi CoreLib). KATEGORI_KEGIATAN dipangkas
//     (dead schema) — dicatat di BRD sebagai fitur masa depan; sheet fisik
//     di Spreadsheet dibiarkan (tidak dihapus). Folder Drive IDs dihapus
//     (upload bukti = fitur masa depan; file_url tetap manual).
//   - G18a (2026-09-18, e-Kinerja Harian): 6 sheet bisnis ditambahkan —
//     3 master (RHK_SKP, JENIS_TUGAS, SATUAN) + 3 tabel (RENCANA_HARIAN,
//     REKAP_BULANAN, LAMPIRAN_BUKTI). Total sheet aktif = 9.
//   - G18d (2026-09-19, adopsi CoreLib v2.4.0):
//     * todayIso_() DIGANTI dari CoreLib.todayIso() (UTC) menjadi
//       CoreLib.todayIsoLocal() (WIB). FIX bug laten: tanggal default
//       form & tanggal_verifikasi sebelumnya bisa mundur 1 hari untuk
//       user WIB yang akses sebelum 07:00.
//     * TAMBAH wrapper eksplisit todayIsoLocal_() & dateKey10_().
//
// Perilaku tulis v2 (tanpa ubah signature wrapper):
//   B7  update ID-asing DITOLAK
//   B8  duplikat PK DITOLAK
//   B9  null/'' = kosongkan
//   B10 field audit otoritas server
// ============================================================

var APP_TITLE = 'SI-LAPORAN-HARIAN';
var APP_CODE  = 'SILAHAR';

// URL Portal Utama SSO Pusat (Fallback bila Properties kosong).
// PENTING: pastikan PLATFORM_API_URL di Script Properties sudah diisi
// dengan URL deployment SI-PLATFORM terbaru. Fallback ini hanya jaring
// pengaman — bila salah, login gagal.
var DEFAULT_PLATFORM_URL = 'https://script.google.com/macros/s/AKfycbwh_OUVqmxLcuF81FHmPZtT33Wrm8Ce9Da1SQ3hfkSr7gM5P8ofyAlHSgW40mq3eo-PoQ/exec';

// Store MILIK APP INI. Wajib dioper ke getEnvProperty — tanpa ini,
// library membaca Properties MILIK LIBRARY (dipakai bersama 30 app)!
function appProps_() { return PropertiesService.getScriptProperties(); }

var SPREADSHEET_ID = CoreLib.getEnvProperty('SPREADSHEET_ID', appProps_()) || (function() {
  try { return SpreadsheetApp.getActiveSpreadsheet().getId(); } catch (e) { return ''; }
})();

// WAJIB DIISI di Script Properties: ID spreadsheet SIMPEG pusat (database master).
var MASTER_SPREADSHEET_ID = CoreLib.getEnvProperty('MASTER_SPREADSHEET_ID', appProps_());

// Membaca dari Properties app ini, jika kosong memakai DEFAULT_PLATFORM_URL
var PLATFORM_API_URL = appProps_().getProperty('PLATFORM_API_URL') || DEFAULT_PLATFORM_URL;

var SESSION_PREFIX     = 'APP_SESSION_' + APP_CODE + '_'; // default v2 (B2) — samakan di router localConfig!
var SESSION_TTL_SECONDS = 6 * 60 * 60;                    // 6 jam = cap v2 (B16)
var DATA_CACHE_TTL      = 180;                            // 3 menit
var ROLE_LEVELS         = CoreLib.MASTER_ROLE_LEVELS;

// ==================== §1b TEMA PER-APP (CoreLib v2.4.0 C8) ====================
// THEME_JSON disimpan di Script Properties sebagai JSON string:
//   {"primary":"#059669","preset":"emerald"}  (6 preset: emerald/sky/amber/violet/rose/teal)
// Frontend inject via <?!= getThemeCss() ?> di Index.html + <app-theme-picker>.
// Default: emerald (#059669) bila properti kosong.
var DEFAULT_THEME = { primary: '#059669', preset: 'emerald' };

function getThemeConfig_() {
  try { return CoreLib.getThemeConfig(appProps_(), DEFAULT_THEME); }
  catch (e) { return DEFAULT_THEME; }
}

// Dipanggil oleh Index.html template: <?!= getThemeCss() ?>
function getThemeCss() {
  try { return CoreLib.getThemeCss(appProps_(), DEFAULT_THEME); }
  catch (e) { return ':root{--primary:#059669}'; }
}

// Dipanggil oleh handler save_theme (admin) untuk simpan THEME_JSON
function saveThemeConfig_(obj) {
  if (!obj || !obj.primary) throw new Error('Tema tidak valid.');
  return CoreLib.buildThemeCss ? CoreLib.buildThemeCss(obj) : getThemeCss();
}

// ==================== §1c SCOPE "SAYA" (RLS ownerField) ====================
// Helper untuk filter Saya/Semua di handler utama.
// Di frontend: AppCore.getMyScope() → 'mine' | 'all' (disimpan localStorage)
// Di backend: filter rows where row.pegawai_id === session.pegawai_id
// resources declaratif untuk dispatcher: auto-RLS bila set ownerField
var SCOPE_OWNER_FIELD = 'pegawai_id'; // kolom pemilik di RENCANA_HARIAN/LAPORAN_HARIAN

function filterByScope_(rows, scope, session) {
  if (scope === 'mine' && session && session.pegawai_id) {
    return rows.filter(function(r){ return String(r[SCOPE_OWNER_FIELD]||'') === String(session.pegawai_id); });
  }
  return rows;
}

// ==================== §1d WORKFLOW & PERIODE (CoreLib v2.4.0 A+B) ====================
// STATUS_MAP untuk validateTransition (C4) — transisi legal per resource
var STATUS_MAP = {
  'RENCANA_HARIAN': {
    'direncanakan': ['dikerjakan', 'batal'],
    'dikerjakan':   ['selesai', 'batal'],
    'selesai':      ['diverifikasi'],
    'diverifikasi': [],
    'batal':        []
  },
  'LAPORAN_HARIAN': {
    'baru':      ['diproses', 'arsip'],
    'diproses':  ['selesai', 'tertunda'],
    'tertunda':  ['diproses', 'arsip'],
    'selesai':   ['arsip'],
    'arsip':     []
  },
  'REKAP_BULANAN': {
    'draft': ['final', 'batal'],
    'final': ['arsip'],
    'batal': [],
    'arsip': []
  }
};

// Wrapper tipis — biar app bisa panggil tanpa import CoreLib langsung
function periodeBulan_(tanggalStr){ try{ return CoreLib.periodeBulan(tanggalStr); }catch(e){ return ''; } }
function dalamPeriode_(tgl, start, end){ try{ return CoreLib.dalamPeriode(tgl, start, end); }catch(e){ return false; } }
function hitungHariKerja_(start, end){ try{ return CoreLib.hitungHariKerja(start, end); }catch(e){ return 0; } }
function findUnique_(sheet, field, value){ return CoreLib.findUnique(SPREADSHEET_ID, sheet, field, value, getAllHeaders_()); }

// TEST_MODE DIHAPUS (B1) — login selalu via SSO asli.

// ==================== SCHEMA CANONICAL LOKAL ====================
// 9 sheet aktif: 3 fondasi + 6 e-Kinerja (G18a).
var LOCAL_SHEET_NAMES = {
  // Fondasi (Gate 0)
  LAPORAN_HARIAN: 'LAPORAN_HARIAN',
  KONFIGURASI:    'KONFIGURASI',
  ZZ_TEST_CRUD:   'ZZ_TEST_CRUD',
  // G18a (2026-09-18, e-Kinerja Harian): master bisnis 3 + tabel bisnis 3
  RHK_SKP:        'RHK_SKP',
  JENIS_TUGAS:    'JENIS_TUGAS',
  SATUAN:         'SATUAN',
  RENCANA_HARIAN: 'RENCANA_HARIAN',
  REKAP_BULANAN:  'REKAP_BULANAN',
  LAMPIRAN_BUKTI: 'LAMPIRAN_BUKTI'
};

var LOCAL_SHEET_HEADERS = {
  LAPORAN_HARIAN: [
    'id', 'pegawai_id', 'tanggal', 'waktu_mulai', 'waktu_selesai', 'durasi_menit',
    'kategori_id', 'jenis_kegiatan', 'deskripsi', 'hasil', 'kendala', 'tindak_lanjut',
    'lokasi', 'file_url', 'status_verifikasi', 'catatan_atasan', 'verifikator_id', 'tanggal_verifikasi',
    // G18a: kolom realisasi e-Kinerja (legacy jenis_kegiatan/kategori_id/lokasi dibekukan)
    'rhk_id', 'rencana_id', 'jenis_tugas_id', 'volume', 'satuan_id',
    'created_at', 'updated_at', 'created_by', 'updated_by', 'deleted_at'
  ],
  KONFIGURASI: ['id', 'key', 'value', 'keterangan', 'created_at', 'updated_at', 'created_by', 'updated_by', 'deleted_at'],
  // Sheet sekali-pakai untuk runCoreTests (aman di DB produksi — 1 sheet kosong).
  ZZ_TEST_CRUD: ['id', 'laporan_id', 'nama', 'no_hp', 'catatan_baru'],

  // M1: kontrak kinerja per pegawai per periode (target tahunan; periode RHK = TAHUNAN)
  RHK_SKP: [
    'id', 'pegawai_id', 'periode_tahun', 'jenis_rhk', 'klasifikasi', 'nama_rhk', 'indikator',
    'satuan_id', 'target_tahunan', 'rhk_atasan_id', 'status',
    'created_at', 'updated_at', 'created_by', 'updated_by', 'deleted_at'
  ],
  // M2: kamus jenis tugas (seed: utama/tambahan/inovatif/tugas_lain)
  JENIS_TUGAS: ['id', 'kode', 'nama', 'keterangan', 'status', 'created_at', 'updated_at', 'created_by', 'updated_by', 'deleted_at'],
  // M3: kamus satuan output hasil kerja
  SATUAN: ['id', 'kode', 'nama', 'keterangan', 'status', 'created_at', 'updated_at', 'created_by', 'updated_by', 'deleted_at'],

  // T2: papan rencana harian (kanban/kalender)
  RENCANA_HARIAN: [
    'id', 'pegawai_id', 'tanggal_rencana', 'rhk_id', 'jenis_tugas_id', 'rencana_hasil',
    'prioritas', 'status', 'realisasi_id',
    'created_at', 'updated_at', 'created_by', 'updated_by', 'deleted_at'
  ],
  // T3: Laporan SKP Bulanan (periodik bulanan; unik pegawai+periode)
  REKAP_BULANAN: [
    'id', 'pegawai_id', 'periode', 'total_rencana', 'total_realisasi', 'total_diverifikasi',
    'total_revisi', 'capaian_pct', 'capaian_rhk_json', 'kandidat_predikat', 'status_rekap', 'generated_at',
    'created_at', 'updated_at', 'created_by', 'updated_by', 'deleted_at'
  ],
  // T4: bukti dukung per realisasi (multi)
  LAMPIRAN_BUKTI: ['id', 'realisasi_id', 'jenis_bukti', 'url', 'nama_bukti', 'keterangan', 'created_at', 'updated_at', 'created_by', 'updated_by', 'deleted_at']
};

// ==================== BRIDGE HELPER WRAPPERS ====================

function getAllHeaders_() {
  return Object.assign({}, CoreLib.MASTER_SHEET_HEADERS, LOCAL_SHEET_HEADERS);
}

function getCanonicalSheetName_(sheetName) {
  return CoreLib.getCanonicalSheetName(sheetName, LOCAL_SHEET_NAMES)
      || String(sheetName || '').toUpperCase().trim();
}

function isReferenceSheet_(sheetName) {
  return CoreLib.isReferenceSheet(sheetName);
}

function getDb_()         { return CoreLib.getDb(SPREADSHEET_ID); }
function ensureSheet_(s)  { return CoreLib.ensureSheet(SPREADSHEET_ID, getCanonicalSheetName_(s), getAllHeaders_()); }
function initDatabase_()  { return CoreLib.initDatabase(SPREADSHEET_ID, getAllHeaders_(), isReferenceSheet_); }

// Baca: teruskan masterSsId agar PEGAWAI/JABATAN/UNIT_KERJA dibaca dari MASTER (B5).
function readRecordsNoLock_(sheetName) {
  return CoreLib.readRecordsNoLock(SPREADSHEET_ID, getCanonicalSheetName_(sheetName), getAllHeaders_(), { masterSsId: MASTER_SPREADSHEET_ID });
}
function getSheetDataCached_(sheetName) {
  return CoreLib.getSheetDataCached(SPREADSHEET_ID, getCanonicalSheetName_(sheetName), getAllHeaders_(), DATA_CACHE_TTL, { masterSsId: MASTER_SPREADSHEET_ID });
}

// Tulis: pkField opsional (auto-deteksi aman — semua sheet lokal punya kolom 'id').
function toSheetRow_(sheetName, record)             { return CoreLib.toSheetRow(getCanonicalSheetName_(sheetName), record, getAllHeaders_()); }
function writeRecordNoLock_(sheetName, record, isUpdate, actor, pkField) {
  return CoreLib.writeRecordNoLock(SPREADSHEET_ID, getCanonicalSheetName_(sheetName), record, isUpdate, actor, getAllHeaders_(), isReferenceSheet_, pkField);
}
function softDeleteRecordNoLock_(sheetName, id, actor, pkField) {
  return CoreLib.softDeleteRecordNoLock(SPREADSHEET_ID, getCanonicalSheetName_(sheetName), id, actor, getAllHeaders_(), isReferenceSheet_, pkField);
}
function hardDeleteRecordNoLock_(sheetName, id, actor, pkField) {
  return CoreLib.hardDeleteRecordNoLock(SPREADSHEET_ID, getCanonicalSheetName_(sheetName), id, actor, isReferenceSheet_, pkField);
}

// B3: dbId WAJIB — tanpa ini cache v2 tidak terhapus (data basi walau sudah save).
function invalidateSheetCache_(sheetName) {
  var canonical = getCanonicalSheetName_(sheetName);
  CoreLib.invalidateSheetCache(canonical, SPREADSHEET_ID);
  if (MASTER_SPREADSHEET_ID && isReferenceSheet_(canonical)) {
    CoreLib.invalidateSheetCache(canonical, MASTER_SPREADSHEET_ID);
  }
}

// ==================== BRIDGE SSO & UTILITIES ====================
function logInfo(ctx, msg)            { CoreLib.logInfo(ctx, msg); }
function logWarn(ctx, msg)            { CoreLib.logWarn(ctx, msg); }
function logError(ctx, err)           { CoreLib.logError(ctx, err); }
function makeId_(prefix)              { return CoreLib.makeId(prefix); }
function nowIso_()                    { return CoreLib.nowIso(); }

// G18d (2026-09-19): todayIso_() SEBELUMNYA = CoreLib.todayIso() (UTC).
// Bug laten: default tanggal form & tanggal_verifikasi bisa mundur 1 hari
// untuk user WIB yang akses sebelum 07:00. Diganti ke todayIsoLocal() (WIB).
function todayIso_()                  { return CoreLib.todayIsoLocal(); }
// Alias eksplisit untuk kode yang mau jelas-jelas pakai WIB.
function todayIsoLocal_()             { return CoreLib.todayIsoLocal(); }
// (dateKey10_ didefinisikan di 02_AppLogic.gs — di sana di-delegasi ke CoreLib.dateKey10)

function safeUser_(user)              { return CoreLib.safeUser(user); }
function acquireLock_()               { return CoreLib.acquireLock(); }
function parseTanggalBackend_(val)    { return CoreLib.parseTanggalBackend(val); }
function hitungDurasiMenit_(w1, w2)   { return CoreLib.hitungDurasiMenit(w1, w2); }
function systemActor_()               { return CoreLib.systemActor(); }

// B1: argumen testMode lama diganti false (abaikan mode palsu).
function validatePlatformTicket_(ticket) {
  return CoreLib.validatePlatformTicket(ticket, PLATFORM_API_URL, false, APP_CODE);
}
// masterSsId dioper agar session terisi pegawai_id/nip dari master (H2).
function exchangePlatformTicket(ticket) {
  return CoreLib.exchangePlatformTicket(ticket, {
    sessionPrefix:  SESSION_PREFIX,
    ttlSeconds:     SESSION_TTL_SECONDS,
    platformApiUrl: PLATFORM_API_URL,
    appCode:        APP_CODE,
    masterSsId:     MASTER_SPREADSHEET_ID
  });
}
function logout_(token)             { return CoreLib.logoutUser(token, SESSION_PREFIX); }
function checkAuth_(token, minLvl)  { return CoreLib.checkAuth(token, minLvl, SESSION_PREFIX, ROLE_LEVELS); }

// ==================== KONTRAK DISPATCHER v2 (§2 migrasi) ====================
// Router (doPost) WAJIB memakai ini sebagai localConfig agar prefix/headers
// sama persis dengan wrapper di atas. Jangan rakit localConfig manual.
function getAppConfig_() {
  return {
    appCode:         APP_CODE,
    spreadsheetId:   SPREADSHEET_ID,
    masterSsId:      MASTER_SPREADSHEET_ID,
    platformApiUrl:  PLATFORM_API_URL,
    sessionPrefix:   SESSION_PREFIX,
    ttlSeconds:      SESSION_TTL_SECONDS,
    roleLevels:      ROLE_LEVELS,
    headersMap:      getAllHeaders_(),
    pkFields:        {},   // opsional — auto-deteksi 'id' sudah cukup

    // Tahap 3 — deklaratif scope & workflow (CoreLib v2.4.0)
    resources: {
      RENCANA_HARIAN: { ownerField: SCOPE_OWNER_FIELD },
      LAPORAN_HARIAN: { ownerField: SCOPE_OWNER_FIELD },
      REKAP_BULANAN:  { ownerField: SCOPE_OWNER_FIELD }
    },
    statusMap: STATUS_MAP,

    // Level aksi (fail-closed: default dispatcher untuk aksi tak dikenal = viewer).
    //   save_my_profile  : viewer (email diambil dari session, aman)
    //   get_config       : admin  (frontend non-admin tak butuh config)
    //   verifikasi_*     : admin  (lapis 1; lapis 2 = cek di handler)
    //   save_rhk / delete_rhk / save_jenis_tugas / save_satuan : admin (G18b FRD v2)
    //   generate_rekap_bulanan : admin
    //   viewer* (save_rencana / move_status_rencana / delete_rencana /
    //           save_realisasi / delete_realisasi) = default viewer
    //           + guard kepemilikan di handler (FR-22).
    //   get_* = default viewer.
    actionLevels: {
      save_my_profile:       'viewer',
      get_config:            'admin',
      verifikasi_laporan:    'admin',
      save_rhk:              'admin',
      delete_rhk:            'admin',
      save_jenis_tugas:      'admin',
      save_satuan:           'admin',
      verifikasi_realisasi:  'admin',
      get_antrian_verifikasi:'admin',
      generate_rekap_bulanan:'admin',
      get_theme:             'viewer',
      save_theme:            'admin'
    },

    // Aksi generik save/delete LAPORAN_HARIAN: default v2 (admin). Frontend
    // TIDAK memakai jalur generik untuk laporan — melainkan handler khusus
    // save_laporan/delete_laporan (proteksi pemilik) + verifikasi_laporan.
    // Defense in depth: jalur generik via DevTools tetap tertolak untuk viewer.
    entityPermissions: {},

    isRefSheetFunc: isReferenceSheet_,
    localHandlers: {
      get_theme: function(data, user){ return { success:true, data: getThemeConfig_() }; },
      save_theme: function(data, user){ var css = saveThemeConfig_(data); appProps_().setProperty('THEME_JSON', JSON.stringify(data)); return { success:true, data: getThemeConfig_(), css: css }; }
    }
  };
}
var APP_CONFIG = getAppConfig_();
