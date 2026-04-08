window.Game = window.Game || {};
Game.Skills = {
    upgrade(tree, skillIndex) {
        var p = Game.Player;
        if(p.skillPoints <= 0) return false;
        var treeCfg = Game.Config.SKILL_TREES[tree];
        if(!treeCfg) return false;
        var skillCfg = treeCfg.skills[skillIndex];
        if(!skillCfg) return false;
        var currentLevel = p.skills[tree][skillIndex];
        if(currentLevel >= skillCfg.maxLevel) return false;
        p.skills[tree][skillIndex]++;
        p.skillPoints--;
        return true;
    },

    getLevel(tree, skillIndex) {
        return Game.Player.skills[tree][skillIndex] || 0;
    }
};
