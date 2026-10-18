/**
 * emotes.js — Bulles « façon Tomodachi Life ».
 *
 * Deux modes, même objet :
 *   - **émotion** : bulle blanche arrondie + symbole (cœur, note, colère,
 *     « ! », « ? », « Zzz », goutte) — `show(type, durée)` ;
 *   - **texte** : bulle de dialogue avec une VRAIE réplique (police épaisse,
 *     retour à la ligne automatique, taille du canvas adaptée) —
 *     `showText(réplique, durée)`.
 *
 * La queue de la bulle sert d'ancre : `sprite.center` est réglé sur la pointe
 * de la queue, donc la POSITION du sprite = le point visé (le haut de la tête
 * du Mii). `side` (−1/1) place la queue à gauche ou à droite → le corps de la
 * bulle s'étend du côté opposé (miroir dessiné, pas de scale négatif).
 */
import * as THREE from 'three';

const S = 128;               // canvas émotion
const BUBBLE_W = 108;        // largeur de la bulle dans le canvas
const BUBBLE_H = 96;         // hauteur de la bulle

/* Réglages des bulles texte. */
const TEXT_FONT_FAMILY = 'Nunito, Segoe UI, sans-serif';
const TEXT_FONT = `800 60px ${TEXT_FONT_FAMILY}`;
const TEXT_WRAP_W = 560;     // largeur maximale d'une ligne (canvas)
const TEXT_LINE_H = 78;      // interligne (canvas)
const TEXT_PAD_X = 40;       // marge intérieure horizontale
const TEXT_PAD_TOP = 30;
const TEXT_MIN_W = 250;      // bulle compacte pour les répliques courtes
const TEXT_TAIL = 38;        // zone de la queue sous le corps
const TEXT_PX2U = 0.0058;    // taille monde d'un pixel de canvas

const EMOTE_SCALE = 0.62;    // taille monde de la bulle émotion

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawHeart(ctx, cx, cy, s) {
  ctx.fillStyle = '#e8435a';
  ctx.beginPath();
  ctx.moveTo(cx, cy + s * 0.75);
  ctx.bezierCurveTo(cx - s * 1.4, cy - s * 0.35, cx - s * 0.55, cy - s * 1.15, cx, cy - s * 0.35);
  ctx.bezierCurveTo(cx + s * 0.55, cy - s * 1.15, cx + s * 1.4, cy - s * 0.35, cx, cy + s * 0.75);
  ctx.fill();
}

function drawNote(ctx, cx, cy, s) {
  ctx.fillStyle = '#3a76d8';
  ctx.beginPath();
  ctx.ellipse(cx - s * 0.35, cy + s * 0.55, s * 0.42, s * 0.32, -0.35, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#3a76d8';
  ctx.lineWidth = s * 0.16;
  ctx.beginPath();
  ctx.moveTo(cx + 0.05 * s, cy + s * 0.5);
  ctx.lineTo(cx + 0.05 * s, cy - s * 0.9);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx + 0.05 * s, cy - s * 0.9);
  ctx.quadraticCurveTo(cx + 0.75 * s, cy - s * 0.75, cx + 0.7 * s, cy - s * 0.25);
  ctx.stroke();
}

function drawAngry(ctx, cx, cy, s) {
  ctx.strokeStyle = '#e0322e';
  ctx.lineWidth = s * 0.16;
  ctx.lineCap = 'round';
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * s * 0.35, cy + Math.sin(a) * s * 0.35);
    ctx.lineTo(cx + Math.cos(a) * s * 0.85, cy + Math.sin(a) * s * 0.85);
    ctx.stroke();
  }
}

function drawSweat(ctx, cx, cy, s) {
  ctx.fillStyle = '#3fa9f5';
  ctx.beginPath();
  ctx.moveTo(cx, cy - s * 0.9);
  ctx.bezierCurveTo(cx + s * 0.75, cy + s * 0.1, cx + s * 0.45, cy + s * 0.85, cx, cy + s * 0.85);
  ctx.bezierCurveTo(cx - s * 0.45, cy + s * 0.85, cx - s * 0.75, cy + s * 0.1, cx, cy - s * 0.9);
  ctx.fill();
}

function drawGlyph(ctx, text, cx, cy, s, color) {
  ctx.fillStyle = color;
  ctx.font = `900 ${Math.round(s * 2.1)}px ${TEXT_FONT_FAMILY}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, cx, cy + s * 0.1);
}

/** Fond blanc + ombre, commun aux deux modes. */
function drawBody(ctx, x, y, w, h) {
  ctx.save();
  ctx.shadowColor = 'rgba(10, 16, 28, 0.35)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 3;
  ctx.fillStyle = '#ffffff';
  roundRect(ctx, x, y, w, h, 26);
  ctx.fill();
  ctx.restore();
}

/** Queue triangulaire, pointe vers la tête (bas-gauche ou bas-droite). */
function drawTail(ctx, myBox, mirror) {
  const y = myBox.y, h = myBox.h;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  if (!mirror) {
    ctx.moveTo(myBox.x + 30, y + h - 6);
    ctx.lineTo(myBox.x + 16, y + h + 22);
    ctx.lineTo(myBox.x + 56, y + h - 4);
  } else {
    ctx.moveTo(myBox.x + myBox.w - 30, y + h - 6);
    ctx.lineTo(myBox.x + myBox.w - 16, y + h + 22);
    ctx.lineTo(myBox.x + myBox.w - 56, y + h - 4);
  }
  ctx.closePath();
  ctx.fill();
}

/** Dessine la bulle émotion (+ symbole) dans le canvas 128×128. */
function drawEmote(ctx, type, mirror) {
  ctx.clearRect(0, 0, S, S);
  const x = (S - BUBBLE_W) / 2, y = 4, w = BUBBLE_W, h = BUBBLE_H;
  drawBody(ctx, x, y, w, h);
  drawTail(ctx, { x, y, w, h }, mirror);

  const cx = S / 2, cy = y + h / 2;
  const s = 18;
  switch (type) {
    case 'heart': drawHeart(ctx, cx, cy, s); break;
    case 'note': drawNote(ctx, cx, cy, s); break;
    case 'angry': drawAngry(ctx, cx, cy, s); break;
    case 'sweat': drawSweat(ctx, cx, cy, s); break;
    case 'excl': drawGlyph(ctx, '!', cx, cy, s, '#f0a500'); break;
    case 'quest': drawGlyph(ctx, '?', cx, cy, s, '#7a55d8'); break;
    case 'zzz': drawGlyph(ctx, 'Z', cx, cy, s, '#5a7d9a'); break;
    default: drawGlyph(ctx, '!', cx, cy, s, '#f0a500');
  }
}

/** Coupe la réplique en lignes qui tiennent dans `maxW`. */
function wrapText(ctx, text, maxW) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let cur = '';
  for (const word of words) {
    const t = cur ? `${cur} ${word}` : word;
    if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = word; }
    else cur = t;
  }
  if (cur) lines.push(cur);
  return lines;
}

/** Dessine une bulle de dialogue : corps adapté au texte + queue. */
function drawTextBubble(ctx, W, H, lines, mirror) {
  ctx.clearRect(0, 0, W, H);
  const bodyH = H - TEXT_TAIL;
  drawBody(ctx, 2, 2, W - 4, bodyH - 4);
  drawTail(ctx, { x: 2, y: 2, w: W - 4, h: bodyH - 4 }, mirror);

  ctx.fillStyle = '#263041';
  ctx.font = TEXT_FONT;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const blockH = lines.length * TEXT_LINE_H;
  const y0 = 2 + (bodyH - 4 - blockH) / 2 + TEXT_LINE_H / 2;
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], W / 2, y0 + i * TEXT_LINE_H + 4);
  }
}

/**
 * Crée une bulle prête à être attachée au groupe d'un Mii.
 * La `position` du sprite = pointe de la queue (à poser au-dessus de la tête).
 */
export function makeBubble() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = S;
  let ctx = canvas.getContext('2d');

  const tex = new THREE.CanvasTexture(canvas);
  if ('colorSpace' in tex) tex.colorSpace = THREE.SRGBColorSpace;

  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(EMOTE_SCALE, EMOTE_SCALE, 1);
  sprite.center.set(26 / S, 2 / S);
  sprite.visible = false;

  let timeLeft = 0;
  let lastType = null;
  let lastText = null;
  let lastSide = 1;
  let mode = 'emote';        // 'emote' | 'text'
  let baseW = EMOTE_SCALE;   // taille monde de base du mode courant…
  let baseH = EMOTE_SCALE;
  let readScale = 1;         // …× facteur de lisibilité (distance caméra)

  function applyScale() {
    sprite.scale.set(baseW * readScale, baseH * readScale, 1);
  }

  function ensureSize(w, h) {
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      ctx = canvas.getContext('2d');
      tex.dispose();
    }
  }

  return {
    sprite,
    get mode() { return mode; },
    /** Contenu courant : réplique (mode texte) ou type d'émotion. */
    get text() { return mode === 'text' ? (lastText || '') : (lastType || ''); },
    /**
     * Facteur de lisibilité selon la distance caméra : les bulles grossissent
     * un peu en vue éloignée (lisible), rétrécissent un peu en vue proche
     * (elles ne mangent pas l'écran). Appliqué à chaud, sans redessiner.
     */
    setReadScale(k) {
      const v = Math.max(0.7, Math.min(1.45, k));
      if (Math.abs(v - readScale) < 0.01) return;
      readScale = v;
      applyScale();
    },
    /** Affiche la bulle d'émotion `type` pendant `seconds`. */
    show(type, seconds = 2.2, side = 1) {
      const mirror = side < 0;
      if (mode !== 'emote' || type !== lastType || mirror !== (lastSide < 0)) {
        ensureSize(S, S);
        drawEmote(ctx, type, mirror);
        baseW = baseH = EMOTE_SCALE;
        sprite.center.set((mirror ? S - 26 : 26) / S, 2 / S);
        lastType = type;
        lastSide = side;
        mode = 'emote';
        tex.needsUpdate = true;
      }
      applyScale();
      sprite.visible = true;
      timeLeft = seconds;
    },
    /** Affiche une réplique de dialogue pendant `seconds` (canvas adapté). */
    showText(text, seconds = 2.4, side = 1) {
      const mirror = side < 0;
      if (mode !== 'text' || text !== lastText || mirror !== (lastSide < 0)) {
        ctx.font = TEXT_FONT;
        const lines = wrapText(ctx, text, TEXT_WRAP_W);
        let wMax = 0;
        for (const l of lines) wMax = Math.max(wMax, ctx.measureText(l).width);
        const W = Math.max(TEXT_MIN_W, Math.ceil(wMax) + TEXT_PAD_X * 2);
        const H = TEXT_PAD_TOP * 2 + lines.length * TEXT_LINE_H + TEXT_TAIL;
        ensureSize(W, H);
        drawTextBubble(ctx, W, H, lines, mirror);
        baseW = W * TEXT_PX2U;
        baseH = H * TEXT_PX2U;
        sprite.center.set((mirror ? W - 16 : 16) / W, 6 / H);
        lastText = text;
        lastSide = side;
        mode = 'text';
        tex.needsUpdate = true;
      }
      applyScale();
      sprite.visible = true;
      timeLeft = seconds;
    },
    /** Masque la bulle immédiatement. */
    hide() { sprite.visible = false; timeLeft = 0; },
    /** À appeler chaque frame : masque la bulle à l'expiration. */
    update(dt) {
      if (timeLeft <= 0) return;
      timeLeft -= dt;
      if (timeLeft <= 0) sprite.visible = false;
    },
    dispose() {
      tex.dispose();
      mat.dispose();
    },
  };
}
