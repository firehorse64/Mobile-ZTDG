window.Game = window.Game || {};

Game.TurretManager = {
    turrets: [],

    init() {
        this.turrets = [];
    },

    place(tileX, tileY, type) {
        const cfg = Game.Config.TURRET_TYPES[type];
        if (!Game.Map.canPlace(tileX, tileY)) return false;
        if (!Game.Economy.spend(cfg.cost)) return false;

        Game.Map.setTile(tileX, tileY, Game.TileType.TURRET);
        const pos = Game.Map.tileToWorld(tileX, tileY);
        this.turrets.push({
            tileX: tileX,
            tileY: tileY,
            x: pos.x,
            y: pos.y,
            type: type,
            level: 0,
            cooldown: 0,
            angle: 0,
            health: 200,
            maxHealth: 200
        });
        return true;
    },

    upgrade(turret) {
        const nextLevel = turret.level + 1;
        if (nextLevel >= Game.Config.UPGRADE_LEVELS.length) return false;
        const cost = Game.Config.UPGRADE_LEVELS[nextLevel].cost;
        if (!Game.Economy.spend(cost)) return false;
        turret.level = nextLevel;
        return true;
    },

    getAt(tileX, tileY) {
        return this.turrets.find(t => t.tileX === tileX && t.tileY === tileY) || null;
    },

    damageAt(tileX, tileY, damage) {
        const t = this.getAt(tileX, tileY);
        if (!t) return;
        t.health -= damage;
        if (t.health <= 0) {
            this.remove(t);
            Game.ParticleManager.burst(t.x, t.y, '#88f', 6, 3, 3, 300);
        }
    },

    remove(turret) {
        const idx = this.turrets.indexOf(turret);
        if (idx !== -1) {
            this.turrets.splice(idx, 1);
            Game.Map.setTile(turret.tileX, turret.tileY, Game.TileType.EMPTY);
        }
    },

    update(dt) {
        const zombies = Game.ZombieManager.pool.active;

        for (const t of this.turrets) {
            t.cooldown -= dt;
            if (t.cooldown > 0) continue;

            const cfg = Game.Config.TURRET_TYPES[t.type];
            const upgr = Game.Config.UPGRADE_LEVELS[t.level];
            const range = cfg.range * upgr.range;

            // Find target
            let bestTarget = null;
            let bestDist = Infinity;

            for (const z of zombies) {
                if (!z.alive) continue;
                const dx = z.x - t.x;
                const dy = z.y - t.y;
                const distSq = dx * dx + dy * dy;
                if (distSq > range * range) continue;

                if (t.type === 'sniper') {
                    // Sniper targets highest health
                    if (!bestTarget || z.health > bestTarget.health) {
                        bestTarget = z;
                        bestDist = distSq;
                    }
                } else {
                    // Others target closest to base (furthest along path)
                    if (!bestTarget || z.pathIndex > bestTarget.pathIndex || distSq < bestDist) {
                        bestTarget = z;
                        bestDist = distSq;
                    }
                }
            }

            if (bestTarget) {
                const dx = bestTarget.x - t.x;
                const dy = bestTarget.y - t.y;
                t.angle = Math.atan2(dy, dx);

                // Fire
                const damage = cfg.damage * upgr.damage;
                const speed = cfg.bulletSpeed;

                for (let i = 0; i < cfg.bulletCount; i++) {
                    const spreadAngle = t.angle + (Math.random() - 0.5) * cfg.spread;
                    const cos = Math.cos(spreadAngle);
                    const sin = Math.sin(spreadAngle);
                    Game.BulletManager.spawn(
                        t.x + cos * cfg.barrelLen,
                        t.y + sin * cfg.barrelLen,
                        cos * speed,
                        sin * speed,
                        damage,
                        false
                    );
                }

                t.cooldown = cfg.fireRate * upgr.fireRate;

                // Muzzle flash
                Game.ParticleManager.spawn(
                    t.x + Math.cos(t.angle) * cfg.barrelLen,
                    t.y + Math.sin(t.angle) * cfg.barrelLen,
                    0, 0, '#ff8', 3, 80
                );
            }
        }
    },

    clear() {
        this.turrets = [];
    }
};
