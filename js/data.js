// ================================================================
// ULTRAUNO - Complete Game Data
// 500 Cards | 100 Upgrades | 25 Cosmetics
// ================================================================

const RARITIES = {
  common:    { name: 'Common',    color: '#9ca3af', glow: '#9ca3af', bg: '#374151', weight: 60,  value: 5    },
  uncommon:  { name: 'Uncommon',  color: '#4ade80', glow: '#4ade80', bg: '#14532d', weight: 25,  value: 15   },
  rare:      { name: 'Rare',      color: '#60a5fa', glow: '#60a5fa', bg: '#1e3a5f', weight: 10,  value: 40   },
  epic:      { name: 'Epic',      color: '#a855f7', glow: '#a855f7', bg: '#3b0764', weight: 4,   value: 100  },
  legendary: { name: 'Legendary', color: '#f97316', glow: '#f97316', bg: '#431407', weight: 1,   value: 300  },
  mythic:    { name: 'Mythic',    color: '#ffd700', glow: '#ffd700', bg: '#1a0a00', weight: 0.1, value: 1000 },
};

const LOOTBOXES = [
  { level:1, name:'Starter Box',  cost:50,   cards:1, icon:'📦', color:'#6b7280', colorBg:'#1f2937',
    weights:{common:85,uncommon:13,rare:2,epic:0,legendary:0,mythic:0} },
  { level:2, name:'Bronze Box',   cost:150,  cards:2, icon:'🥉', color:'#cd7f32', colorBg:'#2d1f0f',
    weights:{common:65,uncommon:25,rare:9,epic:1,legendary:0,mythic:0} },
  { level:3, name:'Silber Box',   cost:300,  cards:3, icon:'🥈', color:'#c0c0c0', colorBg:'#1f2937',
    weights:{common:40,uncommon:35,rare:20,epic:4,legendary:1,mythic:0} },
  { level:4, name:'Gold Box',     cost:500,  cards:4, icon:'🥇', color:'#ffd700', colorBg:'#1c1600',
    weights:{common:20,uncommon:35,rare:30,epic:12,legendary:3,mythic:0} },
  { level:5, name:'Diamant Box',  cost:800,  cards:5, icon:'💎', color:'#00d4ff', colorBg:'#001a2c',
    weights:{common:5,uncommon:20,rare:40,epic:25,legendary:9,mythic:1} },
  { level:6, name:'Mythic Box',   cost:1500, cards:6, icon:'👑', color:'#ffd700', colorBg:'#0d0800',
    weights:{common:0,uncommon:10,rare:25,epic:35,legendary:25,mythic:5} },
];

const CARD_COLOR_STYLES = {
  red:    { bg:'#dc2626', bg2:'#991b1b', text:'#fff', name:'Rot' },
  green:  { bg:'#16a34a', bg2:'#14532d', text:'#fff', name:'Grün' },
  blue:   { bg:'#2563eb', bg2:'#1e3a8a', text:'#fff', name:'Blau' },
  yellow: { bg:'#ca8a04', bg2:'#713f12', text:'#fff', name:'Gelb' },
  gray:   { bg:'linear-gradient(135deg,#e11d48,#9333ea,#2563eb,#16a34a)', bg2:'#374151', text:'#fff', name:'Multi' },
  black:  { bg:'#1a1a2e', bg2:'#0d0d1a', text:'#e5e7eb', name:'Schwarz' },
};

// ================================================================
// CARD DATABASE - 500 Cards
// ================================================================
const ALL_CARDS = [];
let _cid = 1;

function C(name, color, type, rarity, effect, desc, symbol) {
  ALL_CARDS.push({ id: _cid++, name, color, type, rarity, effect, desc, symbol });
}

const COLORS = ['red','green','blue','yellow'];

// ─── 1. COMMON NUMBER CARDS (0-9 × 4 colors = 40) ───────────────
COLORS.forEach(c => {
  for (let n = 0; n <= 9; n++)
    C(`${n}`, c, 'number', 'common', null, 'Spiele auf gleiche Farbe oder Zahl.', `${n}`);
});

// ─── 2. UNCOMMON NUMBER CARDS "Powered" (×4 = 40) ───────────────
COLORS.forEach(c => {
  for (let n = 0; n <= 9; n++)
    C(`${n}✦`, c, 'number', 'uncommon', n===0?'shield':n===7?'extra_turn':null,
      n===0?'Blockt nächsten Angriff.':n===7?'Spiele nochmal.':'Wertvolle Zahlenkarte.', `${n}`);
});

// ─── 3. BASIC ACTION CARDS (3 × 4 × 2 = 24) ─────────────────────
COLORS.forEach(c => {
  for (let i=0;i<2;i++) {
    C('Skip',    c,'action','common','skip',   'Nächster verliert seinen Zug.','⊘');
    C('Reverse', c,'action','common','reverse','Dreht die Spielrichtung um.','↺');
    C('+2',      c,'action','common','draw:2', 'Nächster zieht 2 Karten.','+2');
  }
});

// ─── 4. WILD CARDS (2 × 4 = 8) ───────────────────────────────────
for (let i=0;i<4;i++) {
  C('Wild',   'gray','wild','uncommon','wild',       'Wähle jede Farbe.','★');
  C('Wild +4','gray','wild','uncommon','wild_draw:4','Wähle Farbe + Nächster zieht 4.','+4');
}

// ─── 5. UNCOMMON SPECIALS (25 × 4 = 100) ─────────────────────────
const UNCOMMON_SPEC = [
  ['+3',            'draw:3',       'Nächster zieht 3 Karten.',              '+3'],
  ['+5',            'draw:5',       'Nächster zieht 5 Karten.',              '+5'],
  ['Doppel-Skip',   'skip:2',       'Überspringt 2 Spieler.',                '⊘⊘'],
  ['Schild',        'shield',       'Blockt den nächsten Angriff.',          '🛡'],
  ['Echo',          'echo',         'Wiederholt den letzten Karteneffekt.',  '↩'],
  ['Blitz',         'extra_turn',   'Spiele nochmal.',                       '⚡'],
  ['Spiegel',       'reflect',      'Reflektiert nächsten Angriff.',         '⟲'],
  ['Späher',        'peek',         'Schau dir die Gegnerhand an.',          '👁'],
  ['Tauschkarte',   'swap_one',     'Tausche 1 Karte mit dem Gegner.',       '⇄'],
  ['Stille',        'silence',      'Nächster darf nicht ziehen.',           '🤫'],
  ['Sturm',         'all_draw:1',   'Alle anderen ziehen 1 Karte.',          '🌩'],
  ['Klon',          'clone',        'Kopiert die letzte Karte.',             '©'],
  ['Zeitwarp',      'extra_turn',   'Spiele diesen Zug erneut.',             '⏰'],
  ['Phase',         'phase',        'Ignoriert Farbzwang einmal.',           '◎'],
  ['Wirbel',        'shuffle_self', 'Mische deine Hand neu.',                '🌀'],
  ['Rückstoß',      'rev_draw:1',   'Reverse + Nächster zieht 1.',           '↺+'],
  ['Magnet',        'steal:1',      'Stehle 1 Karte vom Gegner.',            '🧲'],
  ['Frost',         'freeze:1',     'Gegner überspringt 1 Runde.',           '❄'],
  ['Funken',        'draw_play',    'Ziehe 1, spiele sofort weiter.',        '✦'],
  ['Anker',         'anchor',       'Verhindert Farbwechsel 1 Runde.',       '⚓'],
  ['Prism',         'prisma',       'Farbe wird zufällig gewählt.',          '◈'],
  ['Welle',         'chain_skip',   'Skip pflanzt sich fort.',               '〰'],
  ['Mülleimer',     'trash:1',      'Gegner wirft 1 Karte ab.',              '🗑'],
  ['Drang',         'force_play',   'Gegner muss Karte spielen.',            '!'],
  ['Farbwelle',     'color_wave',   'Alle Karten in Hand der Farbe.',        '🌊'],
];
UNCOMMON_SPEC.forEach(([n,e,d,s]) => COLORS.forEach(c => C(n,c,'action','uncommon',e,d,s)));

// ─── 6. RARE SPECIALS (20 × 4 = 80) ─────────────────────────────
const RARE_SPEC = [
  ['Mega-Skip',     'skip_all',     'Alle anderen Spieler überspringen.',    '⊘★'],
  ['Flut',          'draw:6',       'Nächster zieht 6 Karten.',              '+6'],
  ['Hand-Swap',     'hand_swap',    'Tausche Hände mit dem Gegner.',         '🤝'],
  ['Drain',         'steal:3',      'Stehle 3 Karten vom Gegner.',           '⬇3'],
  ['Konter',        'counter',      'Wirft Angriff auf den Angreifer.',      '⚔'],
  ['Nullify',       'nullify',      'Hebt den letzten Effekt auf.',          '∅'],
  ['Lawine',        'all_draw:2',   'Alle anderen ziehen 2 Karten.',         '❄❄'],
  ['Tornado',       'discard_opp:2','Gegner wirft 2 Karten zufällig ab.',    '🌪'],
  ['Doppelspiel',   'double_play',  'Spiele 2 Karten hintereinander.',       '2×'],
  ['Absorption',    'absorb',       'Nächste gezogene Karte sofort spielen.','⊕'],
  ['Kette',         'chain',        'Nächste Aktion wird verdoppelt.',       '⛓'],
  ['Überladung',    'overload',     'Du +1, Gegner +3 Karten.',              '⚡+3'],
  ['Umleitung',     'redirect',     'Leite Angriff auf nächsten Spieler.',   '↪'],
  ['Eisblock',      'freeze:2',     'Gegner friert für 2 Züge ein.',         '🧊'],
  ['Glut',          'ember',        'Lege 3 ab und ziehe 2 neue.',           '🔥🔥'],
  ['Sprung',        'leap',         'Überspringe 3 Karten im Stapel.',       '⟩⟩'],
  ['Echo-Burst',    'echo_burst',   'Letzter Effekt zählt doppelt.',         '↩↩'],
  ['Schockwelle',   'shockwave',    'Alle skippen + ziehen 1 Karte.',        '💥'],
  ['+8',            'draw:8',       'Nächster zieht 8 Karten.',              '+8'],
  ['Rückkehr',      'return_card',  'Spiele zuletzt abgelegte Karte.',       '↩★'],
];
RARE_SPEC.forEach(([n,e,d,s]) => COLORS.forEach(c => C(n,c,'action','rare',e,d,s)));

// ─── 7. EPIC SPECIALS (15 × 4 = 60) ─────────────────────────────
const EPIC_SPEC = [
  ['Apokalypse',    'all_draw:4',   'Alle anderen ziehen 4 Karten.',         '☄'],
  ['Zeitdieb',      'steal_turn',   'Stehle den Zug des Gegners.',           '⌛'],
  ['Tsunami',       'tsunami',      'Alle ziehen 3 + Alle skippen.',         '🌊🌊'],
  ['Gedächtnis',    'memory',       'Spiele eine Karte aus der Ablage.',     '📖'],
  ['Auflösung',     'dissolve',     'Hände halbieren + Gegner +3.',          '♒'],
  ['Nexus',         'nexus',        'Verbinde 2 Effekte dieser Runde.',      '✦'],
  ['Supernova',     'supernova',    'Alle Hände leeren + alle ziehen 5.',    '💫'],
  ['Vortex',        'vortex',       'Ziehe 4, spiele 2 davon.',              '🌀🌀'],
  ['Klinge',        'blade',        'Entferne 3 Karten aus Gegnerhand.',     '⚔⚔'],
  ['Impuls',        'impulse',      'Alle +1 Karte, du spielst wieder.',     '◉'],
  ['Resonanz',      'resonance',    'Gleicher Effekt wie letzte Karte.',     '〰〰'],
  ['Parasit',       'parasit',      'Sieh gesamte Gegnerhand.',              '🦠'],
  ['Blitzschlag',   'lightning',    'Zufälliger starker Effekt.',            '⚡⚡'],
  ['Abgrund',       'abyss',        'Verstecke 3 Karten bis Spielende.',     '🕳'],
  ['Quantensprung', 'quantum',      'Spiele auf absolut jede Karte.',        'Q'],
];
EPIC_SPEC.forEach(([n,e,d,s]) => COLORS.forEach(c => C(n,c,'action','epic',e,d,s)));

// ─── 8. LEGENDARY SPECIALS (10 × 4 = 40) ─────────────────────────
const LEG_SPEC = [
  ['Göttlicher Blitz','divine_lightning','Gegner zieht 8, überspringt 2 Runden.','⚡👑'],
  ['Weltenbrand',   'world_fire',   'Alle +5 Karten, Farbe wird Rot.',       '🌍🔥'],
  ['Zeitanker',     'time_anchor',  'Setze Spielzustand zurück.',            '⏳'],
  ['Seelentausch',  'soul_swap',    'Tausche Hände mit allen Spielern.',     '♻'],
  ['Omega-Skip',    'omega_skip',   'Alle skippen, du spielst wieder.',      '⊘∞'],
  ['Drachenatem',   'dragon_breath','Spiele bis zu 5 Karten auf einmal.',    '🐉'],
  ['Unsterblich',   'immortal',     'Angriffe können dich nicht treffen.',   '♾'],
  ['Schicksal',     'fate',         'Wähle eine Karte aus dem Stapel.',      '🎴'],
  ['Götterhand',    'god_hand',     'Ziehe 3, wähle aus 8 Karten.',         '👑'],
  ['Paradox',       'paradox',      'Reverse + Alle spielen eine Karte.',    '∞'],
];
LEG_SPEC.forEach(([n,e,d,s]) => COLORS.forEach(c => C(n,c,'action','legendary',e,d,s)));

// ─── 9. MORE LEGENDARY SPECIALS (9 × 4 = 36) ─────────────────────
const LEG_SPEC2 = [
  ['Drachenschwinge','dragon_wing', 'Spiele 4 Karten auf einmal.',           '🐉★'],
  ['Himmelssturm',  'heaven_storm', 'Alle +6 Karten + Reverse.',            '⛈👑'],
  ['Erdbrecher',    'earth_break',  'Gegner wirft 5 Karten ab.',             '🌍💥'],
  ['Feuerhagel',    'fire_hail',    'Alle +4 Karten + Skip.',               '🔥☄'],
  ['Nebelwand',     'fog_wall',     'Alle Karten verdeckt für 1 Runde.',     '🌫'],
  ['Mondlicht',     'moonlight',    'Ziehe 5 und wähle die besten 3.',       '🌙★'],
  ['Sonnenzorn',    'sun_wrath',    'Nächster +8 Karten + Reverse.',         '☀💥'],
  ['Sternfall',     'star_fall',    'Alle +2 + Alle skippen.',               '⭐💫'],
  ['Kosmischer Riss','cosmic_rift', 'Entferne alle Karten einer Farbe.',     '🌌✦'],
];
LEG_SPEC2.forEach(([n,e,d,s]) => COLORS.forEach(c => C(n,c,'action','legendary',e,d,s)));

// ─── 10. MYTHIC BLACK CARDS (20) ─────────────────────────────────
[
  ['Schwarzes Loch',   'black_hole',     'Alle Hände leeren + alle ziehen 7.','⚫'],
  ['Endzeit',          'endgame',        'Wer am meisten Karten hat, verliert.','☠'],
  ['Schöpfung',        'creation',       'Erstelle 3 Zufallskarten in Hand.', '✨'],
  ['Venom',            'venom',          'Gegner +1 Karte/Runde für 3 Runden.','🐍'],
  ['Dunkle Materie',   'dark_matter',    'Alle Karten werden schwarz.',        '⬛'],
  ['Omega-Karte',      'omega',          'Spiele auf alles, Nächster +10.',    'Ω'],
  ['Infinity',         'infinity_draw',  'Ziehe Karten bis du willst.',        '∞'],
  ['Kollaps',          'collapse',       'Alle Hände werden gemischt.',        '💀'],
  ['Auferstehung',     'resurrection',   'Spiele abgelegte Karte erneut.',     '✝'],
  ['Entscheidung',     'decision',       'Wähle aus 5 verschiedenen Effekten.','?'],
  ['Dämonenpakt',      'demon_pact',     'Gegner +6, du ziehst 3 + Extra-Zug.','😈'],
  ['Götterurteil',     'gods_judgment',  'Zufälliger Spieler verliert Karten.','⚖'],
  ['Leere',            'void_field',     'Entferne 5 Karten aus dem Spiel.',   '○'],
  ['Matrixbruch',      'matrix_break',   'Alle Regeln ignoriert für 1 Runde.','🔮'],
  ['Urknall',          'big_bang',       'Alle Hände auf 1 Karte reduziert.', '💥💥'],
  ['Zeitkollaps',      'time_collapse',  'Alle Spieler skippen 2 Runden.',     '⌚💀'],
  ['Hyper-Wild',       'hyper_wild',     'Wild + Nächster +6 + Skip.',         '★★★'],
  ['Nullfeld',         'null_field',     'Kein Effekt für 2 Runden möglich.', '⊗'],
  ['Apotheose',        'apotheosis',     'Gewinne sofort beim nächsten Zug.',  '👼'],
  ['Drachenseele',     'dragon_soul',    'Spiele 3 Karten, Gegner +5.',        '🐉💀'],
].forEach(([n,e,d,s]) => C(n,'black','action','mythic',e,d,s));

// ─── 11. UNCOMMON/RARE/EPIC BLACK CARDS (20) ─────────────────────
[
  ['Dunkler Skip',     'skip',         'uncommon','Überspringt nächsten Spieler.',    '⬛⊘'],
  ['Dunkles +2',       'draw:2',       'uncommon','Nächster zieht 2 Karten.',         '⬛+2'],
  ['Dunkel-Reverse',   'reverse',      'uncommon','Dreht die Spielrichtung um.',       '⬛↺'],
  ['Dunkles +4',       'draw:4',       'uncommon','Nächster zieht 4 Karten.',         '⬛+4'],
  ['Dunkler Spiegel',  'reflect',      'rare',    'Reflektiert den nächsten Angriff.','⬛⟲'],
  ['Nacht-Schild',     'shield',       'rare',    'Blockt den nächsten Angriff.',     '⬛🛡'],
  ['Dunkles Echo',     'echo',         'rare',    'Wiederholt letzten Effekt.',       '⬛↩'],
  ['Nacht-Tausch',     'hand_swap',    'epic',    'Tausche Hände mit dem Gegner.',    '⬛🤝'],
  ['Dunkler Frost',    'freeze:2',     'rare',    'Gegner friert für 2 Züge.',        '⬛❄'],
  ['Schattensturm',    'all_draw:3',   'epic',    'Alle anderen ziehen 3 Karten.',    '⬛🌩'],
  ['Dunkler Blitz',    'lightning',    'epic',    'Zufälliger starker Effekt.',       '⬛⚡'],
  ['Nacht-Nexus',      'nexus',        'legendary','Verbinde 2 Effekte dieser Runde.','⬛✦'],
  ['Schatten-Drain',   'steal:3',      'rare',    'Stehle 3 Karten vom Gegner.',      '⬛🧲'],
  ['Dunkler Konter',   'counter',      'rare',    'Wirft Angriff auf den Angreifer.', '⬛⚔'],
  ['Nacht-Zeitwarp',   'extra_turn',   'uncommon','Spiele nochmal.',                  '⬛⏰'],
  ['Schatten-Phase',   'phase',        'uncommon','Ignoriere Farbzwang einmal.',      '⬛◎'],
  ['Dunkle Welle',     'chain_skip',   'uncommon','Skip pflanzt sich fort.',          '⬛〰'],
  ['Nacht-Klon',       'clone',        'uncommon','Kopiert letzte Karte.',            '⬛©'],
  ['Dunkel-Supernova', 'supernova',    'legendary','Alle Hände leeren + alle +5.',    '⬛💫'],
  ['Schatten-Omega',   'omega_skip',   'legendary','Alle skippen, du spielst wieder.','⬛⊘∞'],
].forEach(([n,e,r,d,s]) => C(n,'black','action',r,e,d,s));

// ─── 12. GRAY MULTICOLOR WILDS (32) ──────────────────────────────
[
  ['Regenbogen Skip',  'wild_skip',      'uncommon','Farbe wählen + Nächster überspringt.','🌈⊘'],
  ['Wilder Sturm',     'wild_draw:3',    'rare',    'Farbe wählen + Nächster zieht 3.',    '🌈+3'],
  ['Buntes Chaos',     'wild_all_draw:2','rare',    'Farbe wählen + Alle anderen +2.',      '🌈×2'],
  ['Prisma',           'wild_random',    'uncommon','Zufällige Farbe, Gegner +2.',          '◈🌈'],
  ['Farbwelle',        'wild_reverse',   'uncommon','Farbe wählen + Reverse.',             '🌈↺'],
  ['Regenbogen +6',    'wild_draw:6',    'epic',    'Farbe wählen + Nächster +6.',          '🌈+6'],
  ['Bunter Tausch',    'wild_hand_swap', 'epic',    'Farbe wählen + Hände tauschen.',       '🌈⇄'],
  ['Superwild',        'super_wild',     'legendary','Farbe + Effekt selbst wählen.',       '⭐🌈'],
  ['Chrono-Wild',      'chrono_wild',    'rare',    'Farbe wählen + Extra-Zug.',            '⏰🌈'],
  ['Farbkopie',        'wild_clone',     'rare',    'Kopiere letzte Farbe + Effekt.',       '©🌈'],
  ['Bunter Einschlag', 'wild_meteor',    'epic',    'Alle anderen +3, Farbe frei.',         '☄🌈'],
  ['Ultimater Wild',   'ultimate_wild',  'legendary','Spiele auf alles + Alle +1.',         '★🌈'],
  ['Wild Schild',      'wild_shield',    'rare',    'Farbe wählen + Schild aktivieren.',    '🛡🌈'],
  ['Wild Freeze',      'wild_freeze:2',  'epic',    'Farbe wählen + Gegner friert.',        '❄🌈'],
  ['Wild Drain',       'wild_steal:2',   'epic',    'Farbe wählen + Stehle 2 Karten.',     '🧲🌈'],
  ['Regenbogen +8',    'wild_draw:8',    'legendary','Farbe wählen + Nächster +8.',         '🌈+8'],
  ['Regenbogen Echo',  'wild_echo',      'rare',    'Farbe wählen + letzter Effekt.',       '↩🌈'],
  ['Regenbogen Burst', 'wild_burst',     'epic',    'Alle skippen + Farbe wählen.',         '💥🌈'],
  ['Wild Feuer',       'wild',           'uncommon','Wähle jede Farbe.',                    '🔥🌈'],
  ['Wild Eis',         'wild',           'uncommon','Wähle jede Farbe.',                    '❄🌈'],
  ['Wild Donner',      'wild',           'uncommon','Wähle jede Farbe.',                    '⚡🌈'],
  ['Wild Erde',        'wild',           'uncommon','Wähle jede Farbe.',                    '🌍🌈'],
  ['Wild Wasser',      'wild',           'rare',    'Wähle jede Farbe.',                    '💧🌈'],
  ['Wild Wind',        'wild',           'rare',    'Wähle jede Farbe.',                    '🌬🌈'],
  ['Wild Licht',       'wild',           'rare',    'Wähle jede Farbe.',                    '☀🌈'],
  ['Wild Schatten',    'wild',           'rare',    'Wähle jede Farbe.',                    '🌑🌈'],
  ['Wild Stern',       'wild',           'epic',    'Wähle jede Farbe.',                    '⭐🌈'],
  ['Wild Mond',        'wild',           'epic',    'Wähle jede Farbe.',                    '🌙🌈'],
  ['Wild Sonne',       'wild',           'epic',    'Wähle jede Farbe.',                    '🌞🌈'],
  ['Wild Galaxie',     'wild',           'legendary','Wähle jede Farbe.',                   '🌌🌈'],
  ['Hyperbow',         'hyper_wild',     'mythic',  'Wild + Nächster +10 + Skip.',          '🌈★★'],
  ['Omega-Wild',       'omega',          'mythic',  'Spiele auf alles. Alle +5.',            '🌈Ω'],
].forEach(([n,e,r,d,s]) => C(n,'gray','wild',r,e,d,s));

// Verify card count
console.log(`[DATA] Karten geladen: ${ALL_CARDS.length}`);

// ================================================================
// UPGRADE DATABASE - 100 Upgrades
// ================================================================
const ALL_UPGRADES = [];
let _uid = 1;

function U(name, type, rarity, desc, effect, icon) {
  ALL_UPGRADES.push({ id: _uid++, name, type, rarity, desc, effect, icon });
  // type: 'active' (manual) or 'auto' (auto-triggers)
}

// ACTIVE UPGRADES (50) - manually triggered once per game
U('Kampfschrei',       'active','common',   'Ziehe sofort 3 Karten.',            'draw_self:3',     '💪');
U('Eisenwand',         'active','common',   'Erhalte 3 Schutzschilde.',          'gain_shield:3',   '🧱');
U('Hinterhalt',        'active','uncommon', 'Gegner überspringt + zieht 2.',     'atk:skip_draw2',  '🗡');
U('Zeitstopp',         'active','uncommon', 'Alle Gegner skippen 1 Runde.',      'skip_all',        '⏸');
U('Seelentausch',      'active','rare',     'Tausche Hände mit Gegner.',         'hand_swap',       '🔄');
U('Kartensturm',       'active','common',   'Ziehe 5, lege 2 ab.',              'draw5_discard2',  '🌩');
U('Fokusschlag',       'active','rare',     'Gegner muss 4 Karten ziehen.',      'atk:draw4',       '🎯');
U('Guardian',          'active','rare',     'Blockiere nächste 3 Angriffe.',     'shield:3',        '🛡');
U('Schattenritt',      'active','epic',     'Ignoriere Farbregeln 2 Züge.',      'phase:2',         '🌑');
U('Wilder Rausch',     'active','epic',     '3 Wild-Karten in Hand hinzufügen.','add_wilds:3',     '★');
U('Massenablass',      'active','epic',     'Stehle 2 Karten von jedem Gegner.','steal_all:2',     '💸');
U('Überlastung',       'active','uncommon', 'Nächste Karte doppelter Effekt.',   'double_next',     '⚡');
U('Kettenblitz',       'active','rare',     'Alle Spieler ziehen 2 Karten.',     'all_draw:2',      '⛓');
U('Disruption',        'active','uncommon', 'Gegner wirft 3 Karten ab.',         'discard_opp:3',   '💥');
U('Schnellschuss',     'active','common',   'Ziehe 2, spiele 1 davon sofort.',   'quick_draw',      '🏹');
U('Nullschlag',        'active','rare',     'Hebe letzte Aktion des Gegners auf.','nullify',        '∅');
U('Rücklauf',          'active','uncommon', 'Hole 3 abgelegte Karten zurück.',   'reclaim:3',       '⏪');
U('Manastoß',          'active','epic',     'Spiele 3 Karten in diesem Zug.',    'multi_play:3',    '🔮');
U('Leerenklinge',      'active','legendary','Entferne 4 Gegnerkarten aus Spiel.','void_opp:4',      '⚔');
U('Phönixflug',        'active','legendary','Ziehe sofort 7 Karten.',            'draw_self:7',     '🦅');
U('Eisstrahl',         'active','rare',     'Gegner friert für 3 Züge ein.',     'freeze:3',        '🧊');
U('Giftwolke',         'active','epic',     'Gegner zieht 1/Runde für 4 Runden.','poison:4',       '☠');
U('Spiegelschild',     'active','epic',     'Reflektiere nächste 2 Angriffe.',   'reflect:2',       '🪞');
U('Furor',             'active','rare',     'Ziehe 6, überspringe nächsten.',    'draw6_skip',      '😤');
U('Omega-Schlag',      'active','legendary','Gegner verliert halbe Hand.',       'halve_opp',       'Ω');
U('Abrechnung',        'active','uncommon', 'Ziehe 4, Gegner +6.',               'reckoning',       '⚖');
U('Finsternis',        'active','epic',     'Alle Effekte deaktiviert 1 Runde.', 'eclipse',         '🌑');
U('Heiliges Land',     'active','legendary','Immun gegen alle Effekte 2 Züge.', 'immune:2',         '✝');
U('Dunkler Pakt',      'active','legendary','Gegner +5, du +4 + Extra-Zug.',    'dark_pact',        '😈');
U('Chaos-Theorie',     'active','legendary','Zufälliger super-mächtiger Effekt.','random_power',    '🎲');
U('Konvergenz',        'active','rare',     'Alle Spieler ziehen auf 7 Karten.','converge:7',       '🌀');
U('Wellenbrecher',     'active','uncommon', 'Hebe alle Zieh-Effekte auf.',       'negate_draws',    '🌊');
U('Stille Nacht',      'active','rare',     'Keine Effekte für 2 Runden.',       'null_field:2',    '🌙');
U('Kraftfeld',         'active','legendary','Blockiere nächste 5 Angriffe.',     'shield:5',        '🔵');
U('Kettenreaktion',    'active','epic',     'Alle deine Effekte doppelt.',       'chain_all',        '⛓⛓');
U('Temporaler Fluss',  'active','rare',     'Alle Spieler verlieren 2 Karten.', 'all_discard:2',    '⌛');
U('Aegis',             'active','legendary','Immun gegen Skip + Ziehen 3 Züge.','aegis:3',          '🛡🛡');
U('Kampfgehärtet',     'active','epic',     'Ziehe 8, Gegner +4 Karten.',       'battle_hard',      '⚔🛡');
U('Aufstieg',          'active','legendary','Nächste 3 Karten doppelt wirksam.','ascend:3',         '⬆');
U('Abysstor',          'active','mythic',   'Entferne 7 Gegnerkarten.',          'void_opp:7',       '🕳');
U('Kosmischer Segen',  'active','mythic',   'Ziehe 5 + spiele nochmal.',         'draw5_retake',    '🌟');
U('Dimensionsriss',    'active','mythic',   'Tausche alle Hände zufällig.',      'all_swap',         '🌌');
U('Realitätsbruch',    'active','mythic',   'Alle Regeln pausiert 2 Runden.',    'reality_break',   '🔮');
U('Schicksalszug',     'active','mythic',   'Ziehe 10, behalte die besten 5.',  'fate_draw',        '🎴');
U('Perfekter Sturm',   'active','mythic',   'Alle Gegner ziehen 6 Karten.',      'all_draw:6',       '⛈');
U('Gottmodus',         'active','mythic',   'Gewinne sofort, falls möglich.',    'check_win',        '👑');
U('Singularität',      'active','mythic',   'Alle Karten in einen Mega-Stapel.', 'merge_decks',      '●');
U('Zeitwirbel',        'active','epic',     'Spiele nochmal + Gegner überspringt.','extra_skip_opp','⏩');
U('Raserei',           'active','rare',     'Deine Karten ohne Farbzwang 1 Runde.','free_round',    '😡');
U('Letztes Wort',      'active','epic',     'Nullifiziere alles diesen Zug.',    'full_null',        '🔕');

// AUTO UPGRADES (50) - auto-activate once per game
U('Letzter Stand',     'auto', 'uncommon', 'Bei ≤2 Karten: ziehe sofort 3.',     'auto_low_draw:3',  '⚠');
U('Rache',             'auto', 'rare',     'Angegriffen: Angriff +2 zurück.',     'auto_revenge',     '🔁');
U('Glücksstern',       'auto', 'uncommon', 'Beim Ziehen: 20% Chance, Skip.',      'auto_lucky',       '⭐');
U('Eisernes Herz',     'auto', 'rare',     'Erstes Verlieren: überlebst mit 1.',  'auto_survive',     '❤');
U('Reflexe',           'auto', 'rare',     'Wenn übersprungen: ziehe 2 + Cancel.','auto_reflex',      '⚡');
U('Ressourcenpool',    'auto', 'common',   'Spielbeginn: ziehe 2 Extra.',        'auto_start_draw:2','📦');
U('Jäger',             'auto', 'rare',     'Gegner ≤3 Karten: Extra-Skip.',      'auto_hunter',      '🏹');
U('Blutdurst',         'auto', 'epic',     '3 hintereinander: ziehe 2 Bonus.',   'auto_streak',      '🩸');
U('Belastbarkeit',     'auto', 'uncommon', 'Hand >8: entsorge 2 schwächste.',    'auto_trim',        '✂');
U('Taktiker',          'auto', 'rare',     'Dein Zug: sieh 1 Gegnerkarte.',      'auto_peek',        '🧠');
U('Zweiter Wind',      'auto', 'uncommon', 'Stapel leer: ziehe 3 Bonus.',        'auto_reshuffle',   '🌬');
U('Momentum',          'auto', 'rare',     'Skip gewonnen: ziehe 1 Bonus.',      'auto_momentum',    '🏃');
U('Effizienz',         'auto', 'uncommon', 'UNO-Moment: Schild aktiviert.',      'auto_uno_shield',  '🔰');
U('Stärke',            'auto', 'epic',     'Bekommst ≥4 Zieh-Karten: -2 davon.','auto_resist',      '💪');
U('Weitblick',         'auto', 'rare',     'Spielbeginn: sieh Top 3 Stapel.',    'auto_insight',     '🔭');
U('Gegenmittel',       'auto', 'epic',     'Wild +4 gegen dich: aufgehoben.',    'auto_anti_w4',     '🧪');
U('Präventivschlag',   'auto', 'epic',     'Gegner spielt Skip: geht zurück.',   'auto_preempt',     '🛡⚔');
U('Ausdauer',          'auto', 'uncommon', 'Nach 10 Runden: ziehe 3 Bonus.',     'auto_endurance',   '🏅');
U('Synergie',          'auto', 'rare',     '2 gleiche Effekte: Bonus-Skip.',     'auto_synergy',     '🔗');
U('Flowstate',         'auto', 'epic',     '5 hintereinander: Extra-Zug.',       'auto_flow',        '🌊');
U('Empathie',          'auto', 'uncommon', 'Gegner zieht ≥4: du ziehst 2.',      'auto_empathy',     '💙');
U('Adaptiv',           'auto', 'rare',     'Erste 5 Züge: immun gegen Zwangsziehen.','auto_adapt',  '🔄');
U('Überspannungsschutz','auto','epic',     'Kettenziehen >6: auf Hälfte reduz.', 'auto_cap',         '⚡🛡');
U('Kampfmeditation',   'auto', 'uncommon', 'Alle 5 Züge: ziehe 1 Bonus.',        'auto_meditate',    '🧘');
U('Übertakten',        'auto', 'epic',     'Erste 3 Züge: spiele 2 pro Zug.',    'auto_overclock',   '⚙');
U('Wiedergeburt',      'auto', 'rare',     'Verlieren nah: Extra-Karten.',       'auto_rebirth',     '🔄');
U('Karma',             'auto', 'uncommon', 'Gegner spielt Wild: stehle 1.',      'auto_karma',       '☯');
U('Voraussicht',       'auto', 'rare',     'Start: arrangiere Top 3 Stapel.',    'auto_foresight',   '🔮');
U('Unaufhaltsam',      'auto', 'epic',     'Bei 1 Karte: 1 Runde immun.',        'auto_unstoppable', '🚀');
U('Konvergenzfeld',    'auto', 'epic',     'Alle gleich Karten: Extra-Stapel.',  'auto_convergence', '🌀');
U('Vorhut',            'auto', 'uncommon', 'Erste Karte jedes Zuges: gratis.',   'auto_vanguard',    '⚔');
U('Gezeitenwandler',   'auto', 'epic',     'Verlierend um 5+: stehle 2.',        'auto_tide',        '🌊⚡');
U('Glaskanone',        'auto', 'rare',     'Hand ≤3: Effekte doppelt.',          'auto_glass',       '💎');
U('Taktgefühl',        'auto', 'epic',     '3 Skips hintereinander: Immunität.', 'auto_tactical',    '🛡');
U('Arsenal',           'auto', 'uncommon', 'Spielbeginn: starte mit 5 statt 7.', 'auto_arsenal',     '📋');
U('Kombo-Meister',     'auto', 'legendary','4 hintereinander: Bonus-Wild.',      'auto_combo',       '🏆');
U('Anker',             'auto', 'rare',     'Gegner Tausch: widersetze dich.',    'auto_anchor',      '⚓');
U('Phönix-Protokoll',  'auto', 'uncommon', 'Stapel leer: Auto-Mischung + Bonus.','auto_phoenix',    '🦅');
U('Energieschild',     'auto', 'rare',     'Erste 3 Züge: blockiere Ziehkarten.','auto_eshield',    '🔋');
U('Dominanz',          'auto', 'epic',     'Führend um 5+: Bonus-Skip.',         'auto_dominance',   '👑');
U('Geduld',            'auto', 'uncommon', 'Nach 8 Zügen ohne Spezial: +3.',     'auto_patience',    '⌛');
U('Leuchtfeuer',       'auto', 'rare',     'Hand >6: eine Karte wird Wild.',     'auto_beacon',      '🔦');
U('Überlebender',      'auto', 'uncommon', 'Hand >10: behalte nur die besten 7.','auto_survivor',   '🏃');
U('Meisterschuss',     'auto', 'epic',     'Letzte Karte: erhält +Effekt.',      'auto_finalcard',   '🎯');
U('Arkaner Boost',     'auto', 'legendary','Nach Legendary+: Effekt kopieren.',  'auto_arcane',      '✨');
U('Temporale Schleife','auto', 'epic',     'Runde 20+: Ablagen zurück mischen.', 'auto_loop',        '♾');
U('Symbiose',          'auto', 'legendary','Alle aktiven Upgrades nochmal.',      'auto_symbiosis',   '🌱');
U('Nexus-Kern',        'auto', 'legendary','Auto-Upgrades lösen 2× aus.',        'auto_nexus',       '💠');
U('Erwachen',          'auto', 'legendary','Runde 15: alle Upgrades reset.',      'auto_awakening',   '☀');
U('Omnipotenz',        'auto', 'mythic',   'Einmal: 1 Runde vollständig immun.', 'auto_omni',        '∞');

console.log(`[DATA] Upgrades geladen: ${ALL_UPGRADES.length}`);

// ================================================================
// COSMETICS DATABASE - 25 Items
// ================================================================
const ALL_COSMETICS = [];
let _cosid = 1;

function COS(name, category, rarity, desc, cost, preview, unlocked) {
  ALL_COSMETICS.push({ id: _cosid++, name, category, rarity, desc, cost, preview, unlocked: unlocked||false });
}

// CARD BACKS (10)
COS('Klassisch',       'cardback','common',   'Das Standard-Kartendeck.',       0,    '🟦', true);
COS('Drachenschuppe',  'cardback','rare',     'Rote Drachenschuppen-Textur.',   500,  '🔴');
COS('Galaxis',         'cardback','epic',     'Lila Weltraum-Hintergrund.',     1000, '🟣');
COS('Waldgeflüster',   'cardback','uncommon', 'Tiefgrüner Wald-Look.',          300,  '🟢');
COS('Tiefenblau',      'cardback','rare',     'Ozeanisches Blau.',              500,  '🔵');
COS('Flammenherz',     'cardback','epic',     'Rote Flammen-Optik.',            1000, '🔶');
COS('Eiskristall',     'cardback','rare',     'Kristallklare Eisstruktur.',     600,  '🩵');
COS('Dampfpunk',       'cardback','epic',     'Steampunk Kupfer & Zahnräder.',  1200, '⚙');
COS('Neon-Grid',       'cardback','legendary','Leuchtendes Cyan-Neon-Raster.',  2000, '💙');
COS('Schwarzes Gold',  'cardback','legendary','Schwarz-Gold Luxus-Design.',     2500, '🟡');

// AVATARS (6)
COS('Standard',        'avatar','common',    'Standard grauer Avatar.',         0,    '👤', true);
COS('Ritter',          'avatar','uncommon',  'Blauer Schutzritter.',            200,  '⚔');
COS('Zauberer',        'avatar','rare',      'Violetter Magiemeister.',         500,  '🧙');
COS('Drache',          'avatar','epic',      'Mächtiger roter Drache.',         1000, '🐉');
COS('Phönix',          'avatar','legendary', 'Unsterblicher goldener Phönix.',  2000, '🦅');
COS('Roboter',         'avatar','rare',      'Cyan Cyber-Roboter.',             600,  '🤖');

// TABLE THEMES (5)
COS('Klassischer Tisch','theme','common',    'Standard-Spieltisch.',             0,    '🟩', true);
COS('Neon-Club',        'theme','epic',      'Lila/Cyan Neon-Atmosphäre.',      1500, '💜');
COS('Dunkler Wald',     'theme','rare',      'Mystischer dunkler Wald.',        800,  '🌲');
COS('Kosmischer Raum',  'theme','legendary', 'Tiefschwarz mit Sternen.',        2500, '🌌');
COS('Tiefsee',          'theme','epic',      'Unterwasser Ozean Atmosphäre.',   1200, '🌊');

// WIN ANIMATIONS (4)
COS('Standard Sieg',    'winanim','common',  'Standard Konfetti.',               0,    '🎉', true);
COS('Feuerwerk',        'winanim','uncommon','Buntes Feuerwerk.',                400,  '🎆');
COS('Blitzsturm',       'winanim','rare',    'Elektrischer Lichtsturm.',         800,  '⚡');
COS('Sternregen',       'winanim','epic',    'Goldener Sternenregen.',           1500, '⭐');

console.log(`[DATA] Kosmetika geladen: ${ALL_COSMETICS.length}`);

// ================================================================
// HELPER FUNCTIONS
// ================================================================

function weightedRarityRoll(weights) {
  const total = Object.values(weights).reduce((a,b)=>a+b,0);
  let r = Math.random() * total;
  for (const [rarity, w] of Object.entries(weights)) {
    r -= w;
    if (r <= 0) return rarity;
  }
  return 'common';
}

function rollLootbox(box) {
  const result = { cards: [], upgrade: null };
  // Roll cards
  for (let i = 0; i < box.cards; i++) {
    const rarity = weightedRarityRoll(box.weights);
    const pool = ALL_CARDS.filter(c => c.rarity === rarity);
    if (pool.length > 0) {
      result.cards.push(pool[Math.floor(Math.random() * pool.length)]);
    }
  }
  // Roll upgrade card (biased toward rarity of box)
  const upgradeRarity = weightedRarityRoll(box.weights);
  const upgradePool = ALL_UPGRADES.filter(u => u.rarity === upgradeRarity);
  const fallbackPool = ALL_UPGRADES;
  const pool = upgradePool.length > 0 ? upgradePool : fallbackPool;
  result.upgrade = pool[Math.floor(Math.random() * pool.length)];
  return result;
}

function getCardById(id) { return ALL_CARDS.find(c => c.id === id); }
function getUpgradeById(id) { return ALL_UPGRADES.find(u => u.id === id); }
function getCosmeticById(id) { return ALL_COSMETICS.find(c => c.id === id); }

// Starting cards: ALL number cards (ids 1-40)
const STARTING_CARD_IDS = ALL_CARDS.filter(c => c.type==='number' && c.rarity==='common').map(c=>c.id);
