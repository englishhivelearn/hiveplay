// Tambah game: tambah satu entri di sini + taruh file HTML di private/games/ (atau buat halaman React di app/(guru)/)
// art = nama gambar di lib/art.js dan public/art.js
const SEMUA = ['TK', 'SD', 'SMP', 'SMA'];
export const GAMES = [
  { nama: 'Shh! Don’t Wake Them Up!', url: '/games/jangan-bangunkan.html', art: 'moon', jenjang: SEMUA, mapel: 'Classroom quiet time', info: 'The sleeping child wakes up if the class is too loud. Needs a microphone.' },
  { nama: 'Find the Vocabulary', url: '/games/find-vocabulary.html', art: 'flashlight', jenjang: SEMUA, mapel: 'Vocabulary recognition', info: 'The lights are out! Move the light to find the hidden pictures.' },
  { nama: 'Animal World', url: '/games/animal-world.html', art: 'animalworld', jenjang: ['Todler', ...SEMUA], mapel: 'Animals and habitats', info: 'Photograph student drawings of animals and watch them walk, fly, and swim in their own world.' },
  { nama: 'Pick a Student', url: '/games/pilih-murid.html', art: 'pick', jenjang: SEMUA, mapel: 'Any lesson', info: 'Spin the wheel or race the ducks to pick a name.' },
  { nama: 'Read the Clock', url: '/games/jam-analog.html', art: 'clock', jenjang: ['TK', 'SD'], mapel: 'Telling time in English', info: 'Set the clock hands, let students say the time, then show the answer.' },
  { nama: 'Quiz Board', url: '/quiz', art: 'quiz', jenjang: SEMUA, mapel: 'Any subject', info: 'Build your own question board with custom points. Pick a box, reveal the answer, and score for one or two teams.' },
  { nama: 'Countdown', url: '/games/hitung-mundur.html', art: 'countdown', jenjang: SEMUA, mapel: 'Timer for any activity', info: 'A classroom timer with three themes: a balloon that pops, a bomb with a burning fuse, or a melting candle.' },
];