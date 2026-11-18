# HivePlay: laporan migrasi asset (Fase 2 sampai 5, tahap pertama)

## Fase 2: Pusat asset
- `assets/library/` dibuat (seed di repo, baca-saja). Unggahan admin nanti ke `DATA_DIR/assets/library` (Volume), dilayani lewat jalur yang sama.
- Database PostgreSQL: 8 tabel + kategori (`db/migrations/001_init.sql`). Migrasi berjalan otomatis saat `npm start`.
- Seed: 40 kategori asset, 14 kategori kosakata, 16 asset, 9 kosakata, 2 set, 19 catatan pemakaian game.

## Fase 3: Ekstraksi
- 16 SVG diekstrak dari `ART` dan `LOGO` menjadi file. Isi tiap file DIPERIKSA identik dengan sumbernya (16 dari 16).
- Pemetaan lama ke baru: `migration/legacy-map.json` (kunci lama, path baru, ukuran, SHA-256).
- Tidak ada konversi format. Tidak ada file duplikat.
- Tidak dimigrasi di tahap ini: karakter anak tidur, bebek, mahkota, tekstur air (masih tertanam di game masing-masing; menyusul bersama game-nya). Audio sintetis dan suara browser tidak berbentuk file.

## Fase 4: Game
| Game | Status |
|---|---|
| Tap the Animals | MIGRASI: kata dan gambar dari perpustakaan, fallback bawaan |
| Count the Fruits | MIGRASI: kata, gambar, bintang dari perpustakaan, fallback bawaan |
| Times Table Quiz, Shh!, Pick a Student, Memory Match | Belum (masih pakai kode lama, tidak berubah) |
| Katalog | Belum (ikon masih dari `lib/art.js`) |

File lama `public/art.js` dan `lib/art.js` TIDAK dihapus (masih dipakai 4 game, katalog, dan sebagai fallback).

## Fase 5: Verifikasi (PostgreSQL asli, server asli, halaman simulasi)
61 pemeriksaan, 61 lulus. Mencakup: migrasi dan seed idempoten, perubahan admin tidak tertimpa seed, 401 tanpa login, hanya baca untuk guru, isi `/media` identik dengan aslinya, ETag, arsip, path traversal, peringatan gambar hilang sebelum game dimulai, gambar pengganti tanpa error, fallback saat perpustakaan atau database mati, urutan asli game terjaga, bentuk jamak/tunggal, validator SVG (16 sah lolos, 9 jahat ditolak).
Belum diuji: browser sungguhan (tampilan, layar penuh, HP). Perlu dicek di perangkat.

---

## Tahap 2: Dashboard admin

Menu (CONTENT MANAGEMENT): Vocabulary, Vocabulary Categories, Vocabulary Sets, Asset Library, Asset Categories, Audio Library, Asset Usage. Ditambah: Dashboard (ringkasan), Teacher access code.

**Hak akses:** semua endpoint tulis (`/api/admin/*`) hanya untuk admin (cookie operator) dan menolak permintaan dengan Origin asing. Guru dan pengunjung anonim mendapat 403 pada semua endpoint tulis dan dialihkan dari semua halaman admin. Admin juga boleh membuka katalog dan game tanpa login guru.

**Asset Library:** grid dan list, pencarian, filter (kelompok, kategori, tipe, status), pratinjau gambar/audio, detail (metadata, pemakaian game, kata terkait, duplikat), unggah (svg, png, jpg, gif, webp, mp3, wav, ogg; gambar maks 2 MB, audio maks 5 MB; isi file harus cocok dengan ekstensi; SVG divalidasi), ganti file tanpa mengubah id dan kaitan (versi naik), arsip/aktifkan, hapus permanen (ditolak bila masih dipakai atau asset bawaan).
**Vocabulary:** tambah/ubah/arsip/hapus kata (hapus ditolak bila ada di set), tautkan gambar (whole, sliced, character, atau peran lain) dan audio pengucapan, tentukan varian utama.
**Vocabulary Sets:** buat, ubah, urutkan kata, publikasikan atau draft, hapus.
**Categories:** tambah dan ubah nama kategori asset dan kosakata (kode tidak berubah).
**Asset Usage:** pemakaian per game dan per asset, asset tak terpakai, asset kembar, kata tanpa gambar.
**Game:** Tap the Animals memutar rekaman pengucapan dari perpustakaan bila ada, dan beralih ke suara bawaan browser bila tidak ada atau gagal dimuat.

### Verifikasi tahap ini (PostgreSQL asli, server asli, komponen React asli di browser simulasi)
- API admin: 68 pemeriksaan lulus.
- Halaman dan akses per peran: 25 lulus.
- Antarmuka interaktif (klik, ketik, unggah, ganti file, tautkan, urutkan, buat, ubah nama, hapus): 43 lulus.
- Game dengan rekaman: 6 lulus.
- Bug ditemukan dan diperbaiki lewat pengujian: kolom "Ubah nama" kategori kehilangan fokus tiap ketikan (komponen baris dibuat ulang di setiap render).
- Belum diuji: browser sungguhan (tampilan visual, layar penuh, HP) dan unggahan sungguhan lewat Railway.

### Belum dikerjakan
Migrasi Times Table Quiz, Shh!, Pick a Student, Memory Match dan ikon katalog ke perpustakaan. Count the Fruits belum memutar rekaman (frasa angka tetap suara bawaan). Peran admin masih satu password operator (tidak ada akun admin per orang).
