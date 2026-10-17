// Notes App
export default function renderNotes(container) {
      container.innerHTML = `
        <div class="app-inner notes-app">
          <style>
            .notepad {
              flex: 1;
              width: 100%;
              height: 100%;
              background: #fff;
              background-image: linear-gradient(#f1f1f1 1px, transparent 1px);
              background-size: 100% 30px;
              border: 1px solid #ccc;
              border-radius: 8px;
              padding: 10px 10px 10px 40px;
              font-family: 'Comic Sans MS', cursive, sans-serif;
              font-size: 16px;
              line-height: 30px;
              resize: none;
              outline: none;
              position: relative;
              color: #333;
            }
            .notepad-wrapper {
              flex: 1;
              position: relative;
              margin-top: 10px;
            }
            .notepad-wrapper::before {
              content: '';
              position: absolute;
              top: 0;
              bottom: 0;
              left: 30px;
              width: 2px;
              background: rgba(255, 100, 100, 0.4);
              z-index: 10;
              pointer-events: none;
            }
          </style>
          <h2>📓 Personal Notes</h2>
          <p>Jot down your thoughts here. They'll disappear when you close the tab, just like the old days.</p>
          
          <div class="notepad-wrapper">
            <textarea class="notepad" placeholder="Dear Diary..."></textarea>
          </div>
        </div>
      `;

      const textarea = container.querySelector('.notepad');
      
      // Little soft ticks for typing
      textarea.addEventListener('input', () => {
        // Minimal click sound for typing, don't spam it too fast so throttle it slightly
        if (textarea.dataset.typing === "true") return;
        textarea.dataset.typing = "true";
        if (typeof AudioManager !== 'undefined') AudioManager.playClick();
        
        setTimeout(() => {
          textarea.dataset.typing = "false";
        }, 50);
      });
}
