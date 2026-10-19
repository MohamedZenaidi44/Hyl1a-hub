/**
 * BOOT SCREEN — préchargement façon console de jeu.
 *
 * Au premier lancement de la session : barre de progression style
 * « compilation de shaders » pendant que les assets critiques sont chargés
 * (fontes, icônes/chaînes, jaquettes, vidéo de fond, sons d'interface).
 * Les visites suivantes de la même session passent par un boot rapide.
 * Une fois terminé, un warm-up discret précharge le loader EmulatorJS pour
 * accélérer le premier lancement d'un émulateur.
 *
 * Garanties : chaque tâche a un timeout propre ; le boot ne peut jamais
 * bloquer le site (cap global de ~2,5 s, puis sortie forcée).
 */
(function () {
  'use strict';

  var MAX_TASK_MS = 4000;   // timeout par tâche
  var MIN_VISIBLE = 800;    // durée minimale d'affichage (effet console)
  var HARD_CAP = 2500;      // sortie forcée si ça traîne

  var IMAGES = [
    'public/assets/icons/logov2.webp',
    'public/assets/icons/profil.webp',
    'public/assets/icons/ami.webp',
    'public/assets/icons/miiplaza.webp',
    'public/assets/icons/message.webp',
    'public/assets/icons/mii.webp',
    'public/assets/icons/bobaboy.webp',
    'public/assets/menu/hero/bio.webp',
    'public/assets/menu/boxart/bio.webp',
    'public/assets/menu/icon/gba-l.webp',
    'public/assets/menu/icon/gba-d.webp',
    'public/assets/menu/icon/nds-l.webp',
    'public/assets/menu/icon/nds-d.webp',
    'public/assets/menu/icon/nes-l.webp',
    'public/assets/menu/icon/nes-d.webp',
    'public/assets/menu/icon/n64-l.webp',
    'public/assets/menu/icon/n64-d.webp',
    'public/assets/emulators/GBA.webp'
  ];

  var AUDIO_WARM = [
    'public/assets/audio/click_survol_tuile.m4a',
    'public/assets/audio/pop_interaction.wav'
  ];

  var TIPS = [
    'Compiler les shaders…',
    'Charger les chaînes du menu…',
    'Ajuster les jaquettes…',
    'Préparer le salon Hylia…',
    "Synchroniser l'ambiance sonore…"
  ];

  function bootScreen() { return document.getElementById('boot-screen'); }

  function hideBoot() {
    var el = bootScreen();
    if (!el || el.classList.contains('boot-done')) return;
    try { sessionStorage.setItem('hylia-booted', '1'); } catch (e) { /* ignore */ }
    el.classList.add('boot-done');
    setTimeout(function () { el.setAttribute('aria-hidden', 'true'); }, 520);
    document.dispatchEvent(new CustomEvent('boot-finished'));
    // Warm-up discret du cache CDN EmulatorJS (accélère le 1er lancement d'émulateur)
    setTimeout(function () {
      try { fetch('https://pub-045046eb23854c6e897afff1193bf9bf.r2.dev/emulatorjs/loader.js', { mode: 'no-cors', cache: 'default' }).catch(function () {}); }
      catch (e) { /* ignore */ }
    }, 1500);
  }

  function setProgress(done, total) {
    var bar = document.getElementById('boot-bar-fill');
    if (bar && total > 0) bar.style.width = Math.min(100, Math.round((done / total) * 100)) + '%';
  }

  function setStatus(text) {
    var st = document.getElementById('boot-status');
    if (st) st.textContent = text;
    var tip = document.getElementById('boot-tip');
    if (tip) tip.textContent = TIPS[(Math.random() * TIPS.length) | 0];
  }

  function loadImage(src) {
    return new Promise(function (resolve) {
      var t = setTimeout(resolve, MAX_TASK_MS);
      var img = new Image();
      img.onload = function () { clearTimeout(t); resolve(); };
      img.onerror = function () { clearTimeout(t); resolve(); };
      img.src = src;
    });
  }

  function fetchWarm(url) {
    return new Promise(function (resolve) {
      var t = setTimeout(resolve, MAX_TASK_MS);
      fetch(url, { cache: 'default' })
        .then(function () { clearTimeout(t); resolve(); })
        .catch(function () { clearTimeout(t); resolve(); });
    });
  }

  function waitForVideo() {
    return new Promise(function (resolve) {
      var v = document.getElementById('bg-video');
      if (!v || v.readyState >= 2) { resolve(); return; }
      var done = false;
      var finish = function () { if (!done) { done = true; clearTimeout(t); v.removeEventListener('loadeddata', finish); resolve(); } };
      var t = setTimeout(finish, MAX_TASK_MS);
      v.addEventListener('loadeddata', finish);
    });
  }

  function waitForFonts() {
    return new Promise(function (resolve) {
      var t = setTimeout(resolve, 2500);
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(function () { clearTimeout(t); resolve(); });
      } else { clearTimeout(t); resolve(); }
    });
  }

  function run() {
    var el = bootScreen();
    if (!el) return;

    var alreadyBooted = false;
    try { alreadyBooted = sessionStorage.getItem('hylia-booted') === '1'; } catch (e) {}

    // Session déjà amorcée : pas de boot artificiel, on rend la main tout de suite.
    if (alreadyBooted) {
      setProgress(1, 1);
      setStatus('Prêt !');
      hideBoot();
      return;
    }

    var tasks = [];
    // La logo du boot est déjà dans le DOM : pas besoin de la recharger
    tasks.push({ label: "Préparation de l'écran…", run: Promise.resolve() });

    IMAGES.forEach(function (src) { tasks.push({ label: 'Charger les chaînes…', run: loadImage(src) }); });
    AUDIO_WARM.forEach(function (src) { tasks.push({ label: "Charger l'interface sonore…", run: fetchWarm(src) }); });
    tasks.push({ label: 'Charger le fond animé…', run: waitForVideo() });
    tasks.push({ label: 'Charger les polices…', run: waitForFonts() });

    var done = 0, total = tasks.length;
    setProgress(0, total);
    setStatus(tasks[0].label);

    var startedAt = Date.now();
    tasks.forEach(function (task, i) {
      // Décale les tâches lourdes (vidéo, sons) de quelques frames pour
      // laisser passer le paint du boot screen avant les gros fetchs.
      setTimeout(function () {
        if (i % 4 === 3) setStatus(task.label);
        task.run.then(function () {
          done++;
          setProgress(done, total);
          if (done >= total) {
            setStatus('Prêt !');
            var wait = Math.max(0, MIN_VISIBLE - (Date.now() - startedAt));
            setTimeout(hideBoot, wait);
          }
        });
      }, i * 30);
    });

    // Cap de sécurité : ne jamais rester coincé
    setTimeout(hideBoot, HARD_CAP);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();
