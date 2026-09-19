// ============================================================
// SILAHAR - 03_Maintenance.gs (G17, 2026-09-18)
// Toolkit perawatan spreadsheet database:
//   1) auditStrukturDatabase()           -> laporan READ-ONLY (sheet terpakai/
//      tidak, selisih kolom vs kontrak, kolom kosong, baris jenis korup).
//   2) rapikanDatabase()                 -> RENCANA saja (dryRun default true).
//   3) rapikanDatabase({dryRun:false})   -> EKSEKUSI: backup Drive otomatis
//      dulu, lalu hapus sheet tak terpakai + perbaiki kolom (tambah kolom
//      kontrak yang hilang, betulkan huruf header, hapus kolom ekstra KOSONG).
//      Kolom ekstra yang BERISI data TIDAK pernah dihapus otomatis (hanya
//      dilaporkan untuk keputusan manual).
// Sheet yang TIDAK BOLEH dihapus: kontrak aktif (LOCAL_SHEET_NAMES),
// sheet arsip (prefiks ARSIP_/BACKUP_), dan copy referensi lokal BILA
// MASTER_SPREADSHEET_ID kosong (fallback baca).
// ============================================================

function maintenanceSheetTarget_() {
  try {
    if (SPREADSHEET_ID) return SpreadsheetApp.openById(SPREADSHEET_ID);
  } catch (e) { /* jatuh ke bound spreadsheet */ }
  return SpreadsheetApp.getActiveSpreadsheet();
}

// CoreLib otomatis menambahkan 5 kolom audit ke sheet lokal yang ia kelola
// (terbukti di log runLibraryTests 2026-09-18: kolom ZZ_TEST_CRUD ditambah
// ulang oleh CoreFoundation). Maka kontrak fisik = LOCAL_SHEET_HEADERS + audit.
var CORELIB_AUDIT_COLS = ['created_at', 'updated_at', 'created_by', 'updated_by', 'deleted_at'];

function maintenanceContractCols_(name) {
  var base = LOCAL_SHEET_HEADERS[name];
  if (!base) return null;
  var out = base.slice();
  CORELIB_AUDIT_COLS.forEach(function (c) { if (out.indexOf(c) < 0) out.push(c); });
  return out;
}

function maintenanceProtected_() {
  var prot = {};
  Object.keys(LOCAL_SHEET_NAMES).forEach(function (k) { prot[LOCAL_SHEET_NAMES[k]] = true; });
  prot['AUDIT_LOGS'] = true; // jejak audit hidup milik CoreLib (auto-create)
  // G18a: tabel sistem milik CoreLib (DEFAULT_SYSTEM_HEADERS: AUDIT_LOGS,
  // KONFIGURASI, MAIN_DATA) dibuat ulang otomatis oleh initDatabase() —
  // lindungi agar tidak pernah ditawar hapus. Catatan: MASTER_SHEET_HEADERS
  // (PEGAWAI/JABATAN/UNIT_KERJA) SENGAJA tidak dilindungi di sini karena
  // copy lokalnya diurus klasifikasi referensi (maintenanceIsRefLocal_).
  try {
    if (typeof CoreLib !== 'undefined' && CoreLib && CoreLib.DEFAULT_SYSTEM_HEADERS) {
      Object.keys(CoreLib.DEFAULT_SYSTEM_HEADERS).forEach(function (k) { prot[k] = true; });
    }
  } catch (e) { /* library tak termuat (mis. saat uji sintaks lokal) — abaikan */ }
  return prot;
}

function maintenanceIsRefLocal_(name) {
  var n = String(name || '').toUpperCase().trim();
  return n === 'PEGAWAI' || n === 'JABATAN' || n === 'UNIT_KERJA' || n === 'UNIT';
}

// -------------------- AUDIT (read-only) --------------------
function auditStrukturDatabase() {
  var ss = maintenanceSheetTarget_();
  var prot = maintenanceProtected_();
  var masterOk = String(MASTER_SPREADSHEET_ID || '').trim() !== '';
  var sheets = ss.getSheets().map(function (sh) {
    var name = sh.getSheetName();
    var lastRow = sh.getLastRow();
    var lastCol = sh.getLastColumn();
    var headers = lastCol > 0 ? sh.getRange(1, 1, 1, lastCol).getValues()[0].map(function (h) { return String(h); }) : [];
    var rowCount = Math.max(0, lastRow - 1);

    var klasifikasi;
    if (prot[name]) {
      klasifikasi = LOCAL_SHEET_NAMES[name] ? 'AKTIF (kontrak kode)'
        : (name === 'AUDIT_LOGS' ? 'AKTIF (jejak audit CoreLib)' : 'AKTIF (kontrak CoreLib)');
    }
    else if (/^(ARSIP_|BACKUP_)/i.test(name)) klasifikasi = 'ARSIP (dilindungi)';
    else if (maintenanceIsRefLocal_(name)) klasifikasi = masterOk ? 'TIDAK_TERPAKAI (copy referensi lokal; master SIMPEG aktif)' : 'DIPERTAHANKAN (fallback referensi — MASTER_SPREADSHEET_ID kosong)';
    else klasifikasi = 'TIDAK_TERPAKAI';

    var out = {
      nama: name,
      klasifikasi: klasifikasi,
      jumlah_baris: rowCount,
      jumlah_kolom: headers.length,
      header: headers
    };

    // Selisih kolom hanya untuk sheet kontrak aktif
    var contract = maintenanceContractCols_(name);
    if (contract) {
      var lowerPhys = headers.map(function (h) { return h.toLowerCase().trim(); });
      var lowerCon = contract.map(function (c) { return c.toLowerCase(); });
      out.kolom_hilang = contract.filter(function (c) { return lowerPhys.indexOf(c.toLowerCase()) < 0; });
      out.header_salah_huruf = [];
      headers.forEach(function (h, i) {
        if (contract.indexOf(h) < 0 && lowerCon.indexOf(h.toLowerCase().trim()) >= 0) {
          out.header_salah_huruf.push({ posisi: i + 1, fisik: h, seharusnya: contract[lowerCon.indexOf(h.toLowerCase().trim())] });
        }
      });
      out.kolom_ekstra = [];
      headers.forEach(function (h, i) {
        if (contract.indexOf(h) < 0 && lowerCon.indexOf(h.toLowerCase().trim()) < 0) {
          var berisi = false;
          if (rowCount > 0) {
            var colVals = sh.getRange(2, i + 1, rowCount, 1).getValues();
            berisi = colVals.some(function (r) { return String(r[0] == null ? '' : r[0]).trim() !== ''; });
          }
          out.kolom_ekstra.push({ posisi: i + 1, nama: h, berisi_data: berisi });
        }
      });
    }
    return out;
  });

  // Baris jenis_kegiatan di luar whitelist (G16)
  var jenisKorup = [];
  var shLh = ss.getSheetByName('LAPORAN_HARIAN');
  if (shLh) {
    var vals = shLh.getDataRange().getValues();
    var head = (vals[0] || []).map(function (h) { return String(h).toLowerCase().trim(); });
    var ci = head.indexOf('jenis_kegiatan');
    if (ci >= 0) {
      for (var r = 1; r < vals.length; r++) {
        var v = String(vals[r][ci] == null ? '' : vals[r][ci]).toLowerCase().trim();
        if (JENIS_VALID_.indexOf(v) < 0) jenisKorup.push({ baris_sheet: r + 1, nilai: String(vals[r][ci]) });
      }
    }
  }

  var report = {
    spreadsheet: ss.getName(),
    master_simpeg_aktif: masterOk,
    sheets: sheets,
    sheet_tak_terpakai: sheets.filter(function (s) { return s.klasifikasi.indexOf('TIDAK_TERPAKAI') === 0; }).map(function (s) { return s.nama + ' (' + s.jumlah_baris + ' baris)'; }),
    jenis_korup: jenisKorup
  };
  Logger.log('=== AUDIT STRUKTUR ' + report.spreadsheet + ' | master SIMPEG aktif: ' + report.master_simpeg_aktif + ' ===');
  sheets.forEach(function (s) {
    Logger.log('- ' + s.nama + ' | ' + s.klasifikasi + ' | ' + s.jumlah_baris + ' baris | ' + s.jumlah_kolom + ' kolom');
  });
  Logger.log('TIDAK TERPAKAI: ' + (report.sheet_tak_terpakai.join(', ') || '(tidak ada)'));
  Logger.log('JENIS KORUP: ' + report.jenis_korup.length + ' baris');
  return report;
}

// -------------------- BACKUP --------------------
function buatBackupSpreadsheet_(label) {
  var ss = maintenanceSheetTarget_();
  var stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd_HHmmss');
  var copy = DriveApp.getFileById(ss.getId()).makeCopy('BACKUP_SILAHAR_' + label + '_' + stamp);
  Logger.log('Backup dibuat: ' + copy.getUrl());
  return copy.getUrl();
}

// -------------------- EKSEKUSI --------------------
function bersihkanSheetTakTerpakai(opts) {
  opts = opts || {};
  var dryRun = opts.dryRun !== false;
  var report = auditStrukturDatabase();
  var targets = report.sheets
    .filter(function (s) { return s.klasifikasi.indexOf('TIDAK_TERPAKAI') === 0; })
    .map(function (s) { return s.nama; });
  if (dryRun || targets.length === 0) {
    return { dryRun: dryRun, akan_dihapus: targets, backup: '' };
  }
  var backupUrl = buatBackupSpreadsheet_('bersih_sheet');
  var ss = maintenanceSheetTarget_();
  var prot = maintenanceProtected_();
  var dihapus = [];
  targets.forEach(function (n) {
    if (prot[n] || /^(ARSIP_|BACKUP_)/i.test(n)) return; // pengaman ganda
    var sh = ss.getSheetByName(n);
    if (sh && ss.getSheets().length > 1) { ss.deleteSheet(sh); dihapus.push(n); }
  });
  return { dryRun: false, dihapus: dihapus, backup: backupUrl };
}

function perbaikiKolomDatabase(opts) {
  opts = opts || {};
  var dryRun = opts.dryRun !== false;
  var report = auditStrukturDatabase();
  var plan = [];
  report.sheets.forEach(function (s) {
    if (!LOCAL_SHEET_HEADERS[s.nama]) return;
    (s.header_salah_huruf || []).forEach(function (h) {
      plan.push({ sheet: s.nama, aksi: 'betulkan_huruf_header', posisi: h.posisi, dari: h.fisik, menjadi: h.seharusnya });
    });
    (s.kolom_hilang || []).forEach(function (c) {
      plan.push({ sheet: s.nama, aksi: 'tambah_kolom_kontrak', kolom: c });
    });
    (s.kolom_ekstra || []).forEach(function (x) {
      if (!x.berisi_data) plan.push({ sheet: s.nama, aksi: 'hapus_kolom_kosong', posisi: x.posisi, kolom: x.nama });
    });
    (s.kolom_ekstra || []).forEach(function (x) {
      if (x.berisi_data) plan.push({ sheet: s.nama, aksi: 'DIPERTAHANKAN (ekstra berisi data — keputusan manual)', posisi: x.posisi, kolom: x.nama });
    });
  });
  var executable = plan.filter(function (p) { return p.aksi.indexOf('DIPERTAHANKAN') !== 0; });
  if (dryRun || executable.length === 0) {
    return { dryRun: dryRun, plan: plan, backup: '' };
  }
  var backupUrl = buatBackupSpreadsheet_('perbaiki_kolom');
  var ss = maintenanceSheetTarget_();
  var dijalankan = [];
  // Urutkan: betulkan huruf & tambah kolom dulu; hapus kolom terakhir
  // (posisi descending agar indeks tidak bergeser saat menghapus).
  executable.sort(function (a, b) {
    var rank = function (p) { return p.aksi === 'betulkan_huruf_header' ? 0 : (p.aksi === 'tambah_kolom_kontrak' ? 1 : 2); };
    if (rank(a) !== rank(b)) return rank(a) - rank(b);
    return (b.posisi || 0) - (a.posisi || 0);
  });
  executable.forEach(function (p) {
    var sh = ss.getSheetByName(p.sheet);
    if (!sh) return;
    if (p.aksi === 'betulkan_huruf_header') {
      sh.getRange(1, p.posisi).setValue(p.menjadi);
      dijalankan.push(p);
    } else if (p.aksi === 'tambah_kolom_kontrak') {
      var last = sh.getLastColumn();
      sh.getRange(1, last + 1).setValue(p.kolom);
      dijalankan.push(p);
    } else if (p.aksi === 'hapus_kolom_kosong') {
      if (sh.getLastColumn() > 1) { sh.deleteColumns(p.posisi, 1); dijalankan.push(p); }
    }
  });
  return { dryRun: false, dijalankan: dijalankan, plan_lengkap: plan, backup: backupUrl };
}

// Satu pintu untuk pemula: rencana dulu, eksekusi kemudian.
function rapikanDatabase(opts) {
  opts = opts || {};
  var dryRun = opts.dryRun !== false;
  var hasil = {
    mode: dryRun ? 'RENCANA (dry-run)' : 'EKSEKUSI (backup otomatis dulu)',
    sheet: bersihkanSheetTakTerpakai({ dryRun: dryRun }),
    kolom: perbaikiKolomDatabase({ dryRun: dryRun })
  };
  Logger.log('MODE: ' + hasil.mode);
  Logger.log('SHEET target hapus: ' + JSON.stringify(hasil.sheet.akan_dihapus || hasil.sheet.dihapus || []));
  Logger.log('AKSI KOLOM: ' + JSON.stringify((hasil.kolom.plan || hasil.kolom.dijalankan || []).map(function (p) {
    return p.sheet + ' | ' + p.aksi + (p.kolom ? ' | ' + p.kolom : '') + (p.dari ? ' | ' + p.dari + ' -> ' + p.menjadi : '');
  }), null, 1));
  Logger.log('BACKUP: ' + (hasil.sheet.backup || hasil.kolom.backup || '(dry-run: belum dibuat)'));
  return hasil;
}

// Wrapper panel Run GAS (tidak bisa oper argumen — pelajaran G18a):
// EKSEKUSI sungguhan, backup Drive otomatis dibuat dulu.
// Jalankan HANYA setelah membaca rencana rapikanDatabase() (dry-run).
function rapikanDatabaseLIVE() {
  return rapikanDatabase({ dryRun: false });
}

// ==================== G18a (2026-09-18): SEED MASTER KINERJA (FR-02/03) ====================
// Idempoten: seed hanya menulis bila id belum ada. Jalankan sekali dari editor
// setelah skema G18a ditempel: seedMasterKinerja()
function seedMasterKinerja() {
  var jt = [
    { kode: 'utama', nama: 'Utama (SKP)', keterangan: 'Hasil kerja utama sesuai SKP/RHK' },
    { kode: 'tambahan', nama: 'Tugas Tambahan', keterangan: 'Tugas tambahan dari atasan' },
    { kode: 'inovatif', nama: 'Inovatif', keterangan: 'Inovasi/perbaikan cara kerja' },
    { kode: 'tugas_lain', nama: 'Tugas Lain', keterangan: 'Kegiatan pendukung lain (tujuan migrasi legacy v1)' }
  ];
  var sat = [
    { kode: 'dokumen', nama: 'Dokumen', keterangan: '' },
    { kode: 'laporan', nama: 'Laporan', keterangan: '' },
    { kode: 'kegiatan', nama: 'Kegiatan', keterangan: '' },
    { kode: 'layanan', nama: 'Layanan', keterangan: '' },
    { kode: 'orang_hari', nama: 'Orang-Hari', keterangan: '' },
    { kode: 'paket', nama: 'Paket', keterangan: '' }
  ];
  var ada = { JENIS_TUGAS: {}, SATUAN: {} };
  readRecordsNoLock_('JENIS_TUGAS').forEach(function (r) { ada.JENIS_TUGAS[r.id] = true; });
  readRecordsNoLock_('SATUAN').forEach(function (r) { ada.SATUAN[r.id] = true; });
  var ditulis = { jenis_tugas: 0, satuan: 0 };
  jt.forEach(function (m) {
    var id = 'JT_' + m.kode;
    if (ada.JENIS_TUGAS[id]) return;
    writeRecordNoLock_('JENIS_TUGAS', { id: id, kode: m.kode, nama: m.nama, keterangan: m.keterangan, status: 'aktif' }, false, systemActor_(), 'id');
    ditulis.jenis_tugas++;
  });
  sat.forEach(function (m) {
    var id = 'SAT_' + m.kode;
    if (ada.SATUAN[id]) return;
    writeRecordNoLock_('SATUAN', { id: id, kode: m.kode, nama: m.nama, keterangan: m.keterangan, status: 'aktif' }, false, systemActor_(), 'id');
    ditulis.satuan++;
  });
  Logger.log('SEED MASTER KINERJA: +' + ditulis.jenis_tugas + ' jenis_tugas, +' + ditulis.satuan + ' satuan (idempoten).');
  return ditulis;
}

// ==================== G18a (2026-09-18): MIGRASI v1 -> v2 (FR-21) ====================
// Mapping DIKUNCI pemilik: rutin->JT_utama, insidental->JT_tambahan,
// khusus->JT_inovatif, lainnya->JT_tugas_lain. rhk_id dibiarkan kosong
// (badge pra-RHK). Idempoten: baris yang jenis_tugas_id-nya sudah terisi dilewati.
// Dry-run default: migrateLaporanKeRealisasiV2() lalu {dryRun:false} untuk eksekusi
// (backup Drive otomatis dibuat sebelum tulis).
function migrateLaporanKeRealisasiV2(opts) {
  opts = opts || {};
  var dryRun = opts.dryRun !== false;
  var MAP = { rutin: 'JT_utama', insidental: 'JT_tambahan', khusus: 'JT_inovatif' };
  var rows = readRecordsNoLock_('LAPORAN_HARIAN').filter(function (r) { return !r.deleted_at; });
  var targets = rows.filter(function (r) { return String(r.jenis_tugas_id || '').trim() === ''; });
  var plan = targets.map(function (r) {
    var jenisLama = String(r.jenis_kegiatan || '').toLowerCase().trim();
    return { id: r.id, tanggal: r.tanggal, jenis_lama: jenisLama, jenis_tugas_id: MAP[jenisLama] || 'JT_tugas_lain' };
  });
  if (dryRun) {
    Logger.log('RENCANA MIGRASI v2: ' + plan.length + ' baris akan dipetakan.');
    Logger.log(JSON.stringify(plan, null, 1));
    return { dryRun: true, jumlah: plan.length, plan: plan };
  }
  var backupUrl = buatBackupSpreadsheet_('migrasi_v2');
  var byId = {};
  targets.forEach(function (r) { byId[r.id] = r; });
  var done = 0;
  plan.forEach(function (p) {
    var r = byId[p.id];
    if (!r) return;
    r.jenis_tugas_id = p.jenis_tugas_id;
    writeRecordNoLock_('LAPORAN_HARIAN', r, true, systemActor_(), 'id');
    done++;
  });
  Logger.log('MIGRASI v2 SELESAI: ' + done + ' baris. Backup: ' + backupUrl);
  return { dryRun: false, jumlah: done, backup: backupUrl };
}

/**
 * Wrapper TANPA argumen — jalan langsung dari tombol Run.
 * (Dialog argumen GAS sering tidak muncul / argumen tidak terbaca.)
 */
function migrateLaporanKeRealisasiV2LIVE() {
  return migrateLaporanKeRealisasiV2({ dryRun: false });
}

// ==================== G18c: SEED DATA DEMO e-KINERJA (uji frontend) ====================
// Tujuan: mengisi RHK/rencana/realisasi/lampiran contoh agar dashboard, kanban,
// kalender, SKP Bulanan & antrian verifikasi TERBACA saat uji UI.
// Aman & idempoten: semua id berprefiks DEMO_ — jalankan ulang tidak menduplikasi.
// Bersihkan kapan saja: deleteDemoKinerja() (hapus lunak semua baris DEMO_).
function seedDemoKinerja() {
  var tz = Session.getScriptTimeZone();
  var hariIni = new Date();
  var periode = Utilities.formatDate(hariIni, tz, 'yyyy-MM');
  var tahun = Number(periode.slice(0, 4));
  function tgl(offset) {
    var d = new Date(hariIni.getTime());
    d.setDate(d.getDate() + offset);
    return Utilities.formatDate(d, tz, 'yyyy-MM-dd');
  }
  // ambil hingga 4 pegawai pertama dari referensi SIMPEG
  var pegawai = [];
  try { pegawai = getSheetDataCached_('PEGAWAI').slice(0, 4); } catch (e) {}
  if (!pegawai.length) {
    Logger.log('SEED DEMO: referensi PEGAWAI kosong — tidak bisa seed. Isi MASTER_SPREADSHEET_ID dulu.');
    return { success: false };
  }
  var jt = ['JT_utama', 'JT_tambahan', 'JT_inovatif'];
  var satuan = ['SAT_dokumen', 'SAT_laporan', 'SAT_kegiatan'];
  var ada = {};
  ['RHK_SKP', 'RENCANA_HARIAN', 'LAPORAN_HARIAN', 'LAMPIRAN_BUKTI'].forEach(function (s) {
    ada[s] = {};
    readRecordsNoLock_(s).forEach(function (r) { ada[s][r.id] = true; });
  });
  var ditulis = { rhk: 0, rencana: 0, realisasi: 0, lampiran: 0 };
  function tulis(sheet, rec) {
    if (ada[sheet][rec.id]) return false;
    writeRecordNoLock_(sheet, rec, false, systemActor_(), 'id');
    return true;
  }
  pegawai.forEach(function (p, pi) {
    var pid = String(p.pegawai_id || p.id || '').trim();
    if (!pid) return;
    // 1 RHK aktif per pegawai
    var rhkId = 'DEMO_RHK_' + (pi + 1);
    if (tulis('RHK_SKP', {
      id: rhkId, pegawai_id: pid, periode_tahun: tahun, jenis_rhk: 'utama', klasifikasi: 'individu',
      nama_rhk: 'Tersedianya laporan ' + (pi === 0 ? 'patroli wilayah' : pi === 1 ? 'penertiban umum' : pi === 2 ? 'pelayanan perizinan' : 'data kepegawaian') + ' yang akurat dan tepat waktu',
      indikator: 'jumlah dokumen laporan per bulan', satuan_id: satuan[pi % 3],
      target_tahunan: 12, rhk_atasan_id: '', status: 'aktif'
    })) ditulis.rhk++;
    // 5 rencana: -3..+1 hari, status bervariasi
    var rencana = [
      { off: -3, st: 'diverifikasi', pr: 'biasa' },
      { off: -2, st: 'selesai', pr: 'penting' },
      { off: -1, st: 'dikerjakan', pr: 'biasa' },
      { off: 0, st: 'direncanakan', pr: 'mendesak' },
      { off: 1, st: 'direncanakan', pr: 'biasa' }
    ];
    rencana.forEach(function (r, ri) {
      var renId = 'DEMO_REN_' + (pi + 1) + '_' + (ri + 1);
      if (tulis('RENCANA_HARIAN', {
        id: renId, pegawai_id: pid, tanggal_rencana: tgl(r.off), rhk_id: rhkId,
        jenis_tugas_id: jt[ri % 3], rencana_hasil: 'Rencana kerja demo #' + (ri + 1) + ' — ' + (p.nama || pid),
        prioritas: r.pr, status: r.st, realisasi_id: (r.st === 'selesai' || r.st === 'diverifikasi') ? ('DEMO_LH_' + (pi + 1) + '_' + (ri + 1)) : ''
      })) ditulis.rencana++;
      // realisasi untuk rencana yang selesai/diverifikasi
      if (r.st === 'selesai' || r.st === 'diverifikasi') {
        var lhId = 'DEMO_LH_' + (pi + 1) + '_' + (ri + 1);
        var sv = r.st === 'diverifikasi' ? 'disetujui' : 'menunggu';
        if (tulis('LAPORAN_HARIAN', {
          id: lhId, pegawai_id: pid, tanggal: tgl(r.off), waktu_mulai: '08:00', waktu_selesai: '11:00',
          durasi_menit: 180, jenis_kegiatan: '', deskripsi: 'Realisasi demo: ' + (p.nama || pid) + ' menyelesaikan rencana #' + (ri + 1),
          hasil: 'Dokumen selesai 100%', kendala: '', tindak_lanjut: '', file_url: '',
          rhk_id: rhkId, rencana_id: renId, jenis_tugas_id: jt[ri % 3],
          volume: ri + 1, satuan_id: satuan[pi % 3],
          status_verifikasi: sv, catatan_atasan: sv === 'disetujui' ? 'Baik, pertahankan.' : '',
          verifikator_id: sv === 'disetujui' ? 'DEMO_VERIF' : '', tanggal_verifikasi: sv === 'disetujui' ? tgl(r.off) : ''
        })) ditulis.realisasi++;
        var lampId = 'DEMO_LAMP_' + (pi + 1) + '_' + (ri + 1);
        if (tulis('LAMPIRAN_BUKTI', {
          id: lampId, realisasi_id: lhId, jenis_bukti: 'link',
          url: 'https://drive.google.com/demo-contoh', nama_bukti: 'Dokumen bukti demo', keterangan: ''
        })) ditulis.lampiran++;
      }
    });
  });
  // rekap bulan berjalan agar SKP Bulanan langsung terbaca
  Logger.log('SEED DEMO: +' + ditulis.rhk + ' RHK, +' + ditulis.rencana + ' rencana, +' + ditulis.realisasi + ' realisasi, +' + ditulis.lampiran + ' lampiran.');
  Logger.log('Lanjut: jalankan generate_rekap_bulanan dari UI (menu SKP Bulanan, periode ' + periode + ').');
  return { success: true, ditulis: ditulis };
}

// Hapus lunak semua baris DEMO_ (4 sheet) — pembersihan setelah uji UI.
function deleteDemoKinerja() {
  var dihapus = { RHK_SKP: 0, RENCANA_HARIAN: 0, LAPORAN_HARIAN: 0, LAMPIRAN_BUKTI: 0 };
  Object.keys(dihapus).forEach(function (sheet) {
    readRecordsNoLock_(sheet).forEach(function (r) {
      if (String(r.id || '').indexOf('DEMO_') === 0 && !r.deleted_at) {
        softDeleteRecordNoLock_(sheet, r.id, systemActor_(), 'id');
        dihapus[sheet]++;
      }
    });
    invalidateSheetCache_(sheet);
  });
  Logger.log('DELETE DEMO: ' + JSON.stringify(dihapus));
  return dihapus;
}

// ==================== G18c-2 REVIEW: RAPIKAN SHEET KONFIGURASI (2026-09-18) =================
// Temuan review pemilik (screenshot Pengaturan): (1) sisa uji 'temp_val' x3,
// (2) baris 'tergeser' (key='58' & key=string token — isi bergeser satu kolom
// ke kiri, keterangan jadi timestamp), (3) key uzur warisan v1/app lain yang
// 0 referensi di kode, (4) nilai lama app_name/app_version/instansi.
// Aturan: yang cocok aturan = dieksekusi; yang ragU = hanya DILAPORKAN
// (keputusan manual pemilik). Backup Drive otomatis sebelum eksekusi.
function rapikanKonfigurasiSilahar(opts) {
  opts = opts || {};
  var dryRun = opts.dryRun !== false;
  var ss = maintenanceSheetTarget_();
  var sh = ss.getSheetByName('KONFIGURASI');
  if (!sh) return { error: 'Sheet KONFIGURASI tidak ditemukan.' };
  var vals = sh.getDataRange().getValues();
  var head = (vals[0] || []).map(function (h) { return String(h).toLowerCase().trim(); });
  var iKey = head.indexOf('key'), iVal = head.indexOf('value'),
      iKet = head.indexOf('keterangan'), iUpd = head.indexOf('updated_at');
  if (iKey < 0 || iVal < 0) return { error: 'Header KONFIGURASI tidak punya kolom key/value.' };

  var RETIRE = ['jenis_kegiatan_list', 'jenis_kompetensi_list', 'jenis_pengawasan_list', 'instansi_nama'];
  var UPDATE = {
    app_name: { value: 'SILAHAR', keterangan: 'Nama aplikasi' },
    app_version: { value: '2.0.0', keterangan: 'Versi aplikasi (e-Kinerja Harian, G18c-2)' },
    instansi: { value: 'Satpol PP & Pemadam Kebakaran Kab. Trenggalek', keterangan: 'Nama instansi' }
  };
  var MANUAL = ['service_token', 'bup'];

  var plan = [], seen = {};
  for (var r = 1; r < vals.length; r++) {
    var key = String(vals[r][iKey] == null ? '' : vals[r][iKey]).trim();
    if (!key) continue;
    var ket = iKet >= 0 ? String(vals[r][iKet] == null ? '' : vals[r][iKet]) : '';
    var alasan = '';
    if (/^temp_val/.test(key)) alasan = 'sisa uji hapus (test leftover)';
    else if (/^\d+$/.test(key)) alasan = 'baris tergeser (value angka nyasar jadi key)';
    else if (key === 'SI-KINERJA-SERVICE-TOKEN-2026') alasan = 'baris tergeser (value token dipakai jadi key; baris benar: service_token)';
    else if (RETIRE.indexOf(key) >= 0) alasan = 'key uzur warisan v1/app lain (0 referensi di kode)';
    if (!alasan) {
      if (seen[key] === undefined) { seen[key] = r; continue; }
      // Duplikat: simpan yang updated_at-nya terbaru (fallback: urutan sheet).
      var keep = seen[key], drop = r;
      if (iUpd >= 0) {
        var u1 = String(vals[keep][iUpd] == null ? '' : vals[keep][iUpd]);
        var u2 = String(vals[r][iUpd] == null ? '' : vals[r][iUpd]);
        if (u1 && u2 && u2 > u1) { drop = keep; keep = r; }
      }
      plan.push({ baris: drop + 1, key: key, aksi: 'hapus', alasan: 'duplikat key — baris lama dihapus, terbaru disimpan' });
      seen[key] = keep;
      continue;
    }
    plan.push({ baris: r + 1, key: key, aksi: 'hapus', alasan: alasan });
  }
  Object.keys(seen).forEach(function (k) {
    if (MANUAL.indexOf(k) >= 0) plan.push({ baris: seen[k] + 1, key: k, aksi: 'MANUAL', alasan: '0 referensi di kode; mungkin token/HR eksternal — keputusan pemilik' });
    var ketV = iKet >= 0 ? String(vals[seen[k]][iKet] == null ? '' : vals[seen[k]][iKet]) : '';
    if (/^\d{4}-\d{2}-\d{2}T/.test(ketV) && !UPDATE[k]) plan.push({ baris: seen[k] + 1, key: k, aksi: 'MANUAL', alasan: 'kolom keterangan berisi timestamp (indikasi tulis tergeser)' });
    if (UPDATE[k]) {
      // Idempoten (fix 2026-09-18): usulkan update HANYA bila nilai/keterangan
      // saat ini berbeda dari target — dry-run ulang tidak lagi berisik.
      var curVal = String(vals[seen[k]][iVal] == null ? '' : vals[seen[k]][iVal]);
      var curKet = iKet >= 0 ? String(vals[seen[k]][iKet] == null ? '' : vals[seen[k]][iKet]) : '';
      if (curVal !== UPDATE[k].value || (iKet >= 0 && curKet !== UPDATE[k].keterangan)) {
        plan.push({ baris: seen[k] + 1, key: k, aksi: 'update', alasan: 'nilai/keterangan lama → ' + UPDATE[k].value });
      }
    }
  });

  var executable = plan.filter(function (p) { return p.aksi === 'hapus' || p.aksi === 'update'; });

  // LOG PLAN (fix tooling 2026-09-18: sebelumnya rencana hanya jadi return
  // value → TIDAK TERLIHAT di log Run panel GAS saat dry-run).
  Logger.log('=== RAPIKAN KONFIGURASI SILAHAR | ' + (dryRun ? 'MODE: RENCANA (dry-run)' : 'MODE: LIVE') + ' ===');
  Logger.log('Total baris KONFIGURASI (termasuk header): ' + vals.length);
  if (!plan.length) Logger.log('Plan: (bersih — tidak ada yang perlu diubah)');
  plan.forEach(function (p) {
    Logger.log('- [' + p.aksi + '] baris ' + p.baris + ' | key: ' + p.key + ' | ' + p.alasan);
  });
  Logger.log('Eksekusi (hapus+update): ' + executable.length + ' aksi' + (dryRun ? ' (dry-run: TIDAK dijalankan)' : ''));

  if (dryRun || executable.length === 0) return { dryRun: dryRun, plan: plan, backup: '' };

  var backupUrl = buatBackupSpreadsheet_('rapikan_konfigurasi');
  // hapus dulu (posisi menurun agar indeks stabil), lalu update by-key
  plan.filter(function (p) { return p.aksi === 'hapus'; })
      .sort(function (a, b) { return b.baris - a.baris; })
      .forEach(function (p) { sh.deleteRow(p.baris); });
  var vals2 = sh.getDataRange().getValues();
  plan.filter(function (p) { return p.aksi === 'update'; }).forEach(function (p) {
    for (var i = 1; i < vals2.length; i++) {
      if (String(vals2[i][iKey] == null ? '' : vals2[i][iKey]).trim() === p.key) {
        sh.getRange(i + 1, iVal + 1).setValue(UPDATE[p.key].value);
        if (iKet >= 0) sh.getRange(i + 1, iKet + 1).setValue(UPDATE[p.key].keterangan);
        break;
      }
    }
  });
  Logger.log('SELESAI LIVE: ' + executable.length + ' aksi dijalankan. Backup: ' + backupUrl);
  return { dryRun: false, dijalankan: executable, plan_lengkap: plan, backup: backupUrl };
}

// Wrapper panel Run GAS: EKSEKUSI (backup otomatis). Jalankan HANYA
// setelah membaca rencana rapikanKonfigurasiSilahar() (dry-run).
function rapikanKonfigurasiSilaharLIVE() {
  return rapikanKonfigurasiSilahar({ dryRun: false });
}
