// Connect to Render backend
const socket = io('https://manashot-backend.onrender.com');

// Scene setup with Bright Gothic Aesthetics
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1228);
scene.fog = new THREE.FogExp2(0x1a1228, 0.008);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// Bright Ambient + Gothic Directional Lighting
const ambientLight = new THREE.AmbientLight(0x7755aa, 1.8);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffdf88, 2.2);
dirLight.position.set(30, 60, 30);
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 2048;
dirLight.shadow.mapSize.height = 2048;
scene.add(dirLight);

const fillLight = new THREE.PointLight(0xff5522, 1.5, 120);
fillLight.position.set(0, 20, 0);
scene.add(fillLight);

// Floor Grid & Modular Pillars
const floorGeo = new THREE.PlaneGeometry(250, 250);
const floorMat = new THREE.MeshStandardMaterial({ color: 0x1f1a2e, roughness: 0.3, metalness: 0.7 });
const floor = new THREE.Mesh(floorGeo, floorMat);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

const gridHelper = new THREE.GridHelper(250, 50, 0xffd700, 0x443366);
gridHelper.position.y = 0.01;
scene.add(gridHelper);

const pillars = [];
function createPillar(x, z) {
    const group = new THREE.Group();
    const geo = new THREE.CylinderGeometry(2.5, 3, 16, 8);
    const mat = new THREE.MeshStandardMaterial({ color: 0x2d223c, roughness: 0.2, metalness: 0.8 });
    const pillar = new THREE.Mesh(geo, mat);
    pillar.position.y = 8;
    pillar.castShadow = true;
    pillar.receiveShadow = true;
    group.add(pillar);

    // Glowing Rune Core
    const coreGeo = new THREE.CylinderGeometry(1.2, 1.2, 16.2, 8);
    const coreMat = new THREE.MeshBasicMaterial({ color: 0xffd700, wireframe: true });
    const core = new THREE.Mesh(coreGeo, coreMat);
    core.position.y = 8;
    group.add(core);

    group.position.set(x, 0, z);
    scene.add(group);
    pillars.push({ mesh: group, x, z, radius: 3 });
}

createPillar(-30, -30);
createPillar(30, -30);
createPillar(-30, 30);
createPillar(30, 30);
createPillar(0, -60);
createPillar(0, 60);

// Player State
let isLocked = false;
let velocity = new THREE.Vector3();
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false;
let isJumping = false, isCrouching = false;
let hp = 100;
let slays = 0;
let lastShotTime = 0;
let isInvincible = false;

const BASE_RELOAD_TIME = 1000;
const BASE_SPEED = 15;
const MAX_BHOP_SPEED = 35;

// HUD References
const blocker = document.getElementById('blocker');
const fpsVal = document.getElementById('fps-val');
const pingVal = document.getElementById('ping-val');
const speedVal = document.getElementById('speed-val');
const slaysVal = document.getElementById('slays-val');
const reloadBuffVal = document.getElementById('reload-buff-val');
const speedBuffVal = document.getElementById('speed-buff-val');
const healthFill = document.getElementById('health-bar-fill');
const healthText = document.getElementById('health-text');
const reloadBarContainer = document.getElementById('reload-bar-container');
const reloadBarFill = document.getElementById('reload-bar-fill');

// Pointer Lock
blocker.addEventListener('click', () => document.body.requestPointerLock());
document.addEventListener('pointerlockchange', () => {
    isLocked = document.pointerLockElement === document.body;
    blocker.style.display = isLocked ? 'none' : 'flex';
});

// Camera Mouse Look
const euler = new THREE.Euler(0, 0, 0, 'YXZ');
document.addEventListener('mousemove', (e) => {
    if (!isLocked) return;
    euler.setFromQuaternion(camera.quaternion);
    euler.y -= e.movementX * 0.0022;
    euler.x -= e.movementY * 0.0022;
    euler.x = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, euler.x));
    camera.quaternion.setFromEuler(euler);
});

// Controls Key Listeners
document.addEventListener('keydown', (e) => {
    switch (e.code) {
        case 'KeyW': moveForward = true; break;
        case 'KeyS': moveBackward = true; break;
        case 'KeyA': moveLeft = true; break;
        case 'KeyD': moveRight = true; break;
        case 'Space': 
            if (!isJumping) { 
                velocity.y = 13; 
                isJumping = true; 
            } 
            break;
        case 'ShiftLeft': isCrouching = true; break;
    }
});

document.addEventListener('keyup', (e) => {
    switch (e.code) {
        case 'KeyW': moveForward = false; break;
        case 'KeyS': moveBackward = false; break;
        case 'KeyA': moveLeft = false; break;
        case 'KeyD': moveRight = false; break;
        case 'ShiftLeft': isCrouching = false; break;
    }
});

// Continuous Yellow Lightning Spear Shooting with Raycast Sweep & Impact Effect
const activeSpears = [];
const activeImpactEffects = [];

document.addEventListener('mousedown', (e) => {
    if (!isLocked || e.button !== 0) return;
    const now = Date.now();
    const buffTier = Math.min(5, Math.floor(slays / 5));
    const currentReloadTime = BASE_RELOAD_TIME * (1 - buffTier * 0.025);
    if (now - lastShotTime < currentReloadTime) return;

    lastShotTime = now;
    fireLightningSpear();

    // Reload UI Bar
    reloadBarContainer.style.opacity = '1';
    reloadBarFill.style.width = '0%';
    const startTime = Date.now();
    const interval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(100, (elapsed / currentReloadTime) * 100);
        reloadBarFill.style.width = `${progress}%`;
        if (progress >= 100) {
            clearInterval(interval);
            reloadBarContainer.style.opacity = '0';
        }
    }, 16);
});

function fireLightningSpear() {
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);

    // Dynamic Continuous Spear Mesh
    const group = new THREE.Group();
    const coreGeo = new THREE.CylinderGeometry(0.12, 0.12, 6, 8);
    coreGeo.rotateX(Math.PI / 2);
    const coreMat = new THREE.MeshBasicMaterial({ color: 0xffff00 });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    group.add(coreMesh);

    const glowGeo = new THREE.CylinderGeometry(0.28, 0.28, 6.2, 8);
    glowGeo.rotateX(Math.PI / 2);
    const glowMat = new THREE.MeshBasicMaterial({ color: 0xffa500, transparent: true, opacity: 0.6 });
    const glowMesh = new THREE.Mesh(glowGeo, glowMat);
    group.add(glowMesh);

    const startPos = camera.position.clone().addScaledVector(dir, 1.5);
    group.position.copy(startPos);
    group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), dir);

    scene.add(group);
    activeSpears.push({ mesh: group, pos: startPos, dir: dir.clone(), speed: 110, distance: 0, maxDistance: 180 });
}

function spawnImpactArrayEffect(point) {
    const group = new THREE.Group();
    group.position.copy(point);

    // Glowing Array Rings
    const ringGeo = new THREE.RingGeometry(0.2, 1.8, 16);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xffd700, side: THREE.DoubleSide, transparent: true, opacity: 0.9 });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    group.add(ring);

    // Vertical Energy Rays
    const rayGeo = new THREE.CylinderGeometry(0.05, 0.05, 4, 8);
    const rayMat = new THREE.MeshBasicMaterial({ color: 0x00ffcc });
    for (let i = 0; i < 4; i++) {
        const ray = new THREE.Mesh(rayGeo, rayMat);
        ray.position.set((Math.random() - 0.5) * 1.5, 2, (Math.random() - 0.5) * 1.5);
        group.add(ray);
    }

    scene.add(group);
    activeImpactEffects.push({ mesh: group, createdAt: Date.now(), lifetime: 350 });
}

// Humanoid Demon AI System
const demons = [];

function createHumanoidDemonMesh(color) {
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: color, roughness: 0.3, metalness: 0.6 });

    // Torso
    const torso = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.8, 0.8), mat);
    torso.position.y = 1.8;
    torso.castShadow = true;
    group.add(torso);

    // Head
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 8), mat);
    head.position.y = 3.1;
    head.castShadow = true;
    group.add(head);

    // Glowing Horns
    const hornMat = new THREE.MeshBasicMaterial({ color: 0xff1100 });
    const leftHorn = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.6, 4), hornMat);
    leftHorn.position.set(-0.3, 3.6, 0);
    leftHorn.rotation.z = -0.3;
    group.add(leftHorn);

    const rightHorn = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.6, 4), hornMat);
    rightHorn.position.set(0.3, 3.6, 0);
    rightHorn.rotation.z = 0.3;
    group.add(rightHorn);

    // Arms
    const armGeo = new THREE.BoxGeometry(0.4, 1.4, 0.4);
    const leftArm = new THREE.Mesh(armGeo, mat);
    leftArm.position.set(-0.9, 1.8, 0);
    group.add(leftArm);

    const rightArm = new THREE.Mesh(armGeo, mat);
    rightArm.position.set(0.9, 1.8, 0);
    group.add(rightArm);

    // Legs
    const legGeo = new THREE.BoxGeometry(0.5, 1.6, 0.5);
    const leftLeg = new THREE.Mesh(legGeo, mat);
    leftLeg.position.set(-0.35, 0.8, 0);
    group.add(leftLeg);

    const rightLeg = new THREE.Mesh(legGeo, mat);
    rightLeg.position.set(0.35, 0.8, 0);
    group.add(rightLeg);

    return group;
}

// Spawn Initial Demon Squad
function spawnDemons() {
    const types = [
        { color: 0xcc2200, hp: 100, isSurtur: true },
        { color: 0x8800cc, hp: 80, isSurtur: false },
        { color: 0xcc2200, hp: 100, isSurtur: true }
    ];

    types.forEach((t, i) => {
        const mesh = createHumanoidDemonMesh(t.color);
        const spawnAngle = (i / types.length) * Math.PI * 2;
        const x = Math.cos(spawnAngle) * 45;
        const z = Math.sin(spawnAngle) * 45;
        mesh.position.set(x, 0, z);
        scene.add(mesh);

        demons.push({
            mesh: mesh,
            hp: t.hp,
            maxHp: t.hp,
            isSurtur: t.isSurtur,
            lastAttackTime: 0,
            speed: t.isSurtur ? 7 : 9
        });
    });
}
spawnDemons();

// Flame Sword Projectiles from Surtur Warriors
const flameSwords = [];
function fireSurturFlameSword(fromPos, targetPos) {
    const group = new THREE.Group();
    const bladeMat = new THREE.MeshBasicMaterial({ color: 0xff3300 });
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.3, 3.5, 0.1), bladeMat);
    group.add(blade);

    const hilt = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.2, 0.2), new THREE.MeshBasicMaterial({ color: 0xffd700 }));
    hilt.position.y = -1.8;
    group.add(hilt);

    group.position.copy(fromPos).add(new THREE.Vector3(0, 2, 0));
    const dir = new THREE.Vector3().subVectors(targetPos, group.position).normalize();

    scene.add(group);
    flameSwords.push({ mesh: group, dir: dir, speed: 28, createdAt: Date.now() });
}

// Player Respawn Shield
let shieldMesh = null;
function createShieldMesh() {
    const geo = new THREE.SphereGeometry(2.2, 16, 16);
    const mat = new THREE.MeshBasicMaterial({ color: 0x00ffff, wireframe: true, transparent: true, opacity: 0.6 });
    shieldMesh = new THREE.Mesh(geo, mat);
    scene.add(shieldMesh);
}
createShieldMesh();

function triggerPlayerRespawn() {
    hp = 100;
    isInvincible = true;
    camera.position.set(0, 1.8, 0);
    velocity.set(0, 0, 0);
    shieldMesh.visible = true;

    setTimeout(() => {
        isInvincible = false;
        shieldMesh.visible = false;
    }, 1500);
}

// Game Loop & Physics
let lastTime = performance.now();
let frameCount = 0;
let lastFpsUpdate = performance.now();
camera.position.set(0, 1.8, 0);

function animate() {
    requestAnimationFrame(animate);
    const time = performance.now();
    const delta = Math.min((time - lastTime) / 1000, 0.1);
    lastTime = time;

    // FPS Meter
    frameCount++;
    if (time - lastFpsUpdate >= 1000) {
        fpsVal.textContent = frameCount;
        frameCount = 0;
        lastFpsUpdate = time;
    }

    if (isLocked) {
        // Player Mechanics & Movement Speed Buffs
        const buffTier = Math.min(5, Math.floor(slays / 5));
        const speedBuffPercent = buffTier * 2.5;
        const reloadBuffPercent = buffTier * 2.5;

        slaysVal.textContent = slays;
        speedBuffVal.textContent = `${speedBuffPercent}%`;
        reloadBuffVal.textContent = `${reloadBuffPercent}%`;

        const effectiveBaseSpeed = BASE_SPEED * (1 + speedBuffPercent / 100);

        const moveDir = new THREE.Vector3();
        if (moveForward) moveDir.z -= 1;
        if (moveBackward) moveDir.z += 1;
        if (moveLeft) moveDir.x -= 1;
        if (moveRight) moveDir.x += 1;
        moveDir.normalize();
        moveDir.applyQuaternion(camera.quaternion);
        moveDir.y = 0;

        velocity.x += moveDir.x * effectiveBaseSpeed * delta * 6;
        velocity.z += moveDir.z * effectiveBaseSpeed * delta * 6;

        // Friction & Cap Speed
        velocity.x *= 0.88;
        velocity.z *= 0.88;

        const currentHorizSpeed = Math.sqrt(velocity.x * velocity.x + velocity.z * velocity.z);
        if (currentHorizSpeed > MAX_BHOP_SPEED) {
            velocity.x = (velocity.x / currentHorizSpeed) * MAX_BHOP_SPEED;
            velocity.z = (velocity.z / currentHorizSpeed) * MAX_BHOP_SPEED;
        }

        speedVal.textContent = currentHorizSpeed.toFixed(1);

        // Gravity & Jump Physics
        velocity.y -= 32 * delta;
        camera.position.x += velocity.x * delta;
        camera.position.z += velocity.z * delta;
        camera.position.y += velocity.y * delta;

        const eyeHeight = isCrouching ? 1.0 : 1.8;
        if (camera.position.y <= eyeHeight) {
            camera.position.y = eyeHeight;
            velocity.y = 0;
            isJumping = false;
        }

        // Impenetrable Pillar Collision
        pillars.forEach((p) => {
            const dx = camera.position.x - p.x;
            const dz = camera.position.z - p.z;
            const dist = Math.sqrt(dx * dx + dz * dz);
            if (dist < p.radius + 0.6) {
                const angle = Math.atan2(dz, dx);
                camera.position.x = p.x + Math.cos(angle) * (p.radius + 0.6);
                camera.position.z = p.z + Math.sin(angle) * (p.radius + 0.6);
            }
        });

        // Shield Mesh Follow
        if (shieldMesh) {
            shieldMesh.position.copy(camera.position);
            shieldMesh.rotation.y += delta * 2;
        }

        // Socket Sync
        socket.emit('player_move', {
            x: camera.position.x,
            y: camera.position.y,
            z: camera.position.z,
            rotation: camera.rotation.y
        });
    }

    // Spear Movement & Raycast Sweeping
    for (let i = activeSpears.length - 1; i >= 0; i--) {
        const spear = activeSpears[i];
        const step = spear.speed * delta;
        const prevPos = spear.pos.clone();
        spear.pos.addScaledVector(spear.dir, step);
        spear.mesh.position.copy(spear.pos);
        spear.distance += step;

        let hit = false;

        // Demon Hit Collision
        demons.forEach((d) => {
            if (hit || d.hp <= 0) return;
            const dPos = d.mesh.position.clone().add(new THREE.Vector3(0, 1.8, 0));
            if (spear.pos.distanceTo(dPos) < 1.8) {
                hit = true;
                d.hp -= 50;
                spawnImpactArrayEffect(spear.pos);
                if (d.hp <= 0) {
                    scene.remove(d.mesh);
                    slays++;
                    // Respawn Demon after delay
                    setTimeout(() => {
                        d.hp = d.maxHp;
                        d.mesh.position.set((Math.random() - 0.5) * 80, 0, (Math.random() - 0.5) * 80);
                        scene.add(d.mesh);
                    }, 3000);
                }
            }
        });

        if (hit || spear.distance >= spear.maxDistance) {
            scene.remove(spear.mesh);
            activeSpears.splice(i, 1);
        }
    }

    // Animate Impact Effects
    for (let i = activeImpactEffects.length - 1; i >= 0; i--) {
        const fx = activeImpactEffects[i];
        if (Date.now() - fx.createdAt > fx.lifetime) {
            scene.remove(fx.mesh);
            activeImpactEffects.splice(i, 1);
        }
    }

    // Demon AI Pursuit & Surtur Ranged Flame Swords
    demons.forEach((d) => {
        if (d.hp <= 0) return;
        const demonPos = d.mesh.position;
        const playerPos = camera.position.clone();
        playerPos.y = 0;

        const dirToPlayer = new THREE.Vector3().subVectors(playerPos, demonPos).normalize();
        demonPos.addScaledVector(dirToPlayer, d.speed * delta);
        d.mesh.lookAt(playerPos.x, demonPos.y, playerPos.z);

        // Surtur Flame Sword Attacks (100 Damage)
        if (d.isSurtur && Date.now() - d.lastAttackTime > 3500) {
            if (demonPos.distanceTo(playerPos) < 40) {
                d.lastAttackTime = Date.now();
                fireSurturFlameSword(demonPos, camera.position);
            }
        }
    });

    // Flame Sword Physics & Player Hit Check
    for (let i = flameSwords.length - 1; i >= 0; i--) {
        const sword = flameSwords[i];
        sword.mesh.position.addScaledVector(sword.dir, sword.speed * delta);
        sword.mesh.rotation.z += delta * 12;

        if (sword.mesh.position.distanceTo(camera.position) < 1.8) {
            if (!isInvincible) {
                hp -= 100;
                healthFill.style.width = '0%';
                healthText.textContent = `HP: 0 / 100`;
                triggerPlayerRespawn();
            }
            scene.remove(sword.mesh);
            flameSwords.splice(i, 1);
            continue;
        }

        if (Date.now() - sword.createdAt > 4000) {
            scene.remove(sword.mesh);
            flameSwords.splice(i, 1);
        }
    }

    // Update Player HP Display
    if (!isInvincible) {
        healthFill.style.width = `${Math.max(0, hp)}%`;
        healthText.textContent = `HP: ${Math.max(0, hp)} / 100`;
    }

    // Network Ping Check
    const startPing = Date.now();
    socket.emit('ping_check', () => {
        pingVal.textContent = `${Date.now() - startPing} ms`;
    });

    renderer.render(scene, camera);
}

animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});