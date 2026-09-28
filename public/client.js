// ManaShot.io — Main Game Engine Controller
let scene, camera, renderer;
let environmentManager, particleSystem, weaponManager, demonManager, hudManager, networkManager;

let isLocked = false;
let velocity = new THREE.Vector3();
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false;
let isJumping = false, isCrouching = false;
let hp = 100;
let slays = 0;
let isInvincible = false;

// Physics parameters
const BASE_SPEED = 22;
const MAX_BHOP_SPEED = 85;

// Camera effects
let targetFov = 75;
let cameraLandingDip = 0;
let headBobCycle = 0;

function init() {
    // Three.js Scene Setup
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(renderer.domElement);

    // Initialize Subsystem Managers
    particleSystem = new ParticleSystem(scene);
    environmentManager = new EnvironmentManager(scene);
    weaponManager = new WeaponManager(scene, camera, particleSystem);
    demonManager = new DemonManager(scene, particleSystem);
    hudManager = new HUDManager();
    networkManager = new NetworkManager(scene);

    scene.add(camera);

    initShieldMesh();
    initControls();
    animate();
}

// Player Respawn Shield Visual Mesh
let shieldMesh;
function initShieldMesh() {
    const geo = new THREE.SphereGeometry(2.2, 16, 16);
    const mat = new THREE.MeshBasicMaterial({ color: 0x00ffcc, wireframe: true, transparent: true, opacity: 0.6 });
    shieldMesh = new THREE.Mesh(geo, mat);
    shieldMesh.visible = false;
    scene.add(shieldMesh);
}

function triggerPlayerRespawn() {
    hp = 100;
    isInvincible = true;
    camera.position.set(0, 1.8, 0);
    velocity.set(0, 0, 0);
    shieldMesh.visible = true;
    hudManager.updateHealth(hp);

    setTimeout(() => {
        isInvincible = false;
        shieldMesh.visible = false;
    }, 1500);
}

function handlePlayerTakeDamage(amount) {
    if (isInvincible) return;
    hp -= amount;
    hudManager.updateHealth(hp);
    hudManager.triggerDamageFlash();
    if (window.audioManager) window.audioManager.playDamage();

    if (hp <= 0) {
        hudManager.showKillMessage('You were slain by Demon Forces');
        triggerPlayerRespawn();
    }
}

function initControls() {
    const playBtn = document.getElementById('play-btn');
    const blocker = document.getElementById('blocker');

    const requestLock = () => {
        if (window.audioManager) window.audioManager.init();
        document.body.requestPointerLock();
    };

    if (playBtn) playBtn.addEventListener('click', requestLock);
    if (blocker) blocker.addEventListener('click', requestLock);

    document.addEventListener('pointerlockchange', () => {
        isLocked = document.pointerLockElement === document.body;
        if (blocker) blocker.style.display = isLocked ? 'none' : 'flex';
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

    // Keyboard Input
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
                    if (window.audioManager) window.audioManager.playJump();
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

    // Weapon Firing Input
    document.addEventListener('mousedown', (e) => {
        if (!isLocked || e.button !== 0) return;
        const reloadDuration = weaponManager.shoot(slays);
        if (reloadDuration) {
            hudManager.startReloadBar(reloadDuration);

            // Broadcast firing event to network
            const dir = new THREE.Vector3();
            camera.getWorldDirection(dir);
            networkManager.sendShoot(camera.position, dir);
        }
    });
}

// Game Animation Loop
let lastTime = performance.now();
let frameCount = 0;
let lastFpsUpdate = performance.now();
let currentFps = 60;
let currentPing = 0;

function animate() {
    requestAnimationFrame(animate);
    const time = performance.now();
    const delta = Math.min((time - lastTime) / 1000, 0.1);
    lastTime = time;

    // FPS Calculation
    frameCount++;
    if (time - lastFpsUpdate >= 1000) {
        currentFps = frameCount;
        frameCount = 0;
        lastFpsUpdate = time;

        networkManager.ping((latency) => {
            currentPing = latency;
        });
    }

    if (isLocked) {
        // Buff calculations based on slays
        const buffTier = Math.min(5, Math.floor(slays / 5));
        const speedBuffPercent = buffTier * 3.0;
        const reloadBuffPercent = buffTier * 3.0;
        const effectiveBaseSpeed = BASE_SPEED * (1 + speedBuffPercent / 100);

        // Movement Direction
        const moveDir = new THREE.Vector3();
        if (moveForward) moveDir.z -= 1;
        if (moveBackward) moveDir.z += 1;
        if (moveLeft) moveDir.x -= 1;
        if (moveRight) moveDir.x += 1;
        moveDir.normalize();
        moveDir.applyQuaternion(camera.quaternion);
        moveDir.y = 0;

        // Acceleration & Bunnyhop Momentum Preservation
        velocity.x += moveDir.x * effectiveBaseSpeed * delta * 8;
        velocity.z += moveDir.z * effectiveBaseSpeed * delta * 8;

        const friction = isJumping ? 0.96 : 0.88;
        velocity.x *= friction;
        velocity.z *= friction;

        const currentSpeed = Math.sqrt(velocity.x * velocity.x + velocity.z * velocity.z);
        if (currentSpeed > MAX_BHOP_SPEED) {
            velocity.x = (velocity.x / currentSpeed) * MAX_BHOP_SPEED;
            velocity.z = (velocity.z / currentSpeed) * MAX_BHOP_SPEED;
        }

        // Speed-based dynamic FOV
        targetFov = 75 + Math.min(25, (currentSpeed / MAX_BHOP_SPEED) * 25);
        camera.fov += (targetFov - camera.fov) * delta * 8;
        camera.updateProjectionMatrix();

        // Gravity & Jump Physics
        velocity.y -= 34 * delta;
        camera.position.x += velocity.x * delta;
        camera.position.z += velocity.z * delta;
        camera.position.y += velocity.y * delta;

        // Crouch Height Smooth Transition
        const targetEyeHeight = isCrouching ? 1.0 : 1.8;
        if (camera.position.y <= targetEyeHeight) {
            if (isJumping && window.audioManager) {
                window.audioManager.playLanding();
            }
            camera.position.y = targetEyeHeight;
            velocity.y = 0;
            isJumping = false;
        }

        // Pillar Collisions
        environmentManager.pillars.forEach((p) => {
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

        // HUD Updates
        hudManager.updateStats(currentFps, currentPing, currentSpeed, slays, speedBuffPercent, reloadBuffPercent);

        // Network Movement Sync
        networkManager.sendMove(camera.position, camera.rotation.y);
    }

    // Spear vs Demon Collision Detection
    for (let i = weaponManager.activeSpears.length - 1; i >= 0; i--) {
        const spear = weaponManager.activeSpears[i];
        let hit = false;

        demonManager.demons.forEach((d) => {
            if (hit || d.hp <= 0) return;
            const dCenter = d.mesh.position.clone().add(new THREE.Vector3(0, 1.8, 0));
            if (spear.pos.distanceTo(dCenter) < 2.5) {
                hit = true;
                d.hp -= 50;
                hudManager.triggerHitmarker();
                if (window.audioManager) window.audioManager.playHit();

                if (d.hp <= 0) {
                    slays++;
                    hudManager.showKillMessage(`Eradicated ${d.name} [+1 Slay]`);
                    if (window.audioManager) window.audioManager.playKill();
                    demonManager.triggerElectrocutionDeath(d.mesh.position);
                    scene.remove(d.mesh);

                    // Respawn Demon
                    setTimeout(() => {
                        d.hp = d.maxHp;
                        d.mesh.position.set((Math.random() - 0.5) * 90, 0, (Math.random() - 0.5) * 90);
                        scene.add(d.mesh);
                    }, 3000);
                }
            }
        });

        if (hit) {
            scene.remove(spear.mesh);
            weaponManager.activeSpears.splice(i, 1);
        }
    }

    // Update Subsystems
    particleSystem.update(delta);
    weaponManager.update(delta, time);
    demonManager.update(delta, camera.position, handlePlayerTakeDamage);
    networkManager.update(delta);

    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

window.addEventListener('DOMContentLoaded', init);
