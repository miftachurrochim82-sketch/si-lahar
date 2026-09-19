# SILAHAR — e-Kinerja Harian ASN
### Satpol PP & Damkar Kab. Trenggalek · Aplikasi Satelit Ekosistem

Repositori ini adalah **aplikasi satelit** dari ekosistem Pemkab Trenggalek
yang dibangun di atas **Google Apps Script (GAS) + Google Sheets** (backend)
dan **Vue 3 + Tailwind CSS** (frontend via CDN). Aplikasi ini mengimplementasikan
**e-Kinerja Harian ASN** dengan rujukan **e-Kinerja BKN** dan **PermenPANRB 6/2022**.

---

## 📌 Status Saat Ini (per 2026-09-19)

**Fase retrofit: SELESAI — siap produksi.**

| Tahap | Status |
|---|---|
| (1) AS-IS Docs (Gate 0) | ✅ Selesai — 9 dokumen `docs/` lengkap |
| (2) Review + Jawab ❓ | ✅ Selesai — semua pertanyaan Gap List terjawab |
| (3) To-Be & Gap Fix per Gerbang | ✅ Selesai — G1–G22 tuntas (18 TUTUP, 1 DITUNDA, 3 BACKLOG) |
| (4) Contract Check + Paste GAS + Tes + Deploy | ✅ Selesai — `runLibraryTests` PASS 42/0/1 + `testAdopsiG18d` 13/13 |

### Rilis Terkini
- **App version**: `v2.1.0` (2026-09-19)
- **CoreLib pin**: `15` (v2.3.0)
- **Frontend CDN**: `@v2.8.1`
- **Backend**: 10 file `.gs` (04_KinerjaUtils + 05..09 per-domain)
- **Frontend**: 10 file view `V_*` + 7 file logika `J_*` + `Index.html`

---

## 📚 Dokumentasi (Gate 0)

Seluruh dokumentasi AS-IS/TO-BE berada di folder **`docs/`**:

| Dokumen | Isi | Versi |
|---|---|---|
| [`01_BRD.md`](docs/01_BRD.md) | Masalah, pengguna, batas, ekosistem, ukuran sukses | v2.1.0 |
| [`02_PRD.md`](docs/02_PRD.md) | Peta 8 modul (P1–P8), story + AC, scope | v2.1.0 |
| [`03_FRD.md`](docs/03_FRD.md) | FR-01..FR-26 + aturan Gate 0 | G18d |
| [`04_DATABASE.md`](docs/04_DATABASE.md) | 9 sheet aktif (3 master + 4 tabel + 2 infra) + enum + audit | 9 sheet |
| [`05_UIUX.md`](docs/05_UIUX.md) | Peta halaman, kit komponen, konvensi desain | Final |
| [`06_API_FLOW.md`](docs/06_API_FLOW.md) | 22 handler e-Kinerja + 12 handler v1 + CoreLib built-in | Final |
| [`07_TESTCASE.md`](docs/07_TESTCASE.md) | 27 TC + 13 asersi adopsi + 13 guard + 7 TC-P | 42/13/13 |
| [`08_GAP_LIST.md`](docs/08_GAP_LIST.md) | Status 22 gap (18 TUTUP, 1 DITUNDA, 3 BACKLOG) | 2026-09-19 |
| [`09_PROFIL_KINERJA.md`](docs/09_PROFIL_KINERJA.md) | Paspor Kinerja ASN (live) + riwayat v1.1/v1.2 | LIVE |

### Aturan Main (Gate 0)
> **Satu baris dokumen = satu item kode.**
> Tidak ada kode baru tanpa amendemen dokumen.
> Setiap perubahan skema wajib update `03_FRD.md` + `04_DATABASE.md` dulu.

---

## 🗂️ Struktur Repositori

```text
si-lahar/
├── README.md                 # Dokumen ini
├── docs/                     # 9 dokumen Gate 0 (BRD s/d Profil Kinerja)
│   ├── 01_BRD.md
│   ├── 02_PRD.md
│   ├── 03_FRD.md
│   ├── 04_DATABASE.md
│   ├── 05_UIUX.md
│   ├── 06_API_FLOW.md
│   ├── 07_TESTCASE.md
│   ├── 08_GAP_LIST.md
│   └── 09_PROFIL_KINERJA.md
└── src/                      # 29 file deploy ke GAS
    ├── appsscript.json       # Manifest V8 + library CoreLib pin 15
    │
    ├── 01_ConfigAndBridge.gs # Konstanta & bridge ke CoreLib
    ├── 02_AppLogic.gs        # doGet/doPost, handler laporan v1, util
    ├── 03_Maintenance.gs     # Tool perawatan DB (audit, rapikan, seed)
    ├── 04_KinerjaUtils.gs    # Enum, guard, helper + registrasi handler
    ├── 05_MasterKinerjaApi.gs # FR-01..04: RHK/jenis tugas/satuan
    ├── 06_RencanaApi.gs      # FR-05..09: rencana harian (kanban+kalender)
    ├── 07_RealisasiApi.gs    # FR-10..14: realisasi + lampiran bukti
    ├── 08_VerifikasiRekapApi.gs # FR-15..18: verifikasi + SKP Bulanan
    ├── 09_DashboardKinerjaApi.gs # FR-19..20: dashboard + analisa tim
    ├── 99_Test.gs            # Test suite + diagnostik
    │
    ├── Index.html            # Shell tipis (pin CDN @v2.8.1 + include 1 tingkat)
    │
    ├── V_Modals.html         # 7 modal terpusat
    ├── V_Dashboard.html      # FR-19: Dashboard Kinerja
    ├── V_Rencana.html        # FR-07/08: Rencana Kanban + Kalender (2 mode)
    ├── V_Realisasi.html      # FR-10..13: Realisasi Harian
    ├── V_SkpBulanan.html     # FR-17/18: Laporan SKP Bulanan
    ├── V_Verifikasi.html     # FR-15/16: Antrian Verifikasi
    ├── V_Master.html         # FR-01..03: 4 tab (Laporan, RHK, Jenis, Satuan)
    ├── V_Profil.html         # G19b: Paspor Kinerja ASN
    ├── V_Pengaturan.html     # Konfigurasi (admin)
    │
    ├── J_State.html          # State data/computed
    ├── J_Helpers.html        # Helper murni (lookup, badge, transisi)
    ├── J_Api.html            # Loader data (laporan v1 + profil)
    ├── J_Actions.html        # Aksi user (CRUD laporan, verifikasi)
    ├── J_Export.html         # Export Excel/PDF via kit
    ├── J_Kinerja.html        # Modul e-Kinerja (state + method)
    └── J_App.html            # Bootstrap AppCore.create + mixins
```

> **Catatan**: `V_Analisa.html` masih ada di `src/` sebagai **arsip** (tidak di-include di `Index.html`). Kandidat dihapus di cleanup lanjut.

---

## 🏛️ Arsitektur

### Backend (GAS + Google Sheets)
- **CoreLib pin 15** (v2.3.0) — library bersama ekosistem
  - Util sadar-WIB: `todayIsoLocal()`, `dateKey10()`
  - Util paginasi & pencarian: `paginate()`, `matchSearch()`
  - Whitelist enum: `whitelist()`
- **9 sheet aktif**:
  - Master bisnis (3): `RHK_SKP`, `JENIS_TUGAS`, `SATUAN`
  - Tabel bisnis (4): `LAPORAN_HARIAN` (realisasi), `RENCANA_HARIAN`, `REKAP_BULANAN`, `LAMPIRAN_BUKTI`
  - Infra app (2): `KONFIGURASI`, `ZZ_TEST_CRUD`
- **Sheet sistem CoreLib** (auto-create, tidak dihitung): `AUDIT_LOGS`, `MAIN_DATA`
- **Sheet referensi SIMPEG** (auto-baca dari master): `PEGAWAI`, `JABATAN`, `UNIT_KERJA`

### Frontend (CDN `@v2.8.1`)
- **Shell tipis**: `Index.html` hanya pin CDN + include 1 tingkat + mount Vue
- **10 view `V_*`** + **7 modul `J_*`** (pola modular si-kompetensi)
- **Kit komponen** dari `frontend-cdn`:
  `<app-login>`, `<app-sidebar>`, `<app-header>`, `<app-badge>`, `<app-stat-card>`,
  `<app-modal>`, `<app-crud-table>`, `<app-filter-bar>`, `<app-empty-state>`,
  `<app-skeleton>`, `<app-chart-bar>`, `<app-chart-doughnut>`, `<app-pegawai-picker>`,
  `<app-profile>`, `<app-settings>`
- **Vue 3.5.42** (pinned) + **Tailwind CSS** + **Font Awesome 6.5.2**

### Otentikasi (SSO)
- Tiket SSO dari **SI-Platform** (portal pusat)
- Token sesi HMAC lokal (TTL 6 jam)
- Role: `viewer` < `user` < `verifikator` < `admin` < `super` (fail-closed)

---

## 🚀 Deploy (GAS)

### Prasyarat
1. **CoreLib** sudah terpasang di GAS (ID: `1GmeYflfMpRa1iTVgFHRD6K1DMoxc9OoKqpuucPJXgNZ9XBK06O7wgDkO`, pin `15`).
2. **Script Properties** sudah diisi:

| Key | Nilai |
|---|---|
| `SPREADSHEET_ID` | ID spreadsheet database lokal si-lahar |
| `MASTER_SPREADSHEET_ID` | ID spreadsheet master SIMPEG |
| `PLATFORM_API_URL` | URL deployment SI-Platform (`/exec`) |
| `ADMIN_EMAILS` | Whitelist admin (comma-separated) |
| `VERIFIKATOR_EMAILS` | Whitelist verifikator (comma-separated) |

### Langkah Deploy
1. **Paste** seluruh file di `src/` ke editor GAS si-lahar (whole-file, jangan find-replace).
2. **Upload** salinan ke GitHub via *Upload files* (hindari kontaminasi Cloudflare).
3. Jalankan **`initDatabase()`** (sekali) — membuat sheet + kolom audit.
4. Jalankan **`seedMasterKinerja()`** (sekali) — seed jenis tugas & satuan.
5. Jalankan **`runLibraryTests()`** — target **PASS 42 / FAIL 0 / SKIP 1**.
6. Jalankan **`testAdopsiG18d()`** — target **13/13 PASS**.
7. **Deploy** Web App → New version → akses `/exec`.
8. **Smoke test** UI: login SSO, buka setiap menu, cek konsol browser.

### Verifikasi Cepat
Buka app di browser → F12 Console:
```javascript
AppCore.version        // "2.8.0"
AppComponents.version  // "2.8.0"
AppModules.version     // "2.8.0"
CoreLib.todayIsoLocal() // tanggal hari ini WIB
```

---

## 🧪 Test Suite

| Fungsi | Kegunaan | Target |
|---|---|---|
| `runLibraryTests()` | Regression test CoreLib v2.3.0 | **PASS 42 / FAIL 0 / SKIP 1** |
| `testAdopsiG18d()` | Verifikasi delegasi wrapper lokal → CoreLib | **13/13 PASS** |
| `testLaporanGuards()` | Proteksi laporan v1 (P1–P8) | **13/13 PASS** |
| `runAllDiagnostics()` | Cek koneksi DB + schema + CoreLib | Semua ✅ |
| `auditStrukturDatabase()` | Audit struktur sheet (read-only) | Report |
| `rapikanDatabase()` | Rencana perbaikan (dry-run default) | Plan |
| `rapikanKonfigurasiSilahar()` | Audit sheet KONFIGURASI | Plan |

---

## 📋 Fitur Utama

- ✅ **Master Kinerja** — RHK/SKP tahunan, kamus jenis tugas, kamus satuan
- ✅ **Rencana Harian** — Kanban (5 kolom status) + Kalender (grid bulanan)
- ✅ **Realisasi Harian** — Uraian hasil + volume + satuan + bukti dukung (multi)
- ✅ **Verifikasi Atasan** — Antrian + setujui/revisi + catatan
- ✅ **Laporan SKP Bulanan** — Generate otomatis per (pegawai, periode) + export
- ✅ **Dashboard Kinerja** — Kartu diri + tren 30 hari + distribusi RHK
- ✅ **Papan Tim** (admin) — Ketepatan harian + top capaian + tunggakan
- ✅ **Paspor Kinerja ASN** — Hero identitas + speedometer + 4 sub-tab
- ✅ **Dark Mode** — Seluruh halaman
- ✅ **Responsif** — Mobile-friendly (scroll horizontal di tabel)

---

## 🔗 Tautan Terkait

| Proyek | Tautan |
|---|---|
| **frontend-cdn** (master ekosistem) | [GitHub](https://github.com/miftachurrochim82-sketch/frontend-cdn) |
| **si-platform** (portal SSO) | [GitHub](https://github.com/miftachurrochim82-sketch/si-platform) |
| **si-kompetensi** | [GitHub](https://github.com/miftachurrochim82-sketch/si-kompetensi) |
| **si-pelaporan** | [GitHub](https://github.com/miftachurrochim82-sketch/si-pelaporan) |

---

## 📜 Kontak & Pemeliharaan

- **Pengelola**: Tim Pengembang TI — Dinas Komunikasi dan Informatika Kabupaten Trenggalek
- **Rujukan konsep**: e-Kinerja BKN + PermenPANRB 6/2022
- **Lisensi**: MIT License
