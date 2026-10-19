/**
 * Diagnostic ciblé : ce que préfère-reduced-motion: reduce fait aux CSS réelles
 * du site (wiiMenu.css servi + bloc injecté par emulatorXmb.js).
 * Lancement : node tests/diag-reduced-motion.js
 */
const { chromium } = require('playwright');

const BASE_URL = 'http://localhost:8123/';

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    for (const motion of ['no-preference', 'reduce']) {
      const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
      await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' }).catch(() => {});
      // Injecter le wiiMenu.css réel + le bloc de reduced-motion d'emulatorXmb.js
      await page.evaluate(async () => {
        const cssWii = await (await fetch('/public/css/wiiMenu.css')).text();
        const src = await (await fetch('/public/js/core/emulatorXmb.js')).text();
        const m = src.match(/@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?\n    \}/);
        const style = document.createElement('style');
        style.textContent = cssWii + '\n' + (m ? m[0] : '/* absent */');
        document.head.appendChild(style);
        document.body.innerHTML = `
          <div class="wii-menu">
            <div class="gxmb-banner-track" id="t-banner"></div>
            <div class="gxmb-item" id="t-item"></div>
            <div class="wii-channel" id="t-channel"></div>
          </div>`;
      });
      await page.emulateMedia({ reducedMotion: motion });
      const res = await page.evaluate(() => {
        const g = (sel, pseudo) => {
          const el = document.querySelector(sel);
          if (!el) return null;
          const cs = pseudo ? getComputedStyle(el, pseudo) : getComputedStyle(el);
          return { animName: cs.animationName, animDuration: cs.animationDuration, transitionDuration: cs.transitionDuration };
        };
        return { banner: g('#t-banner'), cover: g('#t-item', '::before'), channel: g('#t-channel') };
      });
      console.log(`--- reduced-motion=${motion} ---`);
      console.log(JSON.stringify(res, null, 1));
      await page.close();
    }
  } finally { await browser.close(); }
})();
