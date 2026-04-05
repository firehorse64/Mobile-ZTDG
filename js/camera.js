window.Game = window.Game || {};

Game.Camera = {
    x: 0,
    y: 0,
    targetX: 0,
    targetY: 0,
    screenW: Game.Config.INTERNAL_WIDTH,
    screenH: Game.Config.INTERNAL_HEIGHT,
    smoothing: 0.1,

    follow(wx, wy) {
        this.targetX = wx - this.screenW / 2;
        this.targetY = wy - this.screenH / 2;
    },

    update() {
        this.x += (this.targetX - this.x) * this.smoothing;
        this.y += (this.targetY - this.y) * this.smoothing;

        // Clamp to map bounds
        const mapW = Game.Config.MAP_WIDTH * Game.Config.TILE_SIZE;
        const mapH = Game.Config.MAP_HEIGHT * Game.Config.TILE_SIZE;
        this.x = Math.max(0, Math.min(this.x, mapW - this.screenW));
        this.y = Math.max(0, Math.min(this.y, mapH - this.screenH));
    },

    worldToScreen(wx, wy) {
        return { x: wx - this.x, y: wy - this.y };
    },

    screenToWorld(sx, sy) {
        return { x: sx + this.x, y: sy + this.y };
    },

    isVisible(wx, wy, margin) {
        margin = margin || 32;
        return wx > this.x - margin && wx < this.x + this.screenW + margin &&
               wy > this.y - margin && wy < this.y + this.screenH + margin;
    },

    shake: 0,
    shakeIntensity: 0,

    addShake(intensity) {
        this.shake = 10;
        this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
    },

    getShakeOffset() {
        if (this.shake <= 0) return { x: 0, y: 0 };
        this.shake--;
        if (this.shake <= 0) this.shakeIntensity = 0;
        return {
            x: (Math.random() - 0.5) * this.shakeIntensity * 2,
            y: (Math.random() - 0.5) * this.shakeIntensity * 2
        };
    }
};
