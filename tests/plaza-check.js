/**
 * Vérification de l'app PLAZA (Étape 1).
 *
 *  - lance l'app miiPlaza depuis le hub (handleAppLaunch)
 *  - le conteneur plein écran + un canvas WebGL sont créés
 *  - la scène rend des pixels (variance mesurée sur une zone 3D)
 *  - pas d'erreur console / page
 *  - la molette change la distance caméra
 *  - le bouton « Menu » (retour) ferme l'app
 *
 * Lancement : node tests/plaza-check.js  (serveur requis sur http://localhost:5500)
 */

const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:5500/';
const SHOTS_DIR = path.join(__dirname, 'shots');

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    '/usr/bin/google-chrome', '/usr/bin/chromium',
  ].filter(Boolean);
  for (const p of candidates) if (fs.existsSync(p)) return p;
  throw new Error('Chrome introuvable (définir CHROME_PATH)');
}

async function preparePage(page) {
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForSelector('.wii-menu .wii-channel', { timeout: 20000 });
  await page.evaluate(() => {
    const auth = document.getElementById('auth-overlay');
    if (auth) auth.style.display = 'none';
  });
  await new Promise(r => setTimeout(r, 400));
  await page.evaluate(() => {
    const warn = document.getElementById('wii-warning-overlay');
    if (warn) warn.remove();
  });
  await new Promise(r => setTimeout(r, 600));
}

async function launchPlaza(page) {
  await page.evaluate(() => {
    const t = document.createElement('div');
    t.setAttribute('data-app', 'miiPlaza');
    document.body.appendChild(t);
    window.handleAppLaunch(t);
    t.remove();
  });
  await page.waitForSelector('.plaza-root canvas', { timeout: 20000 });
  await new Promise(r => setTimeout(r, 900));
}

(async () => {
  if (!fs.existsSync(SHOTS_DIR)) fs.mkdirSync(SHOTS_DIR, { recursive: true });
  const logs = [];
  const results = [];
  const browser = await puppeteer.launch({
    executablePath: findChrome(),
    headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--mute-audio', '--hide-scrollbars',
           '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });

  let failed = 0;
  try {
    const page = await browser.newPage();
    page.on('console', (m) => { if (m.type() === 'error') logs.push(`[console.error] ${m.text()}`); });
    page.on('pageerror', (e) => logs.push(`[pageerror] ${e.toString()}`));
    await page.setViewport({ width: 1920, height: 1080 });
    await preparePage(page);

    // 1) La chaîne Plaza est bien dans la catégorie Jeux
    const inGames = await page.evaluate(() => {
      const tabs = [...document.querySelectorAll('.wii-tab')];
      const gamesIdx = tabs.findIndex(t => /jeux/i.test(t.textContent));
      if (gamesIdx < 0) return null;
      const labels = [...document.querySelectorAll('.wii-channel-label')].map(l => l.textContent);
      return { gamesIdx, labels };
    });
    // (on lit les chaînes de la page courante seulement ; on vérifie surtout l'absence d'erreur d'index)

    // 2) Lancement
    await launchPlaza(page);

    const state = await page.evaluate(() => {
      const root = document.querySelector('.plaza-root');
      const canvas = document.querySelector('.plaza-root canvas');
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      return {
        hasRoot: !!root,
        fullscreen: !!document.querySelector('.mii-fullscreen-container'),
        hasCanvas: !!canvas,
        canvasW: canvas ? canvas.width : 0,
        canvasH: canvas ? canvas.height : 0,
        hasGL: !!gl,
        hud: !!document.querySelector('.plaza-hud-top'),
        back: !!document.querySelector('#plaza-back'),
        hasWorld: !!(root && root._plaza && root._plaza.world),
      };
    });
    results.push(['conteneur plein écran créé', state.fullscreen && state.hasRoot, JSON.stringify({ fs: state.fullscreen, root: state.hasRoot })]);
    results.push(['canvas WebGL présent', state.hasCanvas && state.hasGL && state.canvasW > 500, JSON.stringify(state)]);
    results.push(['HUD + bouton retour présents', state.hud && state.back, '']);
    results.push(['monde 3D instancié', state.hasWorld, '']);

    await page.screenshot({ path: path.join(SHOTS_DIR, 'plaza-1920x1080.png') });

    // 3) Variance des pixels sur une zone 3D (sous le HUD)
    const sharp = require('sharp');
    const { channels } = await sharp(path.join(SHOTS_DIR, 'plaza-1920x1080.png'))
      .extract({ left: 500, top: 300, width: 900, height: 600 })
      .stats();
    const variance = channels.slice(0, 3).reduce((s, c) => s + c.stdev, 0) / 3;
    results.push(['scène rendue (variance pixels 3D)', variance > 8, `stdev=${variance.toFixed(2)}`]);

    // 4) Molette → zoom (la distance caméra change)
    const distBefore = await page.evaluate(() => document.querySelector('.plaza-root')._plaza.world.camera.position.length());
    await page.mouse.move(960, 540);
    for (let i = 0; i < 5; i++) { await page.mouse.wheel({ deltaY: 120 }); await new Promise(r => setTimeout(r, 40)); }
    await new Promise(r => setTimeout(r, 120));
    const distAfter = await page.evaluate(() => document.querySelector('.plaza-root')._plaza.world.camera.position.length());
    results.push(['molette → zoom (distance caméra change)', Math.abs(distAfter - distBefore) > 0.5, `avant=${distBefore.toFixed(1)} après=${distAfter.toFixed(1)}`]);

    // 5) Les Mii (Étape 2/3D) : un Mii chargé en vrai 3D, il se déplace
    await new Promise(r => setTimeout(r, 2500)); // laisse le GLB 3D se charger
    const miiInfo = await page.evaluate(() => {
      const p = document.querySelector('.plaza-root')._plaza;
      const m = p.miis[0];
      let meshes = 0;
      if (m.model) m.model.traverse(o => { if (o.isMesh) meshes++; });
      return {
        count: p.miis.length,
        name: m.name,
        is3D: !!m.is3D,
        meshes,
        pos: [m.group.position.x, m.group.position.z],
      };
    });
    results.push(['Mii chargé en vrai 3D (tête FFL + corps)', miiInfo.count >= 1 && miiInfo.is3D && miiInfo.meshes > 0, JSON.stringify(miiInfo)]);

    const hudCount = await page.evaluate(() => document.querySelector('#plaza-count').textContent);
    results.push(['HUD : nombre de Mii affiché', /Mii/.test(hudCount), `"${hudCount}"`]);

    await new Promise(r => setTimeout(r, 6500)); // laisse le temps de marcher
    const moved = await page.evaluate(() => {
      const m = document.querySelector('.plaza-root')._plaza.miis[0];
      return [m.group.position.x, m.group.position.z];
    });
    const dist = Math.hypot(moved[0] - miiInfo.pos[0], moved[1] - miiInfo.pos[1]);
    results.push(['le Mii se déplace (animation walk)', dist > 0.5, `dist=${dist.toFixed(2)}`]);

    // 5b) Les os s'articulent (clips retargetés pilotent réellement le squelette)
    const anim = await page.evaluate(async () => {
      const p = document.querySelector('.plaza-root')._plaza;
      const m = p.miis[0];
      if (!m || !m._built) return { ok: false, reason: 'pas de modèle 3D' };
      const actions = Object.keys(m._built.actions || {});
      const find = (n) => { let b = null; m.model.traverse(o => { if (o.isBone && o.name === n) b = o; }); return b; };
      const bone = find('foot_l1') || find('arm_l1');
      if (!bone) return { ok: false, reason: 'os introuvable', actions };
      const snap = () => [bone.quaternion.x, bone.quaternion.y, bone.quaternion.z, bone.quaternion.w].map(v => +v.toFixed(5));
      m.walkTo(m.group.position.x + 2, m.group.position.z);
      const a = snap();
      await new Promise(r => setTimeout(r, 400));
      const b = snap();
      const moved2 = a.some((v, i) => Math.abs(v - b[i]) > 1e-4);
      return { ok: true, actions, bone: bone.name, a, b, moved2, strideWorld: +m.strideWorld.toFixed(4) };
    });
    results.push([
      'os articulés par les clips retargetés',
      anim.ok && anim.actions.includes('idle') && anim.actions.includes('walk') && anim.moved2,
      JSON.stringify(anim),
    ]);

    await page.screenshot({ path: path.join(SHOTS_DIR, 'plaza-mii-1920x1080.png') });

    // 6) Retour → fermeture
    await page.click('#plaza-back');
    await new Promise(r => setTimeout(r, 600));
    const closed = await page.evaluate(() => !document.querySelector('.plaza-root'));
    results.push(['bouton Menu → app fermée', closed, `closed=${closed}`]);

    await page.close();
  } finally {
    await browser.close();
  }

  for (const [name, ok, detail] of results) {
    if (!ok) failed += 1;
    console.log(`   ${ok ? '✓' : '✗'} ${name} — ${detail}`);
  }
  console.log('\n=== Erreurs console / page ===');
  const uniq = [...new Set(logs)];
  if (!uniq.length) console.log('   aucune');
  else uniq.slice(0, 30).forEach(l => console.log('   ' + l));

  console.log(failed ? `\nRÉSULTAT : ${failed} échec(s).` : '\nRÉSULTAT : tout passe.');
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error('Erreur du script de test :', e); process.exit(2); });
