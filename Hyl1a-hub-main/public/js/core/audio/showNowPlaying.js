export default function showNowPlaying(trackName) {
  const old = document.querySelector('.now-playing-container');
  if (old) old.remove();
  const container = document.createElement('div');
  container.className = 'now-playing-container';
  container.innerHTML = `<div class="now-playing-bars"><span></span><span></span><span></span><span></span></div><div class="now-playing-text"><div class="now-playing-label">Now Playing</div><div class="now-playing-title">${trackName}</div></div>`;
  document.body.appendChild(container);
  requestAnimationFrame(() => container.classList.add('active'));
  setTimeout(() => {
    container.classList.add('exit');
    container.classList.remove('active');
    setTimeout(() => container.remove(), 1600);
  }, 5000);
}