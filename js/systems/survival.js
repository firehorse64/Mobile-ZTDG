window.Game = window.Game || {};
Game.Survival = {
    time: 0, // total ticks
    dayTime: 0, // current position in day cycle
    isNight: false,
    darkness: 0, // 0-1

    init() { this.time=0; this.dayTime=0; this.isNight=false; this.darkness=0; },

    update(dt) {
        var c=Game.Config, p=Game.Player;
        this.time++;
        this.dayTime++;
        var totalCycle = c.DAY_LENGTH+c.NIGHT_LENGTH;
        if(this.dayTime>=totalCycle) this.dayTime=0;
        this.isNight = this.dayTime>=c.DAY_LENGTH;

        // Calculate darkness (0=full day, 1=full night)
        if(this.dayTime < c.DAY_LENGTH-c.DAWN_DUSK) this.darkness=0;
        else if(this.dayTime < c.DAY_LENGTH) this.darkness=(this.dayTime-(c.DAY_LENGTH-c.DAWN_DUSK))/c.DAWN_DUSK;
        else if(this.dayTime < c.DAY_LENGTH+c.DAWN_DUSK) this.darkness=1;
        else if(this.dayTime < totalCycle-c.DAWN_DUSK) this.darkness=1;
        else this.darkness=1-(this.dayTime-(totalCycle-c.DAWN_DUSK))/c.DAWN_DUSK;
        this.darkness=Math.max(0,Math.min(1,this.darkness));

        // Hunger/thirst drain
        var hungerMult = 1 - p.skills.survival[0]*0.15;
        var thirstMult = 1 - p.skills.survival[1]*0.15;
        p.hunger = Math.max(0, p.hunger - c.HUNGER_RATE*hungerMult);
        p.thirst = Math.max(0, p.thirst - c.THIRST_RATE*thirstMult);

        // Damage from starvation/dehydration
        if(p.hunger<=0) p.takeDamage(c.STARVE_DAMAGE);
        if(p.thirst<=0) p.takeDamage(c.DEHYDRATE_DAMAGE);

        // Health regen when fed and hydrated
        if(p.hunger>30 && p.thirst>30 && p.health<p.maxHealth) {
            var regenMult = 1 + p.skills.survival[3]*0.25;
            p.health = Math.min(p.maxHealth, p.health + c.HEALTH_REGEN_RATE*regenMult);
        }

        // Sprint drains hunger/thirst faster
        if(p.sprinting) {
            p.hunger = Math.max(0, p.hunger - c.HUNGER_RATE*0.5);
            p.thirst = Math.max(0, p.thirst - c.THIRST_RATE*0.5);
        }

        // Update structures
        this.updateStructures(dt);
    },

    updateStructures(dt) {
        var structures = Game.World.structures;
        for(var i=0;i<structures.length;i++) {
            var s=structures[i];
            // Rain collector generates water over time
            if(s.type==='rain_collector'&&s.data.water<s.data.maxWater) {
                s.data.water=Math.min(s.data.maxWater,s.data.water+0.002);
            }
            // Well regenerates water
            if(s.type==='well') {
                s.data.regenTimer+=dt;
                if(s.data.regenTimer>3000&&s.data.water<s.data.maxWater) {
                    s.data.water++;
                    s.data.regenTimer=0;
                }
            }
            // Farm growth
            if(s.type==='farm_plot'&&s.data.crop&&s.data.watered>0) {
                var cropCfg=Game.Config.CROPS[s.data.crop];
                if(cropCfg) {
                    var growMult=1-Game.Player.skills.farming[0]*0.15;
                    s.data.growth+=growMult;
                    s.data.watered=Math.max(0,s.data.watered-0.001*(1-Game.Player.skills.farming[2]*0.2));
                }
            }
            // Turret AI
            if(s.type==='turret_gun'||s.type==='turret_shotgun') {
                this.updateTurret(s,dt);
            }
        }
    },

    updateTurret(t,dt) {
        t.cooldown-=dt;
        if(t.cooldown>0) return;
        var cfg=Game.Config.STRUCTURES[t.type];
        var range=cfg.range;
        var turretDmgMult=1+Game.Player.skills.building[2]*0.15;
        // Find nearest zombie
        var best=null, bestD=Infinity;
        Game.ZombieManager.pool.forEach(function(z){
            if(!z.alive) return;
            var dx=z.x-t.x,dy=z.y-t.y,d=dx*dx+dy*dy;
            if(d<range*range&&d<bestD){best=z;bestD=d;}
        });
        if(best){
            var dx=best.x-t.x,dy=best.y-t.y;
            t.angle=Math.atan2(dy,dx);
            var pellets=cfg.pellets||1;
            for(var i=0;i<pellets;i++){
                var a=t.angle+(Math.random()-0.5)*(cfg.spread||0);
                var c=Math.cos(a),s=Math.sin(a);
                Game.BulletManager.spawn(t.x+c*14,t.y+s*14,c*cfg.bulletSpeed,s*cfg.bulletSpeed,cfg.damage*turretDmgMult,false);
            }
            t.cooldown=cfg.fireRate;
            Game.ParticleManager.spawn(t.x+Math.cos(t.angle)*14,t.y+Math.sin(t.angle)*14,0,0,'#ff8',3,80);
        }
    },

    getDayString() {
        var day=Math.floor(this.time/(Game.Config.DAY_LENGTH+Game.Config.NIGHT_LENGTH))+1;
        return 'Day '+day+(this.isNight?' (Night)':'');
    }
};
