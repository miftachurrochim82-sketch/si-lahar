# 01 — BRD [TO-BE v2: SILAHAR = e-Kinerja Harian ASN — 2026-09-18]

> Reposisi pemilik: SILAHAR merujuk **e-Kinerja BKN / Kinerja Harian ASN**, BUKAN laporan
> operasional kedinasan. As-is v1 (SI-LAPORAN-HARIAN operasional) tercatat di STATUS_PROYEK
> dan 08_GAP_LIST (G1–G18). Paket ruang tumbuh terkunci: master M1–M3 + tabel T2–T4
> (+ evolusi T1). Kegiatan operasional = backlog app terpisah.

| Butir | Isi |
|---|---|
| Nama & kode | `SILAHAR` — judul diusulkan "SI-KINERJA HARIAN" (e-Kinerja daerah); kode app tetap SILAHAR |
| Masalah | Kinerja harian ASN Satpol PP & Damkar Kab. Trenggalek belum terdokumentasi terpusat ala e-Kinerja BKN: tidak ada kontrak kinerja (SKP/RHK), realisasi harian tanpa kaitan hasil kerja, bukti dukung tersebar, verifikasi atasan manual, rekap & predikat tidak otomatis |
| Rujukan konsep | e-Kinerja BKN (kinerja.bkn.go.id/ASN Digital; Kinerja Harian ASN rilis Sept 2025) + PermenPANRB 6/2022: SKP → RHK utama/tambahan (cascading), fokus HASIL bukan aktivitas, bukti dukung per laporan, validasi atasan (setujui/revisi), bobot hasil kerja 60–70% + perilaku BerAKHLAK 30–40% |
| Pengguna | **viewer** = ASN pelapor (rencana + realisasi + bukti sendiri); **admin** = atasan/verifikator + pengelola master & rekap; **super** = admin platform. Identitas/role dari SI-Platform (SSO) |
| Ukuran sukses (**DIKUNCI pemilik 2026-09-18**) | (a) ≥90% ASN mengisi realisasi ≤1 hari kerja; (b) ≥80% laporan diverifikasi ≤2 hari kerja; (c) **Laporan SKP Bulanan** ter-generate 100% sebelum tanggal 5 bulan berikut; (d) 0 laporan tanpa kaitan RHK pasca-migrasi |
| BATAS | Tidak mengelola kepegawaian (SIMPEG), user/role (SI-Platform), penggajian/absensi; **kegiatan OPERASIONAL kedinasan (insiden, armada, pos/regu, pengawasan) = app TERPISAH di masa depan**; perilaku BerAKHLAK + ekspektasi pimpinan + integrasi SIASN = fase lanjut |
| Wali data | Pemilik aplikasi (user) — perubahan skema wajib amendemen docs dulu (Gate 0) |
| App ekosistem | si-platform (SSO), SIMPEG (3 referensi otomatis), CoreLib v2.2.4 pin 14, CDN kit v2.7.5 |

## Nilai bisnis
1. Kontrak kinerja transparan: setiap ASN tahu RHK-nya dan kontribusi ke tujuan unit.
2. Budaya berorientasi hasil: catatan harian = capaian hasil + bukti, bukan daftar kesibukan.
3. Penilaian objektif: rekap & kandidat predikat dihitung dari data terverifikasi.
4. Ruang tumbuh fitur: kanban/kalender rencana, penilaian perilaku, dashboard pimpinan.

## Paket ruang tumbuh (standar minimal: master bisnis 3–5, tabel bisnis ≥3)
| Kode | Sheet | Jenis |
|---|---|---|
| M1 | RHK_SKP | master bisnis (kontrak kinerja per pegawai/periode) |
| M2 | JENIS_TUGAS | master bisnis (utama/tambahan/inovatif/tugas_lain) |
| M3 | SATUAN | master bisnis (satuan output hasil kerja) |
| T1 | LAPORAN_HARIAN → konsep REALISASI_HARIAN | tabel bisnis (evolusi skema, nama sheet dipertahankan saat migrasi) |
| T2 | RENCANA_HARIAN | tabel bisnis (papan kanban/kalender) |
| T3 | REKAP_BULANAN | tabel bisnis = **Laporan SKP Bulanan** (periodik tiap bulan; agregat + kandidat predikat kuantitas v1) |
| T4 | LAMPIRAN_BUKTI | tabel bisnis (multi bukti dukung per realisasi) |

## Fitur masa depan (fase lanjut, tercatat)
Perilaku BerAKHLAK + penilaian 360; ekspektasi pimpinan; upload file bukti ke Drive (v1 = link);
notifikasi Telegram/email; integrasi SIASN/SRIKANDI; app OPERASIONAL terpisah (backlog ekosistem).
