window.Game = window.Game || {};

(function() {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');

    let lastTime = 0;
    let accumulator = 0;
    let errorMsg = null;

    // Show errors on screen since mobile has no console
    window.onerror = function(msg, src, line, col, err) {
        errorMsg = msg + '\n' + (src ? src.split('/').pop() : '') + ':' + line;
        drawError();
        return true;
    };

    function drawError() {
        if (!errorMsg) return;
        ctx.fillStyle = '#200';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#f44';
        ctx.font = '16px monospace';
        ctx.textAlign = 'center';
        const lines = errorMsg.split('\n');
        for (let i = 0; i < lines.length; i++) {
            ctx.fillText(lines[i], canvas.width / 2, 100 + i * 24, canvas.width - 20);
        }
    }

    function resize() {
        const w = window.innerWidth;
        const h = window.innerHeight;
        const aspect = w / h;

        // Scale internal resolution to match device aspect ratio
        // Use a base short-axis of 480 and derive the other from aspect
        var iw, ih;
        if (aspect < 1) {
            // Portrait
            iw = 480;
            ih = Math.round(480 / aspect);
        } else {
            // Landscape
            ih = 480;
            iw = Math.round(480 * aspect);
        }

        canvas.width = iw;
        canvas.height = ih;

        // Update config so HUD/camera use actual size
        Game.Config.INTERNAL_WIDTH = iw;
        Game.Config.INTERNAL_HEIGHT = ih;

        // CSS fills viewport
        canvas.style.width = w + 'px';
        canvas.style.height = h + 'px';

        Game.Camera.screenW = iw;
        Game.Camera.screenH = ih;
        Game.Input.updateScale(iw, ih);
    }

    function init() {
        try {
            Game.Input.init(canvas);
            resize();
            window.addEventListener('resize', resize);
            Game.BulletManager.init();
            Game.ParticleManager.init();
            Game.ZombieManager.init();
            Game.TurretManager.init();
            Game.WallManager.init();
            Game.Phase.init();

            // Prevent context menu on long press
            canvas.addEventListener('contextmenu', (e) => e.preventDefault());

            lastTime = performance.now();
            requestAnimationFrame(loop);
        } catch (e) {
            errorMsg = 'Init error: ' + e.message;
            drawError();
        }
    }

    function update(dt) {
        Game.Phase.update(dt);

        // Camera follows player in build, centers on base in combat
        if (Game.Phase.current === 'build') {
            Game.Camera.follow(Game.Player.x, Game.Player.y);
        } else if (Game.Phase.current === 'combat' || Game.Phase.current === 'combat_countdown') {
            Game.Camera.follow(Game.Map.baseCenter.x, Game.Map.baseCenter.y);
        }
        Game.Camera.update();
    }

    function render() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Fill background
        ctx.fillStyle = '#1a2a1a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        if (Game.Phase.current !== 'title') {
            Game.Renderer.draw(ctx);
        }

        Game.HUD.draw(ctx);
    }

    function loop(timestamp) {
        if (errorMsg) { drawError(); return; }

        try {
            const delta = timestamp - lastTime;
            lastTime = timestamp;

            // Cap delta to prevent spiral of death
            accumulator += Math.min(delta, 200);

            while (accumulator >= Game.Config.TICK_RATE) {
                update(Game.Config.TICK_RATE);
                accumulator -= Game.Config.TICK_RATE;
            }

            render();
        } catch (e) {
            errorMsg = e.message + '\n' + (e.stack ? e.stack.split('\n')[1] : '');
            drawError();
            return;
        }

        requestAnimationFrame(loop);
    }

    // Start when DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
