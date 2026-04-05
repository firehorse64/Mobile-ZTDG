window.Game = window.Game || {};

Game.ObjectPool = class ObjectPool {
    constructor(factory, reset, initialSize) {
        this.factory = factory;
        this.reset = reset;
        this.active = [];
        this.free = [];
        for (let i = 0; i < initialSize; i++) {
            this.free.push(this.factory());
        }
    }

    acquire() {
        let obj = this.free.length > 0 ? this.free.pop() : this.factory();
        this.active.push(obj);
        return obj;
    }

    release(obj) {
        let idx = this.active.indexOf(obj);
        if (idx !== -1) {
            this.active.splice(idx, 1);
            this.reset(obj);
            this.free.push(obj);
        }
    }

    forEach(fn) {
        for (let i = this.active.length - 1; i >= 0; i--) {
            fn(this.active[i], i);
        }
    }

    clear() {
        while (this.active.length > 0) {
            let obj = this.active.pop();
            this.reset(obj);
            this.free.push(obj);
        }
    }

    get count() {
        return this.active.length;
    }
};
