window.Game = window.Game || {};

Game.Config = {
    TILE_SIZE: 32,
    CHUNK_SIZE: 16, // tiles per chunk
    WORLD_CHUNKS: 20, // 20x20 chunks = 320x320 tiles = 10240x10240 px
    get WORLD_TILES() { return this.CHUNK_SIZE * this.WORLD_CHUNKS; },
    get WORLD_PX() { return this.WORLD_TILES * this.TILE_SIZE; },

    TICK_RATE: 1000 / 30,
    PLAYER_SPEED: 2.8,
    PLAYER_SPRINT_MULT: 1.7,
    PLAYER_RADIUS: 10,

    // Survival
    MAX_HEALTH: 100,
    MAX_HUNGER: 100,
    MAX_THIRST: 100,
    MAX_STAMINA: 100,
    HUNGER_RATE: 0.012,    // per tick
    THIRST_RATE: 0.018,
    STAMINA_DRAIN: 0.4,    // while sprinting
    STAMINA_REGEN: 0.15,
    HEALTH_REGEN_RATE: 0.02, // when fed & hydrated
    STARVE_DAMAGE: 0.05,
    DEHYDRATE_DAMAGE: 0.08,

    // Day/night (in ticks)
    DAY_LENGTH: 3600,   // 2 min day
    NIGHT_LENGTH: 2400, // 80s night
    DAWN_DUSK: 300,

    // Zombies
    ZOMBIE_SPAWN_RADIUS_MIN: 300,
    ZOMBIE_SPAWN_RADIUS_MAX: 600,
    MAX_ZOMBIES: 40,
    ZOMBIE_DAY_RATE: 4000,    // ms between spawns
    ZOMBIE_NIGHT_RATE: 1500,
    ZOMBIE_DETECT_RANGE: 180,
    ZOMBIE_NIGHT_DETECT: 250,
    ZOMBIE_TYPES: {
        walker:  { health: 60, speed: 0.8, damage: 8, xp: 10, radius: 10, attackRate: 1200, color: '#5a5' },
        runner:  { health: 30, speed: 2.0, damage: 5, xp: 15, radius: 8,  attackRate: 800,  color: '#c55' },
        brute:   { health: 200, speed: 0.4, damage: 20, xp: 35, radius: 14, attackRate: 1800, color: '#666' },
        spitter: { health: 45, speed: 0.9, damage: 12, xp: 20, radius: 9,  attackRate: 2000, color: '#5a8' }
    },

    // Loot tables: [item, minQty, maxQty, chance]
    ZOMBIE_LOOT: {
        walker:  [['cloth',1,2,0.5],['raw_meat',1,1,0.3],['metal',1,1,0.15]],
        runner:  [['cloth',1,1,0.4],['raw_meat',1,1,0.2],['pistol_ammo',2,5,0.15]],
        brute:   [['metal',2,4,0.6],['raw_meat',1,2,0.5],['electronics',1,1,0.2],['rifle_ammo',3,6,0.15]],
        spitter: [['cloth',1,2,0.4],['chemicals',1,2,0.3],['medkit',1,1,0.1]]
    },

    // Items
    ITEMS: {
        // Materials
        wood:       { name: 'Wood', type: 'material', stack: 50, icon: '#8B5E3C' },
        stone:      { name: 'Stone', type: 'material', stack: 50, icon: '#888' },
        metal:      { name: 'Metal', type: 'material', stack: 50, icon: '#99a' },
        cloth:      { name: 'Cloth', type: 'material', stack: 50, icon: '#cc9' },
        electronics:{ name: 'Electronics', type: 'material', stack: 30, icon: '#4c8' },
        chemicals:  { name: 'Chemicals', type: 'material', stack: 30, icon: '#a4f' },
        // Ammo
        pistol_ammo:  { name: 'Pistol Ammo', type: 'ammo', stack: 60, icon: '#da5' },
        rifle_ammo:   { name: 'Rifle Ammo', type: 'ammo', stack: 40, icon: '#da5' },
        shotgun_ammo: { name: 'Shotgun Shells', type: 'ammo', stack: 30, icon: '#da5' },
        // Melee weapons
        fists:   { name: 'Fists', type: 'melee', damage: 5, speed: 400, range: 38, icon: '#dba' },
        knife:   { name: 'Knife', type: 'melee', damage: 12, speed: 350, range: 42, icon: '#bbb' },
        bat:     { name: 'Bat', type: 'melee', damage: 18, speed: 550, range: 50, icon: '#8B5E3C' },
        axe:     { name: 'Axe', type: 'melee', damage: 22, speed: 650, range: 46, icon: '#999' },
        // Ranged weapons
        pistol:  { name: 'Pistol', type: 'ranged', damage: 18, speed: 350, range: 200, ammo: 'pistol_ammo', bulletSpeed: 10, spread: 0.05, icon: '#777' },
        rifle:   { name: 'Rifle', type: 'ranged', damage: 35, speed: 700, range: 320, ammo: 'rifle_ammo', bulletSpeed: 14, spread: 0.02, icon: '#666' },
        shotgun: { name: 'Shotgun', type: 'ranged', damage: 12, speed: 800, range: 120, ammo: 'shotgun_ammo', bulletSpeed: 8, spread: 0.3, pellets: 6, icon: '#555' },
        // Food
        canned_food: { name: 'Canned Food', type: 'food', hunger: 30, stack: 10, icon: '#888' },
        raw_meat:    { name: 'Raw Meat', type: 'food', hunger: 10, healthPenalty: 5, stack: 10, icon: '#c66' },
        cooked_meat: { name: 'Cooked Meat', type: 'food', hunger: 40, stack: 10, icon: '#a64' },
        berries:     { name: 'Berries', type: 'food', hunger: 8, thirst: 5, stack: 20, icon: '#c4c' },
        bread:       { name: 'Bread', type: 'food', hunger: 25, stack: 10, icon: '#da8' },
        vegetables:  { name: 'Vegetables', type: 'food', hunger: 20, stack: 15, icon: '#6a4' },
        // Water
        dirty_water:    { name: 'Dirty Water', type: 'water', thirst: 20, healthPenalty: 8, stack: 5, icon: '#764' },
        purified_water: { name: 'Purified Water', type: 'water', thirst: 40, stack: 5, icon: '#48f' },
        // Medical
        bandage: { name: 'Bandage', type: 'medical', heal: 20, stack: 10, icon: '#eee' },
        medkit:  { name: 'Medkit', type: 'medical', heal: 60, stack: 5, icon: '#e44' },
        // Farming
        seeds_wheat:     { name: 'Wheat Seeds', type: 'seed', crop: 'wheat', stack: 20, icon: '#da6' },
        seeds_vegetable: { name: 'Veggie Seeds', type: 'seed', crop: 'vegetable', stack: 20, icon: '#6a4' },
        seeds_berry:     { name: 'Berry Seeds', type: 'seed', crop: 'berry', stack: 20, icon: '#c4c' },
        fertilizer:      { name: 'Fertilizer', type: 'material', stack: 20, icon: '#653' },
        wheat:           { name: 'Wheat', type: 'material', stack: 30, icon: '#da6' },
        // Building
        wall_kit:    { name: 'Wall Kit', type: 'building', structure: 'wall', stack: 10, icon: '#865' },
        door_kit:    { name: 'Door Kit', type: 'building', structure: 'door', stack: 5, icon: '#a86' },
        turret_gun:  { name: 'Gun Turret', type: 'building', structure: 'turret_gun', stack: 3, icon: '#4af' },
        turret_shotgun: { name: 'Shotgun Turret', type: 'building', structure: 'turret_shotgun', stack: 3, icon: '#fa4' },
        storage_box: { name: 'Storage Box', type: 'building', structure: 'storage', stack: 5, icon: '#a86' },
        campfire:    { name: 'Campfire', type: 'building', structure: 'campfire', stack: 3, icon: '#f84' },
        rain_collector: { name: 'Rain Collector', type: 'building', structure: 'rain_collector', stack: 3, icon: '#48f' },
        farm_plot:   { name: 'Farm Plot', type: 'building', structure: 'farm_plot', stack: 5, icon: '#653' },
        water_purifier: { name: 'Water Purifier', type: 'building', structure: 'purifier', stack: 2, icon: '#4af' },
        well:        { name: 'Well', type: 'building', structure: 'well', stack: 2, icon: '#48a' }
    },

    // Crafting recipes: { result, qty, ingredients: [[item, qty], ...], station: null|'campfire'|'purifier' }
    RECIPES: [
        { result: 'bandage', qty: 2, ingredients: [['cloth', 3]] },
        { result: 'knife', qty: 1, ingredients: [['metal', 3], ['wood', 1]] },
        { result: 'bat', qty: 1, ingredients: [['wood', 5]] },
        { result: 'axe', qty: 1, ingredients: [['metal', 4], ['wood', 3]] },
        { result: 'pistol', qty: 1, ingredients: [['metal', 8], ['wood', 2], ['electronics', 2]] },
        { result: 'rifle', qty: 1, ingredients: [['metal', 12], ['wood', 4], ['electronics', 3]] },
        { result: 'shotgun', qty: 1, ingredients: [['metal', 10], ['wood', 3], ['electronics', 2]] },
        { result: 'pistol_ammo', qty: 10, ingredients: [['metal', 3]] },
        { result: 'rifle_ammo', qty: 8, ingredients: [['metal', 5]] },
        { result: 'shotgun_ammo', qty: 6, ingredients: [['metal', 4]] },
        { result: 'wall_kit', qty: 2, ingredients: [['wood', 4], ['stone', 3]] },
        { result: 'door_kit', qty: 1, ingredients: [['wood', 5], ['metal', 2]] },
        { result: 'turret_gun', qty: 1, ingredients: [['metal', 12], ['electronics', 5]] },
        { result: 'turret_shotgun', qty: 1, ingredients: [['metal', 10], ['electronics', 4], ['wood', 3]] },
        { result: 'storage_box', qty: 1, ingredients: [['wood', 8], ['metal', 3]] },
        { result: 'campfire', qty: 1, ingredients: [['wood', 5], ['stone', 5]] },
        { result: 'rain_collector', qty: 1, ingredients: [['metal', 6], ['cloth', 4]] },
        { result: 'farm_plot', qty: 1, ingredients: [['wood', 4], ['fertilizer', 2]] },
        { result: 'water_purifier', qty: 1, ingredients: [['metal', 8], ['electronics', 4], ['chemicals', 3]] },
        { result: 'well', qty: 1, ingredients: [['stone', 15], ['wood', 5], ['metal', 3]] },
        { result: 'cooked_meat', qty: 1, ingredients: [['raw_meat', 1]], station: 'campfire' },
        { result: 'bread', qty: 1, ingredients: [['wheat', 2]], station: 'campfire' },
        { result: 'purified_water', qty: 1, ingredients: [['dirty_water', 1]], station: 'purifier' },
        { result: 'fertilizer', qty: 2, ingredients: [['raw_meat', 2], ['vegetables', 1]] },
        { result: 'medkit', qty: 1, ingredients: [['cloth', 3], ['chemicals', 2]] }
    ],

    // Crops
    CROPS: {
        wheat:     { growTime: 4000, yield: 'wheat', yieldQty: 3, waterNeeded: 3, icon: '#da6' },
        vegetable: { growTime: 5000, yield: 'vegetables', yieldQty: 2, waterNeeded: 4, icon: '#6a4' },
        berry:     { growTime: 6000, yield: 'berries', yieldQty: 4, waterNeeded: 2, icon: '#c4c' }
    },

    // Structure stats
    STRUCTURES: {
        wall:           { health: 200, solid: true },
        door:           { health: 150, solid: false },
        turret_gun:     { health: 150, solid: true, range: 160, fireRate: 500, damage: 12, bulletSpeed: 8 },
        turret_shotgun: { health: 120, solid: true, range: 100, fireRate: 750, damage: 8, bulletSpeed: 6, pellets: 4, spread: 0.3 },
        storage:        { health: 100, solid: true },
        campfire:       { health: 80, solid: false },
        rain_collector: { health: 80, solid: false },
        farm_plot:      { health: 60, solid: false },
        purifier:       { health: 100, solid: true },
        well:           { health: 150, solid: true }
    },

    // Skills
    SKILL_TREES: {
        combat:   { name: 'Combat', skills: [
            { name: 'Damage+', desc: '+15% damage per level', maxLevel: 5 },
            { name: 'Toughness', desc: '+10 max HP per level', maxLevel: 5 },
            { name: 'Critical', desc: '+8% crit chance per level', maxLevel: 5 },
            { name: 'Quick Hands', desc: '-10% attack speed per level', maxLevel: 5 }
        ]},
        survival: { name: 'Survival', skills: [
            { name: 'Iron Stomach', desc: '-15% hunger drain', maxLevel: 5 },
            { name: 'Camel', desc: '-15% thirst drain', maxLevel: 5 },
            { name: 'Endurance', desc: '+15% stamina', maxLevel: 5 },
            { name: 'Regeneration', desc: '+25% health regen', maxLevel: 5 }
        ]},
        building: { name: 'Building', skills: [
            { name: 'Fortify', desc: '+20% structure HP', maxLevel: 5 },
            { name: 'Efficient', desc: '-10% material cost (rounded)', maxLevel: 5 },
            { name: 'Turret Master', desc: '+15% turret damage', maxLevel: 5 },
            { name: 'Architect', desc: '+1 build range per level', maxLevel: 3 }
        ]},
        farming:  { name: 'Farming', skills: [
            { name: 'Green Thumb', desc: '-15% grow time', maxLevel: 5 },
            { name: 'Bountiful', desc: '+1 crop yield per level', maxLevel: 3 },
            { name: 'Water Saver', desc: '-20% water needed', maxLevel: 5 },
            { name: 'Forager', desc: 'Find more loot scavenging', maxLevel: 5 }
        ]}
    },

    XP_PER_LEVEL: 100, // XP needed = level * this

    // Scavenge loot from buildings
    SCAVENGE_LOOT: [
        ['canned_food',1,2,0.2], ['dirty_water',1,1,0.2], ['cloth',1,3,0.25],
        ['wood',2,4,0.2], ['metal',1,3,0.15], ['stone',2,4,0.2],
        ['pistol_ammo',3,8,0.08], ['bandage',1,2,0.1], ['electronics',1,2,0.06],
        ['chemicals',1,2,0.05], ['seeds_wheat',1,3,0.08], ['seeds_vegetable',1,2,0.06],
        ['seeds_berry',1,2,0.05], ['berries',2,4,0.1], ['fertilizer',1,2,0.08],
        ['rifle_ammo',2,5,0.04], ['shotgun_ammo',2,4,0.04], ['medkit',1,1,0.03]
    ],

    // Inventory
    INVENTORY_SLOTS: 24,
    QUICKBAR_SLOTS: 5,
    STORAGE_SLOTS: 16,

    // Fog of war
    FOG_REVEAL_RADIUS: 6, // chunks

    // Joystick
    JOYSTICK_RADIUS: 60,
    JOYSTICK_DEAD_ZONE: 8
};
