window.Game = window.Game || {};
Game.Camera = {
    x:0,y:0,targetX:0,targetY:0,screenW:480,screenH:800,smoothing:0.12,
    shake:0,shakeIntensity:0,
    follow(wx,wy) { this.targetX=wx-this.screenW/2; this.targetY=wy-this.screenH/2; },
    update() {
        this.x+=(this.targetX-this.x)*this.smoothing;
        this.y+=(this.targetY-this.y)*this.smoothing;
        var mw=Game.Config.WORLD_PX, mh=Game.Config.WORLD_PX;
        this.x=Math.max(0,Math.min(this.x,mw-this.screenW));
        this.y=Math.max(0,Math.min(this.y,mh-this.screenH));
    },
    worldToScreen(wx,wy) { return {x:wx-this.x,y:wy-this.y}; },
    screenToWorld(sx,sy) { return {x:sx+this.x,y:sy+this.y}; },
    isVisible(wx,wy,m) { m=m||32; return wx>this.x-m&&wx<this.x+this.screenW+m&&wy>this.y-m&&wy<this.y+this.screenH+m; },
    addShake(i) { this.shake=10; this.shakeIntensity=Math.max(this.shakeIntensity,i); },
    getShakeOffset() {
        if(this.shake<=0) return {x:0,y:0};
        this.shake--;
        if(this.shake<=0) this.shakeIntensity=0;
        return {x:(Math.random()-0.5)*this.shakeIntensity*2,y:(Math.random()-0.5)*this.shakeIntensity*2};
    }
};
