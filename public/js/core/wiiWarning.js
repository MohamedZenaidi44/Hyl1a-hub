/**
 * Wii Warning Screen
 * Écran d'avertissement façon "Wii Health and Safety" affiché avant le login.
 * Un clic (ou une touche) le fait disparaître en fondu pour révéler l'écran
 * de connexion, déjà présent en dessous (#auth-overlay).
 */

(function () {
  function dismiss() {
    const overlay = document.getElementById('wii-warning-overlay');
    if (!overlay || overlay.classList.contains('is-hiding')) return;

    if (typeof AudioManager !== 'undefined' && AudioManager.playClick) {
      AudioManager.playClick();
    }

    overlay.classList.add('is-hiding');
    window.removeEventListener('keydown', onKeydown);

    // On retire l'overlay du flux une fois le fondu terminé
    overlay.addEventListener('transitionend', () => {
      overlay.style.display = 'none';
    }, { once: true });

    // Filet de sécurité si transitionend ne se déclenche pas (ex: onglet en arrière-plan)
    setTimeout(() => { overlay.style.display = 'none'; }, 900);
  }

  function onKeydown(e) {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') {
      e.preventDefault();
      dismiss();
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    const overlay = document.getElementById('wii-warning-overlay');
    if (!overlay) return;

    overlay.addEventListener('click', dismiss);
    window.addEventListener('keydown', onKeydown);
  });
})();
