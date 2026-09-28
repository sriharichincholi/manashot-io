// Modern HUD Overlay & Glassmorphic UI Manager
class HUDManager {
    constructor() {
        this.fpsVal = document.getElementById('fps-val');
        this.pingVal = document.getElementById('ping-val');
        this.speedVal = document.getElementById('speed-val');
        this.slaysVal = document.getElementById('slays-val');
        this.reloadBuffVal = document.getElementById('reload-buff-val');
        this.speedBuffVal = document.getElementById('speed-buff-val');
        this.healthFill = document.getElementById('health-bar-fill');
        this.healthText = document.getElementById('health-text');
        this.reloadBarContainer = document.getElementById('reload-bar-container');
        this.reloadBarFill = document.getElementById('reload-bar-fill');
        this.killFeed = document.getElementById('kill-feed');
        this.hitmarker = document.getElementById('hitmarker');
        this.damageVignette = document.getElementById('damage-vignette');
        this.blocker = document.getElementById('blocker');
    }

    updateStats(fps, ping, speed, slays, speedBuff, reloadBuff) {
        if (this.fpsVal) this.fpsVal.textContent = fps;
        if (this.pingVal) this.pingVal.textContent = `${ping} ms`;
        if (this.speedVal) this.speedVal.textContent = `${speed.toFixed(1)} m/s`;
        if (this.slaysVal) this.slaysVal.textContent = slays;
        if (this.speedBuffVal) this.speedBuffVal.textContent = `${speedBuff}%`;
        if (this.reloadBuffVal) this.reloadBuffVal.textContent = `${reloadBuff}%`;
    }

    updateHealth(hp, maxHp = 100) {
        const pct = Math.max(0, Math.min(100, (hp / maxHp) * 100));
        if (this.healthFill) this.healthFill.style.width = `${pct}%`;
        if (this.healthText) this.healthText.textContent = `HP: ${Math.max(0, Math.ceil(hp))} / ${maxHp}`;
    }

    triggerDamageFlash() {
        if (!this.damageVignette) return;
        this.damageVignette.classList.add('active');
        setTimeout(() => this.damageVignette.classList.remove('active'), 200);
    }

    triggerHitmarker() {
        if (!this.hitmarker) return;
        this.hitmarker.classList.add('active');
        setTimeout(() => this.hitmarker.classList.remove('active'), 120);
    }

    startReloadBar(duration) {
        if (!this.reloadBarContainer || !this.reloadBarFill) return;
        this.reloadBarContainer.style.opacity = '1';
        this.reloadBarFill.style.width = '0%';
        const startTime = Date.now();

        const interval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(100, (elapsed / duration) * 100);
            this.reloadBarFill.style.width = `${progress}%`;

            if (progress >= 100) {
                clearInterval(interval);
                this.reloadBarContainer.style.opacity = '0';
            }
        }, 16);
    }

    showKillMessage(msg) {
        if (!this.killFeed) return;
        const el = document.createElement('div');
        el.className = 'kill-msg';
        el.textContent = msg;
        this.killFeed.appendChild(el);
        setTimeout(() => {
            el.style.opacity = '0';
            el.style.transform = 'translateX(20px)';
            el.style.transition = 'all 0.2s ease-out';
            setTimeout(() => el.remove(), 200);
        }, 3000);
    }
}

window.HUDManager = HUDManager;
