# MANIFEST — assets/ui (Mii Maker)

Source : **https://github.com/Alan-bur/Wii-4K** (branche `main`), dossier
`0000000100000002/USA/` — textures Wii (« 4K », upscale ×32 des textures
d'origine) au format Dolphin : `tex1_<WxH>_<hash>_<fmt>.png`.

Analyse faite par programme (dimensions, couleurs, rendu ASCII) car le pack
n'a pas été inspecté visuellement.

| Nom d'origine | Nouveau nom | Usage | Statut |
|---|---|---|---|
| `Pointer/tex1_64x64_485acd8287f4ef40_0.png` | `cursor-hand.png` | Curseur main Wii (glove blanche) | **WIRÉ** |
| `Pointer/tex1_64x64_739a84aef89eb236_2.png` | `cursor-hand-outlined.png` | Main avec contour sombre (variante) | réserve |
| `Channels/Mii Channel/tex1_128x96_668f013f595b96aa_1.png` | `candidate-panel.png` | Candidat « panneau/fenêtre » (blanc) | candidat, non câblé |
| `.../tex1_72x48_7f178ebf089ba05d_14.png` | `candidate-bar.png` | Candidat « barre » (gris-bleu opaque) | candidat, non câblé |
| `.../tex1_72x48_6bb9a14da95a2c13_0.png` | `candidate-strip.png` | Candidat « bandeau » (blanc sur transparent) | candidat, non câblé |

## Icônes des 9 onglets — PLACEHOLDERS

Les **vraies icônes 4K du Mii Channel ne sont PAS dans ce repo** (l'utilisateur
a indiqué qu'il les fournira à part). En attendant, 9 SVG épais, bouts
arrondis, **blanc sur transparent**, dans `icons/` :

`infos.svg`, `corps.svg`, `visage.svg`, `cheveux.svg`, `sourcils.svg`,
`yeux.svg`, `nez.svg`, `bouche.svg`, `accessoires.svg`.

→ Pour les remplacer : déposez des PNG/SVG de même nom (blanc sur transparent)
dans `icons/`. L'UI les charge par nom de fichier.

## Formes de visage

Non copiées : les vignettes de traits (visage, cheveux, yeux, nez, bouche…)
sont **déjà** rendues depuis des assets réels existants
(`apps/mii_maker/assets/cfl_res/svg/`, recolorés dynamiquement).

## Notes (analyses)

- Dossier `Channels/Mii Channel/` : 16 textures `48×56` (→ 1536×1792 en 4K)
  représentant des **visages de Mii avec un trait mis en avant** (yeux bleus,
  lunettes, sourcils, bouche, cheveux…). Rôle exact (icônes de catégorie ?
  exemples ?) **incertain** — non recopiées pour ne rien « inventer ».
- Dossier `Pointer/` : 4 pointeurs « flèche » 64×64 et 3 « main » 64×64.
  **Aucun pixel bleu** → le badge bleu « 1 » (joueur 1) n'existe pas ici.
- Le reste du repo (~3700 PNG) concerne la Wii Menu, les chaînes, l'écran de
  santé/sécurité, etc. — hors périmètre du Mii Maker.
