window.Game = window.Game || {};
Game.Building = {
    // Place a structure from inventory
    place(itemId, tileX, tileY) {
        var cfg = Game.Config.ITEMS[itemId];
        if(!cfg || cfg.type !== 'building') return false;
        var structType = cfg.structure;
        if(structType === 'farm_plot') {
            if(!Game.World.canFarm(tileX, tileY)) return false;
        } else {
            if(!Game.World.canBuild(tileX, tileY)) return false;
        }
        // Check player distance
        var pos = Game.World.tileToWorld(tileX, tileY);
        var dx = pos.x - Game.Player.x, dy = pos.y - Game.Player.y;
        var maxDist = (3 + Game.Player.skills.building[3]) * Game.Config.TILE_SIZE;
        if(dx*dx + dy*dy > maxDist*maxDist) return false;
        // Remove from inventory
        if(!Game.Inventory.removeItem(itemId, 1)) return false;
        // Apply fortify skill
        var s = Game.World.addStructure(tileX, tileY, structType);
        if(s) {
            var fortifyMult = 1 + Game.Player.skills.building[0] * 0.2;
            s.health = Math.round(s.health * fortifyMult);
            s.maxHealth = s.health;
        }
        return true;
    },

    // Interact with structure (use/collect)
    interact(structure) {
        if(!structure) return null;
        var p = Game.Player;
        var dx = structure.x - p.x, dy = structure.y - p.y;
        if(dx*dx + dy*dy > 80*80) return null;

        switch(structure.type) {
            case 'rain_collector':
                if(structure.data.water >= 1) {
                    var qty = Math.floor(structure.data.water);
                    var added = Game.Inventory.addItem('dirty_water', qty);
                    if(added > 0) structure.data.water -= added;
                    return 'Collected ' + added + ' dirty water';
                }
                return 'No water collected yet';
            case 'well':
                if(structure.data.water >= 1) {
                    var qty = Math.floor(structure.data.water);
                    var added = Game.Inventory.addItem('dirty_water', qty);
                    if(added > 0) structure.data.water -= added;
                    return 'Drew ' + added + ' dirty water';
                }
                return 'Well is dry';
            case 'farm_plot':
                return this.interactFarm(structure);
            case 'storage':
                return 'storage'; // Signal to HUD to open storage screen
            case 'campfire':
                return 'campfire'; // Signal to open campfire crafting
            case 'purifier':
                return 'purifier'; // Signal to open purifier crafting
            default:
                return null;
        }
    },

    interactFarm(farm) {
        if(!farm.data.crop) return 'plant'; // Signal to show seed selection
        var cropCfg = Game.Config.CROPS[farm.data.crop];
        if(!cropCfg) return null;
        if(farm.data.growth >= cropCfg.growTime) {
            // Harvest
            var yieldQty = cropCfg.yieldQty + Game.Player.skills.farming[1];
            Game.Inventory.addItem(cropCfg.yield, yieldQty);
            // Chance for seeds back
            if(Math.random() < 0.5) {
                var seedId = 'seeds_' + farm.data.crop;
                Game.Inventory.addItem(seedId, 1);
            }
            farm.data.crop = null;
            farm.data.growth = 0;
            farm.data.watered = 0;
            return 'Harvested ' + yieldQty + ' ' + cropCfg.yield;
        }
        // Try to water
        if(farm.data.watered < cropCfg.waterNeeded) {
            if(Game.Inventory.countItem('dirty_water') > 0) {
                Game.Inventory.removeItem('dirty_water', 1);
                farm.data.watered = Math.min(cropCfg.waterNeeded, farm.data.watered + 2);
                return 'Watered crop';
            }
            if(Game.Inventory.countItem('purified_water') > 0) {
                Game.Inventory.removeItem('purified_water', 1);
                farm.data.watered = cropCfg.waterNeeded;
                return 'Watered crop with purified water';
            }
            return 'Need water to water crop';
        }
        var pct = Math.floor(farm.data.growth / cropCfg.growTime * 100);
        return 'Growing: ' + pct + '%';
    },

    plantSeed(farm, seedId) {
        var cfg = Game.Config.ITEMS[seedId];
        if(!cfg || cfg.type !== 'seed') return false;
        if(!Game.Inventory.removeItem(seedId, 1)) return false;
        farm.data.crop = cfg.crop;
        farm.data.growth = 0;
        farm.data.watered = 0;
        return true;
    },

    scavenge(tileX, tileY) {
        if(!Game.World.canScavenge(tileX, tileY)) return null;
        var p = Game.Player;
        var pos = Game.World.tileToWorld(tileX, tileY);
        var dx = pos.x - p.x, dy = pos.y - p.y;
        if(dx*dx + dy*dy > 60*60) return null;
        Game.World.markScavenged(tileX, tileY);
        // Generate loot
        var loot = Game.Config.SCAVENGE_LOOT;
        var foragerBonus = 1 + p.skills.farming[3] * 0.15;
        var found = [];
        for(var i = 0; i < loot.length; i++) {
            if(Math.random() < loot[i][3] * foragerBonus) {
                var qty = loot[i][1] + Math.floor(Math.random() * (loot[i][2] - loot[i][1] + 1));
                var added = Game.Inventory.addItem(loot[i][0], qty);
                if(added > 0) found.push(qty + ' ' + Game.Config.ITEMS[loot[i][0]].name);
            }
        }
        Game.ParticleManager.burst(pos.x, pos.y, '#da8', 5, 2, 3, 300);
        p.addXP(5);
        return found.length > 0 ? 'Found: ' + found.join(', ') : 'Nothing useful';
    }
};
