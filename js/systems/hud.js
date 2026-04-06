window.Game = window.Game || {};

Game.HUD = {
    _fightBtn: { x: 0, y: 0, w: 120, h: 50 },
    _radialButtons: [], // { cx, cy, r, action }

    getFightButtonRect() {
        const sw = Game.Config.INTERNAL_WIDTH;
        const sh = Game.Config.INTERNAL_HEIGHT;
        this._fightBtn.x = sw - 140;
        this._fightBtn.y = sh - 70;
        this._fightBtn.w = 120;
        this._fightBtn.h = 50;
        return this._fightBtn;
    },

    getRadialHit(tapX, tapY) {
        for (var i = 0; i < this._radialButtons.length; i++) {
            var btn = this._radialButtons[i];
            var dx = tapX - btn.cx;
            var dy = tapY - btn.cy;
            if (dx * dx + dy * dy <= btn.r * btn.r) {
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

        // Radial menu
        if (Game.Phase.radial.mode !== 'none') {
            this.drawRadialMenu(ctx, sw, sh);
        }
    },

    drawRadialMenu(ctx, sw, sh) {
        var r = Game.Phase.radial;
        this._radialButtons = [];

        // Advance animation
        r.animTimer += Game.Config.TICK_RATE;
        var anim = Math.min(1, r.animTimer / 200); // 200ms pop-in

        // Get tile center in screen coords
        var worldPos = Game.Map.tileToWorld(r.tileX, r.tileY);
        var screen = Game.Camera.worldToScreen(worldPos.x, worldPos.y);
        var cx = screen.x;
        var cy = screen.y;
        var ts = Game.Config.TILE_SIZE;

        // Draw tile highlight
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.strokeRect(cx - ts / 2, cy - ts / 2, ts, ts);
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        ctx.fillRect(cx - ts / 2, cy - ts / 2, ts, ts);

        var hasSomething = r.tileType === Game.TileType.TURRET || r.tileType === Game.TileType.WALL;

        if (r.mode === 'select') {
            // 3 radial buttons around tile
            var ringR = 50 * anim;
            var btnR = 22;
            // Angles: build=top-left, destroy=top-right, info=top
            var buttons = [
                { angle: -Math.PI / 2 - 0.8, action: 'build', label: '+', color: '#4a4', enabled: !hasSomething, tooltip: 'Build' },
                { angle: -Math.PI / 2 + 0.8, action: 'destroy', label: 'X', color: '#a44', enabled: hasSomething, tooltip: 'Destroy' },
                { angle: -Math.PI / 2, action: 'info', label: 'UP', color: '#48f', enabled: hasSomething && r.turret != null, tooltip: 'Upgrade' }
            ];

            for (var i = 0; i < buttons.length; i++) {
                var b = buttons[i];
                var bx = cx + Math.cos(b.angle) * ringR;
                var by = cy + Math.sin(b.angle) * ringR;

                this._drawRadialButton(ctx, bx, by, btnR * anim, b.label, b.color, b.enabled);
                if (b.enabled) {
                    this._radialButtons.push({ cx: bx, cy: by, r: btnR + 5, action: b.action });
                }

                // Tooltip below button
                ctx.fillStyle = b.enabled ? '#ddd' : '#666';
                ctx.font = '9px monospace';
                ctx.textAlign = 'center';
                ctx.fillText(b.tooltip, bx, by + btnR * anim + 12);
            }

            // Show info about what's on the tile
            if (r.turret) {
                var cfg = Game.Config.TURRET_TYPES[r.turret.type];
                ctx.fillStyle = 'rgba(0,0,0,0.7)';
                ctx.fillRect(cx - 65, cy + ts / 2 + 4, 130, 34);
                ctx.fillStyle = cfg.color;
                ctx.font = 'bold 11px monospace';
                ctx.textAlign = 'center';
                ctx.fillText(r.turret.type.toUpperCase() + ' Lv.' + (r.turret.level + 1), cx, cy + ts / 2 + 18);
                var nextLvl = r.turret.level + 1;
                if (nextLvl < Game.Config.UPGRADE_LEVELS.length) {
                    var cost = Game.Config.UPGRADE_LEVELS[nextLvl].cost;
                    ctx.fillStyle = Game.Economy.canAfford(cost) ? '#4f4' : '#f44';
                    ctx.fillText('Upgrade: $' + cost, cx, cy + ts / 2 + 32);
                } else {
                    ctx.fillStyle = '#ff4';
                    ctx.fillText('MAX LEVEL', cx, cy + ts / 2 + 32);
                }
            } else if (r.wall) {
                ctx.fillStyle = 'rgba(0,0,0,0.7)';
                ctx.fillRect(cx - 55, cy + ts / 2 + 4, 110, 20);
                ctx.fillStyle = '#a88050';
                ctx.font = 'bold 11px monospace';
                ctx.textAlign = 'center';
                ctx.fillText('WALL ' + Math.ceil(r.wall.health) + '/' + r.wall.maxHealth, cx, cy + ts / 2 + 18);
            }

        } else if (r.mode === 'build') {
            // Sub-ring: 4 build options + back button
            var ringR = 58 * anim;
            var btnR = 22;
            var options = [
                { angle: -Math.PI / 2 - 0.9, action: 'gun', label: 'GUN', color: '#4af', cost: Game.Config.TURRET_TYPES.gun.cost },
                { angle: -Math.PI / 2 - 0.3, action: 'shotgun', label: 'SHT', color: '#fa4', cost: Game.Config.TURRET_TYPES.shotgun.cost },
                { angle: -Math.PI / 2 + 0.3, action: 'sniper', label: 'SNP', color: '#f4a', cost: Game.Config.TURRET_TYPES.sniper.cost },
                { angle: -Math.PI / 2 + 0.9, action: 'wall', label: 'WAL', color: '#a88050', cost: Game.Config.WALL_COST }
            ];

            for (var i = 0; i < options.length; i++) {
                var o = options[i];
                var bx = cx + Math.cos(o.angle) * ringR;
                var by = cy + Math.sin(o.angle) * ringR;
                var canAfford = Game.Economy.canAfford(o.cost);

                this._drawRadialButton(ctx, bx, by, btnR * anim, o.label, o.color, canAfford);
                if (canAfford) {
                    this._radialButtons.push({ cx: bx, cy: by, r: btnR + 5, action: o.action });
                }

                // Cost label
                ctx.fillStyle = canAfford ? '#ddd' : '#666';
                ctx.font = '9px monospace';
                ctx.textAlign = 'center';
                ctx.fillText('$' + o.cost, bx, by + btnR * anim + 12);
            }

            // Back button below
            var backX = cx;
            var backY = cy + ringR * 0.9;
            this._drawRadialButton(ctx, backX, backY, 16 * anim, '<', '#888', true);
            this._radialButtons.push({ cx: backX, cy: backY, r: 20, action: 'back' });
            ctx.fillStyle = '#bbb';
            ctx.font = '9px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('Back', backX, backY + 16 * anim + 10);
        }
    },

    _drawRadialButton(ctx, cx, cy, r, label, color, enabled) {
        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.beginPath();
        ctx.arc(cx + 2, cy + 2, r, 0, Math.PI * 2);
        ctx.fill();

        // Button fill
        if (enabled) {
            ctx.fillStyle = color;
        } else {
            ctx.fillStyle = '#333';
        }
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();

        // Border
        ctx.strokeStyle = enabled ? '#fff' : '#555';
        ctx.lineWidth = enabled ? 2 : 1;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();

        // Label
        ctx.fillStyle = enabled ? '#fff' : '#666';
        ctx.font = 'bold ' + Math.max(8, Math.round(r * 0.6)) + 'px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, cx, cy);
        ctx.textBaseline = 'alphabetic';
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
