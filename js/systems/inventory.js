window.Game = window.Game || {};
Game.Inventory = {
    slots: [], // [{id, qty}, ...]
    quickbar: [null,null,null,null,null], // indices into slots or item ids

    init() {
        this.slots=[];
        for(var i=0;i<Game.Config.INVENTORY_SLOTS;i++) this.slots.push(null);
        this.quickbar=[null,null,null,null,null];
        // Start with some items
        this.addItem('knife',1);
        this.addItem('bandage',3);
        this.addItem('canned_food',2);
        this.addItem('dirty_water',2);
        this.addItem('wood',10);
        this.addItem('stone',5);
    },

    addItem(id,qty) {
        if(!qty) qty=1;
        var cfg=Game.Config.ITEMS[id];
        if(!cfg) return 0;
        var maxStack=cfg.stack||1;
        var remaining=qty;
        // Try to stack with existing
        for(var i=0;i<this.slots.length&&remaining>0;i++) {
            if(this.slots[i]&&this.slots[i].id===id&&this.slots[i].qty<maxStack) {
                var space=maxStack-this.slots[i].qty;
                var add=Math.min(space,remaining);
                this.slots[i].qty+=add;
                remaining-=add;
            }
        }
        // Fill empty slots
        for(var i=0;i<this.slots.length&&remaining>0;i++) {
            if(!this.slots[i]) {
                var add=Math.min(maxStack,remaining);
                this.slots[i]={id:id,qty:add};
                remaining-=add;
            }
        }
        return qty-remaining; // amount actually added
    },

    removeItem(id,qty) {
        if(!qty) qty=1;
        var remaining=qty;
        for(var i=this.slots.length-1;i>=0&&remaining>0;i--) {
            if(this.slots[i]&&this.slots[i].id===id) {
                var remove=Math.min(this.slots[i].qty,remaining);
                this.slots[i].qty-=remove;
                remaining-=remove;
                if(this.slots[i].qty<=0) this.slots[i]=null;
            }
        }
        return remaining===0;
    },

    countItem(id) {
        var total=0;
        for(var i=0;i<this.slots.length;i++)
            if(this.slots[i]&&this.slots[i].id===id) total+=this.slots[i].qty;
        return total;
    },

    hasItems(list) {
        for(var i=0;i<list.length;i++)
            if(this.countItem(list[i][0])<list[i][1]) return false;
        return true;
    },

    getQuickbarItem(index) {
        if(index<0||index>=this.quickbar.length) return null;
        return this.quickbar[index];
    },

    setQuickbar(index,itemId) {
        this.quickbar[index]=itemId;
    },

    // Get all unique item types in inventory
    getUniqueItems() {
        var items={};
        for(var i=0;i<this.slots.length;i++) {
            if(this.slots[i]) {
                if(!items[this.slots[i].id]) items[this.slots[i].id]=0;
                items[this.slots[i].id]+=this.slots[i].qty;
            }
        }
        return items;
    }
};
