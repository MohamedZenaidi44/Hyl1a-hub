// Gallery App
export default function renderGallery(container) {
      container.innerHTML = `
        <div class="app-inner gallery-app">
          <style>
            .gallery-grid {
              display: grid;
              grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
              gap: 15px;
              margin-top: 15px;
            }
            .gallery-item {
              aspect-ratio: 4/3;
              background: #eef7ff;
              border-radius: 12px;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 24px;
              cursor: pointer;
              transition: transform 0.2s, box-shadow 0.2s;
              border: 1px solid rgba(0, 150, 255, 0.2);
            }
            .gallery-item:hover {
              transform: scale(1.05);
              box-shadow: 0 8px 16px rgba(0, 100, 255, 0.2);
              background: #fff;
            }
          </style>
          <h2>🖼️ Photo Gallery</h2>
          <p>Memories from the plaza. Click an image to view.</p>
          <div class="gallery-grid">
            <div class="gallery-item">🌅</div>
            <div class="gallery-item">🐶</div>
            <div class="gallery-item">🍕</div>
            <div class="gallery-item">🏖️</div>
            <div class="gallery-item">🎉</div>
            <div class="gallery-item">🌸</div>
          </div>
        </div>
      `;
      
      // Interactive pop sound for gallery items
      const items = container.querySelectorAll('.gallery-item');
      items.forEach(item => {
        item.addEventListener('click', () => {
          if (typeof AudioManager !== 'undefined') AudioManager.playPop();
          // Minimal mock fullscreen logic
          item.style.transform = 'scale(1.2)';
          setTimeout(() => item.style.transform = '', 200);
        });
      });
}
