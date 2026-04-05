window.Game = window.Game || {};

Game.Economy = {
    currency: Game.Config.PLAYER_START_CURRENCY,

    init() {
        this.currency = Game.Config.PLAYER_START_CURRENCY;
    },

    addCurrency(amount) {
        this.currency += amount;
    },

    spend(amount) {
        if (this.currency < amount) return false;
        this.currency -= amount;
        return true;
    },

    canAfford(amount) {
        return this.currency >= amount;
    },

    waveBonus(waveNumber) {
        const bonus = 20 + waveNumber * 10;
        this.addCurrency(bonus);
        return bonus;
    }
};
