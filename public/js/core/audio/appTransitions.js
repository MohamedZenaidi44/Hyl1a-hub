import { AudioState } from './state.js';
import { fadeOut, fadeIn } from './fade.js';
import playNextMusic from './playNextMusic.js';

export async function playAppLaunchTransition(sfKey, bgmKey) {
  await fadeOut(600);
  if (sfKey && AudioState.soundFiles[sfKey]) {
    AudioState.activeLaunchSFX = new Audio(AudioState.soundFiles[sfKey]);
    AudioState.activeLaunchSFX.volume = 0.5;
    AudioState.activeLaunchSFX.play().catch(() => {});
  }
  if (bgmKey && AudioState.soundFiles[bgmKey]) {
    setTimeout(() => {
      AudioState.appBgm = new Audio(AudioState.soundFiles[bgmKey]);
      AudioState.appBgm.volume = 0;
      AudioState.appBgm.loop = true;
      AudioState.appBgm.play().catch(() => {});
      let vol = 0;
      const iv = setInterval(() => {
        vol += 0.05;
        if (AudioState.appBgm) AudioState.appBgm.volume = Math.min(0.4, vol);
        if (vol >= 0.4) clearInterval(iv);
      }, 50);
    }, 500);
  }
}

export async function restoreHubAudio() {
  if (AudioState.appBgm) {
    const audio = AudioState.appBgm;
    const steps = 10;
    const volStep = audio.volume / steps;
    let i = 0;
    const iv = setInterval(() => {
      i++;
      audio.volume = Math.max(0, audio.volume - volStep);
      if (i >= steps) {
        clearInterval(iv);
        audio.pause();
        AudioState.appBgm = null;
      }
    }, 50);
    await new Promise(r => setTimeout(r, 600));
  }
  if (AudioState.currentMusicAudio) {
    fadeIn(600);
  } else {
    playNextMusic();
  }
}