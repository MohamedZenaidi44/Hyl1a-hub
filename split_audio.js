const fs = require('fs');
const path = require('path');

const audioDir = path.join(__dirname, 'public/js/core/audio');
if (!fs.existsSync(audioDir)) fs.mkdirSync(audioDir, { recursive: true });

const stateContent = `
export const AudioState = {
  sounds: {},
  isMuted: false,
  isPlayingMusic: false,
  currentMusicAudio: null,
  currentTrackIndex: -1,
  isExternalMusicPlaying: false,
  _pendingConnectSuccess: false,
  _hasSetupFallback: false,
  _initialized: false,
  ctx: null,
  analyser: null,
  _sourceNode: null,
  appBgm: null,
  activeLaunchSFX: null,
  _savedVolume: 0.3,

  soundFiles: {
    click: 'public/assets/audio/click_survol_tuile.m4a',
    pop: 'public/assets/audio/pop_interaction.m4a',
    windowOpen: 'public/assets/audio/ouverture_fenetre.m4a',
    windowClose: 'public/assets/audio/fermeture_fenetre.m4a',
    connectSuccess: 'public/assets/audio/CONNECT_SUCCESS.m4a',
    miiLaunch: 'public/assets/audio/MiiSF.m4a',
    gbaLaunch: 'public/assets/audio/EmuSF.m4a',
    gbaBgm: 'public/assets/audio/GbaSF.mp3',
    defaultLaunch: 'public/assets/audio/launchD.mp3'
  },

  playlist: [
    { name: 'Eshop January 2016', file: 'public/assets/audio/Eshop January 2016.m4a', cover: 'public/assets/icons/eshop.webp' },
    { name: 'Eshop July 2014', file: 'public/assets/audio/Eshop July 2014.m4a', cover: 'public/assets/icons/eshop.webp' },
    { name: 'Eshop June 2015', file: 'public/assets/audio/Eshop June 2015.m4a', cover: 'public/assets/icons/eshop.webp' },
    { name: 'BXNJI', file: 'public/assets/audio/bxnji.mp3', cover: 'public/assets/icons/nico.webp' },
    { name: 'Thoughtbody', file: 'public/assets/audio/thoughtbody.mp3', cover: 'public/assets/icons/nico.webp' }
  ]
};
`;
fs.writeFileSync(path.join(audioDir, 'state.js'), stateContent.trim());

const functions = {
  'init.js': `import { AudioState } from './state.js';
export default function init() {
  if (AudioState._initialized) return;
  Object.entries(AudioState.soundFiles).forEach(([key, path]) => {
    const audio = new Audio(path);
    audio.preload = 'auto';
    audio.volume = 0.4;
    AudioState.sounds[key] = audio;
  });
  AudioState._initialized = true;
}`,

  'playInternal.js': `import { AudioState } from './state.js';
import init from './init.js';
export default function _play(key) {
  if (AudioState.isMuted) return;
  if (!AudioState._initialized) init();
  const sound = AudioState.sounds[key];
  if (sound) {
    const clone = sound.cloneNode();
    clone.volume = sound.volume;
    clone.play().catch(() => { });
  }
}`,

  'playClick.js': `import _play from './playInternal.js';
export default function playClick() { _play('click'); }`,

  'playPop.js': `import _play from './playInternal.js';
export default function playPop() { _play('pop'); }`,

  'playWindowOpen.js': `import _play from './playInternal.js';
export default function playWindowOpen() { _play('windowOpen'); }`,

  'playWindowClose.js': `import _play from './playInternal.js';
export default function playWindowClose() { _play('windowClose'); }`,

  'playConnectSuccess.js': `import { AudioState } from './state.js';
import _play from './playInternal.js';
export default function playConnectSuccess() {
  const sound = AudioState.sounds['connectSuccess'];
  if (sound) {
    sound.play().catch(() => {
      AudioState._pendingConnectSuccess = true;
      if (!AudioState._hasSetupFallback) {
        const playPending = () => {
          if (AudioState._pendingConnectSuccess) {
            _play('connectSuccess');
            AudioState._pendingConnectSuccess = false;
          }
          document.removeEventListener('click', playPending);
          document.removeEventListener('keydown', playPending);
        };
        document.addEventListener('click', playPending);
        document.addEventListener('keydown', playPending);
        AudioState._hasSetupFallback = true;
      }
    });
  }
}`,

  'initAudioContext.js': `import { AudioState } from './state.js';
export default function initAudioContext() {
  if (AudioState.ctx) return;
  try {
    AudioState.ctx = new (window.AudioContext || window.webkitAudioContext)();
    AudioState.analyser = AudioState.ctx.createAnalyser();
    AudioState.analyser.fftSize = 256;
    AudioState.analyser.connect(AudioState.ctx.destination);
  } catch (e) {
    console.warn("Web Audio API not supported:", e);
  }
}`,

  'pauseMusic.js': `import { AudioState } from './state.js';
export default function pauseMusic() {
  if (AudioState.currentMusicAudio) {
    AudioState.currentMusicAudio.pause();
    AudioState.currentMusicAudio.currentTime = 0;
    AudioState.currentMusicAudio = null;
  }
  AudioState.isPlayingMusic = false;
}`,

  'showNowPlaying.js': `export default function showNowPlaying(trackName) {
  const old = document.querySelector('.now-playing-container');
  if (old) old.remove();
  const container = document.createElement('div');
  container.className = 'now-playing-container';
  container.innerHTML = \`<div class="now-playing-bars"><span></span><span></span><span></span><span></span></div><div class="now-playing-text"><div class="now-playing-label">Now Playing</div><div class="now-playing-title">\${trackName}</div></div>\`;
  document.body.appendChild(container);
  requestAnimationFrame(() => container.classList.add('active'));
  setTimeout(() => {
    container.classList.add('exit');
    container.classList.remove('active');
    setTimeout(() => container.remove(), 1600);
  }, 5000);
}`,

  'playNextMusic.js': `import { AudioState } from './state.js';
import initAudioContext from './initAudioContext.js';
import pauseMusic from './pauseMusic.js';
import showNowPlaying from './showNowPlaying.js';

export default function playNextMusic() {
  pauseMusic();
  initAudioContext();

  if (AudioState.ctx && AudioState.ctx.state === 'suspended') {
    AudioState.ctx.resume();
  }

  let nextIndex;
  if (AudioState.currentTrackIndex === -1) {
    nextIndex = AudioState.playlist.findIndex(t => t.name.toLowerCase() === 'bxnji');
    if (nextIndex === -1) nextIndex = 0;
  } else if (AudioState.playlist.length > 1) {
    do { nextIndex = Math.floor(Math.random() * AudioState.playlist.length); } while (nextIndex === AudioState.currentTrackIndex);
  } else {
    nextIndex = 0;
  }

  AudioState.currentTrackIndex = nextIndex;
  const track = AudioState.playlist[AudioState.currentTrackIndex];

  AudioState.currentMusicAudio = new Audio(track.file);
  AudioState.currentMusicAudio.volume = 0.3;
  AudioState.currentMusicAudio.loop = false;
  
  if (AudioState.ctx && AudioState.analyser) {
    if (AudioState._sourceNode) AudioState._sourceNode.disconnect();
    AudioState._sourceNode = AudioState.ctx.createMediaElementSource(AudioState.currentMusicAudio);
    AudioState._sourceNode.connect(AudioState.analyser);
  }

  AudioState.currentMusicAudio.play().catch(() => { });
  showNowPlaying(track.name);

  AudioState.currentMusicAudio.onended = () => {
    playNextMusic();
    if (window.updateVisualizerDisplay) window.updateVisualizerDisplay();
  };
  AudioState.isPlayingMusic = true;
}`,

  'fade.js': `import { AudioState } from './state.js';
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
}`,

  'appTransitions.js': `import { AudioState } from './state.js';
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
}`
};

for (const [name, content] of Object.entries(functions)) {
  fs.writeFileSync(path.join(audioDir, name), content.trim());
}

const exporterContent = `
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
`;

fs.writeFileSync(path.join(__dirname, 'public/js/core/audio.js'), exporterContent.trim());
console.log('Successfully completed 1 fichier js = 1 fonction for AudioManager!');
