window.Game = window.Game || {};

Game.Player = {
    x: 0,
    y: 0,
    health: Game.Config.PLAYER_MAX_HEALTH,
    maxHealth: Game.Config.PLAYER_MAX_HEALTH,
    weaponLevel: 0,
    fireCooldown: 0,
    radius: 12,
    aimAngle: 0,

    init() {
        this.x = Game.Map.baseCenter.x;
        this.y = Game.Map.baseCenter.y + Game.Config.TILE_SIZE * 2;
        this.health = this.maxHealth;
        this.weaponLevel = 0;
        this.fireCooldown = 0;
    },

    update(dt) {
        if (Game.Phase.current === 'build') {
            // Move with joystick
            const joy = Game.Input.joystick;
            if (joy.active || joy.dx !== 0 || joy.dy !== 0) {
                const speed = Game.Config.PLAYER_SPEED;
                const nx = this.x + joy.dx * speed;
                const ny = this.y + joy.dy * speed;

                // Collision with tiles
                const ts = Game.Config.TILE_SIZE;
                const tileX = Math.floor(nx / ts);
                const tileY = Math.floor(ny / ts);
                const tile = Game.Map.getTile(tileX, tileY);

                if (Game.Map.isPassable(tile)) {
                    this.x = nx;
                    this.y = ny;
                }

                // Clamp to map
                const mapW = Game.Config.MAP_WIDTH * ts;
                const mapH = Game.Config.MAP_HEIGHT * ts;
                this.x = Math.max(this.radius, Math.min(this.x, mapW - this.radius));
                this.y = Math.max(this.radius, Math.min(this.y, mapH - this.radius));
            }
        } else if (Game.Phase.current === 'combat') {
            // Snap to station
            this.x = Game.Map.stationPos.x;
            this.y = Game.Map.stationPos.y;

            // Aim toward touch
            if (Game.Input.aim.active) {
                const screenPos = Game.Camera.worldToScreen(this.x, this.y);
                const dx = Game.Input.aim.x - screenPos.x;
                const dy = Game.Input.aim.y - screenPos.y;
                this.aimAngle = Math.atan2(dy, dx);
            }

            // Fire weapon
            if (this.fireCooldown > 0) this.fireCooldown -= dt;
            if (Game.Input.aim.active && this.fireCooldown <= 0) {
                this.fire();
            }
        }
    },

    fire() {
        const cfg = Game.Config.PLAYER_WEAPON;
        const upgr = Game.Config.PLAYER_WEAPON_UPGRADES[this.weaponLevel];
        const dmg = cfg.damage * upgr.damage;
        const spd = cfg.bulletSpeed;

        const cos = Math.cos(this.aimAngle);
        const sin = Math.sin(this.aimAngle);

        Game.BulletManager.spawn(
            this.x + cos * 16,
            this.y + sin * 16,
            cos * spd,
            sin * spd,
            dmg,
            false
        );

        this.fireCooldown = cfg.fireRate * upgr.fireRate;

        // Muzzle flash particle
        Game.ParticleManager.spawn(
            this.x + cos * 18,
            this.y + sin * 18,
            cos * 2 + (Math.random() - 0.5),
            sin * 2 + (Math.random() - 0.5),
            '#ff0', 4, 150
        );
    },

    getWeaponUpgradeCost() {
        const nextLevel = this.weaponLevel + 1;
        if (nextLevel >= Game.Config.PLAYER_WEAPON_UPGRADES.length) return -1;
        return Game.Config.PLAYER_WEAPON_UPGRADES[nextLevel].cost;
    },

    takeDamage(amount) {
        this.health -= amount;
        if (this.health <= 0) {
            this.health = 0;
        }
    }
};
