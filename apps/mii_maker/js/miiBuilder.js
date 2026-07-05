/**
 * loadThreeJS() — Charge Three.js + loaders dynamiquement.
 * À appeler avant tout code qui utilise THREE.
 * Idempotent : si déjà chargé, retourne immédiatement.
 */
window.loadThreeJS = async function() {
  if (window.THREE) return; // déjà chargé

  function loadScript(src) {
    return new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = res;
      s.onerror = () => rej(new Error('Failed to load: ' + src));
      document.head.appendChild(s);
    });
  }

  // Three.js core d'abord, puis les loaders
  await loadScript('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js');
  await Promise.all([
    loadScript('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js'),
    loadScript('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js'),
    loadScript('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/ColladaLoader.js'),
  ]);
};

/**
 * MiiBuilder: Shared 3D procedural generation for avatars.
 * Used by both Mii Maker and Mii Plaza to ensure consistent rendering.
 */
const MiiBuilder = {
  buildAvatar: function(config) {
    const avatarGroup = new THREE.Group();
    if (!config) return avatarGroup;

    const skinMat = new THREE.MeshStandardMaterial({ color: config.skinColor || '#ffdfc4' });
    const hairMat = new THREE.MeshStandardMaterial({ color: config.hairColor || '#333' });
    const shirtMat = new THREE.MeshStandardMaterial({ color: config.shirtColor || '#ff3333' });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
    const jeansMat = new THREE.MeshStandardMaterial({ color: 0x3b5998 });

    avatarGroup.scale.set(config.build || 1, config.height || 1, config.build || 1);

    // BODY & LIMBS
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.8, 1.8, 32), shirtMat);
    body.position.y = 2.5; body.castShadow = true; avatarGroup.add(body);

    const legGeo = new THREE.CylinderGeometry(0.3, 0.3, 1.5, 16);
    const leftLeg = new THREE.Mesh(legGeo, jeansMat);
    leftLeg.position.set(-0.35, 0.85, 0); leftLeg.castShadow = true; avatarGroup.add(leftLeg);
    const rightLeg = leftLeg.clone();
    rightLeg.position.set(0.35, 0.85, 0); avatarGroup.add(rightLeg);

    const armGeo = new THREE.CapsuleGeometry(0.25, 1.0, 4, 16);
    const leftArm = new THREE.Mesh(armGeo, shirtMat);
    leftArm.position.set(-1.1, 2.5, 0); leftArm.rotation.z = Math.PI/12; leftArm.castShadow = true; avatarGroup.add(leftArm);
    const rightArm = new THREE.Mesh(armGeo, shirtMat);
    rightArm.position.set(1.1, 2.5, 0); rightArm.rotation.z = -Math.PI/12; rightArm.castShadow = true; avatarGroup.add(rightArm);

    const handGeo = new THREE.SphereGeometry(0.25, 16, 16);
    const leftHand = new THREE.Mesh(handGeo, skinMat);
    leftHand.position.set(-1.3, 1.6, 0); avatarGroup.add(leftHand);
    const rightHand = leftHand.clone(); rightHand.position.set(1.3, 1.6, 0); avatarGroup.add(rightHand);

    // HEAD
    const headGroup = new THREE.Group();
    headGroup.position.y = 4.2;
    avatarGroup.add(headGroup);

    const headGeo = new THREE.SphereGeometry(1.1, 32, 32);
    const head = new THREE.Mesh(headGeo, skinMat);
    head.scale.y = 1.1; head.castShadow = true; headGroup.add(head);

    // HAIR (Expanded)
    let hairMesh;
    const style = config.hairStyle || 0;
    if (style === 1) { // Short / Normal
      hairMesh = new THREE.Mesh(new THREE.SphereGeometry(1.15, 32, 16, 0, Math.PI * 2, 0, Math.PI/2), hairMat);
      hairMesh.position.y = 0.1;
    } else if (style === 2) { // Spiky
      hairMesh = new THREE.Mesh(new THREE.DodecahedronGeometry(1.2, 1), hairMat);
      hairMesh.position.y = 0.2;
    } else if (style === 3) { // Afro
      hairMesh = new THREE.Mesh(new THREE.SphereGeometry(1.4, 32, 32), hairMat);
      hairMesh.position.y = 0.3;
    } else if (style === 4) { // Flat Top
      hairMesh = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.15, 0.8, 32), hairMat);
      hairMesh.position.y = 0.8;
    } else if (style === 5) { // Bun
      const baseHair = new THREE.Mesh(new THREE.SphereGeometry(1.15, 32, 16, 0, Math.PI * 2, 0, Math.PI/2), hairMat);
      baseHair.position.y = 0.1;
      const bun = new THREE.Mesh(new THREE.SphereGeometry(0.4, 16, 16), hairMat);
      bun.position.set(0, 1.1, -0.6);
      baseHair.add(bun);
      hairMesh = baseHair;
    } else if (style === 6) { // Pigtails
      const baseHair = new THREE.Mesh(new THREE.SphereGeometry(1.15, 32, 16, 0, Math.PI * 2, 0, Math.PI/2), hairMat);
      baseHair.position.y = 0.1;
      const tail = new THREE.CapsuleGeometry(0.2, 0.6, 4, 16);
      const leftTail = new THREE.Mesh(tail, hairMat);
      leftTail.position.set(-1.1, 0.3, 0); leftTail.rotation.z = Math.PI/4;
      const rightTail = new THREE.Mesh(tail, hairMat);
      rightTail.position.set(1.1, 0.3, 0); rightTail.rotation.z = -Math.PI/4;
      baseHair.add(leftTail); baseHair.add(rightTail);
      hairMesh = baseHair;
    } else if (style === 7) { // Bowl cut
      hairMesh = new THREE.Mesh(new THREE.SphereGeometry(1.2, 32, 16, 0, Math.PI * 2, 0, Math.PI/2 + 0.2), hairMat);
      hairMesh.position.y = 0.1;
    }

    if (hairMesh) {
      hairMesh.castShadow = true;
      headGroup.add(hairMesh);
    }

    // FACE FEATURES
    const faceFeatures = new THREE.Group();
    headGroup.add(faceFeatures);

    // EYES (Expanded)
    const eStyle = config.eyeStyle || 0;
    let eyeMat = darkMat;
    if (config.eyeColor) eyeMat = new THREE.MeshStandardMaterial({ color: config.eyeColor });

    let leftEye, rightEye;
    
    if (eStyle === 0) { // Normal ovals
      const eyeG = new THREE.CapsuleGeometry(0.08, 0.15, 4, 16);
      leftEye = new THREE.Mesh(eyeG, eyeMat); rightEye = new THREE.Mesh(eyeG, eyeMat);
      leftEye.rotation.x = Math.PI/2; rightEye.rotation.x = Math.PI/2;
    } else if (eStyle === 1) { // Angry
      const eyeG = new THREE.CapsuleGeometry(0.08, 0.15, 4, 16);
      leftEye = new THREE.Mesh(eyeG, eyeMat); rightEye = new THREE.Mesh(eyeG, eyeMat);
      leftEye.rotation.x = Math.PI/2; rightEye.rotation.x = Math.PI/2;
      leftEye.rotation.z = Math.PI/6; rightEye.rotation.z = -Math.PI/6;
    } else if (eStyle === 2) { // Happy (arcs)
      const eyeG = new THREE.TorusGeometry(0.12, 0.04, 8, 16, Math.PI);
      leftEye = new THREE.Mesh(eyeG, eyeMat); rightEye = new THREE.Mesh(eyeG, eyeMat);
      leftEye.rotation.set(0, 0, 0); rightEye.rotation.set(0, 0, 0);
    } else if (eStyle === 3) { // Surprised/Wide
      const eyeG = new THREE.SphereGeometry(0.15, 16, 16);
      leftEye = new THREE.Mesh(eyeG, eyeMat); rightEye = new THREE.Mesh(eyeG, eyeMat);
      leftEye.scale.set(1, 1, 0.2); rightEye.scale.set(1, 1, 0.2);
    } else if (eStyle === 4) { // Sleepy (lines)
      const eyeG = new THREE.CapsuleGeometry(0.04, 0.15, 4, 16);
      leftEye = new THREE.Mesh(eyeG, eyeMat); rightEye = new THREE.Mesh(eyeG, eyeMat);
      leftEye.rotation.set(Math.PI/2, 0, Math.PI/2); rightEye.rotation.set(Math.PI/2, 0, Math.PI/2);
    } else if (eStyle === 5) { // Dots
      const eyeG = new THREE.SphereGeometry(0.08, 16, 16);
      leftEye = new THREE.Mesh(eyeG, eyeMat); rightEye = new THREE.Mesh(eyeG, eyeMat);
      leftEye.scale.set(1, 1, 0.2); rightEye.scale.set(1, 1, 0.2);
    }

    leftEye.position.set(-0.35, 0.1, 1.05);
    rightEye.position.set(0.35, 0.1, 1.05);
    faceFeatures.add(leftEye); faceFeatures.add(rightEye);

    // EYEBROWS (Expanded)
    const browStyle = config.browStyle || 0;
    let browMat = hairMat; // Match hair color by default
    if (config.browColor) browMat = new THREE.MeshStandardMaterial({ color: config.browColor });

    if (browStyle > 0) { // 0 = no eyebrows
      let leftBrow, rightBrow;
      if (browStyle === 1) { // Normal Arcs
        const bG = new THREE.TorusGeometry(0.15, 0.04, 8, 16, Math.PI - 1);
        leftBrow = new THREE.Mesh(bG, browMat); rightBrow = new THREE.Mesh(bG, browMat);
        leftBrow.rotation.set(0, 0, 0.5); rightBrow.rotation.set(0, 0, -0.5);
      } else if (browStyle === 2) { // Angry lines
        const bG = new THREE.CapsuleGeometry(0.04, 0.2, 4, 16);
        leftBrow = new THREE.Mesh(bG, browMat); rightBrow = new THREE.Mesh(bG, browMat);
        leftBrow.rotation.set(Math.PI/2, 0, Math.PI/2 + 0.4); rightBrow.rotation.set(Math.PI/2, 0, Math.PI/2 - 0.4);
      } else if (browStyle === 3) { // Sad Arcs
        const bG = new THREE.TorusGeometry(0.15, 0.04, 8, 16, Math.PI - 1);
        leftBrow = new THREE.Mesh(bG, browMat); rightBrow = new THREE.Mesh(bG, browMat);
        leftBrow.rotation.set(0, 0, Math.PI - 0.5); rightBrow.rotation.set(0, 0, Math.PI + 0.5);
      } else if (browStyle === 4) { // Thick blocks
        const bG = new THREE.BoxGeometry(0.3, 0.08, 0.1);
        leftBrow = new THREE.Mesh(bG, browMat); rightBrow = new THREE.Mesh(bG, browMat);
      }

      leftBrow.position.set(-0.35, 0.35, 1.02);
      rightBrow.position.set(0.35, 0.35, 1.02);
      faceFeatures.add(leftBrow); faceFeatures.add(rightBrow);
    }

    // MOUTH (Expanded)
    const mStyle = config.mouthStyle || 0;
    let mouth;
    const mouthMat = new THREE.MeshStandardMaterial({ color: 0xaa2222 }); // slightly reddish
    
    if (mStyle === 0) { // Normal smile
      mouth = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.05, 8, 16, Math.PI), darkMat);
      mouth.rotation.set(0, 0, Math.PI); // actually torus draws bottom half if rotated? No, let's fix
      mouth.position.set(0, -0.3, 1.05);
    } else if (mStyle === 1) { // Open smile
      mouth = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.05, 8, 16, Math.PI), darkMat);
      mouth.rotation.set(Math.PI/2 - 0.2, 0, 0); 
      mouth.position.set(0, -0.3, 1.05);
    } else if (mStyle === 2) { // Frown
      mouth = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.05, 8, 16, Math.PI), darkMat);
      mouth.rotation.set(0, 0, Math.PI); 
      mouth.position.set(0, -0.4, 1.05);
    } else if (mStyle === 3) { // Surprised 'O'
      mouth = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.05, 8, 16), darkMat);
      mouth.position.set(0, -0.35, 1.05);
    } else if (mStyle === 4) { // Neutral line
      mouth = new THREE.Mesh(new THREE.CapsuleGeometry(0.04, 0.25, 4, 16), darkMat);
      mouth.rotation.set(Math.PI/2, 0, Math.PI/2);
      mouth.position.set(0, -0.35, 1.05);
    } else if (mStyle === 5) { // Toothy smile
      mouth = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.1, 16, 1, false, 0, Math.PI), new THREE.MeshStandardMaterial({ color: 0xffffff }));
      mouth.rotation.set(Math.PI/2, 0, 0);
      mouth.position.set(0, -0.3, 1.05);
    }
    faceFeatures.add(mouth);

    // NOSE (Expanded)
    const nStyle = config.noseStyle || 0;
    let nose;
    
    if (nStyle === 0) { // Round (default)
      nose = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 16), skinMat);
      nose.position.set(0, -0.1, 1.15);
    } else if (nStyle === 1) { // Pointy/Long
      nose = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.4, 16), skinMat);
      nose.rotation.x = Math.PI/2;
      nose.position.set(0, -0.1, 1.15);
    } else if (nStyle === 2) { // Big round
      nose = new THREE.Mesh(new THREE.SphereGeometry(0.25, 16, 16), skinMat);
      nose.position.set(0, -0.1, 1.2);
    } else if (nStyle === 3) { // Small button
      nose = new THREE.Mesh(new THREE.SphereGeometry(0.08, 16, 16), skinMat);
      nose.position.set(0, -0.1, 1.12);
    }
    faceFeatures.add(nose);

    // Save leg/arm references for animation loops in Plaza
    avatarGroup.userData = { leftLeg, rightLeg, leftArm, rightArm, walkCycle: 0 };

    return avatarGroup;
  }
};
window.MiiBuilder = MiiBuilder;
