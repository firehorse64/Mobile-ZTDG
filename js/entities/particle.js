window.Game = window.Game || {};

Game.ParticleManager = {
    pool: null,

    init() {
        this.pool = new Game.ObjectPool(
            () => ({ x: 0, y: 0, vx: 0, vy: 0, color: '#fff', size: 2, life: 0, maxLife: 0 }),
            (p) => { p.x = 0; p.y = 0; p.vx = 0; p.vy = 0; p.life = 0; },
            250
        );
    },

    spawn(x, y, vx, vy, color, size, life) {
        const p = this.pool.acquire();
        p.x = x;
        p.y = y;
        p.vx = vx;
        p.vy = vy;
        p.color = color;
        p.size = size;
        p.life = life;
        p.maxLife = life;
        return p;
    },

    burst(x, y, color, count, speed, size, life) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const spd = Math.random() * speed;
            this.spawn(x, y, Math.cos(angle) * spd, Math.sin(angle) * spd, color, size, life + Math.random() * 100);
        }
    },

    update(dt) {
        const toRelease = [];
        this.pool.forEach((p) => {
            p.x += p.vx;
            p.y += p.vy;
            p.vx *= 0.95;
            p.vy *= 0.95;
            p.life -= dt;
            if (p.life <= 0) {
                toRelease.push(p);
            }
        });
        for (const p of toRelease) {
            this.pool.release(p);
        }
    },

    clear() {
        if (this.pool) this.pool.clear();
    }
};
