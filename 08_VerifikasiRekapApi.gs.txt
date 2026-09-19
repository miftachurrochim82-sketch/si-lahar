// ============================================================
// SILAHAR - 08_VerifikasiRekapApi.gs (G18b-split, 2026-09-18)
// Domain VERIFIKASI atasan + LAPORAN SKP BULANAN (rekap periodik).
// FR-15..FR-18.
// Bagian dari pemecahan 04_KinerjaApi.gs per domain (pola
// si-kompetensi). Helper bersama ada di 04_KinerjaUtils.gs;
// registrasi aksi ada di kinerjaHandlers_() (04_KinerjaUtils).
// ============================================================

// ==================== FR-15/FR-16: VERIFIKASI ====================

// verifikasi_realisasi — admin; satu-satunya penulis field verifikasi.
// Efek FR-15: setujui -> rencana terkait 'diverifikasi'; revisi -> 'dikerjakan'.
function ekVerifikasiRealisasi_(data, actor) {
  data = data || {};
  if (!isAdminActor_(actor)) return ekFail_('FORBIDDEN', 'Verifikasi hanya untuk admin/atasan.');
  var id = String(data.id || '').trim();
  var keputusan = String(data.keputusan || data.status || data.status_verifikasi || '').toLowerCase().trim();
  if (keputusan === 'setujui') keputusan = 'disetujui';
  if (!id) return ekFail_('BAD_REQUEST', 'ID realisasi wajib diisi.');
  if (keputusan !== 'disetujui' && keputusan !== 'revisi') {
    return ekFail_('BAD_REQUEST', 'keputusan harus "setujui" atau "revisi".');
  }
  if (keputusan === 'revisi' && !String(data.catatan_atasan || data.catatan || '').trim()) {
    return ekFail_('BAD_REQUEST', 'catatan_atasan wajib diisi untuk keputusan revisi.');
  }
  var lock = acquireLock_();
  if (!lock) return ekFail_('BUSY', 'Server sibuk, silakan coba lagi.');
  try {
    var row = ekFind_('LAPORAN_HARIAN', id);
    if (!row) return ekFail_('NOT_FOUND', 'Realisasi tidak ditemukan.');
    row.status_verifikasi = keputusan;
    row.catatan_atasan = (data.catatan_atasan !== undefined ? data.catatan_atasan : (data.catatan !== undefined ? data.catatan : row.catatan_atasan)) || '';
    row.verifikator_id = actorPegawaiId_(actor) || String(actor.id || '');
    row.tanggal_verifikasi = todayIso_();
    var saved = writeRecordNoLock_('LAPORAN_HARIAN', row, true, actor, 'id');
    invalidateSheetCache_('LAPORAN_HARIAN');
    // efek ke rencana terkait
    var rencana = null;
    if (String(row.rencana_id || '').trim()) rencana = ekFind_('RENCANA_HARIAN', row.rencana_id);
    if (!rencana) {
      var plans = ekRows_('RENCANA_HARIAN');
      for (var i = 0; i < plans.length; i++) {
        if (String(plans[i].realisasi_id || '').trim() === id) { rencana = plans[i]; break; }
      }
    }
    if (rencana) {
      rencana.status = keputusan === 'disetujui' ? 'diverifikasi' : 'dikerjakan';
      writeRecordNoLock_('RENCANA_HARIAN', rencana, true, actor, 'id');
      invalidateSheetCache_('RENCANA_HARIAN');
    }
    return { success: true, data: saved };
  } catch (err) { return ekFail_('BAD_REQUEST', err.message); }
  finally { try { lock.releaseLock(); } catch (e) {} }
}

// get_antrian_verifikasi — admin (FR-16): menunggu urut tanggal + count.
// Lampiran bukti ikut disertakan agar atasan bisa menilai sebelum memutuskan.
function ekAntrianVerifikasi_(data, actor) {
  data = data || {};
  if (!isAdminActor_(actor)) return ekFail_('FORBIDDEN', 'Antrian verifikasi hanya untuk admin/atasan.');
  var rows = ekRows_('LAPORAN_HARIAN').filter(function (r) {
    return String(r.status_verifikasi || 'menunggu').toLowerCase() === 'menunggu';
  });
  rows.sort(function (a, b) {
    var ta = tanggalKey10_(a.tanggal), tb = tanggalKey10_(b.tanggal);
    return ta < tb ? -1 : (ta > tb ? 1 : 0); // terlama dulu (SLA 2 hari kerja)
  });
  var lamp = ekRows_('LAMPIRAN_BUKTI');
  var byReal = {};
  lamp.forEach(function (l) {
    var rid = String(l.realisasi_id || '').trim();
    if (!byReal[rid]) byReal[rid] = [];
    byReal[rid].push(l);
  });
  rows.forEach(function (r) { r.lampiran = byReal[String(r.id || '').trim()] || []; });
  var out = paginate_(rows, data.page, data.limit || 20);
  out.meta.menunggu_total = rows.length;
  return out;
}

// ==================== FR-17/FR-18: LAPORAN SKP BULANAN ====================

// Hitung metrik satu pegawai satu periode (dipakai generate + dashboard).
// cache opsional {rencana,realisasi,rhk} — generate rekap banyak pegawai cukup
// baca sheet SEKALI (hindari N× pembacaan penuh).
function ekHitungMetrikBulan_(pegawaiId, periode, cache) {
  cache = cache || {};
  var allRencana = cache.rencana || ekRows_('RENCANA_HARIAN');
  var allRealisasi = cache.realisasi || ekRows_('LAPORAN_HARIAN');
  var allRhk = cache.rhk || ekRows_('RHK_SKP');
  var rencana = allRencana.filter(function (r) {
    return String(r.pegawai_id || '').trim() === pegawaiId && ekDalamPeriode_(r.tanggal_rencana, periode);
  });
  var realisasi = allRealisasi.filter(function (r) {
    return String(r.pegawai_id || '').trim() === pegawaiId && ekDalamPeriode_(r.tanggal, periode);
  });
  var diverifikasi = 0, revisi = 0;
  var perRhk = {};
  realisasi.forEach(function (r) {
    var sv = String(r.status_verifikasi || 'menunggu').toLowerCase();
    if (sv === 'disetujui') diverifikasi++;
    if (sv === 'revisi') revisi++;
    var rk = String(r.rhk_id || '').trim() || '(pra-RHK)';
    if (!perRhk[rk]) perRhk[rk] = { rhk_id: rk, volume: 0, jumlah: 0 };
    perRhk[rk].volume += ekNum_(r.volume);
    perRhk[rk].jumlah += 1;
  });
  // perkaya nama RHK + target tahunan
  Object.keys(perRhk).forEach(function (k) {
    var rhk = null;
    if (k !== '(pra-RHK)') {
      for (var i = 0; i < allRhk.length; i++) {
        if (String(allRhk[i].id || '').trim() === k) { rhk = allRhk[i]; break; }
      }
    }
    perRhk[k].nama_rhk = rhk ? rhk.nama_rhk : 'Tanpa RHK (legacy)';
    perRhk[k].target_tahunan = rhk ? ekNum_(rhk.target_tahunan) : 0;
    perRhk[k].satuan_id = rhk ? rhk.satuan_id : '';
  });
  var totalRencana = rencana.length;
  var capaian = totalRencana > 0 ? Math.round((diverifikasi / totalRencana) * 1000) / 10 : 0;
  return {
    pegawai_id: pegawaiId,
    periode: periode,
    total_rencana: totalRencana,
    total_realisasi: realisasi.length,
    total_diverifikasi: diverifikasi,
    total_revisi: revisi,
    capaian_pct: capaian,
    capaian_rhk: Object.keys(perRhk).map(function (k) { return perRhk[k]; }),
    kandidat_predikat: ekPredikat_(capaian)
  };
}

// generate_rekap_bulanan — admin; idempoten upsert REKAP_BULANAN per
// (pegawai, periode). Tanpa pegawai_id = semua pegawai yang punya aktivitas.
// [KANDIDAT-CORELIB C7] upsert idempoten by unique-key (pegawai+periode) — cari-manual-loop; kandidat findUnique/upsertUnique. Gerbong v2.3.x.
function ekGenerateRekap_(data, actor) {
  data = data || {};
  if (!isAdminActor_(actor)) return ekFail_('FORBIDDEN', 'Generate rekap hanya untuk admin.');
  var periode = ekPeriodeBulan_(data.periode);
  var lock = acquireLock_();
  if (!lock) return ekFail_('BUSY', 'Server sibuk, silakan coba lagi.');
  try {
    var pids = [];
    var pidReq = String(data.pegawai_id || '').trim();
    if (pidReq) pids.push(pidReq);
    else {
      var seen = {};
      ekRows_('RENCANA_HARIAN').forEach(function (r) {
        if (ekDalamPeriode_(r.tanggal_rencana, periode)) {
          var p = String(r.pegawai_id || '').trim();
          if (p && !seen[p]) { seen[p] = true; pids.push(p); }
        }
      });
      ekRows_('LAPORAN_HARIAN').forEach(function (r) {
        if (ekDalamPeriode_(r.tanggal, periode)) {
          var p2 = String(r.pegawai_id || '').trim();
          if (p2 && !seen[p2]) { seen[p2] = true; pids.push(p2); }
        }
      });
    }
    var rekapAll = ekRows_('REKAP_BULANAN');
    var cache = { rencana: ekRows_('RENCANA_HARIAN'), realisasi: ekRows_('LAPORAN_HARIAN'), rhk: ekRows_('RHK_SKP') };
    var dibuat = 0, diperbarui = 0, hasil = [];
    pids.forEach(function (pid) {
      var m = ekHitungMetrikBulan_(pid, periode, cache);
      var lama = null;
      for (var i = 0; i < rekapAll.length; i++) {
        if (String(rekapAll[i].pegawai_id || '').trim() === pid && String(rekapAll[i].periode || '') === periode) { lama = rekapAll[i]; break; }
      }
      var rec = lama ? Object.assign({}, lama) : { id: 'REKAP_' + periode.replace('-', '') + '_' + pid };
      rec.pegawai_id = pid;
      rec.periode = periode;
      rec.total_rencana = m.total_rencana;
      rec.total_realisasi = m.total_realisasi;
      rec.total_diverifikasi = m.total_diverifikasi;
      rec.total_revisi = m.total_revisi;
      rec.capaian_pct = m.capaian_pct;
      rec.capaian_rhk_json = JSON.stringify(m.capaian_rhk);
      rec.kandidat_predikat = m.kandidat_predikat;
      rec.status_rekap = lama && String(lama.status_rekap || '').toLowerCase() === 'final' ? 'final' : (String(data.status_rekap || '').toLowerCase() === 'final' ? 'final' : 'draf');
      rec.generated_at = nowIso_();
      writeRecordNoLock_('REKAP_BULANAN', rec, !!lama, actor, 'id');
      lama ? diperbarui++ : dibuat++;
      hasil.push({ pegawai_id: pid, capaian_pct: m.capaian_pct, predikat: m.kandidat_predikat });
    });
    invalidateSheetCache_('REKAP_BULANAN');
    Logger.log('REKAP ' + periode + ': +' + dibuat + ' baru, ' + diperbarui + ' diperbarui (' + pids.length + ' pegawai).');
    return { success: true, data: { periode: periode, dibuat: dibuat, diperbarui: diperbarui, ringkasan: hasil } };
  } catch (err) { return ekFail_('BAD_REQUEST', err.message); }
  finally { try { lock.releaseLock(); } catch (e) {} }
}

// get_rekap_list — admin semua; viewer milik sendiri (FR-18).
function ekGetRekapList_(data, actor) {
  data = data || {};
  try {
    var rows = ekRows_('REKAP_BULANAN');
    var filters = data.filters || data;
    var fPer = String(filters.periode || '').trim();
    var fPeg = String(filters.pegawai_id || '').trim();
    if (!isAdminActor_(actor)) {
      var myPeg = actorPegawaiId_(actor);
      if (!myPeg) return { success: true, data: [], meta: { total: 0, page: 1, limit: 20, total_pages: 1 } };
      fPeg = myPeg;
    }
    if (fPer) rows = rows.filter(function (r) { return String(r.periode || '') === fPer; });
    if (fPeg) rows = rows.filter(function (r) { return String(r.pegawai_id || '').trim() === fPeg; });
    rows.sort(function (a, b) { return String(b.periode || '') < String(a.periode || '') ? -1 : 1; });
    return paginate_(rows, data.page, data.limit || 20);
  } catch (err) { return ekFail_('BAD_REQUEST', err.message); }
}
