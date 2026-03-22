/* ============================================================
   UltraUNO — app.js
   Main application: auth, navigation, UI, game wiring
   ============================================================ */

'use strict';

// ── Storage keys ───────────────────────────────────────────
const SK_ACCOUNTS  = 'ultrauno_accounts';
const SK_CURRENT   = 'ultrauno_current_user';
const SK_PLAYER    = u => `ultrauno_player_${u}`;
const SK_BOARD     = 'ultrauno_leaderboard';

// ── Runtime state ──────────────────────────────────────────
let currentUser   = null;   // username string
let playerData    = null;   // full player object
let gameEngine    = null;   // UnoEngine instance
let currentScreen = null;

// ── Hash helper (simple djb2 for demo) ─────────────────────
function hashStr(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h) ^ s.charCodeAt(i);
  return (h >>> 0).toString(16);
}

// ── Account helpers ─────────────────────────────────────────
function getAccounts() { return JSON.parse(localStorage.getItem(SK_ACCOUNTS) || '{}'); }
function saveAccounts(a) { localStorage.setItem(SK_ACCOUNTS, JSON.stringify(a)); }

function loadPlayer(username) {
  const raw = localStorage.getItem(SK_PLAYER(username));
  return raw ? JSON.parse(raw) : null;
}
function savePlayer(data) {
  localStorage.setItem(SK_PLAYER(data.username), JSON.stringify(data));
}

function createNewPlayer(username) {
  // Default cosmetic IDs: 1=Klassisch(cardback), 11=Standard(avatar),
  // 17=Klassischer Tisch(theme), 22=Standard Sieg(winanim)
  return {
    username,
    diamonds: 200,
    trophies: 0,
    wins: 0,
    losses: 0,
    ownedCards: [...STARTING_CARD_IDS],
    ownedUpgrades: [],
    ownedCosmetics: [1, 11, 17, 22],
    equippedCards: STARTING_CARD_IDS.slice(0, 32),
    equippedUpgrades: [],
    activeCosmetics: { cardBack: 1, avatar: 11, tableTheme: 17, winAnimation: 22 }
  };
}

// ── Screen navigation ───────────────────────────────────────
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  currentScreen = id;
  if (id === 'screen-menu')        renderMenu();
  if (id === 'screen-collection')  renderCollection();
  if (id === 'screen-deck')        renderDeckBuilder();
  if (id === 'screen-shop')        renderShop();
  if (id === 'screen-leaderboard') renderLeaderboard();
  if (id === 'screen-cosmetics')   renderCosmetics();
}

// ── Auth ────────────────────────────────────────────────────
function tryLogin(username, password) {
  const accounts = getAccounts();
  if (!accounts[username]) return 'Kein Account gefunden.';
  if (accounts[username] !== hashStr(password)) return 'Falsches Passwort.';
  return null;
}

function tryRegister(username, password) {
  if (username.length < 3) return 'Nutzername zu kurz (min. 3 Zeichen).';
  if (password.length < 4) return 'Passwort zu kurz (min. 4 Zeichen).';
  const accounts = getAccounts();
  if (accounts[username]) return 'Nutzername bereits vergeben.';
  accounts[username] = hashStr(password);
  saveAccounts(accounts);
  const player = createNewPlayer(username);
  savePlayer(player);
  return null;
}

function loginUser(username) {
  currentUser = username;
  playerData  = loadPlayer(username);
  localStorage.setItem(SK_CURRENT, username);
  showScreen('screen-menu');
}

function logout() {
  currentUser = null;
  playerData  = null;
  localStorage.removeItem(SK_CURRENT);
  showScreen('screen-auth');
}

// ── Currency helpers ────────────────────────────────────────
function spendDiamonds(amount) {
  if (playerData.diamonds < amount) return false;
  playerData.diamonds -= amount;
  savePlayer(playerData);
  return true;
}

function addDiamonds(amount) { playerData.diamonds += amount; savePlayer(playerData); }
function addTrophies(amount) { playerData.trophies += amount; savePlayer(playerData); }

// ── Card rendering ──────────────────────────────────────────
const COLOR_BG = {
  red:    '#c0392b',
  green:  '#27ae60',
  blue:   '#2980b9',
  yellow: '#f39c12',
  gray:   '#7f8c8d',
  black:  '#1a1a2e'
};

function rarityGlow(rarity) {
  const map = {
    common: '#888',
    uncommon: '#2ecc71',
    rare: '#3498db',
    epic: '#9b59b6',
    legendary: '#e67e22',
    mythic: '#ffd700'
  };
  return map[rarity] || '#888';
}

function buildCardEl(card, opts = {}) {
  const { small = false, owned = true, selected = false, onClick = null } = opts;
  const div = document.createElement('div');
  div.className = `card-tile${small ? ' card-small' : ''}${selected ? ' card-selected' : ''}${!owned ? ' card-unowned' : ''}`;
  div.style.setProperty('--card-bg', COLOR_BG[card.color] || '#333');
  div.style.setProperty('--rarity-glow', rarityGlow(card.rarity));

  const colorBar = document.createElement('div');
  colorBar.className = 'card-color-bar';

  const inner = document.createElement('div');
  inner.className = 'card-inner';

  const name = document.createElement('div');
  name.className = 'card-name';
  name.textContent = card.name;

  const rarityBadge = document.createElement('div');
  rarityBadge.className = `card-rarity rarity-${card.rarity}`;
  rarityBadge.textContent = RARITIES[card.rarity]?.label || card.rarity;

  const effect = document.createElement('div');
  effect.className = 'card-effect';
  effect.textContent = card.effect || '';

  inner.append(name, rarityBadge, effect);
  div.append(colorBar, inner);

  if (!owned) {
    const lock = document.createElement('div');
    lock.className = 'card-lock';
    lock.textContent = '🔒';
    div.appendChild(lock);
  }

  if (onClick) div.addEventListener('click', () => onClick(card));
  return div;
}

function buildUpgradeEl(upg, opts = {}) {
  const { selected = false, owned = true, onClick = null } = opts;
  const div = document.createElement('div');
  div.className = `upgrade-tile${selected ? ' card-selected' : ''}${!owned ? ' card-unowned' : ''}`;

  const title = document.createElement('div');
  title.className = 'upgrade-title';
  title.textContent = upg.name;

  const typeBadge = document.createElement('span');
  typeBadge.className = `upgrade-type upgrade-type-${upg.type}`;
  typeBadge.textContent = upg.type === 'active' ? '▶ Aktiv' : '⚡ Auto';

  const desc = document.createElement('div');
  desc.className = 'upgrade-desc';
  desc.textContent = upg.description || '';

  div.append(title, typeBadge, desc);
  if (onClick) div.addEventListener('click', () => onClick(upg));
  return div;
}

// ── Menu screen ─────────────────────────────────────────────
function renderMenu() {
  document.getElementById('menu-username').textContent = playerData.username;
  document.getElementById('menu-diamonds').textContent = playerData.diamonds;
  document.getElementById('menu-trophies').textContent = playerData.trophies;
  document.getElementById('menu-wins').textContent = playerData.wins;
  document.getElementById('menu-losses').textContent = playerData.losses;
  const avatarEl = document.getElementById('menu-avatar');
  const av = ALL_COSMETICS.find(c => c.id === playerData.activeCosmetics.avatar);
  avatarEl.textContent = av ? av.preview : '🃏';
}

// ── Collection screen ────────────────────────────────────────
let collFilter = { rarity: 'all', color: 'all', search: '' };

function renderCollection() {
  const grid = document.getElementById('coll-grid');
  grid.innerHTML = '';
  const owned = new Set(playerData.ownedCards);
  let cards = ALL_CARDS;
  if (collFilter.rarity !== 'all') cards = cards.filter(c => c.rarity === collFilter.rarity);
  if (collFilter.color !== 'all')  cards = cards.filter(c => c.color === collFilter.color);
  if (collFilter.search)            cards = cards.filter(c => c.name.toLowerCase().includes(collFilter.search));
  document.getElementById('coll-count').textContent = `${owned.size} / ${ALL_CARDS.length} Karten`;
  cards.forEach(card => {
    const el = buildCardEl(card, { small: true, owned: owned.has(card.id) });
    el.title = `${card.name}\n${card.effect || ''}`;
    grid.appendChild(el);
  });
  if (!grid.children.length) {
    grid.innerHTML = '<p class="empty-msg">Keine Karten gefunden.</p>';
  }
}

// ── Deck builder ─────────────────────────────────────────────
let deckBuilderState = {
  equipped: [],
  upgrades: []
};

function renderDeckBuilder() {
  deckBuilderState.equipped  = [...playerData.equippedCards];
  deckBuilderState.upgrades  = [...playerData.equippedUpgrades];
  _renderDeckLeft();
  _renderDeckRight();
  _renderUpgradePicker();
}

function _renderDeckLeft() {
  const pool = document.getElementById('deck-pool');
  pool.innerHTML = '';
  const equippedSet = new Set(deckBuilderState.equipped);
  playerData.ownedCards.forEach(id => {
    const card = getCardById(id);
    if (!card) return;
    const el = buildCardEl(card, {
      small: true,
      selected: equippedSet.has(id),
      onClick: () => _toggleDeckCard(id)
    });
    pool.appendChild(el);
  });
}

function _renderDeckRight() {
  const slots = document.getElementById('deck-slots');
  slots.innerHTML = '';
  const count = document.getElementById('deck-count');
  count.textContent = `${deckBuilderState.equipped.length} / 32`;
  deckBuilderState.equipped.forEach(id => {
    const card = getCardById(id);
    if (!card) return;
    const el = buildCardEl(card, {
      small: true,
      selected: false,
      onClick: () => _toggleDeckCard(id)
    });
    slots.appendChild(el);
  });
  // Empty placeholders
  const remaining = 32 - deckBuilderState.equipped.length;
  for (let i = 0; i < Math.min(remaining, 8); i++) {
    const ph = document.createElement('div');
    ph.className = 'card-placeholder';
    ph.textContent = '+';
    slots.appendChild(ph);
  }
}

function _renderUpgradePicker() {
  const pool = document.getElementById('upgrade-pool');
  pool.innerHTML = '';
  const slots = document.getElementById('upgrade-slots');
  slots.innerHTML = '';
  const equippedSet = new Set(deckBuilderState.upgrades);

  playerData.ownedUpgrades.forEach(id => {
    const upg = getUpgradeById(id);
    if (!upg) return;
    const el = buildUpgradeEl(upg, {
      selected: equippedSet.has(id),
      onClick: () => _toggleUpgrade(id)
    });
    pool.appendChild(el);
  });

  deckBuilderState.upgrades.forEach(id => {
    const upg = getUpgradeById(id);
    if (!upg) return;
    const el = buildUpgradeEl(upg, { selected: true, onClick: () => _toggleUpgrade(id) });
    slots.appendChild(el);
  });

  const rem = 3 - deckBuilderState.upgrades.length;
  for (let i = 0; i < rem; i++) {
    const ph = document.createElement('div');
    ph.className = 'upgrade-placeholder';
    ph.textContent = '+ Upgrade';
    slots.appendChild(ph);
  }
}

function _toggleDeckCard(id) {
  const idx = deckBuilderState.equipped.indexOf(id);
  if (idx !== -1) {
    deckBuilderState.equipped.splice(idx, 1);
  } else {
    if (deckBuilderState.equipped.length >= 32) {
      showToast('Deck voll! Zuerst eine Karte entfernen.', 'warn');
      return;
    }
    deckBuilderState.equipped.push(id);
  }
  _renderDeckLeft();
  _renderDeckRight();
}

function _toggleUpgrade(id) {
  const idx = deckBuilderState.upgrades.indexOf(id);
  if (idx !== -1) {
    deckBuilderState.upgrades.splice(idx, 1);
  } else {
    if (deckBuilderState.upgrades.length >= 3) {
      showToast('Nur 3 Upgrades möglich!', 'warn');
      return;
    }
    deckBuilderState.upgrades.push(id);
  }
  _renderUpgradePicker();
}

function saveDeck() {
  if (deckBuilderState.equipped.length < 1) {
    showToast('Deck muss mindestens 1 Karte enthalten.', 'error');
    return;
  }
  playerData.equippedCards   = [...deckBuilderState.equipped];
  playerData.equippedUpgrades = [...deckBuilderState.upgrades];
  savePlayer(playerData);
  showToast('Deck gespeichert! ✓', 'success');
}

// ── Shop / Lootbox ───────────────────────────────────────────
function renderShop() {
  const grid = document.getElementById('shop-grid');
  grid.innerHTML = '';
  LOOTBOXES.forEach(box => {
    const card = document.createElement('div');
    card.className = 'lootbox-card';
    card.innerHTML = `
      <div class="lootbox-icon">${box.icon}</div>
      <div class="lootbox-name">${box.name}</div>
      <div class="lootbox-desc">${box.cards} Karte${box.cards > 1 ? 'n' : ''} + 1 Upgrade</div>
      <div class="lootbox-price">💎 ${box.cost}</div>
      <button class="btn btn-gold" data-box="${box.level}">Öffnen</button>`;
    card.querySelector('button').addEventListener('click', () => buyLootbox(box));
    grid.appendChild(card);
  });
  document.getElementById('shop-diamonds').textContent = playerData.diamonds;
}

function buyLootbox(box) {
  if (!spendDiamonds(box.cost)) {
    showToast('Nicht genug Diamanten!', 'error');
    return;
  }
  document.getElementById('shop-diamonds').textContent = playerData.diamonds;
  const result = rollLootbox(box);
  openLootboxAnimation(result);
}

function openLootboxAnimation(result) {
  showScreen('screen-lootbox-open');
  const container = document.getElementById('lootbox-reveal');
  container.innerHTML = '';
  document.getElementById('lootbox-claim-btn').style.display = 'none';

  // Add won items to player
  result.cards.forEach(card => {
    if (!playerData.ownedCards.includes(card.id)) {
      playerData.ownedCards.push(card.id);
    }
  });
  if (result.upgrade && !playerData.ownedUpgrades.includes(result.upgrade.id)) {
    playerData.ownedUpgrades.push(result.upgrade.id);
  }
  savePlayer(playerData);

  let delay = 0;
  result.cards.forEach((card, i) => {
    setTimeout(() => {
      const el = buildCardEl(card, { owned: true });
      el.style.animation = 'cardReveal 0.5s ease forwards';
      container.appendChild(el);
      if (i === result.cards.length - 1) {
        if (result.upgrade) {
          setTimeout(() => {
            const upgEl = buildUpgradeEl(result.upgrade, { owned: true });
            upgEl.style.animation = 'cardReveal 0.5s ease forwards';
            container.appendChild(upgEl);
            document.getElementById('lootbox-claim-btn').style.display = 'block';
          }, 600);
        } else {
          document.getElementById('lootbox-claim-btn').style.display = 'block';
        }
      }
    }, delay);
    delay += 700;
  });
}

// ── Cosmetics ────────────────────────────────────────────────
function renderCosmetics() {
  const sections = {
    cardback: document.getElementById('cosm-cardbacks'),
    avatar:   document.getElementById('cosm-avatars'),
    table:    document.getElementById('cosm-tables'),
    win:      document.getElementById('cosm-wins')
  };
  Object.values(sections).forEach(s => s && (s.innerHTML = ''));

  ALL_COSMETICS.forEach(cosm => {
    const owned = playerData.ownedCosmetics.includes(cosm.id);
    const isEquipped = Object.values(playerData.activeCosmetics).includes(cosm.id);
    const div = document.createElement('div');
    div.className = `cosm-item${owned ? '' : ' cosm-locked'}${isEquipped ? ' cosm-equipped' : ''}`;
    div.innerHTML = `
      <div class="cosm-preview">${cosm.preview}</div>
      <div class="cosm-name">${cosm.name}</div>
      ${owned
        ? `<button class="btn ${isEquipped ? 'btn-equipped' : 'btn-equip'}">${isEquipped ? 'Ausgerüstet' : 'Ausrüsten'}</button>`
        : `<button class="btn btn-buy">💎 ${cosm.cost}</button>`}`;

    const btn = div.querySelector('button');
    if (owned && !isEquipped) {
      btn.addEventListener('click', () => equipCosmetic(cosm));
    } else if (!owned) {
      btn.addEventListener('click', () => buyCosmetic(cosm));
    }

    const target = cosm.category === 'cardback' ? sections.cardback
      : cosm.category === 'avatar' ? sections.avatar
      : cosm.category === 'theme'  ? sections.table
      : sections.win;
    if (target) target.appendChild(div);
  });

  document.getElementById('cosm-diamonds').textContent = playerData.diamonds;
}

function buyCosmetic(cosm) {
  if (!spendDiamonds(cosm.price)) {
    showToast('Nicht genug Diamanten!', 'error');
    return;
  }
  playerData.ownedCosmetics.push(cosm.id);
  savePlayer(playerData);
  showToast(`${cosm.name} gekauft!`, 'success');
  renderCosmetics();
}

function equipCosmetic(cosm) {
  const keyMap = { cardback: 'cardBack', avatar: 'avatar', theme: 'tableTheme', winanim: 'winAnimation' };
  const key = keyMap[cosm.category];
  if (key) playerData.activeCosmetics[key] = cosm.id;
  savePlayer(playerData);
  showToast(`${cosm.name} ausgerüstet!`, 'success');
  renderCosmetics();
}

// ── Leaderboard ──────────────────────────────────────────────
const FAKE_PLAYERS = [
  { username: 'DragonKing99', trophies: 4850, wins: 312, losses: 87 },
  { username: 'UNO_Meisterin', trophies: 4200, wins: 270, losses: 95 },
  { username: 'ShadowDealer', trophies: 3780, wins: 244, losses: 112 },
  { username: 'KartenHexe', trophies: 3320, wins: 215, losses: 98 },
  { username: 'BlitzSpieler', trophies: 2990, wins: 192, losses: 143 },
  { username: 'NebelFuchs', trophies: 2670, wins: 171, losses: 130 },
  { username: 'StarterKing', trophies: 1980, wins: 128, losses: 155 },
  { username: 'Kartenhai', trophies: 1540, wins: 99, losses: 87 },
  { username: 'WildChild', trophies: 890, wins: 57, losses: 73 },
  { username: 'Anfänger_Max', trophies: 320, wins: 21, losses: 44 }
];

function getLeaderboard() {
  let board = JSON.parse(localStorage.getItem(SK_BOARD) || 'null');
  if (!board) {
    board = [...FAKE_PLAYERS];
    localStorage.setItem(SK_BOARD, JSON.stringify(board));
  }
  return board;
}

function updateLeaderboard() {
  let board = getLeaderboard();
  const existIdx = board.findIndex(e => e.username === playerData.username);
  const entry = {
    username: playerData.username,
    trophies: playerData.trophies,
    wins:     playerData.wins,
    losses:   playerData.losses
  };
  if (existIdx !== -1) board[existIdx] = entry;
  else board.push(entry);
  board.sort((a, b) => b.trophies - a.trophies);
  localStorage.setItem(SK_BOARD, JSON.stringify(board));
}

function renderLeaderboard() {
  updateLeaderboard();
  const board = getLeaderboard();
  const tbody = document.getElementById('lb-body');
  tbody.innerHTML = '';
  board.forEach((entry, i) => {
    const tr = document.createElement('tr');
    const isMe = entry.username === playerData.username;
    if (isMe) tr.classList.add('lb-me');
    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`;
    tr.innerHTML = `
      <td>${medal}</td>
      <td>${entry.username}${isMe ? ' <span class="you-badge">Du</span>' : ''}</td>
      <td>${entry.trophies}</td>
      <td>${entry.wins}</td>
      <td>${entry.losses}</td>`;
    tbody.appendChild(tr);
  });
}

// ── Game screen ──────────────────────────────────────────────
function startGame() {
  const deck    = playerData.equippedCards.length > 0 ? playerData.equippedCards : STARTING_CARD_IDS.slice(0, 32);
  const upgrades = playerData.equippedUpgrades;

  gameEngine = new UnoEngine(deck, upgrades);

  gameEngine.on('onLog',        msg  => appendGameLog(msg));
  gameEngine.on('onUpdate',     ()   => renderGameState());
  gameEngine.on('onWin',        who  => endGame(who === 'player'));
  gameEngine.on('onPeek',       card => showToast(`👁 KI-Karte: ${card.name}`, 'info'));
  gameEngine.on('onDoublePlay', ()   => showToast('🔁 Doppelzug aktiv!', 'info'));
  gameEngine.on('onVortex',     ()   => showToast('🌀 VORTEX! Hände getauscht!', 'warn'));

  showScreen('screen-game');
  document.getElementById('game-log').innerHTML = '';
  renderGameState();
  renderUpgradeButtons();
}

function renderGameState() {
  const st = gameEngine.getState();

  // Top info
  document.getElementById('g-ai-count').textContent  = st.aiHandSize;
  document.getElementById('g-draw-count').textContent = st.drawPileSize;
  document.getElementById('g-phase').textContent      = st.phaseActive ? '⚡ PHASE' : '';

  // AI hand (face-down)
  const aiHand = document.getElementById('g-ai-hand');
  aiHand.innerHTML = '';
  for (let i = 0; i < st.aiHandSize; i++) {
    const cb = document.createElement('div');
    cb.className = 'card-back-face';
    aiHand.appendChild(cb);
  }

  // Discard pile
  const discardEl = document.getElementById('g-discard');
  discardEl.innerHTML = '';
  if (st.topCard) {
    const el = buildCardEl(st.topCard, { owned: true });
    el.style.pointerEvents = 'none';
    discardEl.appendChild(el);
  }

  // Current color indicator
  const colorEl = document.getElementById('g-color');
  const colorNames = { red: 'ROT', green: 'GRÜN', blue: 'BLAU', yellow: 'GELB', gray: 'WILD', black: 'SCHWARZ' };
  colorEl.textContent = colorNames[st.currentColor] || '–';
  colorEl.style.background = COLOR_BG[st.currentColor] || '#333';

  // Status badges
  document.getElementById('g-shield').textContent = st.shieldCount    ? `🛡 ×${st.shieldCount}`    : '';
  document.getElementById('g-poison').textContent = st.poisonTurns    ? `☠ ×${st.poisonTurns}`    : '';
  document.getElementById('g-frozen').textContent = st.frozenTurns    ? `❄ ×${st.frozenTurns}`    : '';
  document.getElementById('g-null').textContent   = st.nullFieldTurns ? `⬛×${st.nullFieldTurns}` : '';

  // Player hand
  const handEl = document.getElementById('g-player-hand');
  handEl.innerHTML = '';
  st.playerHand.forEach((card, idx) => {
    const playable = gameEngine.canPlay(card);
    const el = buildCardEl(card, { owned: true });
    if (!playable || !st.isPlayerTurn) el.classList.add('card-unplayable');
    if (st.isPlayerTurn && playable) {
      el.classList.add('card-playable');
      el.addEventListener('click', () => playCard(idx));
    }
    handEl.appendChild(el);
  });

  // Turn indicator
  document.getElementById('g-turn').textContent = st.isPlayerTurn
    ? '🟢 Dein Zug'
    : '🔴 KI am Zug…';

  // Color picker (shown after wild)
  const picker = document.getElementById('g-color-picker');
  picker.style.display = st.pendingColorPick ? 'flex' : 'none';
}

function renderUpgradeButtons() {
  const bar = document.getElementById('g-upgrades');
  bar.innerHTML = '';
  playerData.equippedUpgrades.forEach(id => {
    const upg = getUpgradeById(id);
    if (!upg || upg.type !== 'active') return;
    const btn = document.createElement('button');
    btn.className = 'btn btn-upgrade';
    btn.id = `upg-btn-${id}`;
    btn.textContent = `▶ ${upg.name}`;
    btn.addEventListener('click', () => {
      const ok = gameEngine.activateUpgrade(id);
      if (!ok) showToast('Upgrade bereits benutzt!', 'warn');
      else { renderGameState(); btn.disabled = true; btn.classList.add('used'); }
    });
    bar.appendChild(btn);
  });
}

function playCard(handIndex) {
  const st = gameEngine.getState();
  if (!st.isPlayerTurn) return;
  const ok = gameEngine.playCard(handIndex);
  if (!ok) showToast('Ungültiger Zug!', 'warn');
  renderGameState();
}

function pickColor(color) {
  gameEngine.pickColor(color);
  renderGameState();
}

function drawForPlayer() {
  const st = gameEngine.getState();
  if (!st.isPlayerTurn) return;
  gameEngine.drawCardForPlayer();
  renderGameState();
}

function appendGameLog(msg) {
  const log = document.getElementById('game-log');
  const line = document.createElement('div');
  line.className = 'log-line';
  line.textContent = msg;
  log.appendChild(line);
  log.scrollTop = log.scrollHeight;
}

function endGame(playerWon) {
  const overlay = document.getElementById('g-end-overlay');
  overlay.style.display = 'flex';
  const title = document.getElementById('g-end-title');
  const sub   = document.getElementById('g-end-sub');

  if (playerWon) {
    title.textContent = '🏆 Sieg!';
    title.style.color = '#ffd700';
    sub.textContent   = '+50 🏆  +30 💎';
    playerData.wins++;
    addTrophies(50);
    addDiamonds(30);
    overlay.setAttribute('class', 'end-overlay win-anim');
  } else {
    title.textContent = '💀 Niederlage';
    title.style.color = '#e74c3c';
    sub.textContent   = '+5 🏆  +5 💎';
    playerData.losses++;
    addTrophies(5);
    addDiamonds(5);
    overlay.setAttribute('class', 'end-overlay');
  }
  savePlayer(playerData);
  updateLeaderboard();
}

// ── Toast notifications ──────────────────────────────────────
function showToast(msg, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = msg;
  document.getElementById('toast-container').appendChild(toast);
  setTimeout(() => toast.classList.add('toast-show'), 10);
  setTimeout(() => {
    toast.classList.remove('toast-show');
    setTimeout(() => toast.remove(), 400);
  }, 2800);
}

// ── Bootstrap ────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {

  // Auth form
  document.getElementById('auth-login-btn').addEventListener('click', () => {
    const u = document.getElementById('auth-username').value.trim();
    const p = document.getElementById('auth-password').value;
    const err = tryLogin(u, p);
    if (err) { document.getElementById('auth-error').textContent = err; return; }
    loginUser(u);
  });

  document.getElementById('auth-register-btn').addEventListener('click', () => {
    const u = document.getElementById('auth-username').value.trim();
    const p = document.getElementById('auth-password').value;
    const err = tryRegister(u, p);
    if (err) { document.getElementById('auth-error').textContent = err; return; }
    loginUser(u);
  });

  document.getElementById('auth-password').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('auth-login-btn').click();
  });

  // Menu buttons
  document.getElementById('menu-play-btn').addEventListener('click', startGame);
  document.getElementById('menu-collection-btn').addEventListener('click', () => showScreen('screen-collection'));
  document.getElementById('menu-deck-btn').addEventListener('click', () => showScreen('screen-deck'));
  document.getElementById('menu-shop-btn').addEventListener('click', () => showScreen('screen-shop'));
  document.getElementById('menu-lb-btn').addEventListener('click', () => showScreen('screen-leaderboard'));
  document.getElementById('menu-cosm-btn').addEventListener('click', () => showScreen('screen-cosmetics'));
  document.getElementById('menu-logout-btn').addEventListener('click', logout);

  // Collection filters
  document.getElementById('coll-filter-rarity').addEventListener('change', e => {
    collFilter.rarity = e.target.value;
    renderCollection();
  });
  document.getElementById('coll-filter-color').addEventListener('change', e => {
    collFilter.color = e.target.value;
    renderCollection();
  });
  document.getElementById('coll-search').addEventListener('input', e => {
    collFilter.search = e.target.value.trim().toLowerCase();
    renderCollection();
  });
  document.getElementById('coll-back-btn').addEventListener('click', () => showScreen('screen-menu'));

  // Deck builder
  document.getElementById('deck-save-btn').addEventListener('click', saveDeck);
  document.getElementById('deck-back-btn').addEventListener('click', () => showScreen('screen-menu'));

  // Shop
  document.getElementById('shop-back-btn').addEventListener('click', () => showScreen('screen-menu'));
  document.getElementById('lootbox-claim-btn').addEventListener('click', () => showScreen('screen-shop'));

  // Cosmetics
  document.getElementById('cosm-back-btn').addEventListener('click', () => showScreen('screen-menu'));

  // Leaderboard
  document.getElementById('lb-back-btn').addEventListener('click', () => showScreen('screen-menu'));

  // Game
  document.getElementById('g-draw-btn').addEventListener('click', drawForPlayer);
  document.getElementById('g-back-btn').addEventListener('click', () => {
    gameEngine = null;
    showScreen('screen-menu');
  });
  document.getElementById('g-end-back-btn').addEventListener('click', () => {
    document.getElementById('g-end-overlay').style.display = 'none';
    gameEngine = null;
    showScreen('screen-menu');
  });
  document.getElementById('g-end-rematch-btn').addEventListener('click', () => {
    document.getElementById('g-end-overlay').style.display = 'none';
    startGame();
  });

  // Color picker buttons
  ['red','green','blue','yellow'].forEach(color => {
    document.getElementById(`pick-${color}`)?.addEventListener('click', () => pickColor(color));
  });

  // Auto-login
  const saved = localStorage.getItem(SK_CURRENT);
  if (saved && loadPlayer(saved)) {
    loginUser(saved);
  } else {
    showScreen('screen-auth');
  }
});
