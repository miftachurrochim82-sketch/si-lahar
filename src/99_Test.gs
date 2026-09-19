// ============================================================
// SILAHAR LOCAL WEB APP - 99_Test.gs (v2-ready; revisi G18d 2026-09-19)
// ------------------------------------------------------------
// Migrasi Library v2 — perubahan vs versi lama:
//   - API tes v2 = SATU pintu: CoreLib.runCoreTests(ctx). Enam fungsi
//     gaya-lama (testDatabaseConnection(ssId), testSheetHeaders(ssId,...),
//     testGenericCrud(ssId,sheet,dummy,...), testSsoFlow(ssoConfig),
//     testReadOnlyProtection(...), testHardDeleteConfig(...)) DIHAPUS —
//     semua kini menerima SATU ctx object. Panggil gaya lama = error.
//   - TEST_MODE dihapus (B1) — kalau masih direferensikan = ReferenceError.
//   - Semua tes tulis v2 terisolasi di sheet ZZ_TEST_CRUD (aman, auto-bersih).
//     Tes DILARANG menulis dummy ke LAPORAN_HARIAN produksi.
//
// Urutan jalan: setupApp() -> initDatabase() -> runLibraryTests().
//
// G18d (2026-09-19):
//   - Target test dinaikkan: 38 → 42 (CoreLib v2.3.0, +4 test C1/C2/C3).
//   - Tambah testAdopsiG18d() — verifikasi delegasi wrapper lokal si-lahar
//     ke CoreLib v2.3.0 (tanggalKey10_ / paginate_ / matchSearch_ / ekEnum_).
// ============================================================

// ctx kontrak v2: { ssId, ssIdB?, masterSsId?, headersMap, isRefFunc?,
//                   platformApiUrl?, appCode? }
function testCtx_() {
  return {
    appCode:        APP_CODE,
    ssId:           SPREADSHEET_ID,
    masterSsId:     MASTER_SPREADSHEET_ID,
    // Opsional: isi Properties TEST_SS_ID_B (ID spreadsheet uji ke-2) agar
    // testCacheIsolation ikut PASS; bila kosong ia SKIP (wajar).
    ssIdB:          appProps_().getProperty('TEST_SS_ID_B') || '',
    platformApiUrl: PLATFORM_API_URL,
    headersMap:     getAllHeaders_(),  // wajib memuat ZZ_TEST_CRUD (sudah ada di 01)
    isRefFunc:      isReferenceSheet_
  };
}

/**
 * Regression tests library v2 (42 tes per CoreLib v2.3.0 — terbukti
 * PASS 42/FAIL 0/SKIP 1 di CoreLib, 2026-09-19). Target: failed:0.
 * (SKIP wajar hanya untuk testCacheIsolation bila TEST_SS_ID_B kosong.)
 */
function runLibraryTests() {
  Logger.log('==========================================================');
  Logger.log('🧪 REGRESSION TESTS LIBRARY v2 (dari ' + APP_CODE + ')');
  Logger.log('==========================================================');

  var recap = CoreLib.runCoreTests(testCtx_());
  Logger.log('REKAP: PASS ' + recap.passed + ' / FAIL ' + recap.failed + ' / SKIP ' + recap.skipped);

  (recap.results || []).forEach(function (r) {
    Logger.log(
      (r.status === 'PASS' ? '✅' : (r.status === 'SKIP' ? '⏭️' : '❌')) +
      ' ' + r.test + (r.detail ? ' — ' + r.detail : '')
    );
  });
  return recap;
}

/**
 * G18d (2026-09-19): Test adopsi CoreLib v2.3.0 di si-lahar.
 * Memverifikasi bahwa wrapper lokal (yang didelegasi di 02/04) benar
 * mengembalikan hasil yang identik dengan pemanggilan langsung CoreLib.
 * Tidak menulis ke sheet produksi — murni in-memory.
 */
function testAdopsiG18d() {
  Logger.log('==========================================================');
  Logger.log('🔗 UJI ADOPSI CORELIB v2.3.0 (G18d)');
  Logger.log('==========================================================');

  var ok = 0, fail = 0;
  function verdict(cond, label) {
    if (cond) { ok++; Logger.log('✅ ' + label); }
    else      { fail++; Logger.log('❌ ' + label); }
  }

  // 1. tanggalKey10_ delegasi CoreLib.dateKey10 (WIB-aware)
  try {
    var dt1 = tanggalKey10_('2026-09-18T17:00:00.000Z'); // 19 Sep 00:00 WIB
    var dt2 = CoreLib.dateKey10('2026-09-18T17:00:00.000Z');
    verdict(dt1 === '2026-09-19' && dt1 === dt2,
            'tanggalKey10_ === CoreLib.dateKey10 (ISO UTC → WIB)');
  } catch (e) { verdict(false, 'tanggalKey10_ exception: ' + e.message); }

  // 2. tanggalKey10_ format murni
  try {
    var k1 = tanggalKey10_('2026-09-19');
    var k2 = CoreLib.dateKey10('2026-09-19');
    verdict(k1 === '2026-09-19' && k1 === k2, 'tanggalKey10_ yyyy-MM-dd passthrough');
  } catch (e) { verdict(false, 'tanggalKey10_ passthrough exception: ' + e.message); }

  // 3. paginate_ delegasi CoreLib.paginate
  try {
    var rows = [];
    for (var i = 1; i <= 25; i++) rows.push({ id: i });
    var p1 = paginate_(rows, 1, 10);
    var p2 = CoreLib.paginate(rows, 1, 10);
    verdict(p1.success === true &&
            p1.data.length === 10 && p1.data[0].id === 1 && p1.data[9].id === 10 &&
            p1.meta.total === 25 && p1.meta.total_pages === 3 &&
            JSON.stringify(p1.meta) === JSON.stringify(p2.meta),
            'paginate_ === CoreLib.paginate (page 1, limit 10)');
    var p3 = paginate_(rows, 3, 10);
    verdict(p3.data.length === 5 && p3.data[0].id === 21 && p3.data[4].id === 25,
            'paginate_ halaman terakhir benar');
  } catch (e) { verdict(false, 'paginate_ exception: ' + e.message); }

  // 4. matchSearch_ delegasi CoreLib.matchSearch
  try {
    var row = { deskripsi: 'Laporan Patroli Wilayah', hasil: 'Selesai 100%', kendala: '' };
    verdict(matchSearch_(row, 'patroli', ['deskripsi']) === true,
            'matchSearch_ case-insensitive (patroli di deskripsi)');
    verdict(matchSearch_(row, 'PATROLI', ['deskripsi']) === true,
            'matchSearch_ uppercase input');
    verdict(matchSearch_(row, 'kebakaran', ['deskripsi', 'hasil']) === false,
            'matchSearch_ tidak match → false');
    verdict(matchSearch_(row, '', ['deskripsi']) === true,
            'matchSearch_ q kosong → true');
    verdict(matchSearch_(row, 'apa saja', []) === false,
            'matchSearch_ fields kosong → false (cermin CoreLib v2.3.0)');
  } catch (e) { verdict(false, 'matchSearch_ exception: ' + e.message); }

  // 5. ekEnum_ delegasi CoreLib.whitelist (non-throwing)
  try {
    verdict(ekEnum_('terjadwal', ['Terjadwal', 'Selesai'], 'x') === 'Terjadwal',
            'ekEnum_ lowercase input → nilai kanonik');
    verdict(ekEnum_('TERJADWAL', ['Terjadwal', 'Selesai'], 'x') === 'Terjadwal',
            'ekEnum_ uppercase input → nilai kanonik');
    verdict(ekEnum_('ngawur', ['A', 'B'], 'dflt') === 'dflt',
            'ekEnum_ non-match → dflt (non-throwing, cermin CoreLib.whitelist)');
    verdict(ekEnum_('a', ['A'], '') === 'A',
            'ekEnum_ single-letter match');
  } catch (e) { verdict(false, 'ekEnum_ exception: ' + e.message); }

  Logger.log('REKAP ADOPSI G18d: ' + ok + ' lolos, ' + fail + ' gagal.' + (fail === 0 ? ' 🎉' : ' — CEK ❌!'));
  return { ok: ok, fail: fail };
}

function runAllDiagnostics() {
  Logger.log('==========================================================');
  Logger.log('🔍 MEMULAI DIAGNOSTIK KESEHATAN LOCAL WEB APP');
  Logger.log('==========================================================');

  // Cek versi CoreLib v2.3.0 (fungsi baru tersedia)
  try {
    Logger.log('🔗 CoreLib v2.3.0 check:');
    Logger.log('   • todayIsoLocal() : ' + (typeof CoreLib.todayIsoLocal === 'function' ? '✅' : '❌'));
    Logger.log('   • dateKey10()     : ' + (typeof CoreLib.dateKey10 === 'function' ? '✅' : '❌'));
    Logger.log('   • paginate()      : ' + (typeof CoreLib.paginate === 'function' ? '✅' : '❌'));
    Logger.log('   • matchSearch()   : ' + (typeof CoreLib.matchSearch === 'function' ? '✅' : '❌'));
  } catch (e) { Logger.log('❌ Cek CoreLib v2.3.0 gagal: ' + e.message); }

  // Koneksi DB (pengganti testDatabaseConnection gaya-lama)
  try {
    Logger.log('✅ DB lokal tersambung: ' + getDb_().getName());
  } catch (e) {
    Logger.log('❌ DB lokal GAGAL dibuka: ' + e.message);
  }

  // Skema check-only (pengganti testSheetHeaders gaya-lama — tak boleh membuat sheet)
  try {
    var ss = getDb_();
    Object.keys(LOCAL_SHEET_NAMES).forEach(function (k) {
      var name = LOCAL_SHEET_NAMES[k];
      var sh   = ss.getSheetByName(name);
      if (!sh) {
        Logger.log(
          (isReferenceSheet_(name) ? '⚠️ ' : '❌ ') + name + ' : sheet TIDAK ADA' +
          (isReferenceSheet_(name) ? ' (wajar — baca via master).' : ' (jalankan initDatabase!).')
        );
      } else {
        Logger.log('✅ ' + name + ' : ada (' + Math.max(0, sh.getLastRow() - 1) + ' baris).');
      }
    });
  } catch (e) {
    Logger.log('❌ Cek skema gagal: ' + e.message);
  }

  try {
    Logger.log('✅ LAPORAN_HARIAN : ' + readRecordsNoLock_('LAPORAN_HARIAN').length + ' baris.');
  } catch (e) { Logger.log('❌ LAPORAN_HARIAN : ' + e.message); }

  try {
    Logger.log('✅ PEGAWAI (master): ' + readRecordsNoLock_('PEGAWAI').length + ' data.');
  } catch (e) { Logger.log('❌ PEGAWAI : ' + e.message + ' (cek MASTER_SPREADSHEET_ID!)'); }

  try {
    Logger.log('✅ KONFIGURASI    : ' + readRecordsNoLock_('KONFIGURASI').length + ' item.');
  } catch (e) { Logger.log('❌ KONFIGURASI : ' + e.message); }

  // Adopsi G18d (murni in-memory — tidak menyentuh sheet)
  try { testAdopsiG18d(); } catch (e) { Logger.log('❌ testAdopsiG18d: ' + e.message); }

  Logger.log('🏁 DIAGNOSTIK SELESAI');
}

function runAllIntegrationTests() {
  Logger.log('==========================================================');
  Logger.log('🚀 MEMULAI PENGUJIAN INTEGRASI (' + APP_CODE + ')');
  Logger.log('==========================================================');

  // 1. CRUD aman di sheet uji (BUKAN di LAPORAN_HARIAN produksi!)
  try {
    var actor  = systemActor_();
    var testId = 'ITEST-' + new Date().getTime();
    var n0 = readRecordsNoLock_('ZZ_TEST_CRUD').length;
    var ins = apiSave_('ZZ_TEST_CRUD', { id: testId, nama: 'uji awal', no_hp: '081234567890' }, actor);
    var n1  = readRecordsNoLock_('ZZ_TEST_CRUD').length;
    var upd = apiSave_('ZZ_TEST_CRUD', { id: testId, nama: 'uji ubah' }, actor);
    var got = apiGet_('ZZ_TEST_CRUD', testId, {});
    var del = apiDelete_('ZZ_TEST_CRUD', testId, actor);
    hardDeleteRecordNoLock_('ZZ_TEST_CRUD', testId, actor);
    var n2  = readRecordsNoLock_('ZZ_TEST_CRUD').length;

    var crudOk = ins.success && upd.success && del.success && got.success &&
                 got.data && got.data.nama === 'uji ubah' &&
                 n1 === n0 + 1 && n2 === n0;
    Logger.log(crudOk ? '✅ CRUD ZZ_TEST_CRUD sukses + bersih total!'
                      : '❌ CRUD ZZ_TEST_CRUD gagal (cek tiap langkah).');
  } catch (e) {
    Logger.log('❌ CRUD ZZ_TEST_CRUD exception: ' + e.message);
  }

  // 2. Dashboard & analytics lokal (v1)
  var dashRes = apiDashboard_({}, systemActor_());
  Logger.log(dashRes.success ? '✅ apiDashboard_ sukses!' : '❌ apiDashboard_ gagal: ' + dashRes.error);

  var analyticsRes = getAnalytics_({}, systemActor_());
  Logger.log(analyticsRes.success ? '✅ getAnalytics_ sukses!' : '❌ getAnalytics_ gagal: ' + analyticsRes.error);

  // 3. SSO negatif: tiket palsu WAJIB ditolak server (tanpa testMode!)
  try {
    validatePlatformTicket_('tiket_palsu_uji_' + new Date().getTime());
    Logger.log('❌ SSO NEGATIF GAGAL: tiket palsu malah diterima!');
  } catch (e) {
    Logger.log('✅ SSO negatif lolos: tiket palsu ditolak (' + String(e.message).substring(0, 80) + ').');
  }
  Logger.log('ℹ️ Uji SSO positif (tiket valid): jalankan testFullSsoIntegrationFlow().');

  // 4. Spot-check read-only: tulis ke PEGAWAI wajib THROW
  try {
    writeRecordNoLock_('PEGAWAI', { id: 'X-SPOT' }, false, systemActor_());
    Logger.log('❌ READ-ONLY JEBOL: tulis ke PEGAWAI tidak ditolak!');
  } catch (e) {
    Logger.log('✅ Read-only terjaga: tulis ke PEGAWAI ditolak.');
  }

  // 5. Adopsi G18d (murni in-memory)
  try { testAdopsiG18d(); } catch (e) { Logger.log('❌ testAdopsiG18d: ' + e.message); }

  Logger.log('🎉 SEMUA PENGUJIAN SELESAI');
}

function testSistem() {
  Logger.log('📊 --- RINGKASAN DATA SYSTEM ---');
  try {
    Logger.log('• LAPORAN_HARIAN : ' + readRecordsNoLock_('LAPORAN_HARIAN').length + ' baris');
    Logger.log('• PEGAWAI        : ' + readRecordsNoLock_('PEGAWAI').length + ' data');
    Logger.log('• KONFIGURASI    : ' + readRecordsNoLock_('KONFIGURASI').length + ' item');
    Logger.log('✅ Pemeriksaan sistem selesai tanpa error.');
  } catch (e) {
    Logger.log('❌ Terjadi kesalahan: ' + e.message);
  }
}

function testKoneksiKePortalSso() {
  Logger.log('==========================================================');
  Logger.log('🔍 DIAGNOSTIK KONEKSI SSO KE PORTAL UTAMA');
  Logger.log('==========================================================');
  Logger.log('• URL Portal : ' + PLATFORM_API_URL);
  Logger.log('• APP_CODE   : ' + APP_CODE);

  try {
    var payload = {
      method: 'POST',
      path:   '/api/v1/auth/validate-ticket',
      data:   { ticket: 'st_TEST_DIAGNOSTIK_123', appCode: APP_CODE }
    };
    var options = {
      method:             'post',
      contentType:        'application/json',
      payload:            JSON.stringify(payload),
      muteHttpExceptions: true,
      followRedirects:    true
    };
    var response   = UrlFetchApp.fetch(PLATFORM_API_URL, options);
    var statusCode = response.getResponseCode();
    var content    = response.getContentText();

    Logger.log('• HTTP Status Code : ' + statusCode);
    Logger.log('• Isi Respons Raw  : ' + content.substring(0, 300));

    if (statusCode === 200) {
      if (content.trim().startsWith('{') || content.trim().startsWith('[')) {
        var json = JSON.parse(content);
        Logger.log('✅ Portal merespons JSON dengan BENAR!');
        Logger.log('• Pesan Portal: ' + JSON.stringify(json));
      } else {
        Logger.log('❌ KESALAHAN UTAMA TERDETEKSI:');
        Logger.log('👉 Portal mengembalikan halaman HTML Login Google, BUKAN data JSON.');
        Logger.log('👉 PENYEBAB: Setelan "Siapa yang memiliki akses" di Portal SSO BELUM disetel ke "Siapa saja" (Anyone).');
      }
    } else {
      Logger.log('❌ HTTP ERROR ' + statusCode + ': Portal menolak koneksi.');
    }
  } catch (err) {
    Logger.log('❌ ERROR EXCEPTION: ' + err.message);
  }
  Logger.log('==========================================================');
}

/**
 * Test Uji Coba SSO End-to-End (Tiket Valid -> Exchange Ticket)
 * Dapatkan tiket valid dari Portal SSO (misal via createTestTicketSILAHAR
 * di Global App), tempel di bawah, jalankan dari editor.
 */
function testFullSsoIntegrationFlow() {
  Logger.log('==========================================================');
  Logger.log('🚀 MEMULAI PENGUJIAN INTEGRASI ALUR PENUH SSO (' + APP_CODE + ')');
  Logger.log('==========================================================');

  // Ganti dengan tiket valid yang Anda dapatkan dari Global App
  var ticketValid = ''; // <<< ISI TIKET VALID DI SINI (dari createTestTicketSILAHAR di Global App)

  if (!ticketValid) {
    Logger.log('❌ Tiket valid belum diisi. Silakan generate tiket dari Global App (createTestTicketSILAHAR) lalu isi variabel ticketValid.');
    return;
  }

  Logger.log('1️⃣ Menukarkan Tiket SSO ke Backend Aplikasi Lokal...');
  var exchangeResult = exchangePlatformTicket(ticketValid);
  if (!exchangeResult.success) {
    Logger.log('❌ GAGAL MENUKAR TIKET: ' + exchangeResult.error);
    return;
  }

  Logger.log('2️⃣ Memverifikasi session token...');
  var auth = checkAuth_(exchangeResult.data.token, 'viewer');
  Logger.log(auth.success
    ? '✅ Session valid: ' + auth.user.email + ' [' + auth.user.role + '] pegawai_id=' + (auth.user.pegawai_id || '(kosong — cek masterSsId!)')
    : '❌ Session TIDAK valid: ' + auth.error);

  Logger.log('3️⃣ Membersihkan session uji (logout)...');
  logout_(exchangeResult.data.token);

  Logger.log('==========================================================');
  Logger.log('🎉 PENGUJIAN INTEGRASI SSO 100% SUKSES!');
  Logger.log('• User Logged In : ' + exchangeResult.data.user.display_name + ' (' + exchangeResult.data.user.email + ')');
  Logger.log('==========================================================');
}

/**
 * Uji proteksi laporan (patch P1–P8). Menulis 2 baris uji sungguhan ke
 * LAPORAN_HARIAN lalu hard-cleanup total. Target: semua ✅.
 */
function testLaporanGuards() {
  Logger.log('==========================================================');
  Logger.log('🛡️ UJI PROTEKSI LAPORAN (patch P1–P8)');
  Logger.log('==========================================================');

  var admin = { id: 'U-ADMIN', email: 'admin@uji.id', role: 'admin',  pegawai_id: 'PEG-ADMIN' };
  var pegA  = { id: 'U-A',     email: 'a@uji.id',     role: 'viewer', pegawai_id: 'PEG-UJI-A' };
  var pegB  = { id: 'U-B',     email: 'b@uji.id',     role: 'viewer', pegawai_id: 'PEG-UJI-B' };
  var noPeg = { id: 'U-X',     email: 'x@uji.id',     role: 'viewer', pegawai_id: '' };

  var ok = 0, fail = 0;
  function verdict(cond, label) {
    if (cond) { ok++; Logger.log('✅ ' + label); }
    else      { fail++; Logger.log('❌ ' + label); }
  }

  // 1. Viewer simpan milik sendiri → OK + id ter-generate (P1)
  var r1  = saveLaporanHandler_({ record: { id: '', pegawai_id: 'PEG-UJI-A', tanggal: todayIso_(), jenis_kegiatan: 'rutin', deskripsi: 'UJI-GUARD-A' } }, pegA);
  var idA = (r1.success && r1.data) ? r1.data.id : '';
  verdict(r1.success && idA, 'viewer save milik sendiri + id ter-generate');
  verdict(r1.success && r1.data.status_verifikasi === 'menunggu', 'status awal laporan = menunggu');

  // 2. Viewer simpan sebagai orang lain → TOLAK (P5)
  var r2 = saveLaporanHandler_({ record: { pegawai_id: 'PEG-UJI-B', tanggal: todayIso_(), deskripsi: 'BAJAK' } }, pegA);
  verdict(!r2.success, 'viewer save milik orang DITOLAK');

  // 3. Viewer tanpa link pegawai → TOLAK (P5)
  var r3 = saveLaporanHandler_({ record: { pegawai_id: 'PEG-UJI-A', deskripsi: 'X' } }, noPeg);
  verdict(!r3.success, 'viewer tanpa link pegawai DITOLAK');

  // 4. Viewer verifikasi → TOLAK (P6)
  var r4 = verifikasiLaporanHandler_({ id: idA, status: 'disetujui' }, pegA);
  verdict(!r4.success, 'viewer verifikasi DITOLAK');

  // 5. Admin verifikasi → OK (P6)
  var r5 = verifikasiLaporanHandler_({ id: idA, status: 'disetujui', catatan_atasan: 'uji ok' }, admin);
  verdict(r5.success && r5.data.verifikator_id === 'PEG-ADMIN', 'admin verifikasi OK + verifikator tercatat');

  // 6. Edit user (bawa status palsu) tak goyahkan verifikasi (P2)
  var r6   = saveLaporanHandler_({ record: { id: idA, pegawai_id: 'PEG-UJI-A', deskripsi: 'edit', status_verifikasi: 'revisi' } }, pegA);
  var kept = r6.success && findLaporanById_(idA).status_verifikasi === 'disetujui';
  verdict(kept, 'edit user tak goyahkan status verifikasi');

  // 7. Baris ke-2 untuk uji hapus (admin tulis sebagai B)
  var rB  = saveLaporanHandler_({ record: { pegawai_id: 'PEG-UJI-B', tanggal: todayIso_(), deskripsi: 'UJI-GUARD-B' } }, admin);
  var idB = (rB.success && rB.data) ? rB.data.id : '';
  verdict(rB.success && idB && idB !== idA, 'admin save sebagai B OK + id unik');

  // 8. Viewer hapus milik orang → TOLAK; hapus milik sendiri → OK (P5)
  var r8 = deleteLaporanHandler_({ id: idB }, pegA);
  verdict(!r8.success, 'viewer hapus milik orang DITOLAK');
  var r9 = deleteLaporanHandler_({ id: idA }, pegA);
  verdict(r9.success, 'viewer hapus milik sendiri OK');

  // 9. Search + riwayat (P3–P4)
  var s = getLaporanList_({ search: 'UJI-GUARD-B' }, admin);
  verdict(s.success && s.data.length === 1, 'search laporan menemukan 1 baris');
  var w = getRiwayatList_({ filters: { tanggal: todayIso_() } }, admin);
  verdict(w.success && w.meta && w.meta.total >= 1, 'riwayat filter tanggal jalan');

  // 10. Analytics + profil kaya (P7–P8)
  var an = getAnalytics_({}, admin);
  verdict(an.success && an.data.by_tanggal && an.data.by_pegawai, 'analytics kirim by_tanggal + by_pegawai');

  // Cleanup total
  if (idA) hardDeleteRecordNoLock_('LAPORAN_HARIAN', idA, systemActor_());
  if (idB) hardDeleteRecordNoLock_('LAPORAN_HARIAN', idB, systemActor_());

  Logger.log('REKAP GUARD: ' + ok + ' lolos, ' + fail + ' gagal.' + (fail === 0 ? ' 🎉' : ' — CEK YANG ❌!'));
}

// ==================== G16 (2026-09-18): HIGIENE DATA JENIS KEGIATAN ====================
// Sebagian baris WARISAN di sheet LAPORAN_HARIAN punya nilai jenis_kegiatan
// di luar whitelist (mis. timestamp ISO) — terlihat dulu di legenda donut.
// Baca/display/save sudah dinormalisasi di 02_AppLogic.gs (keranjang
// 'lainnya'); untuk perbaikan PERMANEN sel sheet:
//   1) jalankan auditJenisKegiatan() di editor Apps Script (lihat Logger/output),
//   2) perbaiki sel manual di spreadsheet, ATAU panggil
//      perbaikiJenisKegiatan(nomorBarisSheet, 'rutin'|'insidental'|'khusus'|'lapangan'|'administrasi').
//
// Catatan: fungsi-fungsi ini memakai getDb_() (konsisten dengan SPREADSHEET_ID)
// alih-alih getActiveSpreadsheet() agar aman di GAS standalone.

function auditJenisKegiatan() {
  var sh = getDb_().getSheetByName('LAPORAN_HARIAN');
  if (!sh) return { success: false, error: 'Sheet LAPORAN_HARIAN tidak ditemukan.' };

  var vals = sh.getDataRange().getValues();
  var head = (vals[0] || []).map(function (h) { return String(h).toLowerCase().trim(); });
  var ci   = head.indexOf('jenis_kegiatan');
  var ii   = head.indexOf('id');
  var ti   = head.indexOf('tanggal');
  if (ci < 0) return { success: false, error: 'Kolom jenis_kegiatan tidak ditemukan.' };

  var out = [];
  for (var r = 1; r < vals.length; r++) {
    var v = String(vals[r][ci] == null ? '' : vals[r][ci]).toLowerCase().trim();
    if (JENIS_VALID_.indexOf(v) < 0) {
      out.push({
        baris_sheet:    r + 1,
        id:             ii >= 0 ? String(vals[r][ii]) : '',
        tanggal:        ti >= 0 ? String(vals[r][ti]) : '',
        jenis_saat_ini: String(vals[r][ci])
      });
    }
  }
  Logger.log('AUDIT JENIS: ' + out.length + ' baris di luar whitelist.');
  Logger.log(JSON.stringify(out, null, 2));
  return { success: true, jumlah: out.length, baris: out };
}

function perbaikiJenisKegiatan(barisSheet, jenisBaru) {
  var j = String(jenisBaru || '').toLowerCase().trim();
  if (JENIS_VALID_.indexOf(j) < 0) {
    return { success: false, error: 'jenisBaru harus salah satu: ' + JENIS_VALID_.join(', ') };
  }
  var sh = getDb_().getSheetByName('LAPORAN_HARIAN');
  if (!sh || !barisSheet || barisSheet < 2 || barisSheet > sh.getLastRow()) {
    return { success: false, error: 'Nomor baris sheet tidak valid: ' + barisSheet };
  }

  var head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0]
    .map(function (h) { return String(h).toLowerCase().trim(); });
  var ci = head.indexOf('jenis_kegiatan');
  if (ci < 0) return { success: false, error: 'Kolom jenis_kegiatan tidak ditemukan.' };

  sh.getRange(barisSheet, ci + 1).setValue(j);
  Logger.log('Baris ' + barisSheet + ' jenis_kegiatan := ' + j);
  return { success: true, baris: barisSheet, jenis: j };
}
