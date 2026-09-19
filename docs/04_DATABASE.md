# 04 — DATABASE [TO-BE v2: SILAHAR e-Kinerja Harian — 2026-09-18]

> Standar minimal (revisi 2026-09-18): referensi otomatis TIDAK masuk budget; app bisnis =
> master bisnis 3–5 + tabel bisnis ≥3. SILAHAR v2: master 3 ✅ tabel 4 ✅.
> Kolom audit (created_at, updated_at, created_by, updated_by, deleted_at) wajib — diisi CoreLib.

## M1 RHK_SKP (master bisnis)
| Kolom | Tipe | Catatan |
|---|---|---|
| id | text pk | `RHK_<tahun>_<seq>` |
| pegawai_id | text | referensi SIMPEG (tolerant reader) |
| periode_tahun | number | mis. 2026 |
| jenis_rhk | enum | utama, tambahan |
| klasifikasi | enum | individu (v1; organisasi = fase lanjut) |
| nama_rhk | text | kalimat HASIL, bukan aktivitas |
| indikator | text | indikator terukur |
| satuan_id | fk M3 | |
| target_tahunan | number | kuantitas target |
| rhk_atasan_id | text | opsional, cascading |
| status | enum | aktif, nonaktif |
| + audit | | |

## M2 JENIS_TUGAS (master bisnis)
id, kode (unik), nama, keterangan, status(aktif/nonaktif), + audit.
Seed: utama, tambahan, inovatif, tugas_lain.

## M3 SATUAN (master bisnis)
id, kode (unik), nama, keterangan, status, + audit.
Seed: dokumen, laporan, kegiatan, layanan, orang_hari, paket.

## T1 LAPORAN_HARIAN (tabel bisnis — evolusi menjadi REALISASI_HARIAN; nama sheet dipertahankan selama migrasi)
Kolom lama dipertahankan (tanggal, pegawai_id, deskripsi→uraian hasil, hasil, kendala, tindak_lanjut, waktu_mulai/selesai, status_verifikasi, catatan_atasan, verifikator_id, tanggal_verifikasi, file_url) + kolom BARU:
| Kolom baru | Tipe | Catatan |
|---|---|---|
| rhk_id | fk M1 | nullable untuk baris legacy (flag pra-RHK) |
| rencana_id | fk T2 | nullable |
| jenis_tugas_id | fk M2 | migrasi dari jenis_kegiatan (FR-21) |
| volume | number | >0 untuk entri baru |
| satuan_id | fk M3 | |
Kolom legacy jenis_kegiatan/kategori_id/lokasi dibekukan (tidak ditulis fitur baru; pembersihan fase migrasi-2).

## T2 RENCANA_HARIAN (tabel bisnis)
id, pegawai_id, tanggal_rencana (yyyy-MM-dd), rhk_id, jenis_tugas_id, rencana_hasil, prioritas (biasa/penting/mendesak), status (direncanakan/dikerjakan/selesai/diverifikasi/batal), realisasi_id (nullable), + audit.

## T3 REKAP_BULANAN = Laporan SKP Bulanan (tabel bisnis, periodik bulanan)
id, pegawai_id, periode (yyyy-MM), total_rencana, total_realisasi, total_diverifikasi, total_revisi, capaian_pct, capaian_rhk_json (text json per RHK), kandidat_predikat (**v1 = kuantitas saja, DIKUNCI**), status_rekap (draf/final), generated_at, + audit. Unik (pegawai_id, periode). Periode RHK = TAHUNAN (DIKUNCI).

## T4 LAMPIRAN_BUKTI (tabel bisnis)
id, realisasi_id (fk T1), jenis_bukti (link/file/foto/notulen), url, nama_bukti, keterangan, + audit.

## Enum & validasi server (FR-23)
jenis_rhk, klasifikasi, status master, prioritas, status rencana, jenis_bukti, status_rekap —
semua diverifikasi whitelist saat save; baca legacy dinormalisasi (pola G16).

## Migrasi v1→v2 (FR-21)
1. Backup sheet (toolkit 03_Maintenance). 2. Tambah kolom baru T1 (ensureSheet CoreLib).
3. Seed M2/M3. 4. Mapping 21 baris lama (**DIKUNCI**: semantik): rutin→JT_utama, insidental→JT_tambahan,
   khusus→JT_inovatif, lainnya→JT_tugas_lain. 5. rhk_id kosong = pra-RHK (badge UI).
   6. Uji: jumlah baris & agregat dashboard sebelum/sesudah sama (TC-25).

## Referensi otomatis (tidak masuk budget)
PEGAWAI/JABATAN/UNIT_KERJA (SIMPEG via masterSsId); USER_ROLE/AUDIT_LOG/KONFIGURASI platform;
AUDIT_LOGS & ZZ_TEST_CRUD infra CoreLib; KONFIGURASI app = infra app.
- **MAIN_DATA = sheet sistem LIBRARY** (anggota CoreLib.DEFAULT_SYSTEM_HEADERS bersama AUDIT_LOGS & KONFIGURASI): dibuat ulang
  otomatis oleh initDatabase() — jangan dihapus lagi (pengalaman G17 vs G18a); toolkit
  03_Maintenance kini mengklasifikasikannya AKTIF (kontrak CoreLib) + dilindungi.
