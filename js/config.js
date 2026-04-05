window.Game = window.Game || {};

Game.Config = {
    TILE_SIZE: 32,
    MAP_WIDTH: 40,
    MAP_HEIGHT: 40,
    INTERNAL_WIDTH: 640,
    INTERNAL_HEIGHT: 960,

    TICK_RATE: 1000 / 30,

    PLAYER_SPEED: 3,
    PLAYER_MAX_HEALTH: 100,
    PLAYER_START_CURRENCY: 200,

    BASE_MAX_HEALTH: 500,
    BASE_SIZE: 2, // 2x2 tiles

    WALL_COST: 25,
    WALL_HEALTH: 150,
    REPAIR_COST: 50,
    REPAIR_AMOUNT: 100,

    JOYSTICK_RADIUS: 60,
    JOYSTICK_DEAD_ZONE: 8,

    MAX_ACTIVE_ZOMBIES: 60,

    ZOMBIE_TYPES: {
        walker: { health: 100, speed: 1.0, damage: 10, reward: 10, color: '#5a5', radius: 10, attackRate: 1000 },
        runner: { health: 50, speed: 2.2, damage: 5, reward: 15, color: '#c44', radius: 8, attackRate: 600 },
        tank:   { health: 400, speed: 0.5, damage: 25, reward: 30, color: '#777', radius: 14, attackRate: 1500 }
    },

    TURRET_TYPES: {
        gun:     { range: 160, fireRate: 400, damage: 15, cost: 50,  bulletSpeed: 8, bulletCount: 1, spread: 0,   color: '#4af', barrelLen: 14 },
        shotgun: { range: 110, fireRate: 700, damage: 8,  cost: 75,  bulletSpeed: 6, bulletCount: 5, spread: 0.35, color: '#fa4', barrelLen: 12 },
        sniper:  { range: 280, fireRate: 1400, damage: 55, cost: 100, bulletSpeed: 14, bulletCount: 1, spread: 0,  color: '#f4a', barrelLen: 18 }
    },

    UPGRADE_LEVELS: [
        { damage: 1.0, range: 1.0, fireRate: 1.0, cost: 0 },
        { damage: 1.3, range: 1.1, fireRate: 0.9, cost: 40 },
        { damage: 1.7, range: 1.2, fireRate: 0.8, cost: 80 },
        { damage: 2.2, range: 1.3, fireRate: 0.7, cost: 130 }
    ],

    PLAYER_WEAPON: {
        fireRate: 250,
        damage: 12,
        bulletSpeed: 10,
        range: 200
    },

    PLAYER_WEAPON_UPGRADES: [
        { damage: 1.0, fireRate: 1.0, cost: 0 },
        { damage: 1.4, fireRate: 0.85, cost: 60 },
        { damage: 1.8, fireRate: 0.7, cost: 120 },
        { damage: 2.4, fireRate: 0.55, cost: 200 }
    ]
};
