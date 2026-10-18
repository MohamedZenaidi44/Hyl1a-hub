/**
 * Vérification des corrections « Mii Plaza » demandées dans le rapport :
 *
 *  A) deux conversations simultanées : participants distincts, répliques
 *     différentes (registre anti-répétition), échange ordonné (≥ 2 répliques,
 *     jamais la même deux fois de suite) ;
 *  B) plusieurs Mii autour de la fontaine : noms associés aux bons Mii,
 *     toujours juste au-dessus de la tête (nametag simple), bulle ancrée
 *     au-dessus du bon Mii ;
 *  C) déplacement / fin d'interaction : bulle masquée, étiquette solidaire
 *     du groupe (jamais de fantôme à une ancienne position) ;
 *  D) conversations successives : la 2e ne rejoue jamais les répliques de la 1re ;
 *  E) caméra : lisibilité des bulles maintenue quand on zoome (échelle bornée) ;
 *  F) stabilité : 40 s de vie libre — pas de double interaction, pas de bulle
 *     fantôme, pas de conversation bloquée, 0 erreur console.
 *
 * Lancement : node tests/social-scenes-check.js  (serveur requis sur :5500)
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

    /* Les forces organiques sont mises en pause (cooldowns très longs) :
     * les tests A–E pilotent leurs propres paires. F les relâche. */
    await page.evaluate(() => {
      const soc = document.querySelector('.plaza-root')._plaza.social;
      const plaza = document.querySelector('.plaza-root')._plaza;
      for (const m of plaza.miis) m._soc.cooldown = 999;
      soc.log.push({ t: 0, type: 'test', what: 'freeze' });
    });

    const force = async (i, j, kind = 'chat') => {
      for (let k = 0; k < 12; k++) {
        const ok = await page.evaluate((a, b, kd) => {
          const soc = document.querySelector('.plaza-root')._plaza.social;
          return soc.forceMeet(a, b, kd);
        }, i, j, kind);
        if (ok) return true;
        await sleep(400);
      }
      return false;
    };
    /** Bloque les rencontres organiques (cooldowns longs). */
    const freezeAll = () => page.evaluate(() => {
      const plaza = document.querySelector('.plaza-root')._plaza;
      for (const m of plaza.miis) m._soc.cooldown = 999;
    });
    const waitPairsEmpty = async (timeout = 45000) => {
      await page.waitForFunction(() => {
        const soc = document.querySelector('.plaza-root')._plaza.social;
        return soc.pairs.length === 0;
      }, { timeout });
    };
    const settle = async () => { await freezeAll(); await waitPairsEmpty(); };
    const pairInfo = () => page.evaluate(() => document.querySelector('.plaza-root')._plaza.social.pairInfo());
    const bubbleState = (i) => page.evaluate((idx) => {
      return document.querySelector('.plaza-root')._plaza.social.bubbleState(idx);
    }, i);
    const tagState = (i) => page.evaluate((idx) => {
      return document.querySelector('.plaza-root')._plaza.social.tagState(idx);
    }, i);

    /** Collecte les répliques de la paire en cours (phase talk), dans l'ordre. */
    const collectTalk = async (timeout = 25000) => {
      const seq = [];
      const t0 = Date.now();
      while (Date.now() - t0 < timeout) {
        const pins = await pairInfo();
        if (pins.length === 0) break;
        const p = pins[0];
        if (p.phase === 'talk') {
          const t = p.aText || p.bText;
          if (t && seq[seq.length - 1] !== t) seq.push(t);
        }
        await sleep(200);
      }
      return seq;
    };

    /* ───────── A) Deux conversations simultanées ───────── */
    console.log('\n--- Test A : deux conversations simultanées ---');
    R('A0 : deux paires forcées acceptées', (await force(0, 1, 'chat')) && (await force(2, 3, 'chat')));
    let aOk = false, aDetail = '';
    {
      const t0 = Date.now();
      while (Date.now() - t0 < 20000) {
        const pins = await pairInfo();
        if (pins.length === 2 && pins.every((p) => p.phase === 'talk')) {
          const t1 = pins[0].aText || pins[0].bText;
          const t2 = pins[1].aText || pins[1].bText;
          if (t1 && t2) {
            aOk = t1 !== t2;
            aDetail = `"${t1}" vs "${t2}"`;
            break;
          }
        }
        await sleep(150);
      }
    }
    R('A1 : deux locuteurs simultanés, répliques DIFFÉRENTES', aOk, aDetail);
    await page.screenshot({ path: path.join(SHOTS_DIR, 'social-scenes-A.png') });
    {
      const pins = await pairInfo();
      const ids = pins.flatMap((p) => [p.ia, p.ib]);
      R('A2 : participants distincts (aucun Mii dans deux paires)',
        pins.length === 2 && new Set(ids).size === ids.length, JSON.stringify(pins.map((p) => [p.ia, p.ib])));
    }
    {
      const seen = await collectTalk(20000);
      R('A3 : échange ordonné (question puis réponse, ≥ 2 répliques)',
        seen.length >= 2 && seen[0] !== seen[1], `sequence: ${seen.length} repliques`);
    }
    await settle();

    /* ───────── B) Groupe autour de la fontaine ───────── */
    console.log('\n--- Test B : plusieurs Mii autour de la fontaine ---');
    await page.evaluate(() => {
      const plaza = document.querySelector('.plaza-root')._plaza;
      const soc = plaza.social;
      const miis = plaza.miis;
      const obs = plaza.world.poi.obstacles || [];
      const f = obs.filter((o) => o.r >= 4)[0] || { x: 0, z: 0, r: 5 };
      const r = f.r + 1.1;
      for (const [k, i] of [[0, 0], [1, 1], [2, 2]]) {
        const ang = 0.3 + k * 0.22;
        const m = miis[i];
        if (m.busy) continue;
        m.group.position.set(f.x + Math.sin(ang) * r, 0, f.z + Math.cos(ang) * r);
        m.halt();
        m.faceTo(f.x, f.z);
      }
      soc.log.push({ t: 0, type: 'test', what: 'fountain-cluster' });
    });
    await sleep(1800);
    {
      const t0 = await tagState(0), t1 = await tagState(1), t2 = await tagState(2);
      const all = [t0, t1, t2];
      R('B1 : chaque étiquette reste attachée à SON Mii (parent = groupe)',
        all.every((t) => t && t.parentOk));
      const deltas = all.map((t) => +(t.y - t.height).toFixed(2));
      const dmin = Math.min(...deltas), dmax = Math.max(...deltas);
      R('B2 : nametag toujours juste au-dessus de la tête (aucun empilement)',
        all.every((t) => t && isFinite(t.y)) && dmin > 0 && dmax < 0.8 && dmax - dmin < 0.3,
        `écarts tête→nom=${deltas.join(' / ')}`);
      const lat = await page.evaluate(() => {
        const plaza = document.querySelector('.plaza-root')._plaza;
        return [0, 1, 2].map((i) => {
          const p = plaza.miis[i].label.position;
          return Math.abs(p.x) < 1e-6 && Math.abs(p.z) < 1e-6;
        });
      });
      R('B3 : hauteurs finies + ancrage localement vertical (x = z = 0)',
        all.every((t) => isFinite(t.y)) && lat.every(Boolean),
        `y=${all.map((t) => t.y.toFixed(2)).join(' / ')}`);
    }
    {
      const ok = await force(0, 1, 'chat');
      let anchorOk = false, anchorDetail = '';
      const t0 = Date.now();
      while (ok && Date.now() - t0 < 20000) {
        const pins = await pairInfo();
        if (pins.length && pins[0].phase === 'talk') {
          const iA = pins[0].ia, iB = pins[0].ib;
          const bsA = await bubbleState(iA), bsB = await bubbleState(iB);
          const tsA = await tagState(iA), tsB = await tagState(iB);
          const speaker = bsA && bsA.visible && bsA.mode === 'text' ? { b: bsA, t: tsA } : { b: bsB, t: tsB };
          if (speaker.b && speaker.b.visible && speaker.b.mode === 'text') {
            anchorOk = speaker.b.anchorOk && Math.abs(speaker.b.y - (speaker.t.y - 0.10)) < 0.09;
            anchorDetail = `bulle y=${speaker.b.y} / nom y=${speaker.t.y}`;
            break;
          }
        }
        await sleep(150);
      }
      R('B4 : bulle ancrée au-dessus de la tête du locuteur (pas d\'un voisin)', anchorOk, anchorDetail);
    }
    await page.screenshot({ path: path.join(SHOTS_DIR, 'social-scenes-B.png') });
    await settle();
    await sleep(1200);

    /* ───────── C) Fin d'interaction / déplacement ───────── */
    console.log('\n--- Test C : déplacement et fin d\'interaction ---');
    {
      const b0 = await bubbleState(0), b1 = await bubbleState(1);
      // Une PENSÉE (mini-IA) visible sur un Mii libre est légitime après une
      // interaction — seule une réplique de dialogue résiduelle est un bug.
      R('C1 : bulles masquées après la fin de l\'interaction',
        b0 && b1 && (!b0.visible || b0.thought) && (!b1.visible || b1.thought));
      const t0 = await tagState(0);
      R('C2 : étiquette solidaire du groupe (aucune ancienne position)',
        t0 && t0.parentOk);
      const loc = await page.evaluate(() => {
        const m = document.querySelector('.plaza-root')._plaza.miis[0];
        return { lx: +m.label.position.x.toFixed(3), lz: +m.label.position.z.toFixed(3) };
      });
      R('C3 : décalage local du nom purement vertical (x = z = 0)',
        Math.abs(loc.lx) < 0.001 && Math.abs(loc.lz) < 0.001, JSON.stringify(loc));
    }

    /* ───────── D) Conversations successives ───────── */
    console.log('\n--- Test D : conversations successives ---');
    {
      R('D0 : première interaction 4↔5', await force(4, 5, 'chat'));
      const s1 = await collectTalk();
      await settle();
      await sleep(600);
      R('D1 : deuxième interaction 4↔5', await force(4, 5, 'chat'));
      const s2 = await collectTalk();
      await settle();
      const inter = s1.filter((x) => s2.includes(x));
      R('D2 : la 2e conversation ne rejoue PAS les répliques de la 1re',
        s1.length >= 2 && s2.length >= 2 && inter.length === 0,
        `s1=${s1.length} s2=${s2.length} communes=${inter.length}`);
    }

    /* ───────── E) Caméra et lisibilité ───────── */
    console.log('\n--- Test E : caméra et lisibilité des bulles ---');
    {
      const ok = await force(2, 3, 'chat');
      let iv = -1, s0 = 0, d0 = 0;
      const t0 = Date.now();
      while (ok && Date.now() - t0 < 20000) {
        const pins = await pairInfo();
        if (pins.length && pins[0].phase === 'talk') {
          const cand = [pins[0].ia, pins[0].ib];
          for (const i of cand) {
            const b = await bubbleState(i);
            if (b && b.visible && b.mode === 'text') { iv = i; s0 = b.w; break; }
          }
          if (iv >= 0) {
            d0 = await page.evaluate(() => {
              const p = document.querySelector('.plaza-root')._plaza;
              const c = p.world.camera, t = p.world.controls ? p.world.controls.target : { x: 0, y: 0, z: 0 };
              return Math.hypot(c.position.x - t.x, c.position.y - t.y, c.position.z - t.z);
            });
            break;
          }
        }
        await sleep(150);
      }
      await page.evaluate(() => {
        const p = document.querySelector('.plaza-root')._plaza;
        const c = p.world.camera, t = p.world.controls ? p.world.controls.target : null;
        if (t) c.position.sub(t).multiplyScalar(1.28).add(t);
      });
      await sleep(700);
      const bs1 = iv >= 0 ? await bubbleState(iv) : null;
      R('E1 : zoom arrière → bulle agrandie (lisible de loin)',
        !!bs1 && bs1.w > s0 * 1.08, `w ${s0} → ${bs1 ? bs1.w : '?'} (cam ${d0.toFixed(1)})`);
      await page.evaluate(() => {
        const p = document.querySelector('.plaza-root')._plaza;
        const c = p.world.camera, t = p.world.controls ? p.world.controls.target : null;
        if (t) c.position.sub(t).multiplyScalar(0.55).add(t);
      });
      await sleep(700);
      const bs2 = iv >= 0 ? await bubbleState(iv) : null;
      R('E2 : zoom avant → bulle réduite (ne mange pas l\'écran)',
        !!bs2 && bs2.w < s0 * 0.95, `w ${s0} → ${bs2 ? bs2.w : '?'}`);
      await page.evaluate(() => {
        const p = document.querySelector('.plaza-root')._plaza;
        if (p.world.resetView) p.world.resetView();
      });
      await sleep(400);
    }
    await settle();

    /* ───────── F) Stabilité (40 s de vie libre) ───────── */
    console.log('\n--- Test F : stabilité 40 s ---');
    await page.evaluate(() => {
      const plaza = document.querySelector('.plaza-root')._plaza;
      for (const m of plaza.miis) m._soc.cooldown = 2 + Math.random() * 6;
    });
    let maxAge = 0, doublePair = 0, ghosts = 0, nanPos = 0, samples = 0;
    {
      const t0 = Date.now();
      while (Date.now() - t0 < 40000) {
        const st = await page.evaluate(() => {
          const plaza = document.querySelector('.plaza-root')._plaza;
          const soc = plaza.social;
          const pins = soc.pairInfo();
          const ids = pins.flatMap((p) => [p.ia, p.ib]);
          let g = 0;
          for (let i = 0; i < plaza.miis.length; i++) {
            const m = plaza.miis[i];
            const b = soc.bubbleState(i);
            const inPair = ids.includes(i);
            if (b && b.visible && b.mode === 'text' && !b.thought && !inPair && !m.scripted && !m.busy) {
              const t = b.text || '';
              if (!t.startsWith('Je\u2026') && !t.startsWith('\u2026')) g++;
            }
          }
          let bad = 0;
          for (const m of plaza.miis) {
            const p = m.group.position;
            if (!isFinite(p.x) || !isFinite(p.y) || !isFinite(p.z)) bad++;
          }
          return {
            ids, ages: pins.map((p) => p.t), ghost: g, bad, count: pins.length,
          };
        });
        samples++;
        maxAge = Math.max(maxAge, ...(st.ages.length ? st.ages : [0]));
        if (new Set(st.ids).size !== st.ids.length) doublePair++;
        ghosts += st.ghost;
        nanPos += st.bad;
        await sleep(2000);
      }
    }
    R('F1 : jamais un Mii dans deux interactions à la fois', doublePair === 0, `${samples} échantillons`);
    R('F2 : aucune bulle fantôme (conversation terminée qui parle encore)', ghosts === 0);
    R('F3 : positions finies (pas de NaN)', nanPos === 0);
    R('F4 : aucune conversation bloquée (âge max < 35 s)', maxAge < 35, `max=${maxAge.toFixed(1)}s`);
    await page.screenshot({ path: path.join(SHOTS_DIR, 'social-scenes-F.png') });

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
