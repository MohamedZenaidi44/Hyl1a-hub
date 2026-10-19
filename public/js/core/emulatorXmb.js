/**
 * emulatorXmb.js — public/js/core/emulatorXmb.js
 *
 * Menu de sélection commun aux émulateurs (GBA, DS, N64, NES).
 * Visuel « XMB » : pile verticale de jaquettes, panneau d'info (titre,
 * description, temps de jeu, bouton Jouer), aperçu screenshots, recherche,
 * horloge, sortie « B Retour ».
 *
 * Porté depuis apps/gba/js/gba.js pour être partagé par les 4 apps.
 * Chaque app fournit : jeux, wallpaper, playtimes, lancement, fermeture.
 */

/* Géométrie de la pile de jaquettes (colonne gauche) */
const XMB_GAP      = 268;  // écart vertical entre le centre de deux jaquettes
const XMB_MAX_DIST = 2;    // au-delà, la jaquette est masquée (peu d'éléments visibles)
const XMB_CURVE    = 18;   // intensité de la courbe (arc) — px de décalage horizontal par cran

/* État global du menu actif (un seul menu ouvert à la fois) */
let activeXmb = null;

/* Normalise une chaîne pour une recherche insensible à la casse et aux accents */
function xmbNormalize(str) {
  return (str || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().trim();
}

/* ════════════════════════════════════════════════════════════════════
   STYLES
   ════════════════════════════════════════════════════════════════════ */
function injectXmbBaseStyles() {
  if (document.getElementById('gxmb-styles')) return;
  const style = document.createElement('style');
  style.id = 'gxmb-styles';
  style.textContent = `
    /* ── Racine : le wallpaper (ci-dessous) recouvre le fond de l'accueil ── */
    .gxmb-root {
      position: relative; width: 100%; height: 100%; overflow: hidden;
      display: flex; flex-direction: row; align-items: stretch;
      background: transparent;
      font-family: var(--font-main, 'Nunito', 'Inter', sans-serif);
      color: #fff;
      animation: gxmbIn .45s cubic-bezier(.22,1,.36,1);
    }
    @keyframes gxmbIn { from { opacity: 0; } to { opacity: 1; } }

    /* ── Wallpaper de l'émulateur : image injectée par app (#xmb-wall-<app>),
       identique dans les deux thèmes. Le motif Nintendo ci-dessous ne sert
       que de fond de secours si l'image ne charge pas. ── */
    .gxmb-wallpaper {
      position: absolute; inset: 0; pointer-events: none; z-index: 0;
      --wl-base-a: #07080b; --wl-base-b: #0d0f14; --wl-base-c: #161921;
      --wl-glow-a: rgba(110,140,205,.14); --wl-glow-b: rgba(80,105,165,.10);
      --wl-dot: rgba(255,255,255,.055); --wl-band: rgba(255,255,255,.03);
      --wl-vignette: rgba(0,0,0,.55);
      background-color: transparent;
      background-image:
        radial-gradient(150% 130% at 50% 42%, rgba(0,0,0,0) 55%, var(--wl-vignette) 100%),
        radial-gradient(1200px 780px at 84% 10%, var(--wl-glow-a) 0%, rgba(0,0,0,0) 62%),
        radial-gradient(980px 720px at 6% 96%, var(--wl-glow-b) 0%, rgba(0,0,0,0) 58%),
        radial-gradient(circle, var(--wl-dot) 1.3px, rgba(0,0,0,0) 1.7px),
        repeating-linear-gradient(115deg, var(--wl-band) 0 2px, rgba(0,0,0,0) 2px 88px),
        linear-gradient(135deg, var(--wl-base-a) 0%, var(--wl-base-b) 54%, var(--wl-base-c) 100%);
      background-size: auto, auto, auto, 26px 26px, auto, auto;
      background-position: center;
    }
    body.theme-white .gxmb-wallpaper {
      --wl-base-a: #fbfcfe; --wl-base-b: #eef1f6; --wl-base-c: #dfe4ee;
      --wl-glow-a: rgba(255,255,255,.95); --wl-glow-b: rgba(150,172,210,.18);
      --wl-dot: rgba(28,48,92,.06); --wl-band: rgba(255,255,255,.60);
      --wl-vignette: rgba(28,44,74,.14);
    }

    /* Voile de lisibilité (l'image est claire) : assombrit le flanc gauche
       — liste + textes — et la bande basse. La bande haute (horloge, nom de
       l'émulateur…) reste quasi transparente pour laisser voir le wallpaper.
       Il s'adapte au thème ; l'image de fond, elle, ne change jamais. */
    .gxmb-scrim {
      position: absolute; inset: 0; pointer-events: none; z-index: 0;
      background:
        linear-gradient(90deg, rgba(0,0,0,0.58) 0%, rgba(0,0,0,0.44) 28%, rgba(0,0,0,0.16) 54%, rgba(0,0,0,0) 74%),
        linear-gradient(180deg, rgba(0,0,0,0.14) 0%, rgba(0,0,0,0) 15%, rgba(0,0,0,0) 82%, rgba(0,0,0,0.34) 100%);
    }
    body.theme-white .gxmb-scrim {
      background:
        linear-gradient(90deg, rgba(255,255,255,0.62) 0%, rgba(255,255,255,0.42) 28%, rgba(255,255,255,0.14) 54%, rgba(255,255,255,0) 74%),
        linear-gradient(180deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0) 15%, rgba(255,255,255,0) 82%, rgba(255,255,255,0.34) 100%);
    }

    /* ── Bandeau supérieur : trois zones (recherche | bannière | horloge+retour) ── */
    .gxmb-topbar {
      position: absolute; top: 0; left: 0; right: 0; z-index: 6;
      display: flex; align-items: center; gap: 18px;
      padding: 28px 40px 0 44px; pointer-events: none;
    }
    .gxmb-search-zone {
      pointer-events: auto; flex: 0 0 auto; display: flex; flex-direction: column; gap: 6px;
    }
    .gxmb-exit {
      pointer-events: auto; display: flex; align-items: center; gap: 8px; cursor: pointer;
      user-select: none; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.16);
      backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
      border-radius: 40px; padding: 7px 16px 7px 8px; font-size: 12px; font-weight: 800;
      letter-spacing: 0.5px; color: rgba(255,255,255,0.85); transition: all .2s ease;
    }
    .gxmb-exit:hover { background: rgba(255,255,255,0.16); }
    .gxmb-exit b {
      width: 18px; height: 18px; border-radius: 50%; background: rgba(255,255,255,0.9); color: #111;
      display: flex; align-items: center; justify-content: center; font-size: 10px;
    }

    /* ── Barre de recherche : ancrée le plus à gauche, un peu plus grande ── */
    .gxmb-search {
      pointer-events: auto; display: flex; align-items: center; gap: 10px;
      background: rgba(255,255,255,0.09); border: 1px solid rgba(255,255,255,0.18);
      backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
      border-radius: 44px; padding: 11px 20px; width: 280px;
      transition: width .25s ease, background .2s ease, border-color .2s ease;
    }
    .gxmb-search:focus-within {
      width: 360px; background: rgba(255,255,255,0.15);
      border-color: color-mix(in srgb, var(--theme-accent, #fff) 55%, transparent);
    }
    .gxmb-search svg { width: 17px; height: 17px; flex: 0 0 auto; stroke: rgba(255,255,255,0.65); }
    .gxmb-search input {
      flex: 1; min-width: 0; background: transparent; border: none; outline: none;
      color: #fff; font-size: 14.5px; font-weight: 700; font-family: inherit;
    }
    .gxmb-search input::placeholder { color: rgba(255,255,255,0.45); font-weight: 600; }
    .gxmb-search-clear {
      flex: 0 0 auto; display: none; align-items: center; justify-content: center;
      width: 18px; height: 18px; border-radius: 50%; cursor: pointer;
      color: rgba(255,255,255,0.55); background: rgba(255,255,255,0.1);
      font-size: 12px; line-height: 1;
    }
    .gxmb-search-clear:hover { background: rgba(255,255,255,0.2); color: #fff; }
    .gxmb-search.has-query .gxmb-search-clear { display: flex; }
    .gxmb-search-zone .gxmb-count {
      padding-left: 22px; font-size: 11px; font-weight: 800; letter-spacing: 1.2px;
      color: rgba(255,255,255,0.4); text-transform: uppercase;
    }

    /* ── Bannière centrale défilante, façon accueil ── */
    .gxmb-banner-wrap {
      pointer-events: none; flex: 1; min-width: 0; align-self: flex-start;
      display: flex; justify-content: center;
    }
    .gxmb-banner {
      max-width: min(820px, 100%); width: 100%; overflow: hidden;
      background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.16);
      backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
      border-radius: 44px; padding: 16px 0;
      -webkit-mask-image: linear-gradient(90deg, transparent 0, #000 8%, #000 92%, transparent 100%);
              mask-image: linear-gradient(90deg, transparent 0, #000 8%, #000 92%, transparent 100%);
    }
    .gxmb-banner-track {
      display: flex; width: max-content; white-space: nowrap;
      animation: gxmb-marquee 26s linear infinite;
    }
    .gxmb-banner-text {
      font-size: 17px; font-weight: 700; letter-spacing: 0.3px;
      color: rgba(255,255,255,0.85); text-shadow: 0 2px 8px rgba(0,0,0,0.4);
      padding-right: 56px;
    }
    @keyframes gxmb-marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }

    /* ── Zone droite : horloge + retour ── */
    .gxmb-topright {
      pointer-events: auto; flex: 0 0 auto; display: flex; align-items: center; gap: 16px;
    }
    .gxmb-clock {
      display: flex; flex-direction: column; align-items: flex-end; line-height: 1.1;
      transform: translateY(-8px);
    }
    .gxmb-clock-time {
      font-size: 48px; font-weight: 900; color: #fff; text-shadow: 0 2px 14px rgba(0,0,0,0.6);
      letter-spacing: 0.5px;
    }
    .gxmb-clock-time .am-pm { font-size: 16px; font-weight: 800; opacity: 0.7; margin-left: 4px; }
    .gxmb-clock-date {
      font-size: 14px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase;
      color: rgba(255,255,255,0.55);
    }

    /* ── Colonne gauche : pile verticale de jaquettes ── */
    .gxmb-stage {
      position: relative; z-index: 2; flex: 0 0 470px;
      display: flex; align-items: center; justify-content: center;
      padding-left: 56px;
    }
    .gxmb-track { position: relative; width: 100%; height: 100%; }

    .gxmb-item {
      position: absolute; top: 50%; left: 40px;
      width: 174px; height: 244px;
      transform: translate(0, -50%);
      transition: transform .55s cubic-bezier(.22,1,.36,1),
                  opacity .5s ease, filter .5s ease;
      will-change: transform, opacity;
      cursor: pointer;
    }
    /* Contour des jaquettes : dégradé monochrome animé, recoloré par thème */
    .gxmb-item::before {
      content: '';
      position: absolute; inset: -5px; z-index: -1;
      border-radius: 19px;
      background: linear-gradient(125deg, var(--gxmb-frame-a, #0a0b0d), var(--gxmb-frame-b, #454a54) 38%, var(--gxmb-frame-mid, #171a20) 62%, var(--gxmb-frame-a, #0a0b0d));
      background-size: 300% 300%;
      animation: gxmb-border-flow 6s ease-in-out infinite;
      opacity: 0.55;
      transition: opacity .5s ease;
    }
    .gxmb-item.is-active::before { opacity: 1; }
    @keyframes gxmb-border-flow {
      0%   { background-position: 0% 50%; }
      50%  { background-position: 100% 50%; }
      100% { background-position: 0% 50%; }
    }
    .gxmb-cover {
      width: 100%; height: 100%; border-radius: 14px; overflow: hidden; position: relative;
      box-shadow: 0 18px 40px rgba(0,0,0,0.45);
      transition: box-shadow .5s ease;
    }
    .gxmb-item.is-active .gxmb-cover {
      box-shadow: 0 24px 50px rgba(0,0,0,0.55);
    }
    .gxmb-cover img {
      width: 100%; height: 100%; object-fit: cover; display: block;
    }
    .gxmb-cover .gxmb-fallback {
      width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center;
      justify-content: center; gap: 8px; text-align: center; padding: 10px;
      background: linear-gradient(160deg, rgba(255,255,255,0.14), rgba(255,255,255,0.03));
      border: 1px solid rgba(255,255,255,0.12);
    }
    .gxmb-fallback .gxmb-fallback-glyph { font-size: 28px; opacity: 0.8; }
    .gxmb-fallback .gxmb-fallback-name {
      font-size: 12px; font-weight: 800; line-height: 1.3; color: rgba(255,255,255,0.85);
    }

    /* Chevrons discrets, visibles seulement s'il y a plus d'items */
    .gxmb-nav {
      position: absolute; left: 40px; width: 174px; z-index: 3;
      display: flex; align-items: center; justify-content: center; height: 34px;
      color: rgba(255,255,255,0.45); cursor: pointer; opacity: 0; transition: opacity .25s ease, color .2s ease;
      pointer-events: none;
    }
    .gxmb-nav.is-visible { opacity: 1; pointer-events: auto; }
    .gxmb-nav:hover { color: rgba(255,255,255,0.9); }
    .gxmb-nav svg { width: 20px; height: 20px; stroke: currentColor; }
    .gxmb-nav-up   { top: 4%; }
    .gxmb-nav-down { bottom: 4%; }

    /* ── Panneau d'information (droite) ── */
    .gxmb-panel {
      position: relative; z-index: 2; flex: 1; min-width: 0;
      display: flex; flex-direction: row; align-items: center;
      gap: clamp(28px, 5vw, 80px);
      padding: 0 clamp(24px, 5vw, 72px) 0 clamp(24px, 4vw, 56px);
      padding-top: clamp(24px, 5vh, 56px); /* descend légèrement le contenu par rapport au centre pur */
    }
    .gxmb-info-text { flex: 1; min-width: 0; max-width: 480px; display: flex; flex-direction: column; gap: 16px; }

    .gxmb-eyebrow {
      font-size: 12px; font-weight: 800; letter-spacing: 3px; text-transform: uppercase;
      color: rgba(255,255,255,0.55); text-shadow: 0 2px 6px rgba(0,0,0,0.5);
    }
    .gxmb-title {
      margin: 0; font-size: clamp(32px, 3.8vw, 50px); font-weight: 900; line-height: 1.06;
      letter-spacing: -0.01em; color: #fff; text-shadow: 0 4px 22px rgba(0,0,0,0.55);
    }
    .gxmb-desc {
      margin: 0; font-size: clamp(16px, 1.5vw, 19px); line-height: 1.65; font-weight: 600;
      color: rgba(255,255,255,0.82); text-shadow: 0 2px 10px rgba(0,0,0,0.5);
      display: -webkit-box; -webkit-line-clamp: 6; -webkit-box-orient: vertical; overflow: hidden;
    }
    .gxmb-meta {
      display: inline-flex; align-items: center; gap: 7px;
      font-size: 12px; font-weight: 800; letter-spacing: 0.8px; text-transform: uppercase;
      color: rgba(255,255,255,0.6); text-shadow: 0 2px 8px rgba(0,0,0,0.5);
    }
    .gxmb-meta .dot { width: 4px; height: 4px; border-radius: 50%; background: rgba(255,255,255,0.4); }

    .gxmb-play {
      display: flex; align-items: center; justify-content: center; gap: 10px;
      border: none; cursor: pointer; border-radius: 40px; padding: 16px 32px 16px 24px;
      font-size: 15px; font-weight: 800; letter-spacing: 0.5px;
      background: color-mix(in srgb, var(--theme-accent, #fff) 92%, transparent);
      color: #0a0a0a;
      box-shadow: 0 10px 26px color-mix(in srgb, var(--theme-accent, #fff) 35%, transparent);
      transition: transform .18s cubic-bezier(.25,1.5,.5,1), box-shadow .2s ease;
    }
    .gxmb-play:hover { transform: scale(1.03); }
    .gxmb-play:active { transform: scale(0.98); }
    .gxmb-play svg { width: 16px; height: 16px; fill: currentColor; }

    /* ── Aperçu (droite du panneau, centré verticalement, agrandi) ── */
    .gxmb-preview { flex-shrink: 0; width: min(860px, 56vw); display: flex; flex-direction: column; gap: 18px; }
    .gxmb-preview-frame {
      position: relative; z-index: 0; width: 100%; aspect-ratio: 3 / 2; border-radius: 18px;
      box-shadow: 0 24px 60px rgba(0,0,0,0.5);
    }
    /* Même contour monochrome animé que les jaquettes */
    .gxmb-preview-frame::before {
      content: '';
      position: absolute; inset: -5px; z-index: -1;
      border-radius: 23px;
      background: linear-gradient(125deg, var(--gxmb-frame-a, #0a0b0d), var(--gxmb-frame-b, #454a54) 38%, var(--gxmb-frame-mid, #171a20) 62%, var(--gxmb-frame-a, #0a0b0d));
      background-size: 300% 300%;
      animation: gxmb-border-flow 6s ease-in-out infinite;
    }
    .gxmb-preview-inner {
      position: relative; width: 100%; height: 100%; border-radius: 18px; overflow: hidden;
      background: rgba(255,255,255,0.05);
    }
    .gxmb-preview-img {
      position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover;
      opacity: 0; transition: opacity .7s ease;
    }
    .gxmb-preview-img.is-active { opacity: 1; }
    .gxmb-preview-empty {
      position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
      font-size: 11px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase;
      color: rgba(255,255,255,0.35);
    }
    .gxmb-preview-dots { display: flex; gap: 6px; justify-content: center; }
    .gxmb-preview-dot {
      width: 6px; height: 6px; border-radius: 50%; background: rgba(255,255,255,0.28); cursor: pointer;
      transition: all .2s ease;
    }
    .gxmb-preview-dot.is-active {
      background: color-mix(in srgb, var(--theme-accent, #fff) 85%, transparent); transform: scale(1.3);
    }

    /* ── Bouton Jouer + temps de jeu, coin bas-droit de l'écran ── */
    .gxmb-corner {
      position: absolute; z-index: 6;
      right: clamp(24px, 5vw, 72px); bottom: clamp(28px, 6vh, 64px);
      display: flex; flex-direction: column; align-items: flex-end; gap: 12px;
    }

    /* Petit fondu du panneau texte au changement de jeu */
    .gxmb-info-text, .gxmb-preview, .gxmb-corner { transition: opacity .22s ease; }
    .gxmb-info-text.is-swapping, .gxmb-preview.is-swapping, .gxmb-corner.is-swapping { opacity: 0; }

    @media (max-width: 900px) {
      .gxmb-panel { flex-direction: column; align-items: flex-start; justify-content: center; gap: 20px; }
      .gxmb-preview { width: min(460px, 80vw); }
      .gxmb-stage { flex-basis: 280px; padding-left: 30px; }
      .gxmb-item { width: 132px; height: 186px; left: 20px; }
      .gxmb-nav { left: 20px; width: 132px; }
      .gxmb-corner {
        position: static; align-items: flex-start; margin: 12px clamp(24px, 4vw, 56px) 24px;
      }
      .gxmb-topbar { padding: 18px 20px 0 24px; gap: 10px; }
      .gxmb-banner-wrap { display: none; } /* pas assez de place en dessous de 900px */
      .gxmb-search { width: 160px; padding: 8px 14px; }
      .gxmb-search:focus-within { width: 200px; }
      .gxmb-clock-time { font-size: 16px; }
      .gxmb-clock-date { display: none; }
    }

    /* ══════════ iiSU / Wii U — surcouche v2 ══════════ */
    .gxmb-root {
      --gxmb-accent: var(--accent, #4aa3ff);
      --gxmb-accent-glow: var(--accent-glow, rgba(74,163,255,.35));
      --gxmb-glass: var(--panel-bg, rgba(255,255,255,.12));
      --gxmb-glass-border: var(--panel-border, rgba(255,255,255,.20));
      --gxmb-text: var(--panel-text, #ffffff);
      --gxmb-text-muted: var(--panel-text-muted, rgba(255,255,255,.6));
      --gxmb-frame-a: #08090c; --gxmb-frame-b: #4b515c; --gxmb-frame-mid: #171a20;
      --gxmb-frame-glow: rgba(168,190,228,.20);
      --gxmb-ease: cubic-bezier(.22,1,.36,1);
    }

    /* Scrim adapté au thème clair / sombre */
    body.theme-white .gxmb-scrim {
      background:
        radial-gradient(1100px 720px at 0% 50%, rgba(255,255,255,.74) 0%, rgba(255,255,255,.44) 42%, rgba(255,255,255,0) 74%),
        linear-gradient(180deg, rgba(255,255,255,.46) 0%, rgba(255,255,255,0) 22%, rgba(255,255,255,0) 78%, rgba(255,255,255,.46) 100%);
    }
    body.theme-white .gxmb-root {
      color: #12203a;
      --gxmb-frame-a: #ffffff; --gxmb-frame-b: #b9c1cf; --gxmb-frame-mid: #eef1f6;
      --gxmb-frame-glow: rgba(66,88,128,.30);
    }

    /* Bandeau titre Wii U centré */
    .gxmb-titlebar { flex: 1; min-width: 0; display: flex; justify-content: center; align-items: center; pointer-events: none; }
    .gxmb-titlebar-text {
      font-size: clamp(13px, 1.4vw, 19px); font-weight: 900; letter-spacing: 3px; text-transform: uppercase;
      color: var(--gxmb-text); text-shadow: 0 2px 12px rgba(0,0,0,.45);
      padding: 9px 26px; border-radius: 40px;
      background: var(--gxmb-glass); border: 1px solid var(--gxmb-glass-border);
      backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
    }
    body.theme-white .gxmb-titlebar-text { text-shadow: 0 1px 6px rgba(255,255,255,.6); }

    /* Verre : recherche, retour, horloge */
    .gxmb-search, .gxmb-exit { background: var(--gxmb-glass) !important; border-color: var(--gxmb-glass-border) !important; }
    .gxmb-search:focus-within { border-color: var(--gxmb-accent) !important; box-shadow: 0 0 0 3px var(--gxmb-accent-glow); }
    .gxmb-search input { color: var(--gxmb-text) !important; }
    .gxmb-search svg { stroke: var(--gxmb-text-muted) !important; }
    .gxmb-search input::placeholder { color: var(--gxmb-text-muted) !important; }
    .gxmb-exit { color: var(--gxmb-text) !important; }
    .gxmb-count { color: var(--gxmb-text-muted) !important; }
    .gxmb-clock-time { color: var(--gxmb-text) !important; }
    body.theme-white .gxmb-clock-time { text-shadow: 0 2px 10px rgba(255,255,255,.6); }

    /* Jaquettes : contour monochrome animé (discret au repos, renforcé sur l'actif) + reflet */
    .gxmb-item::before {
      background: linear-gradient(125deg, var(--gxmb-frame-a), var(--gxmb-frame-b) 38%, var(--gxmb-frame-mid) 62%, var(--gxmb-frame-a)) !important;
      background-size: 300% 300% !important; opacity: .55 !important;
    }
    .gxmb-item.is-active::before { opacity: 1 !important; }
    .gxmb-cover { border-radius: 16px !important; box-shadow: 0 16px 40px rgba(0,0,0,.5) !important; }
    .gxmb-item.is-active .gxmb-cover { box-shadow: 0 24px 60px rgba(0,0,0,.55), 0 0 42px var(--gxmb-frame-glow) !important; }
    body.theme-white .gxmb-cover { box-shadow: 0 14px 34px rgba(35,55,95,.20) !important; }
    body.theme-white .gxmb-item.is-active .gxmb-cover { box-shadow: 0 20px 48px rgba(35,55,95,.28), 0 0 40px var(--gxmb-frame-glow) !important; }
    .gxmb-cover::after {
      content: ''; position: absolute; inset: 0; border-radius: inherit; pointer-events: none;
      background: linear-gradient(180deg, rgba(255,255,255,0) 55%, rgba(255,255,255,.12) 100%);
    }

    /* Aperçu : même contour monochrome animé que les jaquettes */
    .gxmb-preview-frame::before {
      background: linear-gradient(125deg, var(--gxmb-frame-a), var(--gxmb-frame-b) 38%, var(--gxmb-frame-mid) 62%, var(--gxmb-frame-a)) !important;
      background-size: 300% 300% !important;
    }

    /* Bouton Jouer + pastilles : monochromes, recolorés par thème */
    .gxmb-play { background: var(--theme-accent, #f5f5f5) !important; color: #0a0a0a !important; box-shadow: 0 12px 26px rgba(0,0,0,.28) !important; }
    body.theme-white .gxmb-play { color: #fff !important; box-shadow: 0 12px 26px rgba(16,16,16,.30) !important; }
    body.theme-black .gxmb-play { box-shadow: 0 12px 30px rgba(255,255,255,.16) !important; }
    .gxmb-preview-dot.is-active { background: var(--gxmb-text, #fff) !important; }
    body.theme-white .gxmb-preview-dot { background: rgba(20,35,60,.28); }

    /* Textes adaptés au thème clair */
    body.theme-white .gxmb-title { color: #0e1a30; text-shadow: 0 4px 20px rgba(255,255,255,.5) !important; }
    body.theme-white .gxmb-desc { color: rgba(20,35,60,.82); text-shadow: none !important; }
    body.theme-white .gxmb-eyebrow { color: rgba(20,35,60,.55); text-shadow: none !important; }
    body.theme-white .gxmb-meta { color: rgba(20,35,60,.6); text-shadow: none !important; }
    body.theme-white .gxmb-item-count { color: rgba(20,35,60,.6); }
    body.theme-white .gxmb-clock-date { color: rgba(20,35,60,.55); }
    body.theme-white .gxmb-banner { background: rgba(255,255,255,.55); border-color: rgba(160,180,210,.45); }
    body.theme-white .gxmb-banner-text { color: rgba(20,35,60,.80); text-shadow: none !important; }
    body.theme-white .gxmb-nav { color: rgba(20,35,60,.45); }
    body.theme-white .gxmb-nav:hover { color: rgba(20,35,60,.85); }
    body.theme-white .gxmb-search-clear { color: rgba(20,35,60,.55); background: rgba(20,35,60,.08); }
    body.theme-white .gxmb-search-clear:hover { background: rgba(20,35,60,.16); color: #12203a; }
    body.theme-white .gxmb-preview-inner { background: rgba(255,255,255,.55); }
    body.theme-white .gxmb-preview-empty { color: rgba(20,35,60,.35); }

    /* Parallaxe douce */
    .gxmb-stage, .gxmb-panel { transition: transform .35s var(--gxmb-ease); will-change: transform; }
    .gxmb-root.is-parallax .gxmb-stage { transform: translateY(var(--gxmb-px, 0px)); }
    .gxmb-root.is-parallax .gxmb-panel { transform: translateY(calc(var(--gxmb-px, 0px) * -.35)); }

    /* Mouvement réduit : volontairement ignoré — la banderole et le contour
       animé des jaquettes font partie de l'identité console (cf. hub.css). */

    @media (max-width: 640px) {
      .gxmb-titlebar { display: none; }
      .gxmb-stage { flex-basis: 200px; padding-left: 16px; }
      .gxmb-item { width: 108px; height: 152px; left: 12px; }
      .gxmb-nav { left: 12px; width: 108px; }
      .gxmb-title { font-size: 26px !important; }
      .gxmb-preview { width: min(360px, 78vw) !important; }
    }
  `;
  document.head.appendChild(style);
}

/* Wallpaper spécifique à l'émulateur : image (identique dans les deux thèmes)
   + couches de secours. L'id est plus spécifique que .gxmb-wallpaper, donc
   cette règle remplace proprement la couche image de base. */
function injectXmbWallpaperStyle(appId, wallpaper, fallbackColor) {
  const styleId = `xmb-wall-${appId}-styles`;
  if (document.getElementById(styleId)) return;
  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    #xmb-wall-${appId} {
      background-color: ${fallbackColor};
      background-image:
        url('${wallpaper}'),
        radial-gradient(150% 130% at 50% 42%, rgba(0,0,0,0) 55%, var(--wl-vignette) 100%),
        radial-gradient(1200px 780px at 84% 10%, var(--wl-glow-a) 0%, rgba(0,0,0,0) 62%),
        radial-gradient(980px 720px at 6% 96%, var(--wl-glow-b) 0%, rgba(0,0,0,0) 58%),
        radial-gradient(circle, var(--wl-dot) 1.3px, rgba(0,0,0,0) 1.7px),
        repeating-linear-gradient(115deg, var(--wl-band) 0 2px, rgba(0,0,0,0) 2px 88px),
        linear-gradient(135deg, var(--wl-base-a) 0%, var(--wl-base-b) 54%, var(--wl-base-c) 100%);
      background-size: cover, auto, auto, auto, 26px 26px, auto, auto;
      background-position: center;
    }
  `;
  document.head.appendChild(style);
}

/* ════════════════════════════════════════════════════════════════════
   NETTOYAGE
   ════════════════════════════════════════════════════════════════════ */
export function destroyEmulatorXmb() {
  if (!activeXmb) return;
  if (activeXmb.clockTimer) { clearInterval(activeXmb.clockTimer); activeXmb.clockTimer = null; }
  if (activeXmb.slideTimer) { clearInterval(activeXmb.slideTimer); activeXmb.slideTimer = null; }
  if (activeXmb.keyHandler) {
    window.removeEventListener('keydown', activeXmb.keyHandler, true);
    if (window._gxmbKeyHandler === activeXmb.keyHandler) window._gxmbKeyHandler = null;
    activeXmb.keyHandler = null;
  }
  activeXmb = null;
}

/* ════════════════════════════════════════════════════════════════════
   RENDU
   ════════════════════════════════════════════════════════════════════ */
function buildXmbItemsHtml(games) {
  let itemsHtml = '';
  games.forEach((game, i) => {
    const inner = game.cover
      ? `<img src="${game.cover}" alt="${game.name}"
           onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
         <div class="gxmb-fallback" style="display:none;">
           <span class="gxmb-fallback-glyph">🎮</span>
           <span class="gxmb-fallback-name">${game.name}</span>
         </div>`
      : `<div class="gxmb-fallback">
           <span class="gxmb-fallback-glyph">🎮</span>
           <span class="gxmb-fallback-name">${game.name}</span>
         </div>`;
    itemsHtml += `
      <div class="gxmb-item" data-index="${i}">
        <div class="gxmb-cover">${inner}</div>
      </div>`;
  });
  return itemsHtml;
}

/**
 * Crée le menu XMB de l'émulateur dans `container`.
 *
 * config = {
 *   appId,                 // 'gba' | 'ds' | 'nes' | 'n64' (id du wallpaper)
 *   wrapperClass,          // classe historique (wallpapers CSS/tests), ex 'ds-menu-wrapper'
 *   games,                 // [{ name, file, cover, description, screenshots? }]
 *   state,                 // { index } persistant entre les ouvertures
 *   titlebar,              // texte du bandeau central, ex 'Émulateur DS'
 *   wallpaper,             // url de l'image de fond
 *   wallpaperFallback,     // couleur de secours du wallpaper
 *   emuIframeMatch,        // ex 'ds_player.html' (détection du lecteur actif)
 *   getPlaytimes,          // () => objet { [nom]: minutes }
 *   launch,                // (game) => void
 *   close,                 // () => void (B Retour)
 * }
 */
export function createEmulatorXmb(container, config) {
  injectXmbBaseStyles();
  injectXmbWallpaperStyle(config.appId, config.wallpaper, config.wallpaperFallback);
  destroyEmulatorXmb();

  const state = config.state || (config.state = { index: 0 });
  let games = config.games.slice();
  let slideIndex = 0;

  if (state.index < 0) state.index = 0;
  if (state.index >= games.length) state.index = games.length - 1;

  const itemsHtml = buildXmbItemsHtml(games);
  const rootClass = ['gxmb-root', config.wrapperClass].filter(Boolean).join(' ');

  container.innerHTML = `
    <div class="${rootClass}" tabindex="-1">
      <div class="gxmb-wallpaper" id="xmb-wall-${config.appId}"></div>
      <div class="gxmb-scrim"></div>

      <div class="gxmb-topbar">
        <div class="gxmb-search-zone">
          <div class="gxmb-search" id="gxmb-search">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" id="gxmb-search-input" placeholder="Rechercher un jeu…" autocomplete="off" spellcheck="false" />
            <div class="gxmb-search-clear" id="gxmb-search-clear">✕</div>
          </div>
          <div class="gxmb-count" id="gxmb-count"></div>
        </div>

        <div class="gxmb-titlebar"><span class="gxmb-titlebar-text">${config.titlebar}</span></div>

        <div class="gxmb-topright">
          <div class="gxmb-clock" id="gxmb-clock">
            <div class="gxmb-clock-time" id="gxmb-clock-time">--:--</div>
            <div class="gxmb-clock-date" id="gxmb-clock-date"></div>
          </div>
          <div class="gxmb-exit" id="gxmb-exit"><b>B</b> Retour</div>
        </div>
      </div>

      <div class="gxmb-stage">
        <div class="gxmb-nav gxmb-nav-up" id="gxmb-nav-up">
          <svg viewBox="0 0 24 24" fill="none" stroke-width="2.4"><polyline points="18 15 12 9 6 15"/></svg>
        </div>
        <div class="gxmb-track" id="gxmb-track">${itemsHtml}</div>
        <div class="gxmb-nav gxmb-nav-down" id="gxmb-nav-down">
          <svg viewBox="0 0 24 24" fill="none" stroke-width="2.4"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
      </div>

      <div class="gxmb-panel">
        <div class="gxmb-info-text" id="gxmb-info-text">
          <div class="gxmb-eyebrow" id="gxmb-eyebrow"></div>
          <h1 class="gxmb-title" id="gxmb-title"></h1>
          <p class="gxmb-desc" id="gxmb-desc"></p>
        </div>
        <div class="gxmb-preview" id="gxmb-preview">
          <div class="gxmb-preview-frame" id="gxmb-preview-frame">
            <div class="gxmb-preview-inner" id="gxmb-preview-inner">
              <div class="gxmb-preview-empty" id="gxmb-preview-empty">Aperçu à venir</div>
            </div>
          </div>
          <div class="gxmb-preview-dots" id="gxmb-preview-dots"></div>
        </div>
      </div>

      <div class="gxmb-corner" id="gxmb-corner">
        <button class="gxmb-play" id="gxmb-play">
          <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
          Jouer
        </button>
        <div class="gxmb-meta" id="gxmb-meta"></div>
      </div>
    </div>
  `;

  activeXmb = { container, config, clockTimer: null, slideTimer: null, keyHandler: null };

  const root = container.querySelector('.gxmb-root');
  root.focus();

  /* Parallaxe douce au survol (toujours active : mouvement réduit ignoré) */
  {
    root.classList.add('is-parallax');
    let parallaxRaf = null;
    let parallaxY = 0;
    root.addEventListener('pointermove', (e) => {
      parallaxY = (e.clientY / window.innerHeight - 0.5) * -16;
      if (parallaxRaf) return;
      parallaxRaf = requestAnimationFrame(() => {
        root.style.setProperty('--gxmb-px', parallaxY.toFixed(2) + 'px');
        parallaxRaf = null;
      });
    });
  }

  // Le bg-video de l'accueil continue de tourner pour l'après-menu
  // (le wallpaper recouvre son rendu tant que ce menu est ouvert).
  document.getElementById('bg-video')?.play().catch(() => {});

  if (games.length === 0) return;

  /* ── Sélection / géométrie de la pile ── */
  const setIndex = (i) => {
    if (i === state.index) return;
    state.index = i;
    if (typeof AudioManager !== 'undefined') AudioManager.playClick();
    layoutStack();
    updateInfo();
  };

  const layoutStack = () => {
    const items = container.querySelectorAll('.gxmb-item');
    items.forEach((item) => {
      const i = parseInt(item.getAttribute('data-index'), 10);
      const dist = i - state.index;
      const adist = Math.abs(dist);
      const isActive = dist === 0;

      item.classList.toggle('is-active', isActive);

      let scale, opacity, brightness;
      if (isActive)         { scale = 1.3;  opacity = 1;    brightness = 1;    }
      else if (adist === 1) { scale = 0.82; opacity = 0.55; brightness = 0.48; }
      else if (adist === 2) { scale = 0.68; opacity = 0.24; brightness = 0.4;  }
      else                  { scale = 0.6;  opacity = 0;    brightness = 0.4;  }

      const y = dist * XMB_GAP;
      const x = -XMB_CURVE * (adist * adist); // courbe quadratique : l'arc se creuse en s'éloignant du centre
      item.style.transform = `translate(${x}px, calc(-50% + ${y}px)) scale(${scale})`;
      item.style.opacity = opacity;
      item.style.filter = `brightness(${brightness})`;
      item.style.pointerEvents = adist > XMB_MAX_DIST ? 'none' : 'auto';
      item.style.zIndex = String(100 - adist);
    });

    const upBtn = container.querySelector('#gxmb-nav-up');
    const downBtn = container.querySelector('#gxmb-nav-down');
    if (upBtn) upBtn.classList.toggle('is-visible', state.index > 0);
    if (downBtn) downBtn.classList.toggle('is-visible', state.index < games.length - 1);

    const countEl = container.querySelector('#gxmb-count');
    if (countEl) countEl.textContent = games.length
      ? `— ${String(state.index + 1).padStart(2, '0')} / ${String(games.length).padStart(2, '0')}`
      : '';
  };

  /* (Ré)attache le clic sur chaque jaquette du track courant */
  const bindItemClicks = () => {
    container.querySelectorAll('.gxmb-item').forEach((item) => {
      item.addEventListener('click', () => {
        const i = parseInt(item.getAttribute('data-index'), 10);
        if (i === state.index) {
          if (typeof AudioManager !== 'undefined') AudioManager.playClick();
          config.launch(games[state.index]);
        } else {
          setIndex(i);
        }
      });
    });
  };

  /* ── Molette = naviguer dans la pile ── */
  let wheelLock = false;
  root.addEventListener('wheel', (e) => {
    e.preventDefault();
    if (wheelLock || Math.abs(e.deltaY) < 4) return;
    if (e.deltaY > 0 && state.index < games.length - 1) {
      wheelLock = true;
      setIndex(state.index + 1);
      setTimeout(() => { wheelLock = false; }, 260);
    } else if (e.deltaY < 0 && state.index > 0) {
      wheelLock = true;
      setIndex(state.index - 1);
      setTimeout(() => { wheelLock = false; }, 260);
    }
  }, { passive: false });

  bindItemClicks();

  /* ── Recherche : filtre la liste par nom (insensible casse/accents) ── */
  const searchWrap  = container.querySelector('#gxmb-search');
  const searchInput = container.querySelector('#gxmb-search-input');
  const searchClear = container.querySelector('#gxmb-search-clear');
  searchInput.addEventListener('input', () => applySearch(searchInput.value));
  searchClear.addEventListener('click', () => {
    searchInput.value = '';
    applySearch('');
    searchInput.focus();
  });
  // Ne pas laisser les flèches/Entrée taper dans le champ déclencher la navigation clavier globale
  searchInput.addEventListener('keydown', (e) => e.stopPropagation());

  const applySearch = (rawQuery) => {
    const q = xmbNormalize(rawQuery);
    searchWrap?.classList.toggle('has-query', q.length > 0);

    games = q
      ? config.games.filter((g) => xmbNormalize(g.name).includes(q))
      : config.games.slice();
    state.index = 0;

    const track = container.querySelector('#gxmb-track');
    const playBtn = container.querySelector('#gxmb-play');

    if (games.length === 0) {
      track.innerHTML = '';
      if (playBtn) playBtn.disabled = true;
      container.querySelector('#gxmb-eyebrow').textContent = 'Sélection';
      container.querySelector('#gxmb-title').textContent = 'Aucun résultat';
      container.querySelector('#gxmb-desc').textContent = `Aucun jeu ne correspond à « ${rawQuery} ». Essaie un autre nom.`;
      container.querySelector('#gxmb-meta').innerHTML = '';
      const frame = container.querySelector('#gxmb-preview-inner');
      const dots = container.querySelector('#gxmb-preview-dots');
      if (frame) frame.innerHTML = '<div class="gxmb-preview-empty">Aperçu à venir</div>';
      if (dots) dots.innerHTML = '';
      layoutStack();
      return;
    }

    if (playBtn) playBtn.disabled = false;
    track.innerHTML = buildXmbItemsHtml(games);
    bindItemClicks();
    layoutStack();
    updateInfo();
  };

  /* ── Bouton Jouer ── */
  container.querySelector('#gxmb-play').addEventListener('click', () => {
    if (!games.length) return;
    if (typeof AudioManager !== 'undefined') AudioManager.playClick();
    config.launch(games[state.index]);
  });

  container.querySelector('#gxmb-nav-up').addEventListener('click', (e) => {
    e.stopPropagation();
    if (state.index > 0) setIndex(state.index - 1);
  });
  container.querySelector('#gxmb-nav-down').addEventListener('click', (e) => {
    e.stopPropagation();
    if (state.index < games.length - 1) setIndex(state.index + 1);
  });

  /* ── Sortie « B Retour » ── */
  container.querySelector('#gxmb-exit').addEventListener('click', () => {
    if (typeof AudioManager !== 'undefined') AudioManager.playClick();
    destroyEmulatorXmb();
    config.close();
  });

  /* ── Clavier : flèches, Entrée, B / Échap ── */
  const keyHandler = (e) => {
    const rootEl = document.querySelector('.gxmb-root');
    if (!rootEl) { window.removeEventListener('keydown', keyHandler, true); return; }
    if (document.querySelector(`iframe[src*="${config.emuIframeMatch}"]`)) return;

    // Le champ de recherche gère lui-même son clavier (frappe, Entrée...)
    if (e.target && e.target.id === 'gxmb-search-input') {
      if (e.key === 'Escape') e.target.blur();
      return;
    }

    if (!['ArrowUp', 'ArrowDown', 'Enter', 'b', 'Escape'].includes(e.key)) return;
    e.preventDefault(); e.stopPropagation();

    if (e.key === 'ArrowDown' && state.index < games.length - 1) {
      setIndex(state.index + 1);
    } else if (e.key === 'ArrowUp' && state.index > 0) {
      setIndex(state.index - 1);
    } else if (e.key === 'Enter') {
      if (!games.length) return;
      if (typeof AudioManager !== 'undefined') AudioManager.playClick();
      config.launch(games[state.index]);
    } else if (e.key === 'b' || e.key === 'Escape') {
      container.querySelector('#gxmb-exit')?.click();
    }
  };
  activeXmb.keyHandler = keyHandler;
  window._gxmbKeyHandler = keyHandler;
  window.addEventListener('keydown', keyHandler, true);

  /* ── Horloge du topbar ── */
  const initClock = () => {
    if (activeXmb?.clockTimer) { clearInterval(activeXmb.clockTimer); activeXmb.clockTimer = null; }

    const timeEl = container.querySelector('#gxmb-clock-time');
    const dateEl = container.querySelector('#gxmb-clock-date');
    if (!timeEl || !dateEl) return;

    const days   = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];

    const tick = () => {
      if (!document.body.contains(timeEl)) {
        if (activeXmb?.clockTimer) { clearInterval(activeXmb.clockTimer); activeXmb.clockTimer = null; }
        return;
      }
      const now = new Date();
      const h = String(now.getHours()).padStart(2, '0');
      const m = String(now.getMinutes()).padStart(2, '0');
      timeEl.textContent = `${h}:${m}`;
      dateEl.textContent = `${days[now.getDay()]} ${now.getDate()} ${months[now.getMonth()]}`;
    };

    tick();
    if (activeXmb) activeXmb.clockTimer = setInterval(tick, 1000);
  };

  /* ── Aperçu : diaporama léger des screenshots (ou jaquette si aucun) ── */
  const goToSlide = (index) => {
    const frame = container.querySelector('#gxmb-preview-inner');
    if (!frame) return;
    const imgs = frame.querySelectorAll('.gxmb-preview-img');
    const dots = container.querySelectorAll('.gxmb-preview-dot');
    if (!imgs.length) return;

    slideIndex = ((index % imgs.length) + imgs.length) % imgs.length;
    imgs.forEach((img, i) => img.classList.toggle('is-active', i === slideIndex));
    dots.forEach((d, i) => d.classList.toggle('is-active', i === slideIndex));
  };

  const renderPreview = (game) => {
    if (activeXmb?.slideTimer) { clearInterval(activeXmb.slideTimer); activeXmb.slideTimer = null; }
    slideIndex = 0;

    const frame = container.querySelector('#gxmb-preview-inner');
    const dotsWrap = container.querySelector('#gxmb-preview-dots');
    frame.innerHTML = '';
    dotsWrap.innerHTML = '';

    const shots = Array.isArray(game.screenshots) ? game.screenshots.filter(Boolean) : [];

    if (shots.length === 0) {
      if (game.cover) {
        const img = document.createElement('img');
        img.src = game.cover;
        img.className = 'gxmb-preview-img is-active';
        img.style.objectPosition = 'center 15%';
        img.onerror = () => {
          img.remove();
          const empty = document.createElement('div');
          empty.className = 'gxmb-preview-empty';
          empty.textContent = 'Aperçu à venir';
          frame.appendChild(empty);
        };
        frame.appendChild(img);
      } else {
        const empty = document.createElement('div');
        empty.className = 'gxmb-preview-empty';
        empty.textContent = 'Aperçu à venir';
        frame.appendChild(empty);
      }
      return;
    }

    shots.forEach((src, i) => {
      const img = document.createElement('img');
      img.src = src;
      img.className = 'gxmb-preview-img' + (i === 0 ? ' is-active' : '');
      img.alt = `${game.name} — capture ${i + 1}`;
      img.onerror = () => { img.style.display = 'none'; };
      frame.appendChild(img);

      if (shots.length > 1) {
        const dot = document.createElement('div');
        dot.className = 'gxmb-preview-dot' + (i === 0 ? ' is-active' : '');
        dot.addEventListener('click', (e) => { e.stopPropagation(); goToSlide(i); });
        dotsWrap.appendChild(dot);
      }
    });

    if (shots.length > 1 && activeXmb) {
      activeXmb.slideTimer = setInterval(() => {
        goToSlide(slideIndex + 1);
      }, 4200);
    }
  };

  /* ── Met à jour titre / description / temps de jeu / aperçu ── */
  const updateInfo = () => {
    if (!games.length) return;
    const game = games[state.index];
    const textCol = container.querySelector('#gxmb-info-text');
    const previewCol = container.querySelector('#gxmb-preview');
    const cornerCol = container.querySelector('#gxmb-corner');

    const apply = () => {
      container.querySelector('#gxmb-eyebrow').textContent = 'Sélection';
      container.querySelector('#gxmb-title').textContent = game.name;
      container.querySelector('#gxmb-desc').textContent = game.description || 'Aucune description disponible.';

      const playtimes = config.getPlaytimes ? config.getPlaytimes() : {};
      const mins = playtimes[game.name] || 0;
      const metaEl = container.querySelector('#gxmb-meta');
      if (mins === 0) {
        metaEl.innerHTML = `Temps de jeu <span class="dot"></span> Vierge`;
      } else {
        const h = Math.floor(mins / 60), m = Math.floor(mins % 60);
        metaEl.innerHTML = `Temps de jeu <span class="dot"></span> ${h > 0 ? h + 'h ' : ''}${m}m`;
      }

      renderPreview(game);

      textCol.classList.remove('is-swapping');
      previewCol.classList.remove('is-swapping');
      cornerCol.classList.remove('is-swapping');
    };

    textCol.classList.add('is-swapping');
    previewCol.classList.add('is-swapping');
    cornerCol.classList.add('is-swapping');
    setTimeout(apply, 120);
  };

  layoutStack();
  updateInfo();
  initClock();
}
