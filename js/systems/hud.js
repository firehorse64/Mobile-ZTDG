window.Game = window.Game || {};

Game.HUD = {
    _fightBtn: { x: 0, y: 0, w: 120, h: 50 },
    _buildButtons: [],

    getFightButtonRect() {
        const sw = Game.Config.INTERNAL_WIDTH;
        const sh = Game.Config.INTERNAL_HEIGHT;
        this._fightBtn.x = sw - 140;
        this._fightBtn.y = sh - 70;
        this._fightBtn.w = 120;
        this._fightBtn.h = 50;
        return this._fightBtn;
    },

    getBuildMenuAction(tapX, tapY) {
        for (const btn of this._buildButtons) {
            if (tapX >= btn.x && tapX <= btn.x + btn.w &&
                tapY >= btn.y && tapY <= btn.y + btn.h) {
                return btn.action;
            }
        }
        return null;
    },

    draw(ctx) {
        const sw = Game.Config.INTERNAL_WIDTH;
        const sh = Game.Config.INTERNAL_HEIGHT;
        const phase = Game.Phase.current;

        ctx.save();

        // Top bar: currency, wave, base health
        if (phase !== 'title') {
            this.drawTopBar(ctx, sw);
        }

        // Phase-specific UI
        if (phase === 'title') {
            this.drawTitle(ctx, sw, sh);
        } else if (phase === 'build') {
            this.drawBuildUI(ctx, sw, sh);
        } else if (phase === 'combat' || phase === 'combat_countdown') {
            this.drawCombatUI(ctx, sw, sh);
        } else if (phase === 'game_over') {
            this.drawGameOver(ctx, sw, sh);
        }

        // Center message (skip on title and game_over since they draw their own)
        if (Game.Phase.message && phase !== 'title' && phase !== 'game_over') {
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 28px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(Game.Phase.message, sw / 2, sh / 2 - 60);
        }

        // Joystick visual (build phase)
        if (phase === 'build' && Game.Input.joystick.active) {
            this.drawJoystick(ctx);
        }

        ctx.restore();
    },

    drawTopBar(ctx, sw) {
        // Background
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(0, 0, sw, 44);

        ctx.font = 'bold 16px monospace';
        ctx.textAlign = 'left';

        // Currency
        ctx.fillStyle = '#fd0';
        ctx.fillText('$' + Game.Economy.currency, 10, 28);

        // Wave
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.fillText('Wave ' + Math.max(1, Game.Wave.number), sw / 2, 28);

        // Base health bar
        ctx.textAlign = 'right';
        const bhPct = Game.BaseHealth.current / Game.BaseHealth.max;
        const barX = sw - 160;
        const barW = 140;
        ctx.fillStyle = '#333';
        ctx.fillRect(barX, 12, barW, 20);
        ctx.fillStyle = bhPct > 0.5 ? '#4a4' : bhPct > 0.25 ? '#aa4' : '#a44';
        ctx.fillRect(barX, 12, barW * bhPct, 20);
        ctx.strokeStyle = '#888';
        ctx.strokeRect(barX, 12, barW, 20);
        ctx.fillStyle = '#fff';
        ctx.font = '12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(Math.ceil(Game.BaseHealth.current) + '/' + Game.BaseHealth.max, barX + barW / 2, 26);
    },

    drawTitle(ctx, sw, sh) {
        // Dark background with subtle gradient feel
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, sw, sh);

        // Decorative border
        ctx.strokeStyle = '#4a4';
        ctx.lineWidth = 3;
        ctx.strokeRect(40, sh / 2 - 120, sw - 80, 230);

        // Title
        ctx.fillStyle = '#6f6';
        ctx.font = 'bold 40px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('ZOMBIE', sw / 2, sh / 2 - 55);

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 30px monospace';
        ctx.fillText('TOWER DEFENSE', sw / 2, sh / 2 - 15);

        // Tap prompt (pulsing)
        var pulse = 0.6 + 0.4 * Math.sin(Date.now() / 400);
        ctx.fillStyle = 'rgba(255,255,100,' + pulse + ')';
        ctx.font = 'bold 22px monospace';
        ctx.fillText('TAP TO START', sw / 2, sh / 2 + 50);

        ctx.fillStyle = '#aaa';
        ctx.font = '14px monospace';
        ctx.fillText('Build defenses, then man the gun!', sw / 2, sh / 2 + 90);
    },

    // Track if user has interacted so we can fade hints
    _buildHintTimer: 8000,

    drawBuildUI(ctx, sw, sh) {
        // Joystick zone indicator (left side)
        var joyZoneW = Math.round(sw * 0.35);
        if (!Game.Input.joystick.active) {
            ctx.fillStyle = 'rgba(255,255,255,0.03)';
            ctx.fillRect(0, 44, joyZoneW, sh - 44);
            ctx.strokeStyle = 'rgba(255,255,255,0.08)';
            ctx.lineWidth = 1;
            ctx.setLineDash([6, 6]);
            ctx.beginPath();
            ctx.moveTo(joyZoneW, 44);
            ctx.lineTo(joyZoneW, sh);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // Joystick zone label (fades over time)
        var hintAlpha = Math.max(0, Math.min(1, this._buildHintTimer / 2000));
        if (hintAlpha > 0) {
            this._buildHintTimer -= Game.Config.TICK_RATE;

            // Left zone label
            ctx.fillStyle = 'rgba(200,200,255,' + (hintAlpha * 0.6) + ')';
            ctx.font = 'bold 14px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('DRAG TO', joyZoneW / 2, sh / 2 - 10);
            ctx.fillText('MOVE', joyZoneW / 2, sh / 2 + 10);

            // Right zone label
            ctx.fillStyle = 'rgba(200,255,200,' + (hintAlpha * 0.6) + ')';
            ctx.fillText('TAP TILES', joyZoneW + (sw - joyZoneW) / 2, sh / 2 - 10);
            ctx.fillText('TO BUILD', joyZoneW + (sw - joyZoneW) / 2, sh / 2 + 10);
        }

        // FIGHT button
        const btn = this.getFightButtonRect();
        ctx.fillStyle = '#a33';
        ctx.fillRect(btn.x, btn.y, btn.w, btn.h);
        ctx.strokeStyle = '#f44';
        ctx.lineWidth = 2;
        ctx.strokeRect(btn.x, btn.y, btn.w, btn.h);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 18px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('FIGHT!', btn.x + btn.w / 2, btn.y + 32);

        // Player weapon info
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(10, sh - 60, 170, 50);
        ctx.strokeStyle = 'rgba(150,150,255,0.3)';
        ctx.lineWidth = 1;
        ctx.strokeRect(10, sh - 60, 170, 50);
        ctx.fillStyle = '#aaf';
        ctx.font = '13px monospace';
        ctx.textAlign = 'left';
        ctx.fillText('Weapon Lv.' + (Game.Player.weaponLevel + 1), 18, sh - 40);
        const wCost = Game.Player.getWeaponUpgradeCost();
        if (wCost > 0) {
            ctx.fillStyle = Game.Economy.canAfford(wCost) ? '#4f4' : '#888';
            ctx.fillText('Tap: Upgrade $' + wCost, 18, sh - 22);
        } else {
            ctx.fillStyle = '#ff4';
            ctx.fillText('MAX LEVEL', 18, sh - 22);
        }

        // Build menu
        if (Game.Phase.buildMenu.visible) {
            this.drawBuildMenu(ctx, sw, sh);
        }
    },

    drawBuildMenu(ctx, sw, sh) {
        const bm = Game.Phase.buildMenu;
        this._buildButtons = [];

        let menuX = bm.screenX - 100;
        let menuY = bm.screenY - 180;
        menuX = Math.max(5, Math.min(menuX, sw - 210));
        menuY = Math.max(50, Math.min(menuY, sh - 250));

        ctx.fillStyle = 'rgba(0,0,0,0.85)';
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 1;

        if (bm.turret) {
            // Upgrade menu for existing turret
            const menuW = 200;
            const menuH = 140;
            ctx.fillRect(menuX, menuY, menuW, menuH);
            ctx.strokeRect(menuX, menuY, menuW, menuH);

            ctx.fillStyle = '#fff';
            ctx.font = 'bold 14px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(bm.turret.type.toUpperCase() + ' Lv.' + (bm.turret.level + 1), menuX + menuW / 2, menuY + 22);

            // Upgrade button
            const nextLevel = bm.turret.level + 1;
            if (nextLevel < Game.Config.UPGRADE_LEVELS.length) {
                const cost = Game.Config.UPGRADE_LEVELS[nextLevel].cost;
                const canAfford = Game.Economy.canAfford(cost);
                this._addButton(ctx, menuX + 10, menuY + 35, 180, 38,
                    'Upgrade $' + cost, 'upgrade', canAfford ? '#358' : '#333', canAfford);
            }

            // Sell button
            const sellVal = Math.floor(Game.Config.TURRET_TYPES[bm.turret.type].cost * 0.5);
            this._addButton(ctx, menuX + 10, menuY + 80, 180, 38,
                'Sell +$' + sellVal, 'sell', '#633', true);

        } else {
            // Build menu for empty tile
            const menuW = 200;
            const menuH = 260;
            ctx.fillRect(menuX, menuY, menuW, menuH);
            ctx.strokeRect(menuX, menuY, menuW, menuH);

            ctx.fillStyle = '#fff';
            ctx.font = 'bold 14px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('BUILD', menuX + menuW / 2, menuY + 22);

            let y = menuY + 32;
            const types = ['gun', 'shotgun', 'sniper'];
            for (const type of types) {
                const cfg = Game.Config.TURRET_TYPES[type];
                const canAfford = Game.Economy.canAfford(cfg.cost);
                this._addButton(ctx, menuX + 10, y, 180, 38,
                    type.toUpperCase() + ' $' + cfg.cost, type,
                    canAfford ? cfg.color + '44' : '#333', canAfford);
                y += 44;
            }

            // Wall
            const wallAfford = Game.Economy.canAfford(Game.Config.WALL_COST);
            this._addButton(ctx, menuX + 10, y, 180, 38,
                'WALL $' + Game.Config.WALL_COST, 'wall',
                wallAfford ? '#654' : '#333', wallAfford);
            y += 44;

            // Repair base
            if (Game.BaseHealth.current < Game.BaseHealth.max) {
                const repairAfford = Game.Economy.canAfford(Game.Config.REPAIR_COST);
                this._addButton(ctx, menuX + 10, y, 180, 38,
                    'REPAIR BASE $' + Game.Config.REPAIR_COST, 'repair',
                    repairAfford ? '#464' : '#333', repairAfford);
            }
        }
    },

    _addButton(ctx, x, y, w, h, text, action, bgColor, enabled) {
        ctx.fillStyle = bgColor;
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = enabled ? '#aaa' : '#555';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, w, h);
        ctx.fillStyle = enabled ? '#fff' : '#666';
        ctx.font = 'bold 13px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(text, x + w / 2, y + h / 2 + 5);

        this._buildButtons.push({ x, y, w, h, action });
    },

    _combatHintTimer: 4000,

    drawCombatUI(ctx, sw, sh) {
        // Wave info bar
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(0, sh - 36, sw, 36);

        ctx.fillStyle = '#aaa';
        ctx.font = '13px monospace';
        ctx.textAlign = 'left';
        ctx.fillText('Zombies: ' + Game.ZombieManager.pool.count, 10, sh - 14);

        ctx.textAlign = 'right';
        ctx.fillText('Killed: ' + Game.Wave.killedCount + '/' + Game.Wave.totalZombies, sw - 10, sh - 14);

        // Aim hint (fades after a few seconds)
        if (!Game.Input.aim.active && this._combatHintTimer > 0) {
            this._combatHintTimer -= Game.Config.TICK_RATE;
            var alpha = Math.min(1, this._combatHintTimer / 1500);
            ctx.fillStyle = 'rgba(255,200,200,' + alpha + ')';
            ctx.font = 'bold 18px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('TOUCH & DRAG TO AIM', sw / 2, sh / 2 + 80);
            ctx.font = '13px monospace';
            ctx.fillText('Auto-fires while touching', sw / 2, sh / 2 + 105);
        }

        // Crosshair at aim position
        if (Game.Input.aim.active) {
            ctx.strokeStyle = 'rgba(255,50,50,0.7)';
            ctx.lineWidth = 2;
            const ax = Game.Input.aim.x;
            const ay = Game.Input.aim.y;
            ctx.beginPath();
            ctx.arc(ax, ay, 15, 0, Math.PI * 2);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(ax - 20, ay);
            ctx.lineTo(ax + 20, ay);
            ctx.moveTo(ax, ay - 20);
            ctx.lineTo(ax, ay + 20);
            ctx.stroke();
        }

        // Player health bar (bottom center)
        const phPct = Game.Player.health / Game.Player.maxHealth;
        const phBarW = 100;
        const phBarX = sw / 2 - phBarW / 2;
        ctx.fillStyle = '#333';
        ctx.fillRect(phBarX, sh - 55, phBarW, 12);
        ctx.fillStyle = phPct > 0.5 ? '#4a4' : '#a44';
        ctx.fillRect(phBarX, sh - 55, phBarW * phPct, 12);
    },

    drawGameOver(ctx, sw, sh) {
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(0, 0, sw, sh);

        ctx.fillStyle = '#f44';
        ctx.font = 'bold 36px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('GAME OVER', sw / 2, sh / 2 - 40);

        ctx.fillStyle = '#fff';
        ctx.font = '18px monospace';
        ctx.fillText('Survived ' + Game.Wave.number + ' waves', sw / 2, sh / 2 + 10);

        ctx.fillStyle = '#888';
        ctx.font = '14px monospace';
        ctx.fillText('Tap to restart', sw / 2, sh / 2 + 50);
    },

    drawJoystick(ctx) {
        const joy = Game.Input.joystick;
        const r = Game.Config.JOYSTICK_RADIUS;

        // Base circle
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(joy.startX, joy.startY, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Thumb circle
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.beginPath();
        ctx.arc(joy.startX + joy.dx * r, joy.startY + joy.dy * r, 20, 0, Math.PI * 2);
        ctx.fill();
    }
};
