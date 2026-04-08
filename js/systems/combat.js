window.Game = window.Game || {};
Game.Combat = {
    meleeAttack(x,y,angle,range,damage) {
        // Hit zombies in arc
        var zombies=Game.ZombieManager.pool.active;
        for(var i=zombies.length-1;i>=0;i--) {
            var z=zombies[i];
            if(!z.alive) continue;
            var dx=z.x-x,dy=z.y-y;
            var dist=Math.sqrt(dx*dx+dy*dy);
            if(dist>range+z.radius) continue;
            var zAngle=Math.atan2(dy,dx);
            var angleDiff=Math.abs(zAngle-angle);
            if(angleDiff>Math.PI) angleDiff=Math.PI*2-angleDiff;
            if(angleDiff<0.8) { // ~90 degree arc
                z.health-=damage;
                Game.ParticleManager.burst(z.x,z.y,'#f84',3,2,3,150);
                if(z.health<=0) Game.ZombieManager.killZombie(z);
                z.aggroed=true;
            }
        }
    },

    bulletUpdate(dt) {
        var bullets=Game.BulletManager.pool.active;
        var zombies=Game.ZombieManager.pool.active;
        var bRelease=[],zKill=[];
        for(var bi=bullets.length-1;bi>=0;bi--) {
            var b=bullets[bi];
            if(b.isEnemy) continue;
            for(var zi=zombies.length-1;zi>=0;zi--) {
                var z=zombies[zi];
                if(!z.alive) continue;
                var dx=b.x-z.x,dy=b.y-z.y;
                if(dx*dx+dy*dy<(z.radius+4)*(z.radius+4)) {
                    z.health-=b.damage;
                    bRelease.push(b);
                    Game.ParticleManager.spawn(b.x,b.y,(Math.random()-0.5)*2,(Math.random()-0.5)*2,'#f84',3,150);
                    if(z.health<=0&&z.alive) zKill.push(z);
                    z.aggroed=true;
                    break;
                }
            }
        }
        for(var i=0;i<bRelease.length;i++) Game.BulletManager.pool.release(bRelease[i]);
        for(var i=0;i<zKill.length;i++) Game.ZombieManager.killZombie(zKill[i]);
    }
};
