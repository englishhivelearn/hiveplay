// Tambah game: tambah satu entri di sini + taruh file HTML di private/games/ (atau buat halaman React di app/(guru)/)
// art = nama gambar di lib/art.js dan public/art.js
const SEMUA = ['TK', 'SD', 'SMP', 'SMA'];
export const GAMES = [
  { nama: 'Tap the Animals', url: '/games/tap-hewan.html', art: 'dog', jenjang: ['Todler'], mapel: 'Animal vocabulary', info: 'Tap an animal to hear its name and its sound.' },
  { nama: 'Count the Fruits', url: '/games/hitung-buah.html', art: 'apple', jenjang: ['TK'], mapel: 'Numbers 1 to 10 and fruits', info: 'Count the fruits, pick the number, hear it in English.' },
  { nama: 'Times Table Quiz', url: '/games/kuis-kali.html', art: 'kali', jenjang: ['SD'], mapel: 'Numbers and math in English', info: '10 questions, read aloud in English.' },
  { nama: 'Shh! Don’t Wake Them Up!', url: '/games/jangan-bangunkan.html', art: 'moon', jenjang: SEMUA, mapel: 'Classroom quiet time', info: 'The sleeping child wakes up if the class is too loud. Needs a microphone.' },
  { nama: 'Pick a Student', url: '/games/pilih-murid.html', art: 'pick', jenjang: SEMUA, mapel: 'Any lesson', info: 'Spin the wheel or race the ducks to pick a name.' },
  { nama: 'Memory Match', url: '/games/pasangan-kartu.html', art: 'pairs', jenjang: SEMUA, mapel: 'Vocabulary, opposites, phrases', info: 'Type your own word pairs, then match them.' },
];