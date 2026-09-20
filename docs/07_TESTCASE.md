# 07 — TESTCASE [TO-BE v2: SILAHAR e-Kinerja Harian — 2026-09-19]

> TC-27/28/29 dijalankan sebagai fungsi uji di `99_Test.gs` (`runLibraryTests`,
> `testAdopsiG18d`, `testLaporanGuards`). **TC-01…26 = skenario manual rilis**
> (bukti screenshot per rilis; handler terkait ada di `05…09_*.gs`).
> TC-P1…P7 = verifikasi live UI Paspor.
>
> **Target per 2026-09-19**:
> - `runLibraryTests()` — **PASS 42 / FAIL 0 / SKIP 1** (CoreLib v2.3.0, pin 15).
> - `testAdopsiG18d()` — **13 asersi PASS** (verifikasi delegasi wrapper lokal ke CoreLib).
> - `testLaporanGuards()` — **13 asersi PASS** (regresi proteksi laporan v1).
>
> **Riwayat revisi**:
> - 2026-09-18 — TESTCASE v2 initial.
> - **2026-09-19 — G18d**: target `runLibraryTests` 38 → 42; + `testAdopsiG18d`; cleanup file uji.
- **2026-09-20 — SWEEP v2.1**: TC-01…26 ditegaskan manual-release; TC-30 butir arsip view direvisi (dihapus, bukan non-include); matriks sweep 37 TC hijau kecuali dua amendemen ini.

## Master (FR-01..04)
- **TC-01** admin `save_rhk` valid → success; `id` ter-generate; `periode_tahun` tersimpan.
- **TC-02** viewer `save_rhk` → FORBIDDEN.
- **TC-03** `save_rhk` dengan `satuan_id` tak dikenal → BAD_REQUEST (whitelist FR-23).
- **TC-04** `delete_rhk` yang terpakai realisasi → ditolak; nonaktifkan → OK.
- **TC-05** `get_rhk_list` viewer hanya RHK sendiri & aktif di picker.

## Rencana (FR-05..09)
- **TC-06** viewer `save_rencana` milik sendiri → OK; milik orang → FORBIDDEN.
- **TC-07** transisi sah: `direncanakan→dikerjakan→selesai` OK; transisi lompat (`direncanakan→diverifikasi`) → ditolak.
- **TC-08** `batal` dari `selesai` → ditolak; dari `dikerjakan` → OK.
- **TC-09** `get_rencana_list` filter tanggal+status konsisten dengan jumlah list.
- **TC-10** `delete_rencana` status `dikerjakan` oleh pemilik → ditolak; status `direncanakan` → OK.

## Realisasi + bukti (FR-10..14)
- **TC-11** `save_realisasi` `volume ≤ 0` atau `satuan` kosong → BAD_REQUEST.
- **TC-12** `save_realisasi` + 2 lampiran → lampiran tersimpan terkait `realisasi_id`.
- **TC-13** edit realisasi status `disetujui` oleh pemilik → ditolak.
- **TC-14** hapus realisasi → lampiran ikut soft-delete; list menyembunyikan keduanya.
- **TC-15** realisasi dari rencana: `rencana.realisasi_id` terisi & status rencana `selesai`.
- **TC-16** tanggal realisasi format ISO-full legacy tetap terbaca (aturan G12/G18d).

## Verifikasi (FR-15..16)
- **TC-17** admin setujui → status `disetujui` + verifikator + waktu; antrian berkurang.
- **TC-18** admin revisi + catatan → status `revisi`; status rencana kembali `dikerjakan`; catatan terbaca viewer.
- **TC-19** viewer verifikasi → FORBIDDEN.

## Rekap (FR-17..18)
- **TC-20** `generate_rekap_bulanan` periode berisi data → baris REKAP terisi; `capaian_pct = diverifikasi ÷ rencana`.
- **TC-21** generate ulang periode sama → upsert (jumlah baris tetap, `generated_at` baru).
- **TC-22** viewer generate → FORBIDDEN; viewer `get_rekap_list` hanya milik sendiri.

## Dashboard/Analisa (FR-19..20)
- **TC-23** `dashboard_kinerja` viewer: kartu diri konsisten dengan hitungan manual list realisasi bulan berjalan.
- **TC-24** `analisa_kinerja` admin: `tunggakan_total` = jumlah antrian.

## Migrasi (FR-21)
- **TC-25** pasca-migrasi: jumlah baris T1 = sebelum; baris legacy ber-flag pra-RHK (`rhk_id` kosong);
  agregat dashboard lama vs baru selisih 0 untuk metrik yang dipertahankan.
- **TC-26** enum legacy `jenis_kegiatan` di luar whitelist tampil '`lainnya`'/badge legacy, tidak crash.

## Regresi v2 (CoreLib)
- **TC-27** `runLibraryTests()` target: **PASS 42 / FAIL 0 / SKIP 1** (CoreLib v2.3.0, pin 15).
  - 38 test lama (Foundation + Gateway + v2.1 + v2.2 + v2.2.2) — tetap PASS.
  - 4 test baru v2.3.0: `testTodayIsoLocalV230`, `testDateKey10V230`, `testPaginateV230`, `testMatchSearchV230`.
  - SKIP wajar: `testCacheIsolation` (butuh `TEST_SPREADSHEET_ID_B` di Script Properties).

## Regresi G18d — Adopsi CoreLib v2.3.0 (FR-25)
Dijalankan sebagai `testAdopsiG18d()` di `99_Test.gs` — **murni in-memory, tidak menulis sheet**.

| ID | Asersi | Target |
|---|---|---|
| **TC-28a** | `tanggalKey10_('2026-09-18T17:00:00.000Z')` === `CoreLib.dateKey10(...)` === `'2026-09-19'` | ISO UTC → WIB konsisten |
| **TC-28b** | `tanggalKey10_('2026-09-19')` === `'2026-09-19'` | yyyy-MM-dd passthrough |
| **TC-28c** | `paginate_(rows, 1, 10)` === `CoreLib.paginate(rows, 1, 10)` untuk 25 baris | page 1, limit 10 |
| **TC-28d** | `paginate_(rows, 3, 10)` → 5 baris (id 21..25) | halaman terakhir |
| **TC-28e** | `matchSearch_(row, 'patroli', ['deskripsi'])` === `true` | case-insensitive match |
| **TC-28f** | `matchSearch_(row, 'PATROLI', ['deskripsi'])` === `true` | uppercase input |
| **TC-28g** | `matchSearch_(row, 'kebakaran', ['deskripsi', 'hasil'])` === `false` | tidak match |
| **TC-28h** | `matchSearch_(row, '', ['deskripsi'])` === `true` | q kosong → true |
| **TC-28i** | `matchSearch_(row, 'apa saja', [])` === `false` | fields kosong → false (cermin CoreLib v2.3.0) |
| **TC-28j** | `ekEnum_('terjadwal', ['Terjadwal', 'Selesai'], 'x')` === `'Terjadwal'` | lowercase → kanonik |
| **TC-28k** | `ekEnum_('TERJADWAL', ['Terjadwal', 'Selesai'], 'x')` === `'Terjadwal'` | uppercase → kanonik |
| **TC-28l** | `ekEnum_('ngawur', ['A', 'B'], 'dflt')` === `'dflt'` | non-match → dflt (non-throwing) |
| **TC-28m** | `ekEnum_('a', ['A'], '')` === `'A'` | single-letter match |

**Status: 13/13 PASS** (diverifikasi live 2026-09-19).

## Regresi proteksi laporan v1 (P1–P8) — tetap dipertahankan
- **TC-29** `testLaporanGuards()` — 13 asersi PASS (dari v1, tidak terpengaruh G18d).
  - Viewer save milik sendiri + id ter-generate
  - Status awal laporan = `menunggu`
  - Viewer save milik orang → ditolak
  - Viewer tanpa link pegawai → ditolak
  - Viewer verifikasi → ditolak
  - Admin verifikasi → OK + verifikator tercatat
  - Edit user tak goyahkan status verifikasi
  - Admin save sebagai B → OK + id unik
  - Viewer hapus milik orang → ditolak
  - Viewer hapus milik sendiri → OK
  - Search laporan menemukan 1 baris
  - Riwayat filter tanggal jalan
  - Analytics kirim `by_tanggal` + `by_pegawai`

## TC-P — Paspor Kinerja (G19b, `docs/09_PROFIL_KINERJA.md`) — **live 2026-09-19**
| ID | Skenario | Harapan | Status |
|---|---|---|---|
| **TC-P1** | Viewer buka menu Profil Saya | Kartu identitas + speedometer = data dirinya; transkrip = realisasi dirinya (server-scope) | ✅ Live |
| **TC-P2** | Ganti bulan di pemilih periode | Speedometer + kartu capaian berubah; transkrip/SKP/RHK tetap (lintas periode) | ✅ Live |
| **TC-P3** | Pegawai tanpa data | `<app-empty-state>` kit di tiap tab; tanpa error konsol | ✅ Live |
| **TC-P4** | Admin buka Profil | Paspor **dirinya sendiri** (list difilter klien ke `pegawai_id` admin), bukan data tim; admin tanpa `pegawai_id` → tampil banner "tanpa tautan" + list dikosongkan (v1.1b) | ✅ Live |
| **TC-P5** | Tab Kontak & Identitas | `<app-profile>` load + simpan seperti sebelumnya | ✅ Live |
| **TC-P6** | Layar HP | Tabel transkrip/SKP/RHK scroll horizontal mulus (`min-w` kolom) | ✅ Live |
| **TC-P7** | Tombol Segarkan | `loadPaspor` ulang; skeleton muncul saat loading awal | ✅ Live |

## Cleanup v1→v2 (FR-26) — verifikasi
- **TC-30** Pasca-cleanup G18d:
  - `Index.html` hanya include 9 view + 7 file J_* (bukan 13+ view).
  - `J_Api.html` hanya 3 method publik: `loadLaporan`, `debouncedLoadLaporan`, `loadProfil`.
  - `J_State.html` hanya ~20 field (bukan ~45).
  - `V_Tentang.html`/`V_Analisa.html`/`V_RiwayatLaporan.html`/`V_MasterData.html` — **dihapus dari `src/` pada refactor generation (2026-09-20)**; sejarah tersimpan di git. `Index.html` hanya include 9 view hidup.
  - `A0_Style.html` tidak ada lagi; isinya inline di `Index.html`.
  - `AppCore.version` di Console = `"2.8.0"` (bukan `"2.7.4"`).

## Catatan final
- **SKIP wajar**: `testCacheIsolation` — butuh `TEST_SPREADSHEET_ID_B` di Script Properties CoreLib (bukan si-lahar).
- **Test tulis terisolasi**: semua test tulis v2 di `ZZ_TEST_CRUD` (aman, auto-bersih). Tidak ada test yang menulis dummy ke `LAPORAN_HARIAN` produksi.
- **Running di editor si-lahar**: `runLibraryTests()` + `testAdopsiG18d()` + `testLaporanGuards()` bisa dijalankan semua dari editor GAS si-lahar. `CoreLib.runCoreTests(ctx)` membaca `testCtx_()` dari `99_Test.gs`.
