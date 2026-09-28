// First-Person Held Lightning Bolt Weapon & Projectile System
class WeaponManager {
    constructor(scene, camera, particleSystem) {
        this.scene = scene;
        this.camera = camera;
        this.particleSystem = particleSystem;
        this.fpGroup = new THREE.Group();
        this.activeSpears = [];
        this.lastShotTime = 0;
        this.baseReloadTime = 800;

        this.initFirstPersonModel();
    }

    createLightningGeometry() {
        const shape = new THREE.Shape();
        shape.moveTo(0, 0);
        shape.lineTo(0.35, 1.4);
        shape.lineTo(-0.25, 1.5);
        shape.lineTo(0.45, 3.2);
        shape.lineTo(-0.35, 3.3);
        shape.lineTo(0.6, 5.0);
        shape.lineTo(0.15, 5.0);
        shape.lineTo(-0.7, 3.0);
        shape.lineTo(-0.15, 2.9);
        shape.lineTo(-0.7, 1.2);
        shape.lineTo(-0.25, 1.1);
        shape.lineTo(-0.45, 0);
        shape.closePath();

        const extrudeSettings = {
            depth: 0.18,
            bevelEnabled: true,
            bevelSegments: 3,
            steps: 1,
            bevelSize: 0.05,
            bevelThickness: 0.05
        };
        return new THREE.ExtrudeGeometry(shape, extrudeSettings);
    }

    initFirstPersonModel() {
        this.boltGeo = this.createLightningGeometry();

        // Core Emissive Cyan/Gold Material
        this.coreMat = new THREE.MeshBasicMaterial({ color: 0x00ffcc });
        this.coreMesh = new THREE.Mesh(this.boltGeo, this.coreMat);
        this.coreMesh.scale.set(0.24, 0.24, 0.24);
        this.coreMesh.rotation.x = Math.PI / 2;
        this.coreMesh.rotation.y = -Math.PI / 8;
        this.fpGroup.add(this.coreMesh);

        // Secondary Outer Glow Mesh
        this.glowMat = new THREE.MeshBasicMaterial({ color: 0xffd700, transparent: true, opacity: 0.6 });
        this.glowMesh = new THREE.Mesh(this.boltGeo, this.glowMat);
        this.glowMesh.scale.set(0.28, 0.28, 0.28);
        this.glowMesh.rotation.x = Math.PI / 2;
        this.glowMesh.rotation.y = -Math.PI / 8;
        this.fpGroup.add(this.glowMesh);

        // Dynamic Point Light attached to Weapon Tip
        this.weaponLight = new THREE.PointLight(0x00ffcc, 2.5, 8);
        this.weaponLight.position.set(0, 0, -1.2);
        this.fpGroup.add(this.weaponLight);

        // Set position relative to camera
        this.fpGroup.position.set(0.38, -0.32, -0.65);
        this.camera.add(this.fpGroup);
    }

    shoot(slays = 0) {
        const now = Date.now();
        const buffTier = Math.min(5, Math.floor(slays / 5));
        const currentReloadTime = this.baseReloadTime * (1 - buffTier * 0.03);

        if (now - this.lastShotTime < currentReloadTime) return false;

        this.lastShotTime = now;

        // Firing Recoil Animation
        this.fpGroup.position.z = -0.45;
        this.fpGroup.position.y = -0.22;
        this.fpGroup.rotation.x = -0.25;

        // Fire Projectile
        this.fireProjectile();

        // Trigger Sound
        if (window.audioManager) window.audioManager.playShoot();

        return currentReloadTime;
    }

    fireProjectile() {
        const dir = new THREE.Vector3();
        this.camera.getWorldDirection(dir);

        const group = new THREE.Group();
        const mesh = new THREE.Mesh(this.boltGeo, new THREE.MeshBasicMaterial({ color: 0x00ffcc }));
        mesh.scale.set(0.3, 0.3, 0.3);
        group.add(mesh);

        const glow = new THREE.Mesh(this.boltGeo, new THREE.MeshBasicMaterial({ color: 0xffff00, transparent: true, opacity: 0.7 }));
        glow.scale.set(0.36, 0.36, 0.36);
        group.add(glow);

        const light = new THREE.PointLight(0x00ffcc, 3, 12);
        group.add(light);

        const startPos = this.camera.position.clone().addScaledVector(dir, 1.2);
        group.position.copy(startPos);
        group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);

        this.scene.add(group);
        this.activeSpears.push({
            mesh: group,
            pos: startPos,
            dir: dir.clone(),
            speed: 130,
            distance: 0,
            maxDistance: 220
        });
    }

    update(delta, time) {
        // Idle Weapon Breathing Animation
        const restZ = -0.65;
        const restY = -0.32;
        this.fpGroup.position.z += (restZ - this.fpGroup.position.z) * delta * 12;
        this.fpGroup.position.y += (restY + Math.sin(time * 0.003) * 0.015 - this.fpGroup.position.y) * delta * 12;
        this.fpGroup.rotation.x += (0 - this.fpGroup.rotation.x) * delta * 12;

        // Update Active Projectiles
        for (let i = this.activeSpears.length - 1; i >= 0; i--) {
            const spear = this.activeSpears[i];
            const step = spear.speed * delta;
            spear.pos.addScaledVector(spear.dir, step);
            spear.mesh.position.copy(spear.pos);
            spear.distance += step;

            // Spawn Energy Trail Particle
            if (this.particleSystem) {
                this.particleSystem.spawnTrail(spear.pos, 0x00ffcc, 0.15);
            }

            if (spear.distance >= spear.maxDistance) {
                this.scene.remove(spear.mesh);
                this.activeSpears.splice(i, 1);
            }
        }
    }
}

window.WeaponManager = WeaponManager;
