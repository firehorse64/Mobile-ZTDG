window.Game = window.Game || {};
Game.Input = {
    joystick:{active:false,id:-1,startX:0,startY:0,dx:0,dy:0},
    aim:{active:false,id:-1,startX:0,startY:0,dx:0,dy:0},
    taps:[],_pendingTaps:[],
    scaleX:1,scaleY:1,canvas:null,

    init(canvas) {
        this.canvas=canvas;
        var self=this;
        canvas.addEventListener('touchstart',function(e){self.onTouchStart(e);},{passive:false});
        canvas.addEventListener('touchmove',function(e){self.onTouchMove(e);},{passive:false});
        canvas.addEventListener('touchend',function(e){self.onTouchEnd(e);},{passive:false});
        canvas.addEventListener('touchcancel',function(e){self.onTouchEnd(e);},{passive:false});
        this._mouseDown=false;
        canvas.addEventListener('mousedown',function(e){self.onMouseDown(e);});
        canvas.addEventListener('mousemove',function(e){self.onMouseMove(e);});
        canvas.addEventListener('mouseup',function(e){self.onMouseUp(e);});
    },

    updateScale() {
        if(!this.canvas) return;
        var r=this.canvas.getBoundingClientRect();
        this.scaleX=this.canvas.width/r.width;
        this.scaleY=this.canvas.height/r.height;
    },

    _getPos(t) {
        var r=this.canvas.getBoundingClientRect();
        return {x:(t.clientX-r.left)*this.scaleX,y:(t.clientY-r.top)*this.scaleY};
    },

    _updateStick(stick, pos) {
        var dx=pos.x-stick.startX, dy=pos.y-stick.startY;
        var dist=Math.sqrt(dx*dx+dy*dy), maxR=Game.Config.JOYSTICK_RADIUS;
        if(dist>maxR){dx=(dx/dist)*maxR;dy=(dy/dist)*maxR;}
        if(dist<Game.Config.JOYSTICK_DEAD_ZONE){dx=0;dy=0;}
        stick.dx=dx/maxR; stick.dy=dy/maxR;
    },

    onTouchStart(e) {
        e.preventDefault();
        for(var i=0;i<e.changedTouches.length;i++){
            var t=e.changedTouches[i],pos=this._getPos(t);
            if(Game.HUD&&Game.HUD.isScreenOpen()) { this._pendingTaps.push(pos); continue; }
            var sw=this.canvas.width;
            if(pos.x<sw*0.35&&!this.joystick.active){
                this.joystick.active=true;this.joystick.id=t.identifier;
                this.joystick.startX=pos.x;this.joystick.startY=pos.y;this.joystick.dx=0;this.joystick.dy=0;
            } else if(pos.x>=sw*0.35&&!this.aim.active){
                this.aim.active=true;this.aim.id=t.identifier;
                this.aim.startX=pos.x;this.aim.startY=pos.y;this.aim.dx=0;this.aim.dy=0;
                this._pendingTaps.push(pos);
            } else {
                this._pendingTaps.push(pos);
            }
        }
    },

    onTouchMove(e) {
        e.preventDefault();
        for(var i=0;i<e.changedTouches.length;i++){
            var t=e.changedTouches[i],pos=this._getPos(t);
            if(t.identifier===this.joystick.id&&this.joystick.active){
                this._updateStick(this.joystick, pos);
            }
            if(t.identifier===this.aim.id&&this.aim.active){
                this._updateStick(this.aim, pos);
            }
        }
    },

    onTouchEnd(e) {
        e.preventDefault();
        for(var i=0;i<e.changedTouches.length;i++){
            var t=e.changedTouches[i];
            if(t.identifier===this.joystick.id){this.joystick.active=false;this.joystick.id=-1;this.joystick.dx=0;this.joystick.dy=0;}
            if(t.identifier===this.aim.id){this.aim.active=false;this.aim.id=-1;this.aim.dx=0;this.aim.dy=0;}
        }
    },

    onMouseDown(e) {
        var r=this.canvas.getBoundingClientRect();
        var pos={x:(e.clientX-r.left)*this.scaleX,y:(e.clientY-r.top)*this.scaleY};
        this._mouseDown=true;
        if(Game.HUD&&Game.HUD.isScreenOpen()){this._pendingTaps.push(pos);return;}
        var sw=this.canvas.width;
        if(pos.x<sw*0.35){
            this.joystick.active=true;this.joystick.startX=pos.x;this.joystick.startY=pos.y;this.joystick.dx=0;this.joystick.dy=0;
        } else {
            this.aim.active=true;this.aim.startX=pos.x;this.aim.startY=pos.y;this.aim.dx=0;this.aim.dy=0;
            this._pendingTaps.push(pos);
        }
    },

    onMouseMove(e) {
        if(!this._mouseDown) return;
        var r=this.canvas.getBoundingClientRect();
        var pos={x:(e.clientX-r.left)*this.scaleX,y:(e.clientY-r.top)*this.scaleY};
        if(this.joystick.active){
            this._updateStick(this.joystick, pos);
        }
        if(this.aim.active){
            this._updateStick(this.aim, pos);
        }
    },

    onMouseUp(e) {this._mouseDown=false;this.joystick.active=false;this.joystick.dx=0;this.joystick.dy=0;this.aim.active=false;this.aim.dx=0;this.aim.dy=0;},
    consumeTaps() {this.taps=this._pendingTaps;this._pendingTaps=[];return this.taps;}
};
