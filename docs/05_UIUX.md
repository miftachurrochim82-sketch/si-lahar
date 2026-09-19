# 05 — UI/UX [TO-BE v2: SILAHAR e-Kinerja Harian — 2026-09-19]

> Shell & komponen kit dipertahankan (G15): `<app-login>`/`<app-sidebar>`/`<app-header>`,
> `<app-crud-table>`, `<app-filter-bar>`, toast, dark mode. Halaman bisnis = view `V_*`
> (pola si-kompetensi). Modal dipusatkan di `V_Modals.html`.
>
> **Riwayat revisi**:
> - 2026-09-18 — UIUX v2 initial (Gate 0).
> - 2026-09-18 (malam) — G18c-2: review owner, konsolidasi file, kit alignment.
> - **2026-09-19 — G18d**: konvergensi frontend v1→v2 (cleanup file orphan, dead code);
>   bump CDN `@v2.8.1`.

## Peta halaman (menu sidebar v2 final)

Menu sidebar = **9 item** (6 Kinerja + 1 Master + 1 Pribadi + 1 Sistem).

| Grup | Menu | View | Isi utama |
|---|---|---|---|
| **Kinerja** | Dashboard Kinerja | `V_Dashboard.html` | kartu diri (`<app-stat-card>` ×4): capaian bulan, streak, RHK aktif, menunggu verifikasi; chart tren 30 hari (`<app-chart-bar bare>`) + distribusi per RHK (`<app-chart-doughnut bare>`); footer info aplikasi; **papan tim admin** (tabel custom) |
| **Kinerja** | Rencana Kanban | **`V_Rencana.html`** mode `rencana_kanban` | papan 5 kolom status (direncanakan/dikerjakan/selesai/diverifikasi/batal); kartu: tanggal, RHK badge, jenis tugas badge, prioritas; pindah status via tombol kartu; "+ Rencana" |
| **Kinerja** | Rencana Kalender | **`V_Rencana.html`** mode `rencana_kalender` | grid 7 kolom bulan berjalan; sel = chip rencana (fix T39: min-height 7rem, chip pad 3px 6px); klik sel buka Kanban terfilter tanggal |
| **Kinerja** | Realisasi Harian | `V_Realisasi.html` | `<app-filter-bar>` (tanggal/pegawai/rhk/status) + `<app-crud-table>` + modal form (RHK picker, volume+satuan, jam, repeater bukti) + badge pra-RHK untuk legacy |
| **Kinerja** | SKP Bulanan | `V_SkpBulanan.html` | filter periode + generate (admin) + `<app-crud-table>` capaian + modal detail per RHK + export Excel/PDF |
| **Kinerja** | Antrian Verifikasi | `V_Verifikasi.html` (admin-only) | kartu antrian + aksi setujui/revisi + catatan; badge jumlah di header |
| **Master** | Master | **`V_Master.html`** | 4 tab segmented: **Laporan** (v1 LAPORAN_HARIAN), **RHK / SKP**, **Jenis Tugas**, **Satuan**; filter bar (search + tahun + status); `<app-crud-table>` per tab; CTA "X Baru" sesuai tab aktif |
| **Pribadi** | Profil Saya | `V_Profil.html` | **Paspor Kinerja ASN** (G19b): hero identitas + speedometer capaian + sub-tab (Transkrip Realisasi / SKP Bulanan / RHK Aktif / Kontak); tab Kontak = `<app-profile>` kit |
| **Sistem** | Pengaturan | `V_Pengaturan.html` | wrapper modul kit `<app-settings>` (self-contained, admin-only) |

> **CATATAN PENTING**:
> - **Kanban & Kalender = SATU file `V_Rencana.html`** dengan dua mode (dibedakan `currentPage`). Konsolidasi G18c-2 (2026-09-19) — dulu dua file terpisah (`V_RencanaKanban.html` + `V_RencanaKalender.html`).
> - **Master = SATU file `V_Master.html`** (4 tab). Konsolidasi G18c-2 — dulu tiga file (`V_MasterData.html` v1 + `V_MasterKinerja.html` v2).
> - **Tab Pegawai / Jabatan / Unit Kerja DIHAPUS** dari V_Master (keputusan owner 2026-09-19) — referensi SIMPEG read-only, cukup diakses via picker & lookup. Menghemat ruang & menyederhanakan halaman.
> - **Menu "Tentang Aplikasi" DIHAPUS** (G18c-2, 2026-09-18). Info aplikasi dilebur ke footer `V_Dashboard.html`. File `V_Tentang.html` disimpan sebagai arsip (banner DEPRECATED), tidak di-include.
> - **`A0_Style.html` DIHAPUS** (G18c-2). Isinya (kanban/kalender/mini-progress) dipindah **inline** ke `<style>` `Index.html`.

## Modal terpusat di `V_Modals.html` (7 modal)
1. Form Rencana (dipakai kanban & kalender — satu modal, `showRencanaForm`)
2. Form Realisasi (2xl) + repeater bukti
3. Detail SKP per RHK (`showRekapDetail`)
4. **Form Laporan Harian v1** (dipindah dari `V_MasterData.html` inline)
5. Form RHK + `<app-pegawai-picker>`
6. Form Jenis Tugas
7. Form Satuan

## Shell & arsitektur file

`Index.html` = **shell tipis**:
- Pin CDN `@v2.8.1` (4 aset: `app-common.min.css`, `app-components.min.js`, `app-modules.min.js`, `app-core.min.js`).
- Identitas tema `:root` (`--primary-*`).
- Blok `<style>` kustom **inline** (kanban/kalender/mini-progress — eks-A0_Style).
- Include SATU tingkat: `V_Modals` → `V_Dashboard` → `V_Rencana` → `V_Realisasi` → `V_SkpBulanan` → `V_Verifikasi` → `V_Master` → `V_Profil` → `V_Pengaturan` + 7 file `J_*`.
- Vue 3.5.42 pinned.

## Aturan desain (konsisten lintas app)

- **Kanban**: grid CSS kustom (custom UI diizinkan); kartu kompak; pindah status via tombol menu kartu (**drag = fase lanjut, DIKUNCI**).
- **Kalender**: grid 7 kolom bulan berjalan; sel berisi chip rencana; klik sel → buka Kanban filter tanggal. Fix T39 (2026-09-19): `.cal-cell` `min-height: 7rem` (dari 5.5rem); `.cal-chip` `padding: 3px 6px` (dari 2px 5px); `font-size: 10px` (dari 9px) — mengatasi chip overflow.
- **Form realisasi**: RHK picker (select grup nama_rhk + indikator); volume+satuan satu baris; repeater bukti = baris dinamis (jenis + url + keterangan).
- **Badge**: status rencana 5 warna (`<app-badge>`); status verifikasi 3 warna; pra-RHK = abu.
- **Toast & confirm()** bawaan dipertahankan; **debounce search 400ms** dipertahankan.
- **Dark mode**: semua view wajib varian dark (token kit + inline style Index).
- **min-w mobile**: kolom penting `<app-crud-table>` wajib `thClass min-w-[...]` agar scroll horizontal mulus di HP.
- **Opsi waktu dinamis**: pemilih tahun/bulan SELALU computed (kini ±N), **tidak pernah hardcode**.

## Komponen kit yang dipakai (v2.8.1)

| Komponen | Dipakai di |
|---|---|
| `<app-login>` | `Index.html` (login SSO gateway) |
| `<app-sidebar>` / `<app-header>` | `Index.html` (shell) |
| `<app-stat-card>` | `V_Dashboard.html` (×4) |
| `<app-chart-bar>` / `<app-chart-doughnut>` (`bare`) | `V_Dashboard.html` |
| `<app-crud-table>` | `V_Master.html`, `V_Realisasi.html`, `V_SkpBulanan.html`, `V_Profil.html` |
| `<app-filter-bar>` | `V_Rencana.html` (mode kanban), `V_Realisasi.html` |
| `<app-empty-state>` | `V_Verifikasi.html`, `V_Pengaturan.html` (fallback non-admin), `V_Profil.html` |
| `<app-skeleton>` | `V_Dashboard.html`, `V_Rencana.html`, `V_Verifikasi.html`, `V_Master.html` |
| `<app-modal>` | `V_Modals.html` (×7 modal) |
| `<app-pegawai-picker>` | `V_Modals.html` (form RHK) |
| `<app-profile>` (modul kit) | `V_Profil.html` tab Kontak |
| `<app-settings>` (modul kit) | `V_Pengaturan.html` |
| Direktif `v-can` | (tersedia, adopsi opsional) |

**Kelas CSS kit yang dipakai**: `.card`, `.btn*`, `.input`, `.form-label`, `.badge*`, `.btn-icon`, `.btn-icon-danger`, `.btn-lg`, `.btn-aksi` — semua dari `app-common.css` v2.8.1.

## Custom UI yang dipertahankan (diizinkan)

Papan kanban, grid kalender, banner salam Dashboard, kartu antrian verifikasi, papan tim admin (tabel non-paginasi), footer info aplikasi di Dashboard.

## Praktik baik yang diadopsi (dari si-kompetensi)

| # | Adopsi | Item kode |
|---|---|---|
| 1 | Tab segmented lebar (ikon + label + jumlah), enak di-tap HP | `V_Master.html` (grid `sm:grid-cols-3 lg:grid-cols-4`) |
| 2 | Search + filter dalam halaman master | `V_Master.html` filter bar custom + computed `rhkFiltered`/`jenisFiltered`/`satuanFiltered` |
| 3 | Tombol refresh master | `V_Master.html` `btn-secondary` + `refreshMasters()` |
| 4 | Badge status aktif/nonaktif + indikator read-only viewer | tetap |
| 5 | Polesan tata letak (tombol 32px, CTA besar, filter rapi, kolom aksi tidak mepet) | `.btn-icon`/`.btn-icon-danger`/`.btn-lg` di kit v2.8.0 + thClass `text-right pr-6` |
| 6 | Modal terpusat di `V_Modals.html` | sudah (pola kompet) |
| 7 | Helper murni di `J_Helpers.html` | sudah (pola kompet) |

## Anomali data yang sudah dibersihkan (Pengaturan sheet KONFIGURASI)

Ditemukan 2026-09-18, dibersihkan via `rapikanKonfigurasiSilaharLIVE()`:
1. ~~Sisa uji `temp_val` ×3~~ — **DIHAPUS** (test leftover).
2. ~~Baris tergeser: key `58` ×2 & key token~~ — **DIHAPUS** (indikasi tulis tergeser).
3. ~~Key uzur 0 referensi: `jenis_kegiatan_list`/`jenis_kompetensi_list`/`jenis_pengawasan_list`/`instansi_nama`~~ — **DIHAPUS**.
4. Nilai lama `app_name`/`app_version`/`instansi` — **DI-UPDATE** ke `SILAHAR`/`2.1.0`/`Satpol PP & Pemadam Kebakaran Kab. Trenggalek`.
5. `service_token` & `bup` — status **MANUAL** (keputusan pemilik, review berkala).

## Backlog polesan (dari review owner)

- Modal RHK: kolom "RHK Atasan (opsional)" masih input id mentah → kandidat upgrade ke select/search dari `rhkList` (pola `<app-pegawai-picker>`).
- Kandidat gerbong **CDN v2.8.x berikutnya** (sudah selesai di v2.8.0): dukungan `span` per filter di `<app-filter-bar>` ✅ + standarisasi `.btn-icon`/`.btn-icon-danger`/`.btn-lg` masuk `app-common.css` ✅.
