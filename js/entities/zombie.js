window.Game = window.Game || {};

Game.ZombieManager = {
    pool: null,

    init() {
        this.pool = new Game.ObjectPool(
            () => ({
                x: 0, y: 0, type: 'walker', health: 0, maxHealth: 0,
                speed: 0, damage: 0, reward: 0, radius: 0, color: '#5a5',
                pathIndex: 0, path: null, attackCooldown: 0, attackRate: 0,
                alive: false
            }),
            (z) => {
                z.x = 0; z.y = 0; z.health = 0; z.alive = false;
                z.pathIndex = 0; z.path = null; z.attackCooldown = 0;
            },
            80
        );
    },

    spawn(type, spawnIndex) {
        const cfg = Game.Config.ZOMBIE_TYPES[type];
        const sp = Game.Map.spawnPoints[spawnIndex];
        const path = Game.Map.getPathForSpawn(spawnIndex);
        if (!path || path.length === 0) return null;

        const z = this.pool.acquire();
        z.type = type;
        z.health = cfg.health;
        z.maxHealth = cfg.health;
        z.speed = cfg.speed;
        z.damage = cfg.damage;
        z.reward = cfg.reward;
        z.radius = cfg.radius;
        z.color = cfg.color;
        z.attackRate = cfg.attackRate;
        z.attackCooldown = 0;
        z.path = path;
        z.pathIndex = 0;
        z.x = path[0].x;
        z.y = path[0].y;
        z.alive = true;
        return z;
    },

    update(dt) {
        const toRelease = [];
        this.pool.forEach((z) => {
            if (!z.alive) { toRelease.push(z); return; }

            // Follow path
            if (z.path && z.pathIndex < z.path.length) {
                const target = z.path[z.pathIndex];
                const dx = target.x - z.x;
                const dy = target.y - z.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < 4) {
                    z.pathIndex++;
                } else {
                    const moveSpeed = z.speed * (dt / 33.33);
                    z.x += (dx / dist) * moveSpeed;
                    z.y += (dy / dist) * moveSpeed;
                }
            }

            // Check if reached base
            if (z.pathIndex >= z.path.length) {
                // Attack base
                z.attackCooldown -= dt;
                if (z.attackCooldown <= 0) {
                    Game.BaseHealth.takeDamage(z.damage);
                    z.attackCooldown = z.attackRate;
                    Game.Camera.addShake(3);
                    Game.ParticleManager.burst(z.x, z.y, '#f44', 3, 2, 3, 200);
                }

                // Move toward base center slowly
                const dx = Game.Map.baseCenter.x - z.x;
                const dy = Game.Map.baseCenter.y - z.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > 8) {
                    z.x += (dx / dist) * z.speed * 0.3;
                    z.y += (dy / dist) * z.speed * 0.3;
                }
            }

            // Check if hitting a wall in path
            const ts = Game.Config.TILE_SIZE;
            const tileX = Math.floor(z.x / ts);
            const tileY = Math.floor(z.y / ts);

            // Look ahead at next path point for wall collision
            if (z.path && z.pathIndex < z.path.length) {
                const nextTile = Game.Map.worldToTile(z.path[z.pathIndex].x, z.path[z.pathIndex].y);
                const nextType = Game.Map.getTile(nextTile.x, nextTile.y);
                if (nextType === Game.TileType.WALL || nextType === Game.TileType.TURRET) {
                    // Attack the structure
                    z.attackCooldown -= dt;
                    if (z.attackCooldown <= 0) {
                        Game.WallManager.damageAt(nextTile.x, nextTile.y, z.damage);
                        Game.TurretManager.damageAt(nextTile.x, nextTile.y, z.damage);
                        z.attackCooldown = z.attackRate;
                    }
                }
            }
        });
        for (const z of toRelease) {
            this.pool.release(z);
        }
    },

    killZombie(z) {
        z.alive = false;
        Game.Economy.addCurrency(z.reward);
        Game.ParticleManager.burst(z.x, z.y, '#4a2', 8, 3, 4, 400);
    },

    clear() {
        if (this.pool) this.pool.clear();
    }
};
