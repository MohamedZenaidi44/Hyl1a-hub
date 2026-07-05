import { AudioState } from './state.js';
import _play from './playInternal.js';
import init from './init.js';

export default function playConnectSuccess() {
  if (!AudioState._initialized) init();
  const sound = AudioState.sounds['connectSuccess'];
  if (sound) {
    sound.play().catch(() => {
      AudioState._pendingConnectSuccess = true;
    });
  }
}