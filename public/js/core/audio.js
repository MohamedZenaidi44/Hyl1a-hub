import { AudioState } from './audio/state.js';
import init from './audio/init.js';
import playClick from './audio/playClick.js';
import playPop from './audio/playPop.js';
import playWindowOpen from './audio/playWindowOpen.js';
import playWindowClose from './audio/playWindowClose.js';
import playConnectSuccess from './audio/playConnectSuccess.js';
import playNextMusic from './audio/playNextMusic.js';
import pauseMusic from './audio/pauseMusic.js';
import { fadeOut, fadeIn } from './audio/fade.js';
import { playAppLaunchTransition, restoreHubAudio } from './audio/appTransitions.js';

window.AudioManager = {
  get isMuted() { return AudioState.isMuted; },
  set isMuted(v) { AudioState.isMuted = v; },
  get isPlayingMusic() { return AudioState.isPlayingMusic; },
  set isPlayingMusic(v) { AudioState.isPlayingMusic = v; },
  get currentMusicAudio() { return AudioState.currentMusicAudio; },
  get isExternalMusicPlaying() { return AudioState.isExternalMusicPlaying; },
  set isExternalMusicPlaying(v) { AudioState.isExternalMusicPlaying = v; },
  get activeLaunchSFX() { return AudioState.activeLaunchSFX; },
  get appBgm() { return AudioState.appBgm; },
  set appBgm(v) { AudioState.appBgm = v; },
  get analyser() { return AudioState.analyser; },
  get playlist() { return AudioState.playlist; },
  get currentTrackIndex() { return AudioState.currentTrackIndex; },
  set currentTrackIndex(v) { AudioState.currentTrackIndex = v; },

  init,
  playClick,
  playPop,
  playWindowOpen,
  playWindowClose,
  playConnectSuccess,
  playNextMusic,
  pauseMusic,
  fadeOut,
  fadeIn,
  playAppLaunchTransition,
  restoreHubAudio
};

// Initialize the audio manager and attach event listeners as early as possible
init();