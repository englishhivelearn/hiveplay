// Tambah game: tambah satu entri di sini + taruh file HTML di private/games/ (atau buat halaman React di app/(guru)/)
// art = nama gambar di lib/art.js dan public/art.js
const SEMUA = ['TK', 'SD', 'SMP', 'SMA'];
export const GAMES = [
  { nama: 'Tap Hewan', url: '/games/tap-hewan.html', art: 'dog', jenjang: ['Todler'], mapel: 'Mengenal hewan', info: 'Sentuh hewan, dengar namanya.' },
  { nama: 'Hitung Buah', url: '/games/hitung-buah.html', art: 'apple', jenjang: ['TK'], mapel: 'Berhitung 1 sampai 10', info: 'Hitung buahnya, pilih angka.' },
  { nama: 'Kuis Perkalian', url: '/games/kuis-kali.html', art: 'kali', jenjang: ['SD'], mapel: 'Matematika', info: '10 soal perkalian.' },
  { nama: 'Jangan Bangunkan!', url: '/games/jangan-bangunkan.html', art: 'moon', jenjang: SEMUA, mapel: 'Ketenangan kelas', info: 'Anak tidur akan bangun kalau kelas ribut. Butuh mikrofon.' },
  { nama: 'Pilih Murid', url: '/games/pilih-murid.html', art: 'pick', jenjang: SEMUA, mapel: 'Semua pelajaran', info: 'Putar dan pilih nama secara acak.' },
  { nama: 'Pasangan Kartu', url: '/games/pasangan-kartu.html', art: 'pairs', jenjang: SEMUA, mapel: 'Kosakata, rumus, istilah', info: 'Isi pasangan sendiri, lalu cocokkan.' },
];
