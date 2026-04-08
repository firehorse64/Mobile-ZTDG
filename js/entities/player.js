window.Game = window.Game || {};
Game.Player = {
    x:0,y:0,radius:10,aimAngle:0,facingAngle:0,
    health:100,maxHealth:100,hunger:100,thirst:100,stamina:100,
    xp:0,level:1,skillPoints:0,
    weapon:null, // item id of equipped weapon
    attackCooldown:0,sprinting:false,
    skills:{combat:[0,0,0,0],survival:[0,0,0,0],building:[0,0,0,0],farming:[0,0,0,0]},

    init() {
        var c=Game.Config;
        var center=Math.floor(c.WORLD_TILES/2)*c.TILE_SIZE+c.TILE_SIZE/2;
        this.x=center; this.y=center;
        this.health=c.MAX_HEALTH; this.maxHealth=c.MAX_HEALTH;
        this.hunger=c.MAX_HUNGER; this.thirst=c.MAX_THIRST; this.stamina=c.MAX_STAMINA;
        this.xp=0; this.level=1; this.skillPoints=0;
        this.weapon=null; this.attackCooldown=0; this.sprinting=false;
        this.skills={combat:[0,0,0,0],survival:[0,0,0,0],building:[0,0,0,0],farming:[0,0,0,0]};
        this.aimAngle=0;this.facingAngle=0;
    },

    getMaxHealth() {
        return Game.Config.MAX_HEALTH + this.skills.combat[1]*10;
    },

    getMaxStamina() {
        return Game.Config.MAX_STAMINA * (1 + this.skills.survival[2]*0.15);
    },

    update(dt) {
        var c=Game.Config, joy=Game.Input.joystick;
        this.maxHealth=this.getMaxHealth();

        // Movement
        if(joy.dx!==0||joy.dy!==0) {
            var speed=c.PLAYER_SPEED;
            // Sprint if joystick is pushed far
            this.sprinting = (Math.abs(joy.dx)>0.85||Math.abs(joy.dy)>0.85) && this.stamina>5;
            if(this.sprinting) speed*=c.PLAYER_SPRINT_MULT;

            var nx=this.x+joy.dx*speed, ny=this.y+joy.dy*speed;
            var ts=c.TILE_SIZE;
            // Check collision at new position (check 4 corners of player radius)
            var canMoveX=true, canMoveY=true;
            var checkR=this.radius*0.8;
            // X movement
            var txL=Math.floor((nx-checkR)/ts),txR=Math.floor((nx+checkR)/ts);
            var tyT=Math.floor((this.y-checkR)/ts),tyB=Math.floor((this.y+checkR)/ts);
            if(Game.World.isSolid(txL,tyT)||Game.World.isSolid(txR,tyT)||Game.World.isSolid(txL,tyB)||Game.World.isSolid(txR,tyB)) canMoveX=false;
            // Y movement
            txL=Math.floor((this.x-checkR)/ts);txR=Math.floor((this.x+checkR)/ts);
            tyT=Math.floor((ny-checkR)/ts);tyB=Math.floor((ny+checkR)/ts);
            if(Game.World.isSolid(txL,tyT)||Game.World.isSolid(txR,tyT)||Game.World.isSolid(txL,tyB)||Game.World.isSolid(txR,tyB)) canMoveY=false;

            if(canMoveX) this.x=nx;
            if(canMoveY) this.y=ny;
            this.x=Math.max(this.radius,Math.min(this.x,c.WORLD_PX-this.radius));
            this.y=Math.max(this.radius,Math.min(this.y,c.WORLD_PX-this.radius));
            this.facingAngle=Math.atan2(joy.dy,joy.dx);

            if(this.sprinting) this.stamina=Math.max(0,this.stamina-c.STAMINA_DRAIN*(1-this.skills.survival[2]*0.1));
        } else {
            this.sprinting=false;
        }

        // Stamina regen when not sprinting
        if(!this.sprinting) this.stamina=Math.min(this.getMaxStamina(),this.stamina+c.STAMINA_REGEN);

        // Aim
        if(Game.Input.aim.active) {
            var sp=Game.Camera.worldToScreen(this.x,this.y);
            this.aimAngle=Math.atan2(Game.Input.aim.y-sp.y,Game.Input.aim.x-sp.x);
        }

        // Attack
        if(this.attackCooldown>0) this.attackCooldown-=dt;
        if(Game.Input.aim.active && this.attackCooldown<=0 && !Game.HUD.isScreenOpen()) {
            this.attack();
        }

        // Reveal fog
        Game.World.revealAround(this.x,this.y);
    },

    attack() {
        var weaponId = this.weapon;
        var cfg = weaponId ? Game.Config.ITEMS[weaponId] : Game.Config.ITEMS.fists;
        var dmgMult = 1 + this.skills.combat[0]*0.15;
        var spdMult = 1 - this.skills.combat[3]*0.1;
        var critChance = this.skills.combat[2]*0.08;

        if(cfg.type==='ranged') {
            // Check ammo
            var ammoCount = Game.Inventory.countItem(cfg.ammo);
            if(ammoCount<=0) { this.weapon=null; return; } // switch to fists
            Game.Inventory.removeItem(cfg.ammo,1);
            var pellets=cfg.pellets||1;
            for(var i=0;i<pellets;i++) {
                var angle=this.aimAngle+(Math.random()-0.5)*cfg.spread;
                var cos=Math.cos(angle),sin=Math.sin(angle);
                var dmg=cfg.damage*dmgMult;
                if(Math.random()<critChance) dmg*=2;
                Game.BulletManager.spawn(this.x+cos*16,this.y+sin*16,cos*cfg.bulletSpeed,sin*cfg.bulletSpeed,dmg,false);
            }
            Game.ParticleManager.spawn(this.x+Math.cos(this.aimAngle)*18,this.y+Math.sin(this.aimAngle)*18,0,0,'#ff0',4,100);
            this.attackCooldown=cfg.speed*spdMult;
        } else {
            // Melee
            var dmg=cfg.damage*dmgMult;
            if(Math.random()<critChance) dmg*=2;
            Game.Combat.meleeAttack(this.x,this.y,this.aimAngle,cfg.range||24,dmg);
            Game.ParticleManager.spawn(this.x+Math.cos(this.aimAngle)*cfg.range,this.y+Math.sin(this.aimAngle)*cfg.range,0,0,'#fff',3,100);
            this.attackCooldown=cfg.speed*spdMult;
        }
    },

    takeDamage(amount) {
        this.health-=amount;
        Game.Camera.addShake(3);
        if(this.health<=0) { this.health=0; Game.State.gameOver(); }
    },

    addXP(amount) {
        this.xp+=amount;
        var needed=this.level*Game.Config.XP_PER_LEVEL;
        while(this.xp>=needed) {
            this.xp-=needed;
            this.level++;
            this.skillPoints++;
            needed=this.level*Game.Config.XP_PER_LEVEL;
        }
    },

    heal(amount) { this.health=Math.min(this.maxHealth,this.health+amount); },
    feed(amount) { this.hunger=Math.min(Game.Config.MAX_HUNGER,this.hunger+amount); },
    hydrate(amount) { this.thirst=Math.min(Game.Config.MAX_THIRST,this.thirst+amount); },

    useItem(itemId) {
        var cfg=Game.Config.ITEMS[itemId];
        if(!cfg) return false;
        if(cfg.type==='food') {
            this.feed(cfg.hunger||0);
            if(cfg.thirst) this.hydrate(cfg.thirst);
            if(cfg.healthPenalty) this.takeDamage(cfg.healthPenalty);
            return true;
        }
        if(cfg.type==='water') {
            this.hydrate(cfg.thirst||0);
            if(cfg.healthPenalty) this.takeDamage(cfg.healthPenalty);
            return true;
        }
        if(cfg.type==='medical') {
            this.heal(cfg.heal||0);
            return true;
        }
        if(cfg.type==='melee'||cfg.type==='ranged') {
            this.weapon=itemId;
            return false; // don't consume
        }
        return false;
    }
};
