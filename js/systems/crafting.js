window.Game = window.Game || {};
Game.Crafting = {
    getAvailableRecipes(station) {
        var recipes=Game.Config.RECIPES;
        var available=[];
        for(var i=0;i<recipes.length;i++) {
            var r=recipes[i];
            if(r.station && r.station!==station) continue;
            if(!r.station && station) continue;
            available.push({index:i,recipe:r,canCraft:Game.Inventory.hasItems(r.ingredients)});
        }
        return available;
    },

    craft(recipeIndex) {
        var r=Game.Config.RECIPES[recipeIndex];
        if(!r) return false;
        // Check station proximity
        if(r.station) {
            var nearStation=this.isNearStation(r.station);
            if(!nearStation) return false;
        }
        // Apply building efficiency skill
        var ingredients=r.ingredients;
        var efficiencyLevel=Game.Player.skills.building[1];
        // Check ingredients
        for(var i=0;i<ingredients.length;i++) {
            var needed=ingredients[i][1];
            if(efficiencyLevel>0) needed=Math.max(1,Math.round(needed*(1-efficiencyLevel*0.1)));
            if(Game.Inventory.countItem(ingredients[i][0])<needed) return false;
        }
        // Consume ingredients
        for(var i=0;i<ingredients.length;i++) {
            var needed=ingredients[i][1];
            if(efficiencyLevel>0) needed=Math.max(1,Math.round(needed*(1-efficiencyLevel*0.1)));
            Game.Inventory.removeItem(ingredients[i][0],needed);
        }
        // Add result
        Game.Inventory.addItem(r.result,r.qty);
        return true;
    },

    isNearStation(stationType) {
        var p=Game.Player;
        var structures=Game.World.structures;
        for(var i=0;i<structures.length;i++) {
            var s=structures[i];
            if(s.type===stationType || (stationType==='campfire'&&s.type==='campfire') ||
               (stationType==='purifier'&&s.type==='purifier')) {
                var dx=s.x-p.x,dy=s.y-p.y;
                if(dx*dx+dy*dy<80*80) return true;
            }
        }
        return false;
    }
};
