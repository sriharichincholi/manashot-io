import * as THREE from 'three';

const socket = io('https://manashot-backend.onrender.com');

// Canvas & Renderer
const canvas = document.getElementById('game-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;

// Scene & Camera
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x181424);
scene.fog = new THREE.FogExp2(0x181424, 0.008);

const camera = new THREE.PerspectiveCamera(90, window.innerWidth / window.innerHeight, 0.1, 1000);

// Camera Yaw / Pitch Containers
const cameraPitchObject = new THREE.Object3D();
cameraPitchObject.add(camera);

const cameraYawObject = new THREE.Object3D();
cameraYawObject.position.set(0, 1.6, 0);
cameraYawObject.add(cameraPitchObject);
scene.add(cameraYawObject);

// Lighting
const ambientLight = new THREE.AmbientLight(0xd1c4e9, 1.2);
scene.add(ambientLight);

const hemiLight = new THREE.HemisphereLight(0x7c4dff, 0x311b92, 0.8);
scene.add(hemiLight);

const centerSun = new THREE.DirectionalLight(0xffffff, 1.0);
centerSun.position.set(20, 40, 20);
scene.add(centerSun);

// Floor Arena Map Setup
const floorGeo = new THREE.PlaneGeometry(140, 140);
const floorMat = new THREE.MeshStandardMaterial({ color: 0x2a233d, roughness: 0.6 });
const floor = new THREE.Mesh(floorGeo, floorMat);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

// Collidable Pillar Towers
const pillarRadius = 1.5;
const pillarHeight = 12;
const pillarPositions = [];

const pillarGeo = new THREE.CylinderGeometry(pillarRadius, pillarRadius, pillarHeight, 12);
const pillarMat = new THREE.MeshStandardMaterial({ color: 0x3d3159 });
const runeMat = new THREE.MeshBasicMaterial({ color: 0x00ffcc });

for (let i = -40; i <= 40; i += 20) {
  for (let j = -40; j <= 40; j += 20) {
    if (i === 0 && j === 0) continue;
    
    const pillar = new THREE.Mesh(pillarGeo, pillarMat);
    pillar.position.set(i, 6, j);
    pillar.castShadow = true;
    pillar.receiveShadow = true;
    scene.add(pillar);

    pillarPositions.push(new THREE.Vector3(i, 0, j));

    const ringGeo = new THREE.TorusGeometry(pillarRadius + 0.1, 0.1, 8, 24);
    const ring = new THREE.Mesh(ringGeo, runeMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(i, 3, j);
    scene.add(ring);
  }
}

// Yellow Lightning Spear Factory
function createLightningSpearMesh() {
  const spearGroup = new THREE.Group();
  const spearMat = new THREE.MeshBasicMaterial({ color: 0xffea00 });

  const shaftGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.8, 8);
  const shaft = new THREE.Mesh(shaftGeo, spearMat);
  shaft.rotation.x = Math.PI / 2;
  spearGroup.add(shaft);

  const tipGeo = new THREE.ConeGeometry(0.12, 0.5, 8);
  const tip = new THREE.Mesh(tipGeo, spearMat);
  tip.rotation.x = -Math.PI / 2;
  tip.position.z = -1.0;
  spearGroup.add(tip);

  const backTip = new THREE.Mesh(tipGeo, spearMat);
  backTip.rotation.x = Math.PI / 2;
  backTip.position.z = 1.0;
  spearGroup.add(backTip);

  return spearGroup;
}

// Surtur's Flame Sword Factory (Demon Projectile)
function createSurturFlameSwordMesh() {
  const swordGroup = new THREE.Group();
  const swordMat = new THREE.MeshBasicMaterial({ color: 0xff2200 });

  const bladeGeo = new THREE.BoxGeometry(0.1, 1.6, 0.2);
  const blade = new THREE.Mesh(bladeGeo, swordMat);
  swordGroup.add(blade);

  const hiltGeo = new THREE.BoxGeometry(0.5, 0.1, 0.15);
  const hilt = new THREE.Mesh(hiltGeo, swordMat);
  hilt.position.y = -0.7;
  swordGroup.add(hilt);

  return swordGroup;
}

// Humanoid Demon Builder
function createHumanoidDemonMesh(isRed) {
  const demonGroup = new THREE.Group();
  const color = isRed ? 0xff0044 : 0xaa00ff;
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.4 });

  // Torso
  const torsoGeo = new THREE.BoxGeometry(0.8, 1.2, 0.5);
  const torso = new THREE.Mesh(torsoGeo, mat);
  torso.position.y = 1.2;
  demonGroup.add(torso);

  // Head
  const headGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
  const head = new THREE.Mesh(headGeo, mat);
  head.position.y = 2.1;
  demonGroup.add(head);

  // Eyes
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffff00 });
  const eyeGeo = new THREE.BoxGeometry(0.1, 0.08, 0.1);
  const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
  eyeL.position.set(-0.12, 2.15, -0.26);
  const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
  eyeR.position.set(0.12, 2.15, -0.26);
  demonGroup.add(eyeL, eyeR);

  // Arms
  const armGeo = new THREE.BoxGeometry(0.25, 0.9, 0.25);
  const armL = new THREE.Mesh(armGeo, mat);
  armL.position.set(-0.55, 1.2, 0);
  const armR = new THREE.Mesh(armGeo, mat);
  armR.position.set(0.55, 1.2, 0);
  demonGroup.add(armL, armR);

  // Legs
  const legGeo = new THREE.BoxGeometry(0.3, 1.0, 0.3);
  const legL = new THREE.Mesh(legGeo, mat);
  legL.position.set(-0.25, 0.5, 0);
  const legR = new THREE.Mesh(legGeo, mat);
  legR.position.set(0.25, 0.5, 0);
  demonGroup.add(legL, legR);

  return demonGroup;
}

// Demon Spawner & AI Container
const demons = [];

function spawnDemon() {
  const isRed = Math.random() > 0.5;
  const demonMesh = createHumanoidDemonMesh(isRed);

  let spawnX = (Math.random() - 0.5) * 80;
  let spawnZ = (Math.random() - 0.5) * 80;
  if (Math.abs(spawnX) < 10) spawnX += 20;
  if (Math.abs(spawnZ) < 10) spawnZ += 20;

  demonMesh.position.set(spawnX, 0, spawnZ);
  scene.add(demonMesh);

  demons.push({
    mesh: demonMesh,
    hp: 1,
    isRed,
    speed: isRed ? 8.5 : 6.0, // Red gets +30% movement speed buff
    cooldown: isRed ? 3.5 : 3.15, // Purple gets -10% reload/cast cooldown
    lastAttack: performance.now(),
    lastTouchDamage: performance.now()
  });
}

setInterval(() => {
  if (demons.length < 12) spawnDemon();
}, 3000);

for (let i = 0; i < 5; i++) spawnDemon();

// Player Combat, Health & Killstreak State
let playerHP = 100;
let totalKills = 0;
let reloadBuffPercent = 0; // Stackable up to 25%
let speedBuffPercent = 0;  // Stackable up to 25%

let isInvincible = false;
let baseReloadTime = 0.8; // Seconds

const hpBar = document.getElementById('hp-bar');
const hpText = document.getElementById('hp-text');
const shieldOverlay = document.getElementById('shield-overlay');

function triggerKillstreakBuffs() {
  totalKills++;
  document.getElementById('kills-val').innerText = totalKills;

  // Killstreak rules: every 5 kills alternate between Reload and Speed
  if (totalKills % 5 === 0) {
    const isFiveEnding = totalKills % 10 === 5; // 5, 15, 25...

    if (isFiveEnding && reloadBuffPercent < 25) {
      reloadBuffPercent = Math.min(25, reloadBuffPercent + 2.5);
      document.getElementById('reload-buff-val').innerText = reloadBuffPercent.toFixed(1);
      showBanner(`${totalKills} DEMONS SLAYED! +2.5% RELOAD SPEED`);
    } else if (!isFiveEnding && speedBuffPercent < 25) {
      speedBuffPercent = Math.min(25, speedBuffPercent + 2.5);
      document.getElementById('speed-buff-val').innerText = speedBuffPercent.toFixed(1);
      showBanner(`${totalKills} DEMONS SLAYED! +2.5% MOVEMENT SPEED`);
    }
  }
}

function showBanner(text) {
  const banner = document.getElementById('banner-announcement');
  banner.innerText = text;
  banner.style.opacity = '1';
  banner.style.transform = 'translate(-50%, -60%)';

  setTimeout(() => {
    banner.style.opacity = '0';
    banner.style.transform = 'translate(-50%, -50%)';
  }, 2200);
}

function takePlayerDamage(amount) {
  if (isInvincible) return;

  playerHP = Math.max(0, playerHP - amount);
  hpBar.style.width = `${playerHP}%`;
  hpText.innerText = `HP: ${playerHP} / 100`;

  if (playerHP <= 0) {
    respawnPlayer();
  }
}

function respawnPlayer() {
  // Random Spawn Point
  cameraYawObject.position.x = (Math.random() - 0.5) * 60;
  cameraYawObject.position.z = (Math.random() - 0.5) * 60;
  cameraYawObject.position.y = 1.6;

  playerHP = 100;
  hpBar.style.width = '100%';
  hpText.innerText = 'HP: 100 / 100';

  // Trigger Invincibility Shield for 1.5 seconds
  isInvincible = true;
  shieldOverlay.style.opacity = '1';

  setTimeout(() => {
    isInvincible = false;
    shieldOverlay.style.opacity = '0';
  }, 1500);
}

// Damage Number Overlay
function showDamageNumber(pos, damage) {
  const div = document.createElement('div');
  div.innerText = `-${damage}`;
  div.style.position = 'absolute';
  div.style.color = '#ffea00';
  div.style.fontWeight = 'bold';
  div.style.fontSize = '22px';
  div.style.fontFamily = 'monospace';
  div.style.pointerEvents = 'none';
  div.style.textShadow = '0 0 8px #ff0000';
  document.body.appendChild(div);

  const tempV = pos.clone();
  tempV.project(camera);

  const x = (tempV.x * 0.5 + 0.5) * window.innerWidth;
  const y = (-(tempV.y * 0.5) + 0.5) * window.innerHeight;

  div.style.left = `${x}px`;
  div.style.top = `${y}px`;

  let opacity = 1.0;
  let curY = y;
  const interval = setInterval(() => {
    opacity -= 0.05;
    curY -= 1.5;
    div.style.opacity = opacity;
    div.style.top = `${curY}px`;

    if (opacity <= 0) {
      clearInterval(interval);
      div.remove();
    }
  }, 30);
}

// Projectiles Management
const playerProjectiles = [];
const demonProjectiles = [];

function spawnPlayerSpear(origin, direction) {
  const mesh = createLightningSpearMesh();
  mesh.position.copy(origin);

  const dirVec = direction.clone().normalize();
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), dirVec);

  scene.add(mesh);
  playerProjectiles.push({ mesh, dir: dirVec, speed: 90, life: 2.5 });
}

function spawnDemonFlameSword(origin, targetPos) {
  const mesh = createSurturFlameSwordMesh();
  mesh.position.copy(origin);

  const dirVec = targetPos.clone().sub(origin).normalize();
  scene.add(mesh);

  demonProjectiles.push({ mesh, dir: dirVec, speed: 30, life: 3.0 });
}

// Reload UI Panel Logic
let isReloading = false;
let lastFireTime = 0;

function triggerReloadUI(effectiveReloadTime) {
  isReloading = true;
  const container = document.getElementById('reload-bar-container');
  const fill = document.getElementById('reload-bar-fill');

  container.style.opacity = '1';
  fill.style.width = '0%';

  const startTime = performance.now();
  const interval = setInterval(() => {
    const elapsed = (performance.now() - startTime) / 1000;
    const progress = Math.min(1.0, elapsed / effectiveReloadTime);

    fill.style.width = `${progress * 100}%`;

    if (progress >= 1.0) {
      clearInterval(interval);
      container.style.opacity = '0';
      isReloading = false;
    }
  }, 16);
}

// Controls & Pointer Lock
const mouseSensitivity = 0.0015;
const blocker = document.getElementById('blocker');

blocker.addEventListener('click', () => {
  document.body.requestPointerLock();
});

document.addEventListener('pointerlockchange', () => {
  blocker.style.display = document.pointerLockElement === document.body ? 'none' : 'flex';
});

document.addEventListener('mousemove', (e) => {
  if (document.pointerLockElement === document.body) {
    cameraYawObject.rotation.y -= e.movementX * mouseSensitivity;
    cameraPitchObject.rotation.x -= e.movementY * mouseSensitivity;
    cameraPitchObject.rotation.x = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, cameraPitchObject.rotation.x));
  }
});

// Shooting Controls
document.addEventListener('mousedown', (e) => {
  if (document.pointerLockElement === document.body && e.button === 0) {
    if (isReloading) return;

    const effectiveReload = baseReloadTime * (1 - reloadBuffPercent / 100);
    triggerReloadUI(effectiveReload);

    const origin = cameraYawObject.position.clone();
    origin.y += cameraPitchObject.position.y;

    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);

    spawnPlayerSpear(origin, direction);
    socket.emit('shoot_spell', { origin, direction, type: 'chrono_spear' });
  }
});

// Movement Physics Engine
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false;
let isCrouching = false;
let playerVelocity = new THREE.Vector3();
let isGrounded = true;

const gravity = -28;
const jumpForce = 11;
const baseMaxSpeed = 35; // Base max bhop velocity cap
let prevTime = performance.now();

document.addEventListener('keydown', (e) => {
  switch (e.code) {
    case 'KeyW': moveForward = true; break;
    case 'KeyS': moveBackward = true; break;
    case 'KeyA': moveLeft = true; break;
    case 'KeyD': moveRight = true; break;
    case 'ShiftLeft':
      isCrouching = true;
      cameraPitchObject.position.y = -0.4;
      break;
    case 'Space':
      if (isGrounded) {
        playerVelocity.y = jumpForce;
        isGrounded = false;
      }
      break;
  }
});

document.addEventListener('keyup', (e) => {
  switch (e.code) {
    case 'KeyW': moveForward = false; break;
    case 'KeyS': moveBackward = false; break;
    case 'KeyA': moveLeft = false; break;
    case 'KeyD': moveRight = false; break;
    case 'ShiftLeft':
      isCrouching = false;
      cameraPitchObject.position.y = 0;
      break;
  }
});

// Performance Tracker
setInterval(() => {
  const start = Date.now();
  socket.emit('ping_check', start, () => {
    document.getElementById('ping-val').innerText = Date.now() - start;
  });
}, 2000);

let frameCount = 0, lastFpsTime = performance.now();

// Main Animation Loop
function animate() {
  requestAnimationFrame(animate);

  const time = performance.now();
  const delta = Math.min((time - prevTime) / 1000, 0.1);
  prevTime = time;

  // FPS Display
  frameCount++;
  if (time - lastFpsTime >= 1000) {
    document.getElementById('fps-val').innerText = Math.round((frameCount * 1000) / (time - lastFpsTime));
    frameCount = 0;
    lastFpsTime = time;
  }

  const playerPos = cameraYawObject.position;

  // Demon AI & Combat Loop
  demons.forEach((d) => {
    // Face player
    d.mesh.lookAt(playerPos.x, d.mesh.position.y, playerPos.z);

    // Chase Player
    const distToPlayer = d.mesh.position.distanceTo(playerPos);
    if (distToPlayer > 2.0) {
      const moveDir = playerPos.clone().sub(d.mesh.position).normalize();
      d.mesh.position.addScaledVector(moveDir, d.speed * delta);
    }

    // Touch Damage (20 HP)
    if (distToPlayer < 1.4 && time - d.lastTouchDamage > 1000) {
      takePlayerDamage(20);
      d.lastTouchDamage = time;
    }

    // Flame Sword Ranged Attack
    if (distToPlayer < 30 && time - d.lastAttack > d.cooldown * 1000) {
      const mouthPos = d.mesh.position.clone();
      mouthPos.y += 1.8;
      spawnDemonFlameSword(mouthPos, playerPos);
      d.lastAttack = time;
    }
  });

  // Player Physics Loop
  if (document.pointerLockElement === document.body) {
    const inputAcc = new THREE.Vector3();
    if (moveForward) inputAcc.z -= 1;
    if (moveBackward) inputAcc.z += 1;
    if (moveLeft) inputAcc.x -= 1;
    if (moveRight) inputAcc.x += 1;
    inputAcc.normalize();
    inputAcc.applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraYawObject.rotation.y);

    const accel = isGrounded ? 50 : 20;
    const friction = isGrounded ? (isCrouching ? 0.8 : 4.0) : 0.2;

    playerVelocity.x += inputAcc.x * accel * delta;
    playerVelocity.z += inputAcc.z * accel * delta;

    playerVelocity.x -= playerVelocity.x * friction * delta;
    playerVelocity.z -= playerVelocity.z * friction * delta;

    // Apply speed buff modifier
    const maxSpeedCap = baseMaxSpeed * (1 + speedBuffPercent / 100);

    const horizSpeed = Math.sqrt(playerVelocity.x ** 2 + playerVelocity.z ** 2);
    if (horizSpeed > maxSpeedCap) {
      playerVelocity.x = (playerVelocity.x / horizSpeed) * maxSpeedCap;
      playerVelocity.z = (playerVelocity.z / horizSpeed) * maxSpeedCap;
    }

    document.getElementById('speed-val').innerText = horizSpeed.toFixed(1);

    // Vertical Gravity
    playerVelocity.y += gravity * delta;
    cameraYawObject.position.y += playerVelocity.y * delta;

    const eyeHeight = isCrouching ? 1.0 : 1.6;
    if (cameraYawObject.position.y <= eyeHeight) {
      cameraYawObject.position.y = eyeHeight;
      playerVelocity.y = 0;
      isGrounded = true;
    }

    // Proposed Position Collisions
    const nextX = cameraYawObject.position.x + playerVelocity.x * delta;
    const nextZ = cameraYawObject.position.z + playerVelocity.z * delta;

    let collidedPillar = false;
    const playerRadius = 0.6;

    for (const pos of pillarPositions) {
      const distSq = (nextX - pos.x) ** 2 + (nextZ - pos.z) ** 2;
      if (distSq < (pillarRadius + playerRadius) ** 2) {
        collidedPillar = true;
        playerVelocity.x = 0;
        playerVelocity.z = 0;
        break;
      }
    }

    if (!collidedPillar) {
      cameraYawObject.position.x = nextX;
      cameraYawObject.position.z = nextZ;
    }
  }

  // Update Player Lightning Spears
  for (let i = playerProjectiles.length - 1; i >= 0; i--) {
    const p = playerProjectiles[i];
    p.life -= delta;

    if (p.life <= 0) {
      scene.remove(p.mesh);
      playerProjectiles.splice(i, 1);
      continue;
    }

    const moveDist = p.speed * delta;
    const nextPos = p.mesh.position.clone().addScaledVector(p.dir, moveDist);

    let hit = false;

    // Pillar Collision
    for (const pos of pillarPositions) {
      if ((nextPos.x - pos.x) ** 2 + (nextPos.z - pos.z) ** 2 < (pillarRadius + 0.2) ** 2) {
        hit = true;
        break;
      }
    }

    // Demon Hits
    if (!hit) {
      for (let dIdx = demons.length - 1; dIdx >= 0; dIdx--) {
        const demon = demons[dIdx];
        if (nextPos.distanceTo(demon.mesh.position) < 1.6) {
          hit = true;
          showDamageNumber(demon.mesh.position, 100);

          scene.remove(demon.mesh);
          demons.splice(dIdx, 1);
          triggerKillstreakBuffs();
          break;
        }
      }
    }

    if (hit) {
      scene.remove(p.mesh);
      playerProjectiles.splice(i, 1);
    } else {
      p.mesh.position.copy(nextPos);
    }
  }

  // Update Demon Flame Sword Projectiles
  for (let i = demonProjectiles.length - 1; i >= 0; i--) {
    const p = demonProjectiles[i];
    p.life -= delta;
    p.mesh.rotation.z += 12 * delta; // Spinning sword animation

    if (p.life <= 0) {
      scene.remove(p.mesh);
      demonProjectiles.splice(i, 1);
      continue;
    }

    const moveDist = p.speed * delta;
    const nextPos = p.mesh.position.clone().addScaledVector(p.dir, moveDist);

    let hit = false;

    // Pillar Collision
    for (const pos of pillarPositions) {
      if ((nextPos.x - pos.x) ** 2 + (nextPos.z - pos.z) ** 2 < (pillarRadius + 0.2) ** 2) {
        hit = true;
        break;
      }
    }

    // Player Hit Check (100 Damage / Instant Kill)
    if (!hit && nextPos.distanceTo(playerPos) < 1.2) {
      hit = true;
      takePlayerDamage(100);
    }

    if (hit) {
      scene.remove(p.mesh);
      demonProjectiles.splice(i, 1);
    } else {
      p.mesh.position.copy(nextPos);
    }
  }

  renderer.render(scene, camera);
}

animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});