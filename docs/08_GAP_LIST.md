# 08 — Gap List (as-is → to-be) [SILAHAR] — 2026-09-19

> **Status per 2026-09-19**: hampir seluruh gap **TUTUP**. Gap yang masih aktif:
> G7 (ditunda keputusan pemilik), G11b (repo GitHub — sudah dibuat, tinggal deploy final),
> dan beberapa item yang bergeser ke backlog fase lanjut (G10 upload Drive, G18 lanjutan).
>
> **Riwayat**:
> - 2026-09-17 — daftar gap awal (G1–G11) dari Gate 0 as-is.
> - 2026-09-17 (malam) — G12 (bug tanggal) + G13–G15 (kit CDN + modularisasi).
> - 2026-09-18 — G16 (higiene jenis_kegiatan) + G17 (toolkit perawatan) + G18 (e-Kinerja).
> - 2026-09-18 (malam) — G18c-2 (konsolidasi file) + G19 (Paspor Kinerja).
> - **2026-09-19 — G18d**: adopsi CoreLib v2.3.0, bump pin 15, CDN v2.8.1, cleanup final.

---

## 1. Gap Aktif (perlu perhatian)

| # | Gap | Status | Tindakan |
|---|---|---|---|
| **G7** | `v-if`+`v-for` satu elemen (anti-pattern Vue3) | ⏸ **DITUNDA** (keputusan pemilik #2) | Refactor ke `<template v-if>`/`<template v-else>` — risiko regresi kecil, bisa kapan saja |
| **G10** | Folder IDs (ROOT/BACKUP/EVIDENCE) + upload Drive bukti | 🟡 **BACKLOG fase lanjut** | Dideklarasikan sebagai fitur masa depan di BRD; v1 pakai `file_url` manual |
| **G11b** | Repo GitHub `si-lahar` | ✅ **Repo sudah ada** — tinggal deploy final (16 file `src/` + `docs/`) | Commit & tag setelah semua file final |
| **G18 lanjutan** | M4 MASTER_PERILAKU + penilaian BerAKHLAK + integrasi SIASN | 🟡 **BACKLOG fase lanjut** | Tercatat di BRD §Fitur Masa Depan; butuh amendemen skema dulu |
| **G19 lanjutan** | Cetak Paspor PDF + simulasi pegawai untuk admin | 🟡 **BACKLOG fase lanjut** | Butuh backend aditif (kandidat v2.4.0) |
| **G20** | Modal RHK: kolom "RHK Atasan" masih input id mentah | 🟢 **NICE-TO-HAVE** | Upgrade ke select/search dari `rhkList` (pola `<app-pegawai-picker>`) |

---

## 2. Gap yang Sudah TUTUP

### G1 — Vue unpinned → TUTUP ✅
- **Sebelum**: `unpkg.com/vue@3` (unpinned).
- **Sesudah**: `cdn.jsdelivr.net/npm/vue@3.5.42/dist/vue.global.prod.js` (pinned, selaras si-platform).
- **Bukti**: `Index.html` final (2026-09-19) memuat dengan pin 3.5.42.

### G2 — Ikon FA tak render → TUTUP ✅
- `fa-shield-cat` → `fa-shield-halved`, `fa-clock-history` → `fa-clock-rotate-left`, `fa-shield-check` → `fa-circle-check`.
- **Bukti**: Font Awesome 6.5.2 via jsDelivr npm, semua ikon render.

### G3 — `<img>` A1_Login tidak self-closing → TUTUP ✅
- **Bukti**: `A1_Login` sudah dihapus (digantikan `<app-login>` kit).

### G4 — A6 dot warna `by_jenis` hanya 3/5 → TUTUP ✅
- **Bukti**: `V_Analisa.html` dihapus (orphan). Diagram distribusi kini di `V_Dashboard.html` via `<app-chart-doughnut bare>` dengan palet 7 warna.

### G5 — Posisi toast bentrok → TUTUP ✅
- **Keputusan**: bottom-right (Index).
- **Bukti**: A0_Style dihapus; toast kini dari `app-common.css` (top-right standalone, aman di shell kit).

### G6 — `ticketValid` hardcoded → TUTUP ✅
- **Bukti**: `99_Test.gs` final — `var ticketValid = '';` dengan pesan instruksi.

### G8 — Trio warisan (KONFIGURASI/AUDIT_LOGS/MAIN_DATA) → TUTUP ✅
- **Keputusan**: `AUDIT_LOGS` & `MAIN_DATA` **dipangkas dari `LOCAL_SHEET_NAMES`** (diurus CoreLib sebagai sistem); `KONFIGURASI` tetap (dipakai `<app-settings>`).
- **Bukti**: `01_ConfigAndBridge.gs` final — `LOCAL_SHEET_NAMES` hanya 9 sheet bisnis.

### G9 — Dead schema (REKAP_BULANAN/KATEGORI_KEGIATAN) → SEBAGIAN TUTUP ✅
- `KATEGORI_KEGIATAN`: **dipangkas** dari kode (dicatat sebagai fitur masa depan di BRD).
- `REKAP_BULANAN`: **KINI AKTIF** — dipakai sebagai **Laporan SKP Bulanan** (FR-17/18, G18a).
- **Bukti**: `04_DATABASE.md` final — `REKAP_BULANAN` = T3 aktif.

### G12 — Bug geser tanggal -1 hari → TUTUP ✅
- **Fix**: helper `tanggalKey10_` (WIB-aware) di hook + 6 titik baca/sortir/agregasi.
- **Verifikasi**: `testLaporanGuards` 13/13 PASS di GAS (2026-09-17).
- **G18d (2026-09-19)**: helper kini didelegasikan ke `CoreLib.dateKey10()` (v2.3.0) — fix diterapkan di ekosistem, si-kompetensi juga dapat manfaat (3 bug laten sekaligus).

### G13 — Frontend belum selaras CDN kit → TUTUP ✅
- **Tahap A+B**: `app-common.min.css` + `app-components.min.js` dimuat; 3 tabel referensi SIMPEG → `<app-crud-table>`.
- **Bukti**: `Index.html` final memuat 4 aset CDN `@v2.8.1`.

### G14 — Logika Vue monolitik inline → TUTUP ✅
- **Sesudah**: 7 file `J_*` (State, Helpers, Api, Actions, Export, Kinerja, App) — pola si-kompetensi.
- **Bukti**: `Index.html` final include 7 file `J_*` (satu tingkat).

### G15 — Shell & helper buatan sendiri → TUTUP ✅
- **Sesudah**: shell Index = komponen kit (`<app-login>`, `<app-sidebar>`, `<app-header>`); bootstrap = `AppCore.create`; A4–A10 → `V_*`.
- **Bukti**: `V_Tentang`/`V_Analisa`/`V_RiwayatLaporan`/`V_MasterData`/`A0_Style` dihapus; 10 file `V_*` final.

### G16 — Legenda donut timestamp ISO → TUTUP ✅
- **Fix**: normalizer `normalizeJenis_` di semua jalur baca + save non-blocking; tool `auditJenisKegiatan()` + `perbaikiJenisKegiatan()`.
- **Bukti**: `02_AppLogic.gs` final dengan `JENIS_VALID_` + `normalizeJenis_`.

### G17 — Sheet fisik warisan + tool rapi-rapi → TUTUP ✅
- **Tool**: `03_Maintenance.gs` — `auditStrukturDatabase()`, `rapikanDatabase()`, `rapikanDatabaseLIVE()`.
- **Bukti**: DB final = 9 sheet aktif bisnis + `AUDIT_LOGS`/`MAIN_DATA` (CoreLib auto).

### G18 — DB di bawah standar minimal + reposisi → TUTUP ✅
- **G18a**: master M1–M3 + tabel T1–T4 (reposisi ke e-Kinerja Harian ASN).
- **G18b**: split per-domain (`04_KinerjaUtils` + `05..09_*Api`).
- **G18c**: frontend 7 view + `J_Kinerja` + Paspor Kinerja.
- **G18c-2**: konsolidasi file (`V_Rencana`, `V_Master`, `V_Modals`, `J_Helpers`).
- **G18d (2026-09-19)**: adopsi CoreLib v2.3.0, pin 15, CDN `@v2.8.1`, cleanup v1→v2.
- **Bukti**: `runLibraryTests()` PASS 42/0/1 + `testAdopsiG18d()` 13/13 PASS (2026-09-19).

### G11a — `contract_check` → TUTUP ✅
- **Bukti**: `si-lahar` masuk APPS (5 app), exit 0, 2 WARN terdokumentasi.

### G19 — Paspor Kinerja ASN → TUTUP ✅
- **G19a**: rancangan (`docs/09`).
- **G19b**: implementasi live (`V_Profil.html` + `J_Kinerja` + `J_App`).
- **Bukti**: `TC-P1..TC-P7` PASS live 2026-09-19.

### G20 (baru, G18d) — Adopsi util CoreLib v2.3.0 → TUTUP ✅
- **Delegasi**: `tanggalKey10_` → `CoreLib.dateKey10`; `paginate_` → `CoreLib.paginate`; `matchSearch_` → `CoreLib.matchSearch`; `ekEnum_` → `CoreLib.whitelist`; `todayIso_()` → `CoreLib.todayIsoLocal` (WIB).
- **Bukti**: `testAdopsiG18d()` 13/13 PASS.

### G21 (baru, G18d) — Bump pin CoreLib 14 → 15 & CDN `@v2.8.0` → `@v2.8.1` → TUTUP ✅
- **`appsscript.json`**: `"version": "14"` → `"15"`.
- **`Index.html`**: 4 URL CDN → `@v2.8.1`.
- **Bukti**: `runLibraryTests()` PASS 42/0/1 dari si-lahar (bukti pin 15 aktif).

### G22 (baru, G18d) — Cleanup file & dead code → TUTUP ✅
- **Dihapus/diarsip**: 5 file (`A0_Style`, `V_Analisa`, `V_RiwayatLaporan`, `V_MasterData`, `V_Tentang`).
- **Konsolidasi**: 2 file baru (`V_Rencana`, `V_Master`).
- **`J_Api`**: 11 method → 3 method.
- **`J_State`**: ~45 field → ~20 field.
- **Bukti**: `Index.html` final hanya include 10 view + 7 `J_*`.

---

## 3. Daftar Pertanyaan Pemilik — Status

| # | Pertanyaan | Jawaban | Status |
|---|---|---|---|
| 1 | G5 toast: bawah-kanan atau atas-kanan? | **Bawah-kanan** (Index) | ✅ Diterapkan (kini dari kit: top-right standalone) |
| 2 | G7 mau dirapikan sekarang atau tunda? | **Tunda** | ⏸ |
| 3 | G8 AUDIT_LOGS/MAIN_DATA: hapus/biarkan/rencana? | **Pangkas dari kode**, biarkan di sheet (CoreLib auto) | ✅ |
| 4 | G9 REKAP_BULANAN/KATEGORI: fitur masa depan atau pangkas? | REKAP = **aktif** (SKP Bulanan); KATEGORI = **pangkas** (fitur masa depan) | ✅ |
| 5 | G10 upload bukti ke Drive: dibutuhkan? | **Fase lanjut** | 🟡 Backlog |
| 6 | G11 repo GitHub `si-lahar`? | **Ya** — sudah dibuat | ✅ |
| 7 | 01_BRD ukuran sukses & wali data? | **Sudah dikunci 2026-09-18** | ✅ |
| 8 | 02_PRD jenis_kegiatan: 5 hardcoded atau dari KONFIGURASI? | **5 hardcoded** (legacy v1 dibekukan; v2 pakai `jenis_tugas_id`) | ✅ |

---

## 4. Ringkasan Status

### Total gap yang pernah tercatat
- **G1–G22** (22 gap termasuk yang baru muncul setelah G18d).

### Status akhir
| Kategori | Jumlah |
|---|---|
| ✅ TUTUP | 18 |
| ⏸ DITUNDA (keputusan pemilik) | 1 (G7) |
| 🟡 BACKLOG fase lanjut | 3 (G10, G18 lanjutan, G19 lanjutan) |
| 🟢 NICE-TO-HAVE | 1 (G20-modal-RHK — perlu nomor ulang untuk hindari tabrakan dengan G20 adopsi) |

### Kesehatan keseluruhan
- **Backend**: 100% selaras CoreLib v2.3.0 (pin 15).
- **Frontend**: 100% pakai CDN kit v2.8.1.
- **Dokumen**: seluruh 9 dokumen `docs/` sinkron setelah update 2026-09-19.
- **Test**: `runLibraryTests` 42/0/1 + `testAdopsiG18d` 13/13 + `testLaporanGuards` 13/13.

**Kesimpulan**: si-lahar siap produksi. Tidak ada gap blocker. Sisa item = fase lanjut (fitur baru, bukan gap fungsional).
