// Demon AI Models, Animations, Projectiles & Death Sequence Manager
class DemonManager {
    constructor(scene, particleSystem) {
        this.scene = scene;
        this.particleSystem = particleSystem;
        this.demons = [];
        this.flameSwords = [];
        this.electrocutions = [];

        this.spawnDemons();
    }

    createHumanoidDemonMesh(color, isSurtur = false, isShadow = false) {
        const group = new THREE.Group();
        const mat = new THREE.MeshStandardMaterial({
            color: color,
            roughness: 0.3,
            metalness: 0.7,
            emissive: isShadow ? 0x220044 : (isSurtur ? 0x440000 : 0x220000),
            transparent: true,
            opacity: 1.0
        });

        // Torso
        const torsoGeo = isShadow ? new THREE.BoxGeometry(0.9, 1.7, 0.6) : new THREE.BoxGeometry(1.3, 1.9, 0.9);
        const torso = new THREE.Mesh(torsoGeo, mat);
        torso.position.y = 1.8;
        torso.castShadow = true;
        group.add(torso);

        // Head
        const headGeo = new THREE.SphereGeometry(isShadow ? 0.4 : 0.55, 12, 12);
        const head = new THREE.Mesh(headGeo, mat);
        head.position.y = 3.2;
        head.castShadow = true;
        group.add(head);

        // Glowing Horns
        const hornMat = new THREE.MeshBasicMaterial({ color: isShadow ? 0x9d4edd : 0xff2200 });
        const leftHorn = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.7, 5), hornMat);
        leftHorn.position.set(-0.35, 3.7, 0);
        leftHorn.rotation.z = -0.35;
        group.add(leftHorn);

        const rightHorn = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.7, 5), hornMat);
        rightHorn.position.set(0.35, 3.7, 0);
        rightHorn.rotation.z = 0.35;
        group.add(rightHorn);

        // Leg Groups
        const leftLegGroup = new THREE.Group();
        leftLegGroup.position.set(-0.38, 1.6, 0);
        const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.45, 1.6, 0.45), mat);
        leftLeg.position.y = -0.8;
        leftLegGroup.add(leftLeg);
        group.add(leftLegGroup);

        const rightLegGroup = new THREE.Group();
        rightLegGroup.position.set(0.38, 1.6, 0);
        const rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.45, 1.6, 0.45), mat);
        rightLeg.position.y = -0.8;
        rightLegGroup.add(rightLeg);
        group.add(rightLegGroup);

        group.userData = { leftLegGroup, rightLegGroup, mat };
        return group;
    }

    spawnDemons() {
        const types = [
            { name: 'Infernal Surtur', color: 0xb30000, hp: 100, isSurtur: true, isShadow: false, speed: 8 },
            { name: 'Shadow Stalker', color: 0x4a0080, hp: 80, isSurtur: false, isShadow: true, speed: 12 },
            { name: 'Fire Surtur', color: 0xff3300, hp: 100, isSurtur: true, isShadow: false, speed: 9 }
        ];

        types.forEach((t, i) => {
            const mesh = this.createHumanoidDemonMesh(t.color, t.isSurtur, t.isShadow);
            const spawnAngle = (i / types.length) * Math.PI * 2;
            const x = Math.cos(spawnAngle) * 45;
            const z = Math.sin(spawnAngle) * 45;
            mesh.position.set(x, 0, z);
            this.scene.add(mesh);

            this.demons.push({
                name: t.name,
                mesh: mesh,
                hp: t.hp,
                maxHp: t.hp,
                isSurtur: t.isSurtur,
                isShadow: t.isShadow,
                lastAttackTime: 0,
                speed: t.speed,
                walkCycle: Math.random() * 10
            });
        });
    }

    fireSurturFlameSword(fromPos, targetPos) {
        const group = new THREE.Group();
        const bladeMat = new THREE.MeshBasicMaterial({ color: 0xff4400 });
        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.35, 3.8, 0.12), bladeMat);
        group.add(blade);

        const glow = new THREE.Mesh(new THREE.BoxGeometry(0.5, 4.0, 0.2), new THREE.MeshBasicMaterial({ color: 0xffbb00, transparent: true, opacity: 0.6 }));
        group.add(glow);

        group.position.copy(fromPos).add(new THREE.Vector3(0, 2, 0));
        const dir = new THREE.Vector3().subVectors(targetPos, group.position).normalize();

        this.scene.add(group);
        this.flameSwords.push({ mesh: group, dir, speed: 28, createdAt: Date.now() });
    }

    triggerElectrocutionDeath(position) {
        if (this.particleSystem) {
            this.particleSystem.spawnBurst(position, 28, 0x00ffcc, 12, 0.6);
            this.particleSystem.spawnBurst(position, 20, 0xffff00, 10, 0.5);
        }

        const group = new THREE.Group();
        group.position.copy(position);

        for (let i = 0; i < 10; i++) {
            const arc = new THREE.Mesh(
                new THREE.BoxGeometry(0.12, 1.4, 0.12),
                new THREE.MeshBasicMaterial({ color: i % 2 === 0 ? 0x00ffcc : 0xffff00 })
            );
            arc.position.set((Math.random() - 0.5) * 2, Math.random() * 2.2, (Math.random() - 0.5) * 2);
            arc.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
            group.add(arc);
        }

        this.scene.add(group);
        this.electrocutions.push({ mesh: group, createdAt: Date.now(), lifetime: 450 });
    }

    update(delta, playerPos, onPlayerHit) {
        // Electrocution Animations
        for (let i = this.electrocutions.length - 1; i >= 0; i--) {
            const fx = this.electrocutions[i];
            if (Date.now() - fx.createdAt > fx.lifetime) {
                this.scene.remove(fx.mesh);
                this.electrocutions.splice(i, 1);
            }
        }

        // Demon AI & Movement
        this.demons.forEach(d => {
            if (d.hp <= 0) return;
            const demonPos = d.mesh.position;
            const targetPos = playerPos.clone();
            targetPos.y = 0;

            const dirToPlayer = new THREE.Vector3().subVectors(targetPos, demonPos).normalize();
            demonPos.addScaledVector(dirToPlayer, d.speed * delta);
            d.mesh.lookAt(targetPos.x, demonPos.y, targetPos.z);

            // Walking Animation
            d.walkCycle += delta * d.speed * 1.6;
            const legAngle = Math.sin(d.walkCycle) * 0.65;
            d.mesh.userData.leftLegGroup.rotation.x = legAngle;
            d.mesh.userData.rightLegGroup.rotation.x = -legAngle;

            // Ranged Attack Telegraph
            if (d.isSurtur && Date.now() - d.lastAttackTime > 3200) {
                if (demonPos.distanceTo(targetPos) < 45) {
                    d.lastAttackTime = Date.now();
                    this.fireSurturFlameSword(demonPos, playerPos);
                }
            }
        });

        // Flame Sword Updates & Collision
        for (let i = this.flameSwords.length - 1; i >= 0; i--) {
            const sword = this.flameSwords[i];
            sword.mesh.position.addScaledVector(sword.dir, sword.speed * delta);
            sword.mesh.rotation.z += delta * 14;

            if (this.particleSystem) {
                this.particleSystem.spawnTrail(sword.mesh.position, 0xff4400, 0.12);
            }

            if (sword.mesh.position.distanceTo(playerPos) < 1.8) {
                onPlayerHit(40);
                this.scene.remove(sword.mesh);
                this.flameSwords.splice(i, 1);
                continue;
            }

            if (Date.now() - sword.createdAt > 3500) {
                this.scene.remove(sword.mesh);
                this.flameSwords.splice(i, 1);
            }
        }
    }
}

window.DemonManager = DemonManager;
