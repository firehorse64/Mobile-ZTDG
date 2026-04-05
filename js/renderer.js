window.Game = window.Game || {};

Game.Renderer = {
    groundCanvas: null,
    groundCtx: null,

    init() {
        this.groundCanvas = document.createElement('canvas');
        this.groundCanvas.width = Game.Config.MAP_WIDTH * Game.Config.TILE_SIZE;
        this.groundCanvas.height = Game.Config.MAP_HEIGHT * Game.Config.TILE_SIZE;
        this.groundCtx = this.groundCanvas.getContext('2d');
        this.renderGround();
    },

    renderGround() {
        const ctx = this.groundCtx;
        const ts = Game.Config.TILE_SIZE;
        const map = Game.Map;

        ctx.fillStyle = '#2a3a2a';
        ctx.fillRect(0, 0, this.groundCanvas.width, this.groundCanvas.height);

        for (let y = 0; y < map.height; y++) {
            for (let x = 0; x < map.width; x++) {
                const tile = map.getTile(x, y);
                const px = x * ts;
                const py = y * ts;

                // Grid lines
                ctx.strokeStyle = 'rgba(255,255,255,0.04)';
                ctx.lineWidth = 0.5;
                ctx.strokeRect(px, py, ts, ts);

                if (tile === Game.TileType.BASE) {
                    ctx.fillStyle = '#446';
                    ctx.fillRect(px + 1, py + 1, ts - 2, ts - 2);
                    ctx.strokeStyle = '#668';
                    ctx.lineWidth = 2;
                    ctx.strokeRect(px + 1, py + 1, ts - 2, ts - 2);
                } else if (tile === Game.TileType.SPAWN) {
                    ctx.fillStyle = '#633';
                    ctx.fillRect(px + 2, py + 2, ts - 4, ts - 4);
                    // Pulsing indicator drawn in main render
                }
            }
        }

        Game.Map.groundDirty = false;
    },

    draw(ctx) {
        const cam = Game.Camera;
        const shake = cam.getShakeOffset();
        const offX = Math.round(cam.x) + shake.x;
        const offY = Math.round(cam.y) + shake.y;

        // If ground changed, re-render
        if (Game.Map.groundDirty) {
            this.renderGround();
        }

        // Draw ground layer
        ctx.drawImage(this.groundCanvas, -offX, -offY);

        // Walls
        this.drawWalls(ctx, offX, offY);

        // Turret bases
        this.drawTurrets(ctx, offX, offY);

        // Zombies (sorted by y for depth)
        this.drawZombies(ctx, offX, offY);

        // Player
        this.drawPlayer(ctx, offX, offY);

        // Bullets
        this.drawBullets(ctx, offX, offY);

        // Turret barrels (drawn on top)
        this.drawTurretBarrels(ctx, offX, offY);

        // Particles
        this.drawParticles(ctx, offX, offY);

        // Health bars above damaged entities
        this.drawHealthBars(ctx, offX, offY);

        // Station indicator during build phase
        if (Game.Phase.current === 'build') {
            this.drawStation(ctx, offX, offY);
        }
    },

    drawWalls(ctx, offX, offY) {
        const ts = Game.Config.TILE_SIZE;
        for (const w of Game.WallManager.walls) {
            if (!Game.Camera.isVisible(w.x, w.y, ts)) continue;
            const sx = w.x - ts / 2 - offX;
            const sy = w.y - ts / 2 - offY;

            ctx.fillStyle = '#86643a';
            ctx.fillRect(sx + 2, sy + 2, ts - 4, ts - 4);
            ctx.strokeStyle = '#a88050';
            ctx.lineWidth = 2;
            ctx.strokeRect(sx + 2, sy + 2, ts - 4, ts - 4);

            // Damage cracks
            const hpPct = w.health / w.maxHealth;
            if (hpPct < 0.6) {
                ctx.strokeStyle = '#444';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(sx + 8, sy + 5);
                ctx.lineTo(sx + ts / 2, sy + ts / 2);
                ctx.lineTo(sx + ts - 8, sy + ts - 5);
                ctx.stroke();
            }
        }
    },

    drawTurrets(ctx, offX, offY) {
        const ts = Game.Config.TILE_SIZE;
        for (const t of Game.TurretManager.turrets) {
            if (!Game.Camera.isVisible(t.x, t.y, ts)) continue;
            const sx = t.x - offX;
            const sy = t.y - offY;
            const cfg = Game.Config.TURRET_TYPES[t.type];

            // Base platform
            ctx.fillStyle = '#444';
            ctx.beginPath();
            ctx.arc(sx, sy, 12, 0, Math.PI * 2);
            ctx.fill();

            // Type color ring
            ctx.strokeStyle = cfg.color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(sx, sy, 12, 0, Math.PI * 2);
            ctx.stroke();

            // Level dots
            for (let i = 0; i < t.level; i++) {
                ctx.fillStyle = '#ff0';
                ctx.beginPath();
                const dotAngle = (-Math.PI / 2) + (i - (t.level - 1) / 2) * 0.5;
                ctx.arc(sx + Math.cos(dotAngle) * 8, sy + Math.sin(dotAngle) * 8, 2, 0, Math.PI * 2);
                ctx.fill();
            }

            // Range circle (when build menu targets this turret)
            if (Game.Phase.current === 'build' && Game.Phase.buildMenu.visible &&
                Game.Phase.buildMenu.turret === t) {
                const upgr = Game.Config.UPGRADE_LEVELS[t.level];
                const range = cfg.range * upgr.range;
                ctx.strokeStyle = 'rgba(255,255,255,0.15)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.arc(sx, sy, range, 0, Math.PI * 2);
                ctx.stroke();
            }
        }
    },

    drawTurretBarrels(ctx, offX, offY) {
        for (const t of Game.TurretManager.turrets) {
            if (!Game.Camera.isVisible(t.x, t.y)) continue;
            const sx = t.x - offX;
            const sy = t.y - offY;
            const cfg = Game.Config.TURRET_TYPES[t.type];

            ctx.strokeStyle = cfg.color;
            ctx.lineWidth = t.type === 'sniper' ? 2 : 3;
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.lineTo(sx + Math.cos(t.angle) * cfg.barrelLen, sy + Math.sin(t.angle) * cfg.barrelLen);
            ctx.stroke();

            // Shotgun has wider barrel end
            if (t.type === 'shotgun') {
                ctx.lineWidth = 5;
                const endX = sx + Math.cos(t.angle) * cfg.barrelLen;
                const endY = sy + Math.sin(t.angle) * cfg.barrelLen;
                ctx.beginPath();
                ctx.moveTo(endX - Math.cos(t.angle) * 3, endY - Math.sin(t.angle) * 3);
                ctx.lineTo(endX, endY);
                ctx.stroke();
            }
        }
    },

    drawZombies(ctx, offX, offY) {
        // Sort by y for depth
        const zombies = Game.ZombieManager.pool.active.slice().sort((a, b) => a.y - b.y);

        for (const z of zombies) {
            if (!z.alive || !Game.Camera.isVisible(z.x, z.y)) continue;
            const sx = z.x - offX;
            const sy = z.y - offY;

            // Body
            ctx.fillStyle = z.color;
            ctx.beginPath();
            ctx.arc(sx, sy, z.radius, 0, Math.PI * 2);
            ctx.fill();

            // Eyes (face direction of movement)
            let faceAngle = 0;
            if (z.path && z.pathIndex < z.path.length) {
                const target = z.path[z.pathIndex];
                faceAngle = Math.atan2(target.y - z.y, target.x - z.x);
            }
            ctx.fillStyle = '#f00';
            const eyeOff = z.radius * 0.4;
            const eyeR = z.type === 'tank' ? 3 : 2;
            ctx.beginPath();
            ctx.arc(sx + Math.cos(faceAngle - 0.4) * eyeOff, sy + Math.sin(faceAngle - 0.4) * eyeOff, eyeR, 0, Math.PI * 2);
            ctx.arc(sx + Math.cos(faceAngle + 0.4) * eyeOff, sy + Math.sin(faceAngle + 0.4) * eyeOff, eyeR, 0, Math.PI * 2);
            ctx.fill();

            // Health bar for damaged zombies
            if (z.health < z.maxHealth) {
                const barW = z.radius * 2;
                const barH = 3;
                const bx = sx - barW / 2;
                const by = sy - z.radius - 6;
                ctx.fillStyle = '#300';
                ctx.fillRect(bx, by, barW, barH);
                ctx.fillStyle = '#f44';
                ctx.fillRect(bx, by, barW * (z.health / z.maxHealth), barH);
            }
        }
    },

    drawPlayer(ctx, offX, offY) {
        const p = Game.Player;
        const sx = p.x - offX;
        const sy = p.y - offY;

        if (Game.Phase.current === 'combat') {
            // Draw mounted gun station
            ctx.fillStyle = '#555';
            ctx.fillRect(sx - 16, sy - 16, 32, 32);
            ctx.strokeStyle = '#888';
            ctx.lineWidth = 2;
            ctx.strokeRect(sx - 16, sy - 16, 32, 32);

            // Player on station
            ctx.fillStyle = '#48f';
            ctx.beginPath();
            ctx.arc(sx, sy, p.radius, 0, Math.PI * 2);
            ctx.fill();

            // Gun barrel pointing at aim
            ctx.strokeStyle = '#adf';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.lineTo(sx + Math.cos(p.aimAngle) * 22, sy + Math.sin(p.aimAngle) * 22);
            ctx.stroke();
        } else {
            // Build phase - player character
            ctx.fillStyle = '#48f';
            ctx.beginPath();
            ctx.arc(sx, sy, p.radius, 0, Math.PI * 2);
            ctx.fill();

            // Direction indicator
            const joy = Game.Input.joystick;
            if (joy.dx !== 0 || joy.dy !== 0) {
                ctx.strokeStyle = '#8bf';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(sx, sy);
                ctx.lineTo(sx + joy.dx * 16, sy + joy.dy * 16);
                ctx.stroke();
            }

            // Outline
            ctx.strokeStyle = '#adf';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(sx, sy, p.radius, 0, Math.PI * 2);
            ctx.stroke();
        }
    },

    drawBullets(ctx, offX, offY) {
        ctx.fillStyle = '#ff8';
        Game.BulletManager.pool.forEach((b) => {
            if (!Game.Camera.isVisible(b.x, b.y)) return;
            const sx = b.x - offX;
            const sy = b.y - offY;
            ctx.beginPath();
            ctx.arc(sx, sy, 3, 0, Math.PI * 2);
            ctx.fill();
        });
    },

    drawParticles(ctx, offX, offY) {
        Game.ParticleManager.pool.forEach((p) => {
            if (!Game.Camera.isVisible(p.x, p.y)) return;
            const sx = p.x - offX;
            const sy = p.y - offY;
            const alpha = Math.max(0, p.life / p.maxLife);
            ctx.globalAlpha = alpha;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(sx, sy, p.size * alpha, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.globalAlpha = 1;
    },

    drawHealthBars(ctx, offX, offY) {
        // Wall health bars
        for (const w of Game.WallManager.walls) {
            if (w.health >= w.maxHealth || !Game.Camera.isVisible(w.x, w.y)) continue;
            const sx = w.x - offX;
            const sy = w.y - offY;
            const ts = Game.Config.TILE_SIZE;
            const barW = ts - 8;
            ctx.fillStyle = '#300';
            ctx.fillRect(sx - barW / 2, sy - ts / 2 - 5, barW, 3);
            ctx.fillStyle = '#fa4';
            ctx.fillRect(sx - barW / 2, sy - ts / 2 - 5, barW * (w.health / w.maxHealth), 3);
        }

        // Turret health bars
        for (const t of Game.TurretManager.turrets) {
            if (t.health >= t.maxHealth || !Game.Camera.isVisible(t.x, t.y)) continue;
            const sx = t.x - offX;
            const sy = t.y - offY;
            const barW = 20;
            ctx.fillStyle = '#300';
            ctx.fillRect(sx - barW / 2, sy - 18, barW, 3);
            ctx.fillStyle = '#4af';
            ctx.fillRect(sx - barW / 2, sy - 18, barW * (t.health / t.maxHealth), 3);
        }
    },

    drawStation(ctx, offX, offY) {
        const sp = Game.Map.stationPos;
        const sx = sp.x - offX;
        const sy = sp.y - offY;

        // Pulsing indicator
        const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 300);
        ctx.strokeStyle = `rgba(100, 150, 255, ${0.3 + pulse * 0.3})`;
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(sx - 18, sy - 18, 36, 36);
        ctx.setLineDash([]);

        ctx.fillStyle = `rgba(100, 150, 255, ${0.1 + pulse * 0.1})`;
        ctx.fillRect(sx - 18, sy - 18, 36, 36);

        ctx.fillStyle = '#89b';
        ctx.font = '9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('GUN', sx, sy + 3);
    }
};
