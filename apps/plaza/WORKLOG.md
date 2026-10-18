# Worklog — App PLAZA (Hyl1a Hub)

> Trace de travail pour retrouver le contexte entre sessions.
> Objectif complet : voir `Objectif.txt` à la racine (« PROMPT : Créer l'app PLAZA »).

## Objectif

Créer une app **PLAZA** : une place virtuelle où des Mii vivent, marchent,
discutent et interagissent (vue de dessus inclinée façon sélecteur de Mii de la
Wii, interactions inspirées de Tomodachi Life / Mii Plaza 3DS).

## Intégration au hub (déjà en place)

- App id : **`miiPlaza`** (réutilisé ; ancien placeholder `_wip` remplacé).
- `public/js/core/app.js` :
  - registre `'miiPlaza': { title: 'Plaza', render: (c) => _lazy(c, '../../../apps/plaza/js/main.js') }`
  - ajouté à la liste **plein écran** (`appId === 'miiPlaza'`).
- `public/js/core/wiiMenu.js` : chaîne **« Plaza »** déplacée dans la catégorie
  **Jeux** (icône `public/assets/icons/app/miiplazac.webp`).
- Contrat d'app : `export default async function render(container)`.

## Structure

```
apps/plaza/
  js/config.js   constantes (caméra, thèmes, qualité, couleurs)
  js/world.js    scène : sol + décor low-poly, caméra LIBRE (OrbitControls), éclairage, thème
  js/mii3d.js    builder 3D d'un Mii (tête FFL reconstruite + corps glTF local)
  js/miiAnims.js chargement (cache) des clips d'animation JSON des Mii
  js/mii.js      entité Mii (3D, repli sprite/procédural) + animations articulées
  js/storage.js  chargement du Mii utilisateur (Firestore avatars/{uid})
  js/main.js     entrée : renderer, HUD, entrées, boucle (pas fixe 30 Hz)
  css/plaza.css  styles (HUD verre sombre, vignette, chargement)
  assets/anims/*.json  clips bakés (retarget Nintendo + gestes procéduraux Tomodachi)
```

## Progression (plan `Objectif.txt` §13)

1. [x] **Étape 1 — Scène Three.js** : sol circulaire (dalles dessinées en
       canvas), caméra perspective inclinée (58°, azimuth fixe, zoom molette,
       parallaxe souris), éclairage hémisphérique + directionnelle avec ombres
       douces, cycle jour/nuit (thèmes `day`/`evening`/`night`) **branché sur
       l'heure réelle** (thème appliqué au chargement, fondu de 4 s aux
       changements de tranche), décor déterministe enrichi (fontaine + ondes,
       arbres ronds, bancs à lattes, lampadaires + halo, buissons, kiosque rayé,
       ciel dégradé + étoiles, nuages, pelouse, rosace, fleurs), boucle
       `requestAnimationFrame` avec logique à pas fixe (30 Hz) et rendu
       libre, redimensionnement responsive + DPR plafonné, pause si onglet
       caché, HUD (retour, titre, horloge, FPS).
2. [x] **Étape 2 — Charger « mon Mii » + idle/walk (en 3D).** `storage.js` lit
       `avatars/{uid}.visual_base64` (Firestore) avec Mii par défaut de secours ;
       `mii.js` (`MiiEntity`) charge le Mii en **vraie 3D complète** via `mii3d.js` :
       **tête FFL reconstruite** (`CharModel`, données FFSD) + **corps glTF Wii U
       local** (`assets/ffl/body/male|female.glb`), inséré dans la scène partagée
       (un seul renderer). Repli en cascade : **3D → sprite image
       (`/miis/image.png`) → Mii procédural canvas**. Ombre « blob », étiquette.
       **Normalisation** : corps ET tête mis à l'échelle AVANT l'attache (l'attache
       FFL fige l'échelle de la tête → sinon tête géante sur corps réduit) ;
       `NATIVE_MII_HEIGHT = 19.7` → hauteur monde 1,9, pieds au sol (lift ∝ échelle).
       **Caméra LIBRE** (`OrbitControls` : orbite, zoom, pan ; bornes tilt/dist/
       target ; touche **R** = recentrer). Animations : `idle` (veille du corps +
       respiration) et `walk` (déplacement au sol, orientation, rebond de pas).
       Vérifié : `is3D=true`, 7 meshes, hauteur 1,9 u, Mii qui se déplace, 0 erreur.
3. [ ] Déplacement autonome + évitement.
4. [ ] Machine à états + besoins.
5. [ ] Bulles de dialogue + conversations.
6. [ ] Interactions souris (survol, clic, attraper, caresser).
7. [ ] Relations, événements spéciaux, journal.
8. [ ] UI complète (panneau Mii, barre d'outils).
9. [ ] Audio.
10. [ ] Sauvegarde Firebase + intégration.
11. [ ] Optimisation / tests 1920×1080 et 2560×1440.

## Décision prise (Étape 2) — **Mii en vraie 3D (FFL + corps local)**

- Tous les Mii = **tête FFL reconstruite** (`CharModel` depuis les données FFSD,
  rendu Nintendo exact) **+ corps glTF Wii U local** (`male|female.glb`), réunis
  dans la **scène partagée** (un seul renderer pour la place). Pipeline identique
  au Mii Maker (`miiViewerFFL.js`), factorisé dans `mii3d.js`.
- **Le GLB distant `type=all_body` est cassé** (tête seule) → abandonné pour le
  corps ; il ne sert qu'au **repli sprite**.
- **Piège d'échelle FFL** : `skeleton.attach` désactive `matrixAutoUpdate` sur la
  tête et fige son échelle locale → scaler le groupe parent réduit le corps mais
  **pas la tête** (« tête géante »). Corrigé en appliquant l'échelle au corps ET à
  la tête **avant** l'attache.
- **Secours hors-ligne** : sprite image puis Mii procédural canvas — la place ne
  reste jamais vide. À surveiller : coût si beaucoup de Mii (LOD à l'étape 11).
- Animations **articulées** obtenues par retargeting (voir Étape 2b) : idle,
  walk, wave, look around.

## Étape 2b — Animations articulées (retargeting authentique)

- **Problème** : le corps FFL local n'avait qu'un clip de veille ; le corps « Wii »
  (`wii mii/*`) avait le **même squelette mais aucune animation**. Vouloir des Mii
  qui bougent réellement (bras, jambes, tête).
- **Choix** : **retargeting authentique**. Les clips Nintendo du
  `Mii_Maker_for_4.0_v2.glb` (`Idle`, `look around`, `wave`, `wave transition`,
  `baked mii animation`) sont transposés sur le squelette FFL local.
- **Outil** : `tests/retarget.html` (page ESM, même importmap qu'`index.html`).
  Il charge le modèle source (Blender) + la cible (`male.glb`), et pour chaque clip :
  joue le clip source, échantillonne à 30 fps les **quaternions monde** des os FK
  déformés (bicep/forearm/hand, thigh/calf/foot, spine, neck, hip — les canaux
  d'anim incluent bien la chaîne déformée, donc pas besoin des os IK), calcule le
  **delta monde** Δ = Rs(t)·Rs_rest⁻¹, puis **repose** chaque os cible sur
  Δ·rest et reconvertit en quaternion **local** (parent→enfant).
- **Mapping** : `hip→hip`, `spine002→chest/chest_2`, `head→head`,
  `bicepL→arm_l1`, `forearmL→arm_l2+elbow_l`, `handL→wrist_l`,
  `thighL→foot_l1`, `calfL→foot_l2+knee_l`, `footL→ankle_l` (+ miroir R).
- **Marche** : aucune marche n'existe dans les sources → fabriquée **procéduralement**
  sur le squelette FFL (oscillations jambes/bras en opposition de phase), semée sur
  la pose de base de l'`Idle`, avec longueur de foulée exportée pour synchroniser
  la cadence à la vitesse (pas de glissement des pieds).
- **Jeu d'expressions/gestes type Tomodachi** (proceduraux, semés sur la pose de
  base de l'`Idle`, même outil `tests/retarget.html`) : `walk`, `run` (locomotion
  accélérée), `talk` (geste de parole, bras droit + tête), `cheer` (les deux bras
  levés au-dessus de la tête), `dance` (oscillation du bassin + bras), `sad`
  (tête et épaules affaissées), `sit` (cuisses à l'horizontale, genoux pliés —
  pour bancs/meubles à l'étape suivante). Tous bouclent ; ajoutés au pool de
  gestes de `mii.js` (sauf `sit`).
- **Sortie** : JSON compact (`times` + quaternions par os) écrits dans
  `apps/plaza/assets/anims/*.json` ; chargés/mis en cache par `miiAnims.js` et
  convertis en `THREE.AnimationClip` (`QuaternionKeyframeTrack`).
- **Intégration** : `mii3d.js` crée une `AnimationMixer` sur le corps et un `play()`
  avec fondu ; `mii.js` joue `idle`/`walk` selon l'état et déclenche des gestes
  ponctuels (`wave`, `lookaround`) en boucle *once*.
- **Vérification numérique** (pas de vision) : `wave` → poignet droit à **+4,2 au-
  dessus de la tête** ; `idle` → poignets au niveau des hanches (bras le long du
  corps) ; aucun NaN ; les 22 os animés. Test plaza : os `foot_l1` qui bouge.

## Tests

- `node tests/plaza-check.js` — lancement, canvas WebGL, rendu (variance pixels),
  zoom molette (caméra libre), **Mii 3D (is3D + 7 meshes)**, HUD « N Mii »,
  déplacement walk, **os articulés par les clips retargetés** (walk/idle chargés +
  quaternion d'os qui change), fermeture. Screenshots :
  `tests/shots/plaza-mii-1920x1080.png`.
- `node tests/social-check.js` — **moteur relationnel Tomodachi Life** (unités
  dans la page via `_plaza.social.relations._test` : table de dérive ROM exacte
  + multiplicateur, débit `floor(minutes÷floor(3000÷paires))` cap 500, ±40
  clampés, banques First/Usual/Unusual(~10 %)/Birthday, chance `(n/2)²/100`,
  confession, porte jalousie, intégrité) + live (interactions forcées
  chat/dispute/anniversaire journalisées, croisement organique ≤ 75 s).
  Screenshots : `tests/shots/plaza-social-*.png`.
- `node tests/wii-menu-check.js` — suite du menu (mise à jour : catégorie Jeux
  passe à 7 chaînes, catégorie Mii à 2).

## Journal

- 2026-10-16 : **Étape 1** réalisée et vérifiée (tests plaza + wii-menu au vert,
  0 erreur console). Intégration hub faite (chaîne « Plaza » dans Jeux).
- 2026-10-16 : **Étape 2** réalisée et vérifiée. Mii en **vraie 3D FFL** (tête
  reconstruite + corps glTF local) via `mii3d.js` ; **caméra libre** (OrbitControls
  + touche R). Bug d'échelle (« tête trop grosse ») diagnostiqué et corrigé :
  l'attache FFL fige l'échelle de la tête → appliquer l'échelle avant l'attache.
  Hauteur calibrée à 1,9 u (mesure pixel), pieds au sol. Tests plaza au vert.
- 2026-10-16 : **Étape 2b** — animations articulées. **Retargeting authentique**
  des clips Nintendo (`Idle`, `look around`, `wave`, `wave transition`, `baked`)
  vers le squelette FFL via `tests/retarget.html` (delta monde 30 fps) + **marche
  procédurale**. JSON bakés → `miiAnims.js` → `THREE.AnimationClip` → mixer.
  `mii3d.js` : `play()` avec fondu ; `mii.js` : idle/walk + gestes ponctuels,
  cadence marche synchronisée à la vitesse. Tests plaza au vert (11 checks,
  0 erreur).
- 2026-10-16 : **Étape 2c — vraies animations Miitomo.** 304 `.Anim.pod` extraits
  du dump Miitomo 547 Mo (format PowerVR POD « AB.POD.2.0 » décodé à la main :
  tags en flux, conteneurs START/END, matrices 4×4/animation). Parseur Python
  (`pod_parse.py`), squelette corps 60 nœuds décodé, convention d'axes
  re-découverte **empiriquement** (composition row-vector + lecture transposée +
  conj des quats de bind — seul combo donnant un bind physiquement plausible,
  cf. tests par directions d'os). Export des **16 articulations → JSON monde**
  (`pod_export.py` → `tests/pod-anims/`), puis retarget vers FFL via
  **`tests/pod-bake.html`** (même math que retarget.html, 30 fps, bouclage
  dropLast). **14 clips pods** bakés : `podwalk`, `podrun`, `podwait`,
  `podwaitf`, `podnod`, `podwave` (bras levé, sans oscillation — pose),
  `podtalk`, `poddance` (Travolta), `poddance2` (Rockabilly), `podjump`,
  `podsad`, `podsit`, `podlook`, `podthink`. Intégration : `miiAnims.js`
  (26 clips), la marche préfère `podwalk` (foulée exportée ≈ **0,31 u monde**,
  cohérente avec l'ancienne marche procédurale 0,3056), pool de gestes
  `wave/podnod/podtalk/poddance/poddance2/podsad`. Vérifs numériques : FK
  (pieds au sol, bras le long du corps, main levée `podwave` au niveau tête,
  bras Travolta au-dessus de la tête), L=+X/R=−X, 0 NaN, tests plaza au vert.
  Limites v1 : pas de motion racine (jump/sit sans translation du bassin —
  pipeline quats seul), `animHandWaveL` du jeu ne contient pas l'oscillation
  (salut = clip `wave` MiiMaker).
- 2026-10-16 : fix `cheer` (bras partaient **derrière** le dos ; rotation −X →
  bras levés **vers l'avant** : poignets Z +1,7..+2,6, Y 13,6-14,1) et `sad`
  (bras légèrement en avant). Re-bake des 12 clips procéduraux + captures
  `tests/shots/plaza-emote-*.png` et nouvelles `tests/shots/plaza-pod-*.png`.
- 2026-10-16 : **Étape 3 — vie sociale (façon Tomodachi Life).** Nouveaux
  modules : `population.js` (6 Mii au total : « mon Mii » + 5 Mii aléatoires
  **déterministes** — codec FFSD du Mii Maker, mêmes bornes que le bouton ↻,
  prénoms FR uniques, `ensureFFLValidMii`), `emotes.js` (bulles canvas :
  cœur/note/colère/sweat/!/?/Zzz) et `social.js` (directeur). **Interactions** :
  deux Mii qui se croisent (rayon 2,4 u, cooldowns 16-38 s) se tournent →
  salut (`wave` + bulle !, hochement) → **conversation alternée**
  (`podtalk`/`podwaitf`/`podnod` + bulles, 3,5-7,5 s) → issue pondérée
  **chat 46 %** (cœurs) / **fou rire 22 %** (`podlaugh`) / **dispute 16 %**
  (`podangry` + colère, puis regret `podsad` + bouderie `podpout`) /
  **danse 16 %** (`poddance`/`poddance2`) → chacun repart.
  **Bancs** : 10 places assises (`world.poi.seats`, 2/banc),
  un Mii oisif y va (18 %), s'assoit (`podsit`, groupe −0,12, bulle Zzz —
  parfois dodo `podsleep` à 30 % et bâillements `podyawn`), se relève. Nouveaux clips pods : `podlaugh`, `podangry`, `podsleep`,
  `podyawn`, `podpout` (31 clips au total). Entité : `scripted` (suspension
  de l'IA locale), `faceTo`, `halt`, `playAnim`, `sitAt`/`standUp`.
  Vérif numérique `social-check.js` : **13/13** (population, clips, 3
  interactions forcées journalisées avec captures `plaza-social-*.png`,
  assise/relève, **croisement organique spontané** en ≤ 75 s, 0 NaN,
  0 erreur console). `plaza-check.js` repassé au vert (6 Mii, 31 actions,
  strideWorld 0,3096).
- 2026-10-16 : polish naturel + logique (retours utilisateur). **Cadence** :
  la foulée exportée était l'écart des pieds (1 pas) → `strideWorld` ×2
  (distance par cycle complet) et vitesse 2,4 → 1,15 u/s ; timeScale podwalk
  4,83× → **1,16×** (jambes naturelles, zéro glissement — vérifié via
  `getEffectiveTimeScale`). **Tête penchée vers le sol** : podwalk incline la
  tête de 22,8° (diff de quat monde, axe +X) → correction runtime −16°
  pondérée par le poids du clip → **6,8°** résiduel (mesuré). **Nametag** :
  suit la hauteur réelle de l'os `head` (marche, assis…). **Collisions** :
  `world.poi.obstacles` (fontaine r5,0 ; troncs 0,45 ; buissons 0,5 ; bancs
  ×2 cercles 0,5 avec `benchIdx` ; lampadaires ; kiosque) + limite de place
  (r 25,8) ; glissement le long des obstacles + détection de blocage (re-cible)
  ; vérifié : distance min fontaine **5,32** (= bord exact), arbre **0,77**.
  **Interactions logiques** : approche **face à face à 1,35 u** (positions de
  rendez-vous, timeout 6 s), orientation vers l'interlocuteur, anti-collage
  (séparation min 0,75), un Mii scripté qui se déplace joue quand même la
  marche, rebond de marche synchronisé aux pas. `social-check.js` : **14/14**
  (dont distance de conversation 1,17 u) ; `plaza-check.js` : tout vert,
  0 erreur console.
- 2026-10-16 : correction des têtes « incohérentes » + nametag (2e retour
  utilisateur). Causes trouvées à la sonde live : (1) **podsit penche aussi la
  tête** (~12°) → table `HEAD_FIX_DEGS = { podwalk: −16, podsit: −8 }` ;
  (2) **piège three.js** : `getEffectiveWeight()` renvoie la valeur initiale
  (1) pour une action JAMAIS jouée → `_applyHeadFix` appliquait une correction
  fantôme aux Mii n'ayant jamais marché/sit — et comme les clips sans track
  « head » ne réécrivent pas l'os, la correction **s'accumulait chaque frame**
  (tête qui vrillait jusqu'à 180°) → garde `act.isRunning()` obligatoire ;
  (3) la correction était faite en **monde** (conjuguée par le cap du groupe)
  → fausse dès que le Mii regarde ailleurs qu'au nord (marche 24° au lieu de
  4°) → correction **locale** (rotation constante dans le repère de l'os).
  **Nametag** : offset par Mii calculé du **sommet réel de la tête** (Box3,
  cheveux compris) + 0,12 ; calcul paresseux au premier update() valide (les
  matrices du squelette ne sont fiables qu'une fois la première frame
  appliquée — au build ET à la 1re frame elles donnent un Box3 faux).
  Vérifié (sonde live 60 s, 1 440 échantillons) : podwalk 4,2°, podsit 5,5°,
  idle 1,0°, aucun échantillon > 28° ; tagOff 1,23-1,27 selon le Mii, écart
  au sommet ≈ +0,10 u pour les 6. `social-check.js` : 14/14 ;
  `plaza-check.js` : tout vert, 0 erreur console.
- 2026-10-16 : naturel de marche + bulles + espace (3e retour utilisateur).
  **Marche en courbe** : trajets > 0,9 u suivis sur un arc de Bézier
  quadratique (déviation latérale aléatoire ≤ 2,2 u, échantillonné en 16
  points, vitesse constante, cap = tangente) — vérifié : déviation max 0,94 u
  sur 20 u ; petits trajets (rendez-vous) restent droits. **Nametag accroché
  au TORSE** (os `chest`) et non plus à la tête : fixe pendant les hochements
  / gestes ; offset par Mii calculé du sommet réel de la tête + 0,12.
  **Bulles à côté de la tête** (x 0,82 ; y = taille − 0,32), plus au-dessus
  du nametag. **Anti-collage en conversation** : au rendez-vous `b` reste sur
  place et `a` se place à 1,35 u (plus de traversée mutuelle quand ils étaient
  déjà proches) ; nudge de sécurité ≥ 1,15 u avant le salut ; garde d'espace
  ≥ 1,05 u pendant greet/talk/outcome ; les Mii scriptés/assis sont immobiles
  et les promeneurs sont repoussés d'eux (plus de traversée des paires en
  discussion). Vérifié : distance de conversation jamais < 1,21 u ; sonde
  probe7 OK ; `social-check.js` 14/14 ; `plaza-check.js` tout vert.
- 2026-10-16 : marche naturelle « flânerie » + plus jamais collés (3e retour, suite). **Fini les Bézier** (l'utilisateur voyait des zigzag) : le déplacement est maintenant un **pilotage par cap** — cap initial = orientation actuelle (continuité d'un trajet à l'autre), convergence avec courbure limitée (rayon 3 u en correction douce, 1,4 u au-delà de 0,5 rad d'erreur, 0,7 u au-delà de 1,2 rad = pivot serré), ondulation lente sin(t·0,9+φ)·0,13 rad qui s'estompe près du but, **approche finale en ligne droite sous 0,8 u** (sinon le pilotage orbitait autour de la cible sans jamais arriver — rayon minimal 0,45 > seuil 0,12). Référence Tomodachi Life vérifiée (interview officielle « Ask the Developer Vol. 21 » : pas d'IA générative — règles + scénarios écrits à la main + 16 personnalités + « manies » par Mii + mouvements volontairement lissés). Vérifié sonde : déviation max 1,04 u sur 12 u, 4 changements de sens (ondulation), virage max 8,4°/échantillon, arrivée exacte (0,00). **Conversation jamais collée** : écartement immédiat au déclenchement si < 1,05 u, garde d'espace active dès la phase `meet` (min 1,15 u, séparation accélérée 2,2 u/s sous 0,8 u). Vérifié : distance min 1,17, max 1,21 sur toute la conversation ; `social-check.js` 14/14 ; `plaza-check.js` tout vert, 0 erreur console.
- 2026-10-16 : collisions entre Mii (retour utilisateur « pas de collision »). Il y avait bien une séparation douce (poussée à 0,75 u) mais invisible : les Mii se frôlaient sans réagir (un face-à-face aligné finissait collé) → ajout d'un **évitement actif** : chaque promeneur « voit » les autres à 2,6 u devant lui et se décale latéralement (jusqu'à ±1,1 rad, lissé), fondu sur les 0,8 derniers mètres vers son but (pas d'à-coup à l'arrivée). Résultats sondes : face-à-face min 1,48 u (au lieu de 0,68) en se contournant et en arrivant quand même ; promeneur vs Mii immobile min 1,64 u (grand détour visible) ; le plancher de séparation 0,75 u reste en filet de sécurité ; obstacles (fontaine, bancs…) toujours solides (glissement à 0,84 u du banc). probe7 : marche toujours douce (5,2°/échantillon, 4 changements de sens), conversation 1,17-1,21 ; social-check 14/14 ; plaza-check tout vert.
- 2026-10-16 : mini IA des Mii (question utilisateur « Nintendo, random ou mini IA ? »). Réponse vérifiée dans l'interview officielle « Ask the Developer Vol. 21 » : pas d'IA générative — des règles + 16 personnalités + « manies » par Mii + scénarios écrits à la main, le hasard ne sert que d'ordonnanceur. Le codec FFSD ne stockant pas de personnalité, chacune est générée déterministiquement du nom (hash) : 4 traits 0-3 (mouvement / parole / énergie / rêverie). **social.js réécrit autour de trois besoins** (energy, social, fun) qui décident des intentions : fatigue (< 0,30) → va s'asseoir (l'énergie remonte sur le banc), envie de compagnie (< 0,38) → rejoint son meilleur ami (choisi par affinité + hasard), ennui (< 0,32) → va contempler un point d'intérêt (fontaine / kiosque), sinon flânerie (souvent vers un POI). **Affinités** par paire (0-1, init déterministe : 1 paire sur 3 amie 0,50-0,90) qui évoluent à chaque interaction (chat +0,08, fou rire +0,10, danse +0,06, dispute −0,14) ; le type d'interaction en dépend (kindFor : plus l'affinité est haute, moins de disputes — vérifié 3/400 vs 120/400 à 400 tirages) ; le taux de croisements organiques et de bulles de parole dépend aussi de l'affinité/du trait parole ; la vitesse de marche est modulée par le trait mouvement (1,12-1,17 u/s mesuré). Vérifié par probe11 : personnalités variées, affinité 0,43 → 0,51 (chat) → 0,37 (dispute), énergie 0 → banc → 0,53 restaurée, intentions seek/seat/poi dans le log, 0 erreur.
- 2026-10-16 : contemplation des points d'intérêt réparée (suite mini IA). Bug trouvé à la sonde : le point d'observation était fixé arbitrairement (angle aléatoire / 4 points fixes) — si le chemin passait de l'autre côté de l'objet, le Mii raclait le décor (glissement à ~0,3 u/s), le détecteur de blocage annulait l'intention et **la contemplation ne se déclenchait jamais** (et une flânerie trop courte faisait du surplace). Corrections : le point de contemplation est calculé **côté Mii** (centre de l'objet + rayon + 1,1 u dans sa direction — approche en ligne droite garantie), le POI choisi est **le plus proche** (avec un peu d'imprévu), et en cas de blocage le Mii **ré-essaie jusqu'à 3 fois** en recalculant son côté au lieu d'abandonner ; bonus : un Mii fatigué bloqué à moins de 1,2 u d'un banc s'assoit quand même. Vérifié par probe12 : intention POI → marche → contemplation (2 animations podlook/podthink vues 8 fois, fun +0,45) ; bug du test social-check (banc) : la précondition d'énergie n'était pas posée explicitement, corrigé → **14/14**, plaza-check tout vert, 0 erreur.
- 2026-10-17 : polissage « pro » du square (audit comportemental automatisé + 9 correctifs). Un audit maison de 4 min (probe14 : 6 Mii, télémétrie par frame — sauts, raclages, immobilités, distances, interactions à travers le décor) a révélé neuf anomalies, toutes corrigées et re-vérifiées par l'audit : (1) sauts au lever de banc (~0,75 u en 1 frame) — la résolution de collision éjectait d'un coup → poussée lissée à 6 u/s max (l'éjection est aussi ignorée tant que le Mii est dans le cercle de SON banc) ; (2) Mii coincés 20-95 s contre la poche concave d'un banc à 2 cercles (poussé-dé-poussé, rampe < 0,3 u/s) → les 2 cercles d'un même dossier sont fusionnés en un seul cercle côté navigation (contact physique inchangé) + hystérésis du côté de contournement (plus d'oscillation gauche/droite quand la cible est pile derrière un gros obstacle comme le kiosque) ; (3) anti-blocage retravaillé : seuil de déplacement relevé + fenêtre 3 s basée sur le déplacement réel (indépendante des re-ciblages des seekers) + heuristique « coincé près d'un banc → passage par le DEVANT du banc avant l'assise » ; (4) rencontres bloquées (paire coincée 23 s contre le kiosque, partenaire planté 78 s) → point de rendez-vous validé hors obstacles (rotations côté approche), relance du trajet et abandon propre si irréalisable (plus jamais de conversation de loin) ; (5) glissades pendant les animations (keeper qui poussait les Mii scriptés) → garde d'espace adoucie en talk/outcome (0,35 u/s, min 1,12 u) ; (6) 11 assises/4 min (file au banc) → économie d'énergie rééquilibrée (assis +0,022/s ; marche/social/fun ralentis) → ~5 assises/4 min ; (7) interactions organiques à travers la fontaine (7/audit) → test de visibilité du trajet avant de parler → 0 ; (8) intentions choisies par urgence pondérée (banc/ami/objet) au lieu d'une priorité stricte → moins de troupeaux ; (9) micro-flâneries (arrivée instantanée → Mii planté, immobilités jusqu'à 78 s) → cibles de flânerie à ≥ 1,5 u + anti-collage adouci (2,6 u/s max, plus de téléports d'un frame). Métriques audit final vs initial : sauts 9 → 0 ; interactions à travers le décor 7 → 0 ; immobilité max 78 s → 11 s ; raclages longs (20-95 s) → épisode max ~17 s auto-résolu ; distance mini entre Mii 0,65 → 0,68 (jamais < 0,5) ; 0 erreur console. Vérifié : social-check.js 14/14 (plusieurs passes), plaza-check.js tout vert (0 erreur), audits probe14 × 8.
- 2026-10-17 : **moteur relationnel Tomodachi Life authentique** (issu du RE de la ROM : table de dérive @0x8BC600 dumpée depuis `code.bin`, FUN_0056b660/56B27C/56B570, FUN_007d57b0, FUN_007c48f0/7C4BE0, FUN_007956A8, FUN_003d3340/352C, buckets FUN_0042788c). Nouveau module pur `js/relations.js` : niveaux **0..200 par sens**, **événements ±40** (0x28) 2 sens, **type 2 = amoureux + niveaux 100** (b27c), dérive ambiante ROM à l'identique (paire ordonnée aléatoire, delta TABLE[type][rand(8)], positifs ×[1,2,2,3] par tier 1/3/5 j, **débit N = floor(minutes ÷ floor(3000÷paires))** cap 500, skip type 4, un seul sens, clamp 0..200), banques de dialogue (First = jamais parlé ; sinon **10 % Unusual / 90 % Usual**, **Usual forcé si bucket > 1** 7/14/21/30/60/90/120 j ; **Birthday** = anniversaire du jour, fêté 1×/an), **spécial p = (n/2)²/100** (+50 1er événement du jour ; portes 0x1f : types {1,3,6,12}, jalousie amoureux > 50, même famille) → **confession** (portée par b27c). Déterministe (mulberry32), anniversaires seedés du nom (djb2), **timeScale 60×** pour rendre la dérive observable (1 s réelle = 1 min jeu ; écart d'observabilité assumé). `social.js` branché dessus : banque tirée au départ d'interaction (bulles salutation/répliques par banque), issue chat/laugh/dance **+40** / argue **−40**, confession visuelle (wave + cœur), log enrichi {bank, lvBefore, lvAfter, delta}. `social-check.js` recréé : **29/29** (22 unités moteur : table exacte + ×3, débit, clamps, First/Usual/Unusual 9,6 %, bucket 9 j, anniversaire 1×/an, p=92,3 → confession type 2/100, jalousie p=0, lot ambiant 7 événements, intégrité 30 sens ; live : 3 interactions forcées journalisées + captures, **croisement organique en 36 s**, drifts/talks moteur actifs, 0 NaN, 0 erreur console). `plaza-check.js` repassé au vert. Écarts assumés v1 : pas de statuts 455/combats/divorce ; compat perso 7×7 (@DAT_0056b8f0, non dumpée) réputée vraie.
- 2026-10-17 : **bulles de dialogue réelles + recalibrage** (retour utilisateur : « ils ne parlent pas, c'est que des emoji »). `emotes.js` réécrit : deux modes (emote 128 px / texte en canvas dynamique, wrap 560 px, lisible à l'écran), `sprite.center` = pointe de la queue (ancre au-dessus de la tête du Mii), miroir dessiné pour poser le corps du côté opposé au partenaire, une seule bulle texte à la fois. `social.js` : vraies répliques par banque (First/Usual/Unusual/Birthday/Chat), salutations en texte, parole alternée étanche (durée = tour de parole + 0,9 s, swap tant que talkLeft > 0,05 → aucun trou), issues avec réponse de b à mi-parcours, confession en deux bulles texte (1300/3000 ms). Vérifié au probe : une seule bulle visible en talk, greet/outcome conformes, ancrage tête OK, 0 erreur console. `social-check.js` 29/29, `plaza-check.js` au vert.
- 2026-10-17 : **correctifs du retour détaillé (10 sections) + résolution du « fantôme » de bulle**. Corrections (fichiers modifiés : `emotes.js`, `mii.js`, `social.js`) :
  **(1) répliques dupliquées entre conversations simultanées** → moteur de **scènes** : `SCENES` par banque (first 3 / usual 5 / unusual 4 / birthday 2 / chat 4 ; suites ordonnées de 2-4 répliques `{me}`/`{other}`), tirage `pickScene`/`pickFresh` avec registres d'anti-répétition (scène 40 s / ligne 30 s). Vérifié test A : deux paires en parallèle tiennent des répliques **différentes** (« Hé ! On ne se connaît pas encore… » vs « On se présente ? Moi c'est Mila ! »).
  **(2) noms superposés** → passe anti-chevauchement par amas (BFS, rayon 2,1 u) : empilement vertical lissé `_tagLift` (pas 0,42 u, easing dt×6, `_tagLiftTarget`), appliqué à l'étiquette 3D. Vérifié test B : lifts 0 / 0,42 / 0,84, hauteurs croissantes, 0 NaN.
  **(3) bulles mal associées au locuteur** → ancrage au-dessus de la tête du locuteur (queue = `sprite.center`), vérifié B4 (bulle y≈2,70 vs nom y≈2,80, parent correct).
  **(4) conversations non structurées** → répliques séquencées qui dépendent de la précédente (question → réponse), vérifié A3 (échange ordonné ≥ 2 répliques) et D (2 conversations successives 4↔5 : 0 réplique commune — pas de rejeu).
  **(5) groupes non coordonnés / interactions bloquées** → garde `busy` + `sit` dans `startPair` (retourne un booléen), une seule paire initiée par frame (croisement), chien de garde `MEET_TIMEOUT` 14 s (abandon propre). Vérifié F1 (jamais un Mii dans deux paires, 20 échantillons) et F4 (âge max 3,7 s < 35 s).
  **(6) bulles trop grosses / lisibilité caméra** → `TEXT_MIN_W` 360→250 (largeur adaptée au texte), facteur de lisibilité `setReadScale(k = distance/28, borné 0,85-1,45)` appliqué à chaud sans redessiner. Vérifié test E : zoom arrière 3,093 → 3,959 ; zoom avant → 2,726.
  **(7) lisibilité avec plusieurs interactions** → une seule bulle texte visible par Mii (les répliques se remplacent), pas deux textes empilés.
  **(8) association personnages/noms/dialogues** → vérifiée (noms uniques, bulles attachées au bon groupe, test D).
  **(9) tests A-F obligatoires** → nouveau `tests/social-scenes-check.js` : **A** deux conversations simultanées distinctes, **B** groupe de 3 à la fontaine (noms empilés, ancrage bulle), **C** fin d'interaction (bulles masquées, étiquette solidaire, décalage localement vertical), **D** conversations successives sans rejeu, **E** lisibilité selon le zoom, **F** stabilité 40 s (0 double-paire, 0 fantôme, 0 NaN, 0 blocage). Tout vert, 0 erreur console ; captures `social-scenes-A/B/F.png`.
  **(10) « fantôme » visuel** (fragment « Hé ! Je crois qu'on » affiché au-dessus de la bulle courante pendant ~1-2 s après le passage salutation → ouverture) : enquête par sondes (état par frame, scan scène = 12 sprites exacts, dumps canvas propres, bisection par masquage : masquer la **seule bulle** de Mila fait disparaître le composite = le fragment est rendu par le sprite de bulle). **Cause : texture GL périmée après redimensionnement du canvas de bulle** (589×332 → 554×254 au swap) — three.js croyait la texture re-uploadée (`needsUpdate`), le GPU gardait l'ancienne allocation. **Correctif : `tex.dispose()` dans `ensureSize()`** (re-création complète de la texture au rendu suivant ; le `needsUpdate` qui suit dans `show()`/`showText()` fait la ré-upload). Vérifié : capture A régénérée propre (deux bulles simultanées sans fragment), reproduction post-fix ×2 sans fantôme. Preuves : `tests/shots/bis-0-base.png` (fantôme avant), `tests/shots/fix-r2-a.png` (propre après), `tests/shots/probe-live-canvas.png` (canvas propre pendant le fantôme).
  **Tests finaux** : `social-scenes-check.js` A-F tout vert (0 erreur console), `social-check.js` **29/29**, `plaza-check.js` tout vert. `plaza-check.js` fiabilisé au passage (gel des cooldowns sociaux + mesure de marche avec 3 relances si engagement).
- 2026-10-17 : **nametags « Minecraft »** (retour utilisateur : les étiquettes flottaient au-dessus des têtes). L'empilement anti-chevauchement par amas (`_tagLift`/`_tagLiftTarget`, pas 0,42 u) de la section (2) précédente est **supprimé** — place au standard simple : une étiquette toujours juste au-dessus de la tête. `mii.js` : position chaque frame `label.position.y = _tmpV.y + this._tagOffset` (plus d'état de lift ni de lissage) ; `social.js` : passe d'amas (BFS rayon 2,1, `TAG_NEAR`/`TAG_STEP`) retirée, `tagState()` simplifié en `{y, height, parentOk}` (suivi de tête conservé pour les bulles). `tests/social-scenes-check.js` : **B2 réécrit** (« étiquette toujours juste au-dessus de la tête, aucun empilement » : écarts tête→nom 0,45/0,49/0,44, < 0,8 ; spread < 0,3) et **B3** (fini + x=z=0 dans le repère du parent). Vérifié : suite A-F tout vert (D2 communes 0, F4 max 0,0 s), 0 résidu `_tagLift` (grep), capture `social-scenes-B.png` (6 étiquettes individuellement au-dessus des têtes, groupe fontaine), 0 erreur console.
- 2026-10-17 : **mini-IA locale étendue** (demande utilisateur « pq ne pas faire en sorte que les miis ont une mini ia intégré ? » — option validée : locale, 0 réseau, façon Nintendo). Cinq briques dans `social.js` :
  **(1) pensées visibles** : les intentions s'affichent en bulles texte (« Je suis un peu fatigué… un banc, tiens. », « Tiens, j'irais bien voir Léa ! », « Cette fontaine est si jolie… ») au moment de la décision — cooldown 12-26 s, jamais pendant une interaction ; `bubbleState.thought` les distingue des dialogues (garde-fous C1/F2 du harnais adaptés pour ne plus compter une pensée comme fantôme).
  **(2) mémoire par Mii** : journal de 10 souvenirs max {t, type, partenaire} alimenté en fin d'interaction, exposé via `brain(i).memory`.
  **(3) plans à moyen terme** : après une dispute 35 % de plan « se réconcilier » (240 s — `kindFor` remplace toute dispute par un chat tant qu'il vit), après une bonne entente 22 % de plan « devenir ami » (2 interactions douces → soldé + célébration en pensée) ; abandon à l'expiration ; journal `plan` (new/done/expire).
  **(4) répliques contextuelles** : ~40 % des conversations citent le contexte réel — plan en cours (excuses), souvenir partagé (fou rire / danse / dispute), moment de la journée ; pools `CTX_SCENES` (2-3 scènes chacun) soumis au MÊME registre anti-répétition que les banques ROM ; salutations enrichies selon la phase (`GREET_CTX`).
  **(5) rythme du jour** : matin/après-midi/soir/nuit déduits de l'heure locale réelle (même source que l'horloge du HUD) — la nuit fatigue plus vite et calme le social, le matin ranime le social, les bancs attirent plus la nuit ; horloge injectable (`createSocial({now})`, `_test.setNow`).
  Hooks de test : `brain(i)`, `phase()`, `_test.{setNow,setPlan,clearPlan,readyThought,forceContext,pools}`. Vérifié : nouveau **`tests/social-brain-check.js`** G1-G5 tout vert (phases, pensée affichée + indicateur bulle, souvenirs des 2 côtés, **0/60 disputes** sous plan « se réconcilier », scène contextuelle « On a bien rigolé la dernière fois, hein ! »), `social-scenes-check` A-F tout vert, `social-check` **29/29**, `plaza-check` tout vert, 0 erreur console. Capture `tests/shots/social-brain-thought.png` (pensée « Mes jambes me réclament une halte. » au-dessus de « Moi »).
- 2026-10-18 : **embellissement de la place (D.A. Mii) + cycle jour/nuit réel** (demandes utilisateur « rendre la place visuellement plus beau, dans la même D.A. des Mii » puis « rajoute un cycle jour/nuit en fonction de la vraie heure »). **Décor** (`world.js` + couleurs d'ambiance dans `config.js`) : dôme de **ciel en dégradé doux** par thème + **étoiles** en `Points` nets taille écran (les étoiles cuites dans la texture du dôme donnaient des taches floues), **nuages** sprites pastel qui dérivent lentement, **pelouse** (anneau r 27,4→85, teintée par thème), dalles adoucies (damier quasi imperceptible, biseau, mouchetures déterministes ; **fix** `colorSpace = SRGBColorSpace` sur la texture — le sol rendait délavé, la texture étant interprétée en linéaire), **rosace de dallage** canvas autour de la fontaine (anneaux + 8 pétales + pastilles, teintes par thème), fontaine : **miroitement d'eau** qui défile (texture répétée, offset scrollé) + **ondes concentriques** animées (5 anneaux, expansion + fondu), arbres **ronds** (houppier 4 boules icosaèdre lissé + jitter de teinte), bancs à **lattes**, kiosque à **toit rayé pastel** + pompon + socle, **fleurs instanciées** (64, 2 draw calls, hors zone marchable), **halo chaud** des lampadaires le soir/la nuit. Contraintes préservées : `poi.obstacles` / `poi.seats` / `maxRadius` inchangés, RNG séparés pour les nouveaux décors (layout d'origine intact). **Cycle** : `themeForHour(h)` dans `main.js` (mêmes bornes que le rythme du jour des Mii : 5-18 jour, 18-22 soir, 22-5 nuit), thème réel appliqué au chargement puis **fondu de 4 s** via `world.transitionTo` (interpolation de toutes les valeurs d'ambiance : fond, brouillard, sol, pelouse, hémisphériques, soleil, nuages, halos, étoiles, émissif des lampes ; échange des textures ciel/rosace à mi-fondu ; `setTheme` reste l'application immédiate ; `getThemeName()` ajouté). Vérifié : nouveau **`tests/theme-check.js`** H1-H5 tout vert (bornes 10/10, thème initial = heure locale, fondu mélangé puis convergence exacte `0b1424 → 83919f → cfe3f2`, `setTheme` immédiat, rendu après cycle stdev 21,3), **`plaza-check`** tout vert (stdev 20,2), `social-check` **29/29**, `social-brain-check` G1-G5, `social-scenes-check` A-F (dont réplique nocturne spontanée « Il fait calme, la nuit, sur la place… » cohérente avec le thème réel), 0 erreur console. Captures : `tests/shots/visual-*.png`, `diag-sky-*.png`, `theme-*.png`.
