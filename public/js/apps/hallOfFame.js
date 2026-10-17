// Arcade / Hall of Fame
export default function renderHallOfFame(container) {
      container.innerHTML = `
        <div class="app-inner arcade-app">
          <style>
            .trophy-list {
              display: flex;
              flex-direction: column;
              gap: 15px;
              margin-top: 20px;
            }
            .trophy-item {
              display: flex;
              align-items: center;
              padding: 15px;
              background: linear-gradient(180deg, rgba(255,255,255,1), rgba(240,248,255,1));
              border-radius: 12px;
              box-shadow: 0 4px 6px rgba(0,0,0,0.05);
              border: 1px solid rgba(0, 150, 255, 0.2);
              transition: transform 0.2s;
            }
            .trophy-item:hover {
              transform: translateX(5px);
              box-shadow: 0 6px 12px rgba(0,100,200,0.1);
            }
            .trophy-icon {
              font-size: 30px;
              margin-right: 15px;
              background: #fff;
              border-radius: 50%;
              width: 50px;
              height: 50px;
              display: flex;
              justify-content: center;
              align-items: center;
              box-shadow: inset 0 2px 4px rgba(0,0,0,0.1);
            }
            .trophy-text h3 { margin: 0; color: #333; font-size: 16px; }
            .trophy-text p { margin: 5px 0 0; font-size: 13px; color: #666; }
          </style>
          <h2>👾 Hall of Fame</h2>
          <p>A collection of mini-projects and achievements.</p>
          <div class="trophy-list">
            <div class="trophy-item">
              <div class="trophy-icon">🏆</div>
              <div class="trophy-text">
                <h3>First Visited</h3>
                <p>You booted up the plaza for the first time.</p>
              </div>
            </div>
            <div class="trophy-item">
              <div class="trophy-icon">⭐</div>
              <div class="trophy-text">
                <h3>CSS Master</h3>
                <p>Appreciated the Frutiger Aero aesthetic.</p>
              </div>
            </div>
            <div class="trophy-item">
              <div class="trophy-icon">🕹️</div>
              <div class="trophy-text">
                <h3>Button Masher</h3>
                <p>Clicked every building in the hub.</p>
              </div>
            </div>
          </div>
        </div>
      `;

      // Add simple interaction sounds
      const items = container.querySelectorAll('.trophy-item');
      items.forEach(item => {
        item.addEventListener('mouseenter', () => {
          if (typeof AudioManager !== 'undefined') AudioManager.playClick();
        });
      });
}
