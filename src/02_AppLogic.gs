// ============================================================
// SILAHAR LOCAL WEB APP - 02_AppLogic.gs (v2-ready + patch review-frontend)
// ------------------------------------------------------------
// Patch hasil review frontend (P1–P8):
//   - P1: hook generate id bila kosong (semua entitas) — cegah PK jatuh
//         ke pegawai_id (bug: laporan ke-2 user menimpa laporan ke-1!).
//   - P2: hook KUNCI field verifikasi di jalur save generik (baru='menunggu',
//         update=warisi baris lama). Satu-satunya penulis = handler verifikasi.
//   - P3: getLaporanList_ dukung search (deskripsi/hasil/kendala/TL/jenis/tgl).
//   - P4: handler get_riwayat_list (filter tanggal robust + search + meta).
//   - P5: handler save_laporan/delete_laporan (proteksi pemilik, opsi A).
//   - P6: handler verifikasi_laporan (khusus admin).
//   - P7: getAnalytics_ tambah by_tanggal + by_pegawai (2 kartu sembuh).
//   - P8: get_my_profile diperkaya pangkat_golongan dari master.
//
// Catatan G18c:
//   - Handler v1 (dashboard/analytics) masih hidup berdampingan dengan
//     v2 (dashboard_kinerja/analisa_kinerja). Bila v1 tak lagi dipakai
//     frontend, hapus dua baris 'dashboard'/'analytics' di handleAction.
//
// G18d (2026-09-19, adopsi CoreLib v2.3.0):
//   - tanggalKey10_()  → delegasi CoreLib.dateKey10()  (~15 baris duplikat dihapus)
//   - paginate_()      → delegasi CoreLib.paginate()   (~13 baris duplikat dihapus)
//   - matchSearch_()   → delegasi CoreLib.matchSearch() (~7 baris duplikat dihapus)
//   Call-site TIDAK berubah — wrapper lokal tetap ada
//   (CoreLib First: delegasi, jangan salin).
// ============================================================

/**
 * Entry point HTTP GET (Web App UI Entry)
 */
function doGet(e) {
  var template = HtmlService.createTemplateFromFile('Index');
  template.sessionToken = '';
  template.user = {};
  return template.evaluate()
    .setTitle(APP_TITLE)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT);
}

/**
 * Entry point HTTP POST (API Endpoint)
 */
function doPost(e) {
  var body = {};
  try {
    if (e && e.postData && e.postData.contents) {
      body = JSON.parse(e.postData.contents);
    }
  } catch (err) {
    return CoreLib.jsonResponse({ success: false, code: 'BAD_REQUEST', error: 'Format JSON payload tidak valid.' });
  }
  var result = handleAction(body);
  return CoreLib.jsonResponse(result);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * Dispatcher lokal: APP_CONFIG + handler khas SILAHAR -> dispatcher v2.
 */
function handleAction(payload) {
  var cfg = getAppConfig_();
  cfg.preSaveHook  = localPreSaveHook_;
  cfg.localHandlers = {
    // Laporan harian v1 (masih dipakai halaman Riwayat/Realisasi legacy)
    'get_laporan_list':  typeof getLaporanList_ === 'function'  ? getLaporanList_  : null,
    'get_riwayat_list':  typeof getRiwayatList_ === 'function'  ? getRiwayatList_  : null,
    'save_laporan':      typeof saveLaporanHandler_ === 'function'   ? saveLaporanHandler_   : null,
    'delete_laporan':    typeof deleteLaporanHandler_ === 'function' ? deleteLaporanHandler_ : null,
    'verifikasi_laporan':typeof verifikasiLaporanHandler_ === 'function' ? verifikasiLaporanHandler_ : null,
    // Dashboard v1 (legacy) — hapus dua baris ini bila sudah tidak dipakai.
    'dashboard':         typeof apiDashboard_ === 'function' ? apiDashboard_ : null,
    'analytics':         typeof getAnalytics_ === 'function' ? getAnalytics_ : null,
    // Referensi SIMPEG
    'get_pegawai_list':  typeof getPegawaiList_ === 'function' ? getPegawaiList_ : null,
    'get_unit_list':     typeof getUnitList_ === 'function'    ? getUnitList_    : null,
    'get_jabatan_list':  typeof getJabatanList_ === 'function' ? getJabatanList_ : null,
    'get_my_profile':    function(d, user) { return getMyProfileEnriched_(user); },
    'save_my_profile':   function(d, user) { return saveMyProfile_(d, user); }
  };

  // G18b: handler e-Kinerja Harian (04_KinerjaUtils + 05..09 per domain) — FR-01..FR-20.
  if (typeof kinerjaHandlers_ === 'function') {
    var kh = kinerjaHandlers_();
    Object.keys(kh).forEach(function (k) { cfg.localHandlers[k] = kh[k]; });
  }

  return CoreLib.dispatchAction(payload, cfg);
}

// ==================== HELPER AKTOR & CARI ====================
function actorRole_(actor)       { return String((actor && actor.role) || 'viewer').toLowerCase(); }
function isAdminActor_(actor)    { var r = actorRole_(actor); return r === 'admin' || r === 'super'; }
function actorPegawaiId_(actor)  { return String((actor && actor.pegawai_id) || '').trim(); }

function findLaporanById_(id) {
  var target = String(id || '').trim();
  if (!target) return null;
  var rows = readRecordsNoLock_('LAPORAN_HARIAN');
  normalizeJenisRows_(rows); // G16: form edit melihat nilai ternormalisasi
  for (var i = 0; i < rows.length; i++) {
    if (!rows[i].deleted_at && String(rows[i].id || '').trim() === target) return rows[i];
  }
  return null;
}

// G18d: delegasi ke CoreLib.matchSearch (v2.3.0).
//   Signature sama: (row, q, fields) → boolean.
//   q kosong → true. fields kosong/null → false.
//   Cermin setia perilaku lama; call-site TIDAK berubah.
function matchSearch_(row, q, fields) {
  return CoreLib.matchSearch(row, q, fields);
}
var LAPORAN_SEARCH_FIELDS = ['deskripsi', 'hasil', 'kendala', 'tindak_lanjut', 'jenis_kegiatan', 'tanggal'];

// ------------------------------------------------------------
// G16 (2026-09-18): whitelist + normalizer jenis kegiatan.
// LEGACY v1 — v2 memakai jenis_tugas_id (master JENIS_TUGAS).
// Kolom jenis_kegiatan dibekukan untuk data lama.
//
// Sebagian baris WARISAN di sheet LAPORAN_HARIAN punya kolom jenis_kegiatan
// di luar daftar (mis. timestamp ISO) sehingga legenda chart menampilkan
// nilai mentah. Semua jalur baca (dashboard/analisa/list) menormalisasi ke
// whitelist; nilai tak dikenal masuk keranjang 'lainnya' TANPA mengubah data
// sheet. Perbaikan permanen: auditJenisKegiatan() + perbaikiJenisKegiatan()
// di 99_Test.gs, atau edit sel langsung di spreadsheet.
// ------------------------------------------------------------
var JENIS_VALID_ = ['rutin', 'insidental', 'khusus', 'lapangan', 'administrasi'];
function normalizeJenis_(v) {
  var j = String(v == null ? '' : v).toLowerCase().trim();
  return JENIS_VALID_.indexOf(j) >= 0 ? j : 'lainnya';
}
function normalizeJenisRows_(rows) {
  (rows || []).forEach(function (r) { r.jenis_kegiatan = normalizeJenis_(r.jenis_kegiatan); });
  return rows;
}

// G18d (2026-09-19): delegasi ke CoreLib.dateKey10 (v2.3.0).
//   Kunci tanggal 10-karakter yang SADAR ZONA WAKTU (WIB).
//   Fix bug lama: parseTanggalBackend('yyyy-MM-dd') = tengah malam LOKAL,
//   lalu toISOString() (UTC) menggeser mundur 1 hari di WIB (+7).
//   Semua normalisasi & perbandingan tanggal pakai helper ini.
//   Cermin setia perilaku lama; call-site TIDAK berubah.
function tanggalKey10_(v) {
  return CoreLib.dateKey10(v);
}

// G18d (2026-09-19): delegasi ke CoreLib.paginate (v2.3.0).
//   Potong array + meta {total, page, limit, total_pages}.
//   Cermin setia perilaku lama; call-site TIDAK berubah.
function paginate_(rows, page, limit) {
  return CoreLib.paginate(rows, page, limit);
}

// ==================== DASHBOARD & ANALYTICS LOKAL (v1 legacy) ====================
function apiDashboard_(query, actor) {
  try {
    var dashboardData = {
      app_title:    APP_TITLE,
      total_data:   0,
      jenis_count:  {},
      tanggal_count:{},
      generated_at: nowIso_(),
      generated_by: (actor && (actor.username || actor.email)) ? (actor.username || actor.email) : 'system'
    };

    var laporanHarian = readRecordsNoLock_('LAPORAN_HARIAN').filter(function (r) { return !r.deleted_at; });
    normalizeJenisRows_(laporanHarian); // G16

    if (laporanHarian && laporanHarian.length > 0) {
      dashboardData.total_data = laporanHarian.length;
      laporanHarian.forEach(function (item) {
        var tgl = tanggalKey10_(item.tanggal) || 'tanpa_tanggal'; // G12 / G18d
        dashboardData.tanggal_count[tgl] = (dashboardData.tanggal_count[tgl] || 0) + 1;
        var jenis = String(item.jenis_kegiatan || 'umum').toLowerCase().trim();
        dashboardData.jenis_count[jenis] = (dashboardData.jenis_count[jenis] || 0) + 1;
      });
      // OPT-DASH: 5 laporan terbaru (terbaru dulu) — widget dashboard tidak
      // lagi bergantung pada laporanList yang hanya terisi usai buka Master Data.
      dashboardData.terbaru = laporanHarian.slice().sort(function (a, b) { // G12 / G18d
        var ta = tanggalKey10_(a.tanggal), tb = tanggalKey10_(b.tanggal);
        return tb < ta ? -1 : (tb > ta ? 1 : 0);
      }).slice(0, 5);
    } else {
      dashboardData.terbaru = [];
    }

    return { success: true, data: dashboardData };
  } catch (err) {
    return { success: false, code: 'BAD_REQUEST', error: err.message };
  }
}

function getAnalytics_(query, actor) {
  try {
    var total        = 0;
    var ringkasan    = '';
    var byJenis      = {};
    var byTanggal    = {};   // P7
    var byPegawai    = {};   // P7
    var temuan       = [];
    var rekomendasi  = [];

    var laporanHarian = readRecordsNoLock_('LAPORAN_HARIAN').filter(function (p) { return !p.deleted_at; });
    normalizeJenisRows_(laporanHarian); // G16

    if (laporanHarian && laporanHarian.length > 0) {
      total = laporanHarian.length;
      laporanHarian.forEach(function (item) {
        var jenis = String(item.jenis_kegiatan || 'umum').toLowerCase().trim();
        byJenis[jenis] = (byJenis[jenis] || 0) + 1;
        var tgl = tanggalKey10_(item.tanggal) || 'tanpa_tanggal'; // G12 / G18d
        byTanggal[tgl] = (byTanggal[tgl] || 0) + 1;
        var peg = String(item.pegawai_id || 'tanpa_pegawai');
        byPegawai[peg] = (byPegawai[peg] || 0) + 1;
      });
      ringkasan = 'Total laporan harian tercatat: ' + total + ' aktivitas.';
    }

    if (total === 0) {
      ringkasan = 'Belum ada data transaksi.';
      temuan.push({ level: 'kritis', pesan: 'Belum ada data laporan.' });
      rekomendasi.push({ prioritas: 'tinggi', tindakan: 'Sosialisasi pengisian laporan.' });
    } else {
      temuan.push({ level: 'info', pesan: 'Volume data transaksi terdaftar cukup baik.' });
      rekomendasi.push({ prioritas: 'rendah', tindakan: 'Pemantauan rekapitulasi data berkala.' });
    }

    return {
      success: true,
      data: {
        ringkasan:   ringkasan,
        total_data:  total,
        by_jenis:    byJenis,
        by_tanggal:  byTanggal,
        by_pegawai:  byPegawai,
        temuan:      temuan,
        rekomendasi: rekomendasi,
        generated_at: nowIso_()
      }
    };
  } catch (err) {
    return { success: false, code: 'BAD_REQUEST', error: err.message };
  }
}

// ==================== VALIDATOR & HOOKS LOKAL ====================
function localPreSaveHook_(canonical, record) {
  // P1: id kosong WAJIB digenerate di sini — kalau lolos kosong, PK jatuh ke
  // pegawai_id: baris tersimpan tanpa id + save berikut menimpa (DATA LOSS).
  if (!record.id || String(record.id).trim() === '') {
    record.id = makeId_(String(canonical || 'rec').toLowerCase());
  }

  if (canonical === 'LAPORAN_HARIAN') {
    // P2: jalur save generik DILARANG membawa verifikasi (anti self-approve
    // via DevTools). Baru='menunggu', update=warisi baris lama.
    var old = findLaporanById_(record.id);
    if (old) {
      record.status_verifikasi   = old.status_verifikasi   || 'menunggu';
      record.catatan_atasan      = old.catatan_atasan      || '';
      record.verifikator_id      = old.verifikator_id      || '';
      record.tanggal_verifikasi  = old.tanggal_verifikasi  || '';
    } else {
      record.status_verifikasi   = 'menunggu';
      record.catatan_atasan      = '';
      record.verifikator_id      = '';
      record.tanggal_verifikasi  = '';
    }

    if (record.tanggal) {
      // G12 / G18d: format LOKAL (bukan toISOString/UTC yang menggeser -1 hari di WIB).
      record.tanggal = tanggalKey10_(record.tanggal) || record.tanggal;
    }
    if (record.waktu_mulai && record.waktu_selesai && !record.durasi_menit) {
      record.durasi_menit = hitungDurasiMenit_(record.waktu_mulai, record.waktu_selesai);
    }
  }
  return { record: record };
}

// ==================== LAPORAN: LIST + RIWAYAT ====================
function getLaporanList_(data, actor) {
  data = data || {};
  try {
    var rows = readRecordsNoLock_('LAPORAN_HARIAN').filter(function (row) { return !row.deleted_at; });
    normalizeJenisRows_(rows); // G16
    var q = String(data.search || '').toLowerCase().trim(); // P3
    if (q) rows = rows.filter(function (r) { return matchSearch_(r, q, LAPORAN_SEARCH_FIELDS); });
    return paginate_(rows, data.page, data.limit);
  } catch (err) {
    return { success: false, code: 'BAD_REQUEST', error: err.message };
  }
}

// P4: filter tanggal compare 10-char (tahan format ISO-full), pegawai exact,
// jenis exact-insensitive, search, sortir terbaru, paginasi + meta.
function getRiwayatList_(data, actor) {
  data = data || {};
  try {
    var rows = readRecordsNoLock_('LAPORAN_HARIAN').filter(function (row) { return !row.deleted_at; });
    normalizeJenisRows_(rows); // G16

    var filters = data.filters || {};
    if (typeof filters === 'string') { try { filters = JSON.parse(filters); } catch (e) { filters = {}; } }

    var fTgl   = tanggalKey10_(filters.tanggal); // G12 / G18d
    var fPeg   = String(filters.pegawai_id     || '').trim();
    var fJenis = String(filters.jenis_kegiatan || '').toLowerCase().trim();

    if (fTgl)   rows = rows.filter(function (r) { return tanggalKey10_(r.tanggal) === fTgl; }); // G12 / G18d
    if (fPeg)   rows = rows.filter(function (r) { return String(r.pegawai_id     || '') === fPeg; });
    if (fJenis) rows = rows.filter(function (r) { return String(r.jenis_kegiatan || '').toLowerCase() === fJenis; });

    var q = String(data.search || '').toLowerCase().trim();
    if (q) rows = rows.filter(function (r) { return matchSearch_(r, q, LAPORAN_SEARCH_FIELDS); });

    rows.sort(function (a, b) { // G12 / G18d: sortir kunci tanggal ternormalisasi
      var ta = tanggalKey10_(a.tanggal), tb = tanggalKey10_(b.tanggal);
      return tb < ta ? -1 : (tb > ta ? 1 : 0);
    });
    return paginate_(rows, data.page, data.limit);
  } catch (err) {
    return { success: false, code: 'BAD_REQUEST', error: err.message };
  }
}

// ==================== LAPORAN: SAVE/DELETE/VERIFIKASI (P5–P6) ====================
function saveLaporanHandler_(data, actor) {
  data = data || {};
  var record = data.record || data.row || data;
  if (!record || typeof record !== 'object') {
    return { success: false, code: 'BAD_REQUEST', error: 'Payload record tidak valid.' };
  }
  record = Object.assign({}, record);

  // G16: normalisasi jenis saat save (NON-BLOCKING: nilai di luar whitelist
  // menjadi 'lainnya', save tidak digagalkan — filosofi sistem tetap hidup).
  if (record.jenis_kegiatan !== undefined && record.jenis_kegiatan !== null) {
    record.jenis_kegiatan = normalizeJenis_(record.jenis_kegiatan);
  }

  if (!isAdminActor_(actor)) {
    var myPeg = actorPegawaiId_(actor);
    if (!myPeg) return { success: false, code: 'FORBIDDEN', error: 'Akun Anda belum terhubung ke data pegawai. Hubungi admin.' };
    if (String(record.pegawai_id || '').trim() !== myPeg) {
      return { success: false, code: 'FORBIDDEN', error: 'Anda hanya boleh menyimpan laporan milik sendiri.' };
    }
    if (record.id && String(record.id).trim() !== '') {
      var old = findLaporanById_(record.id);
      if (old && String(old.pegawai_id || '').trim() !== myPeg) {
        return { success: false, code: 'FORBIDDEN', error: 'Anda hanya boleh mengubah laporan milik sendiri.' };
      }
    }
  }
  return apiSave_('LAPORAN_HARIAN', record, actor);
}

function deleteLaporanHandler_(data, actor) {
  data = data || {};
  var id = data.id || (data.record && data.record.id) || '';
  if (!id) return { success: false, code: 'BAD_REQUEST', error: 'ID laporan wajib diisi.' };

  if (!isAdminActor_(actor)) {
    var myPeg = actorPegawaiId_(actor);
    var row   = findLaporanById_(id);
    if (!row) return { success: false, code: 'NOT_FOUND', error: 'Laporan tidak ditemukan.' };
    if (!myPeg || String(row.pegawai_id || '').trim() !== myPeg) {
      return { success: false, code: 'FORBIDDEN', error: 'Anda hanya boleh menghapus laporan milik sendiri.' };
    }
  }
  return apiDelete_('LAPORAN_HARIAN', id, actor);
}

// Satu-satunya penulis field verifikasi. Dispatcher + cek ganda admin.
function verifikasiLaporanHandler_(data, actor) {
  data = data || {};
  if (!isAdminActor_(actor)) return { success: false, code: 'FORBIDDEN', error: 'Verifikasi hanya untuk admin.' };

  var id     = data.id || '';
  var status = String(data.status || data.status_verifikasi || '').toLowerCase().trim();
  if (!id) return { success: false, code: 'BAD_REQUEST', error: 'ID laporan wajib diisi.' };
  if (status !== 'disetujui' && status !== 'revisi') {
    return { success: false, code: 'BAD_REQUEST', error: 'Status harus "disetujui" atau "revisi".' };
  }

  var lock = acquireLock_();
  if (!lock) return { success: false, code: 'BUSY', error: 'Server sibuk, silakan coba lagi.' };
  try {
    var row = findLaporanById_(id);
    if (!row) return { success: false, code: 'NOT_FOUND', error: 'Laporan tidak ditemukan.' };

    row.status_verifikasi  = status;
    row.catatan_atasan     = (data.catatan_atasan !== undefined) ? data.catatan_atasan : (row.catatan_atasan || '');
    row.verifikator_id     = actorPegawaiId_(actor) || String(actor.id || '');
    row.tanggal_verifikasi = todayIso_(); // G18d: sekarang WIB (CoreLib.todayIsoLocal)

    var saved = writeRecordNoLock_('LAPORAN_HARIAN', row, true, actor); // langsung (bypass hook)
    return { success: true, data: saved };
  } catch (err) {
    return { success: false, code: 'BAD_REQUEST', error: err.message };
  } finally { try { lock.releaseLock(); } catch (e) {} }
}

// Bridges ke Core Business Engine
function apiGet_(sheetName, id, query)         { return CoreLib.apiGet(SPREADSHEET_ID, sheetName, id, query, getAllHeaders_()); }
function apiSave_(sheetName, record, actor)    { return CoreLib.apiSave(SPREADSHEET_ID, sheetName, record, actor, getAllHeaders_(), isReferenceSheet_, localPreSaveHook_); }
function apiDelete_(sheetName, id, actor)      { return CoreLib.apiDelete(SPREADSHEET_ID, sheetName, id, actor, getAllHeaders_(), isReferenceSheet_); }

// ==================== HANDLER LOKAL DENGAN FORMAT KONSISTEN ====================
function getPegawaiList_(data, actor) { return { success: true, data: CoreLib.getPegawaiList(SPREADSHEET_ID, getAllHeaders_(), MASTER_SPREADSHEET_ID) }; }
function getUnitList_(data, actor)    { return { success: true, data: CoreLib.getUnitList   (SPREADSHEET_ID, getAllHeaders_(), MASTER_SPREADSHEET_ID) }; }
function getJabatanList_(data, actor) { return { success: true, data: CoreLib.getJabatanList(SPREADSHEET_ID, getAllHeaders_(), MASTER_SPREADSHEET_ID) }; }
function getProfile_(email)           { return CoreLib.getProfile(SPREADSHEET_ID, email, getAllHeaders_(), MASTER_SPREADSHEET_ID); }

// P8: profil + pangkat_golongan dari master (kartu profil sembuh).
function getMyProfileEnriched_(actor) {
  var prof = getProfile_((actor && actor.email) || '') || actor || {};
  try {
    var email = String((actor && actor.email) || '').toLowerCase().trim();
    if (email) {
      var refs = getSheetDataCached_('PEGAWAI');
      for (var i = 0; i < refs.length; i++) {
        if (String(refs[i].email || '').toLowerCase().trim() === email) {
          prof.pangkat_golongan = refs[i].pangkat_golongan || '';
          break;
        }
      }
    }
  } catch (e) {}
  return { success: true, data: prof };
}

function saveMyProfile_(data, actor) { return CoreLib.saveMyProfile(SPREADSHEET_ID, data, actor, getAllHeaders_(), MASTER_SPREADSHEET_ID); }
function getConfigList_()            { return CoreLib.getConfigList(SPREADSHEET_ID, getAllHeaders_()); }
function saveConfigItem_(data, actor){ return CoreLib.saveConfigItem(SPREADSHEET_ID, data, actor, getAllHeaders_()); }

// ==================== LAUNCHER PROVISIONING 1-KLIK ====================

/**
 * Wrapper Publik untuk Inisialisasi Seluruh Tab Sheet Fisik dari Dropdown Apps Script
 */
function initDatabase() {
  return initDatabase_();
}

function setupApp() {
  var defaultConfigs = [
    { key: 'app_name',            value: APP_TITLE, keterangan: 'Nama Aplikasi' },
    { key: 'app_version',         value: '1.0.0',   keterangan: 'Versi Aplikasi' },
    { key: 'instansi',            value: 'Satpol PP & Kebakaran Kab. Trenggalek', keterangan: 'Nama Instansi' },
    { key: 'jenis_kegiatan_list', value: 'rutin,insidental,khusus,lapangan,administrasi', keterangan: 'Daftar jenis kegiatan (legacy v1)' }
  ];

  var params = {
    appCode:        APP_CODE,
    appTitle:       APP_TITLE,
    spreadsheetId:  SPREADSHEET_ID,
    masterSsId:     MASTER_SPREADSHEET_ID,
    platformApiUrl: PLATFORM_API_URL,
    headersMap:     getAllHeaders_(),
    defaultConfigs: defaultConfigs,
    isRefSheetFunc: isReferenceSheet_,
    props:          appProps_() // WAJIB (B15): store milik app ini, bukan store library
  };

  return CoreLib.executeAppSetup(params);
}
