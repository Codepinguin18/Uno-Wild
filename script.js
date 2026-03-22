const CONFIG = {
    RARITIES: ['Common', 'Rare', 'Epic', 'Legendary', 'Mythic', 'Cosmic'],
    COLORS: ['red', 'green', 'blue', 'yellow'],
    BOX_LEVELS: [
        { level: 1, cost: 100, cards: 1 },
        { level: 2, cost: 250, cards: 2 },
        { level: 3, cost: 500, cards: 3 },
        { level: 4, cost: 1000, cards: 4 },
        { level: 5, cost: 2500, cards: 5 },
        { level: 6, cost: 5000, cards: 6 }
    ]
};

class Game {
    constructor() {
        this.user = JSON.parse(localStorage.getItem('uno_user')) || {
            username: '',
            diamonds: 500,
            trophies: 0,
            inventory: [],
            deck: [],
            upgrades: []
        };
        this.currentScreen = 'auth-screen';
        this.init();
    }

    init() {
        if(this.user.username) {
            this.switchScreen('main-menu');
            this.updateUI();
        }
        this.renderLootboxes();
    }

    login() {
        const name = document.getElementById('username').value;
        if(!name) return alert("Gib einen Namen ein!");
        this.user.username = name;
        
        // Startequipment: Zahlenkarten 0-9
        if(this.user.inventory.length === 0) {
            CONFIG.COLORS.forEach(color => {
                for(let i=0; i<=9; i++) {
                    this.user.inventory.push({ id: Date.now() + Math.random(), type: 'number', value: i, color: color, rarity: 'Common' });
                }
            });
            this.user.deck = this.user.inventory.slice(0, 32);
        }
        
        this.save();
        this.switchScreen('main-menu');
        this.updateUI();
    }

    save() {
        localStorage.setItem('uno_user', JSON.stringify(this.user));
    }

    switchScreen(id) {
        document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
        document.getElementById(id).classList.remove('hidden');
        this.currentScreen = id;
        if(id === 'deck-screen') this.renderDeck();
        if(id === 'game-board') this.startMatch();
    }

    updateUI() {
        document.getElementById('diamonds').innerText = this.user.diamonds;
        document.getElementById('trophies').innerText = this.user.trophies;
        document.getElementById('deck-count').innerText = this.user.deck.length;
    }

    renderLootboxes() {
        const container = document.getElementById('lootbox-list');
        container.innerHTML = '';
        CONFIG.BOX_LEVELS.forEach(box => {
            const div = document.createElement('div');
            div.className = 'lootbox-card';
            div.innerHTML = `
                <h3>Lvl ${box.level} Box</h3>
                <p>Preis: 💎 ${box.cost}</p>
                <p>Karten: ${box.cards} + 1 Upgrade</p>
                <button onclick="game.buyBox(${box.level-1})">Kaufen</button>
            `;
            container.appendChild(div);
        });
    }

    buyBox(index) {
        const box = CONFIG.BOX_LEVELS[index];
        if(this.user.diamonds < box.cost) return alert("Nicht genug Diamanten!");

        this.user.diamonds -= box.cost;
        let newCards = [];
        
        // Generiere normale Karten
        for(let i=0; i<box.cards; i++) {
            newCards.push(this.generateRandomCard(box.level));
        }
        // Generiere Upgrade Karte
        newCards.push({ type: 'upgrade', name: 'Boost ' + box.level, effect: 'boost', rarity: CONFIG.RARITIES[box.level-1] });

        this.user.inventory.push(...newCards);
        this.save();
        this.updateUI();
        alert(`Box geöffnet! Du hast ${newCards.length} neue Karten erhalten!`);
    }

    generateRandomCard(boxLevel) {
        const rarityIdx = Math.floor(Math.random() * boxLevel);
        const types = ['number', 'skip', 'reverse', 'wild', 'black'];
        const type = types[Math.floor(Math.random() * types.length)];
        
        return {
            id: Math.random(),
            type: type,
            value: type === 'number' ? Math.floor(Math.random()*10) : 'S',
            color: type === 'wild' ? 'grey' : (type === 'black' ? 'black' : CONFIG.COLORS[Math.floor(Math.random()*4)]),
            rarity: CONFIG.RARITIES[rarityIdx]
        };
    }

    renderDeck() {
        const grid = document.getElementById('collection-grid');
        grid.innerHTML = '';
        this.user.inventory.forEach(card => {
            const el = document.createElement('div');
            el.className = `card ${card.color}`;
            el.innerText = card.value;
            el.onclick = () => this.toggleDeck(card);
            if(this.user.deck.find(c => c.id === card.id)) el.style.boxShadow = "0 0 15px cyan";
            grid.appendChild(el);
        });
    }

    toggleDeck(card) {
        const idx = this.user.deck.findIndex(c => c.id === card.id);
        if(idx > -1) {
            this.user.deck.splice(idx, 1);
        } else {
            if(this.user.deck.length >= 32) return alert("Deck voll!");
            this.user.deck.push(card);
        }
        this.save();
        this.updateUI();
        this.renderDeck();
    }

    // --- Simuliertes Gameplay ---
    startMatch() {
        const info = document.getElementById('game-info');
        info.innerText = "Gegner wird gesucht...";
        
        setTimeout(() => {
            info.innerText = "Match beginnt!";
            this.playerHand = this.user.deck.slice(0, 7);
            this.opponentHandCount = 7;
            this.renderGame();
        }, 1500);
    }

    renderGame() {
        const pHand = document.getElementById('player-hand');
        pHand.innerHTML = '';
        this.playerHand.forEach(card => {
            const el = document.createElement('div');
            el.className = `card ${card.color}`;
            el.innerText = card.value;
            el.onclick = () => alert("Spiellogik: Klicke Stapel zum Ziehen oder baue Regeln ein!");
            pHand.appendChild(el);
        });

        const oHand = document.getElementById('opponent-hand');
        oHand.innerHTML = '';
        for(let i=0; i<this.opponentHandCount; i++) {
            const el = document.createElement('div');
            el.className = `card black`;
            el.innerText = '?';
            oHand.appendChild(el);
        }
    }
}

const game = new Game();
