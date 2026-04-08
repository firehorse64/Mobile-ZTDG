window.Game = window.Game || {};

Game.TileType = { EMPTY:0, ROAD:1, RUIN:2, RUBBLE:3, WATER:4, TREE:5, BUSH:6, WALL:7, DOOR:8, STRUCTURE:9, FARM:10 };

Game.World = {
    tiles: null, decor: null, scavenged: null,
    structures: [], // {tileX,tileY,type,health,maxHealth,data}
    _seed: 1, revealed: null,
    width: 0, height: 0,
    chunkCanvases: {},
    dirtyChunks: {},

    _rng() { this._seed=(this._seed*16807)%2147483647; return(this._seed-1)/2147483646; },

    init(seed) {
        this._seed = seed || (Date.now() % 99999) + 1;
        var w = Game.Config.WORLD_TILES;
        this.width = w; this.height = w;
        this.tiles = new Uint8Array(w * w);
        this.decor = new Uint8Array(w * w);
        this.scavenged = new Uint8Array(w * w);
        this.revealed = new Uint8Array(Game.Config.WORLD_CHUNKS * Game.Config.WORLD_CHUNKS);
        this.structures = [];
        this.chunkCanvases = {};
        this.dirtyChunks = {};

        for (var i = 0; i < w * w; i++) this.decor[i] = Math.floor(this._rng() * 255);
        this._generate();
    },

    _generate() {
        var w = this.width, h = this.height;
        var cx = Math.floor(w / 2), cy = Math.floor(h / 2);

        // Fill with wilderness
        for (var i = 0; i < w * h; i++) {
            this.tiles[i] = this._rng() < 0.12 ? Game.TileType.TREE :
                            this._rng() < 0.06 ? Game.TileType.BUSH : Game.TileType.EMPTY;
        }

        // City center zone (radius ~60 tiles around center)
        this._generateCity(cx, cy, 55);

        // Suburban zones
        this._generateSuburb(cx - 80, cy - 30, 25);
        this._generateSuburb(cx + 70, cy + 40, 20);
        this._generateSuburb(cx - 20, cy + 80, 22);

        // Water bodies
        this._generateLake(cx + 50, cy - 50, 12);
        this._generateLake(cx - 60, cy + 60, 8);
        this._generateLake(cx - 90, cy - 70, 10);
        // Rivers
        this._generateRiver(0, Math.floor(h * 0.3), w, Math.floor(h * 0.35));
        this._generateRiver(Math.floor(w * 0.6), 0, Math.floor(w * 0.65), h);

        // Main roads connecting areas
        this._carveRoad(0, cy, w - 1, cy, 2);
        this._carveRoad(cx, 0, cx, h - 1, 2);
        // Diagonal roads
        this._carveRoad(cx - 80, cy - 80, cx + 80, cy + 80, 1);
        this._carveRoad(cx + 80, cy - 80, cx - 80, cy + 80, 1);

        // Forest patches
        this._generateForest(cx - 100, cy - 100, 30);
        this._generateForest(cx + 90, cy - 80, 25);
        this._generateForest(cx - 40, cy + 100, 28);
        this._generateForest(cx + 100, cy + 90, 22);

        // Player spawn area clear
        for (var dy = -4; dy <= 4; dy++)
            for (var dx = -4; dx <= 4; dx++) {
                var tx = cx + dx, ty = cy + dy;
                if (tx >= 0 && tx < w && ty >= 0 && ty < h) {
                    if (dx*dx+dy*dy <= 9) this.tiles[ty*w+tx] = Game.TileType.ROAD;
                    else if (this.tiles[ty*w+tx] === Game.TileType.RUIN || this.tiles[ty*w+tx] === Game.TileType.TREE)
                        this.tiles[ty*w+tx] = Game.TileType.RUBBLE;
                }
            }
    },

    _generateCity(ox, oy, radius) {
        var w = this.width;
        var spacing = 5 + Math.floor(this._rng() * 2);
        for (var y = oy - radius; y < oy + radius; y++) {
            for (var x = ox - radius; x < ox + radius; x++) {
                if (x < 0 || x >= w || y < 0 || y >= w) continue;
                var dx = x - ox, dy = y - oy;
                if (dx*dx + dy*dy > radius * radius) continue;
                var isRoadH = (y % spacing < 2), isRoadV = (x % spacing < 2);
                if (isRoadH || isRoadV) { this.tiles[y*w+x] = Game.TileType.ROAD; }
                else if (this._rng() < 0.65) { this.tiles[y*w+x] = Game.TileType.RUIN; }
                else { this.tiles[y*w+x] = this._rng()<0.5 ? Game.TileType.RUBBLE : Game.TileType.EMPTY; }
            }
        }
    },

    _generateSuburb(ox, oy, radius) {
        var w = this.width;
        for (var y = oy - radius; y < oy + radius; y++) {
            for (var x = ox - radius; x < ox + radius; x++) {
                if (x < 0 || x >= w || y < 0 || y >= w) continue;
                if ((x-ox)*(x-ox)+(y-oy)*(y-oy) > radius*radius) continue;
                var isRoad = ((y-oy) % 7 < 1) || ((x-ox) % 7 < 1);
                if (isRoad) this.tiles[y*w+x] = Game.TileType.ROAD;
                else if (this._rng() < 0.35) this.tiles[y*w+x] = Game.TileType.RUIN;
                else if (this._rng() < 0.2) this.tiles[y*w+x] = Game.TileType.TREE;
                else this.tiles[y*w+x] = this._rng()<0.3 ? Game.TileType.RUBBLE : Game.TileType.EMPTY;
            }
        }
    },

    _generateLake(ox, oy, radius) {
        var w = this.width;
        for (var dy = -radius-2; dy <= radius+2; dy++)
            for (var dx = -radius-2; dx <= radius+2; dx++) {
                var x = ox+dx, y = oy+dy;
                if (x < 0 || x >= w || y < 0 || y >= w) continue;
                var d = Math.sqrt(dx*dx+dy*dy);
                var r = radius + (this._rng()-0.5)*4;
                if (d < r) this.tiles[y*w+x] = Game.TileType.WATER;
                else if (d < r+2 && this.tiles[y*w+x]!==Game.TileType.WATER)
                    this.tiles[y*w+x] = Game.TileType.EMPTY;
            }
    },

    _generateRiver(x0, y0, x1, y1) {
        var w = this.width;
        var x = x0, y = y0;
        while ((x!==x1||y!==y1)&&x>=0&&x<w&&y>=0&&y<w) {
            for (var d=-1;d<=1;d++) {
                var tx=x+d, ty=y;
                if(tx>=0&&tx<w) this.tiles[ty*w+tx]=Game.TileType.WATER;
                tx=x; ty=y+d;
                if(ty>=0&&ty<w) this.tiles[ty*w+tx]=Game.TileType.WATER;
            }
            if (Math.abs(x1-x) > Math.abs(y1-y)) x += x1>x?1:-1;
            else y += y1>y?1:-1;
            // Wobble
            if (this._rng()<0.3) { x += this._rng()<0.5?1:-1; x=Math.max(1,Math.min(w-2,x)); }
        }
    },

    _carveRoad(x0, y0, x1, y1, width) {
        var w = this.width;
        var x = x0, y = y0;
        while (x !== x1 || y !== y1) {
            for (var d = -width; d <= width; d++) {
                var tx, ty;
                if (Math.abs(x1-x) > Math.abs(y1-y)) { tx=x; ty=y+d; }
                else { tx=x+d; ty=y; }
                if (tx>=0&&tx<w&&ty>=0&&ty<w) {
                    var t=this.tiles[ty*w+tx];
                    if (t!==Game.TileType.WATER) this.tiles[ty*w+tx]=Game.TileType.ROAD;
                }
            }
            if (Math.abs(x1-x) >= Math.abs(y1-y)) x += x1>x?1:-1;
            else y += y1>y?1:-1;
        }
    },

    _generateForest(ox, oy, radius) {
        var w = this.width;
        for (var dy = -radius; dy <= radius; dy++)
            for (var dx = -radius; dx <= radius; dx++) {
                var x=ox+dx, y=oy+dy;
                if (x<0||x>=w||y<0||y>=w) continue;
                if (dx*dx+dy*dy > radius*radius) continue;
                var t = this.tiles[y*w+x];
                if (t===Game.TileType.ROAD||t===Game.TileType.WATER||t===Game.TileType.RUIN) continue;
                if (this._rng()<0.55) this.tiles[y*w+x]=Game.TileType.TREE;
                else if (this._rng()<0.3) this.tiles[y*w+x]=Game.TileType.BUSH;
            }
    },

    getTile(x,y) { if(x<0||x>=this.width||y<0||y>=this.height) return-1; return this.tiles[y*this.width+x]; },
    getDecor(x,y) { if(x<0||x>=this.width||y<0||y>=this.height) return 0; return this.decor[y*this.width+x]; },
    setTile(x,y,t) { if(x<0||x>=this.width||y<0||y>=this.height) return; this.tiles[y*this.width+x]=t; this.markChunkDirty(x,y); },

    markChunkDirty(tx,ty) {
        var cs=Game.Config.CHUNK_SIZE;
        var key=Math.floor(tx/cs)+','+Math.floor(ty/cs);
        this.dirtyChunks[key]=true;
    },

    worldToTile(wx,wy) { return {x:Math.floor(wx/Game.Config.TILE_SIZE),y:Math.floor(wy/Game.Config.TILE_SIZE)}; },
    tileToWorld(tx,ty) { var s=Game.Config.TILE_SIZE; return {x:tx*s+s/2,y:ty*s+s/2}; },

    isSolid(tx,ty) {
        var t = this.getTile(tx,ty);
        if (t===-1||t===Game.TileType.RUIN||t===Game.TileType.TREE||t===Game.TileType.WATER||t===Game.TileType.WALL) return true;
        // Check structures
        var s = this.getStructureAt(tx,ty);
        if (s && Game.Config.STRUCTURES[s.type] && Game.Config.STRUCTURES[s.type].solid) return true;
        return false;
    },

    canBuild(tx,ty) {
        var t = this.getTile(tx,ty);
        return (t===Game.TileType.EMPTY||t===Game.TileType.ROAD||t===Game.TileType.RUBBLE) && !this.getStructureAt(tx,ty);
    },

    canFarm(tx,ty) {
        var t = this.getTile(tx,ty);
        return (t===Game.TileType.EMPTY||t===Game.TileType.RUBBLE) && !this.getStructureAt(tx,ty);
    },

    addStructure(tx,ty,type,data) {
        var cfg = Game.Config.STRUCTURES[type];
        if (!cfg) return null;
        var s = {tileX:tx,tileY:ty,type:type,health:cfg.health,maxHealth:cfg.health,data:data||{}};
        var pos = this.tileToWorld(tx,ty);
        s.x = pos.x; s.y = pos.y;
        // Turret-specific
        if (type==='turret_gun'||type==='turret_shotgun') { s.angle=0; s.cooldown=0; }
        // Farm
        if (type==='farm_plot') { s.data.crop=null; s.data.growth=0; s.data.watered=0; }
        // Rain collector
        if (type==='rain_collector') { s.data.water=0; s.data.maxWater=5; }
        // Well
        if (type==='well') { s.data.water=0; s.data.maxWater=10; s.data.regenTimer=0; }
        // Storage
        if (type==='storage') { s.data.items=[]; }
        this.structures.push(s);
        if (cfg.solid) this.setTile(tx,ty,Game.TileType.STRUCTURE);
        else this.setTile(tx,ty,Game.TileType.STRUCTURE);
        return s;
    },

    getStructureAt(tx,ty) {
        for (var i=0;i<this.structures.length;i++)
            if (this.structures[i].tileX===tx&&this.structures[i].tileY===ty) return this.structures[i];
        return null;
    },

    removeStructure(s) {
        var idx = this.structures.indexOf(s);
        if (idx!==-1) { this.structures.splice(idx,1); this.setTile(s.tileX,s.tileY,Game.TileType.EMPTY); }
    },

    damageStructure(s,dmg) {
        s.health -= dmg;
        if (s.health <= 0) {
            Game.ParticleManager.burst(s.x,s.y,'#864',6,3,3,300);
            this.removeStructure(s);
        }
    },

    revealAround(wx,wy) {
        var cs = Game.Config.CHUNK_SIZE * Game.Config.TILE_SIZE;
        var ccx = Math.floor(wx/cs), ccy = Math.floor(wy/cs);
        var r = Game.Config.FOG_REVEAL_RADIUS;
        var wc = Game.Config.WORLD_CHUNKS;
        for (var dy=-r;dy<=r;dy++)
            for (var dx=-r;dx<=r;dx++) {
                var cx=ccx+dx, cy=ccy+dy;
                if (cx>=0&&cx<wc&&cy>=0&&cy<wc) this.revealed[cy*wc+cx]=1;
            }
    },

    isRevealed(chunkX,chunkY) {
        if(chunkX<0||chunkX>=Game.Config.WORLD_CHUNKS||chunkY<0||chunkY>=Game.Config.WORLD_CHUNKS) return false;
        return this.revealed[chunkY*Game.Config.WORLD_CHUNKS+chunkX]===1;
    },

    canScavenge(tx,ty) {
        var t = this.getTile(tx,ty);
        if (t!==Game.TileType.RUIN) return false;
        return !this.scavenged[ty*this.width+tx];
    },

    markScavenged(tx,ty) { this.scavenged[ty*this.width+tx]=1; }
};
