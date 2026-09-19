# 03 — FRD [TO-BE v2: SILAHAR e-Kinerja Harian — 2026-09-19]

> Aturan Gate 0: **satu baris FR = satu item kode** (handler/fungsi/komponen/kolom).
> Build tidak boleh mendahului baris di dokumen ini.
>
> **Riwayat revisi**:
> - 2026-09-18 — FRD v2 initial (Gate 0, G18a–G18c).
> - **2026-09-19 — G18d**: util CoreLib v2.3.0 diadopsi (FR-25); cleanup v1→v2 (FR-26).

## Master
- **FR-01** CRUD RHK_SKP (admin): validasi pegawai_id ada di referensi SIMPEG, periode_tahun wajib, jenis_rhk ∈ {utama,tambahan}, satuan_id ∈ SATUAN aktif, target_tahunan numerik > 0.
  - Backend: `ekSaveRhk_` / `ekDeleteRhk_` / `ekGetRhkList_` (`05_MasterKinerjaApi.gs`).
- **FR-02** CRUD JENIS_TUGAS (admin): kode unik; entri terpakai di rencana/realisasi → hanya boleh dinonaktifkan.
  - Backend: `ekSaveJenisTugas_` (`05_MasterKinerjaApi.gs`).
- **FR-03** CRUD SATUAN (admin): kode unik; aturan pakai sama dengan FR-02.
  - Backend: `ekSaveSatuan_` (`05_MasterKinerjaApi.gs`).
- **FR-04** Picker read-only RHK untuk viewer: hanya RHK aktif milik pegawai sesi.
  - Frontend: `<app-pegawai-picker>` (RHK picker di modal form RHK).

## Rencana Harian
- **FR-05** Simpan rencana (viewer milik sendiri; admin bebas): tanggal, rhk_id milik pegawai tsb, jenis_tugas_id, rencana_hasil, prioritas ∈ {biasa,penting,mendesak}.
  - Backend: `ekSaveRencana_` (`06_RencanaApi.gs`).
- **FR-06** Pindah status rencana: direncanakan→dikerjakan→selesai; batal dari direncanakan/dikerjakan; dilarang lompat mundur kecuali admin revisi; status diverifikasi hanya diisi alur P5.
  - Backend: `ekMoveStatusRencana_` (`06_RencanaApi.gs`).
- **FR-07** Menu **Rencana Kanban**: list rencana kolom status; filter tanggal (default hari ini), pegawai (admin: semua; viewer: sendiri); pindah status via tombol kartu (drag = fase lanjut, DIKUNCI).
  - Frontend: `V_Rencana.html` mode `rencana_kanban`.
- **FR-08** Menu **Rencana Kalender**: grid bulanan per pegawai filter; klik sel buka Kanban terfilter tanggal sel.
  - Frontend: `V_Rencana.html` mode `rencana_kalender` (gabungan dengan Kanban sejak G18c-2, 2026-09-19).
- **FR-09** Hapus rencana: pemilik & status direncanakan; admin bebas kecuali terhubung realisasi.
  - Backend: `ekDeleteRencana_` (`06_RencanaApi.gs`).

## Realisasi Harian + Bukti
- **FR-10** Simpan realisasi (viewer milik sendiri): rhk_id, jenis_tugas_id, uraian_hasil, volume numerik > 0 + satuan_id, jam_mulai/jam_selesai opsional, tanggal wajib (format lokal yyyy-MM-dd, aturan G12 berlaku).
  - Backend: `ekSaveRealisasi_` (`07_RealisasiApi.gs`).
- **FR-11** Simpan lampiran bukti (multi) per realisasi: jenis_bukti ∈ {link,file,foto,notulen}, url wajib untuk link/foto/notulen-link; v1 tanpa upload biner.
  - Backend: `ekSinkronLampiran_` + `ekValidasiLampiran_` (`07_RealisasiApi.gs`).
- **FR-12** Edit/hapus realisasi: pemilik & status_verifikasi ≠ disetujui; hapus realisasi = hapus lunak lampirannya.
  - Backend: `ekSaveRealisasi_` (update) + `ekDeleteRealisasi_` (`07_RealisasiApi.gs`).
- **FR-13** List realisasi: filter tanggal/pegawai/rhk/status_verifikasi + search uraian; viewer default sendiri.
  - Backend: `ekGetRealisasiList_` (`07_RealisasiApi.gs`).
- **FR-14** Tautan rencana↔realisasi: saat realisasi dibuat dari kartu rencana (status selesai), rencana.realisasi_id terisi & status rencana ikut selesai.
  - Backend: dalam `ekSaveRealisasi_` (`07_RealisasiApi.gs`).

## Verifikasi
- **FR-15** Aksi verifikasi (admin): setujui → status_verifikasi=disetujui + verifikator + waktu; revisi → status_verifikasi=revisi + catatan_atasan + status rencana kembali dikerjakan.
  - Backend: `ekVerifikasiRealisasi_` (`08_VerifikasiRekapApi.gs`).
- **FR-16** Antrian verifikasi: realisasi status_verifikasi=menunggu urut tanggal; badge jumlah di header/menu admin.
  - Backend: `ekAntrianVerifikasi_` (`08_VerifikasiRekapApi.gs`).
  - Frontend: `V_Verifikasi.html` + badge jumlah di header menu.

## Rekap
- **FR-17** `generate_rekap_bulanan(pegawai_id?, periode)` = **Laporan SKP Bulanan** (periodik tiap bulan): idempoten upsert REKAP_BULANAN; hitung metrik P6; json capaian per RHK; periode RHK = TAHUNAN (DIKUNCI), rekap = bulanan.
  - Backend: `ekGenerateRekap_` + `ekHitungMetrikBulan_` (`08_VerifikasiRekapApi.gs`).
- **FR-18** List & export rekap (admin semua; viewer milik sendiri): Excel/PDF via kit export.
  - Backend: `ekGetRekapList_` (`08_VerifikasiRekapApi.gs`).
  - Frontend: `V_SkpBulanan.html` + `<app-crud-table>` + tombol export (AppCore.exportExcel/PDF).

## Dashboard & Analisa
- **FR-19** `dashboard_kinerja`: kartu diri + tren 30 hari + distribusi per RHK/jenis tugas (menggantikan agregat jenis_kegiatan operasional).
  - Backend: `ekDashboardKinerja_` (`09_DashboardKinerjaApi.gs`).
  - Frontend: `V_Dashboard.html` + `<app-stat-card>` + `<app-chart-bar>` / `<app-chart-doughnut bare>`.
- **FR-20** `analisa_kinerja` (admin/atasan): ketepatan harian tim (hari isi vs hari kerja), top capaian, daftar tunggakan verifikasi.
  - Backend: `ekAnalisaKinerja_` (`09_DashboardKinerjaApi.gs`).
  - Frontend: papan tim di `V_Dashboard.html` (khusus admin).

## Migrasi & Guard
- **FR-21** Migrasi data v1: 21 baris LAPORAN_HARIAN lama → realisasi dengan jenis_tugas_id hasil pemetaan (**DIIZINKAN pemilik 2026-09-18**: app dianggap masih awal, bukan memperbaiki produksi berjalan): mapping semantik DIKUNCI rutin→utama, insidental→tambahan, khusus→inovatif, lainnya→tugas_lain (id `JT_*`); rhk_id kosong → badge 'pra-RHK'; volume/satuan legacy dibiarkan kosong (wajib hanya entri baru); idempoten (lewati baris yang jenis_tugas_id-nya sudah terisi).
  - Backend: `migrateLaporanKeRealisasiV2` + `migrateLaporanKeRealisasiV2LIVE` (`03_Maintenance.gs`).
- **FR-22** Guard kepemilikan & role sama dengan v1 (P1–P8 backend lama dipertahankan perilakunya).
  - Backend: `ekGuardMilik_` (`04_KinerjaUtils.gs`) + `saveLaporanHandler_`/`deleteLaporanHandler_`/`verifikasiLaporanHandler_` (`02_AppLogic.gs`).
- **FR-23** Whitelist enum server-side untuk semua enum baru (cermin G16: nilai di luar whitelist → tolak saat save, normalisasi saat baca untuk data legacy).
  - Backend: `EK_ENUM` di `04_KinerjaUtils.gs` + `ekEnum_` (delegasi `CoreLib.whitelist` sejak G18d).
- **FR-24** Kolom audit CoreLib wajib di semua sheet baru (otomatis).
  - Infra: `ensureSheet` CoreLib (auto-tambah `created_at/by`, `updated_at/by`, `deleted_at`).

## Adopsi CoreLib v2.3.0 (G18d — 2026-09-19)
- **FR-25** Util baru CoreLib v2.3.0 dipakai via delegasi:
  - `CoreLib.todayIsoLocal()` — pengganti `todayIso_()` (WIB-aware, fix bug laten UTC).
    - Backend: `01_ConfigAndBridge.gs` — `todayIso_()` dan `todayIsoLocal_()`.
  - `CoreLib.dateKey10()` — pengganti isi `tanggalKey10_()`.
    - Backend: `02_AppLogic.gs` — `tanggalKey10_(v) { return CoreLib.dateKey10(v); }`.
  - `CoreLib.paginate()` — pengganti isi `paginate_()`.
    - Backend: `02_AppLogic.gs` — `paginate_(rows, page, limit) { return CoreLib.paginate(rows, page, limit); }`.
  - `CoreLib.matchSearch()` — pengganti isi `matchSearch_()`.
    - Backend: `02_AppLogic.gs` — `matchSearch_(row, q, fields) { return CoreLib.matchSearch(row, q, fields); }`.
  - `CoreLib.whitelist()` — delegasi dari `ekEnum_()` (non-throwing wrapper).
    - Backend: `04_KinerjaUtils.gs` — `ekEnum_(v, list, dflt)` memakai `try { return CoreLib.whitelist(v, list, 'enum'); } catch (e) { return dflt || ''; }`.
  - **Verifikasi**: `testAdopsiG18d()` di `99_Test.gs` — 13 asersi PASS.

## Cleanup v1→v2 (G18d — 2026-09-19)
- **FR-26** Konsolidasi file & hapus dead code:
  - `V_RencanaKanban.html` + `V_RencanaKalender.html` → **`V_Rencana.html`** (satu file, dua mode).
  - `V_MasterKinerja.html` + `V_MasterData.html` → **`V_Master.html`** (4 tab: Laporan, RHK/SKP, Jenis Tugas, Satuan).
  - `A0_Style.html` → **inline** di `Index.html` (blok `<style>` khusus kanban/kalender/mini-progress).
  - `V_Analisa.html` + `V_RiwayatLaporan.html` + `V_MasterData.html` — **dihapus** (orphan, tidak di-include).
  - `J_Api.html` — cleanup 11 method → 3 method (`loadLaporan`, `debouncedLoadLaporan`, `loadProfil`).
  - `J_State.html` — cleanup ~45 field → ~20 field (state v1 orphan dihapus).
  - `J_Kinerja.html` — konsolidasi (computed referensi SIMPEG dihapus karena tab referensi sudah tidak ada di `V_Master.html`).
