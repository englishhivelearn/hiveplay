// FASE 3: mengekstrak ilustrasi SVG dari public/art.js dan lib/art.js menjadi file di assets/library,
// membuat manifest seed, dan memverifikasi bahwa isi file sama persis dengan aslinya.
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto';
const root = process.cwd(), LIB = path.join(root, 'assets', 'library');
const ART = new Function(fs.readFileSync('public/art.js', 'utf8') + ';return ART')();
const logo = /export const LOGO=`([\s\S]*?)`;/.exec(fs.readFileSync('lib/art.js', 'utf8'))[1];
const SRC = { ...ART, LOGO: logo };

const MAP = {
  dog:   { file: 'vocabulary/animals/dog_character.svg', slug: 'animal.dog.character', name: 'Dog (character)', cat: 'vocab-animals', variant: 'character', rig: true, tags: ['animal', 'pet'] },
  cat:   { file: 'vocabulary/animals/cat_character.svg', slug: 'animal.cat.character', name: 'Cat (character)', cat: 'vocab-animals', variant: 'character', rig: true, tags: ['animal', 'pet'] },
  cow:   { file: 'vocabulary/animals/cow_character.svg', slug: 'animal.cow.character', name: 'Cow (character)', cat: 'vocab-animals', variant: 'character', rig: true, tags: ['animal', 'farm'] },
  frog:  { file: 'vocabulary/animals/frog_character.svg', slug: 'animal.frog.character', name: 'Frog (character)', cat: 'vocab-animals', variant: 'character', rig: true, tags: ['animal', 'wild'] },
  apple: { file: 'vocabulary/fruits/apple_whole.svg', slug: 'fruit.apple.whole', name: 'Apple (whole)', cat: 'vocab-fruits', variant: 'whole', tags: ['fruit'] },
  banana: { file: 'vocabulary/fruits/banana_whole.svg', slug: 'fruit.banana.whole', name: 'Banana (whole)', cat: 'vocab-fruits', variant: 'whole', tags: ['fruit'] },
  strawberry: { file: 'vocabulary/fruits/strawberry_whole.svg', slug: 'fruit.strawberry.whole', name: 'Strawberry (whole)', cat: 'vocab-fruits', variant: 'whole', tags: ['fruit'] },
  orange: { file: 'vocabulary/fruits/orange_whole.svg', slug: 'fruit.orange.whole', name: 'Orange (whole)', cat: 'vocab-fruits', variant: 'whole', tags: ['fruit'] },
  grape: { file: 'vocabulary/fruits/grape_whole.svg', slug: 'fruit.grape.whole', name: 'Grapes (whole)', cat: 'vocab-fruits', variant: 'whole', tags: ['fruit'] },
  star:  { file: 'objects/collectibles/star.svg', slug: 'object.star', name: 'Star', cat: 'obj-collectibles', variant: null, tags: ['reward', 'collectible'] },
  trophy: { file: 'objects/collectibles/trophy.svg', slug: 'object.trophy', name: 'Trophy', cat: 'obj-collectibles', variant: null, tags: ['reward', 'collectible'] },
  kali:  { file: 'ui/icons/times-table.svg', slug: 'ui.icon.times-table', name: 'Times table icon', cat: 'ui-icons', variant: null, tags: ['icon', 'catalog'] },
  moon:  { file: 'ui/icons/sleeping-moon.svg', slug: 'ui.icon.sleeping-moon', name: 'Sleeping moon icon', cat: 'ui-icons', variant: null, tags: ['icon', 'catalog'] },
  pick:  { file: 'ui/icons/spin-wheel.svg', slug: 'ui.icon.spin-wheel', name: 'Spin wheel icon', cat: 'ui-icons', variant: null, tags: ['icon', 'catalog'] },
  pairs: { file: 'ui/icons/memory-cards.svg', slug: 'ui.icon.memory-cards', name: 'Memory cards icon', cat: 'ui-icons', variant: null, tags: ['icon', 'catalog'] },
  LOGO:  { file: 'ui/interface/hive-logo.svg', slug: 'ui.brand.hive-logo', name: 'Hive Play logo', cat: 'ui-interface', variant: null, tags: ['brand', 'logo'] },
};

const CATS = [
  ['VOCABULARY', [['vocab-animals', 'Animals'], ['vocab-fruits', 'Fruits'], ['vocab-food', 'Food'], ['vocab-transportation', 'Transportation'], ['vocab-school-supplies', 'School Supplies'], ['vocab-body-parts', 'Body Parts'], ['vocab-colors', 'Colors'], ['vocab-shapes', 'Shapes'], ['vocab-occupations', 'Occupations'], ['vocab-household-items', 'Household Items'], ['vocab-other', 'Other Vocabulary']]],
  ['CHARACTER', [['char-players', 'Playable Characters'], ['char-monsters', 'Monsters'], ['char-animals', 'Animal Characters'], ['char-npcs', 'NPCs'], ['char-enemies', 'Enemies']]],
  ['ENVIRONMENT', [['env-classroom', 'Classroom'], ['env-school', 'School'], ['env-forest', 'Forest'], ['env-beach', 'Beach'], ['env-space', 'Space'], ['env-city', 'City'], ['env-underwater', 'Underwater'], ['env-other', 'Other Backgrounds']]],
  ['OBJECT', [['obj-collectibles', 'Collectibles'], ['obj-obstacles', 'Obstacles'], ['obj-interactive', 'Interactive Objects'], ['obj-props', 'Props (coins, keys, chests, tools)']]],
  ['AUDIO', [['audio-vocabulary', 'Vocabulary Pronunciation'], ['audio-music', 'Background Music'], ['audio-sfx', 'Sound Effects'], ['audio-success', 'Success Sounds'], ['audio-failure', 'Failure Sounds'], ['audio-character', 'Character Sounds'], ['audio-ui', 'UI Sounds']]],
  ['ANIMATION', [['anim-characters', 'Character Animations'], ['anim-monsters', 'Monster Animations'], ['anim-objects', 'Object Animations']]],
  ['UI', [['ui-icons', 'Icons'], ['ui-interface', 'Interface']]],
];
const VCATS = [['animals', 'Animals', null], ['pets', 'Pets', 'animals'], ['farm-animals', 'Farm Animals', 'animals'], ['wild-animals', 'Wild Animals', 'animals'], ['fruits', 'Fruits', null], ['food', 'Food', null], ['transportation', 'Transportation', null], ['school-supplies', 'School Supplies', null], ['body-parts', 'Body Parts', null], ['colors', 'Colors', null], ['shapes', 'Shapes', null], ['occupations', 'Occupations', null], ['household-items', 'Household Items', null], ['other', 'Other', null]];
const W = (word, cat, plural, sound, syl, def, ex, tr, diff, tags, img) => ({ word, slug: word.toLowerCase(), category: cat, partOfSpeech: 'noun', definition: def, example: ex, translation: tr, plural, soundText: sound, difficulty: diff, tags, syllables: syl, assets: [{ asset: img, role: img.split('.').pop(), primary: true }] });
const VOCAB = [
  W('Dog', 'pets', 'dogs', 'Woof woof!', 1, 'A friendly animal that people keep as a pet. Dogs bark.', 'The dog is playing in the garden.', 'anjing', 1, ['animal', 'pet'], 'animal.dog.character'),
  W('Cat', 'pets', 'cats', 'Meow!', 1, 'A small furry pet that purrs and chases mice.', 'The cat is sleeping on the sofa.', 'kucing', 1, ['animal', 'pet'], 'animal.cat.character'),
  W('Cow', 'farm-animals', 'cows', 'Moo!', 1, 'A large farm animal that gives us milk.', 'The cow eats grass in the field.', 'sapi', 1, ['animal', 'farm'], 'animal.cow.character'),
  W('Frog', 'wild-animals', 'frogs', 'Ribbit!', 1, 'A small green animal that jumps and lives near water.', 'The frog jumps into the pond.', 'katak', 1, ['animal', 'wild'], 'animal.frog.character'),
  W('Apple', 'fruits', 'apples', null, 2, 'A round fruit that can be red, green, or yellow.', 'I eat an apple every day.', 'apel', 1, ['fruit'], 'fruit.apple.whole'),
  W('Banana', 'fruits', 'bananas', null, 3, 'A long yellow fruit with a soft inside.', 'The monkey likes the banana.', 'pisang', 1, ['fruit'], 'fruit.banana.whole'),
  W('Strawberry', 'fruits', 'strawberries', null, 3, 'A small red fruit with tiny seeds on its skin.', 'She put a strawberry on the cake.', 'stroberi', 2, ['fruit'], 'fruit.strawberry.whole'),
  W('Orange', 'fruits', 'oranges', null, 2, 'A round orange fruit with juicy pieces inside.', 'I drink orange juice at breakfast.', 'jeruk', 1, ['fruit'], 'fruit.orange.whole'),
  W('Grape', 'fruits', 'grapes', null, 1, 'A small round fruit that grows in bunches.', 'These grapes are sweet.', 'anggur', 1, ['fruit'], 'fruit.grape.whole'),
];
VOCAB.forEach(v => { v.assets[0].role = v.assets[0].asset.split('.')[2]; });
const SETS = [
  { name: 'Pets, Farm and Wild Animals', description: 'Four common animals for the youngest learners.', level: 'Todler', published: true, words: ['dog', 'cat', 'cow', 'frog'] },
  { name: 'Fruits', description: 'Five common fruits for counting practice.', level: 'TK', published: true, words: ['apple', 'banana', 'strawberry', 'orange', 'grape'] },
];
// Pemakaian asset oleh game (hasil audit). gameKey 'catalog' = halaman katalog guru.
const USAGE = [
  ...['dog', 'cat', 'cow', 'frog'].map(a => ['tap-animals', `animal.${a}.character`, 'vocabulary-image']),
  ...['apple', 'banana', 'strawberry', 'orange', 'grape'].map(a => ['count-fruits', `fruit.${a}.whole`, 'vocabulary-image']),
  ['count-fruits', 'object.star', 'reward'], ['times-table', 'object.star', 'reward'], ['times-table', 'object.trophy', 'reward'],
  ['catalog', 'animal.dog.character', 'catalog-icon'], ['catalog', 'fruit.apple.whole', 'catalog-icon'],
  ['catalog', 'ui.icon.times-table', 'catalog-icon'], ['catalog', 'ui.icon.sleeping-moon', 'catalog-icon'],
  ['catalog', 'ui.icon.spin-wheel', 'catalog-icon'], ['catalog', 'ui.icon.memory-cards', 'catalog-icon'], ['catalog', 'ui.brand.hive-logo', 'brand'],
];

const legacy = [], assets = []; let bad = 0;
for (const [key, m] of Object.entries(MAP)) {
  const svg = SRC[key]; if (!svg) throw new Error('ART key hilang: ' + key);
  const abs = path.join(LIB, m.file); fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, svg, 'utf8');
  const back = fs.readFileSync(abs, 'utf8');
  const sha = crypto.createHash('sha256').update(Buffer.from(svg, 'utf8')).digest('hex');
  const ok = back === svg && crypto.createHash('sha256').update(fs.readFileSync(abs)).digest('hex') === sha;
  if (!ok) bad++;
  const vb = /viewBox="0 0 (\d+(?:\.\d+)?) (\d+(?:\.\d+)?)"/.exec(svg);
  assets.push({ slug: m.slug, name: m.name, category: m.cat, type: 'IMAGE', variant: m.variant, file: m.file, format: 'svg', width: vb ? Math.round(+vb[1]) : null, height: vb ? Math.round(+vb[2]) : null, inlineRig: !!m.rig, tags: m.tags, source: 'SEED' });
  legacy.push({ legacyKey: key === 'LOGO' ? 'LOGO (lib/art.js)' : `ART.${key} (public/art.js, lib/art.js)`, slug: m.slug, newPath: 'assets/library/' + m.file, bytes: Buffer.byteLength(svg), sha256: sha, contentIdentical: ok });
}
const manifest = {
  generatedBy: 'scripts/extract-legacy-assets.mjs',
  categories: CATS.flatMap(([grp, list]) => list.map(([slug, name]) => ({ slug, name, group: grp }))),
  assets,
  vocabularyCategories: VCATS.map(([slug, name, parent]) => ({ slug, name, parent })),
  vocabulary: VOCAB, sets: SETS, usage: USAGE.map(([game, asset, role]) => ({ game, asset, role })),
};
fs.writeFileSync(path.join(LIB, 'manifest.json'), JSON.stringify(manifest, null, 2));
fs.writeFileSync('migration/legacy-map.json', JSON.stringify(legacy, null, 2));
console.log(`Diekstrak: ${legacy.length} file | isi identik dengan aslinya: ${legacy.filter(l => l.contentIdentical).length}/${legacy.length} | gagal: ${bad}`);
if (bad) process.exit(1);
