# 02 — PRD [TO-BE v2: SILAHAR e-Kinerja Harian — 2026-09-18]

> Modul & user story. Satu modul = satu "kamar" backend/frontend (pola file per domain
> si-kompetensi, dikerjakan saat fase restrukturisasi "nanti").

## P1 — Master RHK/SKP (M1)
- Story: admin menyusun RHK per pegawai per periode (dialog kinerja offline dicatat ke sistem); pegawai melihat RHK sendiri.
- AC: CRUD RHK (jenis utama/tambahan; klasifikasi individu; indikator; satuan; target tahunan; rujukan RHK atasan opsional; status aktif/nonaktif); pegawai read-only daftar RHK sendiri; RHK nonaktif tidak muncul di picker form.

## P2 — Master Jenis Tugas (M2) & Satuan (M3)
- Story: admin memelihara kamus jenis tugas dan satuan output.
- AC: CRUD keduanya; seed awal jenis_tugas = utama, tambahan, inovatif, tugas_lain; seed satuan = dokumen, laporan, kegiatan, layanan, orang_hari, paket; dipakai picker form rencana/realisasi; entri terpakai tidak bisa dihapus (soft: status nonaktif).

## P3 — Rencana Harian (T2, papan kanban/kalender)
- Story: ASN merencanakan hasil kerja hari ini/mendatang; atasan melihat papan tim.
- AC: buat rencana (tanggal, RHK, jenis tugas, rencana hasil, prioritas); pindah status papan: direncanakan → dikerjakan → selesai (→ diverifikasi lewat P5); **kanban DAN kalender = dua MENU terpisah** (keputusan pemilik 2026-09-18): menu Rencana Kanban (kolom status, filter tanggal/pegawai) dan menu Rencana Kalender (grid bulanan); rencana kemarin belum disentuh = pengingat dashboard.

## P4 — Realisasi Harian (T1 evolusi + T4 bukti)
- Story: ASN mencatat capaian harian terikat RHK + bukti dukung.
- AC: form realisasi (RHK picker, jenis tugas, uraian HASIL, volume + satuan, jam mulai/selesai, tanggal); bukti dukung ≥0 entri (v1: link + jenis bukti + keterangan; repeater multi-bukti); edit/hapus hanya milik sendiri dan selama status belum diverifikasi; lampiran mengikuti siklus realisasi.

## P5 — Verifikasi Atasan
- Story: atasan menyetujui/merevisi realisasi bawahan dengan catatan.
- AC: antrian verifikasi (status selesai); aksi setujui (→ diverifikasi) atau revisi (→ kembali ke dikerjakan + catatan); hanya admin; riwayat verifier & waktu tercatat; ASN melihat catatan revisi di daftar realisasi.

## P6 — Rekap Bulanan (T3)
- Story: sistem menerbitkan **Laporan SKP Bulanan** (periodik tiap bulan) per pegawai; admin memicu & memantau.
- AC: generate per (pegawai, bulan) idempoten (update bila dijalankan ulang); metrik: total rencana, total realisasi, terverifikasi, revisi, capaian_pct (realisasi terverifikasi ÷ rencana), volume per RHK (json), kandidat predikat (**DIKUNCI: v1 = kuantitas saja**; perilaku BerAKHLAK fase 2); export Excel/PDF; daftar rekap filter periode.

## P7 — Dashboard e-Kinerja
- Story: ASN memantau kinerja sendiri; atasan memantau tim.
- AC: kartu diri (capaian bulan berjalan, streak hari isi berturut, RHK aktif, menunggu verifikasi); chart tren realisasi 30 hari & distribusi per RHK/jenis tugas; atasan: papan ketepatan harian tim + top capaian; dark mode & kit komponen dipertahankan.

## P8 — Profil, Pengaturan, Tentang (eksisting)
- Tetap seperti v1 (profil SIMPEG-aware, konfigurasi admin, tentang app) — tanpa perubahan perilaku.

## Luar scope v2 (fase lanjut)
Perilaku BerAKHLAK/penilaian 360, ekspektasi pimpinan, upload file Drive, notifikasi luar app,
integrasi SIASN, view laporan pimpinan lintas instansi.
