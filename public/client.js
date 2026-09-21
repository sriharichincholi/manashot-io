// Connect directly to live Render WebSocket backend
const socket = io('https://manashot-backend.onrender.com');

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050508);
scene.fog = new THREE.FogExp2(0x050508, 0.015);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// Lighting
const ambientLight = new THREE.AmbientLight(0x221133, 1.2);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffd700, 1.5);
dirLight.position.set(20, 40, 20);
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 2048;
dirLight.shadow.mapSize.height = 2048;
scene.add(dirLight);

// Arena floor (Dark Obsidian)
const floorGeo = new THREE.PlaneGeometry(200, 200);
const floorMat = new THREE.MeshStandardMaterial({ color: 0x111118, roughness: 0.4, metalness: 0.8 });
const floor = new THREE.Mesh(floorGeo, floorMat);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

// Rune Pillars (Modular Obstacles)
const pillars = [];
function createPillar(x, z) {
    const geo = new THREE.CylinderGeometry(2, 2.5, 12, 8);
    const mat = new THREE.MeshStandardMaterial({ color: 0x221a2b, roughness: 0.3, metalness: 0.9 });
    const pillar = new THREE.Mesh(geo, mat);
    pillar.position.set(x, 6, z);
    pillar.castShadow = true;
    pillar.receiveShadow = true;
    scene.add(pillar);
    pillars.push(pillar);
}
createPillar(-20, -20);
createPillar(20, -20);
createPillar(-20, 20);
createPillar(20, 20);
createPillar(0, -40);
createPillar(0, 40);

// Player State
let isLocked = false;
let velocity = new THREE.Vector3();
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false;
let isJumping = false, isCrouching = false;
let hp = 100;
let slays = 0;
let lastShotTime = 0;
let baseReloadTime = 1000; // ms
const BASE_SPEED = 14;
const MAX_BHOP_SPEED = 35;

// HUD Elements
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

// Pointer Lock Controls
blocker.addEventListener('click', () => {
    document.body.requestPointerLock();
});

document.addEventListener('pointerlockchange', () => {
    if (document.pointerLockElement === document.body) {
        blocker.style.display = 'none';
        isLocked = true;
    } else {
        blocker.style.display = 'flex';
        isLocked = false;
    }
});

// Controls & Movement
const euler = new THREE.Euler(0, 0, 0, 'YXZ');
document.addEventListener('mousemove', (e) => {
    if (!isLocked) return;
    euler.setFromQuaternion(camera.quaternion);
    euler.y -= e.movementX * 0.002;
    euler.x -= e.movementY * 0.002;
    euler.x = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, euler.x));
    camera.quaternion.setFromEuler(euler);
});

document.addEventListener('keydown', (e) => {
    switch (e.code) {
        case 'KeyW': moveForward = true; break;
        case 'KeyS': moveBackward = true; break;
        case 'KeyA': moveLeft = true; break;
        case 'KeyD': moveRight = true; break;
        case 'Space': if (!isJumping) { velocity.y = 12; isJumping = true; } break;
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

// Shooting Mechanic
document.addEventListener('mousedown', (e) => {
    if (!isLocked || e.button !== 0) return;
    const now = Date.now();
    const currentReloadTime = baseReloadTime * (1 - Math.min(0.25, Math.floor(slays / 5) * 0.025));
    if (now - lastShotTime < currentReloadTime) return;

    lastShotTime = now;
    fireLightningSpear();
    
    // Animate Reload HUD
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
    
    // Local raycast visual bolt
    const geom = new THREE.CylinderGeometry(0.1, 0.1, 15, 8);
    geom.rotateX(Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffff00 });
    const bolt = new THREE.Mesh(geom, mat);
    bolt.position.copy(camera.position).addScaledVector(dir, 7.5);
    bolt.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), dir);
    scene.add(bolt);

    setTimeout(() => scene.remove(bolt), 100);

    socket.emit('player_shoot', {
        origin: { x: camera.position.x, y: camera.position.y, z: camera.position.z },
        direction: { x: dir.x, y: dir.y, z: dir.z }
    });
}

// Networked Entities
const otherPlayers = {};
socket.on('current_players', (players) => {
    Object.keys(players).forEach((id) => {
        if (id !== socket.id && !otherPlayers[id]) {
            addOtherPlayer(id, players[id]);
        }
    });
});

socket.on('player_joined', (data) => {
    addOtherPlayer(data.id, data.player);
});

socket.on('player_left', (id) => {
    if (otherPlayers[id]) {
        scene.remove(otherPlayers[id]);
        delete otherPlayers[id];
    }
});

function addOtherPlayer(id, data) {
    const geo = new THREE.CapsuleGeometry(0.8, 1.8, 4, 8);
    const mat = new THREE.MeshStandardMaterial({ color: 0x00ffcc });
    const pMesh = new THREE.Mesh(geo, mat);
    pMesh.position.set(data.x, data.y, data.z);
    scene.add(pMesh);
    otherPlayers[id] = pMesh;
}

// Game Loop
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
        // Friction & Acceleration
        const speedBuffTier = Math.min(0.25, Math.floor(slays / 5) * 0.025);
        const effectiveBaseSpeed = BASE_SPEED * (1 + speedBuffTier);
        
        const moveDir = new THREE.Vector3();
        if (moveForward) moveDir.z -= 1;
        if (moveBackward) moveDir.z += 1;
        if (moveLeft) moveDir.x -= 1;
        if (moveRight) moveDir.x += 1;
        moveDir.normalize();
        moveDir.applyQuaternion(camera.quaternion);
        moveDir.y = 0;

        velocity.x += moveDir.x * effectiveBaseSpeed * delta * 5;
        velocity.z += moveDir.z * effectiveBaseSpeed * delta * 5;

        // Apply friction
        velocity.x *= 0.9;
        velocity.z *= 0.9;

        // Gravity
        velocity.y -= 30 * delta;

        // Apply velocities
        camera.position.x += velocity.x * delta;
        camera.position.z += velocity.z * delta;
        camera.position.y += velocity.y * delta;

        // Floor collision
        const eyeHeight = isCrouching ? 1.0 : 1.8;
        if (camera.position.y <= eyeHeight) {
            camera.position.y = eyeHeight;
            velocity.y = 0;
            isJumping = false;
        }

        // Speed calculation display
        const horizSpeed = Math.sqrt(velocity.x * velocity.x + velocity.z * velocity.z);
        speedVal.textContent = horizSpeed.toFixed(1);

        // Sync with server
        socket.emit('player_move', {
            x: camera.position.x,
            y: camera.position.y,
            z: camera.position.z,
            rotation: camera.rotation.y
        });
    }

    // Ping check
    const startPing = Date.now();
    socket.emit('ping_check', () => {
        pingVal.textContent = `${Date.now() - startPing} ms`;
    });

    renderer.render(scene, camera);
}

animate();

// Resize handler
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});