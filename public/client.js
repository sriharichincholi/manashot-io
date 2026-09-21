// Connect to Render backend
const socket = io('https://manashot-backend.onrender.com');

// Scene setup with Bright Gothic Aesthetics
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1228);
scene.fog = new THREE.FogExp2(0x1a1228, 0.005);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// Lighting Setup
const ambientLight = new THREE.AmbientLight(0x7755aa, 1.8);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffdf88, 2.2);
dirLight.position.set(30, 60, 30);
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 2048;
dirLight.shadow.mapSize.height = 2048;
scene.add(dirLight);

// Procedural Canvas Studded/Grid Texture
function createTileTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#221a36';
    ctx.fillRect(0, 0, 256, 256);

    ctx.strokeStyle = '#443566';
    ctx.lineWidth = 4;
    ctx.strokeRect(0, 0, 256, 256);

    ctx.fillStyle = '#161024';
    ctx.fillRect(8, 8, 240, 240);

    // Studs / Grid Nodes
    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    ctx.arc(128, 128, 6, 0, Math.PI * 2);
    ctx.fill();

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(50, 50);
    return texture;
}

const floorTexture = createTileTexture();
const floorGeo = new THREE.PlaneGeometry(300, 300);
const floorMat = new THREE.MeshStandardMaterial({
    map: floorTexture,
    roughness: 0.4,
    metalness: 0.5
});
const floor = new THREE.Mesh(floorGeo, floorMat);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

// Modular Pillars
const pillars = [];
function createPillar(x, z) {
    const group = new THREE.Group();
    const geo = new THREE.CylinderGeometry(2.5, 3, 18, 12);
    const mat = new THREE.MeshStandardMaterial({ color: 0x2a1f3d, roughness: 0.3, metalness: 0.7 });
    const pillar = new THREE.Mesh(geo, mat);
    pillar.position.y = 9;
    pillar.castShadow = true;
    pillar.receiveShadow = true;
    group.add(pillar);

    group.position.set(x, 0, z);
    scene.add(group);
    pillars.push({ mesh: group, x, z, radius: 3 });
}

createPillar(-35, -35);
createPillar(35, -35);
createPillar(-35, 35);
createPillar(35, 35);

// First-Person Held Lightning Bolt (Gun Model)
const fpBoltGroup = new THREE.Group();

function crpZEAWYtiB6bJ16NuLbGCc6CZ6jJdKfb63() {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.lineTo(0.3, 1.2);
    shape.lineTo(-0.2, 1.3);
    shape.lineTo(0.4, 2.8);
    shape.lineTo(-0.3, 2.9);
    shape.lineTo(0.5, 4.5);
    shape.lineTo(0.1, 4.5);
    shape.lineTo(-0.6, 2.7);
    shape.lineTo(-0.1, 2.6);
    shape.lineTo(-0.6, 1.1);
    shape.lineTo(-0.2, 1.0);
    shape.lineTo(-0.4, 0);
    shape.closePath();

    const extrudeSettings = { depth: 0.15, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: 0.04, bevelThickness: 0.04 };
    return new THREE.ExtrudeGeometry(shape, extrudeSettings);
}

const fpBoltGeo = crpZEAWYtiB6bJ16NuLbGCc6CZ6jJdKfb63();
const fpBoltMat = new THREE.MeshBasicMaterial({ color: 0xffff00 });
const fpBoltMesh = new THREE.Mesh(fpBoltGeo, fpBoltMat);
fpBoltMesh.scale.set(0.25, 0.25, 0.25);
fpBoltMesh.rotation.x = Math.PI / 2;
fpBoltMesh.rotation.y = -Math.PI / 8;
fpBoltGroup.add(fpBoltMesh);

const fpGlowMat = new THREE.MeshBasicMaterial({ color: 0xffa500, transparent: true, opacity: 0.5 });
const fpGlowMesh = new THREE.Mesh(fpBoltGeo, fpGlowMat);
fpGlowMesh.scale.set(0.28, 0.28, 0.28);
fpGlowMesh.rotation.x = Math.PI / 2;
fpGlowMesh.rotation.y = -Math.PI / 8;
fpBoltGroup.add(fpGlowMesh);

// Position held bolt on camera view
fpBoltGroup.position.set(0.4, -0.35, -0.6);
camera.add(fpBoltGroup);
scene.add(camera);

// Player State Mechanics
let isLocked = false;
let velocity = new THREE.Vector3();
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false;
let isJumping = false, isCrouching = false;
let hp = 100;
let slays = 0;
let lastShotTime = 0;
let isInvincible = false;

// BHop Cap set to high speed for movement/dodging
const BASE_RELOAD_TIME = 800;
const BASE_SPEED = 22;
const MAX_BHOP_SPEED = 85;

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
const killFeed = document.getElementById('kill-feed');

function showKillMessage(msg) {
    const el = document.createElement('div');
    el.className = 'kill-msg';
    el.textContent = msg;
    killFeed.appendChild(el);
    setTimeout(() => el.remove(), 2500);
}

// Pointer Lock Controls
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

// Controls
document.addEventListener('keydown', (e) => {
    switch (e.code) {
        case 'KeyW': moveForward = true; break;
        case 'KeyS': moveBackward = true; break;
        case 'KeyA': moveLeft = true; break;
        case 'KeyD': moveRight = true; break;
        case 'Space': 
            if (!isJumping) { 
                velocity.y = 14; 
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

// Projectile System
const activeSpears = [];
const electrocutions = [];

document.addEventListener('mousedown', (e) => {
    if (!isLocked || e.button !== 0) return;
    const now = Date.now();
    const buffTier = Math.min(5, Math.floor(slays / 5));
    const currentReloadTime = BASE_RELOAD_TIME * (1 - buffTier * 0.03);
    if (now - lastShotTime < currentReloadTime) return;

    lastShotTime = now;
    fireLightningSpear();

    // Held Bolt Recoil Animation
    fpBoltGroup.position.z = -0.45;
    fpBoltGroup.rotation.x = -0.2;
    setTimeout(() => {
        fpBoltGroup.position.z = -0.6;
        fpBoltGroup.rotation.x = 0;
    }, 100);

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

    const group = new THREE.Group();
    const mesh = new THREE.Mesh(fpBoltGeo, new THREE.MeshBasicMaterial({ color: 0xffff00 }));
    mesh.scale.set(0.3, 0.3, 0.3);
    group.add(mesh);

    const glow = new THREE.Mesh(fpBoltGeo, new THREE.MeshBasicMaterial({ color: 0xffa500, transparent: true, opacity: 0.6 }));
    glow.scale.set(0.35, 0.35, 0.35);
    group.add(glow);

    const startPos = camera.position.clone().addScaledVector(dir, 1.2);
    group.position.copy(startPos);
    group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);

    scene.add(group);
    activeSpears.push({ mesh: group, pos: startPos, dir: dir.clone(), speed: 120, distance: 0, maxDistance: 200 });
}

// Electrocution Kill Effect
function triggerElectrocutionDeath(position) {
    const group = new THREE.Group();
    group.position.copy(position);

    // Sparking Arcs
    for (let i = 0; i < 8; i++) {
        const arc = new THREE.Mesh(
            new THREE.BoxGeometry(0.1, 1.2, 0.1),
            new THREE.MeshBasicMaterial({ color: i % 2 === 0 ? 0x00ffff : 0xffff00 })
        );
        arc.position.set((Math.random() - 0.5) * 1.5, Math.random() * 2, (Math.random() - 0.5) * 1.5);
        arc.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
        group.add(arc);
    }

    scene.add(group);
    electrocutions.push({ mesh: group, createdAt: Date.now(), lifetime: 400 });
}

// Humanoid Demon AI System with Walking Legs Animation
const demons = [];

function createHumanoidDemonMesh(color) {
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: color, roughness: 0.3, metalness: 0.6, transparent: true, opacity: 1.0 });

    const torso = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.8, 0.8), mat);
    torso.position.y = 1.8;
    torso.castShadow = true;
    group.add(torso);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 8), mat);
    head.position.y = 3.1;
    head.castShadow = true;
    group.add(head);

    const hornMat = new THREE.MeshBasicMaterial({ color: 0xff1100 });
    const leftHorn = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.6, 4), hornMat);
    leftHorn.position.set(-0.3, 3.6, 0);
    leftHorn.rotation.z = -0.3;
    group.add(leftHorn);

    const rightHorn = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.6, 4), hornMat);
    rightHorn.position.set(0.3, 3.6, 0);
    rightHorn.rotation.z = 0.3;
    group.add(rightHorn);

    // Leg Pivot Groups for Walking Motion
    const leftLegGroup = new THREE.Group();
    leftLegGroup.position.set(-0.35, 1.6, 0);
    const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.45, 1.6, 0.45), mat);
    leftLeg.position.y = -0.8;
    leftLegGroup.add(leftLeg);
    group.add(leftLegGroup);

    const rightLegGroup = new THREE.Group();
    rightLegGroup.position.set(0.35, 1.6, 0);
    const rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.45, 1.6, 0.45), mat);
    rightLeg.position.y = -0.8;
    rightLegGroup.add(rightLeg);
    group.add(rightLegGroup);

    group.userData = { leftLegGroup, rightLegGroup, mat };
    return group;
}

function spawnDemons() {
    const types = [
        { name: 'Infernal Surtur', color: 0xcc2200, hp: 100, isSurtur: true },
        { name: 'Shadow Stalker', color: 0x8800cc, hp: 80, isSurtur: false },
        { name: 'Fire Surtur', color: 0xcc2200, hp: 100, isSurtur: true }
    ];

    types.forEach((t, i) => {
        const mesh = createHumanoidDemonMesh(t.color);
        const spawnAngle = (i / types.length) * Math.PI * 2;
        const x = Math.cos(spawnAngle) * 45;
        const z = Math.sin(spawnAngle) * 45;
        mesh.position.set(x, 0, z);
        scene.add(mesh);

        demons.push({
            name: t.name,
            mesh: mesh,
            hp: t.hp,
            maxHp: t.hp,
            isSurtur: t.isSurtur,
            lastAttackTime: 0,
            speed: t.isSurtur ? 8 : 11,
            walkCycle: Math.random() * 10
        });
    });
}
spawnDemons();

// Flame Sword Projectiles
const flameSwords = [];
function fireSurturFlameSword(fromPos, targetPos) {
    const group = new THREE.Group();
    const bladeMat = new THREE.MeshBasicMaterial({ color: 0xff3300 });
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.3, 3.5, 0.1), bladeMat);
    group.add(blade);

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

    // FPS Counter
    frameCount++;
    if (time - lastFpsUpdate >= 1000) {
        fpsVal.textContent = frameCount;
        frameCount = 0;
        lastFpsUpdate = time;
    }

    if (isLocked) {
        // Dynamic Movement Stats
        const buffTier = Math.min(5, Math.floor(slays / 5));
        const speedBuffPercent = buffTier * 3.0;
        const reloadBuffPercent = buffTier * 3.0;

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

        // Smooth acceleration for Bunnyhopping
        velocity.x += moveDir.x * effectiveBaseSpeed * delta * 8;
        velocity.z += moveDir.z * effectiveBaseSpeed * delta * 8;

        // Friction adjustments (low friction in air for hopping speed carry)
        const friction = isJumping ? 0.96 : 0.88;
        velocity.x *= friction;
        velocity.z *= friction;

        const currentHorizSpeed = Math.sqrt(velocity.x * velocity.x + velocity.z * velocity.z);
        if (currentHorizSpeed > MAX_BHOP_SPEED) {
            velocity.x = (velocity.x / currentHorizSpeed) * MAX_BHOP_SPEED;
            velocity.z = (velocity.z / currentHorizSpeed) * MAX_BHOP_SPEED;
        }

        speedVal.textContent = currentHorizSpeed.toFixed(1);

        // Vertical Gravity & Jump Mechanics
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

        // Pillar Collisions
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

        if (shieldMesh) shieldMesh.position.copy(camera.position);

        socket.emit('player_move', {
            x: camera.position.x,
            y: camera.position.y,
            z: camera.position.z,
            rotation: camera.rotation.y
        });
    }

    // Spear Trajectory & Hit Detection
    for (let i = activeSpears.length - 1; i >= 0; i--) {
        const spear = activeSpears[i];
        const step = spear.speed * delta;
        spear.pos.addScaledVector(spear.dir, step);
        spear.mesh.position.copy(spear.pos);
        spear.distance += step;

        let hit = false;

        // Accurate Demon Hitbox Check
        demons.forEach((d) => {
            if (hit || d.hp <= 0) return;
            const dCenter = d.mesh.position.clone().add(new THREE.Vector3(0, 1.8, 0));
            if (spear.pos.distanceTo(dCenter) < 2.5) {
                hit = true;
                d.hp -= 50;
                
                if (d.hp <= 0) {
                    slays++;
                    showKillMessage(`Eradicated ${d.name} [+1 Slay]`);
                    triggerElectrocutionDeath(d.mesh.position);
                    scene.remove(d.mesh);

                    // Respawn Demon
                    setTimeout(() => {
                        d.hp = d.maxHp;
                        d.mesh.userData.mat.opacity = 1.0;
                        d.mesh.scale.set(1, 1, 1);
                        d.mesh.position.set((Math.random() - 0.5) * 90, 0, (Math.random() - 0.5) * 90);
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

    // Animate Electrocution Effects
    for (let i = electrocutions.length - 1; i >= 0; i--) {
        const fx = electrocutions[i];
        if (Date.now() - fx.createdAt > fx.lifetime) {
            scene.remove(fx.mesh);
            electrocutions.splice(i, 1);
        }
    }

    // Demon AI & Running Leg Animations
    demons.forEach((d) => {
        if (d.hp <= 0) return;
        const demonPos = d.mesh.position;
        const playerPos = camera.position.clone();
        playerPos.y = 0;

        const dirToPlayer = new THREE.Vector3().subVectors(playerPos, demonPos).normalize();
        demonPos.addScaledVector(dirToPlayer, d.speed * delta);
        d.mesh.lookAt(playerPos.x, demonPos.y, playerPos.z);

        // Leg Swing Motion
        d.walkCycle += delta * d.speed * 1.5;
        const legAngle = Math.sin(d.walkCycle) * 0.6;
        d.mesh.userData.leftLegGroup.rotation.x = legAngle;
        d.mesh.userData.rightLegGroup.rotation.x = -legAngle;

        // Ranged Attacks
        if (d.isSurtur && Date.now() - d.lastAttackTime > 3200) {
            if (demonPos.distanceTo(playerPos) < 45) {
                d.lastAttackTime = Date.now();
                fireSurturFlameSword(demonPos, camera.position);
            }
        }
    });

    // Flame Sword Physics
    for (let i = flameSwords.length - 1; i >= 0; i--) {
        const sword = flameSwords[i];
        sword.mesh.position.addScaledVector(sword.dir, sword.speed * delta);
        sword.mesh.rotation.z += delta * 12;

        if (sword.mesh.position.distanceTo(camera.position) < 1.8) {
            if (!isInvincible) {
                hp = 0;
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

    if (!isInvincible) {
        healthFill.style.width = `${Math.max(0, hp)}%`;
        healthText.textContent = `HP: ${Math.max(0, hp)} / 100`;
    }

    // Network Ping
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