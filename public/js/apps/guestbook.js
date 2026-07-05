// Guestbook App
export default function renderGuestbook(container) {
      container.innerHTML = `
        <div class="app-inner guestbook-app">
          <style>
            .message-board {
              flex: 1;
              background: #fffdf2;
              border: 1px solid #e0d8b0;
              border-radius: 8px;
              padding: 15px;
              overflow-y: auto;
              margin-bottom: 15px;
              box-shadow: inset 0 2px 5px rgba(0,0,0,0.05);
            }
            .message {
              padding: 10px;
              border-bottom: 1px dashed #ccc;
            }
            .message:last-child {
              border-bottom: none;
            }
            .message-author { font-weight: bold; color: var(--color-primary-dark); }
            .message-text { margin-top: 5px; color: #444; }
            .guestbook-form {
              display: flex;
              gap: 10px;
            }
            .guestbook-input {
              flex: 1;
              padding: 10px;
              border-radius: 20px;
              border: 1px solid #ccc;
              font-family: inherit;
              outline: none;
            }
            .guestbook-input:focus {
              border-color: var(--color-primary);
              box-shadow: 0 0 5px rgba(0, 150, 255, 0.5);
            }
          </style>
          <h2>📝 Town Board</h2>
          <p>Leave a message for other visitors!</p>
          
          <div class="message-board" id="board-messages">
            <div class="message"><div class="message-author">Mayor</div><div class="message-text">Welcome to our lovely plaza!</div></div>
            <div class="message"><div class="message-author">Traveler</div><div class="message-text">Wow, this place feels so nostalgic.</div></div>
          </div>
          
          <form class="guestbook-form" id="guestbook-form">
            <input type="text" id="guest-msg" class="guestbook-input" placeholder="Type a message..." required autocomplete="off">
            <button type="submit" class="btn-glossy">Post</button>
          </form>
        </div>
      `;

      const form = container.querySelector('#guestbook-form');
      const input = container.querySelector('#guest-msg');
      const board = container.querySelector('#board-messages');

      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = input.value.trim();
        if (text) {
          if (typeof AudioManager !== 'undefined') AudioManager.playPop();
          
          const msgDiv = document.createElement('div');
          msgDiv.className = 'message';
          msgDiv.innerHTML = `<div class="message-author">Guest</div><div class="message-text">${text}</div>`;
          board.appendChild(msgDiv);
          board.scrollTop = board.scrollHeight; // Auto-scroll to bottom
          
          input.value = '';
        }
      });
}
