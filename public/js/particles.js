// High-performance pooled particle system
class ParticleSystem {
    constructor(scene) {
        this.scene = scene;
        this.particles = [];
        this.pool = [];
        this.maxPoolSize = 300;

        // Shared Geometry
        this.geometry = new THREE.BoxGeometry(0.12, 0.12, 0.12);
    }

    getParticle(color, opacity = 1.0) {
        let p;
        if (this.pool.length > 0) {
            p = this.pool.pop();
            p.mesh.material.color.setHex(color);
            p.mesh.material.opacity = opacity;
            p.mesh.visible = true;
        } else {
            const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity });
            const mesh = new THREE.Mesh(this.geometry, mat);
            p = { mesh, vel: new THREE.Vector3(), life: 0, maxLife: 1 };
        }
        return p;
    }

    recycle(p) {
        p.mesh.visible = false;
        this.scene.remove(p.mesh);
        if (this.pool.length < this.maxPoolSize) {
            this.pool.push(p);
        }
    }

    spawnBurst(pos, count = 12, color = 0x00ffcc, speed = 8, lifetime = 0.4) {
        for (let i = 0; i < count; i++) {
            const p = this.getParticle(color, 1.0);
            p.mesh.position.copy(pos);
            p.vel.set(
                (Math.random() - 0.5) * speed,
                (Math.random() - 0.2) * speed,
                (Math.random() - 0.5) * speed
            );
            p.life = 0;
            p.maxLife = lifetime * (0.8 + Math.random() * 0.4);
            p.mesh.scale.setScalar(0.8 + Math.random() * 0.8);

            this.scene.add(p.mesh);
            this.particles.push(p);
        }
    }

    spawnTrail(pos, color = 0x00ffcc, lifetime = 0.2) {
        const p = this.getParticle(color, 0.8);
        p.mesh.position.copy(pos);
        p.vel.set(0, 0, 0);
        p.life = 0;
        p.maxLife = lifetime;
        p.mesh.scale.setScalar(1.2);

        this.scene.add(p.mesh);
        this.particles.push(p);
    }

    update(delta) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.life += delta;
            if (p.life >= p.maxLife) {
                this.recycle(p);
                this.particles.splice(i, 1);
                continue;
            }

            p.mesh.position.addScaledVector(p.vel, delta);
            const progress = p.life / p.maxLife;
            p.mesh.material.opacity = 1 - progress;
            const scale = (1 - progress * 0.5);
            p.mesh.scale.set(scale, scale, scale);
        }
    }
}

window.ParticleSystem = ParticleSystem;
