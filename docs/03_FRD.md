# 03 — FRD [TO-BE v2: SILAHAR e-Kinerja Harian — 2026-09-18]

> AturanGate 0: **satu baris FR = satu item kode** (handler/fungsi/komponen/kolom).
> Build tidak boleh mendahului baris di dokumen ini.

## Master
- FR-01 CRUD RHK_SKP (admin): validasi pegawai_id ada di referensi SIMPEG, periode_tahun wajib, jenis_rhk ∈ {utama,tambahan}, satuan_id ∈ SATUAN aktif, target_tahunan numerik > 0.
- FR-02 CRUD JENIS_TUGAS (admin): kode unik; entri terpakai di rencana/realisasi → hanya boleh dinonaktifkan.
- FR-03 CRUD SATUAN (admin): kode unik; aturan pakai sama dengan FR-02.
- FR-04 Picker read-only RHK untuk viewer: hanya RHK aktif milik pegawai sesi.

## Rencana Harian
- FR-05 Simpan rencana (viewer milik sendiri; admin bebas): tanggal, rhk_id milik pegawai tsb, jenis_tugas_id, rencana_hasil, prioritas ∈ {biasa,penting,mendesak}.
- FR-06 Pindah status rencana: direncanakan→dikerjakan→selesai; batal dari direncanakan/dikerjakan; dilarang lompat mundur kecuali admin revisi; status diverifikasi hanya diisi alur P5.
- FR-07 Menu **Rencana Kanban**: list rencana kolom status; filter tanggal (default hari ini), pegawai (admin: semua; viewer: sendiri); pindah status via tombol kartu (drag = fase lanjut, DIKUNCI).
- FR-08 Menu **Rencana Kalender**: grid bulanan per pegawai filter; klik sel buka Kanban terfilter tanggal sel.
- FR-09 Hapus rencana: pemilik & status direncanakan; admin bebas kecuali terhubung realisasi.

## Realisasi Harian + Bukti
- FR-10 Simpan realisasi (viewer milik sendiri): rhk_id, jenis_tugas_id, uraian_hasil, volume numerik > 0 + satuan_id, jam_mulai/jam_selesai opsional, tanggal wajib (format lokal yyyy-MM-dd, aturan G12 berlaku).
- FR-11 Simpan lampiran bukti (multi) per realisasi: jenis_bukti ∈ {link,file,foto,notulen}, url wajib untuk link/foto/notulen-link; v1 tanpa upload biner.
- FR-12 Edit/hapus realisasi: pemilik & status_verifikasi ≠ diverifikasi; hapus realisasi = hapus lunak lampirannya.
- FR-13 List realisasi: filter tanggal/pegawai/rhk/status_verifikasi + search uraian; viewer default sendiri.
- FR-14 Tautan rencana↔realisasi: saat realisasi dibuat dari kartu rencana (status selesai), rencana.realisasi_id terisi & status rencana ikut selesai.

## Verifikasi
- FR-15 Aksi verifikasi (admin): setujui → status_verifikasi=disetujui + verifikator + waktu; revisi → status_verifikasi=revisi + catatan_atasan + status rencana kembali dikerjakan.
- FR-16 Antrian verifikasi: realisasi status_verifikasi=menunggu urut tanggal; badge jumlah di header/menu admin.

## Rekap
- FR-17 generate_rekap_bulanan(pegawai_id?, periode) = **Laporan SKP Bulanan** (periodik tiap bulan): idempoten upsert REKAP_BULANAN; hitung metrik P6; json capaian per RHK; periode RHK = TAHUNAN (DIKUNCI), rekap = bulanan.
- FR-18 List & export rekap (admin semua; viewer milik sendiri): Excel/PDF via kit export.

## Dashboard & Analisa
- FR-19 dashboard: kartu diri + tren 30 hari + distribusi per RHK/jenis tugas (menggantikan agregat jenis_kegiatan operasional).
- FR-20 analisa atasan: ketepatan harian tim (hari isi vs hari kerja), top capaian, daftar tunggakan verifikasi.

## Migrasi & Gard
- FR-21 Migrasi data v1: 21 baris LAPORAN_HARIAN lama → realisasi dengan jenis_tugas_id hasil pemetaan (**DIIZINKAN pemilik 2026-09-18**: app dianggap masih awal, bukan memperbaiki produksi berjalan): mapping semantik DIKUNCI rutin→utama, insidental→tambahan, khusus→inovatif, lainnya→tugas_lain (id JT_*); rhk_id kosong → badge 'pra-RHK'; volume/satuan legacy dibiarkan kosong (wajib hanya entri baru); idempoten (lewati baris yang jenis_tugas_id-nya sudah terisi).
- FR-22 Guard kepemilikan & role sama dengan v1 (P1–P8 backend lama dipertahankan perilakunya).
- FR-23 Whitelist enum server-side untuk semua enum baru (cermin G16: nilai di luar whitelist → tolak saat save, normalisasi saat baca untuk data legacy).
- FR-24 Kolom audit CoreLib wajib di semua sheet baru (otomatis).
