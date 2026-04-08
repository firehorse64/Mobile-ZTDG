window.Game = window.Game || {};
Game.Save = {
    SAVE_KEY: 'ztdg_save',

    save() {
        var data = {
            version: 2,
            player: {
                x: Game.Player.x, y: Game.Player.y,
                health: Game.Player.health, hunger: Game.Player.hunger,
                thirst: Game.Player.thirst, stamina: Game.Player.stamina,
                xp: Game.Player.xp, level: Game.Player.level,
                skillPoints: Game.Player.skillPoints,
                weapon: Game.Player.weapon,
                skills: JSON.parse(JSON.stringify(Game.Player.skills))
            },
            inventory: {
                slots: Game.Inventory.slots.map(function(s){return s?{id:s.id,qty:s.qty}:null;}),
                quickbar: Game.Inventory.quickbar.slice()
            },
            world: {
                seed: Game.World._seed,
                structures: Game.World.structures.map(function(s) {
                    return {tileX:s.tileX,tileY:s.tileY,type:s.type,health:s.health,maxHealth:s.maxHealth,data:JSON.parse(JSON.stringify(s.data))};
                }),
                scavenged: Array.from(Game.World.scavenged),
                revealed: Array.from(Game.World.revealed)
            },
            survival: {
                time: Game.Survival.time,
                dayTime: Game.Survival.dayTime
            }
        };
        try {
            localStorage.setItem(this.SAVE_KEY, JSON.stringify(data));
            return true;
        } catch(e) { return false; }
    },

    load() {
        try {
            var raw = localStorage.getItem(this.SAVE_KEY);
            if(!raw) return false;
            var data = JSON.parse(raw);
            if(!data || data.version < 2) return false;

            // Restore world with same seed
            Game.World.init(data.world.seed);

            // Restore structures
            Game.World.structures = [];
            for(var i = 0; i < data.world.structures.length; i++) {
                var sd = data.world.structures[i];
                var s = Game.World.addStructure(sd.tileX, sd.tileY, sd.type, sd.data);
                if(s) { s.health = sd.health; s.maxHealth = sd.maxHealth; }
            }

            // Restore scavenged
            if(data.world.scavenged) {
                for(var i = 0; i < data.world.scavenged.length && i < Game.World.scavenged.length; i++)
                    Game.World.scavenged[i] = data.world.scavenged[i];
            }
            // Restore revealed
            if(data.world.revealed) {
                for(var i = 0; i < data.world.revealed.length && i < Game.World.revealed.length; i++)
                    Game.World.revealed[i] = data.world.revealed[i];
            }

            // Restore player
            var pd = data.player;
            Game.Player.x = pd.x; Game.Player.y = pd.y;
            Game.Player.health = pd.health; Game.Player.hunger = pd.hunger;
            Game.Player.thirst = pd.thirst; Game.Player.stamina = pd.stamina;
            Game.Player.xp = pd.xp; Game.Player.level = pd.level;
            Game.Player.skillPoints = pd.skillPoints;
            Game.Player.weapon = pd.weapon;
            Game.Player.skills = pd.skills;
            Game.Player.maxHealth = Game.Player.getMaxHealth();

            // Restore inventory
            Game.Inventory.slots = data.inventory.slots.map(function(s){return s?{id:s.id,qty:s.qty}:null;});
            Game.Inventory.quickbar = data.inventory.quickbar;

            // Restore survival
            Game.Survival.time = data.survival.time;
            Game.Survival.dayTime = data.survival.dayTime;

            return true;
        } catch(e) { return false; }
    },

    hasSave() {
        try { return !!localStorage.getItem(this.SAVE_KEY); } catch(e) { return false; }
    },

    deleteSave() {
        try { localStorage.removeItem(this.SAVE_KEY); } catch(e) {}
    }
};
