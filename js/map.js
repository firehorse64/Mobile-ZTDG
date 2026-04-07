window.Game = window.Game || {};

Game.TileType = {
    EMPTY: 0,
    PATH: 1,
    BASE: 2,
    WALL: 3,
    TURRET: 4,
    SPAWN: 5,
    ROAD: 6,
    RUIN: 7,      // Impassable building ruins
    RUBBLE: 8     // Walkable debris / destroyed area
};

Game.Map = {
    width: Game.Config.MAP_WIDTH,
    height: Game.Config.MAP_HEIGHT,
    tiles: null,
    decor: null,   // Per-tile decoration seed for visual variety
    spawnPoints: [],
    baseTiles: [],
    baseCenter: { x: 0, y: 0 },
    stationPos: { x: 0, y: 0 },
    groundCanvas: null,
    groundDirty: true,
    _seed: 1,

    // Simple seeded RNG for reproducible maps
    _rng() {
        this._seed = (this._seed * 16807 + 0) % 2147483647;
        return (this._seed - 1) / 2147483646;
    },

    init() {
        this._seed = Date.now() % 100000;
        const w = this.width;
        const h = this.height;
        this.tiles = new Uint8Array(w * h);
        this.decor = new Uint8Array(w * h);

        // Fill decoration seeds
        for (var i = 0; i < w * h; i++) {
            this.decor[i] = Math.floor(this._rng() * 255);
        }

        // Generate city layout
        this._generateCity();

        // Place base at center (2x2) - clear area around it
        const bx = Math.floor(w / 2) - 1;
        const by = Math.floor(h / 2) - 1;
        const bs = Game.Config.BASE_SIZE;
        this.baseTiles = [];

        // Clear a safe zone around base (5 tile radius)
        for (var dy = -5; dy <= bs + 4; dy++) {
            for (var dx = -5; dx <= bs + 4; dx++) {
                var tx = bx + dx;
                var ty = by + dy;
                if (tx >= 0 && tx < w && ty >= 0 && ty < h) {
                    var dist = Math.max(Math.abs(dx - bs/2 + 0.5), Math.abs(dy - bs/2 + 0.5));
                    if (dist <= 3) {
                        this.tiles[ty * w + tx] = Game.TileType.ROAD;
                    } else if (dist <= 5 && this.tiles[ty * w + tx] === Game.TileType.RUIN) {
                        this.tiles[ty * w + tx] = Game.TileType.RUBBLE;
                    }
                }
            }
        }

        for (var dy = 0; dy < bs; dy++) {
            for (var dx = 0; dx < bs; dx++) {
                this.setTile(bx + dx, by + dy, Game.TileType.BASE);
                this.baseTiles.push({ x: bx + dx, y: by + dy });
            }
        }
        this.baseCenter = {
            x: (bx + bs / 2) * Game.Config.TILE_SIZE,
            y: (by + bs / 2) * Game.Config.TILE_SIZE
        };
        this.stationPos = {
            x: this.baseCenter.x,
            y: this.baseCenter.y + Game.Config.TILE_SIZE * 1.5
        };

        // Place spawn points at edges along roads
        this.spawnPoints = [
            { x: Math.floor(w / 2), y: 0 },
            { x: w - 1, y: Math.floor(h / 2) },
            { x: Math.floor(w / 2), y: h - 1 },
            { x: 0, y: Math.floor(h / 2) }
        ];
        // Clear paths from spawns to ensure connectivity
        for (var si = 0; si < this.spawnPoints.length; si++) {
            var sp = this.spawnPoints[si];
            this.setTile(sp.x, sp.y, Game.TileType.SPAWN);
            this._clearPathToBase(sp.x, sp.y);
        }

        this.groundDirty = true;
    },

    _generateCity() {
        var w = this.width;
        var h = this.height;

        // Start with cracked ground everywhere
        for (var i = 0; i < w * h; i++) {
            this.tiles[i] = Game.TileType.EMPTY;
        }

        // Lay down a grid of roads
        var roadSpacing = 5 + Math.floor(this._rng() * 3); // 5-7 tiles apart

        // Horizontal roads
        for (var y = roadSpacing; y < h; y += roadSpacing) {
            var wobble = 0;
            for (var x = 0; x < w; x++) {
                // Roads have slight wobble
                if (this._rng() < 0.08) wobble += (this._rng() < 0.5 ? 1 : -1);
                wobble = Math.max(-1, Math.min(1, wobble));
                var ry = Math.max(0, Math.min(h - 1, y + wobble));
                this.tiles[ry * w + x] = Game.TileType.ROAD;
                // Some roads are 2 tiles wide
                if (this._rng() < 0.4 && ry + 1 < h) {
                    this.tiles[(ry + 1) * w + x] = Game.TileType.ROAD;
                }
            }
        }

        // Vertical roads
        for (var x = roadSpacing; x < w; x += roadSpacing) {
            var wobble = 0;
            for (var y = 0; y < h; y++) {
                if (this._rng() < 0.08) wobble += (this._rng() < 0.5 ? 1 : -1);
                wobble = Math.max(-1, Math.min(1, wobble));
                var rx = Math.max(0, Math.min(w - 1, x + wobble));
                this.tiles[y * w + rx] = Game.TileType.ROAD;
                if (this._rng() < 0.4 && rx + 1 < w) {
                    this.tiles[y * w + rx + 1] = Game.TileType.ROAD;
                }
            }
        }

        // Place building ruins in blocks between roads
        for (var by = 1; by < h - 1; by++) {
            for (var bx = 1; bx < w - 1; bx++) {
                if (this.tiles[by * w + bx] !== Game.TileType.EMPTY) continue;

                // Check if surrounded by non-road (interior of a block)
                var nearRoad = false;
                for (var dd = -1; dd <= 1; dd++) {
                    if (this.tiles[by * w + (bx + dd)] === Game.TileType.ROAD ||
                        this.tiles[(by + dd) * w + bx] === Game.TileType.ROAD) {
                        nearRoad = true;
                        break;
                    }
                }

                if (!nearRoad) {
                    // Interior tile - high chance of being a ruin
                    if (this._rng() < 0.75) {
                        this.tiles[by * w + bx] = Game.TileType.RUIN;
                    } else {
                        this.tiles[by * w + bx] = Game.TileType.RUBBLE;
                    }
                } else {
                    // Adjacent to road - could be rubble/sidewalk
                    if (this._rng() < 0.35) {
                        this.tiles[by * w + bx] = Game.TileType.RUBBLE;
                    }
                }
            }
        }

        // Scatter some rubble on roads (destroyed cars, debris)
        for (var i = 0; i < w * h; i++) {
            if (this.tiles[i] === Game.TileType.ROAD && this._rng() < 0.05) {
                this.tiles[i] = Game.TileType.RUBBLE;
            }
        }

        // Create some open plazas / parking lots (clearings)
        var numPlazas = 3 + Math.floor(this._rng() * 4);
        for (var p = 0; p < numPlazas; p++) {
            var px = 4 + Math.floor(this._rng() * (w - 8));
            var py = 4 + Math.floor(this._rng() * (h - 8));
            var pr = 2 + Math.floor(this._rng() * 3);
            for (var dy = -pr; dy <= pr; dy++) {
                for (var dx = -pr; dx <= pr; dx++) {
                    var tx = px + dx;
                    var ty = py + dy;
                    if (tx >= 0 && tx < w && ty >= 0 && ty < h) {
                        if (dx * dx + dy * dy <= pr * pr) {
                            this.tiles[ty * w + tx] = this._rng() < 0.2 ? Game.TileType.RUBBLE : Game.TileType.ROAD;
                        }
                    }
                }
            }
        }
    },

    _clearPathToBase(sx, sy) {
        // Carve a road from spawn to base center to ensure pathfinding works
        var w = this.width;
        var cx = Math.floor(w / 2);
        var cy = Math.floor(this.height / 2);
        var x = sx, y = sy;

        while (x !== cx || y !== cy) {
            var tile = this.tiles[y * w + x];
            if (tile === Game.TileType.RUIN || tile === Game.TileType.EMPTY) {
                this.tiles[y * w + x] = Game.TileType.ROAD;
            }
            // Also clear adjacent tile for width
            if (x + 1 < w) {
                var adj = this.tiles[y * w + x + 1];
                if (adj === Game.TileType.RUIN) {
                    this.tiles[y * w + x + 1] = Game.TileType.RUBBLE;
                }
            }

            if (Math.abs(x - cx) > Math.abs(y - cy)) {
                x += (cx > x) ? 1 : -1;
            } else {
                y += (cy > y) ? 1 : -1;
            }
        }
    },

    getTile(x, y) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) return -1;
        return this.tiles[y * this.width + x];
    },

    getDecor(x, y) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) return 0;
        return this.decor[y * this.width + x];
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
        var tile = this.getTile(tx, ty);
        return tile === Game.TileType.EMPTY || tile === Game.TileType.ROAD || tile === Game.TileType.RUBBLE;
    },

    isPassable(tile) {
        return tile !== Game.TileType.WALL && tile !== Game.TileType.TURRET &&
               tile !== Game.TileType.RUIN && tile !== -1;
    },

    // A* pathfinding from spawn to base center tile
    findPath(startTx, startTy) {
        var targetTx = Math.floor(this.width / 2);
        var targetTy = Math.floor(this.height / 2);
        var w = this.width;
        var h = this.height;

        var key = function(x, y) { return y * w + x; };
        var open = [];
        var gScore = new Float32Array(w * h).fill(Infinity);
        var fScore = new Float32Array(w * h).fill(Infinity);
        var cameFrom = new Int32Array(w * h).fill(-1);
        var closed = new Uint8Array(w * h);

        var heuristic = function(x, y) { return Math.abs(x - targetTx) + Math.abs(y - targetTy); };

        gScore[key(startTx, startTy)] = 0;
        fScore[key(startTx, startTy)] = heuristic(startTx, startTy);
        open.push({ x: startTx, y: startTy, f: fScore[key(startTx, startTy)] });

        var dirs = [
            { dx: 0, dy: -1 }, { dx: 1, dy: 0 },
            { dx: 0, dy: 1 }, { dx: -1, dy: 0 }
        ];

        while (open.length > 0) {
            var bestIdx = 0;
            for (var i = 1; i < open.length; i++) {
                if (open[i].f < open[bestIdx].f) bestIdx = i;
            }
            var current = open.splice(bestIdx, 1)[0];
            var ck = key(current.x, current.y);

            if (current.x === targetTx && current.y === targetTy) {
                var path = [];
                var k = ck;
                while (k !== -1) {
                    var py = Math.floor(k / w);
                    var px = k % w;
                    path.unshift(this.tileToWorld(px, py));
                    k = cameFrom[k];
                }
                return path;
            }

            closed[ck] = 1;

            for (var d = 0; d < dirs.length; d++) {
                var dir = dirs[d];
                var nx = current.x + dir.dx;
                var ny = current.y + dir.dy;
                if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
                var nk = key(nx, ny);
                if (closed[nk]) continue;

                var tile = this.getTile(nx, ny);
                if (!this.isPassable(tile)) continue;

                // Roads are faster to traverse than rubble/empty
                var cost = (tile === Game.TileType.ROAD) ? 1 : 1.5;
                var tentG = gScore[ck] + cost;
                if (tentG < gScore[nk]) {
                    cameFrom[nk] = ck;
                    gScore[nk] = tentG;
                    fScore[nk] = tentG + heuristic(nx, ny);
                    var found = false;
                    for (var i = 0; i < open.length; i++) {
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

        // No path found - direct path fallback
        return [this.tileToWorld(startTx, startTy), { x: this.baseCenter.x, y: this.baseCenter.y }];
    },

    cachedPaths: {},

    recalcPaths() {
        this.cachedPaths = {};
        for (var i = 0; i < this.spawnPoints.length; i++) {
            var sp = this.spawnPoints[i];
            this.cachedPaths[i] = this.findPath(sp.x, sp.y);
        }
    },

    getPathForSpawn(spawnIndex) {
        return this.cachedPaths[spawnIndex] || null;
    }
};
