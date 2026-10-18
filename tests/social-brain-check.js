/**
 * Verification de la « mini-IA » locale des Mii (module social.js) :
 *
 *  G1) rythme du jour : l'horloge injectee pilote les phases
 *      (matin / apres-midi / soir / nuit) ;
 *  G2) pensees visibles : un Mii libre qui decide affiche une bulle texte
 *      de pensee (journal 'thought' + indicateur bubbleState.thought) ;
 *  G3) memoire : apres une interaction, chaque Mii garde un souvenir
 *      (type + partenaire) dans son journal ;
 *  G4) plans : un plan « se reconcilier » supprime les disputes entre les
 *      deux concernes et se solde par un plan 'done' + souvenir ;
 *  G5) repliques contextuelles : un souvenir partage (fou rire) colore la
 *      conversation suivante (scene « on a bien rigole »).
 *
 * Lancement : node tests/social-brain-check.js  (serveur requis sur :5500)
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
  throw new Error('Chrome introuvable (definir CHROME_PATH)');
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function preparePage(page) {
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForSelector('.wii-menu .wii-channel', { timeout: 20000 });
  await page.evaluate(() => {
    const auth = document.getElementById('auth-overlay');
    if (auth) auth.style.display = 'none';
  });
  await sleep(400);
  await page.evaluate(() => {
    const warn = document.getElementById('wii-warning-overlay');
    if (warn) warn.remove();
  });
  await sleep(600);
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
  await sleep(2200);
}

(async () => {
  if (!fs.existsSync(SHOTS_DIR)) fs.mkdirSync(SHOTS_DIR, { recursive: true });
  const results = [];
  const logs = [];
  const R = (name, ok, detail = '') => {
    results.push([name, !!ok, detail]);
    console.log(`   ${ok ? '\u2713' : '\u2717'} ${name}${detail ? ` — ${detail}` : ''}`);
  };

  const browser = await puppeteer.launch({
    executablePath: findChrome(),
    headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--mute-audio', '--hide-scrollbars',
           '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });

  try {
    const page = await browser.newPage();
    page.on('console', (m) => { if (m.type() === 'error') logs.push(`[console.error] ${m.text()}`); });
    page.on('pageerror', (e) => logs.push(`[pageerror] ${e.toString()}`));
    await page.setViewport({ width: 1920, height: 1080 });
    await preparePage(page);
    await launchPlaza(page);

    const freezeAll = () => page.evaluate(() => {
      const plaza = document.querySelector('.plaza-root')._plaza;
      for (const m of plaza.miis) m._soc.cooldown = 999;
    });
    const waitPairsEmpty = (timeout = 45000) => page.waitForFunction(() => {
      const soc = document.querySelector('.plaza-root')._plaza.social;
      return soc.pairs.length === 0;
    }, { timeout });

    await freezeAll();

    /* ───────── G1) Rythme du jour ───────── */
    console.log('\n--- G1 : rythme du jour (horloge injectee) ---');
    {
      const phases = await page.evaluate(() => {
        const soc = document.querySelector('.plaza-root')._plaza.social;
        const T = soc._test;
        const at = (h) => { T.setNow(() => new Date(2026, 0, 15, h, 0, 0)); return soc.phase(); };
        const out = { morning: at(8), afternoon: at(14), evening: at(19), night: at(23), deep: at(3) };
        T.setNow(null);
        return out;
      });
      const ok = phases.morning === 'morning' && phases.afternoon === 'afternoon'
        && phases.evening === 'evening' && phases.night === 'night' && phases.deep === 'night';
      R('G1 : matin/après-midi/soir/nuit depuis l\u2019heure locale', ok, JSON.stringify(phases));
    }

    /* ───────── G2) Pensées visibles ───────── */
    console.log('\n--- G2 : pensees visibles a la decision ---');
    await page.evaluate(() => {
      const plaza = document.querySelector('.plaza-root')._plaza;
      const m = plaza.miis[0];
      plaza.social._test.readyThought(0);
      m._soc.needs.energy = 0.08;    // → intention « banc », donc pensée
      m._soc.needs.social = 0.6;
      m._soc.needs.fun = 0.6;
      m._soc.cooldown = 0;
      m.busy = false; m.scripted = false;
      m.halt();
      m._soc.wander = 0;
    });
    let thought = null;
    {
      const t0 = Date.now();
      while (Date.now() - t0 < 12000) {
        thought = await page.evaluate(() => {
          const plaza = document.querySelector('.plaza-root')._plaza;
          const soc = plaza.social;
          const name = plaza.miis[0].name;
          const found = soc.log.filter((l) => l.type === 'thought' && l.name === name);
          if (!found.length) return null;
          const b = soc.bubbleState(0);
          return { text: found[found.length - 1].text, visible: b && b.visible, isThought: b && b.thought };
        });
        if (thought) break;
        await sleep(250);
      }
    }
    R('G2 : décision de banc → pensée affichée (bulle texte « pensée »)',
      !!thought && /banc|fatigu|pause|jambes/.test(thought.text) && thought.visible && thought.isThought,
      thought ? `"${thought.text}"` : 'aucune pensee');
    await page.screenshot({ path: path.join(SHOTS_DIR, 'social-brain-thought.png') });

    /* ───────── G3) Mémoire ───────── */
    console.log('\n--- G3 : memoire apres interaction ---');
    const names = await page.evaluate(() =>
      document.querySelector('.plaza-root')._plaza.miis.map((m) => m.name));
    // Si m0 s'est assis entre-temps (intention banc de G2), on le relève
    // proprement — forceMeet refuse un Mii en 'sit'.
    await page.evaluate(() => {
      const plaza = document.querySelector('.plaza-root')._plaza;
      const m = plaza.miis[0];
      if (m.state === 'sit') {
        const seat = m.seat;
        if (seat) seat.occupied = false;
        m._soc.sitLeft = 0;
        m._soc.goingSeat = null;
      }
    });
    await sleep(500);
    await page.evaluate(() => {
      const plaza = document.querySelector('.plaza-root')._plaza;
      plaza.miis[0]._soc.cooldown = 0;
      plaza.miis[1]._soc.cooldown = 0;
    });
    const metG3 = await page.evaluate(() =>
      document.querySelector('.plaza-root')._plaza.social.forceMeet(0, 1, 'chat'));
    await waitPairsEmpty();
    const mem = await page.evaluate(() => {
      const soc = document.querySelector('.plaza-root')._plaza.social;
      return { b0: soc.brain(0).memory, b1: soc.brain(1).memory };
    });
    const hasE = (list, kind, who) => list.some((e) => e.kind === kind && e.with === who);
    R('G3 : souvenir partagé (chat) enregistré des deux côtés',
      metG3 === true && hasE(mem.b0, 'chat', names[1]) && hasE(mem.b1, 'chat', names[0]),
      `m0=${mem.b0.length} souvenirs / m1=${mem.b1.length}`);

    /* ───────── G4) Plans ───────── */
    console.log('\n--- G4 : plans a moyen terme ---');
    {
      const draws = await page.evaluate(() => {
        const soc = document.querySelector('.plaza-root')._plaza.social;
        soc._test.setPlan(0, 'reconcile', 1);
        const out = [];
        for (let k = 0; k < 60; k++) out.push(soc.kindFor(0, 1));
        return out;
      });
      const argue = draws.filter((k) => k === 'argue').length;
      R('G4a : plan « se réconcilier » → plus aucune dispute tirée (60 tirages)',
        argue === 0, `argue=${argue}/60`);

      const before = await page.evaluate(() => {
        const soc = document.querySelector('.plaza-root')._plaza.social;
        return soc.brain(0).plan;
      });
      await page.evaluate(() => {
        const plaza = document.querySelector('.plaza-root')._plaza;
        plaza.miis[0]._soc.cooldown = 0;
        plaza.miis[1]._soc.cooldown = 0;
        plaza.social.forceMeet(0, 1, 'chat');
      });
      await waitPairsEmpty();
      const after = await page.evaluate(() => {
        const plaza = document.querySelector('.plaza-root')._plaza;
        const soc = plaza.social;
        return {
          done: soc.log.some((l) => l.type === 'plan' && l.action === 'done'
            && l.name === plaza.miis[0].name),
          mem: soc.brain(0).memory.some((e) => e.kind === 'plan' && e.with === plaza.miis[1].name),
        };
      });
      R('G4b : conversation douce → plan soldé (journal done + souvenir)',
        !!before && before.kind === 'reconcile' && after.done && after.mem,
        `avant=${before ? before.kind : 'aucun'} done=${after.done} souvenir=${after.mem}`);
    }

    /* ───────── G5) Répliques contextuelles ───────── */
    console.log('\n--- G5 : replique contextuelle (souvenir partage) ---');
    {
      // 1) Fabrique un souvenir « fou rire » entre 2 et 3.
      await page.evaluate(() => {
        const plaza = document.querySelector('.plaza-root')._plaza;
        plaza.miis[2]._soc.cooldown = 0;
        plaza.miis[3]._soc.cooldown = 0;
        plaza.social.forceMeet(2, 3, 'laugh');
      });
      await waitPairsEmpty();
      // 2) Force la prochaine scène contextuelle « souvenir » et converse.
      await page.evaluate(() => {
        const plaza = document.querySelector('.plaza-root')._plaza;
        plaza.miis[2]._soc.cooldown = 0;
        plaza.miis[3]._soc.cooldown = 0;
        plaza.social._test.forceContext('mem');
        plaza.social.forceMeet(2, 3, 'chat');
      });
      let ctxText = '';
      {
        const t0 = Date.now();
        let talkSeen = false;
        while (Date.now() - t0 < 30000) {
          // On ne lit que les bulles en MODE TEXTE des deux participants
          // (les émotes de ponctuation du locuteur/écouteur sont ignorées),
          // et on saute la toute fin de la salutation (avant la 1re réplique).
          const st = await page.evaluate(() => {
            const soc = document.querySelector('.plaza-root')._plaza.social;
            const pins = soc.pairInfo();
            const p = pins.find((x) => (x.ia === 2 && x.ib === 3) || (x.ia === 3 && x.ib === 2));
            if (!p || p.phase !== 'talk') return null;
            for (const i of [p.ia, p.ib]) {
              const b = soc.bubbleState(i);
              if (b && b.visible && b.mode === 'text' && !b.thought) return { text: b.text };
            }
            return { text: '' };
          });
          if (st) {
            if (!talkSeen) { talkSeen = true; await sleep(400); continue; }
            if (st.text) { ctxText = st.text; break; }
          }
          await sleep(150);
        }
      }
      const poolOk = await page.evaluate((txt) => {
        const plaza = document.querySelector('.plaza-root')._plaza;
        const soc = plaza.social;
        const a = plaza.miis[2].name, b = plaza.miis[3].name;
        const fill = (s, me, other) => s.replace(/\{me\}/g, me).replace(/\{other\}/g, other);
        for (const scene of soc._test.pools.scenes.memLaugh) {
          for (const line of scene) {
            if (fill(line, a, b) === txt || fill(line, b, a) === txt) return true;
          }
        }
        return false;
      }, ctxText);
      R('G5 : la conversation cite le souvenir (« on a bien rigolé »)',
        !!ctxText && poolOk, ctxText ? `"${ctxText}"` : 'aucune replique capturee');
    }

    await waitPairsEmpty();

    /* ───────── Bilan ───────── */
    console.log('\n=== Erreurs console / page ===');
    if (logs.length === 0) console.log('   aucune');
    else logs.forEach((l) => console.log('   ' + l));
    const failed = results.filter((r) => !r[1]).length;
    console.log(`\n${failed === 0 ? 'RESULTAT : tout passe.' : `RESULTAT : ${failed} echec(s).`}`);
    process.exitCode = failed === 0 && logs.length === 0 ? 0 : 1;
  } catch (e) {
    console.error('ERREUR DE TEST:', e);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
