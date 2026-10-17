import { AudioState } from './state.js';
export default function pauseMusic() {
  if (AudioState.currentMusicAudio) {
    AudioState.currentMusicAudio.pause();
    AudioState.currentMusicAudio.currentTime = 0;
    AudioState.currentMusicAudio = null;
  }
  AudioState.isPlayingMusic = false;
}