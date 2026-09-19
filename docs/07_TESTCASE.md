# 07 — TESTCASE [TO-BE v2: SILAHAR e-Kinerja Harian — 2026-09-18]

> Setiap TC dijalankan sebagai fungsi uji di 99_Test.gs (pola testLaporanGuards):
> actor viewer/admin/super, assert success/code. Satu baris TC = satu assert kelompok.

## Master (FR-01..04)
- TC-01 admin save RHK valid → success; id ter-generate; periode tersimpan.
- TC-02 viewer save RHK → FORBIDDEN.
- TC-03 save RHK satuan_id tak dikenal → BAD_REQUEST (whitelist FR-23).
- TC-04 delete RHK terpakai realisasi → ditolak; nonaktifkan OK.
- TC-05 get_rhk_list viewer hanya RHK sendiri & aktif di picker.

## Rencana (FR-05..09)
- TC-06 viewer save rencana milik sendiri OK; milik orang → FORBIDDEN.
- TC-07 transisi sah: direncanakan→dikerjakan→selesai; transisi lompat (direncanakan→diverifikasi) → ditolak.
- TC-08 batal dari selesai → ditolak; dari dikerjakan → OK.
- TC-09 kanban filter tanggal+status konsisten dengan jumlah list.
- TC-10 delete rencana status dikerjakan oleh pemilik → ditolak; status direncanakan → OK.

## Realisasi + bukti (FR-10..14)
- TC-11 save realisasi volume ≤0 atau satuan kosong → BAD_REQUEST.
- TC-12 save realisasi + 2 lampiran → lampiran tersimpan terkait realisasi_id.
- TC-13 edit realisasi status diverifikasi oleh pemilik → ditolak.
- TC-14 hapus realisasi → lampiran ikut soft-delete; list menyembunyikan keduanya.
- TC-15 realisasi dari rencana: rencana.realisasi_id terisi & status rencana selesai.
- TC-16 tanggal realisasi format ISO-full legacy tetap terbaca (aturan G12).

## Verifikasi (FR-15..16)
- TC-17 admin setujui → status disetujui + verifikator + waktu; antrian berkurang.
- TC-18 admin revisi + catatan → status revisi; status rencana kembali dikerjakan; catatan terbaca viewer.
- TC-19 viewer verifikasi → FORBIDDEN.

## Rekap (FR-17..18)
- TC-20 generate periode berisi data → baris REKAP terisi; capaian_pct = diverifikasi÷rencana.
- TC-21 generate ulang periode sama → upsert (jumlah baris tetap, generated_at baru).
- TC-22 viewer generate → FORBIDDEN; viewer get_rekap_list hanya milik sendiri.

## Dashboard/Analisa (FR-19..20)
- TC-23 dashboard viewer: kartu diri konsisten dengan hitungan manual list realisasi bulan berjalan.
- TC-24 analisa admin: tunggakan verifikasi = jumlah antrian.

## Migrasi (FR-21)
- TC-25 pasca-migrasi: jumlah baris T1 = sebelum; baris legacy ber-flag pra-RHK (rhk_id kosong);
  agregat dashboard lama vs baru selisih 0 untuk metrik yang dipertahankan.
- TC-26 enum legacy jenis_kegiatan di luar whitelist tampil 'lainnya'/badge legacy, tidak crash.

## Regresi
- TC-27 runLibraryTests tetap 38/0/1; testLaporanGuards v1 tetap 13/13 selama migrasi belum dijalankan.

## TC-P — Paspor Kinerja (G19b, docs/09) — dijalankan saat G19 review
| ID | Skenario | Harapan |
|---|---|---|
| TC-P1 | Viewer buka menu Profil Saya | Kartu identitas + speedometer = data dirinya; transkrip = realisasi dirinya (server-scope) |
| TC-P2 | Ganti bulan di pemilih periode | Speedometer + kartu capaian berubah; transkrip/SKP/RHK tetap (lintas periode) |
| TC-P3 | Pegawai tanpa data | app-empty-state kit di tiap tab; tanpa error konsol |
| TC-P4 | Admin buka Profil | Paspor DIRINYA sendiri (list difilter klien ke pegawai_id admin), bukan data tim |
| TC-P5 | Tab Kontak & Identitas | app-profile load + simpan seperti sebelumnya |
| TC-P6 | Layar HP | Tabel transkrip/SKP/RHK scroll horizontal mulus (min-w kolom) |
| TC-P7 | Tombol Segarkan | loadPaspor ulang; skeleton muncul saat loading awal |
