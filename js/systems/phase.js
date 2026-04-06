window.Game = window.Game || {};

Game.Phase = {
    current: 'title', // title, build, combat_countdown, combat, wave_complete, game_over
    timer: 0,
    countdownTime: 3000,
    waveCompleteTime: 2000,
    message: '',

    init() {
        this.current = 'title';
        this.timer = 0;
        this.message = 'TAP TO START';
    },

    startGame() {
        Game.Map.init();
        Game.Player.init();
        Game.Economy.init();
        Game.BaseHealth.init();
        Game.Wave.init();
        Game.TurretManager.init();
        Game.WallManager.init();
        Game.BulletManager.clear();
        Game.ZombieManager.clear();
        Game.ParticleManager.clear();
        Game.Renderer.init();

        this.toBuild();
    },

    toBuild() {
        this.current = 'build';
        this.message = '';
        Game.HUD._buildHintTimer = 8000;

        // Give wave bonus (except first wave)
        if (Game.Wave.number > 0) {
            const bonus = Game.Economy.waveBonus(Game.Wave.number);
            this.message = '+$' + bonus + ' wave bonus!';
            this.timer = 2000;
        }
    },

    startCombat() {
        this.current = 'combat_countdown';
        this.timer = this.countdownTime;
        Game.Map.recalcPaths();
        Game.HUD._combatHintTimer = 4000;
    },

    update(dt) {
        switch (this.current) {
            case 'title':
                // Wait for tap
                const taps = Game.Input.consumeTaps();
                if (taps.length > 0 || Game.Input.aim.active) {
                    this.startGame();
                    Game.Input.aim.active = false;
                }
                break;

            case 'build':
                this.timer -= dt;
                if (this.timer <= 0) this.message = '';
                Game.Player.update(dt);
                Game.ParticleManager.update(dt);
                this.handleBuildInput();
                break;

            case 'combat_countdown':
                this.timer -= dt;
                this.message = 'Wave ' + (Game.Wave.number + 1) + ' in ' + Math.ceil(this.timer / 1000);
                Game.Player.update(dt);
                if (this.timer <= 0) {
                    this.current = 'combat';
                    this.message = '';
                    Game.Wave.startWave();
                }
                break;

            case 'combat':
                Game.Player.update(dt);
                Game.Wave.update(dt);
                Game.TurretManager.update(dt);
                Game.BulletManager.update(dt);
                Game.ZombieManager.update(dt);
                Game.Combat.update(dt);
                Game.ParticleManager.update(dt);

                if (Game.BaseHealth.isDestroyed()) {
                    this.current = 'game_over';
                    this.message = 'BASE DESTROYED';
                    this.timer = 0;
                } else if (Game.Wave.isComplete()) {
                    this.current = 'wave_complete';
                    this.message = 'Wave ' + Game.Wave.number + ' Complete!';
                    this.timer = this.waveCompleteTime;
                }
                break;

            case 'wave_complete':
                Game.BulletManager.update(dt);
                Game.ParticleManager.update(dt);
                this.timer -= dt;
                if (this.timer <= 0) {
                    this.toBuild();
                }
                break;

            case 'game_over':
                Game.ParticleManager.update(dt);
                const goTaps = Game.Input.consumeTaps();
                this.timer += dt;
                if ((goTaps.length > 0 || Game.Input.aim.active) && this.timer > 1000) {
                    Game.Input.aim.active = false;
                    this.init();
                }
                break;
        }
    },

    // Radial menu state
    // mode: 'none' | 'select' (3-button ring) | 'build' (sub-ring of build options)
    radial: {
        mode: 'none',
        tileX: 0,
        tileY: 0,
        tileType: 0,
        turret: null,
        wall: null,
        animTimer: 0
    },

    handleBuildInput() {
        const taps = Game.Input.consumeTaps();

        for (const tap of taps) {
            // Check if tapping the FIGHT button
            const fightBtn = Game.HUD.getFightButtonRect();
            if (tap.x >= fightBtn.x && tap.x <= fightBtn.x + fightBtn.w &&
                tap.y >= fightBtn.y && tap.y <= fightBtn.y + fightBtn.h) {
                this.startCombat();
                this.radial.mode = 'none';
                return;
            }

            // Check if tapping weapon upgrade area (bottom-left)
            const sh = Game.Config.INTERNAL_HEIGHT;
            if (tap.x >= 10 && tap.x <= 190 && tap.y >= sh - 60 && tap.y <= sh - 10) {
                var wCost = Game.Player.getWeaponUpgradeCost();
                if (wCost > 0 && Game.Economy.spend(wCost)) {
                    Game.Player.weaponLevel++;
                }
                return;
            }

            // Check if tapping a radial menu button
            if (this.radial.mode !== 'none') {
                var hit = Game.HUD.getRadialHit(tap.x, tap.y);
                if (hit) {
                    this.executeRadialAction(hit);
                    return;
                }
                // Tap elsewhere closes radial
                this.radial.mode = 'none';
                return;
            }

            // Convert tap to world coords and select tile
            const world = Game.Camera.screenToWorld(tap.x, tap.y);
            const tile = Game.Map.worldToTile(world.x, world.y);
            const tileType = Game.Map.getTile(tile.x, tile.y);

            // Allow selecting empty, wall, and turret tiles (not base/spawn/out-of-bounds)
            if (tileType === Game.TileType.EMPTY || tileType === Game.TileType.WALL || tileType === Game.TileType.TURRET) {
                this.radial.mode = 'select';
                this.radial.tileX = tile.x;
                this.radial.tileY = tile.y;
                this.radial.tileType = tileType;
                this.radial.turret = Game.TurretManager.getAt(tile.x, tile.y);
                this.radial.wall = Game.WallManager.getAt(tile.x, tile.y);
                this.radial.animTimer = 0;
            }
        }
    },

    executeRadialAction(action) {
        var r = this.radial;
        var hasSomething = r.tileType === Game.TileType.TURRET || r.tileType === Game.TileType.WALL;

        switch (action) {
            case 'build':
                if (!hasSomething) {
                    // Open build sub-ring
                    r.mode = 'build';
                    r.animTimer = 0;
                }
                break;
            case 'destroy':
                if (hasSomething) {
                    if (r.turret) {
                        var cfg = Game.Config.TURRET_TYPES[r.turret.type];
                        Game.Economy.addCurrency(Math.floor(cfg.cost * 0.5));
                        Game.TurretManager.remove(r.turret);
                    } else if (r.wall) {
                        Game.Economy.addCurrency(Math.floor(Game.Config.WALL_COST * 0.5));
                        Game.WallManager.remove(r.wall);
                        Game.Map.setTile(r.tileX, r.tileY, Game.TileType.EMPTY);
                    }
                    r.mode = 'none';
                }
                break;
            case 'info':
                if (r.turret) {
                    // Upgrade turret
                    Game.TurretManager.upgrade(r.turret);
                }
                // Keep menu open to see result
                break;
            // Build sub-ring options
            case 'gun':
            case 'shotgun':
            case 'sniper':
                Game.TurretManager.place(r.tileX, r.tileY, action);
                r.mode = 'none';
                break;
            case 'wall':
                Game.WallManager.place(r.tileX, r.tileY);
                r.mode = 'none';
                break;
            case 'back':
                r.mode = 'select';
                r.animTimer = 0;
                break;
        }

        // Refresh tile state after action
        r.tileType = Game.Map.getTile(r.tileX, r.tileY);
        r.turret = Game.TurretManager.getAt(r.tileX, r.tileY);
        r.wall = Game.WallManager.getAt(r.tileX, r.tileY);
    }
};
