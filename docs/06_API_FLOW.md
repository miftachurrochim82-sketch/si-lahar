# 06 — API FLOW [TO-BE v2: SILAHAR e-Kinerja Harian — 2026-09-18]

> Semua aksi lewat CoreLib router (`handleAction({action,data,token})`). Level aksi
> dideklarasikan di 01_Config (actionLevels) — cermin fail-closed CoreLib.

## Alur bisnis utama
```
[RHK_SKP] --picker--> [RENCANA_HARIAN] --selesai--> [LAPORAN_HARIAN/realisasi + LAMPIRAN_BUKTI]
        --menunggu--> [verifikasi admin: disetujui|revisi] --periode--> [REKAP_BULANAN] --> export
```

## Daftar aksi v2 (baru/ubah)
| Aksi | Level | Input | Output |
|---|---|---|---|
| get_rhk_list | viewer | filters(pegawai_id,periode_tahun,status), page | list RHK + meta |
| save_rhk | admin | record RHK | upsert + validasi FR-01 |
| delete_rhk | admin | id | soft delete; tolak bila terpakai realisasi |
| get_jenis_tugas_list / get_satuan_list | viewer | - | list aktif (picker) |
| save_jenis_tugas / save_satuan | admin | record | upsert; kode unik |
| get_rencana_list | viewer | filters(tanggal, dari_sampai, pegawai_id, status, mode=kanban/kalender) | list + meta |
| save_rencana | viewer* | record | upsert milik sendiri (*admin bebas) |
| move_status_rencana | viewer* | id, status_baru | guard transisi FR-06 |
| delete_rencana | viewer* | id | guard FR-09 |
| get_realisasi_list | viewer | filters(tanggal, pegawai_id, rhk_id, status_verifikasi, search) | list + lampiran嵌套 |
| save_realisasi | viewer* | record + lampiran[] | upsert + lampiran sync (FR-10..12,14) |
| delete_realisasi | viewer* | id | soft + lampiran ikut |
| verifikasi_realisasi | admin | id, keputusan(setujui/revisi), catatan | FR-15 + efek status rencana |
| get_antrian_verifikasi | admin | page | list menunggu + count |
| generate_rekap_bulanan | admin | periode, pegawai_id? | upsert REKAP_BULANAN (FR-17) |
| get_rekap_list | viewer (diri)/admin | periode | list + meta |
| dashboard | viewer | - | metrik P7 (ubah agregat FR-19) |
| analytics | viewer/admin | periode? | analisa FR-20 |
| (v1 dipertahankan) | | get_my_profile, save_my_profile, get_config, save_config_item, logout, exchange_platform_ticket | tanpa perubahan |

## Kontrak respons
Standar CoreLib: `{success, data|error, code?, meta?}`; UNAUTHORIZED → handleSessionExpired
(app-core frontend); cache-bust & dedup baca dari AppCore.callServer.

## Catatan transisi G18b (2026-09-18)
- Aksi v1 `dashboard` & `analytics` DIPERTAHANKAN (UI lama masih hidup). Aksi baru:
  `dashboard_kinerja` (FR-19) & `analisa_kinerja` (FR-20, khusus admin). Penggantian
  total terjadi di G18c saat frontend baru menyala.
- Handler dipecah per domain (split G18b, pola si-kompetensi): `04_KinerjaUtils.gs`
  (enum/guard/helper + registrasi `kinerjaHandlers_()`), `05_MasterKinerjaApi.gs`
  (FR-01..04), `06_RencanaApi.gs` (FR-05..09), `07_RealisasiApi.gs` (FR-10..14),
  `08_VerifikasiRekapApi.gs` (FR-15..18), `09_DashboardKinerjaApi.gs` (FR-19..20).
  Registrasi digabung di handleAction (02_AppLogic); level aksi dideklarasikan di
  actionLevels 01_Config (fail-closed).

## Catatan integrasi
- Picker RHK/satuan/jenis tugas di frontend memakai list aktif (cache AppCore 180s boleh).
- Export rekap & realisasi via AppCore.exportExcel/exportPDF (kolom didefinisikan frontend).
- Action levels v2 ditambahkan ke deklarasi 01_Config saat build (Gate FRD→kode).
