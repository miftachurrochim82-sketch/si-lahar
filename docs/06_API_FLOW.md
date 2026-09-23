# 06 — API FLOW [TO-BE v2: SILAHAR e-Kinerja Harian — 2026-09-19]

> Semua aksi lewat CoreLib router (`handleAction({action, data, token})`).
> Level aksi dideklarasikan di `01_ConfigAndBridge.gs` (`APP_CONFIG.actionLevels`) —
> cermin fail-closed CoreLib (default aksi tak dikenal = `viewer`).
>
> **Catatan CoreLib built-in default** (v2.2.2+): tiga aksi berikut punya default
> `admin` **tanpa perlu didaftarkan di `actionLevels`**: `save`, `delete`,
> `save_config_item`. Karena itu `V_Pengaturan.html` (`<app-settings>`) berfungsi
> penuh tanpa app perlu mendeklarasikan ketiganya.
>
> **Riwayat revisi**:
> - 2026-09-18 — API FLOW v2 initial (Gate 0).
> - 2026-09-18 (malam) — G18c-2: konsolidasi file, kit alignment.
> - **2026-09-19 — G18d**: adopsi CoreLib v2.4.0 + cleanup v1→v2 + pin 17 + CDN v2.9.1.

## Alur bisnis utama
```
[RHK_SKP] --picker--> [RENCANA_HARIAN] --selesai--> [LAPORAN_HARIAN/realisasi + LAMPIRAN_BUKTI]
        --menunggu--> [verifikasi admin: disetujui|revisi] --periode--> [REKAP_BULANAN] --> export
```

## Daftar aksi v2 (22 handler dari `kinerjaHandlers_()` + 11 handler v1 & infrastruktur)

### Aksi e-Kinerja Harian (22 handler, terdaftar via `kinerjaHandlers_()`)

| Aksi | Level | Backend (`file` → fungsi) | Input | Output |
|---|---|---|---|---|
| `get_rhk_list` | viewer | `05_MasterKinerjaApi.gs` → `ekGetRhkList_` | `filters(pegawai_id, periode_tahun, status)`, `page` | list RHK + meta |
| `save_rhk` | **admin** | `05` → `ekSaveRhk_` | `record` RHK | upsert + validasi FR-01 |
| `delete_rhk` | **admin** | `05` → `ekDeleteRhk_` | `id` | soft delete; tolak bila terpakai realisasi |
| `get_jenis_tugas_list` | viewer | `05` → `ekGetJenisTugasList_` | — | list aktif (picker) |
| `get_satuan_list` | viewer | `05` → `ekGetSatuanList_` | — | list aktif (picker) |
| `save_jenis_tugas` | **admin** | `05` → `ekSaveJenisTugas_` | `record` | upsert; kode unik |
| `save_satuan` | **admin** | `05` → `ekSaveSatuan_` | `record` | upsert; kode unik |
| `get_rencana_list` | viewer | `06_RencanaApi.gs` → `ekGetRencanaList_` | `filters(tanggal, dari, sampai, pegawai_id, status)` | list + meta |
| `save_rencana` | viewer* | `06` → `ekSaveRencana_` | `record` | upsert milik sendiri (*admin bebas) |
| `move_status_rencana` | viewer* | `06` → `ekMoveStatusRencana_` | `id`, `status_baru` | guard transisi FR-06 |
| `delete_rencana` | viewer* | `06` → `ekDeleteRencana_` | `id` | guard FR-09 |
| `get_realisasi_list` | viewer | `07_RealisasiApi.gs` → `ekGetRealisasiList_` | `filters(tanggal, pegawai_id, rhk_id, status_verifikasi)`, `search` | list + **lampiran nested** |
| `save_realisasi` | viewer* | `07` → `ekSaveRealisasi_` | `record` + `lampiran[]` | upsert + lampiran sync (FR-10..12, 14) |
| `delete_realisasi` | viewer* | `07` → `ekDeleteRealisasi_` | `id` | soft + lampiran ikut |
| `verifikasi_realisasi` | **admin** | `08_VerifikasiRekapApi.gs` → `ekVerifikasiRealisasi_` | `id`, `keputusan(setujui\|revisi)`, `catatan` | FR-15 + efek status rencana |
| `get_antrian_verifikasi` | **admin** | `08` → `ekAntrianVerifikasi_` | `page` | list menunggu + count + lampiran |
| `generate_rekap_bulanan` | **admin** | `08` → `ekGenerateRekap_` | `periode`, `pegawai_id?` | upsert `REKAP_BULANAN` (FR-17) |
| `get_rekap_list` | viewer (diri) / admin | `08` → `ekGetRekapList_` | `periode` | list + meta |
| `dashboard_kinerja` | viewer | `09_DashboardKinerjaApi.gs` → `ekDashboardKinerja_` | `periode?` | metrik P7 (FR-19) |
| `analisa_kinerja` | **admin** | `09` → `ekAnalisaKinerja_` | `periode?` | analisa tim (FR-20) |

\* Aksi `viewer*` = level default `viewer` + **guard kepemilikan** di handler (FR-22). Admin lolos guard.

### Aksi v1 dipertahankan (11 handler) — tidak dihapus demi kompatibilitas

| Aksi | Level | Backend | Catatan |
|---|---|---|---|
| `get_laporan_list` | viewer | `02_AppLogic.gs` → `getLaporanList_` | Daftar laporan v1 (dipakai `V_Master.html` tab Laporan) |
| `get_riwayat_list` | viewer | `02` → `getRiwayatList_` | (handler ada, view-nya sudah dihapus — orphan) |
| `save_laporan` | viewer* | `02` → `saveLaporanHandler_` | proteksi pemilik (P5) |
| `delete_laporan` | viewer* | `02` → `deleteLaporanHandler_` | proteksi pemilik (P5) |
| `verifikasi_laporan` | **admin** | `02` → `verifikasiLaporanHandler_` | (khusus laporan v1) |
| `dashboard` | viewer | `02` → `apiDashboard_` | **Legacy v1** — tidak dipakai frontend sejak G18c-2 |
| `analytics` | viewer | `02` → `getAnalytics_` | **Legacy v1** — tidak dipakai frontend sejak G18c-2 |
| `get_pegawai_list` | viewer | `02` → `getPegawaiList_` | Referensi SIMPEG |
| `get_unit_list` | viewer | `02` → `getUnitList_` | Referensi SIMPEG |
| `get_jabatan_list` | viewer | `02` → `getJabatanList_` | Referensi SIMPEG |
| `get_my_profile` | viewer | `02` → `getMyProfileEnriched_` | Enriched pangkat_golongan dari master |
| `save_my_profile` | viewer | `02` → `saveMyProfile_` | Self-service (email dari session) |

> **Catatan cleanup G18d (2026-09-19)**: handler v1 `dashboard` & `analytics` **masih
> terdaftar** di `handleAction` untuk kompatibilitas. Frontend sudah lama tidak
> memakainya (V_Dashboard pakai `dashboard_kinerja` v2). Kandidat dihapus di cleanup lanjut.

### Aksi CoreLib built-in (tidak perlu didaftarkan di `actionLevels`)

| Aksi | Level Default CoreLib | Dipakai oleh |
|---|---|---|
| `save` | **admin** | Generic CRUD (tidak dipakai frontend si-lahar — pakai handler khusus `save_laporan`) |
| `delete` | **admin** | Generic CRUD (`<app-settings>` pakai ini untuk hapus KONFIGURASI) |
| `save_config_item` | **admin** | `<app-settings>` (V_Pengaturan) |
| `get_config` | viewer (default) | `<app-settings>` |
| `exchange_platform_ticket` | publik (tanpa session) | login SSO gateway |
| `logout` | publik | keluar sesi |
| `get_pegawai_list` / `get_unit_list` / `get_jabatan_list` | viewer | referensi SIMPEG (fallback AppCore.loadMasterSIMPEG) |

> Sejak G18d, `01_ConfigAndBridge.gs` tetap mendeklarasikan `actionLevels` eksplisit
> untuk aksi e-Kinerja (mis. `save_rhk: 'admin'`). Untuk aksi generik (`save`/`delete`/
> `save_config_item`) **tidak perlu** didaftarkan — CoreLib sudah punya default `admin`.

## Kontrak respons
Standar CoreLib: `{success, data|error, code?, meta?}`; `UNAUTHORIZED` → `handleSessionExpired`
(app-core frontend); cache-bust & dedup baca dari `AppCore.callServer`.

## Adopsi CoreLib v2.4.0 di alur API (G18d)

Tidak ada aksi API baru. Yang berubah hanya **implementasi internal** dari wrapper lokal
(yang sudah ada di `02_AppLogic.gs` & `04_KinerjaUtils.gs`):

| Wrapper lokal | Sebelum | Sesudah (G18d) |
|---|---|---|
| `tanggalKey10_(v)` | Isi manual ~15 baris | `return CoreLib.dateKey10(v)` |
| `paginate_(rows, page, limit)` | Isi manual ~13 baris | `return CoreLib.paginate(rows, page, limit)` |
| `matchSearch_(row, q, fields)` | Isi manual ~7 baris | `return CoreLib.matchSearch(row, q, fields)` |
| `ekEnum_(v, list, dflt)` | Isi manual `indexOf` | `try { return CoreLib.whitelist(v, list, 'enum'); } catch (e) { return dflt \|\| ''; }` |
| `todayIso_()` | `CoreLib.todayIso()` (**UTC**) | `CoreLib.todayIsoLocal()` (**WIB**) — **fix bug laten** |

**Efek di alur API**: seluruh handler yang memakai `tanggalKey10_` untuk kunci tanggal
filter/sortir sekarang **sadar zona waktu Script** — konsisten dengan input user WIB.
Handler yang mengembalikan paginasi `paginate_` mendapat **meta identik** (total, page,
limit, total_pages). Tidak ada perubahan signature atau perilaku response.

## Catatan transisi G18b → G18c-2 → G18d

- **G18b (2026-09-18)**: handler dipecah per domain (`04_KinerjaUtils.gs` + `05..09_*Api.gs`);
  `kinerjaHandlers_()` meregistrasi 22 aksi; level aksi dideklarasikan di `actionLevels`.
- **G18c-2 (2026-09-18 malam)**: konsolidasi file frontend (V_Rencana, V_Master, V_Modals,
  J_Helpers); `V_Tentang`/`A0_Style`/`V_Analisa`/`V_RiwayatLaporan`/`V_MasterData` dihapus
  atau diarsip; dashboard v1 (`dashboard`/`analytics`) tidak lagi dipakai.
- **G18d (2026-09-19)**:
  - **Pin CoreLib** = 15 (v2.4.0) — util baru `todayIsoLocal`/`dateKey10`/`paginate`/`matchSearch`/`whitelist` tersedia.
  - **CDN** = `@v2.9.1` (patch T49).
  - **Wrapper lokal** didelegasikan ke CoreLib (lihat tabel atas).
  - **Cleanup**: 11 method → 3 method di `J_Api`; `J_State` dari ~45 field → ~20 field;
    5 file HTML dihapus/diarsip.

## Catatan integrasi

- Picker RHK/satuan/jenis tugas di frontend memakai list aktif (cache AppCore 180s boleh).
- Export rekap & realisasi via `AppCore.exportExcel`/`exportPDF` (kolom didefinisikan frontend).
- **CoreLib First**: aksi util generik (tanggal, paginasi, pencarian, whitelist) **wajib**
  pakai CoreLib (bukan tulis ulang lokal). Bila butuh wrapper lokal untuk call-site yang
  ada, pakai pola delegasi (`return CoreLib.x(...)`) — jangan salin body.
