// Socket.io Network & Remote Player Synchronization Manager
class NetworkManager {
    constructor(scene, onRemoteMove, onRemoteShoot) {
        this.scene = scene;
        this.onRemoteMove = onRemoteMove;
        this.onRemoteShoot = onRemoteShoot;
        this.remotePlayers = {};

        // Dynamic Socket Server Endpoint (production render URL fallback to current host)
        const socketUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
            ? 'http://localhost:3000'
            : (window.location.origin.includes('onrender.com') ? window.location.origin : 'https://manashot-backend.onrender.com');

        this.socket = io(socketUrl, {
            transports: ['websocket', 'polling'],
            reconnectionAttempts: 5
        });

        this.initSocketEvents();
    }

    createRemotePlayerMesh() {
        const group = new THREE.Group();

        // Sleek Player Silhouette
        const mat = new THREE.MeshStandardMaterial({ color: 0x00ffcc, roughness: 0.3, metalness: 0.8, emissive: 0x004433 });
        const torso = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.8, 0.6), mat);
        torso.position.y = 1.6;
        group.add(torso);

        const head = new THREE.Mesh(new THREE.SphereGeometry(0.4, 12, 12), mat);
        head.position.y = 2.8;
        group.add(head);

        // Cyan Core Light Ring
        const light = new THREE.PointLight(0x00ffcc, 1.5, 10);
        light.position.y = 2.0;
        group.add(light);

        return group;
    }

    initSocketEvents() {
        this.socket.on('connect', () => {
            console.log('Connected to ManaShot Socket Server:', this.socket.id);
            const dot = document.querySelector('.status-dot');
            const txt = document.getElementById('status-text');
            if (dot) dot.style.background = '#00ffcc';
            if (txt) txt.textContent = 'SERVER ONLINE';
        });

        this.socket.on('disconnect', () => {
            const dot = document.querySelector('.status-dot');
            const txt = document.getElementById('status-text');
            if (dot) dot.style.background = '#ff3366';
            if (txt) txt.textContent = 'DISCONNECTED';
        });

        this.socket.on('state_update', (players) => {
            Object.keys(players).forEach(id => {
                if (id !== this.socket.id && !this.remotePlayers[id]) {
                    const mesh = this.createRemotePlayerMesh();
                    mesh.position.set(players[id].x, players[id].y, players[id].z);
                    this.scene.add(mesh);
                    this.remotePlayers[id] = { mesh, targetPos: mesh.position.clone(), targetRot: 0 };
                }
            });
        });

        this.socket.on('player_moved', (data) => {
            if (this.remotePlayers[data.id]) {
                const rp = this.remotePlayers[data.id];
                rp.targetPos.set(data.x, data.y, data.z);
                rp.targetRot = data.rotationY || data.rotation || 0;
            } else {
                const mesh = this.createRemotePlayerMesh();
                mesh.position.set(data.x, data.y, data.z);
                this.scene.add(mesh);
                this.remotePlayers[data.id] = { mesh, targetPos: mesh.position.clone(), targetRot: data.rotationY || 0 };
            }
        });

        this.socket.on('spell_fired', (data) => {
            if (data.shooterId !== this.socket.id && this.onRemoteShoot) {
                this.onRemoteShoot(data);
            }
        });

        this.socket.on('player_left', (id) => {
            if (this.remotePlayers[id]) {
                this.scene.remove(this.remotePlayers[id].mesh);
                delete this.remotePlayers[id];
            }
        });
    }

    sendMove(pos, rotationY) {
        this.socket.emit('player_move', {
            x: pos.x,
            y: pos.y,
            z: pos.z,
            rotationY: rotationY
        });
    }

    sendShoot(origin, direction) {
        this.socket.emit('shoot_spell', { origin, direction, type: 'lightning' });
    }

    ping(cb) {
        const start = Date.now();
        this.socket.emit('ping_check', start, () => {
            cb(Date.now() - start);
        });
    }

    update(delta) {
        // Smooth Interpolation for Remote Players
        Object.keys(this.remotePlayers).forEach(id => {
            const rp = this.remotePlayers[id];
            rp.mesh.position.lerp(rp.targetPos, delta * 12);
            rp.mesh.rotation.y += (rp.targetRot - rp.mesh.rotation.y) * delta * 12;
        });
    }
}

window.NetworkManager = NetworkManager;
