/**
 * Wii Warning Screen
 * Écran d'avertissement façon "Wii Health and Safety" affiché APRÈS le login,
 * pour profiter de l'interaction utilisateur (clic sur "Se connecter") et ainsi
 * éviter le blocage de l'autoplay audio par le navigateur.
 *
 * L'écran reste caché (display:none) tant que #auth-overlay est visible.
 * Dès que le login réussit (l'overlay d'auth est masqué par ton code
 * d'authentification), l'écran Wii apparaît et le son démarre immédiatement.
 * L'écran est ensuite verrouillé pendant LOCK_DURATION_MS avant de pouvoir
 * être fermé (clic ou touche), révélant alors le hub en dessous.
 */

(function () {
  const LOCK_DURATION_MS = 3000;
  const WARNING_AUDIO_SRC = 'public/assets/audio/wiiaudio.mp3';

  let locked = true;
  let activated = false;
  let warningAudio = null;
  let audioStarted = false;

  function tryPlayWarningAudio() {
    if (audioStarted || !warningAudio) return;

    const playPromise = warningAudio.play();
    if (playPromise && typeof playPromise.then === 'function') {
      playPromise
        .then(() => { audioStarted = true; })
        .catch(() => { /* autoplay bloqué, on retentera à la prochaine interaction */ });
    } else {
      audioStarted = true;
    }
  }

  function dismiss() {
    const overlay = document.getElementById('wii-warning-overlay');
    if (!overlay || overlay.classList.contains('is-hiding') || locked) return;

    if (typeof AudioManager !== 'undefined' && AudioManager.playClick) {
      AudioManager.playClick();
    }

    if (warningAudio && !warningAudio.paused) {
      warningAudio.pause();
    }

    overlay.classList.add('is-hiding');
    overlay.removeEventListener('click', onInteract);
    window.removeEventListener('keydown', onInteract);

    // Signale au reste de l'app que l'écran Wii est fermé : c'est SEULEMENT
    // à partir de là que app.js démarre la musique du hub (voir app.js).
    document.dispatchEvent(new Event('hylia:wii-warning-dismissed'));

    overlay.addEventListener('transitionend', () => {
      overlay.style.display = 'none';
      overlay.classList.remove('is-active');
    }, { once: true });

    // Filet de sécurité si transitionend ne se déclenche pas (ex: onglet en arrière-plan)
    setTimeout(() => {
      overlay.style.display = 'none';
      overlay.classList.remove('is-active');
    }, 900);
  }

  function onInteract(e) {
    if (locked) return;

    if (e.type === 'keydown') {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') {
        e.preventDefault();
        dismiss();
      }
      return;
    }

    dismiss();
  }

  /**
   * Révèle l'écran Wii et lance le son. Appelée juste après le login réussi,
   * donc immédiatement après un clic utilisateur — l'autoplay avec son n'est
   * pas bloqué par le navigateur dans ce contexte.
   */
  function activate() {
    if (activated) return;
    activated = true;

    const overlay = document.getElementById('wii-warning-overlay');
    if (!overlay) return;

    overlay.classList.remove('is-hiding');
    overlay.classList.add('is-active');
    overlay.style.display = '';

    warningAudio = new Audio(WARNING_AUDIO_SRC);
    warningAudio.volume = 1;
    tryPlayWarningAudio();

    overlay.addEventListener('click', onInteract);
    window.addEventListener('keydown', onInteract);

    locked = true;
    setTimeout(() => {
      locked = false;
      overlay.classList.add('is-ready'); // révèle le bandeau "Press A to continue"
    }, LOCK_DURATION_MS);
  }

  /**
   * Surveille #auth-overlay et déclenche activate() dès qu'il disparaît
   * (display:none, visibility:hidden, ou classe "hidden" ajoutée par ton
   * code d'auth). Fonctionne sans avoir besoin de modifier auth.js.
   */
  function watchAuthOverlay() {
    const authOverlay = document.getElementById('auth-overlay');
    if (!authOverlay) { activate(); return; } // pas d'écran de login => on affiche direct

    const isAuthHidden = () => {
      const style = window.getComputedStyle(authOverlay);
      return style.display === 'none' ||
             style.visibility === 'hidden' ||
             authOverlay.classList.contains('hidden');
    };

    if (isAuthHidden()) { activate(); return; }

    const observer = new MutationObserver(() => {
      if (isAuthHidden()) {
        observer.disconnect();
        activate();
      }
    });
    observer.observe(authOverlay, { attributes: true, attributeFilter: ['style', 'class'] });
  }

  document.addEventListener('DOMContentLoaded', () => {
    const overlay = document.getElementById('wii-warning-overlay');
    if (!overlay) return;

    // Si ton code d'authentification dispatch un évènement personnalisé à la
    // connexion réussie (ex: document.dispatchEvent(new Event('hylia:auth-success'))),
    // il sera aussi pris en compte — en plus de la détection automatique ci-dessous.
    document.addEventListener('hylia:auth-success', activate, { once: true });

    watchAuthOverlay();
  });
})();
