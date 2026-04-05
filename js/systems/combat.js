window.Game = window.Game || {};

Game.Combat = {
    update(dt) {
        // Bullet vs Zombie collision
        const bullets = Game.BulletManager.pool.active;
        const zombies = Game.ZombieManager.pool.active;

        const bulletsToRelease = [];
        const zombiesToKill = [];

        for (let bi = bullets.length - 1; bi >= 0; bi--) {
            const b = bullets[bi];
            if (b.isEnemy) continue;

            for (let zi = zombies.length - 1; zi >= 0; zi--) {
                const z = zombies[zi];
                if (!z.alive) continue;

                const dx = b.x - z.x;
                const dy = b.y - z.y;
                const distSq = dx * dx + dy * dy;
                const hitRadius = z.radius + 4; // bullet radius ~4

                if (distSq < hitRadius * hitRadius) {
                    z.health -= b.damage;
                    bulletsToRelease.push(b);

                    // Hit particle
                    Game.ParticleManager.spawn(
                        b.x, b.y,
                        (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2,
                        '#f84', 3, 150
                    );

                    if (z.health <= 0 && z.alive) {
                        zombiesToKill.push(z);
                    }
                    break; // bullet hits one zombie
                }
            }
        }

        for (const b of bulletsToRelease) {
            Game.BulletManager.pool.release(b);
        }

        for (const z of zombiesToKill) {
            Game.Wave.onZombieKilled();
            Game.ZombieManager.killZombie(z);
        }
    }
};
