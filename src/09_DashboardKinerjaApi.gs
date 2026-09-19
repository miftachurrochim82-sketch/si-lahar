// ============================================================
// SILAHAR - 09_DashboardKinerjaApi.gs (G18b-split, 2026-09-18; revisi G18d 2026-09-19)
// ------------------------------------------------------------
// Domain DASHBOARD & ANALISA kinerja (diri + tim/atasan).
// FR-19..FR-20.
//
// Bagian dari pemecahan 04_KinerjaApi.gs per domain (pola si-kompetensi).
// Helper bersama ada di 04_KinerjaUtils.gs;
// registrasi aksi ada di kinerjaHandlers_() (04_KinerjaUtils).
//
// Catatan transisi v1 -> v2:
//   Aksi v1 'dashboard'/'analytics' (02_AppLogic) DIPERTAHANKAN sampai
//   frontend migrasi penuh. Aksi v2 di sini: dashboard_kinerja /
//   analisa_kinerja. Setelah migrasi, hapus 'dashboard'/'analytics' dari
//   handleAction agar tidak ada duplikat makna.
//
// G18d (2026-09-19, adopsi CoreLib v2.3.0):
//   - tanggalKey10_, ekPeriodeBulan_, ekDalamPeriode_ sudah delegasi/
//     WIB-aware (via 02/04).
//   - Tidak ada perubahan fungsional lain. Header changelog diselaraskan.
// ============================================================

// ==================== FR-19/FR-20: DASHBOARD & ANALISA KINERJA ====================

// Hitung streak hari berturut-turut realisasi diisi.
// Jika hari ini belum diisi, mulai dari kemarin (streak tidak putus).
function ekStreakHari_(rowsRealisasi, myPeg) {
  var setTgl = {};
  rowsRealisasi.forEach(function (r) {
    if (String(r.pegawai_id || '').trim() === myPeg) {
      setTgl[tanggalKey10_(r.tanggal)] = true;
    }
  });

  var tz = Session.getScriptTimeZone();
  var d  = new Date();
  if (!setTgl[Utilities.formatDate(d, tz, 'yyyy-MM-dd')]) {
    d.setDate(d.getDate() - 1);
  }

  var n = 0;
  while (setTgl[Utilities.formatDate(d, tz, 'yyyy-MM-dd')]) {
    n++; d.setDate(d.getDate() - 1);
  }
  return n;
}

// dashboard_kinerja (FR-19): kartu diri + tren 30 hari + distribusi RHK/jenis.
function ekDashboardKinerja_(data, actor) {
  try {
    var myPeg   = actorPegawaiId_(actor);
    var periode = ekPeriodeBulan_((data && data.periode) || '');

    var realisasi = ekRows_('LAPORAN_HARIAN');
    var milikku   = realisasi.filter(function (r) { return String(r.pegawai_id || '').trim() === myPeg; });
    var bulanIni  = milikku.filter(function (r) { return ekDalamPeriode_(r.tanggal, periode); });

    var menunggu = bulanIni.filter(function (r) {
      return String(r.status_verifikasi || 'menunggu').toLowerCase() === 'menunggu';
    }).length;

    var rhkAktif = ekRows_('RHK_SKP').filter(function (r) {
      return String(r.pegawai_id    || '').trim() === myPeg &&
             String(r.status        || 'aktif').toLowerCase() === 'aktif' &&
             String(r.periode_tahun || '') === String(new Date().getFullYear());
    }).length;

    // Tren 30 hari (diri sendiri)
    var tz  = Session.getScriptTimeZone();
    var tren = [];
    for (var i = 29; i >= 0; i--) {
      var d = new Date(); d.setDate(d.getDate() - i);
      var key = Utilities.formatDate(d, tz, 'yyyy-MM-dd');
      tren.push({ tanggal: key, jumlah: 0 });
    }
    var idx = {};
    tren.forEach(function (t, n) { idx[t.tanggal] = n; });
    milikku.forEach(function (r) {
      var k = tanggalKey10_(r.tanggal);
      if (idx[k] !== undefined) tren[idx[k]].jumlah++;
    });

    // Distribusi bulan ini per RHK & jenis tugas
    var perRhk = {}, perJenis = {};
    bulanIni.forEach(function (r) {
      var rk = String(r.rhk_id        || '').trim() || '(pra-RHK)';
      perRhk[rk] = (perRhk[rk] || 0) + 1;
      var jt = String(r.jenis_tugas_id || '').trim() || '(tanpa_jenis)';
      perJenis[jt] = (perJenis[jt] || 0) + 1;
    });

    var m = myPeg ? ekHitungMetrikBulan_(myPeg, periode) : null;

    var antrianTim = isAdminActor_(actor)
      ? realisasi.filter(function (r) {
          return String(r.status_verifikasi || 'menunggu').toLowerCase() === 'menunggu';
        }).length
      : 0;

    return {
      success: true,
      data: {
        periode: periode,
        kartu: {
          capaian_bulan_pct:       m ? m.capaian_pct : 0,
          kandidat_predikat:       m ? m.kandidat_predikat : '',
          total_rencana:           m ? m.total_rencana : 0,
          total_realisasi:         bulanIni.length,
          menunggu_verifikasi:     menunggu,
          rhk_aktif:               rhkAktif,
          streak_hari:             myPeg ? ekStreakHari_(realisasi, myPeg) : 0,
          antrian_verifikasi_tim:  antrianTim
        },
        tren_30_hari:             tren,
        distribusi_rhk:           perRhk,
        distribusi_jenis_tugas:   perJenis,
        generated_at:             nowIso_()
      }
    };
  } catch (err) {
    return ekFail_('BAD_REQUEST', err.message);
  }
}

// analisa_kinerja (FR-20, atasan/admin): ketepatan harian tim, top capaian,
// tunggakan verifikasi.
function ekAnalisaKinerja_(data, actor) {
  try {
    if (!isAdminActor_(actor)) return ekFail_('FORBIDDEN', 'Analisa tim hanya untuk admin/atasan.');

    var periode = ekPeriodeBulan_((data && data.periode) || '');
    var cache = {
      realisasi: ekRows_('LAPORAN_HARIAN'),
      rencana:   ekRows_('RENCANA_HARIAN'),
      rhk:       ekRows_('RHK_SKP')
    };

    var realisasi = cache.realisasi.filter(function (r) { return ekDalamPeriode_(r.tanggal, periode); });
    var rencana   = cache.rencana.filter(function (r)   { return ekDalamPeriode_(r.tanggal_rencana, periode); });

    // Hari kerja bulan ini s.d. hari ini (atau s.d. akhir bulan bila periode lampau)
    var tz        = Session.getScriptTimeZone();
    var hariIniKey = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');
    var akhirPeriode = periode + '-31';
    var sampai    = akhirPeriode < hariIniKey ? akhirPeriode : hariIniKey;
    var hariKerja = ekHariKerja_(periode + '-01', sampai);

    // Kumpulkan pegawai aktif periode ini + nama
    var pids = {}, namaPeg = {};
    realisasi.concat(rencana).forEach(function (r) {
      var p = String(r.pegawai_id || '').trim();
      if (p) pids[p] = true;
    });
    try {
      getSheetDataCached_('PEGAWAI').forEach(function (p) {
        namaPeg[String(p.pegawai_id || '').trim()] = p.nama || '';
      });
    } catch (e) { /* tolerant reader */ }

    // Per-pegawai: hari_isi (keunikan tanggal realisasi) + metrik capaian
    var tim = [];
    Object.keys(pids).forEach(function (pid) {
      var hariIsi = {};
      realisasi.forEach(function (r) {
        if (String(r.pegawai_id || '').trim() === pid) {
          hariIsi[tanggalKey10_(r.tanggal)] = true;
        }
      });
      var jmlIsi = Object.keys(hariIsi).length;
      var m = ekHitungMetrikBulan_(pid, periode, cache);
      tim.push({
        pegawai_id:        pid,
        nama:              namaPeg[pid] || pid,
        hari_kerja:        hariKerja,
        hari_isi:          jmlIsi,
        ketepatan_pct:     hariKerja > 0 ? Math.round((jmlIsi / hariKerja) * 1000) / 10 : 0,
        capaian_pct:       m.capaian_pct,
        kandidat_predikat: m.kandidat_predikat
      });
    });
    tim.sort(function (a, b) { return b.capaian_pct - a.capaian_pct; });

    // Tunggakan verifikasi (semua periode — bukan hanya bulan ini), 50 teratas
    var tunggakan = cache.realisasi.filter(function (r) {
      return String(r.status_verifikasi || 'menunggu').toLowerCase() === 'menunggu';
    }).sort(function (a, b) {
      var ta = tanggalKey10_(a.tanggal), tb = tanggalKey10_(b.tanggal);
      return ta < tb ? -1 : (ta > tb ? 1 : 0);
    }).slice(0, 50);

    return {
      success: true,
      data: {
        periode:                periode,
        hari_kerja_berjalan:    hariKerja,
        top_capaian:            tim.slice(0, 5),
        tim:                    tim,
        tunggakan_verifikasi:   tunggakan,
        tunggakan_total:        tunggakan.length,
        generated_at:           nowIso_()
      }
    };
  } catch (err) {
    return ekFail_('BAD_REQUEST', err.message);
  }
}
