// ============================================================
// SILAHAR - 07_RealisasiApi.gs (G18b-split, 2026-09-18; revisi G18d 2026-09-19)
// ------------------------------------------------------------
// Domain REALISASI HARIAN:
//   - entri hasil kerja (baris LAPORAN_HARIAN v2) — FR-10/12/14
//   - bukti lampiran (LAMPIRAN_BUKTI, multi) — FR-11
//   - tautan rencana <-> realisasi (dua arah) — FR-14
//
// Bagian dari pemecahan 04_KinerjaApi.gs per domain (pola si-kompetensi).
// Helper bersama ada di 04_KinerjaUtils.gs;
// registrasi aksi ada di kinerjaHandlers_() (04_KinerjaUtils).
//
// Catatan atomicity:
//   Validasi lampiran dijalankan DULU sebelum realisasi disimpan, agar
//   kegagalan lampiran tidak meninggalkan realisasi yatim (yatim = ada
//   realisasi tanpa lampiran valid). Lihat ekValidasiLampiran_ dipanggil
//   dua kali: sekali di awal (validasi), sekali lagi di ekSinkronLampiran_.
//
// G18d (2026-09-19, adopsi CoreLib v2.3.0):
//   - Tidak ada perubahan fungsional — semua helper yang dipakai
//     (tanggalKey10_, paginate_, matchSearch_, ekEnum_, ekGuardMilik_,
//     ekMasterAktif_, ekValidasiLampiran_) sudah didelegasikan atau
//     tidak butuh adopsi.
//   - Header changelog diselaraskan.
// ============================================================

// ==================== FR-10..FR-14: REALISASI + LAMPIRAN ====================

// get_realisasi_list — filter tanggal/pegawai/rhk/status_verifikasi + search;
// viewer default sendiri; lampiran ikut (nested).
//
// Catatan: 'uraian_hasil' adalah ALIAS frontend untuk kolom fisik 'deskripsi';
// dimasukkan ke field search agar tidak error bila frontend memakai nama itu,
// tapi pencocokan sesungguhnya ada di 'deskripsi'.
function ekGetRealisasiList_(data, actor) {
  data = data || {};
  try {
    var rows    = ekRows_('LAPORAN_HARIAN');
    var filters = data.filters || data;

    var fPeg = String(filters.pegawai_id || '').trim();
    if (!isAdminActor_(actor)) {
      var myPeg = actorPegawaiId_(actor);
      if (!myPeg) {
        return { success: true, data: [], meta: { total: 0, page: 1, limit: 20, total_pages: 1 } };
      }
      fPeg = myPeg;
    }

    var fTgl    = tanggalKey10_(filters.tanggal);
    var fDari   = tanggalKey10_(filters.dari   || filters.dari_tanggal);
    var fSampai = tanggalKey10_(filters.sampai || filters.sampai_tanggal);
    var fRhk    = String(filters.rhk_id || '').trim();
    var fVerif  = String(filters.status_verifikasi || '').toLowerCase().trim();

    if (fPeg)    rows = rows.filter(function (r) { return String(r.pegawai_id || '').trim() === fPeg; });
    if (fTgl)    rows = rows.filter(function (r) { return tanggalKey10_(r.tanggal) === fTgl; });
    if (fDari)   rows = rows.filter(function (r) { return tanggalKey10_(r.tanggal) >= fDari; });
    if (fSampai) rows = rows.filter(function (r) { return tanggalKey10_(r.tanggal) <= fSampai; });
    if (fRhk)    rows = rows.filter(function (r) { return String(r.rhk_id || '').trim() === fRhk; });
    if (fVerif)  rows = rows.filter(function (r) { return String(r.status_verifikasi || 'menunggu').toLowerCase() === fVerif; });

    var q = String(data.search || '').toLowerCase().trim();
    if (q) rows = rows.filter(function (r) {
      return matchSearch_(r, q, ['deskripsi', 'hasil', 'uraian_hasil', 'tanggal']);
    });

    ekUrutTanggalDesc_(rows);

    // Lampiran nested (satu baca sheet, dipetakan per realisasi)
    var lamp   = ekRows_('LAMPIRAN_BUKTI');
    var byReal = {};
    lamp.forEach(function (l) {
      var rid = String(l.realisasi_id || '').trim();
      if (!byReal[rid]) byReal[rid] = [];
      byReal[rid].push(l);
    });
    rows.forEach(function (r) {
      r.lampiran = byReal[String(r.id || '').trim()] || [];
    });

    return paginate_(rows, data.page, data.limit || 20);
  } catch (err) {
    return ekFail_('BAD_REQUEST', err.message);
  }
}

// Validasi lampiran (FR-11). Dipakai SEBELUM realisasi disimpan (atomicity).
function ekValidasiLampiran_(list) {
  list = list || [];
  for (var i = 0; i < list.length; i++) {
    var it = list[i] || {};
    var jb = ekEnum_(it.jenis_bukti, EK_ENUM.jenis_bukti);
    if (!jb) return ekFail_('BAD_REQUEST', 'jenis_bukti harus link/file/foto/notulen.');

    var url = String(it.url || '').trim();
    if (!url && jb !== 'notulen') {
      return ekFail_('BAD_REQUEST', 'url wajib untuk bukti jenis ' + jb + '.');
    }
    if (!url && !String(it.keterangan || '').trim()) {
      return ekFail_('BAD_REQUEST', 'notulen wajib punya url atau keterangan.');
    }
  }
  return null;
}

// Sinkronisasi lampiran (FR-11): payload array menimpa keadaan —
// yang tak ada di payload dihapus lunak.
function ekSinkronLampiran_(realisasiId, payloadLampiran, actor) {
  var err = ekValidasiLampiran_(payloadLampiran);
  if (err) return err;

  var existing = ekRows_('LAMPIRAN_BUKTI').filter(function (l) {
    return String(l.realisasi_id || '').trim() === realisasiId;
  });

  var list    = payloadLampiran || [];
  var keptIds = {};
  var hasil   = { dibuat: 0, diubah: 0, dihapus: 0 };

  for (var i = 0; i < list.length; i++) {
    var it = Object.assign({}, list[i]);
    it.jenis_bukti  = ekEnum_(it.jenis_bukti, EK_ENUM.jenis_bukti);
    it.url          = String(it.url || '').trim();
    it.realisasi_id = realisasiId;

    var isUpdate = String(it.id || '').trim() !== '' && ekFind_('LAMPIRAN_BUKTI', it.id);
    if (!isUpdate) it.id = makeId_('lampiran_bukti');
    keptIds[it.id] = true;

    writeRecordNoLock_('LAMPIRAN_BUKTI', it, !!isUpdate, actor, 'id');
    isUpdate ? hasil.diubah++ : hasil.dibuat++;
  }

  existing.forEach(function (l) {
    if (!keptIds[String(l.id || '').trim()]) {
      softDeleteRecordNoLock_('LAMPIRAN_BUKTI', l.id, actor, 'id');
      hasil.dihapus++;
    }
  });

  invalidateSheetCache_('LAMPIRAN_BUKTI');
  return { success: true, data: hasil };
}

// save_realisasi — FR-10/11/12/14. Realisasi = baris LAPORAN_HARIAN v2.
// Field verifikasi dikunci hook P2 (baru='menunggu', update=warisi).
function ekSaveRealisasi_(data, actor) {
  data = data || {};
  try {
    var rec = Object.assign({}, data.record || data.row || data);

    // FR-10: uraian_hasil = kolom fisik deskripsi (04_DATABASE T1)
    if (rec.uraian_hasil !== undefined && rec.deskripsi === undefined) {
      rec.deskripsi = rec.uraian_hasil;
    }

    var old = rec.id ? ekFind_('LAPORAN_HARIAN', rec.id) : null;
    if (old) {
      var g = ekGuardMilik_(actor, old.pegawai_id);
      if (g) return g;

      // FR-12: realisasi terverifikasi beku untuk pemilik (admin boleh revisi)
      if (!isAdminActor_(actor) &&
          String(old.status_verifikasi || '').toLowerCase() === 'disetujui') {
        return ekFail_('FORBIDDEN', 'Realisasi sudah diverifikasi — tidak bisa diubah sendiri. Minta admin.');
      }
      rec.pegawai_id = old.pegawai_id;
    } else {
      if (!isAdminActor_(actor)) rec.pegawai_id = actorPegawaiId_(actor);
      var g2 = ekGuardMilik_(actor, rec.pegawai_id);
      if (g2) return g2;
    }
    if (!rec.pegawai_id) return ekFail_('BAD_REQUEST', 'Akun belum terhubung ke pegawai. Hubungi admin.');

    rec.tanggal = tanggalKey10_(rec.tanggal);
    if (!rec.tanggal)                          return ekFail_('BAD_REQUEST', 'tanggal wajib diisi.');
    if (!String(rec.deskripsi || '').trim())   return ekFail_('BAD_REQUEST', 'uraian_hasil wajib diisi.');
    if (!ekMasterAktif_('JENIS_TUGAS', rec.jenis_tugas_id)) {
      return ekFail_('BAD_REQUEST', 'jenis_tugas_id harus jenis aktif.');
    }

    // Volume + satuan: wajib untuk entri baru; update = validasi bila diisi
    var vol = (rec.volume === '' || rec.volume === null || rec.volume === undefined)
      ? null : ekNum_(rec.volume);

    if (!old) {
      if (vol === null || !(vol > 0)) {
        return ekFail_('BAD_REQUEST', 'volume wajib numerik > 0 untuk entri baru.');
      }
      if (!ekMasterAktif_('SATUAN', rec.satuan_id)) {
        return ekFail_('BAD_REQUEST', 'satuan_id harus satuan aktif untuk entri baru.');
      }
    } else {
      if (vol !== null && !(vol > 0)) {
        return ekFail_('BAD_REQUEST', 'volume harus numerik > 0.');
      }
      if (String(rec.satuan_id || '').trim() && !ekMasterAktif_('SATUAN', rec.satuan_id)) {
        return ekFail_('BAD_REQUEST', 'satuan_id harus satuan aktif.');
      }
    }
    rec.volume = vol === null ? '' : vol;

    // rhk_id opsional (legacy pra-RHK) tapi bila diisi harus valid & milik sendiri
    if (String(rec.rhk_id || '').trim()) {
      var rhk = ekMasterAktif_('RHK_SKP', rec.rhk_id);
      if (!rhk) return ekFail_('BAD_REQUEST', 'rhk_id harus RHK aktif.');
      if (!isAdminActor_(actor) &&
          String(rhk.pegawai_id || '').trim() !== String(rec.pegawai_id).trim()) {
        return ekFail_('BAD_REQUEST', 'RHK milik pegawai lain.');
      }
    }

    // rencana_id: harus milik pegawai yang sama (FR-14)
    var rencana = null;
    if (String(rec.rencana_id || '').trim()) {
      rencana = ekFind_('RENCANA_HARIAN', rec.rencana_id);
      if (!rencana) return ekFail_('BAD_REQUEST', 'rencana_id tidak ditemukan.');
      if (String(rencana.pegawai_id || '').trim() !== String(rec.pegawai_id).trim()) {
        return ekFail_('BAD_REQUEST', 'Rencana milik pegawai lain.');
      }
    }

    if (rec.waktu_mulai && rec.waktu_selesai && !rec.durasi_menit) {
      rec.durasi_menit = hitungDurasiMenit_(rec.waktu_mulai, rec.waktu_selesai);
    }

    // id digenerate lebih dulu agar lampiran bisa ditautkan
    if (!rec.id || String(rec.id).trim() === '') rec.id = makeId_('laporan_harian');

    // FR-11: validasi lampiran DULU (sebelum realisasi tersimpan — atomicity)
    if (data.lampiran !== undefined) {
      var errLamp = ekValidasiLampiran_(data.lampiran);
      if (errLamp) return errLamp;
    }

    var res = apiSave_('LAPORAN_HARIAN', rec, actor);
    if (!res || !res.success) return res;

    // FR-11: lampiran (bila payload menyertakan)
    var lampRes = null;
    if (data.lampiran !== undefined) {
      lampRes = ekSinkronLampiran_(rec.id, data.lampiran, actor);
      if (!lampRes.success) return lampRes;
    }

    // FR-14: tautan dua arah rencana <-> realisasi + status rencana 'selesai'
    if (rencana) {
      var lock = acquireLock_();
      if (lock) {
        try {
          var fresh = ekFind_('RENCANA_HARIAN', rencana.id);
          if (fresh) {
            fresh.realisasi_id = rec.id;
            var st = String(fresh.status || '').toLowerCase();
            if (st === 'direncanakan' || st === 'dikerjakan') fresh.status = 'selesai';
            writeRecordNoLock_('RENCANA_HARIAN', fresh, true, actor, 'id');
            invalidateSheetCache_('RENCANA_HARIAN');
          }
        } finally {
          try { lock.releaseLock(); } catch (e) {}
        }
      }
    }

    var out = res.data || rec;
    if (lampRes) out.lampiran_stats = lampRes.data;
    return { success: true, data: out };
  } catch (err) {
    return ekFail_('BAD_REQUEST', err.message);
  }
}

// delete_realisasi — FR-12: pemilik & belum diverifikasi; lampiran ikut hapus lunak.
function ekDeleteRealisasi_(data, actor) {
  data = data || {};
  var id = String(data.id || (data.record && data.record.id) || '').trim();
  if (!id) return ekFail_('BAD_REQUEST', 'ID realisasi wajib diisi.');

  var row = ekFind_('LAPORAN_HARIAN', id);
  if (!row) return ekFail_('NOT_FOUND', 'Realisasi tidak ditemukan.');

  var g = ekGuardMilik_(actor, row.pegawai_id);
  if (g) return g;

  if (!isAdminActor_(actor) &&
      String(row.status_verifikasi || '').toLowerCase() === 'disetujui') {
    return ekFail_('FORBIDDEN', 'Realisasi terverifikasi tidak bisa dihapus sendiri. Minta admin.');
  }

  // Lepas tautan rencana (status rencana kembali 'dikerjakan' bila sudah 'selesai')
  if (String(row.rencana_id || '').trim()) {
    var rencana = ekFind_('RENCANA_HARIAN', row.rencana_id);
    if (rencana) {
      rencana.realisasi_id = '';
      if (String(rencana.status || '').toLowerCase() === 'selesai') rencana.status = 'dikerjakan';
      writeRecordNoLock_('RENCANA_HARIAN', rencana, true, actor, 'id');
      invalidateSheetCache_('RENCANA_HARIAN');
    }
  }

  // Lampiran ikut hapus lunak
  ekRows_('LAMPIRAN_BUKTI').forEach(function (l) {
    if (String(l.realisasi_id || '').trim() === id) {
      softDeleteRecordNoLock_('LAMPIRAN_BUKTI', l.id, actor, 'id');
    }
  });
  invalidateSheetCache_('LAMPIRAN_BUKTI');

  return apiDelete_('LAPORAN_HARIAN', id, actor);
}
