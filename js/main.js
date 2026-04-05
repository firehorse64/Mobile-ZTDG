window.Game = window.Game || {};

(function() {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');

    let lastTime = 0;
    let accumulator = 0;

    function resize() {
        const dpr = window.devicePixelRatio || 1;
        const w = window.innerWidth;
        const h = window.innerHeight;

        // Set internal resolution
        canvas.width = Game.Config.INTERNAL_WIDTH;
        canvas.height = Game.Config.INTERNAL_HEIGHT;

        // CSS fills viewport
        canvas.style.width = w + 'px';
        canvas.style.height = h + 'px';

        Game.Camera.screenW = Game.Config.INTERNAL_WIDTH;
        Game.Camera.screenH = Game.Config.INTERNAL_HEIGHT;
        Game.Input.updateScale(canvas.width, canvas.height);
    }

    function init() {
        resize();
        window.addEventListener('resize', resize);

        Game.Input.init(canvas);
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
        const delta = timestamp - lastTime;
        lastTime = timestamp;

        // Cap delta to prevent spiral of death
        accumulator += Math.min(delta, 200);

        while (accumulator >= Game.Config.TICK_RATE) {
            update(Game.Config.TICK_RATE);
            accumulator -= Game.Config.TICK_RATE;
        }

        render();
        requestAnimationFrame(loop);
    }

    // Start when DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
