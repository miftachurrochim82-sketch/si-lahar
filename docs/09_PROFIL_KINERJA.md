# 09 — PROFIL KINERJA (Paspor Kinerja ASN)

Status: **LIVE PRODUKSI** (2026-09-19). Diimplementasikan di G19b, terverifikasi
via `TC-P1..TC-P7`. Menunggu deploy bersama batch G18d final.

> **Pemicu awal**: keputusan pemilik — *"profil itu tujuannya bukan hanya menampilkan
> identitas pegawai, tapi profil kinerja pegawai"* (rujukan praktik: Paspor &
> Portofolio Kompetensi ASN si-kompetensi v5.3.0).
>
> **Riwayat**:
> - 2026-09-18 — G19a: rancangan disetujui pemilik.
> - 2026-09-18 (malam) — G19b: implementasi (`V_Profil.html` tulis ulang + J_Kinerja + J_App).
> - 2026-09-18 (malam, v1.1) — review owner: fix scope admin tanpa pegawai_id.
> - **2026-09-19** — Live production + verifikasi TC-P1..TC-P7 (lihat `07_TESTCASE.md`).

## 1. Tujuan
`V_Profil` SILAHAR naik kelas dari halaman UTILITAS (wrapper `<app-profile>`:
identitas + kontak) menjadi halaman BISNIS: **Paspor Kinerja ASN** — potret
kinerja pribadi pegawai (capaian, streak, predikat, transkrip realisasi,
riwayat SKP Bulanan, RHK aktif), dengan edit kontak tetap tersedia sebagai
salah satu tab.

## 2. Prinsip
- **P1** NOL perubahan backend di v1 — semua data dari API yang sudah hidup.
- **P2** Reuse state root (mixin) — loader baru hanya menambah, tidak mengubah.
- **P3** Pola seragam antar-app: struktur meniru Paspor kompet (hero header,
  baris kartu, sub-tab ber-count), memakai kit (`<app-crud-table>`, `<app-badge>`,
  `<app-empty-state>`, `<app-skeleton>`) + konvensi 05_UIUX (min-w mobile,
  tombol-fitur-belum-ada `disabled`+`title`).
- **P4** Gate 0: satu baris dokumen = satu item kode; implementasi = G19b.

## 3. Kontrak data (semua SUDAH ADA di gateway)

| Kebutuhan UI | Action | Catatan scope |
|---|---|---|
| Kartu capaian bulan, predikat kandidat, streak, tren | `dashboard_kinerja` (`09_DashboardKinerjaApi`) | SELALU diri-sendiri (`myPeg` dari actor); terima `data.periode` (YYYY-MM) |
| Transkrip realisasi (semua status, badge verifikasi) | `get_realisasi_list` (`07`) | viewer otomatis diri; admin bisa `filters.pegawai_id` |
| Riwayat SKP Bulanan (capaian/predikat/status per periode) | `get_rekap_list` (`08`) | sama pola scope-nya |
| RHK aktif tahun berjalan | `get_rhk_list` (`06`) | sama pola scope-nya |
| Identitas + edit kontak | `get_my_profile` / `save_my_profile` | sudah dipakai modul `<app-profile>` kit |

> **KONSEKUENSI PENTING**: karena `dashboard_kinerja` tidak bisa di-scope ke
> pegawai lain, **switcher "Simulasi Pegawai" untuk admin TIDAK masuk v1**.
> v2 (kandidat, butuh backend aditif): `dashboard_kinerja` menerima `pegawai_id`
> bila actor admin → **masuk antrian backend v2.4.0**, bukan sekarang.

## 4. Struktur halaman (satu baris = satu item kode)

1. `V_Profil.html` dirombak: `<section v-if="currentPage === 'profil'">` berisi:
2. **Hero header**: ikon + judul "Paspor Kinerja ASN" + subtitle + pemilih bulan
   (computed `profilPeriodeOptions` = 12 bulan terakhir, dinamis — **JANGAN
   hardcode** tahun/bulan; pelajaran `profileYearOptions` kompet v5.3.0).
3. **Baris 1** (grid `lg:grid-cols-12`):
   - **3a. col-span-7 Kartu Identitas**: avatar inisial, nama (AppCore `namaPegawai`),
     NIP, jabatan/unit, badge status pegawai — sumber `currentUser`/pegawai
     dari state yang sudah dimuat shell.
   - **3b. col-span-5 Speedometer Bulan Terpilih**: capaian %, kandidat predikat
     (badge `badgeVerif_`/peta predikat), total rencana vs realisasi,
     menunggu verifikasi, streak hari — dari `dashboard_kinerja`
     (`pasporDashboard`), plus bar progres.
4. **Baris 2: kartu sub-tab ber-count** (pola tab Master Kinerja):
   - **4a. Tab "Transkrip Realisasi"** — `<app-crud-table>` kolom: Tanggal,
     Uraian Hasil, RHK (`namaRhk_`), Jenis, Volume, Verifikasi (`badgeVerif_`),
     min-w mobile; kosong → `<app-empty-state>`.
   - **4b. Tab "SKP Bulanan"** — kolom: Periode, Rencana, Realisasi, Diverifikasi,
     Capaian (bar), Predikat, Status.
   - **4c. Tab "RHK Aktif"** — kolom: Nama RHK, Indikator, Target, Satuan, Status.
   - **4d. Tab "Kontak & Identitas"** — `<app-profile>` kit (utilitas, tetap ada).
5. `J_Kinerja.html`: state baru (`profilTab`, `profilPeriode`, `pasporDashboard`,
   `pasporRealisasi`, `pasporRekap`, `pasporRhk`, `pasporLoading`) + loader
   `loadPaspor()` (paralel: `dashboard_kinerja` + 3 list, limit wajar 50/20/20)
   + computed `profilPeriodeOptions` + method `setProfilPeriode(p)`.
6. Panggil `loadPaspor()` saat navigasi ke `'profil'` (via `J_App.onNavigate`)
   + tombol muat-ulang di hero (`loadPaspor()`).
7. Tombol **"Cetak Paspor (PDF)"**: v1 TIDAK ADA (belum ada backend export
   paspor); bila nanti ditambahkan, pakai konvensi `disabled`+`title` (05_UIUX).

## 5. Di luar scope v1
- Simulasi Pegawai untuk admin (butuh backend aditif — antre **v2.4.0**).
- Cetak/ekspor PDF paspor.
- Data kompetensi/diklat (domain kompetensi, bukan lahar).

## 6. Uji terima (live 2026-09-19)
| ID | Skenario | Harapan | Status |
|---|---|---|---|
| **TC-P1** | Viewer buka menu Profil Saya | Kartu identitas + speedometer = data dirinya; transkrip = realisasi dirinya (server-scope) | ✅ PASS |
| **TC-P2** | Ganti bulan di pemilih periode | Speedometer + kartu capaian berubah; transkrip/SKP/RHK tetap (lintas periode) | ✅ PASS |
| **TC-P3** | Pegawai tanpa data | `<app-empty-state>` kit di tiap tab; tanpa error konsol | ✅ PASS |
| **TC-P4** | Admin buka Profil | Paspor **dirinya sendiri** (list difilter klien ke `pegawai_id` admin), bukan data tim; admin tanpa `pegawai_id` → tampil banner "tanpa tautan" + list dikosongkan (v1.1b) | ✅ PASS |
| **TC-P5** | Tab Kontak & Identitas | `<app-profile>` load + simpan seperti sebelumnya | ✅ PASS |
| **TC-P6** | Layar HP | Tabel transkrip/SKP/RHK scroll horizontal mulus (`min-w` kolom) | ✅ PASS |
| **TC-P7** | Tombol Segarkan | `loadPaspor` ulang; skeleton muncul saat loading awal | ✅ PASS |

## 7. Berkas terdampak (final)
- `V_Profil.html` — tulis ulang.
- `J_Kinerja.html` — state + loader + computed + method.
- `J_App.html` — `onNavigate('profil')` memanggil `loadPaspor()`.
- `docs/07_TESTCASE.md` — TC-P1..P7.
- **Backend**: TIDAK ADA perubahan.

## Adendum v1.1 (review owner 2026-09-18, ~22.1x WIB)

**Temuan screenshot**: kartu identitas kosong ("Pegawai", NIP —), transkrip = 20 baris
(SELURUH pegawai), speedometer 0.

**Akar**: payload token SSO tidak membawa `pegawai_id` → scope server (`dashboard_kinerja`)
dan scope klien lolos semua.

**FIX v1.1 (frontend-only, `J_Kinerja` + `V_Profil`)**:
- Computed `pasporPegawaiRef`: cocokkan email akun → referensi PEGAWAI SIMPEG
  (`pegawaiList` AppCore), case-insensitive.
- Computed `pasporPegawaiId`: `currentUser.pegawai_id || ref.pegawai_id/ref.id` →
  dipakai `scopeMe` di `loadPaspor` (transkrip/SKP/RHK admin tersaring benar).
- Computed `pasporIdentitas`: rantai fallback `myProfile` → `currentUser` → ref
  (+resolve jabatan/unit dari `jabatanList`/`unitList` bila ref hanya bawa `*_id`).
- Computed `pasporTautanServer` + notice amber di speedometer bila `false`.
- Flag `pasporTanpaTautan` (v1.1b): admin tanpa `pegawai_id` & tanpa match email SIMPEG
  → tabel dikosongkan + banner penjelasan (bukan tampil data seluruh pegawai).

**KETERBATASAN tersisa (antre backend v2.4.0, KANDIDAT)**: resolve `actor.pegawai_id`
dari email di server (pola `getMyProfileEnriched_`) agar `dashboard_kinerja` &
list API auto-scope untuk akun tanpa `pegawai_id` → speedometer ikut hidup.
Verifikasi: `node --check` OK; balance OK; smoke test rantai computed + scope = PASS.

## Adendum v1.2 (G18d, 2026-09-19)

Adopsi CoreLib v2.4.0 di backend **tidak mengubah** Paspor Kinerja — semua
data masih dari API yang sama. Yang berubah:
- **`tanggalKey10_`** (dipakai di transkrip & rekap) kini **sadar WIB** via
  `CoreLib.dateKey10()` — konsisten untuk user WIB sebelum 07:00.
- **`paginate_`** (dipakai di list transkrip/SKP/RHK) kini `CoreLib.paginate()`
  — meta identik, tidak ada perubahan UI.
- **`todayIso_()`** (dipakai untuk format tanggal di kartu) kini WIB.

App version bump: `2.0.0` → **`2.1.0`**.

## Verifikasi live 2026-09-19
- Editor GAS si-lahar: `runLibraryTests()` PASS 42/0/1 + `testAdopsiG18d()` 13/13 PASS.
- Browser: Paspor Kinerja tampil benar untuk akun dengan `pegawai_id` (via sesi
  SSO atau match email SIMPEG). Untuk admin tanpa tautan → banner "tanpa tautan"
  muncul jelas.
