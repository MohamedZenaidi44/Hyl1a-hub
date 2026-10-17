const fs = require('fs');
const file = 'public/js/core/visualizer.js';
let content = fs.readFileSync(file, 'utf8');

// Add clock suspension when tab becomes hidden
const oldHidden = "document.body.classList.add('tab-hidden');";
const newHidden = `document.body.classList.add('tab-hidden');
        // Suspendre l'horloge (inutile de tick chaque seconde sur un onglet caché)
        if (window._clockInterval) { clearInterval(window._clockInterval); window._clockInterval = null; }`;
content = content.replace(oldHidden, newHidden);

// Add clock resume when tab becomes visible again
const oldVisible = "document.body.classList.remove('tab-hidden');";
const newVisible = `document.body.classList.remove('tab-hidden');
        // Relancer l'horloge si elle avait été suspendue
        if (!window._clockInterval && document.getElementById('top-time')) {
          const _t = document.getElementById('top-time'), _d = document.getElementById('top-date');
          const _days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
          const _mo = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
          const _tick = () => {
            const n = new Date();
            _t.innerHTML = n.getHours().toString().padStart(2,'0') + ':' + n.getMinutes().toString().padStart(2,'0') + ' <span class="am-pm">' + (n.getHours() >= 12 ? 'PM' : 'AM') + '</span>';
            _d.textContent = _days[n.getDay()] + ', ' + _mo[n.getMonth()] + ' ' + n.getDate();
          };
          _tick();
          window._clockInterval = setInterval(_tick, 1000);
        }`;
content = content.replace(oldVisible, newVisible);

fs.writeFileSync(file, content, 'utf8');
console.log('Done — clock pause/resume added to visibilitychange handler.');
