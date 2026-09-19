# 02 — PRD [TO-BE v2: SILAHAR e-Kinerja Harian — 2026-09-19]

> Modul & user story. Satu modul = satu "kamar" backend/frontend (pola file per domain
> si-kompetensi, sudah dilaksanakan sejak G18b: `05_MasterKinerjaApi.gs` s/d
> `09_DashboardKinerjaApi.gs` + `V_*.html` per modul).
>
> **Perubahan G18d (2026-09-19)**: adopsi CoreLib v2.3.0 (util sadar-WIB,
> paginasi, pencarian, whitelist); konvergensi frontend v1→v2 (cleanup file orphan,
> dead code); bump app_version internal ke 2.1.0.

## P1 — Master RHK/SKP (M1)
- Story: admin menyusun RHK per pegawai per periode (dialog kinerja offline dicatat ke sistem); pegawai melihat RHK sendiri.
- AC: CRUD RHK (jenis utama/tambahan; klasifikasi individu; indikator; satuan; target tahunan; rujukan RHK atasan opsional; status aktif/nonaktif); pegawai read-only daftar RHK sendiri; RHK nonaktif tidak muncul di picker form.
- Modul backend: `05_MasterKinerjaApi.gs` (fungsi `ekGetRhkList_`, `ekSaveRhk_`, `ekDeleteRhk_`).
- Modul frontend: `V_Master.html` tab RHK, modal di `V_Modals.html`.

## P2 — Master Jenis Tugas (M2) & Satuan (M3)
- Story: admin memelihara kamus jenis tugas dan satuan output.
- AC: CRUD keduanya; seed awal jenis_tugas = utama, tambahan, inovatif, tugas_lain; seed satuan = dokumen, laporan, kegiatan, layanan, orang_hari, paket; dipakai picker form rencana/realisasi; entri terpakai tidak bisa dihapus (soft: status nonaktif).
- Modul backend: `05_MasterKinerjaApi.gs` (fungsi `ekGetJenisTugasList_`, `ekSaveJenisTugas_`, `ekGetSatuanList_`, `ekSaveSatuan_`).
- Modul frontend: `V_Master.html` tab Jenis Tugas & Satuan, modal di `V_Modals.html`.

## P3 — Rencana Harian (T2, papan kanban/kalender)
- Story: ASN merencanakan hasil kerja hari ini/mendatang; atasan melihat papan tim.
- AC: buat rencana (tanggal, RHK, jenis tugas, rencana hasil, prioritas); pindah status papan: direncanakan → dikerjakan → selesai (→ diverifikasi lewat P5); **kanban DAN kalender = dua MENU terpisah** (keputusan pemilik 2026-09-18): menu Rencana Kanban (kolom status, filter tanggal/pegawai) dan menu Rencana Kalender (grid bulanan); rencana kemarin belum disentuh = pengingat dashboard.
- Modul backend: `06_RencanaApi.gs` (fungsi `ekGetRencanaList_`, `ekSaveRencana_`, `ekMoveStatusRencana_`, `ekDeleteRencana_`).
- Modul frontend: **`V_Rencana.html`** (satu file, dua mode berdasar `currentPage`: `rencana_kanban` / `rencana_kalender`) — konsolidasi G18c-2 (2026-09-19). Modal form rencana tunggal di `V_Modals.html`.

## P4 — Realisasi Harian (T1 evolusi + T4 bukti)
- Story: ASN mencatat capaian harian terikat RHK + bukti dukung.
- AC: form realisasi (RHK picker, jenis tugas, uraian HASIL, volume + satuan, jam mulai/selesai, tanggal); bukti dukung ≥0 entri (v1: link + jenis bukti + keterangan; repeater multi-bukti); edit/hapus hanya milik sendiri dan selama status belum diverifikasi; lampiran mengikuti siklus realisasi.
- Modul backend: `07_RealisasiApi.gs` (fungsi `ekGetRealisasiList_`, `ekSaveRealisasi_`, `ekDeleteRealisasi_`, `ekSinkronLampiran_`).
- Modul frontend: `V_Realisasi.html` (daftar + filter), modal di `V_Modals.html`.

## P5 — Verifikasi Atasan
- Story: atasan menyetujui/merevisi realisasi bawahan dengan catatan.
- AC: antrian verifikasi (status menunggu); aksi setujui (→ diverifikasi) atau revisi (→ kembali ke dikerjakan + catatan); hanya admin; riwayat verifier & waktu tercatat; ASN melihat catatan revisi di daftar realisasi.
- Modul backend: `08_VerifikasiRekapApi.gs` (fungsi `ekVerifikasiRealisasi_`, `ekAntrianVerifikasi_`).
- Modul frontend: `V_Verifikasi.html` (kartu antrian + aksi).

## P6 — Rekap Bulanan (T3) = Laporan SKP Bulanan
- Story: sistem menerbitkan **Laporan SKP Bulanan** (periodik tiap bulan) per pegawai; admin memicu & memantau.
- AC: generate per (pegawai, bulan) idempoten (update bila dijalankan ulang); metrik: total rencana, total realisasi, terverifikasi, revisi, capaian_pct (realisasi terverifikasi ÷ rencana), volume per RHK (json), kandidat predikat (**DIKUNCI: v1 = kuantitas saja**; perilaku BerAKHLAK fase 2); export Excel/PDF; daftar rekap filter periode.
- Modul backend: `08_VerifikasiRekapApi.gs` (fungsi `ekGenerateRekap_`, `ekGetRekapList_`, `ekHitungMetrikBulan_`).
- Modul frontend: `V_SkpBulanan.html` (daftar + generate), modal detail per RHK di `V_Modals.html`.

## P7 — Dashboard e-Kinerja
- Story: ASN memantau kinerja sendiri; atasan memantau tim.
- AC: kartu diri (capaian bulan berjalan, streak hari isi berturut, RHK aktif, menunggu verifikasi); chart tren realisasi 30 hari & distribusi per RHK/jenis tugas; atasan: papan ketepatan harian tim + top capaian; dark mode & kit komponen dipertahankan.
- Modul backend: `09_DashboardKinerjaApi.gs` (fungsi `ekDashboardKinerja_`, `ekAnalisaKinerja_`).
  > **Catatan**: handler v1 (`apiDashboard_`/`getAnalytics_`) masih ada di `02_AppLogic.gs`
  > untuk kompatibilitas — tetapi sudah **tidak dipakai frontend** sejak G18c-2. Kandidat
  > dihapus di cleanup lanjut.
- Modul frontend: `V_Dashboard.html` (kartu + chart kit `<app-chart-*>`, papan tim admin).

## P8 — Profil & Pengaturan
- Story: pegawai mengubah kontak (email identitas terkunci dari SIMPEG); admin mengelola konfigurasi.
- AC:
  - **Profil Saya** = "Paspor Kinerja ASN" (G19b): hero identitas + speedometer capaian bulan + sub-tab (Transkrip Realisasi / SKP Bulanan / RHK Aktif / Kontak). Identitas di-resolve dari `currentUser` → `myProfile` (SIMPEG-aware) → match email.
  - **Pengaturan** = modul kit `<app-settings>` (self-contained): CRUD `KONFIGURASI` (key/value/keterangan), hanya admin.
- Modul frontend: `V_Profil.html`, `V_Pengaturan.html`.
- **Catatan G18c-2 (2026-09-18)**: menu **"Tentang Aplikasi" DIHAPUS** —
  info aplikasi dilebur ke **footer Dashboard**. File `V_Tentang.html` disimpan
  sebagai arsip (tidak di-include). Selaras dengan si-kompetensi (7-menu).

## Luar scope v2 (fase lanjut)
Perilaku BerAKHLAK/penilaian 360, ekspektasi pimpinan, upload file Drive, notifikasi luar app,
integrasi SIASN, view laporan pimpinan lintas instansi.

## Adopsi platform (G18d — 2026-09-19)
- **Util tanggal WIB**: `CoreLib.todayIsoLocal()` dan `CoreLib.dateKey10()` (v2.3.0) menggantikan
  helper lokal `tanggalKey10_` (yang sudah jadi delegasi). `todayIso_()` di `01_ConfigAndBridge.gs`
  diarahkan ke `CoreLib.todayIsoLocal()` — fix bug laten UTC vs WIB.
- **Paginasi & pencarian**: `CoreLib.paginate()` dan `CoreLib.matchSearch()` menggantikan
  helper lokal `paginate_` / `matchSearch_` (yang sudah jadi delegasi). Perilaku identik,
  call-site tidak berubah.
- **Whitelist enum**: `ekEnum_` di `04_KinerjaUtils.gs` didelegasikan ke `CoreLib.whitelist()`
  (dengan try-catch untuk cermin perilaku non-throwing return `dflt`).
- **CoreLib pin 15** + **CDN `@v2.8.1`** di `Index.html`.
