window.Game = window.Game || {};

Game.WallManager = {
    walls: [],

    init() {
        this.walls = [];
    },

    place(tileX, tileY) {
        if (!Game.Map.canPlace(tileX, tileY)) return false;
        if (!Game.Economy.spend(Game.Config.WALL_COST)) return false;

        Game.Map.setTile(tileX, tileY, Game.TileType.WALL);
        const pos = Game.Map.tileToWorld(tileX, tileY);
        this.walls.push({
            tileX: tileX,
            tileY: tileY,
            x: pos.x,
            y: pos.y,
            health: Game.Config.WALL_HEALTH,
            maxHealth: Game.Config.WALL_HEALTH
        });
        return true;
    },

    getAt(tileX, tileY) {
        return this.walls.find(w => w.tileX === tileX && w.tileY === tileY) || null;
    },

    damageAt(tileX, tileY, damage) {
        const w = this.getAt(tileX, tileY);
        if (!w) return;
        w.health -= damage;
        if (w.health <= 0) {
            this.remove(w);
            Game.ParticleManager.burst(w.x, w.y, '#864', 6, 3, 3, 300);
            // Recalc paths since wall was destroyed
            Game.Map.recalcPaths();
        }
    },

    remove(wall) {
        const idx = this.walls.indexOf(wall);
        if (idx !== -1) {
            this.walls.splice(idx, 1);
            Game.Map.setTile(wall.tileX, wall.tileY, Game.TileType.EMPTY);
        }
    },

    clear() {
        this.walls = [];
    }
};

// Base health tracking
Game.BaseHealth = {
    current: Game.Config.BASE_MAX_HEALTH,
    max: Game.Config.BASE_MAX_HEALTH,

    init() {
        this.current = this.max;
    },

    takeDamage(amount) {
        this.current -= amount;
        if (this.current < 0) this.current = 0;
    },

    repair() {
        if (this.current >= this.max) return false;
        if (!Game.Economy.spend(Game.Config.REPAIR_COST)) return false;
        this.current = Math.min(this.current + Game.Config.REPAIR_AMOUNT, this.max);
        return true;
    },

    isDestroyed() {
        return this.current <= 0;
    }
};
