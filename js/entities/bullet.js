window.Game = window.Game || {};

Game.BulletManager = {
    pool: null,

    init() {
        this.pool = new Game.ObjectPool(
            () => ({ x: 0, y: 0, vx: 0, vy: 0, damage: 0, life: 0, isEnemy: false }),
            (b) => { b.x = 0; b.y = 0; b.vx = 0; b.vy = 0; b.damage = 0; b.life = 0; b.isEnemy = false; },
            120
        );
    },

    spawn(x, y, vx, vy, damage, isEnemy) {
        const b = this.pool.acquire();
        b.x = x;
        b.y = y;
        b.vx = vx;
        b.vy = vy;
        b.damage = damage;
        b.life = 2000; // ms
        b.isEnemy = isEnemy || false;
        return b;
    },

    update(dt) {
        const toRelease = [];
        this.pool.forEach((b) => {
            b.x += b.vx;
            b.y += b.vy;
            b.life -= dt;

            // Off-map check
            const mapW = Game.Config.MAP_WIDTH * Game.Config.TILE_SIZE;
            const mapH = Game.Config.MAP_HEIGHT * Game.Config.TILE_SIZE;
            if (b.life <= 0 || b.x < 0 || b.x > mapW || b.y < 0 || b.y > mapH) {
                toRelease.push(b);
            }
        });
        for (const b of toRelease) {
            this.pool.release(b);
        }
    },

    clear() {
        if (this.pool) this.pool.clear();
    }
};
