window.Game = window.Game || {};

Game.TileType = {
    EMPTY: 0,
    PATH: 1,
    BASE: 2,
    WALL: 3,
    TURRET: 4,
    SPAWN: 5
};

Game.Map = {
    width: Game.Config.MAP_WIDTH,
    height: Game.Config.MAP_HEIGHT,
    tiles: null,
    spawnPoints: [],
    baseTiles: [],
    baseCenter: { x: 0, y: 0 },
    stationPos: { x: 0, y: 0 },
    groundCanvas: null,
    groundDirty: true,

    init() {
        const w = this.width;
        const h = this.height;
        this.tiles = new Uint8Array(w * h);

        // Place base at center (2x2)
        const bx = Math.floor(w / 2) - 1;
        const by = Math.floor(h / 2) - 1;
        const bs = Game.Config.BASE_SIZE;
        this.baseTiles = [];
        for (let dy = 0; dy < bs; dy++) {
            for (let dx = 0; dx < bs; dx++) {
                this.setTile(bx + dx, by + dy, Game.TileType.BASE);
                this.baseTiles.push({ x: bx + dx, y: by + dy });
            }
        }
        this.baseCenter = {
            x: (bx + bs / 2) * Game.Config.TILE_SIZE,
            y: (by + bs / 2) * Game.Config.TILE_SIZE
        };
        // Station is just below base center
        this.stationPos = {
            x: this.baseCenter.x,
            y: this.baseCenter.y + Game.Config.TILE_SIZE * 1.5
        };

        // Place spawn points at edges
        this.spawnPoints = [
            { x: Math.floor(w / 2), y: 0 },           // top
            { x: w - 1, y: Math.floor(h / 2) },        // right
            { x: Math.floor(w / 2), y: h - 1 },        // bottom
            { x: 0, y: Math.floor(h / 2) }              // left
        ];
        for (const sp of this.spawnPoints) {
            this.setTile(sp.x, sp.y, Game.TileType.SPAWN);
        }

        this.groundDirty = true;
    },

    getTile(x, y) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) return -1;
        return this.tiles[y * this.width + x];
    },

    setTile(x, y, type) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;
        this.tiles[y * this.width + x] = type;
        this.groundDirty = true;
    },

    worldToTile(wx, wy) {
        return {
            x: Math.floor(wx / Game.Config.TILE_SIZE),
            y: Math.floor(wy / Game.Config.TILE_SIZE)
        };
    },

    tileToWorld(tx, ty) {
        return {
            x: tx * Game.Config.TILE_SIZE + Game.Config.TILE_SIZE / 2,
            y: ty * Game.Config.TILE_SIZE + Game.Config.TILE_SIZE / 2
        };
    },

    canPlace(tx, ty) {
        const tile = this.getTile(tx, ty);
        return tile === Game.TileType.EMPTY;
    },

    // A* pathfinding from spawn to base center tile
    findPath(startTx, startTy) {
        const targetTx = Math.floor(this.width / 2);
        const targetTy = Math.floor(this.height / 2);
        const w = this.width;
        const h = this.height;

        const key = (x, y) => y * w + x;
        const open = [];
        const gScore = new Float32Array(w * h).fill(Infinity);
        const fScore = new Float32Array(w * h).fill(Infinity);
        const cameFrom = new Int32Array(w * h).fill(-1);
        const closed = new Uint8Array(w * h);

        const heuristic = (x, y) => Math.abs(x - targetTx) + Math.abs(y - targetTy);

        gScore[key(startTx, startTy)] = 0;
        fScore[key(startTx, startTy)] = heuristic(startTx, startTy);
        open.push({ x: startTx, y: startTy, f: fScore[key(startTx, startTy)] });

        const dirs = [
            { dx: 0, dy: -1 }, { dx: 1, dy: 0 },
            { dx: 0, dy: 1 }, { dx: -1, dy: 0 }
        ];

        while (open.length > 0) {
            // Find lowest f-score
            let bestIdx = 0;
            for (let i = 1; i < open.length; i++) {
                if (open[i].f < open[bestIdx].f) bestIdx = i;
            }
            const current = open.splice(bestIdx, 1)[0];
            const ck = key(current.x, current.y);

            if (current.x === targetTx && current.y === targetTy) {
                // Reconstruct path
                const path = [];
                let k = ck;
                while (k !== -1) {
                    const py = Math.floor(k / w);
                    const px = k % w;
                    path.unshift(this.tileToWorld(px, py));
                    k = cameFrom[k];
                }
                return path;
            }

            closed[ck] = 1;

            for (const dir of dirs) {
                const nx = current.x + dir.dx;
                const ny = current.y + dir.dy;
                if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
                const nk = key(nx, ny);
                if (closed[nk]) continue;

                const tile = this.getTile(nx, ny);
                // Can walk on empty, path, base, spawn tiles
                if (tile === Game.TileType.WALL || tile === Game.TileType.TURRET) continue;

                const tentG = gScore[ck] + 1;
                if (tentG < gScore[nk]) {
                    cameFrom[nk] = ck;
                    gScore[nk] = tentG;
                    fScore[nk] = tentG + heuristic(nx, ny);
                    // Check if already in open
                    let found = false;
                    for (let i = 0; i < open.length; i++) {
                        if (open[i].x === nx && open[i].y === ny) {
                            open[i].f = fScore[nk];
                            found = true;
                            break;
                        }
                    }
                    if (!found) {
                        open.push({ x: nx, y: ny, f: fScore[nk] });
                    }
                }
            }
        }

        // No path found - return direct path to base
        return [this.tileToWorld(startTx, startTy), { x: this.baseCenter.x, y: this.baseCenter.y }];
    },

    cachedPaths: {},

    recalcPaths() {
        this.cachedPaths = {};
        for (let i = 0; i < this.spawnPoints.length; i++) {
            const sp = this.spawnPoints[i];
            this.cachedPaths[i] = this.findPath(sp.x, sp.y);
        }
    },

    getPathForSpawn(spawnIndex) {
        return this.cachedPaths[spawnIndex] || null;
    }
};
