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
    const playPending = () => {
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