#!/usr/bin/env node
/**
 * optimize-media.js — Script de conversion des assets Hyl1a-hub
 *
 * Convertit :
 *  - PNG lourds → WebP (via sharp)
 *  - Vidéos MP4 (3dsW, 3dsB) → MP4 720p ~1.5 Mbps sans audio (via ffmpeg)
 *  - WAV et gros MP3 → MP3 128 kbps (via ffmpeg)
 *
 * Prérequis :
 *   npm install sharp
 *   ffmpeg doit être installé et dans le PATH
 *     → winget install Gyan.FFmpeg
 *
 * Usage :
 *   node tools/optimize-media.js
 *   node tools/optimize-media.js --dry-run  (aperçu sans conversion)
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const DRY_RUN = process.argv.includes('--dry-run');
const ROOT = path.join(__dirname, '..');

// ─────────────────────────────────────────────────────────────
// 1. PNG → WebP
// ─────────────────────────────────────────────────────────────
const PNG_TARGETS = [
  'public/assets/icons/snesx9.png',
  'public/assets/icons/socialpng.png',
  'public/assets/icons/chatpng.png',
  'public/assets/icons/friend.png',
  'public/assets/icons/profil.png',
  'public/assets/icons/desemu.png',
  'public/assets/icons/pokemon_heartgold.png',
];

async function convertPngs() {
  let sharp;
  try {
    sharp = require('sharp');
  } catch {
    console.warn('⚠️  sharp non installé. Lancez : npm install sharp');
    return;
  }

  console.log('\n📸 Conversion PNG → WebP');
  for (const rel of PNG_TARGETS) {
    const src = path.join(ROOT, rel);
    if (!fs.existsSync(src)) { console.warn(`  ⏭  introuvable : ${rel}`); continue; }
    const dest = src.replace(/\.png$/i, '.webp');
    if (DRY_RUN) { console.log(`  [dry] ${rel} → .webp`); continue; }
    await sharp(src)
      .webp({ quality: 85 })
      .toFile(dest);
    const before = fs.statSync(src).size;
    const after = fs.statSync(dest).size;
    console.log(`  ✅ ${path.basename(rel)} : ${kb(before)} → ${kb(after)} (-${pct(before, after)}%)`);
  }
}

// ─────────────────────────────────────────────────────────────
// 2. Vidéo MP4 → MP4 720p, 1.5 Mbps, sans audio
// ─────────────────────────────────────────────────────────────
const VIDEO_TARGETS = [
  { src: 'public/assets/icons/video/3dsW.mp4', dest: 'public/assets/icons/video/3dsW_opt.mp4' },
  { src: 'public/assets/icons/video/3dsB.mp4', dest: 'public/assets/icons/video/3dsB_opt.mp4' },
];

function convertVideos() {
  console.log('\n🎬 Ré-encodage vidéos MP4 (720p, 1.5 Mbps, sans audio)');
  for (const { src, dest } of VIDEO_TARGETS) {
    const srcAbs = path.join(ROOT, src);
    const destAbs = path.join(ROOT, dest);
    if (!fs.existsSync(srcAbs)) { console.warn(`  ⏭  introuvable : ${src}`); continue; }
    if (DRY_RUN) { console.log(`  [dry] ${src} → ${dest}`); continue; }
    try {
      execSync(
        `ffmpeg -y -i "${srcAbs}" -vf "scale=-2:720" -c:v libx264 -b:v 1500k -maxrate 2000k -bufsize 4000k -an -preset slow -movflags +faststart "${destAbs}"`,
        { stdio: 'inherit' }
      );
      const before = fs.statSync(srcAbs).size;
      const after  = fs.statSync(destAbs).size;
      console.log(`  ✅ ${path.basename(src)} : ${mb(before)} Mo → ${mb(after)} Mo (-${pct(before, after)}%)`);
      console.log(`     ⚠️  Remplacez manuellement ${src} par ${dest} après vérification.`);
    } catch (e) {
      console.error(`  ❌ ffmpeg échoué pour ${src}:`, e.message);
    }
  }
}

// ─────────────────────────────────────────────────────────────
// 3. WAV / gros MP3 → MP3 128 kbps
// ─────────────────────────────────────────────────────────────
const AUDIO_TARGETS = [
  { src: 'public/assets/audio/musique_shop_ambient.wav', dest: 'public/assets/audio/musique_shop_ambient.mp3' },
  { src: 'public/assets/audio/musique_plaza_morning.wav', dest: 'public/assets/audio/musique_plaza_morning.mp3' },
];

function convertAudios() {
  console.log('\n🎵 Conversion audio (WAV → MP3 128 kbps)');
  for (const { src, dest } of AUDIO_TARGETS) {
    const srcAbs = path.join(ROOT, src);
    const destAbs = path.join(ROOT, dest);
    if (!fs.existsSync(srcAbs)) { console.warn(`  ⏭  introuvable : ${src}`); continue; }
    if (DRY_RUN) { console.log(`  [dry] ${src} → ${dest}`); continue; }
    try {
      execSync(
        `ffmpeg -y -i "${srcAbs}" -codec:a libmp3lame -b:a 128k "${destAbs}"`,
        { stdio: 'inherit' }
      );
      const before = fs.statSync(srcAbs).size;
      const after  = fs.statSync(destAbs).size;
      console.log(`  ✅ ${path.basename(src)} : ${mb(before)} Mo → ${mb(after)} Mo (-${pct(before, after)}%)`);
    } catch (e) {
      console.error(`  ❌ ffmpeg échoué pour ${src}:`, e.message);
    }
  }
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
function kb(bytes) { return (bytes / 1024).toFixed(0) + ' Ko'; }
function mb(bytes) { return (bytes / 1048576).toFixed(1); }
function pct(before, after) { return (((before - after) / before) * 100).toFixed(0); }

// ─────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────
(async () => {
  console.log(DRY_RUN ? '🔍 Mode aperçu (--dry-run)\n' : '🚀 Conversion en cours…\n');
  await convertPngs();
  convertVideos();
  convertAudios();
  console.log('\n✅ Terminé ! Vérifiez les fichiers _opt avant de remplacer les originaux.');
})();
