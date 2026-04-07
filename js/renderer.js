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
        var ctx = this.groundCtx;
        var ts = Game.Config.TILE_SIZE;
        var map = Game.Map;
        var w = map.width;
        var h = map.height;

        // Dark asphalt base
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, this.groundCanvas.width, this.groundCanvas.height);

        for (var y = 0; y < h; y++) {
            for (var x = 0; x < w; x++) {
                var tile = map.getTile(x, y);
                var d = map.getDecor(x, y);
                var px = x * ts;
                var py = y * ts;

                if (tile === Game.TileType.ROAD) {
                    this._drawRoad(ctx, px, py, ts, d, x, y);
                } else if (tile === Game.TileType.RUIN) {
                    this._drawRuin(ctx, px, py, ts, d, x, y);
                } else if (tile === Game.TileType.RUBBLE) {
                    this._drawRubble(ctx, px, py, ts, d);
                } else if (tile === Game.TileType.EMPTY) {
                    this._drawGround(ctx, px, py, ts, d);
                } else if (tile === Game.TileType.BASE) {
                    this._drawBase(ctx, px, py, ts, d);
                } else if (tile === Game.TileType.SPAWN) {
                    this._drawSpawn(ctx, px, py, ts, d);
                }
            }
        }

        // Road markings pass (draw on top of road tiles)
        this._drawRoadMarkings(ctx, ts, w, h);

        Game.Map.groundDirty = false;
    },

    _drawRoad(ctx, px, py, ts, d) {
        // Cracked asphalt road
        var shade = 35 + (d % 10);
        ctx.fillStyle = 'rgb(' + shade + ',' + shade + ',' + (shade + 2) + ')';
        ctx.fillRect(px, py, ts, ts);

        // Random cracks
        if (d % 7 === 0) {
            ctx.strokeStyle = 'rgba(0,0,0,0.3)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(px + (d % 15) + 4, py + (d % 12) + 2);
            ctx.lineTo(px + ts / 2 + (d % 8), py + ts / 2 + (d % 6));
            ctx.lineTo(px + ts - (d % 10) - 4, py + ts - (d % 8));
            ctx.stroke();
        }

        // Occasional pothole
        if (d % 23 === 0) {
            ctx.fillStyle = 'rgba(0,0,0,0.25)';
            ctx.beginPath();
            ctx.ellipse(px + ts / 2 + (d % 6 - 3), py + ts / 2 + (d % 8 - 4), 4 + d % 4, 3 + d % 3, 0, 0, Math.PI * 2);
            ctx.fill();
        }
    },

    _drawRuin(ctx, px, py, ts, d, tx, ty) {
        var w = Game.Map.width;
        // Determine if this is an edge or interior of a building block
        var neighbors = 0;
        if (ty > 0 && Game.Map.tiles[(ty-1)*w+tx] === Game.TileType.RUIN) neighbors |= 1; // top
        if (tx < w-1 && Game.Map.tiles[ty*w+tx+1] === Game.TileType.RUIN) neighbors |= 2; // right
        if (ty < Game.Map.height-1 && Game.Map.tiles[(ty+1)*w+tx] === Game.TileType.RUIN) neighbors |= 4; // bottom
        if (tx > 0 && Game.Map.tiles[ty*w+tx-1] === Game.TileType.RUIN) neighbors |= 8; // left

        // Building wall color - varies by block
        var blockId = (Math.floor(tx / 6) * 7 + Math.floor(ty / 6)) % 5;
        var colors = ['#3a3530', '#353040', '#30383a', '#3a3035', '#383530'];
        var wallColor = colors[blockId];
        ctx.fillStyle = wallColor;
        ctx.fillRect(px, py, ts, ts);

        // Darker interior
        if (neighbors === 15) {
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            ctx.fillRect(px + 2, py + 2, ts - 4, ts - 4);

            // Interior details (furniture/debris)
            if (d % 5 === 0) {
                ctx.fillStyle = 'rgba(80,60,40,0.4)';
                ctx.fillRect(px + 6 + d % 10, py + 6 + d % 8, 8 + d % 6, 6 + d % 4);
            }
        }

        // Draw wall edges facing non-ruin tiles
        ctx.strokeStyle = '#555045';
        ctx.lineWidth = 2;
        if (!(neighbors & 1)) { // no ruin above - draw top wall
            ctx.beginPath(); ctx.moveTo(px, py + 1); ctx.lineTo(px + ts, py + 1); ctx.stroke();
            // Broken top edge
            if (d % 4 === 0) {
                ctx.fillStyle = wallColor;
                ctx.fillRect(px + 8 + d % 12, py - 2, 6 + d % 5, 5);
            }
        }
        if (!(neighbors & 4)) { // no ruin below
            ctx.beginPath(); ctx.moveTo(px, py + ts - 1); ctx.lineTo(px + ts, py + ts - 1); ctx.stroke();
        }
        if (!(neighbors & 8)) { // no ruin left
            ctx.beginPath(); ctx.moveTo(px + 1, py); ctx.lineTo(px + 1, py + ts); ctx.stroke();
        }
        if (!(neighbors & 2)) { // no ruin right
            ctx.beginPath(); ctx.moveTo(px + ts - 1, py); ctx.lineTo(px + ts - 1, py + ts); ctx.stroke();
        }

        // Damage details on edges
        if (d % 3 === 0 && neighbors !== 15) {
            ctx.fillStyle = 'rgba(60,50,40,0.5)';
            var debrisX = px + 4 + d % (ts - 8);
            var debrisY = py + 4 + (d * 3) % (ts - 8);
            ctx.fillRect(debrisX, debrisY, 3 + d % 4, 2 + d % 3);
        }
    },

    _drawRubble(ctx, px, py, ts, d) {
        // Cracked ground with scattered debris
        var shade = 28 + (d % 12);
        ctx.fillStyle = 'rgb(' + shade + ',' + (shade - 2) + ',' + (shade - 4) + ')';
        ctx.fillRect(px, py, ts, ts);

        // Scattered debris chunks
        var numDebris = 1 + d % 3;
        for (var i = 0; i < numDebris; i++) {
            var dShade = 45 + ((d * (i + 3)) % 25);
            ctx.fillStyle = 'rgb(' + dShade + ',' + (dShade - 5) + ',' + (dShade - 10) + ')';
            var dx = 3 + ((d * (i + 1)) % (ts - 10));
            var dy = 3 + ((d * (i + 2)) % (ts - 10));
            var dw = 3 + (d + i) % 6;
            var dh = 2 + (d + i * 2) % 5;
            ctx.fillRect(px + dx, py + dy, dw, dh);
        }

        // Rebar/wire details
        if (d % 8 === 0) {
            ctx.strokeStyle = 'rgba(120,80,50,0.4)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(px + d % 16 + 4, py + d % 12 + 2);
            ctx.lineTo(px + ts - d % 12 - 4, py + ts - d % 10 - 2);
            ctx.stroke();
        }
    },

    _drawGround(ctx, px, py, ts, d) {
        // Cracked dirt/concrete
        var shade = 22 + (d % 8);
        ctx.fillStyle = 'rgb(' + (shade + 5) + ',' + (shade + 3) + ',' + shade + ')';
        ctx.fillRect(px, py, ts, ts);

        // Subtle grid crack
        ctx.strokeStyle = 'rgba(0,0,0,0.1)';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(px, py, ts, ts);

        // Occasional weed/grass patch
        if (d % 11 === 0) {
            ctx.fillStyle = 'rgba(40,60,30,0.4)';
            ctx.beginPath();
            ctx.arc(px + ts / 2 + d % 8 - 4, py + ts / 2 + d % 6 - 3, 3 + d % 3, 0, Math.PI * 2);
            ctx.fill();
        }
    },

    _drawBase(ctx, px, py, ts, d) {
        // Fortified base
        ctx.fillStyle = '#334';
        ctx.fillRect(px, py, ts, ts);
        ctx.fillStyle = '#445';
        ctx.fillRect(px + 2, py + 2, ts - 4, ts - 4);

        // Metal plate pattern
        ctx.strokeStyle = '#556';
        ctx.lineWidth = 1;
        ctx.strokeRect(px + 4, py + 4, ts - 8, ts - 8);

        // Rivets
        ctx.fillStyle = '#667';
        var corners = [[6, 6], [ts - 8, 6], [6, ts - 8], [ts - 8, ts - 8]];
        for (var i = 0; i < corners.length; i++) {
            ctx.beginPath();
            ctx.arc(px + corners[i][0], py + corners[i][1], 2, 0, Math.PI * 2);
            ctx.fill();
        }
    },

    _drawSpawn(ctx, px, py, ts, d) {
        // Ominous spawn portal
        ctx.fillStyle = '#1a0505';
        ctx.fillRect(px, py, ts, ts);
        ctx.fillStyle = '#3a1010';
        ctx.fillRect(px + 3, py + 3, ts - 6, ts - 6);
        ctx.strokeStyle = '#622';
        ctx.lineWidth = 1;
        ctx.strokeRect(px + 3, py + 3, ts - 6, ts - 6);
    },

    _drawRoadMarkings(ctx, ts, w, h) {
        ctx.strokeStyle = 'rgba(180,170,100,0.12)';
        ctx.lineWidth = 1;
        ctx.setLineDash([6, 8]);

        // Draw dashed center lines on wider road stretches
        for (var y = 0; y < h; y++) {
            var runStart = -1;
            for (var x = 0; x < w; x++) {
                if (Game.Map.getTile(x, y) === Game.TileType.ROAD) {
                    if (runStart === -1) runStart = x;
                } else {
                    if (runStart !== -1 && (x - runStart) >= 3) {
                        ctx.beginPath();
                        ctx.moveTo(runStart * ts, y * ts + ts / 2);
                        ctx.lineTo(x * ts, y * ts + ts / 2);
                        ctx.stroke();
                    }
                    runStart = -1;
                }
            }
        }
        for (var x = 0; x < w; x++) {
            var runStart = -1;
            for (var y = 0; y < h; y++) {
                if (Game.Map.getTile(x, y) === Game.TileType.ROAD) {
                    if (runStart === -1) runStart = y;
                } else {
                    if (runStart !== -1 && (y - runStart) >= 3) {
                        ctx.beginPath();
                        ctx.moveTo(x * ts + ts / 2, runStart * ts);
                        ctx.lineTo(x * ts + ts / 2, y * ts);
                        ctx.stroke();
                    }
                    runStart = -1;
                }
            }
        }
        ctx.setLineDash([]);
    },

    draw(ctx) {
        var cam = Game.Camera;
        var shake = cam.getShakeOffset();
        var offX = Math.round(cam.x) + shake.x;
        var offY = Math.round(cam.y) + shake.y;

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

        // Ambient darkness at edges (vignette)
        this._drawVignette(ctx);
    },

    _drawVignette(ctx) {
        var sw = Game.Config.INTERNAL_WIDTH;
        var sh = Game.Config.INTERNAL_HEIGHT;
        var grad = ctx.createRadialGradient(sw / 2, sh / 2, sh * 0.3, sw / 2, sh / 2, sh * 0.7);
        grad.addColorStop(0, 'rgba(0,0,0,0)');
        grad.addColorStop(1, 'rgba(0,0,0,0.35)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, sw, sh);
    },

    drawWalls(ctx, offX, offY) {
        var ts = Game.Config.TILE_SIZE;
        for (var i = 0; i < Game.WallManager.walls.length; i++) {
            var w = Game.WallManager.walls[i];
            if (!Game.Camera.isVisible(w.x, w.y, ts)) continue;
            var sx = w.x - ts / 2 - offX;
            var sy = w.y - ts / 2 - offY;

            // Sandbag/barricade look
            ctx.fillStyle = '#6a5a3a';
            ctx.fillRect(sx + 1, sy + 1, ts - 2, ts - 2);

            // Sandbag texture lines
            ctx.strokeStyle = '#7a6a4a';
            ctx.lineWidth = 1;
            for (var ly = 0; ly < 3; ly++) {
                ctx.beginPath();
                ctx.moveTo(sx + 2, sy + 4 + ly * 10);
                ctx.lineTo(sx + ts - 2, sy + 4 + ly * 10);
                ctx.stroke();
            }

            ctx.strokeStyle = '#8a7a50';
            ctx.lineWidth = 2;
            ctx.strokeRect(sx + 1, sy + 1, ts - 2, ts - 2);

            // Damage cracks
            var hpPct = w.health / w.maxHealth;
            if (hpPct < 0.6) {
                ctx.strokeStyle = '#333';
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
        var ts = Game.Config.TILE_SIZE;
        for (var i = 0; i < Game.TurretManager.turrets.length; i++) {
            var t = Game.TurretManager.turrets[i];
            if (!Game.Camera.isVisible(t.x, t.y, ts)) continue;
            var sx = t.x - offX;
            var sy = t.y - offY;
            var cfg = Game.Config.TURRET_TYPES[t.type];

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
            for (var j = 0; j < t.level; j++) {
                ctx.fillStyle = '#ff0';
                ctx.beginPath();
                var dotAngle = (-Math.PI / 2) + (j - (t.level - 1) / 2) * 0.5;
                ctx.arc(sx + Math.cos(dotAngle) * 8, sy + Math.sin(dotAngle) * 8, 2, 0, Math.PI * 2);
                ctx.fill();
            }

            // Range circle when selected
            if (Game.Phase.current === 'build' && Game.Phase.radial.mode !== 'none' &&
                Game.Phase.radial.turret === t) {
                var upgr = Game.Config.UPGRADE_LEVELS[t.level];
                var range = cfg.range * upgr.range;
                ctx.strokeStyle = 'rgba(255,255,255,0.15)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.arc(sx, sy, range, 0, Math.PI * 2);
                ctx.stroke();
            }
        }
    },

    drawTurretBarrels(ctx, offX, offY) {
        for (var i = 0; i < Game.TurretManager.turrets.length; i++) {
            var t = Game.TurretManager.turrets[i];
            if (!Game.Camera.isVisible(t.x, t.y)) continue;
            var sx = t.x - offX;
            var sy = t.y - offY;
            var cfg = Game.Config.TURRET_TYPES[t.type];

            ctx.strokeStyle = cfg.color;
            ctx.lineWidth = t.type === 'sniper' ? 2 : 3;
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.lineTo(sx + Math.cos(t.angle) * cfg.barrelLen, sy + Math.sin(t.angle) * cfg.barrelLen);
            ctx.stroke();

            if (t.type === 'shotgun') {
                ctx.lineWidth = 5;
                var endX = sx + Math.cos(t.angle) * cfg.barrelLen;
                var endY = sy + Math.sin(t.angle) * cfg.barrelLen;
                ctx.beginPath();
                ctx.moveTo(endX - Math.cos(t.angle) * 3, endY - Math.sin(t.angle) * 3);
                ctx.lineTo(endX, endY);
                ctx.stroke();
            }
        }
    },

    drawZombies(ctx, offX, offY) {
        var zombies = Game.ZombieManager.pool.active.slice().sort(function(a, b) { return a.y - b.y; });

        for (var i = 0; i < zombies.length; i++) {
            var z = zombies[i];
            if (!z.alive || !Game.Camera.isVisible(z.x, z.y)) continue;
            var sx = z.x - offX;
            var sy = z.y - offY;

            // Shadow
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            ctx.beginPath();
            ctx.ellipse(sx, sy + z.radius * 0.6, z.radius * 0.8, z.radius * 0.3, 0, 0, Math.PI * 2);
            ctx.fill();

            // Body
            ctx.fillStyle = z.color;
            ctx.beginPath();
            ctx.arc(sx, sy, z.radius, 0, Math.PI * 2);
            ctx.fill();

            // Eyes
            var faceAngle = 0;
            if (z.path && z.pathIndex < z.path.length) {
                var target = z.path[z.pathIndex];
                faceAngle = Math.atan2(target.y - z.y, target.x - z.x);
            }
            ctx.fillStyle = '#f00';
            var eyeOff = z.radius * 0.4;
            var eyeR = z.type === 'tank' ? 3 : 2;
            ctx.beginPath();
            ctx.arc(sx + Math.cos(faceAngle - 0.4) * eyeOff, sy + Math.sin(faceAngle - 0.4) * eyeOff, eyeR, 0, Math.PI * 2);
            ctx.arc(sx + Math.cos(faceAngle + 0.4) * eyeOff, sy + Math.sin(faceAngle + 0.4) * eyeOff, eyeR, 0, Math.PI * 2);
            ctx.fill();

            // Health bar
            if (z.health < z.maxHealth) {
                var barW = z.radius * 2;
                var barH = 3;
                var bx = sx - barW / 2;
                var by = sy - z.radius - 6;
                ctx.fillStyle = '#300';
                ctx.fillRect(bx, by, barW, barH);
                ctx.fillStyle = '#f44';
                ctx.fillRect(bx, by, barW * (z.health / z.maxHealth), barH);
            }
        }
    },

    drawPlayer(ctx, offX, offY) {
        var p = Game.Player;
        var sx = p.x - offX;
        var sy = p.y - offY;

        // Player shadow
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(sx, sy + p.radius * 0.5, p.radius * 0.8, p.radius * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();

        if (Game.Phase.current === 'combat') {
            // Mounted gun station
            ctx.fillStyle = '#444';
            ctx.fillRect(sx - 16, sy - 16, 32, 32);
            ctx.strokeStyle = '#666';
            ctx.lineWidth = 2;
            ctx.strokeRect(sx - 16, sy - 16, 32, 32);

            ctx.fillStyle = '#48f';
            ctx.beginPath();
            ctx.arc(sx, sy, p.radius, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = '#adf';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.lineTo(sx + Math.cos(p.aimAngle) * 22, sy + Math.sin(p.aimAngle) * 22);
            ctx.stroke();
        } else {
            ctx.fillStyle = '#48f';
            ctx.beginPath();
            ctx.arc(sx, sy, p.radius, 0, Math.PI * 2);
            ctx.fill();

            var joy = Game.Input.joystick;
            if (joy.dx !== 0 || joy.dy !== 0) {
                ctx.strokeStyle = '#8bf';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(sx, sy);
                ctx.lineTo(sx + joy.dx * 16, sy + joy.dy * 16);
                ctx.stroke();
            }

            ctx.strokeStyle = '#adf';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(sx, sy, p.radius, 0, Math.PI * 2);
            ctx.stroke();
        }
    },

    drawBullets(ctx, offX, offY) {
        ctx.fillStyle = '#ff8';
        Game.BulletManager.pool.forEach(function(b) {
            if (!Game.Camera.isVisible(b.x, b.y)) return;
            var sx = b.x - offX;
            var sy = b.y - offY;
            ctx.beginPath();
            ctx.arc(sx, sy, 3, 0, Math.PI * 2);
            ctx.fill();
        });
    },

    drawParticles(ctx, offX, offY) {
        Game.ParticleManager.pool.forEach(function(p) {
            if (!Game.Camera.isVisible(p.x, p.y)) return;
            var sx = p.x - offX;
            var sy = p.y - offY;
            var alpha = Math.max(0, p.life / p.maxLife);
            ctx.globalAlpha = alpha;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(sx, sy, p.size * alpha, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.globalAlpha = 1;
    },

    drawHealthBars(ctx, offX, offY) {
        var ts = Game.Config.TILE_SIZE;
        for (var i = 0; i < Game.WallManager.walls.length; i++) {
            var w = Game.WallManager.walls[i];
            if (w.health >= w.maxHealth || !Game.Camera.isVisible(w.x, w.y)) continue;
            var sx = w.x - offX;
            var sy = w.y - offY;
            var barW = ts - 8;
            ctx.fillStyle = '#300';
            ctx.fillRect(sx - barW / 2, sy - ts / 2 - 5, barW, 3);
            ctx.fillStyle = '#fa4';
            ctx.fillRect(sx - barW / 2, sy - ts / 2 - 5, barW * (w.health / w.maxHealth), 3);
        }

        for (var i = 0; i < Game.TurretManager.turrets.length; i++) {
            var t = Game.TurretManager.turrets[i];
            if (t.health >= t.maxHealth || !Game.Camera.isVisible(t.x, t.y)) continue;
            var sx = t.x - offX;
            var sy = t.y - offY;
            var barW = 20;
            ctx.fillStyle = '#300';
            ctx.fillRect(sx - barW / 2, sy - 18, barW, 3);
            ctx.fillStyle = '#4af';
            ctx.fillRect(sx - barW / 2, sy - 18, barW * (t.health / t.maxHealth), 3);
        }
    },

    drawStation(ctx, offX, offY) {
        var sp = Game.Map.stationPos;
        var sx = sp.x - offX;
        var sy = sp.y - offY;

        var pulse = 0.5 + 0.5 * Math.sin(Date.now() / 300);
        ctx.strokeStyle = 'rgba(100, 150, 255, ' + (0.3 + pulse * 0.3) + ')';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(sx - 18, sy - 18, 36, 36);
        ctx.setLineDash([]);

        ctx.fillStyle = 'rgba(100, 150, 255, ' + (0.1 + pulse * 0.1) + ')';
        ctx.fillRect(sx - 18, sy - 18, 36, 36);

        ctx.fillStyle = '#89b';
        ctx.font = '9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('GUN', sx, sy + 3);
    }
};
