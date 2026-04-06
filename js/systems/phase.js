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

    // Build menu state
    buildMenu: { visible: false, tileX: 0, tileY: 0, screenX: 0, screenY: 0, turret: null },

    handleBuildInput() {
        const taps = Game.Input.consumeTaps();

        for (const tap of taps) {
            // Check if tapping the FIGHT button
            const fightBtn = Game.HUD.getFightButtonRect();
            if (tap.x >= fightBtn.x && tap.x <= fightBtn.x + fightBtn.w &&
                tap.y >= fightBtn.y && tap.y <= fightBtn.y + fightBtn.h) {
                this.startCombat();
                this.buildMenu.visible = false;
                return;
            }

            // Check if tapping weapon upgrade area (bottom-left)
            const sh = Game.Config.INTERNAL_HEIGHT;
            if (tap.x >= 10 && tap.x <= 190 && tap.y >= sh - 60 && tap.y <= sh - 10) {
                this.executeBuildAction('upgrade_weapon');
                return;
            }

            // Check if tapping build menu buttons
            if (this.buildMenu.visible) {
                const action = Game.HUD.getBuildMenuAction(tap.x, tap.y);
                if (action) {
                    this.executeBuildAction(action);
                    this.buildMenu.visible = false;
                    return;
                }
                // Tap elsewhere closes menu
                this.buildMenu.visible = false;
                return;
            }

            // Convert tap to world coords and check tile
            const world = Game.Camera.screenToWorld(tap.x, tap.y);
            const tile = Game.Map.worldToTile(world.x, world.y);
            const tileType = Game.Map.getTile(tile.x, tile.y);

            if (tileType === Game.TileType.EMPTY) {
                this.buildMenu.visible = true;
                this.buildMenu.tileX = tile.x;
                this.buildMenu.tileY = tile.y;
                this.buildMenu.screenX = tap.x;
                this.buildMenu.screenY = tap.y;
                this.buildMenu.turret = null;
            } else if (tileType === Game.TileType.TURRET) {
                const turret = Game.TurretManager.getAt(tile.x, tile.y);
                if (turret) {
                    this.buildMenu.visible = true;
                    this.buildMenu.tileX = tile.x;
                    this.buildMenu.tileY = tile.y;
                    this.buildMenu.screenX = tap.x;
                    this.buildMenu.screenY = tap.y;
                    this.buildMenu.turret = turret;
                }
            }
        }
    },

    executeBuildAction(action) {
        const bm = this.buildMenu;
        switch (action) {
            case 'gun':
            case 'shotgun':
            case 'sniper':
                Game.TurretManager.place(bm.tileX, bm.tileY, action);
                break;
            case 'wall':
                Game.WallManager.place(bm.tileX, bm.tileY);
                break;
            case 'upgrade':
                if (bm.turret) Game.TurretManager.upgrade(bm.turret);
                break;
            case 'sell':
                if (bm.turret) {
                    const cfg = Game.Config.TURRET_TYPES[bm.turret.type];
                    Game.Economy.addCurrency(Math.floor(cfg.cost * 0.5));
                    Game.TurretManager.remove(bm.turret);
                }
                break;
            case 'upgrade_weapon':
                const cost = Game.Player.getWeaponUpgradeCost();
                if (cost > 0 && Game.Economy.spend(cost)) {
                    Game.Player.weaponLevel++;
                }
                break;
            case 'repair':
                Game.BaseHealth.repair();
                break;
        }
    }
};
