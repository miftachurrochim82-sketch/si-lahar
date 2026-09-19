# 09 — RANCANGAN PROFIL KINERJA (G19a, dokumen-dulu)

Status: **DISETUJUI pemilik & DIIMPLEMENTASIKAN (G19b) 2026-09-18** — menunggu
deploy bersama batch G18c-2 (V_Profil.html tulis ulang; J_Kinerja +state/computed/
methods paspor; J_App onNavigate 'profil'). Deviasi kecil thd draft: nama loader
`loadPaspor()` (bukan loadProfil — menghindari bentrok loader identitas lama di
J_Api) dan state berprefiks `paspor*` utk list/dashboard (profilTab/profilPeriode
tetap sesuai draft); flag loading = `pasporLoading` (profilLoading lama dipakai
loader identitas).
Pemicu: keputusan pemilik — "profil itu tujuannya bukan hanya menampilkan
identitas pegawai, tapi profil kinerja pegawai" (rujukan praktik: Paspor &
Portofolio Kompetensi ASN si-kompetensi v5.3.0).

## 1. Tujuan
V_Profil SILAHAR naik kelas dari halaman UTILITAS (wrapper `<app-profile>`:
identitas + kontak) menjadi halaman BISNIS: **Paspor Kinerja ASN** — potret
kinerja pribadi pegawai (capaian, streak, predikat, transkrip realisasi,
riwayat SKP Bulanan, RHK aktif), dengan edit kontak tetap tersedia sebagai
salah satu tab.

## 2. Prinsip
- P1 NOL perubahan backend di v1 — semua data dari API yang sudah hidup.
- P2 Reuse state root (mixin) — loader baru hanya menambah, tidak mengubah.
- P3 Pola seragam antar-app: struktur meniru Paspor kompet (hero header,
  baris kartu, sub-tab ber-count), memakai kit (`app-crud-table`, `app-badge`,
  `app-empty-state`, `app-skeleton`) dan konvensi 05_UIUX (min-w mobile,
  tombol-fitur-belum-ada disabled+title).
- P4 Gate 0: satu baris dokumen = satu item kode; implementasi = G19b,
  setelah batch deploy G18c-2 terkonfirmasi hidup.

## 3. Kontrak data (semua SUDAH ADA di gateway)
| Kebutuhan UI | Action | Catatan scope |
|---|---|---|
| Kartu capaian bulan, predikat kandidat, streak, tren | `dashboard_kinerja` (09_DashboardKinerjaApi) | SELALU diri-sendiri (myPeg dari actor); terima `data.periode` (YYYY-MM) |
| Transkrip realisasi (semua status, badge verifikasi) | `get_realisasi_list` (07) | viewer otomatis diri; admin bisa `filters.pegawai_id` |
| Riwayat SKP Bulanan (capaian/predikat/status per periode) | `get_rekap_list` (08) | sama pola scope-nya |
| RHK aktif tahun berjalan | `get_rhk_list` (06) | sama pola scope-nya |
| Identitas + edit kontak | `get_my_profile` / `save_my_profile` | sudah dipakai modul `<app-profile>` kit |

KONSEKUENSI PENTING: karena `dashboard_kinerja` tidak bisa di-scope ke
pegawai lain, **switcher "Simulasi Pegawai" untuk admin TIDAK masuk v1**.
v2 (kandidat, butuh backend aditif): `dashboard_kinerja` menerima
`pegawai_id` bila actor admin → masuk ANTRIAN backend v2.3.0, bukan sekarang.

## 4. Struktur halaman (satu baris = satu item kode)
1. V_Profil.html dirombak: `<section v-if="currentPage === 'profil'">` berisi:
2. Hero header: ikon + judul "Paspor Kinerja ASN" + subtitle + pemilih bulan
   (computed `profilPeriodeOptions` = 12 bulan terakhir, dinamis — JANGAN
   hardcode tahun/bulan; pelajaran profileYearOptions kompet v5.3.0).
3. Baris 1 (grid lg:grid-cols-12):
   3a. col-span-7 Kartu Identitas: avatar inisial, nama (AppCore `namaPegawai`),
       NIP, jabatan/unit, badge status pegawai — sumber `currentUser`/pegawai
       dari state yang sudah dimuat shell.
   3b. col-span-5 Speedometer Bulan Terpilih: capaian %, kandidat predikat
       (badge `badgeVerif_`/peta predikat), total rencana vs realisasi,
       menunggu verifikasi, streak hari — dari `dashboard_kinerja`
       (`profilDashboard`), plus bar progres.
4. Baris 2: kartu sub-tab ber-count (pola tab Master Kinerja):
   4a. Tab "Transkrip Realisasi" — `app-crud-table` kolom: Tanggal, Uraian
       Hasil, RHK (`namaRhk_`), Jenis, Volume, Verifikasi (`badgeVerif_`),
       min-w mobile; kosong → `app-empty-state`.
   4b. Tab "SKP Bulanan" — kolom: Periode, Rencana, Realisasi, Diverifikasi,
       Capaian (bar), Predikat, Status.
   4c. Tab "RHK Aktif" — kolom: Nama RHK, Indikator, Target, Satuan, Status.
   4d. Tab "Kontak & Identitas" — `<app-profile>` kit (utilitas, tetap ada).
5. J_Kinerja.html: state baru (`profilTab`, `profilPeriode`, `profilDashboard`,
   `profilRealisasi`, `profilRekap`, `profilRhk`, `profilLoading`) + loader
   `loadProfil()` (paralel: dashboard_kinerja + 3 list, limit wajar 50/20/20)
   + computed `profilPeriodeOptions` + method `setProfilPeriode(p)`.
6. Panggil `loadProfil()` saat navigasi ke 'profil' (pola `openPage`/watch
   currentPage yang sudah ada) dan tombol muat-ulang di hero.
7. Tombol "Cetak Paspor (PDF)": v1 TIDAK ADA (belum ada backend export paspor);
   bila nanti ditambahkan, pakai konvensi disabled+title (05_UIUX).

## 5. Di luar scope v1
- Simulasi Pegawai untuk admin (butuh backend aditif — antre v2.3.0).
- Cetak/ekspor PDF paspor.
- Data kompetensi/diklat (domain kompet, bukan lahar).

## 6. Uji terima (ringkas; detail menyusul ke 07_TESTCASE saat G19b)
- TC-P1 viewer buka Profil → kartu = data dirinya; transkrip = realisasi dirinya.
- TC-P2 ganti bulan → speedometer + kartu berubah sesuai periode.
- TC-P3 pegawai tanpa data → empty-state kit di tiap tab, tanpa error konsol.
- TC-P4 admin buka Profil → melihat paspor DIRINYA sendiri (bukan tim).
- TC-P5 tab Kontak → app-profile load + simpan seperti sebelumnya.
- TC-P6 HP (lebar sempit) → tabel scroll horizontal mulus (min-w).

## 7. Berkas terdampak saat G19b
V_Profil.html (tulis ulang), J_Kinerja.html (state+loader+computed),
J_State.html (bila state dideklarasi di sana — cek pola saat eksekusi),
docs/07_TESTCASE.md (TC-P1..P6). Backend: TIDAK ADA.

## Adendum v1.1 (review owner 2026-09-18, 22.1x WIB)
Temuan screenshot: kartu identitas kosong ("Pegawai", NIP —), transkrip = 20 baris
(SELURUH pegawai), speedometer 0. Akar: payload token SSO tidak membawa
pegawai_id → scope server (dashboard_kinerja) dan scope klien lolos semua.
FIX v1.1 (frontend-only, J_Kinerja + V_Profil):
- computed `pasporPegawaiRef`: cocokkan email akun → referensi PEGAWAI SIMPEG
  (pegawaiList AppCore), case-insensitive.
- computed `pasporPegawaiId`: currentUser.pegawai_id || ref.pegawai_id/ref.id →
  dipakai scopeMe di loadPaspor (transkrip/SKP/RHK admin tersaring benar).
- computed `pasporIdentitas`: rantai fallback myProfile → currentUser → ref
  (+resolve jabatan/unit dari jabatanList/unitList bila ref hanya bawa *_id).
- computed `pasporTautanServer` + notice amber di speedometer bila false.
KETERBATASAN tersisa (antre backend v2.3.0, KANDIDAT): resolve actor.pegawai_id
dari email di server (pola getMyProfileEnriched_) agar dashboard_kinerja &
list API auto-scope untuk akun tanpa pegawai_id → speedometer ikut hidup.
Verifikasi: node --check OK; balance OK; smoke test rantai computed + scope = PASS.
