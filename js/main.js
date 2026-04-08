window.Game = window.Game || {};

Game.State = {
    current: 'title', // title, playing, dead

    newGame() {
        Game.World.init();
        Game.Player.init();
        Game.Inventory.init();
        Game.Survival.init();
        Game.BulletManager.init();
        Game.ParticleManager.init();
        Game.ZombieManager.init();
        Game.Renderer.init();
        Game.HUD.screen = 'none';
        this.current = 'playing';
    },

    loadGame() {
        Game.BulletManager.init();
        Game.ParticleManager.init();
        Game.ZombieManager.init();
        if (Game.Save.load()) {
            Game.Renderer.init();
            Game.HUD.screen = 'none';
            this.current = 'playing';
            return true;
        }
        return false;
    },

    gameOver() {
        this.current = 'dead';
        Game.Save.deleteSave();
    }
};

(function() {
    var canvas = document.getElementById('gameCanvas');
    var ctx = canvas.getContext('2d');
    var lastTime = 0, accumulator = 0, errorMsg = null;

    window.onerror = function(msg, src, line) {
        errorMsg = msg + '\n' + (src ? src.split('/').pop() : '') + ':' + line;
        drawError(); return true;
    };

    function drawError() {
        if (!errorMsg) return;
        ctx.fillStyle = '#200'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#f44'; ctx.font = '14px monospace'; ctx.textAlign = 'center';
        var lines = errorMsg.split('\n');
        for (var i = 0; i < lines.length; i++) ctx.fillText(lines[i], canvas.width / 2, 80 + i * 20, canvas.width - 20);
    }

    function resize() {
        var w = window.innerWidth, h = window.innerHeight;
        var iw, ih;
        if (w / h < 1) { iw = 480; ih = Math.round(480 / (w / h)); }
        else { ih = 480; iw = Math.round(480 * (w / h)); }
        canvas.width = iw; canvas.height = ih;
        Game.Config.INTERNAL_WIDTH = iw; Game.Config.INTERNAL_HEIGHT = ih;
        canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
        Game.Camera.screenW = iw; Game.Camera.screenH = ih;
        Game.Input.updateScale();
    }

    function init() {
        try {
            Game.Input.init(canvas);
            resize();
            window.addEventListener('resize', resize);
            canvas.addEventListener('contextmenu', function(e) { e.preventDefault(); });
            Game.BulletManager.init();
            Game.ParticleManager.init();
            Game.ZombieManager.init();
            lastTime = performance.now();
            requestAnimationFrame(loop);
        } catch(e) { errorMsg = 'Init: ' + e.message; drawError(); }
    }

    function update(dt) {
        if (Game.State.current === 'title') {
            var taps = Game.Input.consumeTaps();
            if (taps.length > 0) {
                // Check button hits
                if (!Game.HUD.handleTap(taps[0].x, taps[0].y)) {
                    // Default: new game
                }
            }
            return;
        }

        if (Game.State.current === 'dead') {
            var taps = Game.Input.consumeTaps();
            if (taps.length > 0) { Game.State.current = 'title'; }
            return;
        }

        // Playing state
        // Process taps
        var taps = Game.Input.consumeTaps();
        for (var i = 0; i < taps.length; i++) {
            if (Game.HUD.handleTap(taps[i].x, taps[i].y)) continue;
            if (Game.HUD.screen === 'build') { Game.HUD.handleBuildTap(taps[i].x, taps[i].y); continue; }
        }

        if (!Game.HUD.isScreenOpen() || Game.HUD.screen === 'build') {
            Game.Player.update(dt);
        }

        Game.Survival.update(dt);
        Game.ZombieManager.update(dt);
        Game.BulletManager.update(dt);
        Game.Combat.bulletUpdate(dt);
        Game.ParticleManager.update(dt);

        Game.Camera.follow(Game.Player.x, Game.Player.y);
        Game.Camera.update();

        if (Game.HUD.messageTimer > 0) Game.HUD.messageTimer -= dt;

        // Auto-save every 30 seconds
        if (Game.Survival.time > 0 && Game.Survival.time % 900 === 0) Game.Save.save();
    }

    function render() {
        var sw = canvas.width, sh = canvas.height;
        ctx.clearRect(0, 0, sw, sh);
        ctx.fillStyle = '#0a0a0a'; ctx.fillRect(0, 0, sw, sh);

        if (Game.State.current === 'title') {
            drawTitle(ctx, sw, sh);
            return;
        }
        if (Game.State.current === 'dead') {
            drawDeath(ctx, sw, sh);
            return;
        }

        Game.Renderer.draw(ctx);
        Game.HUD.draw(ctx);
    }

    function drawTitle(ctx, sw, sh) {
        ctx.fillStyle = '#0d0d1a'; ctx.fillRect(0, 0, sw, sh);
        ctx.strokeStyle = '#4a4'; ctx.lineWidth = 2; ctx.strokeRect(40, sh / 2 - 130, sw - 80, 260);
        ctx.fillStyle = '#6f6'; ctx.font = 'bold 32px monospace'; ctx.textAlign = 'center';
        ctx.fillText('DEAD ZONE', sw / 2, sh / 2 - 70);
        ctx.fillStyle = '#aaa'; ctx.font = '14px monospace';
        ctx.fillText('Open World Zombie Survival', sw / 2, sh / 2 - 40);

        Game.HUD._buttons = [];
        Game.HUD._btn(ctx, sw / 2 - 80, sh / 2 - 10, 160, 40, 'NEW GAME', '#464', function() { Game.State.newGame(); });
        if (Game.Save.hasSave()) {
            Game.HUD._btn(ctx, sw / 2 - 80, sh / 2 + 40, 160, 40, 'CONTINUE', '#456', function() { Game.State.loadGame(); });
        }

        ctx.fillStyle = '#555'; ctx.font = '10px monospace';
        ctx.fillText('Explore, craft, build, survive', sw / 2, sh / 2 + 110);
    }

    function drawDeath(ctx, sw, sh) {
        ctx.fillStyle = 'rgba(20,0,0,0.9)'; ctx.fillRect(0, 0, sw, sh);
        ctx.fillStyle = '#f44'; ctx.font = 'bold 36px monospace'; ctx.textAlign = 'center';
        ctx.fillText('YOU DIED', sw / 2, sh / 2 - 40);
        ctx.fillStyle = '#aaa'; ctx.font = '14px monospace';
        ctx.fillText(Game.Survival.getDayString(), sw / 2, sh / 2);
        ctx.fillText('Level ' + Game.Player.level, sw / 2, sh / 2 + 24);
        ctx.fillStyle = '#666'; ctx.font = '12px monospace';
        ctx.fillText('Tap to continue', sw / 2, sh / 2 + 70);
    }

    function loop(timestamp) {
        if (errorMsg) { drawError(); return; }
        try {
            var delta = timestamp - lastTime; lastTime = timestamp;
            accumulator += Math.min(delta, 200);
            while (accumulator >= Game.Config.TICK_RATE) { update(Game.Config.TICK_RATE); accumulator -= Game.Config.TICK_RATE; }
            render();
        } catch(e) { errorMsg = e.message + '\n' + (e.stack ? e.stack.split('\n')[1] : ''); drawError(); return; }
        requestAnimationFrame(loop);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
