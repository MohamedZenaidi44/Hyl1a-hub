// Mii Plaza Implementation
const loadScript = url => new Promise((resolve) => {
  if (document.querySelector(`script[src="${url}"]`)) return resolve();
  const s = document.createElement('script');
  s.src = url;
  s.onload = resolve;
  document.head.appendChild(s);
});


export default async function initMiiPlaza(container) {
  await window.loadThreeJS();

  try {
    const miiModule = await import('./mii.js');
    window.Mii = miiModule.default || miiModule.Mii;
  } catch (e) {
    console.error("Failed to load mii.js module:", e);
  }
  await loadScript('apps/mii_maker/js/avatar.js');
  container.innerHTML = `
    <button class="mii-close-btn" title="Close Mii Plaza">✖</button>
    <div id="plaza-loading">Loading Avatars...</div>
    <div class="mii-canvas-area" id="plaza-canvas-container" style="width: 100vw; height: 100vh;"></div>
    <div id="plaza-labels" style="position: absolute; top:0; left:0; width:100%; height:100%; pointer-events:none; overflow:hidden;"></div>
  `;

  // Close Button
  container.querySelector('.mii-close-btn').addEventListener('click', () => {
    container.classList.add('closing');
    setTimeout(() => {
      if (container.parentNode) container.parentNode.removeChild(container);
    }, 400);
  });

  // Fetch Avatars from Firestore instead of localhost
  let avatars = [];
  try {
    if (window.Firestore && window.FirebaseDB) {
      const avatarsRef = window.Firestore.collection(window.FirebaseDB, "avatars");
      const qSnap = await window.Firestore.getDocs(avatarsRef);
      qSnap.forEach(doc => {
        const d = doc.data();
        if (d.visual_base64) {
          avatars.push({ 
            username: d.username || "Mii", 
            visual_data: d.visual_base64 
          });
        }
      });
    }
  } catch(e) {
    console.error("Firestore avatars fetch failed", e);
  }
  
  container.querySelector('#plaza-loading').style.display = 'none';

  // --- THREE.JS SCENE SETUP ---
  const canvasArea = container.querySelector('#plaza-canvas-container');
  const labelsArea = container.querySelector('#plaza-labels');
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xd4e1ed); // Sky color
  scene.fog = new THREE.Fog(0xd4e1ed, 20, 60);
  
  const camera = new THREE.PerspectiveCamera(45, canvasArea.clientWidth / canvasArea.clientHeight, 0.1, 100);
  camera.position.set(0, 10, 25);
  
  const renderer = new THREE.WebGLRenderer({ alpha: false, antialias: true });
  renderer.setSize(canvasArea.clientWidth, canvasArea.clientHeight);
  renderer.shadowMap.enabled = true;
  canvasArea.appendChild(renderer.domElement);

  // Lighting
  const ambient = new THREE.AmbientLight(0xffffff, 0.7);
  scene.add(ambient);
  
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
  dirLight.position.set(20, 30, 10);
  dirLight.castShadow = true;
  dirLight.shadow.camera.left = -30;
  dirLight.shadow.camera.right = 30;
  dirLight.shadow.camera.top = 30;
  dirLight.shadow.camera.bottom = -30;
  scene.add(dirLight);

  // Plaza Ground
  const groundGeo = new THREE.CylinderGeometry(25, 25, 1, 64);
  const groundMat = new THREE.MeshStandardMaterial({ color: 0x88cc88, roughness: 0.8 });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.position.y = -0.5;
  ground.receiveShadow = true;
  scene.add(ground);

  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enablePan = false;
  controls.maxPolarAngle = Math.PI / 2 - 0.1; // Don't go below ground
  controls.minDistance = 5;
  controls.maxDistance = 40;
  controls.target.set(0, 2, 0);

  // Resize handler
  const onResize = () => {
    if (!container.parentNode) return;
    const w = canvasArea.clientWidth || window.innerWidth;
    const h = canvasArea.clientHeight || window.innerHeight;
    if (w === 0 || h === 0) return;
    
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  };
  window.addEventListener('resize', onResize);
  
  // Force initial resize safely
  setTimeout(onResize, 50);

  // Populate Avatars
  const miiEntities = [];
  const loader = new THREE.GLTFLoader();

  avatars.forEach(av => {
    // Parent group for positioning
    const group = new THREE.Group();
    
    // Random position in circle
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * 15;
    group.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
    group.rotation.y = Math.random() * Math.PI * 2;
    scene.add(group);

    // Create 2D Label
    const label = document.createElement('div');
    label.textContent = av.username;
    label.style.position = 'absolute';
    label.style.background = 'rgba(255,255,255,0.85)';
    label.style.padding = '4px 8px';
    label.style.borderRadius = '12px';
    label.style.fontSize = '12px';
    label.style.fontWeight = 'bold';
    label.style.transform = 'translate(-50%, -50%)';
    label.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
    label.style.color = '#333';
    label.style.display = 'none'; // hide until first render
    labelsArea.appendChild(label);

    const miiData = {
      group,
      label,
      targetX: group.position.x,
      targetZ: group.position.z,
      state: 'idle', // idle, move
      timer: Math.random() * 100,
      bob: Math.random() * Math.PI * 2,
      modelLoaded: false,
      modelMesh: null
    };
    miiEntities.push(miiData);

    // Fetch Native Authentic GLB
    const b64 = av.visual_data || "AwEAAAAAAAAAAAAAgP9wmQAAAAAAAAAAAABNAGkAaQAAAAAAAAAAAAAAAAAAAEBAAAAhAQJoRBgmNEYUgRIXaA0AACkAUkhQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMNn";
    const url = `https://mii-unsecure.ariankordi.net/miis/image.glb?data=${encodeURIComponent(b64)}&verifyCharInfo=0&shaderType=wiiu&type=all_body`;
    
    loader.load(url, (gltf) => {
      const model = gltf.scene;

      // Auto-fit: compute bounding box and scale to a target height
      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      const targetHeight = 2.2;
      const scaleFactor = targetHeight / size.y;
      model.scale.set(scaleFactor, scaleFactor, scaleFactor);

      // Align feet to y=0
      const box2 = new THREE.Box3().setFromObject(model);
      model.position.y = -box2.min.y;
      
      model.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          if(child.material) child.material.side = THREE.DoubleSide;
        }
      });
      
      group.add(model);
      miiData.modelMesh = model;
      miiData.modelLoaded = true;
    }, undefined, (err) => console.error("Could not load Mii GLB:", err));
  });

  // Animation Loop
  let reqId;
  function animate() {
    if (!container.parentNode) return; // Stop if closed
    reqId = requestAnimationFrame(animate);

    // Update controls
    controls.update();

    // Animate avatars
    miiEntities.forEach(ent => {
      ent.timer--;
      ent.bob += 0.05;

      // Bobbing floating head animation
      if (ent.modelLoaded && ent.modelMesh) {
         ent.modelMesh.position.y = Math.sin(ent.bob) * 0.5 + 4; // float at height 4
      }

      if (ent.timer <= 0) {
        // State switch
        if (ent.state === 'idle') {
          ent.state = 'move';
          ent.timer = 100 + Math.random() * 200;
          // Pick new target
          const angle = Math.random() * Math.PI * 2;
          const radius = Math.random() * 18;
          ent.targetX = Math.cos(angle) * radius;
          ent.targetZ = Math.sin(angle) * radius;
        } else {
          ent.state = 'idle';
          ent.timer = 50 + Math.random() * 150;
        }
      }

      if (ent.state === 'move') {
        const dx = ent.targetX - ent.group.position.x;
        const dz = ent.targetZ - ent.group.position.z;
        const dist = Math.sqrt(dx*dx + dz*dz);
        
        if (dist > 0.1) {
          // Move
          ent.group.position.x += (dx/dist) * 0.05;
          ent.group.position.z += (dz/dist) * 0.05;
          
          // Rotate towards target smoothly
          const targetRot = Math.atan2(dx, dz);
          // Angle wrapping for smooth rotation
          let diff = targetRot - ent.group.rotation.y;
          while (diff < -Math.PI) diff += Math.PI * 2;
          while (diff > Math.PI) diff -= Math.PI * 2;
          ent.group.rotation.y += diff * 0.05;
        } else {
          ent.state = 'idle';
        }
      }

      // Update 2D Label position
      if (ent.modelLoaded) {
        const vector = new THREE.Vector3();
        // Project at the top of the head
        vector.setFromMatrixPosition(ent.group.matrixWorld);
        vector.y += 8; // Adjust based on float height + model size
        vector.project(camera);

        // Map to 2D screen coordinates
        const x = (vector.x * .5 + .5) * canvasArea.clientWidth;
        const y = (vector.y * -.5 + .5) * canvasArea.clientHeight;

        // Show if in front of camera
        if (vector.z < 1) {
          ent.label.style.display = 'block';
          ent.label.style.left = `${x}px`;
          ent.label.style.top = `${y}px`;
        } else {
          ent.label.style.display = 'none';
        }
      }
    });

    renderer.render(scene, camera);
  }
  animate();
}
