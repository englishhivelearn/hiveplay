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
