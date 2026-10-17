/** Échantillonnage de pixels dans les captures (contraste tuiles / icônes). */
const sharp = require('sharp');

(async () => {
  const file = process.argv[2] || 'tests/shots/wii-1920x1080.png';
  const pts = {
    'fond (scrim)': [300, 250],
    'face tuile 1 (marge)': [570, 430],
    'face tuile 2 (marge)': [860, 430],
    'centre icone Mon Profil (mask)': [960, 505],
    'label sous tuile': [666, 630],
  };
  for (const [name, [x, y]] of Object.entries(pts)) {
    const { data } = await sharp(file).extract({ left: x, top: y, width: 6, height: 6 }).raw().toBuffer({ resolveWithObject: true });
    const r = data[0], g = data[1], b = data[2];
    console.log(`${name.padEnd(36)} rgb(${r},${g},${b})`);
  }
})();
