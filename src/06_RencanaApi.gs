// ============================================================
// SILAHAR - 06_RencanaApi.gs (G18b-split, 2026-09-18; revisi G18d 2026-09-19)
// ------------------------------------------------------------
// Domain RENCANA HARIAN: kanban + kalender, transisi status, hapus.
// FR-05..FR-09.
//
// Bagian dari pemecahan 04_KinerjaApi.gs per domain (pola si-kompetensi).
// Helper bersama ada di 04_KinerjaUtils.gs;
// registrasi aksi ada di kinerjaHandlers_() (04_KinerjaUtils).
//
// Catatan mode:
//   Kanban & Kalender = dua menu terpisah (keputusan pemilik 2026-09-18),
//   tapi backend-nya SATU: get_rencana_list + filter tanggal. Frontend
//   menyajikan data yang sama dengan dua cara berbeda.
//
// G18d (2026-09-19, adopsi CoreLib v2.3.0):
//   - Tidak ada perubahan fungsional — semua helper yang dipakai
//     (tanggalKey10_, paginate_, ekEnum_, ekGuardMilik_, ekMasterAktif_)
//     sudah didelegasikan atau tidak butuh adopsi.
//   - Header changelog diselaraskan.
// ============================================================

// ==================== FR-05..FR-09: RENCANA HARIAN ====================

// get_rencana_list — filter tanggal / dari-sampai / pegawai / status.
// Viewer dipaksa milik sendiri. Urut: tanggal ASC, prioritas DESC.
function ekGetRencanaList_(data, actor) {
  data = data || {};
  try {
    var rows    = ekRows_('RENCANA_HARIAN');
    var filters = data.filters || data;

    var fPeg = String(filters.pegawai_id || '').trim();
    if (!isAdminActor_(actor)) {
      var myPeg = actorPegawaiId_(actor);
      if (!myPeg) {
        return { success: true, data: [], meta: { total: 0, page: 1, limit: 100, total_pages: 1 } };
      }
      fPeg = myPeg;
    }

    var fTgl     = tanggalKey10_(filters.tanggal);
    var fDari    = tanggalKey10_(filters.dari    || filters.dari_tanggal);
    var fSampai  = tanggalKey10_(filters.sampai  || filters.sampai_tanggal);
    var fStatus  = String(filters.status || '').toLowerCase().trim();

    if (fPeg)    rows = rows.filter(function (r) { return String(r.pegawai_id || '').trim() === fPeg; });
    if (fTgl)    rows = rows.filter(function (r) { return tanggalKey10_(r.tanggal_rencana) === fTgl; });
    if (fDari)   rows = rows.filter(function (r) { return tanggalKey10_(r.tanggal_rencana) >= fDari; });
    if (fSampai) rows = rows.filter(function (r) { return tanggalKey10_(r.tanggal_rencana) <= fSampai; });
    if (fStatus) rows = rows.filter(function (r) { return String(r.status || 'direncanakan').toLowerCase() === fStatus; });

    rows.sort(function (a, b) {
      var ta = tanggalKey10_(a.tanggal_rencana), tb = tanggalKey10_(b.tanggal_rencana);
      if (ta !== tb) return ta < tb ? -1 : 1;
      var pr = { mendesak: 0, penting: 1, biasa: 2 };
      return (pr[a.prioritas] === undefined ? 3 : pr[a.prioritas]) -
             (pr[b.prioritas] === undefined ? 3 : pr[b.prioritas]);
    });

    return paginate_(rows, data.page, data.limit || 100);
  } catch (err) {
    return ekFail_('BAD_REQUEST', err.message);
  }
}

// save_rencana — FR-05. Status TIDAK bisa diubah lewat save (warisi lama;
// pindah status hanya via move_status_rencana — cermin pola P2 di 02_AppLogic).
function ekSaveRencana_(data, actor) {
  data = data || {};
  try {
    var rec = Object.assign({}, data.record || data.row || data);
    var old = rec.id ? ekFind_('RENCANA_HARIAN', rec.id) : null;

    if (old) {
      var g = ekGuardMilik_(actor, old.pegawai_id);
      if (g) return g;
      rec.pegawai_id = old.pegawai_id; // pemilik tak bisa dipindah lewat save
    } else {
      if (!isAdminActor_(actor)) rec.pegawai_id = actorPegawaiId_(actor);
      var g2 = ekGuardMilik_(actor, rec.pegawai_id);
      if (g2) return g2;
    }
    if (!rec.pegawai_id) return ekFail_('BAD_REQUEST', 'Akun belum terhubung ke pegawai. Hubungi admin.');

    rec.tanggal_rencana = tanggalKey10_(rec.tanggal_rencana || rec.tanggal);
    if (!rec.tanggal_rencana)                    return ekFail_('BAD_REQUEST', 'tanggal_rencana wajib diisi.');
    if (!String(rec.rencana_hasil || '').trim()) return ekFail_('BAD_REQUEST', 'rencana_hasil wajib diisi.');

    rec.prioritas = ekEnum_(rec.prioritas, EK_ENUM.prioritas, 'biasa') || 'biasa';

    // Validasi RHK & jenis tugas (bila diisi)
    if (String(rec.jenis_tugas_id || '').trim()) {
      if (!ekMasterAktif_('JENIS_TUGAS', rec.jenis_tugas_id)) {
        return ekFail_('BAD_REQUEST', 'jenis_tugas_id harus jenis aktif.');
      }
    }
    if (String(rec.rhk_id || '').trim()) {
      var rhk = ekMasterAktif_('RHK_SKP', rec.rhk_id);
      if (!rhk) return ekFail_('BAD_REQUEST', 'rhk_id harus RHK aktif.');
      if (String(rhk.pegawai_id || '').trim() !== String(rec.pegawai_id).trim()) {
        return ekFail_('BAD_REQUEST', 'RHK milik pegawai lain — pilih RHK milik sendiri.');
      }
    } else {
      rec.rhk_id = '';
    }

    // Status & realisasi_id: baru = 'direncanakan'; update = warisi (FR-06).
    rec.status       = old ? String(old.status || 'direncanakan') : 'direncanakan';
    rec.realisasi_id = old ? (old.realisasi_id || '')             : '';

    return apiSave_('RENCANA_HARIAN', rec, actor);
  } catch (err) {
    return ekFail_('BAD_REQUEST', err.message);
  }
}

// move_status_rencana — FR-06 (guard transisi; diverifikasi hanya alur verifikasi).
function ekMoveStatusRencana_(data, actor) {
  data = data || {};
  var id     = String(data.id || '').trim();
  var tujuan = String(data.status_baru || data.status || '').toLowerCase().trim();

  if (!id) return ekFail_('BAD_REQUEST', 'ID rencana wajib diisi.');
  if (EK_ENUM.status_rencana.indexOf(tujuan) < 0) {
    return ekFail_('BAD_REQUEST', 'Status tujuan tidak dikenal.');
  }
  if (tujuan === 'diverifikasi') {
    return ekFail_('FORBIDDEN', 'Status diverifikasi hanya diisi alur verifikasi.');
  }

  var lock = acquireLock_();
  if (!lock) return ekFail_('BUSY', 'Server sibuk, silakan coba lagi.');
  try {
    var row = ekFind_('RENCANA_HARIAN', id);
    if (!row) return ekFail_('NOT_FOUND', 'Rencana tidak ditemukan.');

    var g = ekGuardMilik_(actor, row.pegawai_id);
    if (g) return g;

    var sekarang = String(row.status || 'direncanakan').toLowerCase();
    if (sekarang === tujuan) return { success: true, data: row }; // idempoten

    // Non-admin: cek transisi legal.
    if (!isAdminActor_(actor)) {
      var legal = EK_TRANSISI_RENCANA[sekarang] || [];
      if (legal.indexOf(tujuan) < 0) {
        return ekFail_('BAD_REQUEST', 'Transisi ' + sekarang + ' -> ' + tujuan + ' tidak diizinkan.');
      }
    }

    row.status = tujuan;
    var saved = writeRecordNoLock_('RENCANA_HARIAN', row, true, actor, 'id');
    invalidateSheetCache_('RENCANA_HARIAN');
    return { success: true, data: saved };
  } catch (err) {
    return ekFail_('BAD_REQUEST', err.message);
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}

// delete_rencana — FR-09: pemilik & status 'direncanakan'; admin bebas
// kecuali sudah terhubung realisasi.
function ekDeleteRencana_(data, actor) {
  data = data || {};
  var id = String(data.id || (data.record && data.record.id) || '').trim();
  if (!id) return ekFail_('BAD_REQUEST', 'ID rencana wajib diisi.');

  var row = ekFind_('RENCANA_HARIAN', id);
  if (!row) return ekFail_('NOT_FOUND', 'Rencana tidak ditemukan.');

  var g = ekGuardMilik_(actor, row.pegawai_id);
  if (g) return g;

  var terhubungRealisasi = String(row.realisasi_id || '').trim() !== '' ||
    ekMasterDipakai_('LAPORAN_HARIAN', 'rencana_id', id);
  if (terhubungRealisasi) {
    return ekFail_('BAD_REQUEST', 'Rencana sudah terhubung realisasi — tidak boleh dihapus.');
  }

  if (!isAdminActor_(actor) && String(row.status || '').toLowerCase() !== 'direncanakan') {
    return ekFail_('BAD_REQUEST', 'Rencana hanya bisa dihapus saat status "direncanakan" (atau minta admin).');
  }

  return apiDelete_('RENCANA_HARIAN', id, actor);
}
