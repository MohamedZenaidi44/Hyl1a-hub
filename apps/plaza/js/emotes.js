/**
 * emotes.js — Bulles d'émotion « façon Tomodachi Life ».
 *
 * Chaque bulle est un `THREE.Sprite` dessiné en canvas : une bulle blanche
 * arrondie avec une queue, et un symbole au centre (cœur, note, colère,
 * « ! », « ? », « Zzz », goutte). `show(type, durée)` l'affiche au-dessus de
 * la tête du Mii ; `update(dt)` la masque à l'expiration.
 */

import * as THREE from 'three';

const S = 128;               // taille du canvas
const BUBBLE_W = 108;        // largeur de la bulle dans le canvas
const BUBBLE_H = 96;         // hauteur de la bulle

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
  ctx.font = `900 ${Math.round(s * 2.1)}px Nunito, Segoe UI, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, cx, cy + s * 0.1);
}

/** Dessine la bulle + le symbole demandé dans le canvas. */
function drawBubble(ctx, type) {
  ctx.clearRect(0, 0, S, S);
  const x = (S - BUBBLE_W) / 2, y = 4, w = BUBBLE_W, h = BUBBLE_H;

  // Ombre douce
  ctx.save();
  ctx.shadowColor = 'rgba(10, 16, 28, 0.35)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 3;
  ctx.fillStyle = '#ffffff';
  roundRect(ctx, x, y, w, h, 26);
  ctx.fill();
  ctx.restore();

  // Queue de la bulle (petit triangle bas-gauche)
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(x + 30, y + h - 6);
  ctx.lineTo(x + 16, y + h + 22);
  ctx.lineTo(x + 56, y + h - 4);
  ctx.closePath();
  ctx.fill();

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

/** Crée une bulle prête à être attachée au groupe d'un Mii. */
export function makeBubble() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = S;
  const ctx = canvas.getContext('2d');

  const tex = new THREE.CanvasTexture(canvas);
  if ('colorSpace' in tex) tex.colorSpace = THREE.SRGBColorSpace;

  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(0.55, 0.55, 1);
  sprite.visible = false;

  let timeLeft = 0;
  let lastType = null;

  return {
    sprite,
    /** Affiche la bulle `type` pendant `seconds`. */
    show(type, seconds = 2.2) {
      if (type !== lastType) {
        drawBubble(ctx, type);
        tex.needsUpdate = true;
        lastType = type;
      }
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
