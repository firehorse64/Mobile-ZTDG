window.Game = window.Game || {};

Game.Input = {
    // Joystick state
    joystick: { active: false, id: -1, startX: 0, startY: 0, dx: 0, dy: 0, angle: 0 },

    // Aim state (combat phase)
    aim: { active: false, id: -1, x: 0, y: 0, angle: 0 },

    // Tap detection
    taps: [],
    _pendingTaps: [],

    // Screen dimensions for scaling
    scaleX: 1,
    scaleY: 1,
    canvas: null,

    init(canvas) {
        this.canvas = canvas;
        canvas.addEventListener('touchstart', (e) => this.onTouchStart(e), { passive: false });
        canvas.addEventListener('touchmove', (e) => this.onTouchMove(e), { passive: false });
        canvas.addEventListener('touchend', (e) => this.onTouchEnd(e), { passive: false });
        canvas.addEventListener('touchcancel', (e) => this.onTouchEnd(e), { passive: false });

        // Mouse fallback for desktop testing
        this._mouseDown = false;
        canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
        canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
        canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
    },

    updateScale(canvasW, canvasH) {
        if (!this.canvas) return;
        const rect = this.canvas.getBoundingClientRect();
        this.scaleX = Game.Config.INTERNAL_WIDTH / rect.width;
        this.scaleY = Game.Config.INTERNAL_HEIGHT / rect.height;
    },

    _getPos(touch) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: (touch.clientX - rect.left) * this.scaleX,
            y: (touch.clientY - rect.top) * this.scaleY
        };
    },

    onTouchStart(e) {
        e.preventDefault();
        for (let i = 0; i < e.changedTouches.length; i++) {
            const t = e.changedTouches[i];
            const pos = this._getPos(t);

            if (!Game.Phase || Game.Phase.current === 'title' || Game.Phase.current === 'game_over' || Game.Phase.current === 'wave_complete') {
                // Menu screens: any touch is a tap
                this._pendingTaps.push({ x: pos.x, y: pos.y });
            } else if (Game.Phase.current === 'combat' || Game.Phase.current === 'combat_countdown') {
                // In combat: any touch is aim
                if (!this.aim.active) {
                    this.aim.active = true;
                    this.aim.id = t.identifier;
                    this.aim.x = pos.x;
                    this.aim.y = pos.y;
                }
            } else {
                // Build phase: left side = joystick, right side = tap
                if (pos.x < Game.Config.INTERNAL_WIDTH * 0.35 && !this.joystick.active) {
                    this.joystick.active = true;
                    this.joystick.id = t.identifier;
                    this.joystick.startX = pos.x;
                    this.joystick.startY = pos.y;
                    this.joystick.dx = 0;
                    this.joystick.dy = 0;
                } else {
                    this._pendingTaps.push({ x: pos.x, y: pos.y });
                }
            }
        }
    },

    onTouchMove(e) {
        e.preventDefault();
        for (let i = 0; i < e.changedTouches.length; i++) {
            const t = e.changedTouches[i];
            const pos = this._getPos(t);

            if (t.identifier === this.joystick.id && this.joystick.active) {
                let dx = pos.x - this.joystick.startX;
                let dy = pos.y - this.joystick.startY;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const maxR = Game.Config.JOYSTICK_RADIUS;
                if (dist > maxR) {
                    dx = (dx / dist) * maxR;
                    dy = (dy / dist) * maxR;
                }
                if (dist < Game.Config.JOYSTICK_DEAD_ZONE) {
                    dx = 0;
                    dy = 0;
                }
                this.joystick.dx = dx / maxR;
                this.joystick.dy = dy / maxR;
                this.joystick.angle = Math.atan2(dy, dx);
            }

            if (t.identifier === this.aim.id && this.aim.active) {
                this.aim.x = pos.x;
                this.aim.y = pos.y;
            }
        }
    },

    onTouchEnd(e) {
        e.preventDefault();
        for (let i = 0; i < e.changedTouches.length; i++) {
            const t = e.changedTouches[i];
            if (t.identifier === this.joystick.id) {
                this.joystick.active = false;
                this.joystick.id = -1;
                this.joystick.dx = 0;
                this.joystick.dy = 0;
            }
            if (t.identifier === this.aim.id) {
                this.aim.active = false;
                this.aim.id = -1;
            }
        }
    },

    // Mouse fallback
    onMouseDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        const pos = {
            x: (e.clientX - rect.left) * this.scaleX,
            y: (e.clientY - rect.top) * this.scaleY
        };
        this._mouseDown = true;

        if (!Game.Phase || Game.Phase.current === 'title' || Game.Phase.current === 'game_over' || Game.Phase.current === 'wave_complete') {
            this._pendingTaps.push({ x: pos.x, y: pos.y });
        } else if (Game.Phase.current === 'combat' || Game.Phase.current === 'combat_countdown') {
            this.aim.active = true;
            this.aim.x = pos.x;
            this.aim.y = pos.y;
        } else {
            if (pos.x < Game.Config.INTERNAL_WIDTH * 0.35) {
                this.joystick.active = true;
                this.joystick.startX = pos.x;
                this.joystick.startY = pos.y;
                this.joystick.dx = 0;
                this.joystick.dy = 0;
            } else {
                this._pendingTaps.push({ x: pos.x, y: pos.y });
            }
        }
    },

    onMouseMove(e) {
        if (!this._mouseDown) return;
        const rect = this.canvas.getBoundingClientRect();
        const pos = {
            x: (e.clientX - rect.left) * this.scaleX,
            y: (e.clientY - rect.top) * this.scaleY
        };

        if (Game.Phase && Game.Phase.current === 'combat') {
            this.aim.x = pos.x;
            this.aim.y = pos.y;
        } else if (this.joystick.active) {
            let dx = pos.x - this.joystick.startX;
            let dy = pos.y - this.joystick.startY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const maxR = Game.Config.JOYSTICK_RADIUS;
            if (dist > maxR) { dx = (dx / dist) * maxR; dy = (dy / dist) * maxR; }
            if (dist < Game.Config.JOYSTICK_DEAD_ZONE) { dx = 0; dy = 0; }
            this.joystick.dx = dx / maxR;
            this.joystick.dy = dy / maxR;
        }
    },

    onMouseUp(e) {
        this._mouseDown = false;
        this.joystick.active = false;
        this.joystick.dx = 0;
        this.joystick.dy = 0;
        this.aim.active = false;
    },

    consumeTaps() {
        this.taps = this._pendingTaps;
        this._pendingTaps = [];
        return this.taps;
    }
};
