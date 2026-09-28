// Gothic / Synthwave Environment & Arena Manager
class EnvironmentManager {
    constructor(scene) {
        this.scene = scene;
        this.pillars = [];
        this.initLighting();
        this.initFloor();
        this.initPillars();
        this.initPerimeterWalls();
        this.initBackgroundSilhouettes();
    }

    initLighting() {
        // Dark purple atmospheric fog
        this.scene.background = new THREE.Color(0x0c0714);
        this.scene.fog = new THREE.FogExp2(0x0c0714, 0.006);

        // Ambient Light - Moody Deep Purple
        const ambientLight = new THREE.AmbientLight(0x604085, 1.5);
        this.scene.add(ambientLight);

        // Directional Key Light - Warm Pale Gold
        const dirLight = new THREE.DirectionalLight(0xffe299, 2.0);
        dirLight.position.set(40, 70, 40);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        dirLight.shadow.camera.near = 0.5;
        dirLight.shadow.camera.far = 250;
        dirLight.shadow.camera.left = -100;
        dirLight.shadow.camera.right = 100;
        dirLight.shadow.camera.top = 100;
        dirLight.shadow.camera.bottom = -100;
        dirLight.shadow.bias = -0.0005;
        this.scene.add(dirLight);

        // Central Ambient Point Light (Purple Glow)
        const centerLight = new THREE.PointLight(0x9d4edd, 3, 80);
        centerLight.position.set(0, 15, 0);
        this.scene.add(centerLight);
    }

    createTileTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');

        // Dark Purple Base Tile
        ctx.fillStyle = '#161024';
        ctx.fillRect(0, 0, 512, 512);

        // Grid Outlines
        ctx.strokeStyle = '#342352';
        ctx.lineWidth = 8;
        ctx.strokeRect(0, 0, 512, 512);

        // Inner Bevel
        ctx.fillStyle = '#1e1633';
        ctx.fillRect(12, 12, 488, 488);

        // Circuit / Energy Trace Lines
        ctx.strokeStyle = '#44316c';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(128, 128); ctx.lineTo(384, 128); ctx.lineTo(384, 384); ctx.lineTo(128, 384); ctx.closePath();
        ctx.stroke();

        // Illuminated Gold Nodes/Studs at Intersections
        ctx.fillStyle = '#ffd700';
        ctx.shadowColor = '#ffd700';
        ctx.shadowBlur = 10;
        const nodes = [[128, 128], [384, 128], [384, 384], [128, 384], [256, 256]];
        nodes.forEach(([x, y]) => {
            ctx.beginPath();
            ctx.arc(x, y, 10, 0, Math.PI * 2);
            ctx.fill();
        });

        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(40, 40);
        return texture;
    }

    initFloor() {
        const floorTexture = this.createTileTexture();
        const floorGeo = new THREE.PlaneGeometry(320, 320);
        const floorMat = new THREE.MeshStandardMaterial({
            map: floorTexture,
            roughness: 0.35,
            metalness: 0.6
        });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        this.scene.add(floor);
    }

    createPillar(x, z) {
        const group = new THREE.Group();

        // Base
        const baseGeo = new THREE.BoxGeometry(7, 2, 7);
        const stoneMat = new THREE.MeshStandardMaterial({ color: 0x1f1630, roughness: 0.4, metalness: 0.6 });
        const base = new THREE.Mesh(baseGeo, stoneMat);
        base.position.y = 1;
        base.castShadow = true;
        base.receiveShadow = true;
        group.add(base);

        // Main Cylindrical Shaft
        const shaftGeo = new THREE.CylinderGeometry(2.6, 3.2, 22, 16);
        const shaft = new THREE.Mesh(shaftGeo, stoneMat);
        shaft.position.y = 13;
        shaft.castShadow = true;
        shaft.receiveShadow = true;
        group.add(shaft);

        // Emissive Rune Rings
        const ringGeo = new THREE.TorusGeometry(3.0, 0.15, 8, 24);
        const runeMat = new THREE.MeshBasicMaterial({ color: 0x00ffcc });
        const ring1 = new THREE.Mesh(ringGeo, runeMat);
        ring1.position.y = 8;
        ring1.rotation.x = Math.PI / 2;
        group.add(ring1);

        const ring2 = new THREE.Mesh(ringGeo, runeMat);
        ring2.position.y = 17;
        ring2.rotation.x = Math.PI / 2;
        group.add(ring2);

        // Capital Top
        const topGeo = new THREE.BoxGeometry(6.5, 2, 6.5);
        const topMesh = new THREE.Mesh(topGeo, stoneMat);
        topMesh.position.y = 24;
        topMesh.castShadow = true;
        group.add(topMesh);

        // Point Light on Pillars
        const pillarLight = new THREE.PointLight(0x00ffcc, 1.2, 18);
        pillarLight.position.y = 12;
        group.add(pillarLight);

        group.position.set(x, 0, z);
        this.scene.add(group);
        this.pillars.push({ mesh: group, x, z, radius: 3.2 });
    }

    initPillars() {
        const coords = [
            [-35, -35], [35, -35], [-35, 35], [35, 35],
            [0, -50], [0, 50], [-50, 0], [50, 0]
        ];
        coords.forEach(([x, z]) => this.createPillar(x, z));
    }

    initPerimeterWalls() {
        const wallMat = new THREE.MeshStandardMaterial({ color: 0x140e24, roughness: 0.5, metalness: 0.5 });
        const borderSize = 150;
        const wallThickness = 4;
        const wallHeight = 30;

        const walls = [
            { pos: [0, wallHeight / 2, -borderSize], size: [borderSize * 2, wallHeight, wallThickness] },
            { pos: [0, wallHeight / 2, borderSize], size: [borderSize * 2, wallHeight, wallThickness] },
            { pos: [-borderSize, wallHeight / 2, 0], size: [wallThickness, wallHeight, borderSize * 2] },
            { pos: [borderSize, wallHeight / 2, 0], size: [wallThickness, wallHeight, borderSize * 2] }
        ];

        walls.forEach(w => {
            const geo = new THREE.BoxGeometry(...w.size);
            const mesh = new THREE.Mesh(geo, wallMat);
            mesh.position.set(...w.pos);
            mesh.receiveShadow = true;
            this.scene.add(mesh);
        });
    }

    initBackgroundSilhouettes() {
        // Distant Gothic Spire Silhouettes
        const spireGroup = new THREE.Group();
        const darkMat = new THREE.MeshBasicMaterial({ color: 0x07040d });

        for (let i = 0; i < 16; i++) {
            const angle = (i / 16) * Math.PI * 2;
            const dist = 180 + Math.random() * 20;
            const x = Math.cos(angle) * dist;
            const z = Math.sin(angle) * dist;

            const height = 60 + Math.random() * 40;
            const geo = new THREE.ConeGeometry(8 + Math.random() * 4, height, 5);
            const spire = new THREE.Mesh(geo, darkMat);
            spire.position.set(x, height / 2 - 10, z);
            spireGroup.add(spire);
        }
        this.scene.add(spireGroup);
    }
}

window.EnvironmentManager = EnvironmentManager;
