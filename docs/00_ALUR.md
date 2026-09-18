# 00 — Alur Dokumen-Dulu (Gate 0 → Gate 1)

**Prinsip:** tidak ada kode sebelum dokumen disepakati. Dokumen = bahan belajar
(apa saja sheet-nya, apa saja menu/fiturnya) sekaligus kontrak pembangunan.

```text
GATE 0 — DOKUMEN (manusia + AI, santai)
  01_BRD  → mengapa app ini ada, untuk siapa, sukses = apa
  02_PRD  → daftar menu & halaman (ini jadi menuForKit nanti)
  03_FRD  → daftar aksi per halaman (ini jadi case di handleApi)
  04_DATABASE → daftar sheet & kolom (ini jadi SHEET_HEADERS; belajar: mana
                milik app, mana titipan SIMPEG, mana otomatis CoreLib)
  05_UIUX → pilihan komponen kit per halaman
  06_API_FLOW → alur masuk (SSO) + daftar aksi + siapa delegasi ke CoreLib
  07_TESTCASE → checklist uji per aksi + gerbang contract-check
  ↓ review & sepakati (gate!)
GATE 1 — BANGUN (13 langkah README, fase 2 dst.)
  dokumen 04 → 01_Config.gs; dokumen 02 → menu & V_*.html;
  dokumen 03 → 03_AppLogic.gs; dokumen 07 → suite test app
```

**Aturan main:** satu baris di dokumen = satu barang di kode. Barang yang tidak
ada di dokumen tidak boleh muncul di kode tanpa amendemen dokumen dulu.

## Pertanyaan penuntun & checklist anti-tebak (pelajaran reposisi SILAHAR, 2026-09-18)
Sebelum menulis dokumen/kode APA PUN, pemilik + AI coder wajib menjawab tertulis
(jawaban masuk BRD/PRD; bila belum terjawab = baris ❓, JANGAN ditebak):
1. **Aktor:** siapa pelapor, siapa verifier, siapa pengelola master? (role dari platform)
2. **Kontrak kinerja/rencana:** objek "janji" per periode apa (SKP/RHK/target/kontrak)? Bila tiada → app murni transaksional, katakan begitu.
3. **Transaksi harian:** apa yang dicatat tiap hari, terikat ke kontrak yang mana, bukti dukungnya apa?
4. **Agregat periodik:** rekap bulanan/triwulan apa, siapa memicu, siapa memakai?
5. **Master milik app:** kamus apa yang app punyai sendiri (standar minimal 3–5)? Mana yang dipinjam (referensi otomatis, tidak masuk budget)?
6. **Tabel bisnis:** minimal 3; mana yang infra library/app (tidak dihitung)?
7. **Siklus status:** status transaksi apa saja dan siapa menggerakkan tiap transisi (verifikasi/revisi)?
8. **View ekstensi:** kanban/kalender/matriks = VIEW UI di atas tabel yang ada, BUKAN sheet baru.
9. **Batas:** apa yang BUKAN urusan app ini (app terpisah/fase lanjut)?
Aturan AI coder: jawaban belum ada → tulis ❓ + ajukan 2–3 opsi ke pemilik; memilih sendiri =
pelanggaran Gate 0. Satu baris dokumen = satu item kode; build tidak mendahului dokumen.
