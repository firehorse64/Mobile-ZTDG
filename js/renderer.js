window.Game = window.Game || {};
Game.Renderer = {
    chunkCanvases: {},

    init() { this.chunkCanvases = {}; },

    getChunkCanvas(cx, cy) {
        var key = cx + ',' + cy;
        if (Game.World.dirtyChunks[key]) { delete this.chunkCanvases[key]; delete Game.World.dirtyChunks[key]; }
        if (this.chunkCanvases[key]) return this.chunkCanvases[key];
        var cs = Game.Config.CHUNK_SIZE, ts = Game.Config.TILE_SIZE;
        var canvas = document.createElement('canvas');
        canvas.width = cs * ts; canvas.height = cs * ts;
        var ctx = canvas.getContext('2d');
        var baseTX = cx * cs, baseTY = cy * cs;
        ctx.fillStyle = '#1a1a1a'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        for (var y = 0; y < cs; y++) {
            for (var x = 0; x < cs; x++) {
                var tx = baseTX + x, ty = baseTY + y;
                var tile = Game.World.getTile(tx, ty);
                var d = Game.World.getDecor(tx, ty);
                var px = x * ts, py = y * ts;
                this.drawTile(ctx, px, py, ts, tile, d, tx, ty);
            }
        }
        this.chunkCanvases[key] = canvas;
        return canvas;
    },

    drawTile(ctx, px, py, ts, tile, d, tx, ty) {
        var T = Game.TileType;
        switch (tile) {
            case T.ROAD:
                var s = 35 + d % 10; ctx.fillStyle = 'rgb(' + s + ',' + s + ',' + (s + 2) + ')'; ctx.fillRect(px, py, ts, ts);
                if (d % 7 === 0) { ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 1; ctx.beginPath();
                    ctx.moveTo(px + d % 15 + 4, py + d % 12 + 2); ctx.lineTo(px + ts - d % 10 - 4, py + ts - d % 8); ctx.stroke(); }
                break;
            case T.RUIN:
                var scav = Game.World.scavenged[ty * Game.World.width + tx];
                var blockId = (Math.floor(tx / 6) * 7 + Math.floor(ty / 6)) % 5;
                var colors = ['#3a3530', '#353040', '#30383a', '#3a3035', '#383530'];
                ctx.fillStyle = scav ? '#2a2520' : colors[blockId]; ctx.fillRect(px, py, ts, ts);
                ctx.strokeStyle = '#555045'; ctx.lineWidth = 1;
                var w = Game.World.width;
                if (ty > 0 && Game.World.tiles[(ty - 1) * w + tx] !== T.RUIN) { ctx.beginPath(); ctx.moveTo(px, py + 1); ctx.lineTo(px + ts, py + 1); ctx.stroke(); }
                if (ty < Game.World.height - 1 && Game.World.tiles[(ty + 1) * w + tx] !== T.RUIN) { ctx.beginPath(); ctx.moveTo(px, py + ts - 1); ctx.lineTo(px + ts, py + ts - 1); ctx.stroke(); }
                if (tx > 0 && Game.World.tiles[ty * w + tx - 1] !== T.RUIN) { ctx.beginPath(); ctx.moveTo(px + 1, py); ctx.lineTo(px + 1, py + ts); ctx.stroke(); }
                if (tx < w - 1 && Game.World.tiles[ty * w + tx + 1] !== T.RUIN) { ctx.beginPath(); ctx.moveTo(px + ts - 1, py); ctx.lineTo(px + ts - 1, py + ts); ctx.stroke(); }
                if (!scav) { ctx.fillStyle = 'rgba(200,180,100,0.08)'; ctx.fillRect(px + 4, py + 4, ts - 8, ts - 8); }
                break;
            case T.RUBBLE:
                var s = 28 + d % 12; ctx.fillStyle = 'rgb(' + s + ',' + (s - 2) + ',' + (s - 4) + ')'; ctx.fillRect(px, py, ts, ts);
                for (var i = 0; i < 1 + d % 2; i++) { ctx.fillStyle = 'rgb(' + (45 + (d * (i + 3)) % 25) + ',40,35)';
                    ctx.fillRect(px + 3 + (d * (i + 1)) % (ts - 10), py + 3 + (d * (i + 2)) % (ts - 10), 3 + (d + i) % 5, 2 + (d + i * 2) % 4); }
                break;
            case T.WATER:
                var wave = Math.sin((tx + ty) * 0.5 + d * 0.1) * 10;
                ctx.fillStyle = 'rgb(25,35,' + Math.floor(65 + wave) + ')'; ctx.fillRect(px, py, ts, ts);
                if (d % 5 === 0) { ctx.fillStyle = 'rgba(100,150,200,0.15)';
                    ctx.beginPath(); ctx.ellipse(px + ts / 2, py + ts / 2, 6 + d % 4, 3, d * 0.3, 0, Math.PI * 2); ctx.fill(); }
                break;
            case T.TREE:
                var s = 22 + d % 8; ctx.fillStyle = 'rgb(' + (s + 5) + ',' + (s + 3) + ',' + s + ')'; ctx.fillRect(px, py, ts, ts);
                ctx.fillStyle = '#2a1a0a'; ctx.fillRect(px + 12, py + 16, 8, 16);
                ctx.fillStyle = 'rgb(' + (30 + d % 30) + ',' + (50 + d % 30) + ',25)';
                ctx.beginPath(); ctx.arc(px + 16, py + 12, 10 + d % 4, 0, Math.PI * 2); ctx.fill();
                break;
            case T.BUSH:
                var s = 22 + d % 8; ctx.fillStyle = 'rgb(' + (s + 5) + ',' + (s + 3) + ',' + s + ')'; ctx.fillRect(px, py, ts, ts);
                ctx.fillStyle = 'rgb(' + (35 + d % 20) + ',' + (55 + d % 25) + ',30)';
                ctx.beginPath(); ctx.arc(px + 16, py + 18, 8 + d % 3, 0, Math.PI * 2); ctx.fill();
                if (d % 4 === 0) { ctx.fillStyle = '#c4c'; ctx.beginPath(); ctx.arc(px + 12 + d % 8, py + 14 + d % 6, 2, 0, Math.PI * 2); ctx.fill(); }
                break;
            case T.STRUCTURE:
                ctx.fillStyle = '#2a2a2a'; ctx.fillRect(px, py, ts, ts);
                break;
            case T.FARM:
                ctx.fillStyle = '#3a2a1a'; ctx.fillRect(px, py, ts, ts);
                for (var i = 0; i < 3; i++) { ctx.strokeStyle = '#4a3a2a'; ctx.lineWidth = 1; ctx.beginPath();
                    ctx.moveTo(px + 4, py + 8 + i * 10); ctx.lineTo(px + ts - 4, py + 8 + i * 10); ctx.stroke(); }
                break;
            default:
                var s = 22 + d % 8; ctx.fillStyle = 'rgb(' + (s + 5) + ',' + (s + 3) + ',' + s + ')'; ctx.fillRect(px, py, ts, ts);
                ctx.strokeStyle = 'rgba(0,0,0,0.08)'; ctx.lineWidth = 0.5; ctx.strokeRect(px, py, ts, ts);
                if (d % 13 === 0) { ctx.fillStyle = 'rgba(40,60,30,0.35)';
                    ctx.beginPath(); ctx.arc(px + ts / 2, py + ts / 2, 3, 0, Math.PI * 2); ctx.fill(); }
        }
    },

    draw(ctx) {
        var cam = Game.Camera, shake = cam.getShakeOffset();
        var offX = Math.round(cam.x) + shake.x, offY = Math.round(cam.y) + shake.y;
        var cs = Game.Config.CHUNK_SIZE, ts = Game.Config.TILE_SIZE, cpx = cs * ts;
        var startCX = Math.max(0, Math.floor(offX / cpx) - 1), endCX = Math.min(Game.Config.WORLD_CHUNKS - 1, Math.ceil((offX + cam.screenW) / cpx) + 1);
        var startCY = Math.max(0, Math.floor(offY / cpx) - 1), endCY = Math.min(Game.Config.WORLD_CHUNKS - 1, Math.ceil((offY + cam.screenH) / cpx) + 1);

        for (var cy = startCY; cy <= endCY; cy++) {
            for (var cx = startCX; cx <= endCX; cx++) {
                var chunkCanvas = this.getChunkCanvas(cx, cy);
                ctx.drawImage(chunkCanvas, cx * cpx - offX, cy * cpx - offY);
            }
        }

        // Structures
        for (var i = 0; i < Game.World.structures.length; i++) {
            var s = Game.World.structures[i];
            if (!cam.isVisible(s.x, s.y, 40)) continue;
            this.drawStructure(ctx, s, offX, offY);
        }

        // Zombies
        var zombies = Game.ZombieManager.pool.active.slice().sort(function(a, b) { return a.y - b.y; });
        for (var i = 0; i < zombies.length; i++) { var z = zombies[i]; if (z.alive && cam.isVisible(z.x, z.y)) this.drawZombie(ctx, z, offX, offY); }

        // Player
        this.drawPlayer(ctx, offX, offY);

        // Bullets
        ctx.fillStyle = '#ff8';
        Game.BulletManager.pool.forEach(function(b) { if (!cam.isVisible(b.x, b.y)) return;
            ctx.beginPath(); ctx.arc(b.x - offX, b.y - offY, 3, 0, Math.PI * 2); ctx.fill(); });

        // Particles
        Game.ParticleManager.pool.forEach(function(p) { if (!cam.isVisible(p.x, p.y)) return;
            var a = Math.max(0, p.life / p.maxLife); ctx.globalAlpha = a; ctx.fillStyle = p.color;
            ctx.beginPath(); ctx.arc(p.x - offX, p.y - offY, p.size * a, 0, Math.PI * 2); ctx.fill(); });
        ctx.globalAlpha = 1;

        // Day/night overlay
        if (Game.Survival.darkness > 0) {
            // Dark overlay with light circle around player
            var sw = Game.Config.INTERNAL_WIDTH, sh = Game.Config.INTERNAL_HEIGHT;
            var ps = cam.worldToScreen(Game.Player.x, Game.Player.y);
            var grad = ctx.createRadialGradient(ps.x, ps.y, 40, ps.x, ps.y, 200);
            grad.addColorStop(0, 'rgba(5,5,20,0)');
            grad.addColorStop(1, 'rgba(5,5,20,' + (Game.Survival.darkness * 0.7) + ')');
            ctx.fillStyle = grad; ctx.fillRect(0, 0, sw, sh);
            // Additional overall darkness
            ctx.fillStyle = 'rgba(5,5,20,' + (Game.Survival.darkness * 0.3) + ')';
            ctx.fillRect(0, 0, sw, sh);
        }
    },

    drawStructure(ctx, s, offX, offY) {
        var sx = s.x - offX, sy = s.y - offY, ts = Game.Config.TILE_SIZE;
        switch (s.type) {
            case 'wall':
                ctx.fillStyle = '#6a5a3a'; ctx.fillRect(sx - ts / 2 + 1, sy - ts / 2 + 1, ts - 2, ts - 2);
                ctx.strokeStyle = '#8a7a50'; ctx.lineWidth = 2; ctx.strokeRect(sx - ts / 2 + 1, sy - ts / 2 + 1, ts - 2, ts - 2);
                break;
            case 'door':
                ctx.fillStyle = '#7a6a4a'; ctx.fillRect(sx - ts / 2 + 4, sy - ts / 2 + 2, ts - 8, ts - 4);
                ctx.fillStyle = '#da8'; ctx.beginPath(); ctx.arc(sx + 6, sy, 2, 0, Math.PI * 2); ctx.fill();
                break;
            case 'turret_gun': case 'turret_shotgun':
                ctx.fillStyle = '#444'; ctx.beginPath(); ctx.arc(sx, sy, 12, 0, Math.PI * 2); ctx.fill();
                ctx.strokeStyle = s.type === 'turret_gun' ? '#4af' : '#fa4'; ctx.lineWidth = 2;
                ctx.beginPath(); ctx.arc(sx, sy, 12, 0, Math.PI * 2); ctx.stroke();
                ctx.strokeStyle = s.type === 'turret_gun' ? '#4af' : '#fa4'; ctx.lineWidth = 3;
                ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + Math.cos(s.angle) * 14, sy + Math.sin(s.angle) * 14); ctx.stroke();
                break;
            case 'campfire':
                ctx.fillStyle = '#432'; ctx.beginPath(); ctx.arc(sx, sy, 10, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#f84'; ctx.beginPath(); ctx.arc(sx, sy - 2, 5, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#ff4'; ctx.beginPath(); ctx.arc(sx, sy - 4, 3, 0, Math.PI * 2); ctx.fill();
                break;
            case 'rain_collector':
                ctx.fillStyle = '#556'; ctx.fillRect(sx - 10, sy - 10, 20, 20);
                ctx.fillStyle = '#48a'; ctx.fillRect(sx - 6, sy - 6, 12, 12 * Math.min(1, (s.data.water || 0) / (s.data.maxWater || 1)));
                break;
            case 'well':
                ctx.fillStyle = '#665'; ctx.beginPath(); ctx.arc(sx, sy, 12, 0, Math.PI * 2); ctx.fill();
                ctx.strokeStyle = '#887'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(sx, sy, 12, 0, Math.PI * 2); ctx.stroke();
                ctx.fillStyle = '#338'; ctx.beginPath(); ctx.arc(sx, sy, 6, 0, Math.PI * 2); ctx.fill();
                break;
            case 'farm_plot':
                if (s.data.crop) {
                    var cropCfg = Game.Config.CROPS[s.data.crop];
                    var pct = cropCfg ? s.data.growth / cropCfg.growTime : 0;
                    ctx.fillStyle = cropCfg ? cropCfg.icon : '#6a4';
                    var h = Math.max(4, 16 * Math.min(1, pct));
                    ctx.fillRect(sx - 4, sy + 8 - h, 8, h);
                    if (pct >= 1) { ctx.fillStyle = '#ff4'; ctx.font = '8px monospace'; ctx.textAlign = 'center'; ctx.fillText('!', sx, sy - 8); }
                }
                break;
            case 'storage':
                ctx.fillStyle = '#654'; ctx.fillRect(sx - 10, sy - 8, 20, 16);
                ctx.strokeStyle = '#876'; ctx.lineWidth = 1; ctx.strokeRect(sx - 10, sy - 8, 20, 16);
                break;
            case 'purifier':
                ctx.fillStyle = '#456'; ctx.fillRect(sx - 10, sy - 10, 20, 20);
                ctx.fillStyle = '#48f'; ctx.beginPath(); ctx.arc(sx, sy, 5, 0, Math.PI * 2); ctx.fill();
                break;
        }
        // Health bar if damaged
        if (s.health < s.maxHealth) {
            var barW = 20; ctx.fillStyle = '#300'; ctx.fillRect(sx - barW / 2, sy - 18, barW, 3);
            ctx.fillStyle = '#fa4'; ctx.fillRect(sx - barW / 2, sy - 18, barW * (s.health / s.maxHealth), 3);
        }
    },

    drawZombie(ctx, z, offX, offY) {
        var sx = z.x - offX, sy = z.y - offY;
        ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(sx, sy + z.radius * 0.6, z.radius * 0.7, z.radius * 0.25, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = z.color; ctx.beginPath(); ctx.arc(sx, sy, z.radius, 0, Math.PI * 2); ctx.fill();
        var fa = Math.atan2(Game.Player.y - z.y, Game.Player.x - z.x);
        ctx.fillStyle = z.aggroed ? '#f00' : '#a00';
        var eo = z.radius * 0.4, er = z.type === 'brute' ? 3 : 2;
        ctx.beginPath(); ctx.arc(sx + Math.cos(fa - 0.4) * eo, sy + Math.sin(fa - 0.4) * eo, er, 0, Math.PI * 2);
        ctx.arc(sx + Math.cos(fa + 0.4) * eo, sy + Math.sin(fa + 0.4) * eo, er, 0, Math.PI * 2); ctx.fill();
        if (z.health < z.maxHealth) {
            var bw = z.radius * 2; ctx.fillStyle = '#300'; ctx.fillRect(sx - bw / 2, sy - z.radius - 6, bw, 3);
            ctx.fillStyle = '#f44'; ctx.fillRect(sx - bw / 2, sy - z.radius - 6, bw * (z.health / z.maxHealth), 3);
        }
    },

    drawPlayer(ctx, offX, offY) {
        var p = Game.Player, sx = p.x - offX, sy = p.y - offY;
        ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(sx, sy + p.radius * 0.5, p.radius * 0.7, p.radius * 0.25, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#48f'; ctx.beginPath(); ctx.arc(sx, sy, p.radius, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#adf'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(sx, sy, p.radius, 0, Math.PI * 2); ctx.stroke();
        // Weapon line
        var angle = Game.Input.aim.active ? p.aimAngle : p.facingAngle;
        var wCfg = p.weapon ? Game.Config.ITEMS[p.weapon] : Game.Config.ITEMS.fists;
        var len = wCfg.range ? Math.min(wCfg.range, 22) : 12;
        ctx.strokeStyle = p.weapon ? '#ddd' : '#8bf'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + Math.cos(angle) * len, sy + Math.sin(angle) * len); ctx.stroke();
    }
};
