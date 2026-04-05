window.Game = window.Game || {};

Game.Wave = {
    number: 0,
    totalZombies: 0,
    spawnedCount: 0,
    killedCount: 0,
    spawnTimer: 0,
    spawnInterval: 0,
    activeSpawnPoints: 1,
    running: false,

    init() {
        this.number = 0;
        this.running = false;
    },

    startWave() {
        this.number++;
        const n = this.number;

        this.totalZombies = 5 + n * 3;
        this.spawnedCount = 0;
        this.killedCount = 0;
        this.spawnInterval = Math.max(400, 1500 - n * 50);
        this.spawnTimer = 0;
        this.activeSpawnPoints = Math.min(4, 1 + Math.floor(n / 3));
        this.running = true;

        // Recalculate paths for this wave
        Game.Map.recalcPaths();
    },

    getZombieType() {
        const n = this.number;
        const roll = Math.random();

        const tankChance = Math.min(0.25, n * 0.02);
        const runnerChance = Math.min(0.35, n * 0.03);

        if (roll < tankChance && n >= 3) return 'tank';
        if (roll < tankChance + runnerChance && n >= 2) return 'runner';
        return 'walker';
    },

    update(dt) {
        if (!this.running) return;

        // Spawn zombies
        if (this.spawnedCount < this.totalZombies) {
            this.spawnTimer -= dt;
            if (this.spawnTimer <= 0 && Game.ZombieManager.pool.count < Game.Config.MAX_ACTIVE_ZOMBIES) {
                const type = this.getZombieType();
                const spawnIdx = Math.floor(Math.random() * this.activeSpawnPoints);
                Game.ZombieManager.spawn(type, spawnIdx);
                this.spawnedCount++;
                this.spawnTimer = this.spawnInterval;
            }
        }

        // Check wave complete
        if (this.spawnedCount >= this.totalZombies && Game.ZombieManager.pool.count === 0) {
            this.running = false;
        }
    },

    isComplete() {
        return !this.running && this.spawnedCount >= this.totalZombies;
    },

    onZombieKilled() {
        this.killedCount++;
    }
};
