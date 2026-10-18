/**
 * Vérification du moteur social « Tomodachi Life » de la PLAZA.
 *
 *  A) Unités (dans la page, sur le moteur `relations.js`) :
 *     - table de dérive ROM exacte + multiplicateur [1,2,2,3] (positifs seuls)
 *     - débit ROM : floor(minutes ÷ floor(3000÷paires)), cap 500
 *     - événements ±40 avec clamp 0..200
 *     - banques : First / Usual 90 % / Unusual 10 % (bucket ≤ 1) / Birthday
 *     - confession : (niveau/2)²/100 + 50 → type amoureux, niveaux 100
 *     - porte « jalousie » : amoureux niveau > 50 → plus d'événement spécial
 *     - lot ambiant appliqué, intégrité 0..200 / types 0..12
 *  B) En conditions réelles : interactions forcées (chat, dispute,
 *     anniversaire) + croisement organique, journal enrichi (banque, ±40),
 *     captures d'écran, 0 erreur console.
 *
 * Lancement : node tests/social-check.js  (serveur requis sur http://localhost:5500)
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

/** Attend (pairs vide) qu'une interaction correspondant à `match` soit journalisée. */
async function waitInteraction(page, match, timeout = 40000) {
  const pred = (m) => {
    const soc = document.querySelector('.plaza-root')._plaza.social;
    if (soc.pairs.length !== 0) return false;
    return soc.log.some(l => l.type === 'interaction'
      && (m.kind == null || l.kind === m.kind)
      && (m.bank == null || l.bank === m.bank)
      && (m.nameA == null
        || (l.a === m.nameA && l.b === m.nameB) || (l.a === m.nameB && l.b === m.nameA)));
  };
  await page.waitForFunction(pred, { timeout }, match);
  return page.evaluate((m) => {
    const soc = document.querySelector('.plaza-root')._plaza.social;
    const found = soc.log.filter(l => l.type === 'interaction'
      && (m.kind == null || l.kind === m.kind)
      && (m.bank == null || l.bank === m.bank)
      && (m.nameA == null
        || (l.a === m.nameA && l.b === m.nameB) || (l.a === m.nameB && l.b === m.nameA)));
    return found.slice(-1)[0];
  }, match);
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
    await launchPlaza(page);

    // Laisse le moteur et la 3D s'installer.
    await new Promise(r => setTimeout(r, 2500));

    /* ───────────────────────── A) Unités moteur ───────────────────────── */
    const units = await page.evaluate(() => {
      const out = [];
      const R = (name, ok, detail) => out.push([name, !!ok, detail || '']);
      const soc = document.querySelector('.plaza-root')._plaza.social;
      const rel = soc.relations;
      const T = rel._test;

      // Table de dérive (octets @0x8BC600) + multiplicateur (octets @0x8BC5FC).
      R('dérive ROM : table exacte (type 1, tirage 0 → 100)', T.driftDelta(1, 0, 0) === 100,
        'val=' + T.driftDelta(1, 0, 0));
      R('dérive ROM : positifs ×3 au tier 3', T.driftDelta(1, 0, 3) === 300,
        'val=' + T.driftDelta(1, 0, 3));
      R('dérive ROM : négatifs NON multipliés', T.driftDelta(1, 7, 3) === -100 && T.driftDelta(2, 7, 3) === -80,
        `t1=${T.driftDelta(1, 7, 3)} t2=${T.driftDelta(2, 7, 3)}`);
      R('dérive ROM : type 5 → 0 quel que soit le tirage', T.driftDelta(5, 3, 3) === 0, '');

      // Débit (FUN_007d57b0).
      R('débit ROM : 1440 min, 15 paires → 7', T.driftCount(1440, 15) === 7, 'val=' + T.driftCount(1440, 15));
      R('débit ROM : 60 min, 15 paires → 0', T.driftCount(60, 15) === 0, '');
      R('débit ROM : >3000 paires → diviseur 1, cap 500', T.driftCount(9999, 4950) === 500,
        'val=' + T.driftCount(9999, 4950));
      R('débit ROM : 0 paire → 0', T.driftCount(9999, 0) === 0, '');

      // Événement ±40 (FUN_0056b570) + clamp.
      T.setLevel(0, 1, 195); T.setLevel(1, 0, 5);
      rel.applyEvent(0, 1, 40);                 // ab : 195 → 200 (clamp) ; ba : 5 → 45
      R('événement +40 clamp 200', rel.level(0, 1) === 200, 'lv=' + rel.level(0, 1));
      rel.applyEvent(0, 1, -40);                // ab : 200 → 160 ; ba : 45 → 5
      rel.applyEvent(0, 1, -40);                // ab : 160 → 120 ; ba : 5 → 0 (clamp)
      R('événement −40 clamp 0', rel.level(1, 0) === 0 && rel.level(0, 1) === 120,
        `ab=${rel.level(0, 1)} ba=${rel.level(1, 0)}`);

      // Banques (FUN_007956a8 / FUN_003d33f0 / FUN_003d352c).
      R('banque First quand jamais parlé', rel.bankFor(0, 1) === 'first', '');
      rel.onTalk(0, 1, 'first');
      let unusual = 0;
      for (let k = 0; k < 3000; k++) if (rel.bankFor(0, 1) === 'unusual') unusual++;
      const ratio = unusual / 3000;
      R('banque Unusual ≈ 10 % (bucket 1)', ratio > 0.06 && ratio < 0.14,
        `unusual=${(ratio * 100).toFixed(1)}%`);
      T.setTalk(0, 1, rel.time - 9 * 1080);   // 9 jours → bucket 2
      R('bucket 9 j → 2', rel.bucketOf(0, 1) === 2, 'bucket=' + rel.bucketOf(0, 1));
      let allUsual = true;
      for (let k = 0; k < 400; k++) if (rel.bankFor(0, 1) !== 'usual') { allUsual = false; break; }
      R('bucket > 1 → toujours Usual', allUsual, '');

      // Anniversaire (FUN_003d3340).
      T.setBirthday(2, T.gameDay() % 365); T.setBdayYear(2, 0);
      T.setTalk(2, 3, rel.time - 1080);
      R('anniversaire du jour → banque Birthday', rel.bankFor(2, 3) === 'birthday', '');
      rel.onTalk(2, 3, 'birthday');
      R('anniversaire fêté une seule fois', rel.bankFor(2, 3) !== 'birthday', '');

      // Confession : (niveau/2)²/100 + 50 → FUN_0056b27c.
      T.setType(3, 4, 1); T.setType(4, 3, 1);
      T.setLevel(3, 4, 130); T.setLevel(4, 3, 130);
      T.setEventsToday(0);
      const p3 = rel.specialChance(3, 4);
      let got = 'none';
      for (let k = 0; k < 100 && got !== 'confession'; k++) got = rel.rollSpecial(3, 4);
      R('chance spéciale ≈ (130/2)²/100 + 50', p3 > 80 && p3 <= 100, 'p=' + p3.toFixed(1));
      R('confession → type 2 + niveaux 100', got === 'confession'
        && rel.type(3, 4) === 2 && rel.type(4, 3) === 2
        && rel.level(3, 4) === 100 && rel.level(4, 3) === 100, 'event=' + got);

      // Porte « jalousie » (FUN_007c4be0 bit 2).
      T.setType(0, 2, 2); T.setLevel(0, 2, 60);         // 0 aime 2 (niveau 60)
      T.setType(0, 1, 1); T.setType(1, 0, 1);
      T.setLevel(0, 1, 150); T.setLevel(1, 0, 150);
      R('porte jalousie : amoureux > 50 → p = 0', rel.specialChance(0, 1) === 0,
        'p=' + rel.specialChance(0, 1));

      // Lot ambiant forcé + intégrité.
      T.setType(4, 5, 1); T.setLevel(4, 5, 100);
      const count = rel.runAmbient(1440, 0);
      R('lot ambiant 1440 min → 7 événements', count === 7, 'count=' + count);
      const snap = rel.snapshot();
      R('intégrité : niveaux 0..200, types 0..12', snap.every(r =>
        r.level >= 0 && r.level <= 200 && r.type >= 0 && r.type <= 12), `${snap.length} sens`);
      R('journal moteur : événements de dérive tracés',
        rel.log.filter(l => l.type === 'drift').length >= 7, '');

      return out;
    });
    results.push(...units);

    /* ───────────────────── B) Interactions en conditions réelles ───────────────────── */

    const names = await page.evaluate(() =>
      document.querySelector('.plaza-root')._plaza.miis.map(m => m.name));
    const forced0 = await page.evaluate(() => {
      const soc = document.querySelector('.plaza-root')._plaza.social;
      return { n: soc.log.filter(l => l.type === 'interaction').length };
    });

    // B1) Conversation forcée (chat) → +40 dans les deux sens.
    const met = await page.evaluate(() =>
      document.querySelector('.plaza-root')._plaza.social.forceMeet(0, 1, 'chat'));
    results.push(['forceMeet accepté (Mii 0 ↔ 1)', met === true, '']);
    await new Promise(r => setTimeout(r, 6000));               // pendant la conversation
    await page.screenshot({ path: path.join(SHOTS_DIR, 'plaza-social-talk.png') });
    const chatLog = await waitInteraction(page, { nameA: names[0], nameB: names[1], kind: 'chat' });
    results.push(['conversation : banque + issue +40 journalisées',
      !!chatLog && typeof chatLog.bank === 'string' && chatLog.delta === 40
      && chatLog.lvAfter.ab - chatLog.lvBefore.ab === 40,
      JSON.stringify({ kind: chatLog.kind, bank: chatLog.bank, before: chatLog.lvBefore, after: chatLog.lvAfter })]);

    // B2) Dispute forcée → −40 (clamp bas).
    await page.evaluate(() => document.querySelector('.plaza-root')._plaza.social.forceMeet(2, 3, 'argue'));
    await new Promise(r => setTimeout(r, 6000));
    await page.screenshot({ path: path.join(SHOTS_DIR, 'plaza-social-argue.png') });
    const argueLog = await waitInteraction(page, { nameA: names[2], nameB: names[3], kind: 'argue' });
    results.push(['dispute : −40 appliqué et clampé',
      !!argueLog && argueLog.kind === 'argue' && argueLog.delta === -40
      && argueLog.lvAfter.ab === Math.max(0, argueLog.lvBefore.ab - 40),
      JSON.stringify({ before: argueLog.lvBefore, after: argueLog.lvAfter })]);

    // B3) Anniversaire : le Mii fêté (le « approché » = miis[5]) → banque Birthday.
    await page.evaluate(() => {
      const soc = document.querySelector('.plaza-root')._plaza.social;
      const T = soc.relations._test;
      T.setBirthday(5, T.gameDay() % 365);
      T.setBdayYear(5, 0);
      T.setTalk(4, 5, soc.relations.time - 1080);
    });
    await page.evaluate(() => document.querySelector('.plaza-root')._plaza.social.forceMeet(4, 5, 'chat'));
    const bdayLog = await waitInteraction(page, { nameA: names[4], nameB: names[5], bank: 'birthday' });
    results.push(['anniversaire en conditions réelles → banque Birthday',
      !!bdayLog && bdayLog.bank === 'birthday',
      JSON.stringify({ bank: bdayLog.bank, a: bdayLog.a, b: bdayLog.b })]);

    // B4) Croisement organique spontané (≤ 75 s) — journal enrichi.
    const t0 = Date.now();
    let organic = 0;
    while (Date.now() - t0 < 75000) {
      organic = await page.evaluate(() => {
        const soc = document.querySelector('.plaza-root')._plaza.social;
        return soc.log.filter(l => l.type === 'interaction'
          && l.kind && l.bank && l.lvBefore && l.lvAfter).length;
      });
      if (organic >= forced0.n + 4) break;
      await new Promise(r => setTimeout(r, 3000));
    }
    const elapsed = ((Date.now() - t0) / 1000).toFixed(0);
    results.push(['croisement organique spontané (≤ 75 s)', organic >= forced0.n + 4,
      `${Math.max(0, organic - (forced0.n + 3))} organique(s) en ${elapsed} s`]);

    // B5) Santé du moteur en fin de session : pas de NaN, tout borné.
    const health = await page.evaluate(() => {
      const soc = document.querySelector('.plaza-root')._plaza.social;
      const snap = soc.relations.snapshot();
      const bad = snap.filter(r => !(r.level >= 0 && r.level <= 200) || !(r.type >= 0 && r.type <= 12));
      const json = JSON.stringify(soc.log);
      const interacts = soc.log.filter(l => l.type === 'interaction');
      const elog = soc.relations.log;
      return {
        bad: bad.length,
        nan: /NaN/.test(json),
        drifts: elog.filter(l => l.type === 'drift').length,
        talks: elog.filter(l => l.type === 'talk').length,
        interacts: interacts.length,
      };
    });
    results.push(['session saine : 0 NaN, niveaux bornés',
      health.bad === 0 && health.nan === false,
      JSON.stringify(health)]);
    results.push(['journal moteur : conversations enregistrées (talk)',
      health.talks >= 3, `drifts=${health.drifts} talks=${health.talks} interactions=${health.interacts}`]);

    await page.screenshot({ path: path.join(SHOTS_DIR, 'plaza-social-engine.png') });

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
