window.Game = window.Game || {};
Game.HUD = {
    screen: 'none', message: '', messageTimer: 0,
    craftStation: null, craftScroll: 0, selectedBuildItem: null,
    _buttons: [],

    isScreenOpen() { return this.screen !== 'none'; },
    showMessage(text) { this.message = text; this.messageTimer = 2000; },

    draw(ctx) {
        var sw = Game.Config.INTERNAL_WIDTH, sh = Game.Config.INTERNAL_HEIGHT;
        ctx.save();
        this._buttons = [];
        if (this.screen === 'none') this.drawGameHUD(ctx, sw, sh);
        else if (this.screen === 'inventory') this.drawInventory(ctx, sw, sh);
        else if (this.screen === 'crafting') this.drawCrafting(ctx, sw, sh);
        else if (this.screen === 'skills') this.drawSkills(ctx, sw, sh);
        else if (this.screen === 'map') this.drawMap(ctx, sw, sh);
        else if (this.screen === 'menu') this.drawMenu(ctx, sw, sh);
        else if (this.screen === 'build') this.drawBuild(ctx, sw, sh);
        // Always draw action buttons on top
        this.drawActionButtons(ctx, sw, sh);
        // Floating message
        if (this.messageTimer > 0) {
            var a = Math.min(1, this.messageTimer / 500);
            ctx.fillStyle = 'rgba(255,255,255,' + a + ')';
            ctx.font = 'bold 14px monospace'; ctx.textAlign = 'center';
            ctx.fillText(this.message, sw / 2, sh / 2 - 40);
        }
        ctx.restore();
    },

    handleTap(x, y) {
        // Check in reverse order so buttons drawn on top (action buttons) get priority
        for (var i = this._buttons.length - 1; i >= 0; i--) {
            var b = this._buttons[i];
            if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
                if (b.action) b.action();
                return true;
            }
        }
        return false;
    },

    _btn(ctx, x, y, w, h, text, color, action, enabled) {
        if (enabled === undefined) enabled = true;
        ctx.fillStyle = enabled ? color : '#333';
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = enabled ? '#888' : '#444'; ctx.lineWidth = 1;
        ctx.strokeRect(x, y, w, h);
        ctx.fillStyle = enabled ? '#fff' : '#666';
        ctx.font = 'bold 11px monospace'; ctx.textAlign = 'center';
        ctx.fillText(text, x + w / 2, y + h / 2 + 4);
        if (enabled && action) this._buttons.push({ x: x, y: y, w: w, h: h, action: action });
    },

    _bar(ctx, x, y, w, h, pct, color, bgColor) {
        ctx.fillStyle = bgColor || '#222'; ctx.fillRect(x, y, w, h);
        ctx.fillStyle = color; ctx.fillRect(x, y, w * Math.max(0, Math.min(1, pct)), h);
        ctx.strokeStyle = '#444'; ctx.lineWidth = 0.5; ctx.strokeRect(x, y, w, h);
    },

    drawGameHUD(ctx, sw, sh) {
        var p = Game.Player, c = Game.Config;

        // Status bars - top
        ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0, 0, sw, 52);
        var bw = sw / 2 - 10, bh = 8, bx = 5, by = 4;
        this._bar(ctx, bx, by, bw, bh, p.health / p.maxHealth, '#d44');
        this._bar(ctx, bx, by + 12, bw, bh, p.hunger / c.MAX_HUNGER, '#da4');
        this._bar(ctx, bx + bw + 10, by, bw, bh, p.thirst / c.MAX_THIRST, '#48d');
        this._bar(ctx, bx + bw + 10, by + 12, bw, bh, p.stamina / p.getMaxStamina(), '#4a4');
        // Labels
        ctx.fillStyle = '#fff'; ctx.font = '8px monospace'; ctx.textAlign = 'left';
        ctx.fillText('HP:' + Math.ceil(p.health), bx + 2, by + 7);
        ctx.fillText('Food:' + Math.ceil(p.hunger), bx + 2, by + 19);
        ctx.textAlign = 'right';
        ctx.fillText('Water:' + Math.ceil(p.thirst), bx + bw * 2 + 5, by + 7);
        ctx.fillText('Stam:' + Math.ceil(p.stamina), bx + bw * 2 + 5, by + 19);
        // Day/time + level
        ctx.fillStyle = '#aaa'; ctx.font = '10px monospace'; ctx.textAlign = 'center';
        ctx.fillText(Game.Survival.getDayString() + '  Lv.' + p.level, sw / 2, 40);
        // XP bar
        var xpNeeded = p.level * c.XP_PER_LEVEL;
        this._bar(ctx, 5, 44, sw - 10, 4, p.xp / xpNeeded, '#a8f', '#222');

        // Weapon display
        var weaponCfg = p.weapon ? c.ITEMS[p.weapon] : c.ITEMS.fists;
        ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(sw - 100, 55, 95, 20);
        ctx.fillStyle = weaponCfg.icon || '#aaa'; ctx.fillRect(sw - 96, 58, 12, 14);
        ctx.fillStyle = '#ddd'; ctx.font = '10px monospace'; ctx.textAlign = 'left';
        ctx.fillText(weaponCfg.name, sw - 80, 69);
        if (weaponCfg.ammo) {
            var ammoCount = Game.Inventory.countItem(weaponCfg.ammo);
            ctx.fillStyle = ammoCount > 0 ? '#fa4' : '#f44';
            ctx.fillText('[' + ammoCount + ']', sw - 80 + ctx.measureText(weaponCfg.name).width + 4, 69);
        }

        // Quickbar - bottom center
        var qbW = 42, qbH = 42, qbY = sh - qbH - 8, qbStartX = (sw - qbW * 5 - 16) / 2;
        ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(qbStartX - 4, qbY - 4, qbW * 5 + 24, qbH + 8);
        for (var i = 0; i < 5; i++) {
            var qx = qbStartX + i * (qbW + 4);
            var itemId = Game.Inventory.quickbar[i];
            var isActive = itemId && itemId === p.weapon;
            ctx.fillStyle = isActive ? '#456' : '#222'; ctx.fillRect(qx, qbY, qbW, qbH);
            ctx.strokeStyle = isActive ? '#8af' : '#555'; ctx.lineWidth = 1; ctx.strokeRect(qx, qbY, qbW, qbH);
            if (itemId) {
                var cfg = c.ITEMS[itemId];
                if (cfg) {
                    ctx.fillStyle = cfg.icon || '#888'; ctx.fillRect(qx + 8, qbY + 6, 26, 20);
                    ctx.fillStyle = '#ddd'; ctx.font = '8px monospace'; ctx.textAlign = 'center';
                    ctx.fillText(cfg.name.substring(0, 5), qx + qbW / 2, qbY + 38);
                    var qty = Game.Inventory.countItem(itemId);
                    if (qty > 1) { ctx.fillStyle = '#ff4'; ctx.fillText('' + qty, qx + qbW - 8, qbY + 12); }
                }
            }
            ctx.fillStyle = '#666'; ctx.font = '8px monospace'; ctx.textAlign = 'center';
            ctx.fillText('' + (i + 1), qx + 6, qbY + 10);
            var idx = i;
            this._buttons.push({ x: qx, y: qbY, w: qbW, h: qbH, action: (function(ii) { return function() {
                var id = Game.Inventory.quickbar[ii];
                if (id) Game.Player.useItem(id);
            }; })(idx) });
        }

        // Context buttons - search/use
        var self = this;
        var tile = Game.World.worldToTile(p.x, p.y);
        // Check adjacent tiles for scavenge
        var canSearch = false;
        for (var dy = -1; dy <= 1; dy++)
            for (var dx = -1; dx <= 1; dx++)
                if (Game.World.canScavenge(tile.x + dx, tile.y + dy)) canSearch = true;
        if (canSearch) {
            this._btn(ctx, sw / 2 - 45, sh - 260, 90, 32, 'SEARCH', '#654', function() {
                var t = Game.World.worldToTile(p.x, p.y);
                for (var dy = -1; dy <= 1; dy++)
                    for (var dx = -1; dx <= 1; dx++)
                        if (Game.World.canScavenge(t.x + dx, t.y + dy)) {
                            var r = Game.Building.scavenge(t.x + dx, t.y + dy);
                            if (r) self.showMessage(r);
                            return;
                        }
            });
        }
        // Check nearby structures for interaction
        for (var si = 0; si < Game.World.structures.length; si++) {
            var s = Game.World.structures[si];
            var dx = s.x - p.x, dy = s.y - p.y;
            if (dx * dx + dy * dy < 80 * 80) {
                var label = 'USE';
                if (s.type === 'campfire') label = 'COOK';
                else if (s.type === 'purifier') label = 'PURIFY';
                else if (s.type === 'storage') label = 'STORE';
                else if (s.type === 'farm_plot') label = s.data.crop ? (s.data.growth >= (Game.Config.CROPS[s.data.crop] || {}).growTime ? 'HARVEST' : 'WATER') : 'PLANT';
                else if (s.type === 'rain_collector' || s.type === 'well') label = 'COLLECT';
                this._btn(ctx, sw / 2 - 45, sh - 300, 90, 32, label, '#456', (function(str) { return function() {
                    var result = Game.Building.interact(str);
                    if (result === 'campfire') { self.craftStation = 'campfire'; self.craftScroll = 0; self.screen = 'crafting'; }
                    else if (result === 'purifier') { self.craftStation = 'purifier'; self.craftScroll = 0; self.screen = 'crafting'; }
                    else if (result === 'storage') { self.showMessage('Storage not yet available'); }
                    else if (result === 'plant') { self.showMessage('Need seeds to plant'); }
                    else if (result) { self.showMessage(result); }
                }; })(s));
                break;
            }
        }

        // Joystick visual
        if (Game.Input.joystick.active) {
            var j = Game.Input.joystick, r = Game.Config.JOYSTICK_RADIUS;
            ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(j.startX, j.startY, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
            ctx.fillStyle = 'rgba(255,255,255,0.3)';
            ctx.beginPath(); ctx.arc(j.startX + j.dx * r, j.startY + j.dy * r, 18, 0, Math.PI * 2); ctx.fill();
        }

        // Aim joystick visual
        if (Game.Input.aim.active) {
            var a = Game.Input.aim, r = Game.Config.JOYSTICK_RADIUS;
            ctx.fillStyle = 'rgba(255,80,80,0.08)'; ctx.strokeStyle = 'rgba(255,80,80,0.25)'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(a.startX, a.startY, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
            ctx.fillStyle = 'rgba(255,80,80,0.35)';
            ctx.beginPath(); ctx.arc(a.startX + a.dx * r, a.startY + a.dy * r, 18, 0, Math.PI * 2); ctx.fill();
        }
    },

    drawInventory(ctx, sw, sh) {
        var self = this;
        ctx.fillStyle = 'rgba(0,0,0,0.85)'; ctx.fillRect(10, 10, sw - 60, sh - 20);
        ctx.fillStyle = '#fff'; ctx.font = 'bold 16px monospace'; ctx.textAlign = 'center';
        ctx.fillText('INVENTORY', sw / 2, 35);

        // Weapon slot
        ctx.fillStyle = '#333'; ctx.fillRect(20, 45, sw - 40, 35);
        ctx.strokeStyle = '#8af'; ctx.strokeRect(20, 45, sw - 40, 35);
        var wCfg = Game.Player.weapon ? Game.Config.ITEMS[Game.Player.weapon] : null;
        ctx.fillStyle = '#aaa'; ctx.font = '11px monospace'; ctx.textAlign = 'left';
        ctx.fillText('Weapon: ' + (wCfg ? wCfg.name : 'Fists'), 28, 67);
        if (wCfg) {
            this._buttons.push({ x: 20, y: 45, w: sw - 40, h: 35, action: function() { Game.Player.weapon = null; self.showMessage('Unequipped'); } });
        }

        // Item grid
        var cols = 6, slotW = Math.floor((sw - 40) / cols), slotH = 48;
        var startY = 90;
        for (var i = 0; i < Game.Config.INVENTORY_SLOTS; i++) {
            var col = i % cols, row = Math.floor(i / cols);
            var sx = 20 + col * slotW, sy = startY + row * slotH;
            var slot = Game.Inventory.slots[i];
            ctx.fillStyle = slot ? '#2a2a2a' : '#1a1a1a'; ctx.fillRect(sx, sy, slotW - 2, slotH - 2);
            ctx.strokeStyle = '#444'; ctx.lineWidth = 0.5; ctx.strokeRect(sx, sy, slotW - 2, slotH - 2);
            if (slot) {
                var cfg = Game.Config.ITEMS[slot.id];
                if (cfg) {
                    ctx.fillStyle = cfg.icon || '#888'; ctx.fillRect(sx + 6, sy + 4, slotW - 14, 22);
                    ctx.fillStyle = '#ddd'; ctx.font = '8px monospace'; ctx.textAlign = 'center';
                    ctx.fillText(cfg.name.substring(0, 7), sx + slotW / 2, sy + 38);
                    if (slot.qty > 1) { ctx.fillStyle = '#ff4'; ctx.textAlign = 'right'; ctx.fillText('' + slot.qty, sx + slotW - 6, sy + 14); }
                }
                this._buttons.push({ x: sx, y: sy, w: slotW - 2, h: slotH - 2, action: (function(s, idx) { return function() {
                    var consumed = Game.Player.useItem(s.id);
                    if (consumed) Game.Inventory.removeItem(s.id, 1);
                    // Also set on quickbar
                    var cfg = Game.Config.ITEMS[s.id];
                    if (cfg && (cfg.type === 'melee' || cfg.type === 'ranged')) {
                        for (var q = 0; q < 5; q++) { if (!Game.Inventory.quickbar[q]) { Game.Inventory.quickbar[q] = s.id; break; } }
                    }
                    self.showMessage('Used ' + cfg.name);
                }; })(slot, i) });
            }
        }

        // Quickbar assignment hint
        ctx.fillStyle = '#666'; ctx.font = '10px monospace'; ctx.textAlign = 'center';
        ctx.fillText('Tap item to use/equip', sw / 2, sh - 30);
    },

    drawCrafting(ctx, sw, sh) {
        var self = this;
        ctx.fillStyle = 'rgba(0,0,0,0.85)'; ctx.fillRect(10, 10, sw - 60, sh - 20);
        var title = this.craftStation ? this.craftStation.toUpperCase() + ' CRAFTING' : 'CRAFTING';
        ctx.fillStyle = '#fff'; ctx.font = 'bold 16px monospace'; ctx.textAlign = 'center';
        ctx.fillText(title, sw / 2, 35);

        var recipes = Game.Crafting.getAvailableRecipes(this.craftStation);
        var itemH = 55, startY = 50 - this.craftScroll, maxY = sh - 30;
        for (var i = 0; i < recipes.length; i++) {
            var ry = startY + i * itemH;
            if (ry + itemH < 50 || ry > maxY) continue;
            var r = recipes[i], rc = r.recipe, can = r.canCraft;
            ctx.fillStyle = can ? '#2a2a3a' : '#1a1a1a'; ctx.fillRect(20, ry, sw - 40, itemH - 4);
            ctx.strokeStyle = can ? '#558' : '#333'; ctx.lineWidth = 0.5; ctx.strokeRect(20, ry, sw - 40, itemH - 4);
            var resultCfg = Game.Config.ITEMS[rc.result];
            ctx.fillStyle = can ? '#fff' : '#666'; ctx.font = 'bold 11px monospace'; ctx.textAlign = 'left';
            ctx.fillText((resultCfg ? resultCfg.name : rc.result) + ' x' + rc.qty, 28, ry + 16);
            ctx.fillStyle = can ? '#aaa' : '#555'; ctx.font = '9px monospace';
            var ingText = '';
            for (var j = 0; j < rc.ingredients.length; j++) {
                var ing = rc.ingredients[j], have = Game.Inventory.countItem(ing[0]);
                var iCfg = Game.Config.ITEMS[ing[0]];
                ingText += (iCfg ? iCfg.name : ing[0]) + ':' + have + '/' + ing[1] + '  ';
            }
            ctx.fillText(ingText, 28, ry + 32);
            if (rc.station) { ctx.fillStyle = '#a86'; ctx.fillText('Needs: ' + rc.station, 28, ry + 44); }
            if (can) {
                this._btn(ctx, sw - 80, ry + 8, 50, 30, 'CRAFT', '#464', (function(ri) { return function() {
                    if (Game.Crafting.craft(ri)) self.showMessage('Crafted!');
                    else self.showMessage('Cannot craft');
                }; })(r.index));
            }
        }
        // Scroll buttons
        if (this.craftScroll > 0) this._btn(ctx, sw / 2 - 30, 50, 60, 20, 'UP', '#444', function() { self.craftScroll = Math.max(0, self.craftScroll - 110); });
        if (recipes.length * itemH > sh - 80)
            this._btn(ctx, sw / 2 - 30, sh - 30, 60, 20, 'DOWN', '#444', function() { self.craftScroll += 110; });
    },

    drawSkills(ctx, sw, sh) {
        var self = this, p = Game.Player;
        ctx.fillStyle = 'rgba(0,0,0,0.85)'; ctx.fillRect(10, 10, sw - 60, sh - 20);
        ctx.fillStyle = '#fff'; ctx.font = 'bold 16px monospace'; ctx.textAlign = 'center';
        ctx.fillText('SKILLS  (Points: ' + p.skillPoints + ')', sw / 2, 35);

        var trees = ['combat', 'survival', 'building', 'farming'];
        var ty = 50, treeH = (sh - 80) / 4;
        for (var ti = 0; ti < trees.length; ti++) {
            var treeName = trees[ti], treeCfg = Game.Config.SKILL_TREES[treeName];
            ctx.fillStyle = '#334'; ctx.fillRect(20, ty, sw - 40, treeH - 5);
            ctx.fillStyle = '#aaf'; ctx.font = 'bold 12px monospace'; ctx.textAlign = 'left';
            ctx.fillText(treeCfg.name, 28, ty + 16);
            for (var si = 0; si < treeCfg.skills.length; si++) {
                var skill = treeCfg.skills[si], level = p.skills[treeName][si];
                var sy = ty + 22 + si * 22;
                ctx.fillStyle = level > 0 ? '#ddd' : '#888'; ctx.font = '10px monospace';
                ctx.fillText(skill.name + ' [' + level + '/' + skill.maxLevel + ']', 32, sy + 12);
                ctx.fillStyle = '#666'; ctx.font = '8px monospace';
                ctx.fillText(skill.desc, 32, sy + 22);
                if (p.skillPoints > 0 && level < skill.maxLevel) {
                    this._btn(ctx, sw - 60, sy + 2, 24, 20, '+', '#464', (function(t, s) { return function() { Game.Skills.upgrade(t, s); }; })(treeName, si));
                }
            }
            ty += treeH;
        }
    },

    drawMap(ctx, sw, sh) {
        var self = this;
        ctx.fillStyle = 'rgba(0,0,0,0.9)'; ctx.fillRect(10, 10, sw - 60, sh - 20);
        ctx.fillStyle = '#fff'; ctx.font = 'bold 16px monospace'; ctx.textAlign = 'center';
        ctx.fillText('MAP', sw / 2, 35);

        var wc = Game.Config.WORLD_CHUNKS, cs = Game.Config.CHUNK_SIZE;
        var mapSize = Math.min(sw - 40, sh - 80);
        var cellSize = mapSize / wc;
        var mx = (sw - mapSize) / 2, my = 50;
        var tileColors = ['#332', '#444', '#555', '#443', '#338', '#363', '#3a3', '#865', '#a86', '#556', '#653'];

        for (var cy = 0; cy < wc; cy++) {
            for (var cx = 0; cx < wc; cx++) {
                var px = mx + cx * cellSize, py = my + cy * cellSize;
                if (!Game.World.isRevealed(cx, cy)) { ctx.fillStyle = '#111'; ctx.fillRect(px, py, cellSize, cellSize); continue; }
                // Sample center tile of chunk
                var tx = cx * cs + Math.floor(cs / 2), ty = cy * cs + Math.floor(cs / 2);
                var t = Game.World.getTile(tx, ty);
                ctx.fillStyle = (t >= 0 && t < tileColors.length) ? tileColors[t] : '#222';
                ctx.fillRect(px, py, cellSize, cellSize);
            }
        }
        // Player dot
        var pChunkX = Game.Player.x / (cs * Game.Config.TILE_SIZE);
        var pChunkY = Game.Player.y / (cs * Game.Config.TILE_SIZE);
        ctx.fillStyle = '#4af';
        ctx.beginPath(); ctx.arc(mx + pChunkX * cellSize, my + pChunkY * cellSize, 3, 0, Math.PI * 2); ctx.fill();
        // Grid
        ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.lineWidth = 0.5;
        for (var i = 0; i <= wc; i++) {
            ctx.beginPath(); ctx.moveTo(mx + i * cellSize, my); ctx.lineTo(mx + i * cellSize, my + mapSize); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(mx, my + i * cellSize); ctx.lineTo(mx + mapSize, my + i * cellSize); ctx.stroke();
        }
    },

    drawMenu(ctx, sw, sh) {
        var self = this;
        ctx.fillStyle = 'rgba(0,0,0,0.85)'; ctx.fillRect(sw / 2 - 100, sh / 2 - 120, 200, 240);
        ctx.fillStyle = '#fff'; ctx.font = 'bold 16px monospace'; ctx.textAlign = 'center';
        ctx.fillText('MENU', sw / 2, sh / 2 - 95);
        var by = sh / 2 - 70;
        this._btn(ctx, sw / 2 - 80, by, 160, 36, 'SAVE GAME', '#464', function() {
            if (Game.Save.save()) self.showMessage('Game saved!');
            else self.showMessage('Save failed');
        });
        this._btn(ctx, sw / 2 - 80, by + 44, 160, 36, 'LOAD GAME', '#456', function() {
            if (Game.Save.load()) { self.showMessage('Game loaded!'); self.screen = 'none'; Game.Renderer.init(); }
            else self.showMessage('No save found');
        }, Game.Save.hasSave());
        this._btn(ctx, sw / 2 - 80, by + 88, 160, 36, 'NEW GAME', '#633', function() {
            Game.State.newGame(); self.screen = 'none';
        });
    },

    drawBuild(ctx, sw, sh) {
        var self = this;
        ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, sh - 90, sw, 90);
        ctx.fillStyle = '#fff'; ctx.font = 'bold 12px monospace'; ctx.textAlign = 'center';
        ctx.fillText('BUILD MODE - Tap tile to place', sw / 2, sh - 75);

        // Show buildable items from inventory
        var buildItems = [];
        for (var i = 0; i < Game.Inventory.slots.length; i++) {
            var slot = Game.Inventory.slots[i];
            if (slot && Game.Config.ITEMS[slot.id] && Game.Config.ITEMS[slot.id].type === 'building') {
                var exists = false;
                for (var j = 0; j < buildItems.length; j++) if (buildItems[j].id === slot.id) { exists = true; break; }
                if (!exists) buildItems.push({ id: slot.id, qty: Game.Inventory.countItem(slot.id) });
            }
        }
        var bw = 60, bx = 10;
        for (var i = 0; i < buildItems.length; i++) {
            var bi = buildItems[i], cfg = Game.Config.ITEMS[bi.id];
            var isSelected = self.selectedBuildItem === bi.id;
            ctx.fillStyle = isSelected ? '#456' : '#222'; ctx.fillRect(bx, sh - 58, bw, 48);
            ctx.strokeStyle = isSelected ? '#8af' : '#555'; ctx.lineWidth = 1; ctx.strokeRect(bx, sh - 58, bw, 48);
            ctx.fillStyle = cfg.icon || '#888'; ctx.fillRect(bx + 8, sh - 52, bw - 16, 18);
            ctx.fillStyle = '#ddd'; ctx.font = '7px monospace'; ctx.textAlign = 'center';
            ctx.fillText(cfg.name.substring(0, 8), bx + bw / 2, sh - 18);
            ctx.fillStyle = '#ff4'; ctx.fillText('x' + bi.qty, bx + bw / 2, sh - 8);
            this._buttons.push({ x: bx, y: sh - 58, w: bw, h: 48, action: (function(id) { return function() { self.selectedBuildItem = id; }; })(bi.id) });
            bx += bw + 4;
        }

        // Build placement hint - highlight tile in front of player
        if (self.selectedBuildItem) {
            var pa = Game.Player.facingAngle, ts = Game.Config.TILE_SIZE;
            var frontX = Game.Player.x + Math.cos(pa) * ts * 1.5;
            var frontY = Game.Player.y + Math.sin(pa) * ts * 1.5;
            var tile = Game.World.worldToTile(frontX, frontY);
            var tileScreen = Game.Camera.worldToScreen(tile.x * ts + ts / 2, tile.y * ts + ts / 2);
            var canPlace = Game.World.canBuild(tile.x, tile.y) || (self.selectedBuildItem === 'farm_plot' && Game.World.canFarm(tile.x, tile.y));
            ctx.strokeStyle = canPlace ? 'rgba(80,255,80,0.5)' : 'rgba(255,80,80,0.5)'; ctx.lineWidth = 2;
            ctx.strokeRect(tileScreen.x - ts / 2, tileScreen.y - ts / 2, ts, ts);
        }
    },

    drawActionButtons(ctx, sw, sh) {
        var abSize = 36, abX = sw - abSize - 5, abY = sh - 250;
        var self = this;
        var screenMap = {
            'BAG': 'inventory', 'CRFT': 'crafting', 'SKIL': 'skills',
            'MAP': 'map', 'MENU': 'menu', 'BLD': 'build'
        };
        var actions = [
            ['BAG', '#456'],
            ['CRFT', '#464'],
            ['SKIL', '#654'],
            ['MAP', '#446'],
            ['MENU', '#444'],
            ['BLD', '#554']
        ];
        // Background strip behind buttons
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.fillRect(abX - 3, abY - 3, abSize + 6, actions.length * (abSize + 4) + 2);
        for (var i = 0; i < actions.length; i++) {
            var label = actions[i][0], baseColor = actions[i][1];
            var targetScreen = screenMap[label];
            var isActive = this.screen === targetScreen;
            var color = isActive ? '#8af' : baseColor;
            var by = abY + i * (abSize + 4);
            // Draw button
            ctx.fillStyle = isActive ? '#234' : (color || '#333');
            ctx.fillRect(abX, by, abSize, abSize);
            ctx.strokeStyle = isActive ? '#8af' : '#888'; ctx.lineWidth = isActive ? 2 : 1;
            ctx.strokeRect(abX, by, abSize, abSize);
            ctx.fillStyle = isActive ? '#8af' : '#fff';
            ctx.font = 'bold 11px monospace'; ctx.textAlign = 'center';
            ctx.fillText(label, abX + abSize / 2, by + abSize / 2 + 4);
            this._buttons.push({ x: abX, y: by, w: abSize, h: abSize, action: (function(scr) { return function() {
                if (self.screen === scr) {
                    self.screen = 'none';
                } else {
                    if (scr === 'crafting') { self.craftStation = null; self.craftScroll = 0; }
                    if (scr === 'build') { self.selectedBuildItem = null; }
                    self.screen = scr;
                }
            }; })(targetScreen) });
        }
    },

    handleBuildTap(x, y) {
        if (this.screen !== 'build' || !this.selectedBuildItem) return false;
        var world = Game.Camera.screenToWorld(x, y);
        var tile = Game.World.worldToTile(world.x, world.y);
        if (Game.Building.place(this.selectedBuildItem, tile.x, tile.y)) {
            this.showMessage('Placed!');
            if (Game.Inventory.countItem(this.selectedBuildItem) <= 0) this.selectedBuildItem = null;
            return true;
        }
        return false;
    }
};
