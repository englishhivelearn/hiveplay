# Hive Play

Platform game kosakata untuk guru. Konten (kata, gambar, audio, set) **dikelola lewat kode**, bukan lewat admin.

## Admin
`/admin` hanya untuk **mengganti kode akses guru**. Tidak ada lagi upload gambar atau tambah kata dari admin.

Variabel lingkungan wajib: `DATABASE_URL`, `SESSION_SECRET`, `ADMIN_PASSWORD`, `ACCESS_CODE`.
Opsional: `DATA_DIR` (tempat `config.json` berisi kode akses yang diganti dari admin; pasang di Volume agar tidak hilang saat deploy), `DATABASE_SSL=true`.

## Cara menambah / mengubah konten
Semua konten ada di `assets/library/manifest.json` dan file di `assets/library/`.
Setiap `npm start` (deploy) menjalankan migrasi lalu `scripts/seed.mjs`, yang **menyamakan database dengan manifest**.

1. **Gambar / audio**: taruh file di `assets/library/<grup>/<kategori>/` (mis. `vocabulary/animals/horse_character.svg`).
2. **Asset**: tambahkan entri di `assets` pada manifest:
   `{ "slug": "animal.horse.character", "name": "Horse (character)", "category": "vocab-animals", "type": "IMAGE", "variant": "character", "file": "vocabulary/animals/horse_character.svg", "format": "svg", "width": 120, "height": 120, "inlineRig": true, "tags": ["animal"] }`
   Untuk audio: `"type": "AUDIO"`, kategori audio, dan opsional `"durationMs"`.
3. **Kata**: tambahkan di `vocabulary` (`word`, `slug`, `category`, `partOfSpeech`, `definition`, `example`, `translation`, `plural`, `soundText`, `difficulty` 1-5, `tags`, `syllables`) dan tautkan asset lewat `assets: [{ "asset": "<slug asset>", "role": "character", "primary": true }]`.
4. **Set**: tambahkan slug kata ke `words` pada set di `sets` (atau buat set baru).
5. **Pemakaian game** (`usage`): daftar asset yang dipakai game tertentu.
6. Commit dan push. Setelah deploy, perubahan langsung terlihat oleh guru.

Aturan sinkronisasi:
- Yang ada di manifest ditambahkan atau **diperbarui**.
- Kata/asset yang dihapus dari manifest **diarsipkan** (hilang dari guru, data tidak dihapus).
- Set yang dihapus dari manifest **dihapus**.
- Seed berhenti dengan pesan jelas bila set menyebut kata yang tidak ada, dan melewati asset yang filenya tidak ada atau SVG-nya ditolak.

Menjalankan seed manual: `npm run db:migrate && npm run db:seed`.

## Pengembangan
```
npm install
npm run dev
```
