// Music Player App
export default function renderMusic(container) {
      container.innerHTML = `
        <div class="app-inner music-app">
          <style>
            .music-player {
              background: linear-gradient(135deg, #eef7ff, #d4ebff);
              border-radius: 16px;
              padding: 20px;
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 20px;
              border: 1px solid rgba(255,255,255,0.8);
              box-shadow: inset 0 2px 5px rgba(255,255,255,1);
            }
            .track-title {
              font-size: 20px;
              font-weight: bold;
              color: var(--color-primary-dark);
            }
            .controls {
              display: flex;
              gap: 15px;
            }
            .control-btn {
              width: 50px;
              height: 50px;
              border-radius: 50%;
              font-size: 20px;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .progress-bar {
              width: 100%;
              height: 10px;
              background: rgba(0,0,0,0.1);
              border-radius: 5px;
              overflow: hidden;
            }
            .progress {
              width: 30%;
              height: 100%;
              background: var(--color-primary);
            }
          </style>
          <h2>📻 Ambient Radio</h2>
          <p>Eshop July 2014.</p>
          
          <div class="music-player">
            <div class="track-title">Eshop July 2014 (Muted)</div>
            <div class="progress-bar">
              <div class="progress"></div>
            </div>
            <div class="controls">
              <button class="btn-glossy control-btn">⏮</button>
              <button class="btn-glossy control-btn" id="play-pause-btn">▶</button>
              <button class="btn-glossy control-btn">⏭</button>
            </div>
          </div>
        </div>
      `;

      const playBtn = container.querySelector('#play-pause-btn');
      playBtn.addEventListener('click', () => {
        if (typeof AudioManager !== 'undefined') {
          AudioManager.playClick();
          // Toggle text
          const isPlaying = playBtn.textContent === '⏸';
          playBtn.textContent = isPlaying ? '▶' : '⏸';
          container.querySelector('.track-title').textContent = isPlaying ? 'Eshop July 2014 (Paused)' : 'Eshop July 2014 (Playing)';
          // Real music toggle logic would go here if we were playing Audio/Synth loops
        }
      });
}
