// ================================================================
// ULTRAUNO - Game Engine
// ================================================================

class UnoEngine {
  constructor(playerHandIds, playerUpgradeIds) {
    this.log = [];
    this.callbacks = {};
    this.pendingColorPick = false;
    this.pendingCardAfterColor = null;
    this.playerUpgrades = (playerUpgradeIds||[]).map(id => getUpgradeById(id)).filter(Boolean);
    this.usedUpgrades = new Set();
    this.poisonTurns = 0;
    this.shieldCount = 0;
    this.immuneTurns = 0;
    this.phaseActive = false;
    this.doubleNext = false;
    this.chainActive = false;
    this.frozenTurns = 0;
    this.opponentFrozenTurns = 0;
    this.opponentPoisonTurns = 0;

    // Build player's deck from their equipped cards
    const playerCards = playerHandIds.map(id => {
      const base = getCardById(id);
      return base ? {...base} : null;
    }).filter(Boolean);

    // Build AI deck (always uses standard cards)
    const aiCards = this._buildAIDeck();

    // Game deck = player deck + AI deck, shuffled
    this.drawPile = this._shuffle([...playerCards, ...aiCards]);
    this.discardPile = [];

    // Deal hands
    this.playerHand = [];
    this.aiHand = [];
    for (let i = 0; i < 7; i++) {
      this.playerHand.push(this._draw());
      this.aiHand.push(this._draw());
    }

    // Auto upgrades: Arsenal (start with 5 instead of 7)
    const arsenal = this.playerUpgrades.find(u=>u.effect==='auto_arsenal');
    if (arsenal) {
      while (this.playerHand.length > 5) {
        this.drawPile.push(this.playerHand.pop());
      }
      this._addLog('🔧 Arsenal: Du startest mit 5 Karten!');
    }

    // Auto: start draw bonus
    const pool = this.playerUpgrades.find(u=>u.effect==='auto_start_draw:2');
    if (pool) {
      this.playerHand.push(this._draw());
      this.playerHand.push(this._draw());
      this._addLog('📦 Ressourcenpool: +2 Startkarten!');
    }

    // Flip first card (must be number)
    let first = this._draw();
    while (!first || first.type !== 'number') {
      if (first) this.drawPile.push(first);
      first = this._draw();
    }
    this.discardPile.push(first);
    this.currentColor = first.color;
    this.currentValue = first.value;
    this.currentEffect = first.effect;

    this.direction = 1;
    this.currentPlayer = 0; // 0=player, 1=AI
    this.pendingDraw = 0;
    this.turn = 0;
    this.winner = null;
    this.phase = 'playing';
    this.lastCard = first;

    // Auto: insight - see top 3 of draw pile
    const insight = this.playerUpgrades.find(u=>u.effect==='auto_insight');
    if (insight) {
      const top3 = this.drawPile.slice(-3);
      this._addLog(`🔭 Weitblick: Top 3 Stapel: ${top3.map(c=>c.name).join(', ')}`);
    }

    this._addLog(`🎮 Spiel gestartet! Erste Karte: ${first.name} (${CARD_COLOR_STYLES[first.color].name})`);
  }

  _buildAIDeck() {
    const cards = [];
    const colors = ['red','green','blue','yellow'];
    // Standard number cards
    colors.forEach(c => {
      for (let n=1; n<=9; n++) cards.push({id:-Math.random(),name:`${n}`,color:c,type:'number',rarity:'common',effect:null,symbol:`${n}`,value:n});
      cards.push({id:-Math.random(),name:'0',color:c,type:'number',rarity:'common',effect:null,symbol:'0',value:0});
      cards.push({id:-Math.random(),name:'Skip',color:c,type:'action',rarity:'common',effect:'skip',symbol:'⊘'});
      cards.push({id:-Math.random(),name:'Reverse',color:c,type:'action',rarity:'common',effect:'reverse',symbol:'↺'});
      cards.push({id:-Math.random(),name:'+2',color:c,type:'action',rarity:'common',effect:'draw:2',symbol:'+2'});
    });
    for (let i=0;i<4;i++) {
      cards.push({id:-Math.random(),name:'Wild',color:'gray',type:'wild',rarity:'uncommon',effect:'wild',symbol:'★'});
      cards.push({id:-Math.random(),name:'Wild +4',color:'gray',type:'wild',rarity:'uncommon',effect:'wild_draw:4',symbol:'+4'});
    }
    return this._shuffle(cards);
  }

  _shuffle(arr) {
    const a = [...arr];
    for (let i=a.length-1;i>0;i--) {
      const j=Math.floor(Math.random()*(i+1));
      [a[i],a[j]]=[a[j],a[i]];
    }
    return a;
  }

  _draw() {
    if (this.drawPile.length === 0) {
      if (this.discardPile.length <= 1) return {id:-99,name:'Leere',color:'gray',type:'number',rarity:'common',effect:null,symbol:'?',value:0};
      const top = this.discardPile.pop();
      this.drawPile = this._shuffle(this.discardPile);
      this.discardPile = [top];
      this._addLog('🔀 Ablagestapel wird neu gemischt!');
    }
    return this.drawPile.pop();
  }

  _addLog(msg) {
    this.log.unshift(msg);
    if (this.log.length > 20) this.log.pop();
    if (this.callbacks.onLog) this.callbacks.onLog(msg);
  }

  on(event, cb) { this.callbacks[event] = cb; }

  get topCard() { return this.discardPile[this.discardPile.length-1]; }

  canPlay(card) {
    if (!card) return false;
    if (this.phaseActive) return true;
    if (card.color === 'gray' || card.color === 'black') return true;
    if (card.color === this.currentColor) return true;
    if (card.type === 'number' && card.value === this.currentValue) return true;
    if (card.type !== 'number') {
      const topT = this.topCard;
      if (topT && topT.type !== 'number' && card.name === topT.name) return true;
    }
    return false;
  }

  _getEffectN(effect) {
    const m = effect ? effect.match(/:(\d+)/) : null;
    return m ? parseInt(m[1]) : 0;
  }

  _applyEffect(card, forPlayer) {
    // forPlayer: true if player played, false if AI played
    const e = card.effect || '';
    const n = this._getEffectN(e);
    const target = forPlayer ? 'opponent' : 'player';

    // Handle shields
    if (target === 'player' && this.shieldCount > 0 && this._isAttack(e)) {
      this.shieldCount--;
      this._addLog(`🛡 Schild absorbiert den Angriff! (${this.shieldCount} übrig)`);
      return;
    }
    // Handle reflect
    if (target === 'player' && this.reflectCount > 0 && this._isAttack(e)) {
      this.reflectCount--;
      this._addLog(`⟲ Angriff reflektiert!`);
      // Apply to opponent instead
      for (let i=0; i<n||1; i++) this.aiHand.push(this._draw());
      return;
    }
    // Handle immune
    if (target === 'player' && this.immuneTurns > 0) {
      this._addLog(`♾ Immun! Angriff ignoriert.`);
      return;
    }

    if (e === null || e === '') return;

    if (e === 'skip') {
      this._addLog(forPlayer ? '⊘ KI überspringt!' : '⊘ Du wirst übersprungen!');
      if (!forPlayer) this._skipPlayer();
    }
    else if (e === 'skip:2') {
      this._addLog(forPlayer ? '⊘⊘ KI überspringt 2 Runden!' : '⊘⊘ Du wirst 2 Runden übersprungen!');
      if (!forPlayer) { this._skipPlayer(); this._skipPlayer(); }
    }
    else if (e === 'skip_all' || e === 'omega_skip') {
      this._addLog('⊘★ Alle anderen überspringen!');
      if (!forPlayer) this._skipPlayer();
    }
    else if (e === 'reverse' || e === 'rev_draw:1') {
      this.direction *= -1;
      this._addLog('↺ Richtung umgekehrt!');
      if (e === 'rev_draw:1') {
        const amt = 1;
        if (forPlayer) { for(let i=0;i<amt;i++) this.aiHand.push(this._draw()); }
        else { for(let i=0;i<amt;i++) this.playerHand.push(this._draw()); }
      }
    }
    else if (e.startsWith('draw:')) {
      const amt = n || 2;
      if (forPlayer) {
        for (let i=0;i<amt;i++) this.aiHand.push(this._draw());
        this._addLog(`+${amt} KI zieht ${amt} Karten!`);
        this.currentPlayer = 0; // skip AI turn
      } else {
        for (let i=0;i<amt;i++) this.playerHand.push(this._draw());
        this._addLog(`+${amt} Du ziehst ${amt} Karten!`);
        this._skipPlayer();
      }
    }
    else if (e === 'wild' || e === 'wild_random' || e === 'prisma') {
      if (forPlayer) {
        this.phase = 'colorPick';
        this._addLog('🌈 Wähle eine Farbe!');
      } else {
        const aiColor = this._aiChooseColor();
        this.currentColor = aiColor;
        this._addLog(`🌈 KI wählt ${CARD_COLOR_STYLES[aiColor].name}!`);
      }
    }
    else if (e.startsWith('wild_draw:')) {
      const amt = n;
      if (forPlayer) {
        this.pendingWildDraw = amt;
        this.phase = 'colorPick';
        this._addLog('🌈 Wähle eine Farbe!');
      } else {
        const aiColor = this._aiChooseColor();
        this.currentColor = aiColor;
        for (let i=0;i<amt;i++) this.playerHand.push(this._draw());
        this._addLog(`🌈 KI wählt ${CARD_COLOR_STYLES[aiColor].name}! Du ziehst ${amt}!`);
        this._skipPlayer();
      }
    }
    else if (e === 'wild_skip') {
      if (forPlayer) {
        this.pendingWildSkip = true;
        this.phase = 'colorPick';
        this._addLog('🌈 Wähle eine Farbe!');
      } else {
        const aiColor = this._aiChooseColor();
        this.currentColor = aiColor;
        this._skipPlayer();
        this._addLog(`🌈 KI wählt ${CARD_COLOR_STYLES[aiColor].name}! Du wirst übersprungen!`);
      }
    }
    else if (e === 'wild_reverse') {
      if (forPlayer) {
        this.direction *= -1;
        this.phase = 'colorPick';
        this._addLog('🌈↺ Wähle Farbe + Reverse!');
      } else {
        const aiColor = this._aiChooseColor();
        this.currentColor = aiColor;
        this.direction *= -1;
        this._addLog(`🌈↺ KI: Farbe ${CARD_COLOR_STYLES[aiColor].name} + Reverse!`);
      }
    }
    else if (e.startsWith('wild_all_draw:')) {
      const amt = n;
      if (forPlayer) {
        for (let i=0;i<amt;i++) this.aiHand.push(this._draw());
        this.phase = 'colorPick';
        this._addLog(`🌈 Alle anderen +${amt}! Wähle Farbe!`);
      } else {
        const aiColor = this._aiChooseColor();
        this.currentColor = aiColor;
        for (let i=0;i<amt;i++) this.playerHand.push(this._draw());
        this._addLog(`🌈 KI: Alle +${amt}!`);
      }
    }
    else if (e === 'all_draw:1' || e === 'all_draw:2' || e === 'all_draw:3' || e === 'all_draw:4' || e === 'all_draw:6') {
      const amt = n;
      if (forPlayer) {
        for (let i=0;i<amt;i++) this.aiHand.push(this._draw());
        this._addLog(`🌩 KI zieht ${amt} Karten!`);
      } else {
        for (let i=0;i<amt;i++) this.playerHand.push(this._draw());
        this._addLog(`🌩 Du ziehst ${amt} Karten!`);
      }
    }
    else if (e === 'shield') {
      this.shieldCount = (this.shieldCount||0) + 1;
      this._addLog(`🛡 Schild aktiviert! (${this.shieldCount} Schilde)`);
    }
    else if (e.startsWith('shield:')) {
      this.shieldCount += n;
      this._addLog(`🛡 ${n} Schilde aktiviert!`);
    }
    else if (e === 'reflect' || e === 'counter') {
      this.reflectCount = (this.reflectCount||0) + 1;
      this._addLog('⟲ Reflektionsschild aktiv!');
    }
    else if (e.startsWith('reflect:')) {
      this.reflectCount = (this.reflectCount||0) + n;
      this._addLog(`⟲ ${n} Reflektionen aktiv!`);
    }
    else if (e === 'extra_turn' || e === 'draw_play') {
      if (forPlayer) {
        this.currentPlayer = 0; // stay as player
        this._addLog('⏰ Extra-Zug! Du spielst nochmal!');
      } else {
        // AI gets extra turn - will be handled in AI loop
        this._addLog('⏰ KI bekommt Extra-Zug!');
      }
    }
    else if (e === 'echo' || e === 'clone' || e === 'resonance') {
      if (this.discardPile.length >= 2) {
        const prev = this.discardPile[this.discardPile.length-2];
        if (prev && prev.effect) {
          this._addLog(`↩ Echo: ${prev.name} Effekt!`);
          // Apply previous effect
          setTimeout(() => this._applyEffect(prev, forPlayer), 100);
        }
      }
    }
    else if (e === 'hand_swap' || e === 'wild_hand_swap') {
      const tmp = this.playerHand;
      this.playerHand = this.aiHand;
      this.aiHand = tmp;
      this._addLog('🤝 Hände getauscht!');
      if (e.startsWith('wild') && forPlayer) {
        this.phase = 'colorPick';
      }
    }
    else if (e.startsWith('steal:') || e === 'steal_turn') {
      const amt = e === 'steal_turn' ? 1 : n;
      if (forPlayer) {
        const stolen = this.aiHand.splice(0, Math.min(amt, this.aiHand.length));
        this.playerHand.push(...stolen);
        this._addLog(`🧲 Du stiehlst ${stolen.length} Karten von KI!`);
      } else {
        const stolen = this.playerHand.splice(0, Math.min(amt, this.playerHand.length));
        this.aiHand.push(...stolen);
        this._addLog(`🧲 KI stiehlt ${stolen.length} deiner Karten!`);
      }
    }
    else if (e.startsWith('freeze:') || e.startsWith('wild_freeze:')) {
      if (forPlayer) {
        this.opponentFrozenTurns = n;
        this._addLog(`❄ KI friert ${n} Runden ein!`);
      } else {
        this.frozenTurns = n;
        this._addLog(`❄ Du frierst ${n} Runden ein!`);
        this._skipPlayer();
      }
    }
    else if (e === 'peek' || e === 'parasit') {
      if (forPlayer) {
        this._addLog(`👁 Du siehst KI-Hand: ${this.aiHand.slice(0,3).map(c=>c.name).join(', ')}...`);
        if (this.callbacks.onPeek) this.callbacks.onPeek(this.aiHand);
      }
    }
    else if (e === 'phase') {
      this.phaseActive = true;
      this._addLog('◎ Phase aktiv: Nächste Karte auf alles spielen!');
    }
    else if (e === 'double_play') {
      if (forPlayer) {
        this.doublePlayActive = true;
        this._addLog('2× Doppelspiel: Spiele noch eine Karte!');
        if (this.callbacks.onDoublePlay) this.callbacks.onDoublePlay();
      }
    }
    else if (e === 'discard_opp:2' || e === 'discard_opp:3') {
      if (forPlayer && this.aiHand.length > 0) {
        const cnt = Math.min(n||2, this.aiHand.length);
        for(let i=0;i<cnt;i++) {
          const ri = Math.floor(Math.random()*this.aiHand.length);
          this.discardPile.push(this.aiHand.splice(ri,1)[0]);
        }
        this._addLog(`🗑 KI wirft ${cnt} Karten ab!`);
      } else if (!forPlayer && this.playerHand.length > 0) {
        const cnt = Math.min(n||2, this.playerHand.length);
        for(let i=0;i<cnt;i++) {
          const ri = Math.floor(Math.random()*this.playerHand.length);
          this.discardPile.push(this.playerHand.splice(ri,1)[0]);
        }
        this._addLog(`🗑 Du wirfst ${cnt} Karten ab!`);
      }
    }
    else if (e === 'black_hole') {
      this._addLog('⚫ Schwarzes Loch! Alle Hände geleert, alle ziehen 7!');
      this.discardPile.push(...this.playerHand, ...this.aiHand);
      this.playerHand = []; this.aiHand = [];
      for(let i=0;i<7;i++) { this.playerHand.push(this._draw()); this.aiHand.push(this._draw()); }
    }
    else if (e === 'big_bang') {
      this._addLog('💥💥 Urknall! Alle Hände auf 1 Karte!');
      while(this.playerHand.length > 1) this.discardPile.push(this.playerHand.pop());
      while(this.aiHand.length > 1) this.discardPile.push(this.aiHand.pop());
    }
    else if (e === 'supernova') {
      this._addLog('💫 Supernova! Alle Hände leeren + alle ziehen 5!');
      this.discardPile.push(...this.playerHand, ...this.aiHand);
      this.playerHand = []; this.aiHand = [];
      for(let i=0;i<5;i++) { this.playerHand.push(this._draw()); this.aiHand.push(this._draw()); }
    }
    else if (e === 'collapse') {
      this._addLog('💀 Kollaps! Hände gemischt!');
      const all = this._shuffle([...this.playerHand, ...this.aiHand]);
      const half = Math.floor(all.length/2);
      this.playerHand = all.slice(0, half);
      this.aiHand = all.slice(half);
    }
    else if (e === 'god_hand' || e === 'fate') {
      if (forPlayer) {
        const drawn = [];
        for(let i=0;i<(e==='god_hand'?8:3);i++) drawn.push(this._draw());
        const keep = e==='god_hand'?5:1;
        // Keep first `keep` (best would require sorting - just keep first half as "best")
        const sorted = drawn.sort((a,b) => (b.rarity==='mythic'?6:b.rarity==='legendary'?5:b.rarity==='epic'?4:b.rarity==='rare'?3:b.rarity==='uncommon'?2:1) - (a.rarity==='mythic'?6:a.rarity==='legendary'?5:a.rarity==='epic'?4:a.rarity==='rare'?3:a.rarity==='uncommon'?2:1));
        this.playerHand.push(...sorted.slice(0,keep));
        this._addLog(`👑 ${e==='god_hand'?'Götterhand':'Schicksal'}: ${keep} beste Karten behalten!`);
      }
    }
    else if (e === 'dragon_breath' || e === 'dragon_wing') {
      if (forPlayer) {
        const cnt = e==='dragon_breath'?5:4;
        this.multiPlayCount = cnt;
        this._addLog(`🐉 Drachenatem: Spiele ${cnt} Karten!`);
        if(this.callbacks.onMultiPlay) this.callbacks.onMultiPlay(cnt);
      }
    }
    else if (e === 'soul_swap') {
      const tmp = [...this.playerHand];
      this.playerHand = [...this.aiHand];
      this.aiHand = tmp;
      this._addLog('♻ Seelentausch: Hände mit allen getauscht!');
    }
    else if (e === 'creation') {
      if (forPlayer) {
        const pool = ALL_CARDS.filter(c=>c.rarity==='rare'||c.rarity==='epic');
        for(let i=0;i<3;i++) this.playerHand.push(pool[Math.floor(Math.random()*pool.length)]);
        this._addLog('✨ Schöpfung: 3 mächtige Karten erschaffen!');
      }
    }
    else if (e === 'divine_lightning' || e === 'world_fire') {
      const amt = e==='divine_lightning'?8:5;
      if(forPlayer) {
        for(let i=0;i<amt;i++) this.aiHand.push(this._draw());
        if(e==='divine_lightning') { this.opponentFrozenTurns = 2; }
        if(e==='world_fire') { this.currentColor = 'red'; }
        this._addLog(`${e==='divine_lightning'?'⚡👑':'🌍🔥'} Mächtiger Effekt!`);
      } else {
        for(let i=0;i<amt;i++) this.playerHand.push(this._draw());
        this._addLog(`${e==='divine_lightning'?'⚡👑':'🌍🔥'} KI-Angriff! Du ziehst ${amt}!`);
      }
    }
    else if (e === 'tsunami' || e === 'shockwave') {
      const amt = e==='tsunami'?3:1;
      if(forPlayer) { for(let i=0;i<amt;i++) this.aiHand.push(this._draw()); }
      else { for(let i=0;i<amt;i++) this.playerHand.push(this._draw()); this._skipPlayer(); }
      this._addLog(`${e==='tsunami'?'🌊':'💥'} Alle ziehen ${amt} + Skip!`);
    }
    else if (e === 'halve_opp') {
      if(forPlayer) {
        const rm = Math.floor(this.aiHand.length/2);
        this.discardPile.push(...this.aiHand.splice(0,rm));
        this._addLog(`Ω KI verliert ${rm} Karten!`);
      }
    }
    else if (e === 'void_field' || e === 'blade') {
      const amt = e==='blade'?3:5;
      if(forPlayer && this.aiHand.length > 0) {
        const cnt = Math.min(amt, this.aiHand.length);
        this.aiHand.splice(0, cnt);
        this._addLog(`${e==='blade'?'⚔':'○'} ${cnt} KI-Karten entfernt!`);
      }
    }
    else if (e === 'vortex') {
      if(forPlayer) {
        for(let i=0;i<4;i++) this.playerHand.push(this._draw());
        this.vortexMode = true;
        this._addLog('🌀 Vortex: Ziehe 4, spiele 2 davon!');
        if(this.callbacks.onVortex) this.callbacks.onVortex();
      }
    }
    else if (e === 'demon_pact') {
      if(forPlayer) {
        for(let i=0;i<6;i++) this.aiHand.push(this._draw());
        for(let i=0;i<3;i++) this.playerHand.push(this._draw());
        this.currentPlayer = 0; // extra turn
        this._addLog('😈 Dämonenpakt: KI +6, Du +3 + Extra-Zug!');
      } else {
        for(let i=0;i<6;i++) this.playerHand.push(this._draw());
        for(let i=0;i<3;i++) this.aiHand.push(this._draw());
        this._addLog('😈 KI-Dämonenpakt: Du +6!');
      }
    }
    else if (e === 'lightning') {
      // Random powerful effect
      const efx = ['skip_all','draw:4','hand_swap','freeze:2','all_draw:2'];
      const pick = {effect: efx[Math.floor(Math.random()*efx.length)]};
      this._addLog(`⚡⚡ Blitzschlag: ${pick.effect}!`);
      this._applyEffect(pick, forPlayer);
    }
    else if (e === 'immortal') {
      this.immuneTurns = 3;
      this._addLog('♾ Unsterblich: 3 Runden immun!');
    }
    else if (e === 'venom') {
      if(forPlayer) {
        this.opponentPoisonTurns = 3;
        this._addLog('🐍 Venom: KI zieht 1/Runde für 3 Runden!');
      } else {
        this.poisonTurns = 3;
        this._addLog('🐍 KI-Venom: Du ziehst 1/Runde!');
      }
    }
    else if (e === 'hyper_wild' || e === 'omega') {
      if(forPlayer) {
        this.phase = 'colorPick';
        const drawAmt = e==='omega'?10:6;
        this.pendingWildDraw = drawAmt;
        this.pendingWildSkip = true;
        this._addLog(`${e==='omega'?'Ω':'★★★'} Hyper-Karte! Wähle Farbe!`);
      }
    }
    else if (e === 'memory' || e === 'resurrection') {
      if(forPlayer && this.discardPile.length > 1) {
        const card = this.discardPile.splice(this.discardPile.length-2,1)[0];
        this.playerHand.push(card);
        this._addLog(`📖 Karte aus Ablage genommen: ${card.name}!`);
      }
    }
    else if (e === 'dissolve') {
      if(forPlayer) {
        while(this.playerHand.length > Math.ceil(this.playerHand.length/2))
          this.discardPile.push(this.playerHand.pop());
        for(let i=0;i<3;i++) this.aiHand.push(this._draw());
        this._addLog('♒ Auflösung: Hände halbiert, KI +3!');
      }
    }
    else if (e === 'null_field') {
      this.nullFieldTurns = n || 2;
      this._addLog(`⊗ Nullfeld: ${this.nullFieldTurns} Runden ohne Effekte!`);
    }
    else if (e === 'time_collapse') {
      this.frozenTurns = 2;
      this.opponentFrozenTurns = 2;
      this._addLog('⌚💀 Zeitkollaps: Alle frieren 2 Runden!');
    }
    else {
      // Fallback for unimplemented effects
      this._addLog(`✦ ${card.name}: Spezieller Effekt!`);
    }
  }

  _isAttack(e) {
    if (!e) return false;
    return e.startsWith('draw:') || e.startsWith('wild_draw:') || e === 'skip' || e.startsWith('skip') || e.startsWith('freeze:');
  }

  _skipPlayer() {
    // Advances turn to skip the current next player
    this.currentPlayer = this.currentPlayer === 0 ? 0 : 1; // In 2-player game, skip means stay
    // Mark that the other player loses their turn
    if (this.currentPlayer === 0) this._addLog('⊘ KI-Zug übersprungen!');
  }

  playCard(handIndex) {
    if (this.phase !== 'playing' && this.phase !== 'doublePlay' && this.phase !== 'vortex') return false;
    if (this.currentPlayer !== 0) return false;
    const card = this.playerHand[handIndex];
    if (!card) return false;
    if (!this.canPlay(card) && !this.doublePlayActive && !this.vortexMode) return false;

    this.playerHand.splice(handIndex, 1);
    this.discardPile.push(card);

    if (card.type === 'number') {
      this.currentColor = card.color;
      this.currentValue = card.value;
    } else {
      if (card.color !== 'gray' && card.color !== 'black') this.currentColor = card.color;
    }

    this.phaseActive = false;
    this.lastCard = card;

    this._addLog(`🃏 Du spielst: ${card.name}!`);
    this._applyEffect(card, true);

    // Check vortex mode
    if (this.vortexMode) {
      this.vortexPlayed = (this.vortexPlayed||0) + 1;
      if (this.vortexPlayed >= 2) {
        this.vortexMode = false;
        this.vortexPlayed = 0;
      }
    }

    // Check double play
    if (this.doublePlayActive) {
      this.doublePlayActive = false;
      // player gets another play
      return true;
    }

    // Check win
    if (this.playerHand.length === 0) {
      this.winner = 'player';
      this.phase = 'gameOver';
      this._addLog('🏆 DU GEWINNST!!!');
      if (this.callbacks.onWin) this.callbacks.onWin('player');
      return true;
    }

    if (this.playerHand.length === 1) this._addLog('🎯 UNO!!! Nur noch 1 Karte!');

    // Move to next player (if effect didn't keep turn)
    if (this.phase === 'playing') {
      this.currentPlayer = 1;
      this.turn++;
      this._tickAutoEffects();
      if (this.callbacks.onUpdate) this.callbacks.onUpdate();
      setTimeout(() => this._aiTurn(), 1200);
    } else {
      if (this.callbacks.onUpdate) this.callbacks.onUpdate();
    }
    return true;
  }

  pickColor(color) {
    if (this.phase !== 'colorPick') return;
    this.currentColor = color;
    this.currentValue = null;
    this._addLog(`🌈 Farbe gewählt: ${CARD_COLOR_STYLES[color].name}!`);

    if (this.pendingWildDraw) {
      for(let i=0;i<this.pendingWildDraw;i++) this.aiHand.push(this._draw());
      this._addLog(`+${this.pendingWildDraw} KI muss ${this.pendingWildDraw} Karten ziehen!`);
      this.pendingWildDraw = 0;
    }
    if (this.pendingWildSkip) {
      this.pendingWildSkip = false;
    }

    this.phase = 'playing';
    this.currentPlayer = 1;
    this.turn++;
    this._tickAutoEffects();
    if (this.callbacks.onUpdate) this.callbacks.onUpdate();
    setTimeout(() => this._aiTurn(), 1200);
  }

  drawCardForPlayer() {
    if (this.currentPlayer !== 0) return;
    if (this.phase !== 'playing') return;
    const card = this._draw();
    this.playerHand.push(card);
    this._addLog(`📥 Du ziehst: ${card.name}`);
    this.currentPlayer = 1;
    this.turn++;
    this._tickAutoEffects();
    if (this.callbacks.onUpdate) this.callbacks.onUpdate();
    setTimeout(() => this._aiTurn(), 1200);
  }

  activateUpgrade(upgradeId) {
    if (this.usedUpgrades.has(upgradeId)) {
      this._addLog('❌ Upgrade bereits verwendet!');
      return false;
    }
    const upg = this.playerUpgrades.find(u=>u.id===upgradeId);
    if (!upg || upg.type !== 'active') return false;
    this.usedUpgrades.add(upgradeId);
    this._addLog(`🔧 Upgrade: ${upg.name}!`);
    this._applyUpgradeEffect(upg);
    if (this.callbacks.onUpdate) this.callbacks.onUpdate();
    return true;
  }

  _applyUpgradeEffect(upg) {
    const e = upg.effect;
    if (e.startsWith('draw_self:')) {
      const n = parseInt(e.split(':')[1]);
      for(let i=0;i<n;i++) this.playerHand.push(this._draw());
      this._addLog(`📥 +${n} Karten!`);
    } else if (e.startsWith('gain_shield:') || e.startsWith('shield:')) {
      const n = parseInt(e.split(':')[1]);
      this.shieldCount += n;
      this._addLog(`🛡 +${n} Schilde!`);
    } else if (e === 'atk:skip_draw2') {
      this.opponentFrozenTurns += 1;
      for(let i=0;i<2;i++) this.aiHand.push(this._draw());
      this._addLog('🗡 KI überspringt + zieht 2!');
    } else if (e === 'skip_all') {
      this.opponentFrozenTurns += 1;
      this._addLog('⏸ KI überspringt!');
    } else if (e === 'hand_swap') {
      const tmp = [...this.playerHand];
      this.playerHand = [...this.aiHand];
      this.aiHand = tmp;
      this._addLog('🔄 Hände getauscht!');
    } else if (e === 'draw5_discard2') {
      for(let i=0;i<5;i++) this.playerHand.push(this._draw());
      for(let i=0;i<2;i++) this.discardPile.push(this.playerHand.shift());
      this._addLog('+5, -2 Karten!');
    } else if (e === 'atk:draw4') {
      for(let i=0;i<4;i++) this.aiHand.push(this._draw());
      this._addLog('🎯 KI zieht 4!');
    } else if (e === 'phase:2') {
      this.phaseActive = true;
      this._addLog('🌑 Schattenritt: Ignoriere Farben!');
    } else if (e === 'add_wilds:3') {
      const wilds = ALL_CARDS.filter(c=>c.effect==='wild'&&c.color==='gray');
      for(let i=0;i<3;i++) this.playerHand.push(wilds[Math.floor(Math.random()*wilds.length)]);
      this._addLog('★ 3 Wild-Karten hinzugefügt!');
    } else if (e === 'steal_all:2') {
      const stolen = this.aiHand.splice(0, Math.min(2, this.aiHand.length));
      this.playerHand.push(...stolen);
      this._addLog(`💸 ${stolen.length} Karten gestohlen!`);
    } else if (e === 'double_next') {
      this.doubleNext = true;
      this._addLog('⚡ Nächste Karte: Doppel-Effekt!');
    } else if (e === 'all_draw:2') {
      for(let i=0;i<2;i++) this.aiHand.push(this._draw());
      this._addLog('⛓ Alle ziehen 2!');
    } else if (e === 'discard_opp:3') {
      const cnt = Math.min(3, this.aiHand.length);
      this.aiHand.splice(0, cnt);
      this._addLog(`💥 KI wirft ${cnt} Karten ab!`);
    } else if (e === 'quick_draw') {
      this.playerHand.push(this._draw());
      this.playerHand.push(this._draw());
      this._addLog('🏹 Schnellschuss: +2 Karten!');
    } else if (e === 'nullify') {
      this._addLog('∅ Letzter Gegner-Effekt aufgehoben!');
    } else if (e === 'reclaim:3') {
      for(let i=0;i<3&&this.discardPile.length>1;i++) {
        this.playerHand.push(this.discardPile.pop());
      }
      this._addLog('⏪ 3 Karten zurückgeholt!');
    } else if (e === 'multi_play:3') {
      this.multiPlayCount = 3;
      this._addLog('🔮 Manastoß: Spiele 3 Karten!');
    } else if (e.startsWith('void_opp:')) {
      const n = parseInt(e.split(':')[1]);
      const cnt = Math.min(n, this.aiHand.length);
      this.aiHand.splice(0, cnt);
      this._addLog(`⚔ ${cnt} KI-Karten entfernt!`);
    } else if (e.startsWith('draw_self:')) {
      const n = parseInt(e.split(':')[1]);
      for(let i=0;i<n;i++) this.playerHand.push(this._draw());
    } else if (e === 'freeze:3') {
      this.opponentFrozenTurns += 3;
      this._addLog('🧊 KI friert 3 Runden!');
    } else if (e === 'poison:4') {
      this.opponentPoisonTurns = 4;
      this._addLog('☠ KI vergiftet: +1/Runde für 4 Runden!');
    } else if (e === 'reflect:2') {
      this.reflectCount = (this.reflectCount||0) + 2;
      this._addLog('🪞 2 Reflektionen aktiv!');
    } else if (e === 'draw6_skip') {
      for(let i=0;i<6;i++) this.playerHand.push(this._draw());
      this.opponentFrozenTurns += 1;
      this._addLog('😤 Furor: +6 Karten + KI Skip!');
    } else if (e === 'halve_opp') {
      const rm = Math.floor(this.aiHand.length/2);
      this.aiHand.splice(0, rm);
      this._addLog(`Ω KI verliert ${rm} Karten!`);
    } else if (e === 'reckoning') {
      for(let i=0;i<4;i++) this.playerHand.push(this._draw());
      for(let i=0;i<6;i++) this.aiHand.push(this._draw());
      this._addLog('⚖ Abrechnung: +4, KI +6!');
    } else if (e === 'eclipse') {
      this.nullFieldTurns = 2;
      this._addLog('🌑 Finsternis: Effekte 2 Runden aus!');
    } else if (e.startsWith('immune:')) {
      const n = parseInt(e.split(':')[1]);
      this.immuneTurns = n;
      this._addLog(`✝ Immun für ${n} Züge!`);
    } else if (e === 'dark_pact') {
      for(let i=0;i<5;i++) this.aiHand.push(this._draw());
      for(let i=0;i<4;i++) this.playerHand.push(this._draw());
      this._addLog('😈 Dunkler Pakt: KI +5, Du +4 + Extra-Zug!');
    } else if (e === 'random_power') {
      const powers = ['black_hole','supernova','divine_lightning','god_hand','soul_swap'];
      const p = powers[Math.floor(Math.random()*powers.length)];
      this._applyEffect({effect:p,name:'Chaos'}, true);
    } else if (e.startsWith('all_draw:')) {
      const n = parseInt(e.split(':')[1]);
      for(let i=0;i<n;i++) this.aiHand.push(this._draw());
      this._addLog(`⛈ Alle +${n}!`);
    } else {
      this._addLog(`🔧 ${upg.name} aktiviert!`);
    }
  }

  _tickAutoEffects() {
    // Poison
    if (this.poisonTurns > 0) {
      this.playerHand.push(this._draw());
      this.poisonTurns--;
      this._addLog(`🐍 Vergiftung: +1 Karte (${this.poisonTurns} übrig)`);
    }
    if (this.opponentPoisonTurns > 0) {
      this.aiHand.push(this._draw());
      this.opponentPoisonTurns--;
    }
    // Immune countdown
    if (this.immuneTurns > 0) this.immuneTurns--;
    // NullField countdown
    if (this.nullFieldTurns > 0) this.nullFieldTurns--;

    // Auto upgrades
    this.playerUpgrades.forEach(u => {
      if (this.usedUpgrades.has(u.id)) return;
      if (u.type !== 'auto') return;
      let trigger = false;
      if (u.effect === 'auto_low_draw:3' && this.playerHand.length <= 2) trigger = true;
      if (u.effect === 'auto_start_draw:2' && this.turn === 0) trigger = true;
      if (u.effect === 'auto_arsenal' && this.turn === 0) trigger = true;
      if (u.effect === 'auto_survivor' && this.playerHand.length > 10) trigger = true;
      if (u.effect === 'auto_trim' && this.playerHand.length > 8) trigger = true;
      if (trigger) {
        this.usedUpgrades.add(u.id);
        this._addLog(`🔧 Auto-Upgrade: ${u.name}!`);
        if (u.effect === 'auto_low_draw:3') { for(let i=0;i<3;i++) this.playerHand.push(this._draw()); }
        if (u.effect === 'auto_survivor') { while(this.playerHand.length>7) this.discardPile.push(this.playerHand.pop()); }
      }
    });
  }

  _aiChooseColor() {
    const colorCount = {red:0,green:0,blue:0,yellow:0};
    this.aiHand.forEach(c => { if(colorCount[c.color]!==undefined) colorCount[c.color]++; });
    return Object.entries(colorCount).sort((a,b)=>b[1]-a[1])[0][0];
  }

  _aiTurn() {
    if (this.phase !== 'playing' || this.winner) return;
    if (this.currentPlayer !== 1) return;

    // Check frozen
    if (this.opponentFrozenTurns > 0) {
      this.opponentFrozenTurns--;
      this._addLog(`❄ KI ist eingefroren! (${this.opponentFrozenTurns} Runden übrig)`);
      this.currentPlayer = 0;
      if (this.callbacks.onUpdate) this.callbacks.onUpdate();
      return;
    }

    // Find playable card
    let playIdx = -1;
    // Priority: action/special > number
    const actions = this.aiHand.map((c,i)=>({c,i})).filter(({c})=>this.canPlay(c)&&c.type!=='number');
    const numbers = this.aiHand.map((c,i)=>({c,i})).filter(({c})=>this.canPlay(c)&&c.type==='number');

    if (actions.length > 0) {
      // Play highest rarity action
      const sorted = actions.sort((a,b)=>{
        const rv = {common:0,uncommon:1,rare:2,epic:3,legendary:4,mythic:5};
        return (rv[b.c.rarity]||0)-(rv[a.c.rarity]||0);
      });
      playIdx = sorted[0].i;
    } else if (numbers.length > 0) {
      // Play highest number
      const sorted = numbers.sort((a,b)=>(b.c.value||0)-(a.c.value||0));
      playIdx = sorted[0].i;
    }

    if (playIdx >= 0) {
      const card = this.aiHand.splice(playIdx, 1)[0];
      this.discardPile.push(card);
      if (card.type === 'number') {
        this.currentColor = card.color;
        this.currentValue = card.value;
      } else if (card.color !== 'gray' && card.color !== 'black') {
        this.currentColor = card.color;
      }
      this.lastCard = card;
      this._addLog(`🤖 KI spielt: ${card.name}!`);

      // Handle color pick for AI
      if (card.effect === 'wild' || card.effect === 'wild_random' || card.effect === 'wild_skip' || card.effect === 'wild_reverse' || (card.effect&&card.effect.startsWith('wild_draw')) || (card.effect&&card.effect.startsWith('wild_all')) || card.effect === 'wild_hand_swap' || card.effect === 'super_wild' || card.effect === 'chrono_wild' || card.effect === 'wild_clone' || card.effect === 'wild_meteor' || card.effect === 'ultimate_wild' || card.effect === 'wild_shield' || card.effect === 'wild_freeze:2' || card.effect === 'wild_steal:2' || card.effect === 'wild_echo' || card.effect === 'wild_burst' || card.effect === 'omega' || card.effect === 'hyper_wild') {
        const aiColor = this._aiChooseColor();
        this.currentColor = aiColor;
        card.chosenColor = aiColor;
        this._addLog(`🌈 KI wählt: ${CARD_COLOR_STYLES[aiColor].name}`);
      }

      this._applyEffect(card, false);

      // Check AI win
      if (this.aiHand.length === 0) {
        this.winner = 'ai';
        this.phase = 'gameOver';
        this._addLog('😭 KI GEWINNT! Besser nächstes Mal!');
        if (this.callbacks.onWin) this.callbacks.onWin('ai');
        if (this.callbacks.onUpdate) this.callbacks.onUpdate();
        return;
      }
      if (this.aiHand.length === 1) this._addLog('🤖 KI sagt: UNO!');
    } else {
      // Draw a card
      const drawn = this._draw();
      this.aiHand.push(drawn);
      this._addLog(`🤖 KI zieht eine Karte...`);
    }

    if (this.phase === 'playing') this.currentPlayer = 0;
    this.turn++;
    this._tickAutoEffects();
    if (this.callbacks.onUpdate) this.callbacks.onUpdate();
  }

  getState() {
    return {
      playerHand:         this.playerHand,
      aiHandSize:         this.aiHand.length,
      drawPileSize:       this.drawPile.length,
      topCard:            this.topCard,
      currentColor:       this.currentColor,
      isPlayerTurn:       this.currentPlayer === 0,
      phase:              this.phase,
      pendingColorPick:   this.phase === 'colorPick',
      winner:             this.winner,
      log:                this.log,
      shieldCount:        this.shieldCount        || 0,
      reflectCount:       this.reflectCount       || 0,
      immuneTurns:        this.immuneTurns         || 0,
      poisonTurns:        this.poisonTurns         || 0,
      frozenTurns:        this.frozenTurns         || 0,
      opponentPoisonTurns:this.opponentPoisonTurns || 0,
      nullFieldTurns:     this.nullFieldTurns      || 0,
      phaseActive:        this.phaseActive,
      doublePlayActive:   this.doublePlayActive,
      vortexMode:         this.vortexMode,
      turn:               this.turn,
    };
  }
}
