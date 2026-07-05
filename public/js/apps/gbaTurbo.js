/**
 * GBA Turbo App
 * A performance-focused version of the GBA emulator using the gpSP core.
 */
window.gbaTurbo = {
  id: 'gbaTurbo',
  title: 'GBA Turbo',
  
  open: function(container) {
    // We can reuse the rendering logic from GBA but with a different flag
    // For simplicity, I'll copy the core parts and modify the core parameter
    this.render(container);
  },

  render: function(container) {
    if (window.GBA_GAMES && window.GBA_GAMES.length > 0) {
      this.renderTurboMenu(container);
    } else {
      container.innerHTML = '<div style="color:white; padding:20px; font-family: sans-serif; text-align:center; margin-top:50px;">' +
        '<div class="loading-spinner"></div><br>Chargement des jeux...</div>';
      setTimeout(() => this.render(container), 200);
    }
  },

  renderTurboMenu: function(container) {
    if (this.currentCoverIndex === undefined) this.currentCoverIndex = 0;
    
    // Inject Turbo-specific styles if not already present
    if (!document.getElementById('gba-turbo-styles')) {
        const style = document.createElement('style');
        style.id = 'gba-turbo-styles';
        style.textContent = `
            .turbo-wrapper {
                width: 100%; height: 100%; display: flex; flex-direction: column;
                background: radial-gradient(circle at center, #300 0%, #000 100%);
                color: white; font-family: 'Inter', sans-serif; overflow: hidden; position: relative;
            }
            .turbo-header {
                height: 80px; display: flex; align-items: center; justify-content: center;
                background: rgba(0,0,0,0.5); border-bottom: 2px solid #ff4b4b;
            }
            .turbo-header h2 {
                color: #ff4b4b; font-weight: 900; letter-spacing: 2px; text-transform: uppercase;
                text-shadow: 0 0 15px rgba(255,0,0,0.8); margin: 0; font-size: 28px;
            }
            .turbo-carousel {
                flex: 1; display: flex; align-items: center; justify-content: center;
                position: relative; overflow: hidden; padding: 40px 0;
            }
            .turbo-cards-container {
                display: flex; gap: 40px; transition: transform 0.5s cubic-bezier(0.2, 1, 0.3, 1);
                align-items: center; padding: 0 50%;
            }
            .turbo-card {
                flex-shrink: 0; width: 220px; height: 320px; border-radius: 12px;
                background: #1a1a1a; cursor: pointer; transition: all 0.4s;
                position: relative; overflow: hidden; opacity: 0.4; transform: scale(0.9);
                border: 2px solid transparent; box-shadow: 0 10px 30px rgba(0,0,0,0.5);
            }
            .turbo-card.active {
                opacity: 1; transform: scale(1.1); border-color: #ff4b4b;
                box-shadow: 0 0 40px rgba(255,0,0,0.4), 0 20px 40px rgba(0,0,0,0.8);
                z-index: 10;
            }
            .turbo-card img { width: 100%; height: 100%; object-fit: cover; }
            
            .turbo-nav {
                position: absolute; top: 50%; transform: translateY(-50%);
                width: 80px; height: 120px; background: rgba(0,0,0,0.6);
                border: 2px solid #ff4b4b; color: white; font-size: 40px;
                display: flex; align-items: center; justify-content: center;
                cursor: pointer; z-index: 100; border-radius: 15px; transition: 0.2s;
            }
            .turbo-nav:hover { background: #ff4b4b; transform: translateY(-50%) scale(1.05); }
            .turbo-nav.prev { left: 40px; }
            .turbo-nav.next { right: 40px; }
            
            .turbo-footer {
                height: 140px; display: flex; flex-direction: column; align-items: center;
                justify-content: center; gap: 15px; background: rgba(0,0,0,0.8);
                border-top: 1px solid rgba(255,255,255,0.1);
            }
            .turbo-launch-btn {
                padding: 12px 40px; background: #ff4b4b; color: white; font-weight: 900;
                border: none; border-radius: 40px; cursor: pointer; font-size: 18px;
                letter-spacing: 1px; transition: 0.2s; box-shadow: 0 0 20px rgba(255,0,0,0.4);
            }
            .turbo-launch-btn:hover { transform: scale(1.1); box-shadow: 0 0 30px rgba(255,0,0,0.7); background: #ff1a1a; }
            .turbo-quit-btn { color: #f99; background: none; border: none; cursor: pointer; font-weight: 700; }
        `;
        document.head.appendChild(style);
    }

    const games = window.GBA_GAMES;
    let cardsHtml = games.map((game, i) => `
        <div class="turbo-card ${i === this.currentCoverIndex ? 'active' : ''}" data-index="${i}">
            <img src="${game.cover}" onerror="this.src='assets/icons/guestbook.webp'">
        </div>
    `).join('');

    container.innerHTML = `
        <div class="turbo-wrapper">
            <div class="turbo-header"><h2>GBA TURBO ⚡ PERFORMANCE</h2></div>
            <button class="turbo-nav prev" id="turbo-prev">‹</button>
            <button class="turbo-nav next" id="turbo-next">›</button>
            <div class="turbo-carousel">
                <div class="turbo-cards-container" id="turbo-row">
                    ${cardsHtml}
                </div>
            </div>
            <div class="turbo-footer">
                <div style="font-size: 24px; font-weight: 800; color: #fff;">${games[this.currentCoverIndex].name}</div>
                <div style="display: flex; gap: 20px;">
                    <button class="turbo-launch-btn" id="turbo-launch">BOOST START</button>
                    <button class="turbo-quit-btn" id="turbo-quit">QUITTER</button>
                </div>
            </div>
        </div>
    `;

    const row = container.querySelector('#turbo-row');
    const update = () => {
        container.querySelectorAll('.turbo-card').forEach((card, i) => {
            card.classList.toggle('active', i === this.currentCoverIndex);
        });
        const offset = -(this.currentCoverIndex * 260); // card width (220) + gap (40)
        row.style.transform = `translateX(${offset}px)`;
        container.querySelector('.turbo-footer div').textContent = games[this.currentCoverIndex].name;
    };

    container.querySelector('#turbo-prev').onclick = () => {
        if (this.currentCoverIndex > 0) { this.currentCoverIndex--; update(); }
    };
    container.querySelector('#turbo-next').onclick = () => {
        if (this.currentCoverIndex < games.length - 1) { this.currentCoverIndex++; update(); }
    };
    container.querySelector('#turbo-launch').onclick = () => {
        if (typeof AudioManager !== 'undefined') AudioManager.playClick();
        this.launchTurbo(container, games[this.currentCoverIndex]);
    };
    container.querySelector('#turbo-quit').onclick = () => {
        window.AppRegistry['gbaTurbo'].close();
    };

    // Card click selection
    container.querySelectorAll('.turbo-card').forEach(card => {
        card.onclick = () => {
            const index = parseInt(card.dataset.index);
            if (index === this.currentCoverIndex) {
                container.querySelector('#turbo-launch').click();
            } else {
                this.currentCoverIndex = index;
                update();
            }
        };
    });

    update();
  },

  launchTurbo: function(container, game) {
    const romUrl = encodeURIComponent(game.file);
    const gameName = encodeURIComponent(game.name);
    
    // Stop background music
    if (typeof AudioManager !== 'undefined') {
      AudioManager.pauseMusic();
      if (AudioManager.appBgm) {
        AudioManager.appBgm.pause();
        AudioManager.appBgm.currentTime = 0;
        AudioManager.appBgm = null;
      }
    }

    container.innerHTML = `
      <div style="display: flex; flex-direction: column; width: 100%; height: 100%; background: #000; overflow: hidden; animation: gbaFadeIn 0.3s ease-out;">
        <div style="padding: 12px 20px; background: rgba(180,20,20,0.9); backdrop-filter: blur(10px); display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid rgba(255,100,100,0.3); z-index: 100;">
          <div id="emu-back-btn" style="display: flex; align-items: center; gap: 8px; background: rgba(255,255,255,0.1); border: 2px solid rgba(255,255,255,0.2); border-radius: 40px; padding: 6px 18px; color: white; cursor: pointer; font-weight: 700; transition: 0.2s;">
             <span style="background: white; color: black; border-radius: 50%; width: 20px; height: 20px; text-align: center; line-height: 20px; font-size: 13px;">B</span> Quitter
          </div>
          <h3 style="margin: 0; color: white; font-size: 20px; font-weight: 800; letter-spacing: 1px; text-shadow: 0 0 10px rgba(255,0,0,0.5);">GBA TURBO : ${game.name}</h3>
          <div style="width: 100px; color: #ff4b4b; font-size: 10px; font-weight: 900;">CORE: GPSP</div>
        </div>
        <div style="flex: 1; position: relative; display: flex; align-items: center; justify-content: center; background: radial-gradient(circle, #300, #000);">
          <iframe src="/apps/gba/gba_player.html#rom=${romUrl}&name=${gameName}&core=gba" style="border: none; width: 100%; height: 100%; max-width: 1280px;" allow="autoplay; fullscreen"></iframe>
        </div>
      </div>
    `;

    const backBtn = container.querySelector('#emu-back-btn');
    backBtn.addEventListener('click', () => {
      if (typeof AudioManager !== 'undefined') {
        AudioManager.playClick();
        AudioManager.playAppLaunchTransition(null, 'gbaBgm');
      }
      this.render(container); 
    });
  }
};

export default async function openGbaTurbo(container) {
    if (!window.GBA_GAMES) {
        try {
            await import('../../../apps/gba/js/gba.js');
        } catch (e) {
            console.error("Failed to load base GBA data for Turbo:", e);
        }
    }
    if (window.gbaTurbo) window.gbaTurbo.open(container);
}
