# 05 — UI/UX [TO-BE v2: SILAHAR e-Kinerja Harian — 2026-09-18]

> Shell & komponen kit dipertahankan (G15): app-login/app-sidebar/app-header, app-crud-table,
> app-filter-bar, toast, dark mode. Halaman bisnis = view V_* (pola si-kompetensi).

## Peta halaman (menu sidebar v2)
| Grup | Menu | View | Isi utama |
|---|---|---|---|
| Kinerja | Dashboard Kinerja | V_Dashboard | kartu diri (capaian bulan, streak, RHK aktif, menunggu verifikasi), tren 30 hari, distribusi per RHK/jenis tugas; atasan: papan ketepatan tim |
| Kinerja | Rencana Kanban | V_RencanaKanban (BARU) | papan 4 kolom status + kolom batal; kartu: tanggal, RHK, jenis tugas badge, prioritas; pindah status via tombol kartu; "+ Rencana" |
| Kinerja | Rencana Kalender | V_RencanaKalender (BARU) | grid 7 kolom bulan berjalan; sel = chip rencana; klik sel buka Kanban terfilter tanggal |
| Kinerja | SKP Bulanan | V_SkpBulanan (BARU) | Laporan SKP Bulanan: filter periode, generate (admin), tabel capaian, detail per RHK, export |
| Kinerja | Realisasi Harian | V_Realisasi (evolusi V_MasterData tab laporan) | filter-bar (tanggal/pegawai/rhk/status), app-crud-table realisasi, modal form (RHK picker, volume+satuan, jam, repeater bukti), badge pra-RHK untuk legacy |
| Kinerja | Profil Saya | V_Profil | tetap v1 |
| Master | Master Kinerja | V_MasterKinerja (BARU) | tab RHK_SKP / JENIS_TUGAS / SATUAN — app-crud-table + modal form (admin); viewer read-only |
| Pribadi | Profil Saya | V_Profil | wrapper modul kit `<app-profile>` (G18c-2) |
| Sistem | Pengaturan | V_Pengaturan | wrapper modul kit `<app-settings>` (G18c-2) |
| (admin) | Antrian Verifikasi | V_Verifikasi (BARU) | daftar menunggu verifikasi + aksi setujui/revisi + catatan; badge jumlah di sidebar |

Menu sidebar v2 (grup Kinerja): Dashboard Kinerja, Rencana Kanban, Rencana Kalender,
Realisasi Harian, SKP Bulanan; grup Master: Master Kinerja; grup Pribadi: Profil Saya;
grup Sistem: Pengaturan; item admin: Antrian Verifikasi. (Kanban & kalender = MENU terpisah,
keputusan pemilik 2026-09-18.)

> **REVISI G18c-2 (2026-09-18) — menu "Tentang Aplikasi" DIHAPUS.**
> Selaras si-kompetensi (7 menu, tanpa Tentang): V_Tentang = warisan v1 pra-CDN,
> isinya statis (versi/changelog) dan sudah tidak akurat sejak migrasi e-Kinerja.
> Info aplikasi (versi, rujukan BKN, ekosistem frontend-cdn) dilebur ke **footer
> V_Dashboard**. Berkas `V_Tentang.html` dipertahankan sebagai ARSIP dengan banner
> DEPRECATED di baris atas — JANGAN di-include lagi tanpa keputusan pemilik.
> Menu final = **9 item** (6 Kinerja + 1 Master + 1 Pribadi + 1 Sistem).

## Catatan desain
- Kanban: grid CSS kustom 4 kolom (custom UI diizinkan seperti laporan v1); kartu kompak;
  pindah status via tombol menu kartu (drag = fase lanjut — DIKUNCI pemilik).
- Kalender: grid 7 kolom bulan berjalan; sel berisi chip rencana; klik sel → buka kanban filter tanggal.
- Form realisasi: RHK picker = select grup nama_rhk + indikator; volume+satuan satu baris;
  repeater bukti = baris dinamis (jenis + url + keterangan).
- Badge: status rencana 5 warna; status verifikasi 3 warna (warisan v1); pra-RHK = abu.
- Toast & confirm() bawaan dipertahankan; debounce search 400ms dipertahankan.
- Dark mode: semua view baru wajib varian dark (token kit + A0_Style).

## Komponen kit yang dipakai
app-crud-table (master, realisasi, rekap), app-filter-bar (filter list), app-empty-state,
app-skeleton, app-badge; shell app-login/app-sidebar/app-header; export via AppCore.export*.

> **REVISI G18c-2 (2026-09-18) — pemakaian kit final:**
> app-stat-card ×4 (Dashboard), app-chart-bar + app-chart-doughnut `bare` (Dashboard,
> data via computed kdTren*/kdRhk* — Chart.js manual & renderKinerjaCharts DIHAPUS),
> app-modal (semua form: rencana ×2 host kanban/kalender, realisasi, rekap detail,
> RHK/jenis/satuan), app-pegawai-picker (form RHK), app-filter-bar (kanban & realisasi,
> defs = computed rencanaFilterDefs/realisasiFilterDefs, v-model objek filter),
> modul app-profile (V_Profil) + app-settings (V_Pengaturan) dari app-modules.min.js.
> Kelas CSS kit dipakai: .card/.btn*/.input/.form-label/.badge (via komponen).
> A0_Style dirampingkan 347 → 78 baris: HANYA kanban/kalender/mini-progress.
> Index: Chart.js/SheetJS/jsPDF/AutoTable statis DIHAPUS (on-demand AppCore.loadLib),
> Font Awesome disamakan ke jsDelivr npm 6.5.2, +app-modules.min.js.
> Custom UI yang dipertahankan (diizinkan): papan kanban, grid kalender, banner salam,
> kartu antrian verifikasi, papan tim admin.

## Review pemilik G18c-2 (2026-09-18) — banding menu Master & Pengaturan lintas app + adopsi praktik baik
Dibandingkan: SI-KOMPETENSI (Kamus Master Diklat, Pengaturan) vs SILAHAR (Master Kinerja, Pengaturan).

### Praktik baik yang DIADOPSI ke SILAHAR (Master Kinerja)
| # | Sumber | Adopsi | Item kode |
|---|---|---|---|
| 1 | kompet | Tab segmented lebar (ikon+label+jumlah), enak di-tap di HP | V_MasterKinerja: grid sm:grid-cols-3 tombol rounded-2xl |
| 2 | kompet | Search + filter di dalam halaman master | V_MasterKinerja `<app-filter-bar>` + J_Kinerja `masterFilterDefs`/`masterFilters` |
| 3 | kompet | Tombol refresh master | V_MasterKinerja btn-secondary + J_Kinerja `refreshMasters()` |
| 4 | lahar (dipertahankan) | Badge status aktif/nonaktif + indikator read-only viewer | tetap |
Filter klien: computed `rhkFiltered` (search nama RHK/indikator/nama pegawai + tahun + status), `jenisFiltered`/`satuanFiltered` (search kode/nama/keterangan + status); total-data tabel mengikuti hasil filter.

### Praktik baik kompet utk CATATAN gerbong v2.3.0 (bukan sekarang)
- Master kompet belum punya kolom STATUS & indikator read-only viewer (praktik lahar) → kandidat saat kompet diupdate mendalam.
- Tombol "Panduan" di header kompet → opsional, tidak diadopsi sekarang.

### Anomali data ditemukan (Pengaturan SILAHAR, sheet KONFIGURASI)
1. Sisa uji `temp_val`="Uji hapus" ×3 (2026-09-07, uji hapus yang tidak membersihkan).
2. Baris tergeser: key `58` (×2) & key `SI-KINERJA-SERVICE-TOKEN-2026` — isi bergeser satu kolom ke kiri, keterangan=timestamp.
3. Key uzur 0 referensi: jenis_kegiatan_list/jenis_kompetensi_list/jenis_pengawasan_list/instansi_nama.
4. Nilai lama: app_name=SI-LAPORAN-HARIAN, app_version=1.0.0, instansi kurang kata "Pemadam" — akar: seed v1 `setupApp()` (02_AppLogic ±433) + APP_TITLE di 01_ConfigAndBridge; perbaikan konstanta = ANTRIAN backend.
5. MANUAL (laporan saja, keputusan pemilik): `service_token`, `bup`.
Pembersihan = tool `rapikanKonfigurasiSilahar()` (dry-run) / `rapikanKonfigurasiSilaharLIVE()` di 03_Maintenance.gs — backup Drive otomatis; praktik baik kompet diadopsi: setiap baris config wajib punya keterangan deskriptif & app_version sinkron rilis.

### Polesan tata letak putaran 2 (review pemilik 2026-09-18)
Keluhan: tombol terlalu kecil, baris filter kurang rapi vs si-kompetensi, kolom aksi mepet pinggir.
| # | Perbaikan | Item kode |
|---|---|---|
| 1 | Tombol ikon baris tabel distandarkan 32px (dulu px-2 py-1 text-[10px]) | A0_Style `.btn-icon`/`.btn-icon-danger` (light+dark); dipakai di V_MasterKinerja/V_Realisasi/V_RencanaKanban |
| 2 | CTA besar gaya kompet | A0_Style `.btn-lg`; CTA baris filter master (`lg:min-w-44`) |
| 3 | Baris filter master = tata letak kompet: search flex-1 lebar + ikon, select lebar tetap (lg:w-40), refresh, CTA kanan — menggantikan app-filter-bar di master (app-filter-bar tetap utk halaman list: kanban/realisasi) | V_MasterKinerja + J_Kinerja (`tahunRhkOptions`, `labelTambahPerTab`, `openFormPerTab`; `masterFilterDefs` dihapus) |
| 4 | Kolom aksi tidak mepet pinggir: padding kanan diperbesar | thClass `text-right pr-6` + td `pl-4 pr-6` di V_MasterKinerja/V_Realisasi/V_SkpBulanan |
| 5 | Tombol mini kartu kanban & tombol teks tabel dinaikkan satu step (text-[10px]→[11px], px-2→2.5/3) | V_RencanaKanban, V_Realisasi, V_SkpBulanan |
Kandidat gerbong UPDATE CDN FRONTEND (berikutnya, sebelum backend): dukungan span/lebar per-filter di `<app-filter-bar>` + standarisasi `.btn-icon`/`.btn-lg` masuk app-common.css agar app lain ikut rapi.

### Keseragaman struktur antar-app (keputusan pemilik 2026-09-18)
Pemilik: "pola beda = sulit telusuri masalah" → SILAHAR menyamai struktur
si-kompetensi dengan 2 file baru (refactor murni pemindahan, nol perubahan logika):
- **J_Helpers.html** (72 brs): helper murni (lookup master, peta badge kit, guard
  transisi, matcher search) dipindah dari J_Kinerja; digabung ke mixin di J_App
  (`window.SilaharHelpers.methods`) — posisi include setelah J_State (pola kompet).
- **V_Modals.html** (393 brs): 7 modal form dipusatkan (rencana kanban, rencana
  kalender, realisasi 2xl, detail SKP, RHK + app-pegawai-picker, jenis, satuan);
  include PERTAMA sebelum view (pola kompet). View jadi ramping: Kanban 146→98,
  Kalender 131→82, Realisasi 182→93, SKP 147→87, Master 274→154.
Alasan sah perbedaan lama: struktur JS SILAHAR diwarisi pola v1 si-platform (G14)
sebelum kompet v5/v6 membuat J_Helpers/V_Modals (V_Modals kompet lahir v6.0,
2026-09-15); starter-kit belum punya keduanya → kandidat update cetak biru.

### Konvensi baru (hasil ulasan V_Profil/V_Pengaturan vs kompet, 2026-09-18)
- **min-w mobile**: setiap kolom penting `app-crud-table` wajib `thClass min-w-[...]`
  agar scroll horizontal mulus di HP (praktik kompet v5.3.0). DITERAPKAN di
  V_Realisasi, V_SkpBulanan, V_MasterKinerja (3 tab).
- **Tombol fitur-belum-ada**: `disabled` + `title` informatif (guard
  `typeof fn === 'function'` seperti tombol cetak PDF kompet) — konvensi tulis,
  belum ada kasus aktif di SILAHAR.
- **Opsi waktu dinamis**: pemilih tahun/bulan SELALU computed (kini ±N), tidak
  pernah hardcode (pelajaran profileYearOptions kompet).
- Keputusan pemilik: **V_Profil = halaman bisnis "profil kinerja"**, bukan
  sekadar identitas → rancangan di docs/09_PROFIL_KINERJA.md (G19a draft).
- Gerbong bersih-bersih kompet (antre v2.3.0, TAMBAHAN): fallback non-admin
  V_Pengaturan → `<app-empty-state>` kit (pola lahar); badge `status="netral"`
  di V_Profil → `''` (netral bukan status di peta kit, jatuh ke default).

### Backlog polesan (dari review owner 2026-09-18 malam)
- Modal RHK: kolom "RHK Atasan (opsional)" masih input id mentah → kandidat
 升级为 select/search dari rhkList (sesuai pola app-pegawai-picker).
