window.Game = window.Game || {};
Game.ZombieManager = {
    pool: null, spawnTimer: 0,

    init() {
        this.pool = new Game.ObjectPool(
            function(){return{x:0,y:0,type:'walker',health:0,maxHealth:0,speed:0,damage:0,xp:0,radius:0,color:'#5a5',attackRate:0,attackCooldown:0,alive:false,targetX:0,targetY:0,wanderTimer:0,aggroed:false};},
            function(z){z.alive=false;z.aggroed=false;},80);
        this.spawnTimer=0;
    },

    spawn(type,wx,wy) {
        var cfg=Game.Config.ZOMBIE_TYPES[type];
        if(!cfg) return null;
        var z=this.pool.acquire();
        z.type=type;z.health=cfg.health;z.maxHealth=cfg.health;z.speed=cfg.speed;
        z.damage=cfg.damage;z.xp=cfg.xp;z.radius=cfg.radius;z.color=cfg.color;
        z.attackRate=cfg.attackRate;z.attackCooldown=0;z.alive=true;
        z.x=wx;z.y=wy;z.aggroed=false;z.wanderTimer=0;
        z.targetX=wx+(Math.random()-0.5)*200;z.targetY=wy+(Math.random()-0.5)*200;
        return z;
    },

    update(dt) {
        var p=Game.Player,c=Game.Config;
        var isNight=Game.Survival.isNight;
        var detectRange=isNight?c.ZOMBIE_NIGHT_DETECT:c.ZOMBIE_DETECT_RANGE;

        // Spawn zombies around player
        var spawnRate=isNight?c.ZOMBIE_NIGHT_RATE:c.ZOMBIE_DAY_RATE;
        this.spawnTimer-=dt;
        if(this.spawnTimer<=0 && this.pool.count<c.MAX_ZOMBIES) {
            this.spawnTimer=spawnRate;
            var angle=Math.random()*Math.PI*2;
            var dist=c.ZOMBIE_SPAWN_RADIUS_MIN+Math.random()*(c.ZOMBIE_SPAWN_RADIUS_MAX-c.ZOMBIE_SPAWN_RADIUS_MIN);
            var sx=p.x+Math.cos(angle)*dist, sy=p.y+Math.sin(angle)*dist;
            // Don't spawn on water/ruin
            var tile=Game.World.worldToTile(sx,sy);
            var t=Game.World.getTile(tile.x,tile.y);
            if(t!==-1&&t!==Game.TileType.WATER&&t!==Game.TileType.RUIN) {
                var types=['walker','walker','walker','walker','runner','runner','brute'];
                if(isNight) types.push('runner','runner','brute','spitter','spitter');
                var type=types[Math.floor(Math.random()*types.length)];
                this.spawn(type,sx,sy);
            }
        }

        // Update zombies
        var toRelease=[];
        this.pool.forEach(function(z){
            if(!z.alive){toRelease.push(z);return;}
            // Despawn if too far from player
            var dpx=z.x-p.x,dpy=z.y-p.y;
            if(dpx*dpx+dpy*dpy>800*800){toRelease.push(z);return;}

            // Detection
            var distToPlayer=Math.sqrt(dpx*dpx+dpy*dpy);
            if(distToPlayer<detectRange) z.aggroed=true;
            if(distToPlayer>detectRange*2) z.aggroed=false;

            var speed=z.speed*(dt/33.33);
            if(isNight) speed*=1.3; // Faster at night

            if(z.aggroed) {
                // Move toward player
                var dx=p.x-z.x,dy=p.y-z.y;
                var d=Math.sqrt(dx*dx+dy*dy);
                if(d>z.radius+p.radius) {
                    var nx=z.x+(dx/d)*speed, ny=z.y+(dy/d)*speed;
                    // Simple collision with world
                    var ts=Game.Config.TILE_SIZE;
                    var ttx=Math.floor(nx/ts),tty=Math.floor(ny/ts);
                    if(!Game.World.isSolid(ttx,tty)){z.x=nx;z.y=ny;}
                    else {
                        // Try just X or Y
                        ttx=Math.floor((z.x+(dx/d)*speed)/ts);tty=Math.floor(z.y/ts);
                        if(!Game.World.isSolid(ttx,tty)) z.x+=(dx/d)*speed;
                        else {
                            ttx=Math.floor(z.x/ts);tty=Math.floor((z.y+(dy/d)*speed)/ts);
                            if(!Game.World.isSolid(ttx,tty)) z.y+=(dy/d)*speed;
                        }
                    }
                }
                // Attack player
                if(d<z.radius+p.radius+8) {
                    z.attackCooldown-=dt;
                    if(z.attackCooldown<=0) {
                        p.takeDamage(z.damage);
                        z.attackCooldown=z.attackRate;
                        Game.ParticleManager.burst(p.x,p.y,'#f44',3,2,3,200);
                    }
                }
                // Attack nearby structures
                for(var si=0;si<Game.World.structures.length;si++){
                    var s=Game.World.structures[si];
                    var sdx=s.x-z.x,sdy=s.y-z.y;
                    if(sdx*sdx+sdy*sdy<(z.radius+16)*(z.radius+16)){
                        z.attackCooldown-=dt;
                        if(z.attackCooldown<=0){
                            Game.World.damageStructure(s,z.damage);
                            z.attackCooldown=z.attackRate;
                        }
                        break;
                    }
                }
            } else {
                // Wander
                z.wanderTimer-=dt;
                if(z.wanderTimer<=0) {
                    z.targetX=z.x+(Math.random()-0.5)*200;
                    z.targetY=z.y+(Math.random()-0.5)*200;
                    z.wanderTimer=3000+Math.random()*5000;
                }
                var dx=z.targetX-z.x,dy=z.targetY-z.y;
                var d=Math.sqrt(dx*dx+dy*dy);
                if(d>4) {
                    var nx=z.x+(dx/d)*speed*0.4, ny=z.y+(dy/d)*speed*0.4;
                    var ts=Game.Config.TILE_SIZE;
                    if(!Game.World.isSolid(Math.floor(nx/ts),Math.floor(ny/ts))){z.x=nx;z.y=ny;}
                }
            }
        });
        for(var i=0;i<toRelease.length;i++) this.pool.release(toRelease[i]);
    },

    killZombie(z) {
        z.alive=false;
        Game.Player.addXP(z.xp);
        Game.ParticleManager.burst(z.x,z.y,'#4a2',8,3,4,400);
        // Drop loot
        var loot=Game.Config.ZOMBIE_LOOT[z.type];
        if(loot) {
            var foragerBonus=1+Game.Player.skills.farming[3]*0.15;
            for(var i=0;i<loot.length;i++) {
                if(Math.random()<loot[i][3]*foragerBonus) {
                    var qty=loot[i][1]+Math.floor(Math.random()*(loot[i][2]-loot[i][1]+1));
                    Game.Inventory.addItem(loot[i][0],qty);
                }
            }
        }
    },

    clear() { if(this.pool) this.pool.clear(); }
};
