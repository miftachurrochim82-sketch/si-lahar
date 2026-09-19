// ============================================================
// SILAHAR - 04_KinerjaUtils.gs (G18b-split, 2026-09-18; revisi G18d 2026-09-19)
// ------------------------------------------------------------
// Util bersama e-Kinerja: enum whitelist, guard, helper baca/tulis,
// predikat, hari kerja + REGISTRASI SEMUA AKSI (kinerjaHandlers_).
// Bagian dari pemecahan 04_KinerjaApi.gs per domain (pola
// si-kompetensi). Helper bersama ada di 04_KinerjaUtils.gs;
// registrasi aksi ada di kinerjaHandlers_() (04_KinerjaUtils).
//
// Catatan dashboard:
//   Dashboard v1 (apiDashboard_/getAnalytics_ di 02_AppLogic) masih hidup
//   berdampingan dengan v2 (ekDashboardKinerja_/ekAnalisaKinerja_ di sini).
//   Frontend harus memilih satu; bila v1 sudah tidak dipakai, hapus
//   'dashboard'/'analytics' dari handleAction di 02_AppLogic.
//
// G18d (2026-09-19, adopsi CoreLib v2.3.0):
//   - ekEnum_() → delegasi CoreLib.whitelist() (dengan try-catch: whitelist
//     melempar exception, ekEnum_ lama return dflt — cermin setia perilaku).
//   - ekDalamPeriode_() & ekPeriodeBulan_() → konsisten pakai helper WIB
//     (todayIsoLocal_ & tanggalKey10_ yang sudah sadar zona waktu).
// ============================================================

// -------------------- ENUM WHITELIST (FR-23) --------------------
// Object.freeze mencegah reassign tidak sengaja di runtime.
var EK_ENUM = Object.freeze({
  jenis_rhk:        ['utama', 'tambahan'],
  klasifikasi:      ['individu', 'organisasi'],
  status_master:    ['aktif', 'nonaktif'],
  prioritas:        ['biasa', 'penting', 'mendesak'],
  status_rencana:   ['direncanakan', 'dikerjakan', 'selesai', 'diverifikasi', 'batal'],
  status_verifikasi:['menunggu', 'disetujui', 'revisi'],
  jenis_bukti:      ['link', 'file', 'foto', 'notulen'],
  status_rekap:     ['draf', 'final']
});

// FR-06: transisi legal non-admin. 'diverifikasi' HANYA via alur verifikasi.
var EK_TRANSISI_RENCANA = Object.freeze({
  direncanakan: ['dikerjakan', 'batal'],
  dikerjakan:   ['selesai', 'batal'],
  selesai:      [],
  diverifikasi: [],
  batal:        []
});

// -------------------- HELPER UMUM --------------------
function ekFail_(code, msg) { return { success: false, code: code, error: msg }; }

function ekRows_(sheet) {
  return readRecordsNoLock_(sheet).filter(function (r) { return !r.deleted_at; });
}

function ekFind_(sheet, id) {
  var t = String(id || '').trim();
  if (!t) return null;
  var rows = ekRows_(sheet);
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i].id || '').trim() === t) return rows[i];
  }
  return null;
}

function ekEnumOk_(v, list) { return list.indexOf(String(v == null ? '' : v).toLowerCase().trim()) >= 0; }

// G18d (2026-09-19): delegasi ke CoreLib.whitelist (v2.2.0).
//   CoreLib.whitelist THROW bila tak match; ekEnum_ lama return dflt.
//   Cermin setia perilaku via try-catch: return nilai kanonik dari `list`,
//   atau `dflt` bila tidak match. Call-site TIDAK berubah.
function ekEnum_(v, list, dflt) {
  try {
    return CoreLib.whitelist(v, list, 'enum');
  } catch (e) {
    return dflt || '';
  }
}

function ekNum_(v) { var n = Number(v); return isNaN(n) ? 0 : n; }

// Master aktif (M1/M2/M3): return row bila id ada & status aktif.
function ekMasterAktif_(sheet, id) {
  var row = ekFind_(sheet, id);
  if (!row) return null;
  return String(row.status || 'aktif').toLowerCase() === 'aktif' ? row : null;
}

// Referensi SIMPEG (tolerant reader): pegawai_id harus dikenal master.
function ekPegawaiDikenal_(pid) {
  var t = String(pid || '').trim();
  if (!t) return false;
  try {
    var refs = getSheetDataCached_('PEGAWAI');
    for (var i = 0; i < refs.length; i++) {
      if (String(refs[i].pegawai_id || '').trim() === t) return true;
    }
  } catch (e) { /* master tak terbaca — jangan blokir app (tolerant reader) */ }
  return false;
}

// Guard kepemilikan viewer (FR-22): return null bila boleh, atau response tolak.
function ekGuardMilik_(actor, pegawaiIdRow) {
  if (isAdminActor_(actor)) return null;
  var myPeg = actorPegawaiId_(actor);
  if (!myPeg) return ekFail_('FORBIDDEN', 'Akun Anda belum terhubung ke data pegawai. Hubungi admin.');
  if (String(pegawaiIdRow || '').trim() !== myPeg) {
    return ekFail_('FORBIDDEN', 'Anda hanya boleh mengelola data milik sendiri.');
  }
  return null;
}

// Periode bulan 'yyyy-MM' (default: bulan berjalan WIB).
// G18d: todayIso_() sudah WIB (delegasi CoreLib.todayIsoLocal di 01).
function ekPeriodeBulan_(v) {
  var s = String(v || '').trim();
  if (/^\d{4}-\d{2}$/.test(s)) return s;
  return todayIso_().slice(0, 7);
}

// G18d: tanggalKey10_ sudah delegasi CoreLib.dateKey10 (sadar WIB) di 02_AppLogic.
function ekDalamPeriode_(tanggalVal, periode) {
  return String(tanggalKey10_(tanggalVal) || '').slice(0, 7) === periode;
}

// Hari kerja Senin-Jumat dari tanggalKeyA s.d. tanggalKeyB (inklusif).
// Catatan: belum ada padanan CoreLib — kandidat promosi C6 (v2.4.0+).
function ekHariKerja_(keyA, keyB) {
  var a = parseTanggalBackend_(keyA), b = parseTanggalBackend_(keyB);
  if (!a || !b || isNaN(a.getTime()) || isNaN(b.getTime())) return 0;
  var n = 0;
  for (var d = new Date(a.getTime()); d <= b; d.setDate(d.getDate() + 1)) {
    var h = d.getDay();
    if (h !== 0 && h !== 6) n++;
  }
  return n;
}

// Predikat kuantitas (DIKUNCI Gate 0: v1 = kuantitas saja).
// Skala PermenPANRB 6/2022 — nilai ambang boleh dikoreksi pemilik.
function ekPredikat_(pct) {
  var p = ekNum_(pct);
  if (p >= 120) return 'Sangat Baik';
  if (p >=  90) return 'Baik';
  if (p >=  70) return 'Cukup';
  if (p >=  50) return 'Kurang';
  return 'Sangat Kurang';
}

function ekUrutTanggalDesc_(rows, field) {
  var f = field || 'tanggal';
  rows.sort(function (a, b) {
    var ta = tanggalKey10_(a[f]), tb = tanggalKey10_(b[f]);
    return tb < ta ? -1 : (tb > ta ? 1 : 0);
  });
  return rows;
}

// Pemakai master (FR-02/03: entri terpakai hanya boleh dinonaktifkan).
function ekMasterDipakai_(sheet, idField, id) {
  var t = String(id || '').trim();
  var rows = ekRows_(sheet);
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i][idField] || '').trim() === t) return true;
  }
  return false;
}
function ekJenisTugasDipakai_(id) {
  return ekMasterDipakai_('RENCANA_HARIAN', 'jenis_tugas_id', id) ||
         ekMasterDipakai_('LAPORAN_HARIAN', 'jenis_tugas_id', id);
}
function ekSatuanDipakai_(id) {
  return ekMasterDipakai_('RHK_SKP',        'satuan_id', id) ||
         ekMasterDipakai_('LAPORAN_HARIAN', 'satuan_id', id);
}

// ==================== REGISTRASI HANDLER ====================
// Digabung ke cfg.localHandlers oleh handleAction (02_AppLogic).
// Level aksi dideklarasikan di actionLevels (01_ConfigAndBridge).
function kinerjaHandlers_() {
  return {
    // FR-01..FR-04: RHK
    'get_rhk_list':        ekGetRhkList_,
    'save_rhk':            ekSaveRhk_,
    'delete_rhk':          ekDeleteRhk_,

    // FR-02/03: kamus
    'get_jenis_tugas_list':ekGetJenisTugasList_,
    'get_satuan_list':     ekGetSatuanList_,
    'save_jenis_tugas':    ekSaveJenisTugas_,
    'save_satuan':         ekSaveSatuan_,

    // FR-05..FR-09: rencana
    'get_rencana_list':    ekGetRencanaList_,
    'save_rencana':        ekSaveRencana_,
    'move_status_rencana': ekMoveStatusRencana_,
    'delete_rencana':      ekDeleteRencana_,

    // FR-10..FR-14: realisasi + bukti
    'get_realisasi_list':  ekGetRealisasiList_,
    'save_realisasi':      ekSaveRealisasi_,
    'delete_realisasi':    ekDeleteRealisasi_,

    // FR-15/16: verifikasi
    'verifikasi_realisasi':ekVerifikasiRealisasi_,
    'get_antrian_verifikasi': ekAntrianVerifikasi_,

    // FR-17/18: Laporan SKP Bulanan
    'generate_rekap_bulanan': ekGenerateRekap_,
    'get_rekap_list':         ekGetRekapList_,

    // FR-19/20: dashboard & analisa (v1 dashboard/analytics tetap hidup s.d. G18c)
    'dashboard_kinerja':  ekDashboardKinerja_,
    'analisa_kinerja':    ekAnalisaKinerja_
  };
}
