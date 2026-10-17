/**
 * miiFFLData.js
 * ------------------------------------------------------------------
 * Normalise une instance `Mii` (mii.js) pour qu'elle passe la vérification
 * stricte du moteur FFL (Wii U) utilisé par `miiViewerFFL.mjs`.
 *
 * FFL appelle `_FFLpGetCharInfoFromStoreData` avec `verifyName = TRUE`, qui
 * exige DEUX choses sur les données FFSD (96 octets) :
 *   1. `birthPlatform` (FFL `m_BirthPlatform`, exposé par mii.js sous le nom
 *      `deviceOrigin`, bits 4-6 de l'octet 3) doit être dans [1..7]. La valeur
 *      par défaut du codec est 0 → rejetée.
 *   2. `miiName` doit être non vide. Le Mii par défaut a un nom vide → rejeté.
 *
 * `version` (0 ou 3) et la date d'anniversaire (0/0 accepté) n'ont PAS besoin
 * d'être modifiées : vérifié empiriquement sur le harnais FFL.js.
 * ------------------------------------------------------------------
 */

/**
 * Force les champs de `mii` requis par FFL (mutation en place).
 * Idempotent : un Mii déjà valide n'est pas modifié.
 * @param {import('./mii.js').default} mii
 * @returns {import('./mii.js').default} le même Mii
 */
export function ensureFFLValidMii(mii) {
  if (!mii) return mii;

  // birthPlatform (deviceOrigin) doit être dans [1..7].
  if (!(mii.deviceOrigin >= 1 && mii.deviceOrigin <= 7)) {
    mii.deviceOrigin = 3;
  }

  // FFL vérifie le nom (verifyName = TRUE) : il doit être non vide.
  if (!mii.miiName || !String(mii.miiName).trim()) {
    const fallback = (mii.creatorName && String(mii.creatorName).trim()) || 'Mii';
    mii.miiName = fallback.slice(0, 10) || 'Mii';
  }

  return mii;
}

/**
 * Encode un Mii en FFLStoreData (96 octets) valide pour FFL.
 * @param {import('./mii.js').default} mii
 * @returns {Uint8Array} 96 octets
 */
export function miiToFFLStoreData(mii) {
  ensureFFLValidMii(mii);
  return Uint8Array.from(mii.encodeFFSD());
}
