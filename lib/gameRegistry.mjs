// Kebutuhan asset setiap game. Dipakai untuk validasi kompatibilitas sebelum game dimulai.
// image.variants = varian gambar yang dapat dipakai (urutan = prioritas). audio.optional = true berarti
// suara bawaan browser (text-to-speech) dipakai bila kosakata belum punya rekaman.
export const GAME_REQUIREMENTS = {
  'find-vocabulary': { vocab: true, image: { variants: ['whole', 'sliced', 'character'] }, audio: { optional: true } },
  // Contoh untuk game masa depan (belum ada): 'listening-challenge': { vocab: true, image: { variants: ['whole'] }, audio: { optional: false } },
};