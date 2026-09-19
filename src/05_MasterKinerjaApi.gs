// ============================================================
// SILAHAR - 05_MasterKinerjaApi.gs (G18b-split, 2026-09-18)
// Domain MASTER KINERJA: RHK/SKP tahunan + kamus jenis tugas & satuan.
// FR-01..FR-04.
// Bagian dari pemecahan 04_KinerjaApi.gs per domain (pola
// si-kompetensi). Helper bersama ada di 04_KinerjaUtils.gs;
// registrasi aksi ada di kinerjaHandlers_() (04_KinerjaUtils).
// ============================================================

// ==================== FR-01..FR-04: RHK_SKP ====================

// get_rhk_list — viewer: hanya milik sendiri (FR-04 picker = aktif milik sesi).
function ekGetRhkList_(data, actor) {
  data = data || {};
  try {
    var rows = ekRows_('RHK_SKP');
    var filters = data.filters || data;
    var fPeg = String(filters.pegawai_id || '').trim();
    var fTahun = String(filters.periode_tahun || '').trim();
    var fStatus = String(filters.status || '').toLowerCase().trim();
    if (!isAdminActor_(actor)) {
      var myPeg = actorPegawaiId_(actor);
      if (!myPeg) return { success: true, data: [], meta: { total: 0, page: 1, limit: 50, total_pages: 1 } };
      fPeg = myPeg; // viewer selalu dipaksa milik sendiri
    }
    if (fPeg) rows = rows.filter(function (r) { return String(r.pegawai_id || '').trim() === fPeg; });
    if (fTahun) rows = rows.filter(function (r) { return String(r.periode_tahun || '') === fTahun; });
    if (fStatus) rows = rows.filter(function (r) { return String(r.status || 'aktif').toLowerCase() === fStatus; });
    rows.sort(function (a, b) { return ekNum_(b.periode_tahun) - ekNum_(a.periode_tahun); });
    return paginate_(rows, data.page, data.limit || 50);
  } catch (err) { return ekFail_('BAD_REQUEST', err.message); }
}

// save_rhk — admin (lapis 1 actionLevels, lapis 2 di sini). Validasi FR-01.
function ekSaveRhk_(data, actor) {
  data = data || {};
  if (!isAdminActor_(actor)) return ekFail_('FORBIDDEN', 'Kelola RHK hanya untuk admin.');
  var rec = Object.assign({}, data.record || data.row || data);
  rec.pegawai_id = String(rec.pegawai_id || '').trim();
  if (!rec.pegawai_id) return ekFail_('BAD_REQUEST', 'pegawai_id wajib diisi.');
  if (!ekPegawaiDikenal_(rec.pegawai_id)) return ekFail_('BAD_REQUEST', 'pegawai_id tidak dikenal di referensi SIMPEG.');
  rec.periode_tahun = ekNum_(rec.periode_tahun);
  if (!(rec.periode_tahun >= 2000 && rec.periode_tahun <= 2100)) return ekFail_('BAD_REQUEST', 'periode_tahun wajib tahun valid (mis. 2026).');
  rec.jenis_rhk = ekEnum_(rec.jenis_rhk, EK_ENUM.jenis_rhk);
  if (!rec.jenis_rhk) return ekFail_('BAD_REQUEST', 'jenis_rhk harus utama/tambahan.');
  rec.klasifikasi = ekEnum_(rec.klasifikasi, EK_ENUM.klasifikasi, 'individu') || 'individu';
  if (!String(rec.nama_rhk || '').trim()) return ekFail_('BAD_REQUEST', 'nama_rhk wajib diisi (kalimat HASIL).');
  if (!ekMasterAktif_('SATUAN', rec.satuan_id)) return ekFail_('BAD_REQUEST', 'satuan_id harus satuan aktif.');
  rec.target_tahunan = ekNum_(rec.target_tahunan);
  if (!(rec.target_tahunan > 0)) return ekFail_('BAD_REQUEST', 'target_tahunan wajib numerik > 0.');
  rec.status = ekEnum_(rec.status, EK_ENUM.status_master, 'aktif') || 'aktif';
  return apiSave_('RHK_SKP', rec, actor);
}

// delete_rhk — admin; tolak bila masih terpakai rencana/realisasi.
function ekDeleteRhk_(data, actor) {
  data = data || {};
  if (!isAdminActor_(actor)) return ekFail_('FORBIDDEN', 'Hapus RHK hanya untuk admin.');
  var id = String(data.id || (data.record && data.record.id) || '').trim();
  if (!id) return ekFail_('BAD_REQUEST', 'ID RHK wajib diisi.');
  if (!ekFind_('RHK_SKP', id)) return ekFail_('NOT_FOUND', 'RHK tidak ditemukan.');
  if (ekMasterDipakai_('RENCANA_HARIAN', 'rhk_id', id) || ekMasterDipakai_('LAPORAN_HARIAN', 'rhk_id', id)) {
    return ekFail_('BAD_REQUEST', 'RHK masih dipakai rencana/realisasi — nonaktifkan (status=nonaktif), jangan hapus.');
  }
  return apiDelete_('RHK_SKP', id, actor);
}

// ==================== FR-02/FR-03: JENIS_TUGAS & SATUAN ====================

function ekGetJenisTugasList_(data, actor) {
  data = data || {};
  var rows = ekRows_('JENIS_TUGAS');
  if (!data.all || !isAdminActor_(actor)) rows = rows.filter(function (r) { return String(r.status || 'aktif').toLowerCase() === 'aktif'; });
  return { success: true, data: rows };
}
function ekGetSatuanList_(data, actor) {
  data = data || {};
  var rows = ekRows_('SATUAN');
  if (!data.all || !isAdminActor_(actor)) rows = rows.filter(function (r) { return String(r.status || 'aktif').toLowerCase() === 'aktif'; });
  return { success: true, data: rows };
}

// save_jenis_tugas / save_satuan — admin; kode unik; entri terpakai: kode tak
// boleh diganti & hanya boleh dinonaktifkan (bukan dihapus).
function ekSaveMasterKamus_(sheet, data, actor, cekDipakai) {
  data = data || {};
  if (!isAdminActor_(actor)) return ekFail_('FORBIDDEN', 'Kelola master hanya untuk admin.');
  var rec = Object.assign({}, data.record || data.row || data);
  rec.kode = String(rec.kode || '').toLowerCase().trim();
  if (!rec.kode) return ekFail_('BAD_REQUEST', 'kode wajib diisi.');
  if (!String(rec.nama || '').trim()) return ekFail_('BAD_REQUEST', 'nama wajib diisi.');
  rec.status = ekEnum_(rec.status, EK_ENUM.status_master, 'aktif') || 'aktif';
  // kode unik antar baris hidup (kecuali dirinya sendiri)
  var dup = ekRows_(sheet).filter(function (r) {
    return String(r.kode || '').toLowerCase() === rec.kode && String(r.id || '') !== String(rec.id || '');
  });
  if (dup.length) return ekFail_('BAD_REQUEST', 'kode "' + rec.kode + '" sudah dipakai entri lain.');
  var old = rec.id ? ekFind_(sheet, rec.id) : null;
  if (old && cekDipakai(old.id)) {
    if (String(old.kode || '').toLowerCase() !== rec.kode) {
      return ekFail_('BAD_REQUEST', 'Entri sudah terpakai — kode tidak boleh diganti (ubah nama/status saja).');
    }
  }
  return apiSave_(sheet, rec, actor);
}
function ekSaveJenisTugas_(data, actor) { return ekSaveMasterKamus_('JENIS_TUGAS', data, actor, ekJenisTugasDipakai_); }
function ekSaveSatuan_(data, actor) { return ekSaveMasterKamus_('SATUAN', data, actor, ekSatuanDipakai_); }
