import { AudioState } from './state.js';
export function fadeOut(duration) {
  return new Promise((resolve) => {
    if (!AudioState.currentMusicAudio) { resolve(); return; }
    const audio = AudioState.currentMusicAudio;
    AudioState._savedVolume = audio.volume;
    const steps = 20;
    const stepTime = (duration || 800) / steps;
    const volStep = audio.volume / steps;
    let i = 0;
    const iv = setInterval(() => {
      i++;
      audio.volume = Math.max(0, AudioState._savedVolume - volStep * i);
      if (i >= steps) { clearInterval(iv); audio.pause(); resolve(); }
    }, stepTime);
  });
}

export function fadeIn(duration) {
  if (!AudioState.currentMusicAudio) return;
  const audio = AudioState.currentMusicAudio;
  const target = AudioState._savedVolume || 0.3;
  audio.volume = 0;
  audio.play().catch(() => {});
  const steps = 20;
  const stepTime = (duration || 800) / steps;
  let i = 0;
  const iv = setInterval(() => {
    i++;
    audio.volume = Math.min(target, (target / steps) * i);
    if (i >= steps) clearInterval(iv);
  }, stepTime);
}