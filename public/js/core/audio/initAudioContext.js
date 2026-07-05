import { AudioState } from './state.js';
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
}