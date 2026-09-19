# 08 — Gap List (as-is → to-be) [SILAHAR]

Urutan = prioritas risiko. Kolom "Gerbang" = tahap eksekusi setelah disetujui.
Belum ada yang dieksekusi — menunggu review pemilik aplikasi.

| # | Gap | Risiko | Usulan perbaikan | Gerbang |
|---|---|---|---|---|
| G1 | **Vue unpinned** `unpkg.com/vue@3` di Index.html | 🔴 tinggi — rilis Vue baru bisa merusak app tanpa perubahan kode | ganti ke pola ekosistem: `https://cdn.jsdelivr.net/npm/vue@3.5.42/dist/vue.global.prod.js` (pin sama si-platform) | 1 baris, paste ke GAS, tes login+1 halaman |
| G2 | Ikon FA tak render: `fa-shield-cat` (A4), `fa-clock-history` (A4), `fa-shield-check` (A7) | 🟡 kosmetik | ganti: `fa-shield-halved`, `fa-clock-rotate-left`, `fa-circle-check` | 3 baris |
| G3 | `<img>` A1_Login tidak self-closing (`>` bukan `/>`) | 🟡 kosmetik + merah di contract_check | tambah `/` | 1 baris |
| G4 | A6 dot warna `by_jenis` hanya 3/5 jenis | 🟡 kosmetik | tambah pemetaan lapangan→teal, administrasi→orange (samakan badge A4/A5/A8) | 2 baris |
| G5 | Posisi toast bentrok A0 (top-right) vs inline Index (bottom-right) | 🟢 rendah | pilih satu ❓(disarankan bottom-right punya Index — jauh dari header) → hapus deklarasi yang kalah | 1 blok CSS |
| G6 | `ticketValid` hardcoded (kedaluwarsa) di 99_Test | 🟢 hygiene | kosongkan `''` (pesan instruksi sudah ada) | 1 baris |
| G7 | `v-if`+`v-for` satu elemen (A5/A8/A9 skeleton & rows) | 🟢 anti-pattern Vue3 (jalan) | bungkus `<template v-if>` / `<template v-else>` ❓opsional — perubahan struktur, risiko regresi kecil tapi nyata | tunda / batch khusus |
| G8 | Trio warisan: KONFIGURASI ✅aktif, tapi AUDIT_LOGS & MAIN_DATA tak jelas pemakainya | 🟡 arsitektur | ❓putuskan: hapus dari LOCAL_SHEET_NAMES+headers (sheet fisik dibiarkan), atau dokumentasikan pemiliknya | diskusi to-be |
| G9 | Dead schema: REKAP_BULANAN & KATEGORI_KEGIATAN (+ kolom kategori_id/lokasi di LAPORAN_HARIAN tak dipakai form) | 🟡 arsitektur | ❓putuskan: fitur masa depan (dokumenkan di BRD to-be) atau pangkas skema | diskusi to-be |
| G10 | Folder IDs (ROOT/BACKUP/EVIDENCE) dideklarir, tak dipakai; file_url diisi manual | 🟢 arsitektur | ❓upload bukti ke Drive = fitur masa depan? kalau tidak, hapus deklarasi | diskusi to-be |
| G11 | SILAHAR belum masuk APPS list `contract_check.py` & belum ada repo GitHub | 🟡 governance | tambah entri setelah G1–G6 beres + user buat repo `si-lahar` ❓ | Gate C5 |
| G13 | Frontend belum selaras CDN kit ekosistem (app-common.css + AppComponents) | 🟡 arsitektur | **Keputusan user 2026-09-17: Tahap A+B sekarang** — A: muat app-common.min.css (token; A0_Style tetap menang karena dimuat setelahnya) + app-components.min.js; B: migrasi 3 tabel referensi SIMPEG (Pegawai/Jabatan/Unit di A8) ke `<app-crud-table>`; TAHAP C (shell/AppCore.create) DITUNDA sampai ada pemicu | tempel Index+A8 → smoke browser |
| G14 | Logika Vue monolitik inline di Index.html (±920 baris satu blok) — sulit dirawat, tidak ikut pola ekosistem | 🟡 arsitektur | **Permintaan user 2026-09-17: "JS dibuat jadi beberapa file include"** — pecah mengikuti pola si-kompetensi: J_State (data+computed) / J_Helpers / J_Api / J_Actions / J_Export / J_App (bootstrap+mounted). Pindah murni TANPA perubahan logika; digabung via mixins di J_App | tempel Index + 6 file J_* baru → new version → smoke penuh |
| G15 | Shell & helper masih buatan sendiri (A1_Login/A2_Sidebar/A3_Header + ±25 data/computed/method duplikat AppCore) — file include banyak (18 html), CDN kit belum maksimal | 🟡 arsitektur | **Permintaan user 2026-09-18: "update agar seperti si-kompetensi"** — Tahap C: shell Index = komponen kit; bootstrap = AppCore.create; A4–A10 → V_*; J_Helpers dihapus; hook onNavigate/initApp/onDarkToggle; hasil 14 html | tempel paket gabungan (lihat panduan) → new version → smoke penuh |
| G16 | Legenda donut "Jenis Kegiatan" menampilkan timestamp ISO — 4 baris warisan di sheet LAPORAN_HARIAN punya kolom jenis_kegiatan di luar whitelist (korupsi data era pra-fix); agregasi & list memakai nilai mentah; save tanpa validasi jenis | 🔴 data+backend | **Ditemukan dari screenshot user 2026-09-18** — normalizer `normalizeJenis_` (whitelist rutin/insidental/khusus/lapangan/administrasi, selain itu → 'lainnya') dipakai di apiDashboard_, getAnalytics_, getLaporanList_, getRiwayatList_; save menormalisasi (non-blocking, filosofi sistem tetap hidup); tool `auditJenisKegiatan()` + `perbaikiJenisKegiatan()` di 99_Test utk perbaikan permanen sheet | tempel 02_AppLogic.gs + 99_Test.gs → new version → jalankan audit → rapikan sel sheet |
| G17 | Sheet fisik warisan (KATEGORI_KEGIATAN, REKAP_BULANAN, AUDIT_LOGS, MAIN_DATA, copy referensi lokal?) masih ada di spreadsheet meski sudah dipangkas dari kode; belum ada tool rapi-rapi kolom (header drift/kolom ekstra/kolom hilang) | 🟡 perawatan | **Permintaan user 2026-09-18: "fungsi membersihkan sheet tidak digunakan + perbaiki kolom database"** — file baru 03_Maintenance.gs: auditStrukturDatabase() read-only; rapikanDatabase() dry-run default; eksekusi = backup Drive otomatis → hapus sheet TIDAK_TERPAKAI (pengaman ganda: kontrak aktif + ARSIP_/BACKUP_ + fallback referensi) → perbaiki kolom (huruf header, kolom kontrak hilang, kolom ekstra KOSONG; ekstra berisi data = keputusan manual) | tempel 03_Maintenance.gs → audit → kirim hasil → eksekusi terkonfirmasi |
| G18 | DB bisnis di bawah standar minimal terkoreksi (master bisnis 0 dari 3-5; tabel bisnis 1 dari >=3) + reposisi identitas: SILAHAR = e-Kinerja Harian ASN (rujukan BKN), BUKAN operasional kedinasan | 🟡 arsitektur+bisnis | **Koreksi+reposisi user 2026-09-18:** referensi otomatis tak masuk budget; menu e-Kinerja: master M1 MASTER_RHK_SKP, M2 MASTER_JENIS_TUGAS, M3 MASTER_SATUAN, M4 MASTER_PERILAKU (fase lanjut); tabel T2 RENCANA_HARIAN (kanban/kalender), T3 REKAP_BULANAN, T4 LAMPIRAN_BUKTI; kandidat operasional (lokasi/regu/armada/insiden) DIPINDAH ke backlog app terpisah | kunci paket oleh pemilik -> amendemen BRD..TESTCASE -> build per gate |
| G12 | **Bug geser tanggal -1 hari** (ditemukan dari testLaporanGuards 2026-09-17): hook memakai `toISOString()` (UTC) pada Date hasil parse lokal (WIB) → semua laporan tersimpan dengan tanggal mundur sehari; filter riwayat/dashboard/analisa ikut meleset | 🔴 **data produksi** | helper `tanggalKey10_` (format lokal via `Utilities.formatDate`) dipakai di hook + 6 titik baca/sortir/agregasi di 02_AppLogic.gs; simulasi node TZ=Asia/Jakarta 8/8 ✅ | tempel 02 → ulangi guards |

## ❓ Daftar pertanyaan untuk pemilik aplikasi (jawab singkat saja)
1. **G5** toast: bawah-kanan (Index) atau atas-kanan (A0)?
2. **G7** mau dirapikan sekarang atau tunda?
3. **G8** AUDIT_LOGS/MAIN_DATA: hapus dari kode, biarkan, atau ada rencana?
4. **G9** REKAP_BULANAN/KATEGORI_KEGIATAN (+kolom kategori_id, lokasi): fitur masa depan atau pangkas?
5. **G10** upload bukti ke Drive: dibutuhkan?
6. **G11** buat repo GitHub `si-lahar` (pola 4 repo lain)?
7. **01_BRD** ukuran sukses & wali data?
8. **02_PRD** jenis_kegiatan: 5 opsi hardcoded cukup, atau mau diambil dari KONFIGURASI/KATEGORI_KEGIATAN?

## Status eksekusi (2026-09-17 — semua usulan disetujui pemilik)
| Gap | Status workspace | Menunggu |
|---|---|---|
| G1 Vue pin 3.5.42 jsdelivr | ✅ Index.html | tempel GAS |
| G2 3 ikon FA | ✅ A4, A7 | tempel GAS |
| G3 img self-closing | ✅ A1_Login | tempel GAS |
| G4 dot A6 5 jenis | ✅ A6 | tempel GAS |
| G5 toast = bottom-right | ✅ A0 disamakan | tempel GAS |
| G6 tiket dikosongkan | ✅ 99_Test | tempel GAS |
| G7 v-if+v-for | ⏸ DITUNDA (keputusan #2) | — |
| G8 AUDIT_LOGS+MAIN_DATA | ✅ dipangkas dari 01_Config | tempel GAS |
| G9 REKAP_BULANAN+KATEGORI_KEGIATAN | ✅ dipangkas dari 01_Config; fitur masa depan dicatat di BRD | tempel GAS |
| G10 folder IDs | ✅ dihapus dari 01_Config | tempel GAS |
| G13 Tahap A+B kit CDN | ✅ workspace SELESAI + contract_check hijau (pin v2.7.5 ✅ terdeteksi; 2 blok JS inline valid) | tempel Index.html + A8_MasterData.html → new version → smoke browser |
| G14 modularisasi JS (J_*) | ✅ workspace SELESAI — 53 method + 10 computed terverifikasi (simulasi merge vm: tanpa tabrakan nama), node --check combined OK, contract_check exit 0 | tempel Index.html + A8_MasterData.html + BUAT 6 file J_* → new version → smoke penuh |
| G15 Tahap C shell kit + AppCore (SUPERSEDE G13/G14 utk tempel — 1 paket) | ✅ workspace SELESAI — simulasi merge vm: 48 data/9 computed/35 method, 0 tabrakan dgn AppCore; node --check combined OK; page id menu↔views 7/7; contract_check exit 0 (14 html) | tempel Index + 7 V_* + 5 J_* (BARU semua di GAS), HAPUS A1–A10 → new version → smoke penuh |
| G16 normalisasi jenis_kegiatan | ✅ workspace SELESAI — node --check 02 & 99 OK; agregasi/list/save ternormalisasi; tool audit+perbaiki tersedia | tempel 2 file gs → new version → audit & rapikan 4 sel |
| G17 toolkit perawatan DB (03_Maintenance.gs) | ✅ **TUTUP di GAS (2026-09-18 08.35):** DB = 4 sheet hidup (LAPORAN_HARIAN, KONFIGURASI, ZZ_TEST_CRUD, AUDIT_LOGS auto-create CoreLib); runLibraryTests 38/0/1 pasca-bersih; toolkit diselaraskan dgn kontrak CoreLib (kolom audit + proteksi AUDIT_LOGS) | sisa: smoke app |
| G18 DB standar minimal + reposisi e-Kinerja | ✅ G18a TUTUP; ✅ G18b terpasang (38/0/1); 🟢 **SPLIT per-domain SELESAI di workspace (Opsi B):** 04_KinerjaApi -> 04_KinerjaUtils + 05..09 Api (41/41 smoke pass); standar struktur ditulis ke starter-kit 00_ALUR; G18c frontend 7 view + J_Kinerja siap | user tempel backend split + 12 file frontend + deploy -> G18d tests |
| G12 bug tanggal -1 hari | ✅ 02_AppLogic.gs — **DITUTUP**: testLaporanGuards 13/13 di GAS (2026-09-17 22.02) | selesai |
| G11a contract_check | ✅ si-lahar masuk APPS (5 app), exit 0, 2 WARN terdokumentasi | selesai |
| G11b repo GitHub si-lahar | ⏳ menunggu user buat repo | unggah 16 file src (+docs opsional) |
