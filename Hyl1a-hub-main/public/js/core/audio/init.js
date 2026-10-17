import { AudioState } from './state.js';
import playNextMusic from './playNextMusic.js';
import _play from './playInternal.js';

export default function init() {
  if (AudioState._initialized) return;
  Object.entries(AudioState.soundFiles).forEach(([key, path]) => {
    const audio = new Audio(path);
    audio.preload = 'auto';
    audio.volume = 0.4;
    AudioState.sounds[key] = audio;
  });
  
  if (!AudioState._hasSetupFallback) {
    // Tant que le login (#auth-overlay) ou l'écran d'avertissement Wii
    // (#wii-warning-overlay) sont encore affichés, un clic ne doit PAS lancer
    // la musique du hub — sinon elle démarre en même temps que le son du
    // login/de l'écran Wii. On ignore les clics tant que l'intro n'est pas
    // terminée ; l'écouteur reste actif et retentera au clic suivant.
    const isIntroBlocking = () => {
      const authOverlay = document.getElementById('auth-overlay');
      const wiiOverlay = document.getElementById('wii-warning-overlay');

      const authVisible = authOverlay &&
        window.getComputedStyle(authOverlay).display !== 'none';

      const wiiVisible = wiiOverlay &&
        window.getComputedStyle(wiiOverlay).display !== 'none' &&
        !wiiOverlay.classList.contains('is-hiding');

      return !!authVisible || !!wiiVisible;
    };

    const playPending = () => {
      if (isIntroBlocking()) return; // on retentera au prochain clic/touche

      if (AudioState._pendingConnectSuccess) {
        _play('connectSuccess');
        AudioState._pendingConnectSuccess = false;
      }
      if (!AudioState.isPlayingMusic && !AudioState.isExternalMusicPlaying) {
        playNextMusic();
      }
      document.removeEventListener('click', playPending);
      document.removeEventListener('keydown', playPending);
    };
    document.addEventListener('click', playPending);
    document.addEventListener('keydown', playPending);
    AudioState._hasSetupFallback = true;
  }
  
  AudioState._initialized = true;
}