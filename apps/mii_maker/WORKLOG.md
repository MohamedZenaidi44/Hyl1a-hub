# Worklog — Mii Maker 3D (Hyl1a Hub)

> Trace de travail pour retrouver le contexte entre sessions.
> Dernière mise à jour : 2026-10-14

## Objectif

Rendre le **Mii Maker** du site fidèle aux vraies consoles, avec de **vrais
modèles 3D** (rendu local, pas d'API externe), intégré au hub `hylia-plaza`.

## Où c'est branché

- `index.html` → tuile « Mii Maker » + changelog (MAJ 10/11).
- `public/js/core/app.js:269` → `'miiMaker': _lazy(c, '../../../apps/mii_maker/js/miiMaker.js')`.
- Chaîne de rendu (**actuelle, depuis le pivot FFL.js**) :
  `apps/mii_maker/js/miiMaker.js` (éditeur)
  → `miiRendererFFL.js` (`window.MiiViewerFFL`, script « classic » + proxy)
  → `miiViewerFFL.js` (ESM, Three r180) → `ffl/ffl.js` (FFL.js WASM) →
  `assets/ffl/FFLResHigh.dat`.
- Chaîne **historique (abandonnée)** : `miiRendererGLB.js` (`window.MiiViewer3D`)
  → `MiiCharacter.js` → GLB `apps/mii_maker/assets/mii/Mii_Maker_for_4.0_v2.glb`
  (7 860 332 o). Fichiers conservés mais + utilisés par miiMaker.
- `miiBuilder.js` fournit `window.loadThreeJS()` (Three.js **r128**,
  GLTFLoader, SkeletonUtils) — toujours utilisé par `miiPlaza.js` uniquement.
- Codec Mii : `apps/mii_maker/js/mii.js` expose un vrai `CharInfo` Nintendo
  (faceType, hairType, eyeType, glassesType/glassesColor, moleEnabled, couleurs…).

## Pivot : rendu authentique via FFL.js (Wii U)

**Décision** : abandonner l'assemblage de meshes du GLB (rendu jugé « très mal
assemblé, sans textures ») au profit de **FFL.js** — le moteur de rendu Wii U de
Nintendo porté en WASM/Three.js par Arian Kordi
(<https://github.com/ariankordi/FFL.js>, licence **AGPL-3.0-only**). FFL
reconstruit la tête EXACTEMENT depuis les données FFSD du Mii (vrais shaders,
vraies textures). FFL ne rend QUE la tête ; le corps est un glTF séparé attaché
à l'os de cou (voir « Corps entier » ci-dessous).

### Fichiers vendés dans le dépôt

- `apps/mii_maker/js/ffl/ffl.js` (ESM, n'importe que `three`).
- `apps/mii_maker/js/ffl/materials/FFLShaderMaterial.js` (ESM, n'importe que `three`).
- `apps/mii_maker/js/ffl/ffl-emscripten-single-file.js` (build Emscripten
  « single-file » : WASM embarqué en base64 → définit `globalThis.ModuleFFL` ;
  renommé `.cjs`→`.js` pour un MIME JavaScript correct).
- `apps/mii_maker/js/ffl/LICENSE` (AGPL-3.0).
- `apps/mii_maker/assets/ffl/FFLResHigh.dat` (4 579 008 o, `AFLResHigh_2_3.dat`
  d'archive.org — ressource de shaders/textures Miitomo).
- `apps/mii_maker/js/ffl/helpers/BodyUtilities.js`, `ModelScaleDesc.js`,
  `SkeletonScalingExtensions.js` (aides FFL.js : attache tête↔corps, scaling
  par-os, caméras authentiques).
- `apps/mii_maker/assets/ffl/body/male.glb` (80 196 o) et `female.glb`
  (82 240 o) — corps Mii Wii U (`MiiBodyMiddle.bfres` converti en glTF) depuis
  <https://github.com/ariankordi/ffl-raylib-samples/tree/master/models>.

## Corps entier (tête FFL + corps glTF)

FFL.js rend la tête ; pour le corps on suit `examples/nodejs-icon-body-webgpu.js` :

1. Charger le glTF du bon genre (`SkeletonUtils.clone` pour garder le skinning).
2. `prepareBodyForCharModel(body, mat, charModel.favoriteColor, charModel.getBodyScale(), pantsColor)`
   — applique `FFLShaderMaterial` + `modulateType` (9=corps couleur favorite,
   10=pantalon) et met les os à l'échelle selon taille/corpulence du Mii.
3. `attachHeadToBody(body, charModel.meshes)` — attache la tête sur l'os `head`
   (scale tête = `0.1 * 10/7 ≈ 0.143`) via le patch `THREE.Skeleton.attach`.
4. Caméras authentiques : `getWholeBodyCamera(aspect, height)` (corps entier) /
   `getFaceCamera()` + `adjustCameraForBodyHead` (visage).

Rotation **360°** : glisser souris/doigt sur le canvas tourne le groupe pivot
`rig.rotation.y` (les boutons ◀ ▶ appellent `rotateBy(deg)`). `skeleton.update()`
est appelé automatiquement par Three chaque frame (via `WebGLObjects`), donc la
tête attachée suit le corps et la rotation — pas d'appel manuel nécessaire.
Vérifié headless : corps ≈ 83 % de la hauteur, contenu présent dans les 3 bandes
verticales ; `miiMaker` boot réel OK (vue visage puis bascule 🧍 corps entier).

### Contraintes techniques

- FFL.js exige Three.js **>= r144** ; le site utilise Three **r128** en global
  (`window.THREE`). → **importmap statique** dans `index.html` (`<head>`) :
  `three` → `https://esm.sh/three@0.180.0`. Isolé du r128 global.
- `renderer.outputColorSpace = THREE.LinearSRGBColorSpace` (requis par FFL).
- Le module ESM est chargé à la demande par un script « classic »
  (`miiRendererFFL.js`) via `import()` dynamique : `new MiiViewerFFL(mount)`
  synchrone → **proxy** qui diffère la vraie construction jusqu'au 1er `update()`.

### Verrou FFL corrigé (cause du rejet de nos données)

FFL appelle `_FFLpGetCharInfoFromStoreData(..., verifyName = TRUE)`, qui exige :

1. **`birthPlatform`** (FFL `m_BirthPlatform` = mii.js `deviceOrigin`, bits 4-6 de
   l'octet 3) dans **[1..7]**. Défaut du codec = 0 → rejeté.
2. **`miiName`** non vide. Défaut = vide → rejeté.

`version` (0 ou 3) et la date d'anniversaire (0/0 accepté) ne sont **pas**
requises (vérifié empiriquement via un harnais FFL.js headless).
→ `apps/mii_maker/js/miiFFLData.js` (`ensureFFLValidMii`, `miiToFFLStoreData`)
normalise une instance `Mii` avant l'encodage/le rendu. Appelé par le viewer et
au moment de la sauvegarde (`miiMaker.js`).


## Origine de l'asset GLB

`Mii_Maker_for_4.0_v2.glb` est l'export du modèle Blender **« Mii Maker for
Blender » de Joey Carlino** (itch.io : <https://joeycarlino.itch.io/mii-maker-for-blender>,
fichier source `Mii_Maker_for_4.0_v2.blend`, 31 Mo). C'est un rig avec des
**part pickers** basés sur la proximité (geometry nodes) + une animation bakée.

Référence shader FFL (conventions de canaux / couleurs Nintendo) :
`datkat21/mii-creator` (branche `dev`), fichiers
`src/class/3d/shader/FFLShader_frag.glsl.ts`, `fflShaderConst.ts`,
`src/constants/ColorTables.ts`.

## Structure du GLB (vérifiée par scripts Node)

### Hiérarchie

- `Mii Armature`
  - `root > COG > ctrl.torso > hip > spine.001 > spine.002 > neck > head`
    → contient les **meshes d'affichage** (le vrai visage / corps).
  - `picker.parent` (T = 0.80, 0, 0.05) → les **grilles de sélection** :
    - `eye picker`, `eyebrow picker`, `mouth picker`, `hair picker`,
      `nose picker`, `head picker`, `mustache picker` (×4 noms réutilisés :
      moustache / barbe / maquillage / rides), `body picker`, `glasses picker`.
    - Chaque picker contient un `page selector*` dont les enfants sont les
      variantes numérotées.

### Le point CLÉ (cause du bug d'affichage)

Les **meshes d'affichage** sont des **quads unitaires placeholder**
(4 verts, geometrie 1×1×0, centrés à l'origine). Exemples relevés :

| mesh | node | transform local | geo |
|------|------|------------------|-----|
| `eye.L` | 7 | T=(0.093,0,-0.004) R=-90°X | quad 1×1 |
| `eye.R` | 16 | T=(-0.093,0,-0.004) R=-90°X | quad 1×1 |
| `eyebrow.L/.R` | 13/19 | T=(±0.101,0,-0.041) | quad 1×1 |
| `nose` | 10 | T=(0,-0.009,0) | quad 1×1 |
| `mouth` | 32 | T=(0,0,0) | quad 1×1 |
| `hair` | 3 | T=(0,0.001,-0.003) | quad 1×1 |
| `head` | 35 | T=(0,0.273,0) | quad 1×1 |
| `glasses` | 22 | T=(0,0,0) | quad 1×1 |
| `beard` | 5 | T=(0,-0.05,0) | quad 1×1 |
| `mustache` | 25 | T=(0,0,0) | quad 1×1 |
| `makeup` | 28 | T=(-0.003,-0.32,0.056) | quad 1×1 |
| `wrinkles` | 30 | T=(-0.003,-0.32,0.011) | quad 1×1 |
| `beauty mark` | 1 | T=(0,0,0) | quad 1×1 |
| `torso f/m` | 99/100 | (picker) | mesh réel |

Les **variantes** du picker, elles, portent la **vraie géométrie** (auteur en
espace tête) + un **scale de miniature** (ex. eye1 scale≈0.533, hair≈0.097,
head≈0.233) + une position dans la grille.

➡️ **Par défaut le rendu est faux** : `MiiCharacter.setPart()` ne fait que
basculer `visible` sur les variantes → on voit la **grille du picker** (à
x≈0.80), et le visage reste un quad placeholder étiré.

### Correctif attendu

Pour chaque catégorie, **copier `geometry` + `material` de la variante choisie**
sur le **mesh d'affichage** correspondant, en **gardant le transform du mesh
d'affichage**, puis **masquer tout `picker.parent`**.

- Paires L/R (`eye`, `eyebrow`) : `eye.R`/`eyebrow.R` doivent être **mirrorées**
  (scale.x = -1). Vérifié : le sprite d'yeux est **asymétrique** (54/60 cellules
  asymétriques) → le miroir est nécessaire.
- Variante « aucune » (nœud sans mesh, ex. `0glasses`, `hair none`) → masquer
  le mesh d'affichage.

## Textures & couleurs (décodées des PNG extraits)

Images (12) : beauty_mark, beard_sprite, eye_sprite_rgb, nose_sprite,
eyebrow_sprite, glasses_sprite, mustache_sprite, face_extras_sprite2 (×2),
mouth_sprite_rgb, hair_sprite, selection.

Convention observée (à la FFL) :

- **eye_sprite_rgb** (30000×500, ~60 cellules) : masques **R/G/B** + alpha.
  `R` = iris (à teinter par la couleur d'yeux), `B` = blanc du globe,
  pixels noirs = contour/pupille. → shader **RGB_LAYERED**.
- **eyebrow / mustache / beard / beauty_mark** : blanc (255,255,255) + alpha
  → **teinter par la couleur de cheveux** (`material.color = hairColor`).
- **hair_sprite** (3000×2750) : niveaux de gris (255/191/128/64) + alpha
  → **shading × hairColor**. Le matériau GLB `mii hair` n'a **pas** de texture :
  il faut lui assigner `hair_sprite` comme `map`.
- **mouth_sprite_rgb** : masques **R/G/B** → RGB_LAYERED.
- **nose_sprite** : noir + alpha (ombre/narines) posé sur la peau.
- **glasses_sprite** : niveaux de gris + alpha → teinte lunettes.
- **face_extras_sprite2** : masques R/G/B (maquillage / rides).

### Modes de modulation FFL (référence `FFLShader_frag.glsl.ts`)

```
CONSTANT        color = u_const1
TEXTURE_DIRECT  color = texture
RGB_LAYERED     color = tex.r*u_const1 + tex.g*u_const2 + tex.b*u_const3
ALPHA           color = vec4(u_const1.rgb, tex.r)
LUMINANCE_ALPHA color = vec4(tex.g*u_const1.rgb, tex.r)
ALPHA_OPA       color = vec4(tex.r*u_const1.rgb, 1.0)
```

## Plan

1. [x] Analyse GLB (structure, transforms, bounds, textures).
2. [ ] **WORKLOG** (ce fichier).
3. [ ] `MiiCharacter.setPart` : swap géométrie+matériau sur les meshes d'affichage.
4. [ ] Miroir L/R (eye, eyebrow).
5. [ ] Coloration : peau (`mii skin`), cheveux (`hair_sprite` + teinte),
       sourcils/moustache/barbe (teinte cheveux), yeux/bouche (shader RGB).
6. [ ] Mapping `CharInfo` (mii.js) → index de variantes (déjà en partie dans
       `miiRendererGLB.js` : `buildLinearIndex`, `_setGlasses`).
7. [ ] Vérifier (Chrome headless + analyse pixels via décodeur PNG Node).

## Fichiers clés

- `apps/mii_maker/js/miiMaker.js` — éditeur (UI, codec base64).
- `apps/mii_maker/js/miiFFLData.js` — normalisation FFSD pour FFL.
- `apps/mii_maker/js/miiViewerFFL.js` — viewer ESM FFL (Three r180) : tête + corps
  + rotation 360° (glisser) + `setBodyView(bool)`.
- `apps/mii_maker/js/miiRendererFFL.js` — `window.MiiViewerFFL` (proxy classic,
  forward `update`/`rotateBy`/`setBodyView`/`camera`).
- `apps/mii_maker/js/ffl/` — FFL.js vendé (+ LICENSE AGPL-3.0) + `helpers/`.
- `apps/mii_maker/assets/ffl/FFLResHigh.dat` — ressource FFL.
- `apps/mii_maker/assets/ffl/body/{male,female}.glb` — corps Mii Wii U.
- `apps/mii_maker/js/mii.js` — codec `CharInfo`.
- `apps/mii_maker/js/miiBuilder.js` — `loadThreeJS()` (utilisé par miiPlaza).
- (abandonnés) `apps/mii_maker/js/MiiCharacter.js`,
  `apps/mii_maker/js/miiRendererGLB.js`,
  `apps/mii_maker/assets/mii/Mii_Maker_for_4.0_v2.glb`.

## Outils d'analyse (hors dépôt)

Dans `C:\Users\zenaidi\AppData\Local\Temp\opencode\` :
`glbdump*.js`, `glbbounds.js`, `glbmat.js`, `glbdisplay.js`, `glbext.js`,
`glbchain.js`, `glbimg.js`, `png.js`, `pngsym.js`, `pngscan.js`, `pngall.js`.
Textures extraites : `textures/`.

## Journal

- 2026-10-14 : reprise de contexte ; identification de l'origine du GLB
  (Joey Carlino) ; vérification structure picker/affichage ; confirmation du
  bug (meshes d'affichage = quads placeholders) ; décodage des textures et des
  conventions de canaux ; définition du plan ci-dessus.
- 2026-10-14 (suite) : **pivot vers FFL.js**. Diagnostic du rejet FFL
  (`birthPlatform` ∈ [1..7] + nom non vide). Vendoring de FFL.js + ressource,
  importmap Three r180, `miiViewerFFL.js` / `miiRendererFFL.js` / `miiFFLData.js`,
  branchement `miiMaker.js`. Vérifié en headless (harnais) et **sur le site**
  (pipeline ESM, chemin proxy `window.MiiViewerFFL`, et boot réel de `miiMaker`
   → canvas FFL vivant, texture authentique, pas de fallback 2D).
- 2026-10-14 (suite 2) : **corps entier + rotation 360°**. Vendoring des corps
  glTF (male/female) + helpers FFL.js. `miiViewerFFL.js` réécrit (tête attachée
  au corps, caméras authentiques, glisser 360°, `setBodyView`). Proxy + `miiMaker`
  adaptés (`applyCamera` → `setBodyView`). Vérifié en headless : corps complet
  (3 bandes verticales), proxy (visage/corps), boot réel `miiMaker` (bouton 🧍
  bascule bien visage↔corps).

