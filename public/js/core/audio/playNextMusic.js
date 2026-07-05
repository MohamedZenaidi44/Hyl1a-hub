import { AudioState } from './state.js';
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
}