#!/usr/bin/env node
/** One-shot builder for v1.2 guides + database entities. */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DATA = path.join(ROOT, 'data');
const DB = path.join(DATA, 'database');

function loadJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}
function saveJson(p, obj) {
  fs.writeFileSync(p, JSON.stringify(obj, null, 2) + '\n', 'utf8');
}
function mergeEntities(file, additions) {
  const j = loadJson(file);
  Object.assign(j.entities, additions);
  saveJson(file, j);
  return Object.keys(additions).length;
}

// ── New database entities ──────────────────────────────────────────

const newMaps = {
  forest_east_henesys: {
    name: 'Forest East of Henesys',
    aliases: ['Victoria Road Forest East of Henesys', 'Forest East of Henesys'],
    region: 'victoria_island',
    connections: ['map:henesys'],
    recommendedLevel: [30, 35],
    notes: 'Test de 2nd job Page — [[item:black_crystal]] de [[mob:dark_axe_stump]] ([[quest:page_second_job]]).',
  },
  sleepywood_forest: {
    name: 'Sleepywood Forest',
    aliases: ['Sleepywood', 'The Forest of Patience', 'Sleepywood Forest'],
    region: 'victoria_island',
    connections: ['map:henesys'],
    recommendedLevel: [70, 75],
    notes: 'Door of Dimension del 3rd job Page ([[quest:white_knight_third_job]]).',
  },
  ludibrium: {
    name: 'Ludibrium',
    aliases: ['Ludi', 'Ludibrium Town', 'Ludibrium City'],
    region: 'ludus_lake',
    connections: ['map:ludi_pq', 'map:ludi_labyrinth', 'map:papulatus_altar'],
    recommendedLevel: null,
    notes: 'Hub de Ludus Lake — [[npc:elin]] (LPQ), [[npc:rios]] (Papulatus prequest).',
  },
  ludi_labyrinth: {
    name: 'Ludibrium Labyrinth',
    aliases: ['Labyrinth', 'Ludibrium Labyrinth', 'Ludi Labyrinth'],
    region: 'ludus_lake',
    connections: ['map:ludibrium'],
    recommendedLevel: [70, 90],
    notes: 'Recolectar [[item:lost_time_piece]] para [[quest:papulatus_prequest]].',
  },
  papulatus_altar: {
    name: "Papulatus' Altar",
    aliases: ['Papulatus Altar', "Papulatus' Altar", 'Clock Tower Top'],
    region: 'ludus_lake',
    connections: ['map:ludibrium'],
    recommendedLevel: [115, 130],
    notes: 'Arena de [[boss:papulatus]]. Requiere [[item:papulatus_ticket]].',
  },
  pink_bean_altar: {
    name: "Pink Bean's Altar",
    aliases: ['Pink Bean Altar', "Pink Bean's Altar", 'PB Altar'],
    region: 'zipangu',
    connections: ['map:mushroom_shrine'],
    recommendedLevel: [120, 140],
    notes: 'Arena de [[boss:pink_bean]]. Requiere [[item:pink_bean_ticket]].',
  },
  new_leaf_city: {
    name: 'New Leaf City',
    aliases: ['NLC', 'New Leaf City', 'Masteria NLC'],
    region: 'masteria',
    connections: [],
    recommendedLevel: null,
    notes: 'Ciudad de Masteria — acceso vía [[npc:spinel]] desde cualquier hub mayor.',
  },
  fire_turtle_area: {
    name: 'Fire Turtle Area',
    aliases: ['Fire Turtles', 'Fire Turtle Map', 'Mysterious Path Fire Turtles'],
    region: 'ludus_lake',
    connections: ['map:mysterious_path_3'],
    recommendedLevel: [55, 70],
    notes: 'Alternativa 55-70 para magos IL — [[mob:fire_turtle]].',
  },
};

const newNpcs = {
  lakis: {
    name: 'Lakis',
    map: 'map:kerning_city',
    position: 'Near Kerning PQ portal (Construction Site area)',
    shop: null,
    roles: ['quest'],
  },
  elin: {
    name: 'Elin',
    map: 'map:ludibrium',
    position: 'Ludibrium Party Quest entrance',
    shop: null,
    roles: ['quest'],
  },
  rios: {
    name: 'Rios',
    map: 'map:ludibrium',
    position: 'Ludibrium Clock Tower (near Labyrinth)',
    shop: null,
    roles: ['quest'],
  },
  pato: {
    name: 'Pato',
    map: 'map:mushroom_shrine',
    position: 'Mushroom Shrine (near entrance)',
    shop: null,
    roles: ['quest'],
  },
  spinel: {
    name: 'Spinel',
    map: 'map:henesys',
    position: 'Near town exit (also in Ellinia, Kerning, Perion, Leafre)',
    shop: null,
    roles: ['transport'],
  },
};

const newItems = {
  lost_time_piece: {
    name: 'Lost Time Piece',
    type: 'etc',
    use: '20 requeridos en [[quest:papulatus_prequest]] — drops en [[map:ludi_labyrinth]].',
    soldBy: [],
  },
  papulatus_ticket: {
    name: 'Papulatus Ticket',
    type: 'quest',
    use: 'Ticket de entrada a [[map:papulatus_altar]] — recompensa de [[quest:papulatus_prequest]].',
    soldBy: [],
  },
  squishy_liquid: {
    name: 'Squishy Liquid',
    type: 'etc',
    use: '50 requeridos en [[quest:pink_bean_prequest]] — drops de mobs en [[map:mushroom_shrine]].',
    soldBy: [],
  },
  pink_bean_ticket: {
    name: 'Pink Bean Ticket',
    type: 'quest',
    use: 'Ticket de entrada a [[map:pink_bean_altar]] — recompensa de [[quest:pink_bean_prequest]].',
    soldBy: [],
  },
};

const newMonsters = {
  fire_turtle: {
    name: 'Fire Turtle',
    level: 62,
    hp: 6200,
    exp: 250,
    maps: ['map:fire_turtle_area', 'map:mysterious_path_3'],
    drops: [],
  },
  lorang: {
    name: 'Lorang',
    level: 38,
    hp: 1800,
    exp: 90,
    maps: ['map:ludi_labyrinth'],
    drops: [{ item: 'item:lost_time_piece' }],
  },
};

const newBosses = {
  papulatus: {
    name: 'Papulatus',
    map: 'map:papulatus_altar',
    requirements: { level: 115 },
    recommendedLevel: 120,
    prequests: ['quest:papulatus_prequest'],
    partySize: [6, 6],
    entries: { perDay: null, consumes: 'item:papulatus_ticket' },
    drops: [],
  },
  pink_bean: {
    name: 'Pink Bean',
    map: 'map:pink_bean_altar',
    requirements: { level: 120 },
    recommendedLevel: 130,
    prequests: ['quest:pink_bean_prequest'],
    partySize: [6, 12],
    entries: { perDay: null, consumes: 'item:pink_bean_ticket' },
    drops: [],
  },
};

const newTraining = {
  fire_turtle_area: {
    levelRange: [55, 70],
    maps: ['map:fire_turtle_area'],
    monsters: ['mob:fire_turtle'],
    jobs: ['magician'],
    notes: 'Fire Turtles (55-70 alternative for IL mages). [[mob:fire_turtle]].',
  },
  forest_east_henesys: {
    levelRange: [30, 35],
    maps: ['map:forest_east_henesys'],
    monsters: ['mob:dark_axe_stump'],
    jobs: ['warrior'],
    notes: 'Page 2nd job test area — [[mob:dark_axe_stump]].',
  },
};

// Quest entities (abbreviated steps — full in file)
const newQuests = {
  cleric_second_job: {
    name: '2nd Job — Cleric',
    requirements: { level: 30, job: 'magician', quests: ['quest:magician_first_job'] },
    startNpc: 'npc:gwin',
    endNpc: 'npc:gwin',
    steps: [
      'Habla con [[npc:gwin]] en [[map:ellinia]] y recibe la test quest.',
      'Entra a [[map:golem_temple]] — Victoria Road.',
      'Junta 30 [[item:black_charm|Black Charms]] de [[mob:stone_golem]].',
      'Regresa con [[npc:gwin]] y elige Cleric. Sube Magic Mastery y Heal primero.',
    ],
    maps: ['map:ellinia', 'map:golem_temple'],
    items: [{ item: 'item:black_charm', qty: 30 }],
    rewards: { exp: null, mesos: null, items: [], other: 'Job: Cleric' },
  },
  priest_third_job: {
    name: '3rd Job — Priest',
    requirements: { level: 70, job: 'cleric', quests: ['quest:cleric_second_job'] },
    startNpc: 'npc:gwin',
    endNpc: 'npc:robeira',
    steps: [
      'Habla con [[npc:gwin]] en [[map:ellinia]], luego con [[npc:robeira]] en [[map:el_nath]].',
      'Door of Dimension en [[map:drakes_cave]] — derrota al clon y obtén el Black Charm.',
      'Holy Stone quiz: 5 preguntas — ten mesos para respuestas falladas.',
      'Entrega a [[npc:robeira]] → Priest. Prioriza Holy Symbol y Shining Ray.',
    ],
    maps: ['map:ellinia', 'map:el_nath', 'map:drakes_cave'],
    items: [],
    rewards: { exp: null, mesos: null, items: [], other: 'Job: Priest' },
  },
  bishop_fourth_job: {
    name: '4th Job — Bishop',
    requirements: { level: 120, job: 'priest', quests: ['quest:priest_third_job'] },
    startNpc: 'npc:hellin',
    endNpc: 'npc:hellin',
    steps: [
      'Habla con [[npc:hellin]] en [[map:valley_of_the_antelope]] ([[map:leafre]]).',
      'Consigue [[item:heroic_star]] y [[item:heroic_pentagon]] — tradeables en Royals.',
      'Entrega a [[npc:hellin]] → Bishop.',
    ],
    maps: ['map:leafre', 'map:valley_of_the_antelope'],
    items: [
      { item: 'item:heroic_star', qty: 1 },
      { item: 'item:heroic_pentagon', qty: 1 },
    ],
    rewards: { exp: null, mesos: null, items: [], other: 'Job: Bishop' },
  },
  il_mage_second_job: {
    name: '2nd Job — Ice/Lightning Wizard',
    requirements: { level: 30, job: 'magician', quests: ['quest:magician_first_job'] },
    startNpc: 'npc:gwin',
    endNpc: 'npc:gwin',
    steps: [
      'Habla con [[npc:gwin]] en [[map:ellinia]] y recibe la test quest.',
      'Entra a [[map:golem_temple]] — Victoria Road.',
      'Junta 30 [[item:black_charm|Black Charms]] de [[mob:stone_golem]].',
      'Regresa con [[npc:gwin]] y elige IL Mage. Raise Magic Mastery and Thunder Bolt first.',
    ],
    maps: ['map:ellinia', 'map:golem_temple'],
    items: [{ item: 'item:black_charm', qty: 30 }],
    rewards: { exp: null, mesos: null, items: [], other: 'Job: Ice/Lightning Wizard' },
  },
  il_arch_mage_third_job: {
    name: '3rd Job — IL Arch Mage',
    requirements: { level: 70, job: 'il_wizard', quests: ['quest:il_mage_second_job'] },
    startNpc: 'npc:gwin',
    endNpc: 'npc:robeira',
    steps: [
      'Habla con [[npc:gwin]] en [[map:ellinia]], luego con [[npc:robeira]] en [[map:el_nath]].',
      'Door of Dimension en [[map:drakes_cave]] — derrota al clon y obtén el Black Charm.',
      'Holy Stone quiz: 5 preguntas — ten mesos para respuestas falladas.',
      'Entrega a [[npc:robeira]] → IL Arch Mage. Prioriza Blizzard y Chain Lightning.',
    ],
    maps: ['map:ellinia', 'map:el_nath', 'map:drakes_cave'],
    items: [],
    rewards: { exp: null, mesos: null, items: [], other: 'Job: Ice/Lightning Arch Mage' },
  },
  il_arch_mage_fourth_job: {
    name: '4th Job — Ice/Lightning Arch Mage',
    requirements: { level: 120, job: 'il_arch_mage', quests: ['quest:il_arch_mage_third_job'] },
    startNpc: 'npc:hellin',
    endNpc: 'npc:hellin',
    steps: [
      'Habla con [[npc:hellin]] en [[map:valley_of_the_antelope]] ([[map:leafre]]).',
      'Consigue [[item:heroic_star]] y [[item:heroic_pentagon]] — tradeables en Royals.',
      'Entrega a [[npc:hellin]] → IL Arch Mage.',
    ],
    maps: ['map:leafre', 'map:valley_of_the_antelope'],
    items: [
      { item: 'item:heroic_star', qty: 1 },
      { item: 'item:heroic_pentagon', qty: 1 },
    ],
    rewards: { exp: null, mesos: null, items: [], other: 'Job: Ice/Lightning Arch Mage' },
  },
  crossbowman_second_job: {
    name: '2nd Job — Crossbowman',
    requirements: { level: 30, job: 'bowman', quests: ['quest:bowman_first_job'] },
    startNpc: 'npc:athena_pierce',
    endNpc: 'npc:athena_pierce',
    steps: [
      'Habla con [[npc:athena_pierce]] en [[map:henesys]] y recibe la test quest.',
      'Entra a [[map:henesys_dungeon]] — portal en Henesys.',
      'Junta 30 [[item:black_gem|Black Gems]] de [[mob:horny_mushroom]].',
      'Regresa con [[npc:athena_pierce]] y elige Crossbowman. Raise Crossbow Mastery and Iron Arrow first.',
    ],
    maps: ['map:henesys', 'map:henesys_dungeon'],
    items: [{ item: 'item:black_gem', qty: 30 }],
    rewards: { exp: null, mesos: null, items: [], other: 'Job: Crossbowman' },
  },
  sniper_third_job: {
    name: '3rd Job — Sniper',
    requirements: { level: 70, job: 'crossbowman', quests: ['quest:crossbowman_second_job'] },
    startNpc: 'npc:athena_pierce',
    endNpc: 'npc:rene',
    steps: [
      'Habla con [[npc:athena_pierce]] en [[map:henesys]], luego con [[npc:rene]] en [[map:el_nath]].',
      'Door of Dimension en [[map:mushroom_castle]] — derrota al clon y obtén el Black Charm.',
      'Holy Stone quiz: 5 preguntas — ten mesos para respuestas falladas.',
      'Entrega a [[npc:rene]] → Sniper. Prioriza Snipe and Ice Shot depending on your build.',
    ],
    maps: ['map:henesys', 'map:el_nath', 'map:mushroom_castle'],
    items: [],
    rewards: { exp: null, mesos: null, items: [], other: 'Job: Sniper' },
  },
  marksman_fourth_job: {
    name: '4th Job — Marksman',
    requirements: { level: 120, job: 'sniper', quests: ['quest:sniper_third_job'] },
    startNpc: 'npc:hellin',
    endNpc: 'npc:hellin',
    steps: [
      'Habla con [[npc:hellin]] en [[map:valley_of_the_antelope]] ([[map:leafre]]).',
      'Consigue [[item:heroic_star]] y [[item:heroic_pentagon]] — tradeables en Royals.',
      'Entrega a [[npc:hellin]] → Marksman.',
    ],
    maps: ['map:leafre', 'map:valley_of_the_antelope'],
    items: [
      { item: 'item:heroic_star', qty: 1 },
      { item: 'item:heroic_pentagon', qty: 1 },
    ],
    rewards: { exp: null, mesos: null, items: [], other: 'Job: Marksman' },
  },
  page_second_job: {
    name: '2nd Job — Page',
    requirements: { level: 30, job: 'warrior', quests: ['quest:fighter_first_job'] },
    startNpc: 'npc:dances_with_balrog',
    endNpc: 'npc:dances_with_balrog',
    steps: [
      'Habla con [[npc:dances_with_balrog]] en [[map:perion]] y recibe la test quest.',
      'Entra a [[map:forest_east_henesys]] — portal desde Henesys area.',
      'Junta 30 [[item:black_crystal|Black Crystals]] de [[mob:dark_axe_stump]].',
      'Regresa con [[npc:dances_with_balrog]] y elige Page. Raise Sword Mastery and HP Recovery first.',
    ],
    maps: ['map:perion', 'map:forest_east_henesys'],
    items: [{ item: 'item:black_crystal', qty: 30 }],
    rewards: { exp: null, mesos: null, items: [], other: 'Job: Page' },
  },
  white_knight_third_job: {
    name: '3rd Job — White Knight',
    requirements: { level: 70, job: 'page', quests: ['quest:page_second_job'] },
    startNpc: 'npc:dances_with_balrog',
    endNpc: 'npc:tylus',
    steps: [
      'Habla con [[npc:dances_with_balrog]] en [[map:perion]], luego con [[npc:tylus]] en [[map:el_nath]].',
      'Door of Dimension en [[map:sleepywood_forest]] — derrota al clon y obtén el Black Charm.',
      'Holy Stone quiz: 5 preguntas — ten mesos para respuestas falladas.',
      'Entrega a [[npc:tylus]] → White Knight. Prioritize Charge and Magic Crash.',
    ],
    maps: ['map:perion', 'map:el_nath', 'map:sleepywood_forest'],
    items: [],
    rewards: { exp: null, mesos: null, items: [], other: 'Job: White Knight' },
  },
  paladin_fourth_job: {
    name: '4th Job — Paladin',
    requirements: { level: 120, job: 'white_knight', quests: ['quest:white_knight_third_job'] },
    startNpc: 'npc:hellin',
    endNpc: 'npc:hellin',
    steps: [
      'Habla con [[npc:hellin]] en [[map:valley_of_the_antelope]] ([[map:leafre]]).',
      'Consigue [[item:heroic_star]] y [[item:heroic_pentagon]] — tradeables en Royals.',
      'Entrega a [[npc:hellin]] → Paladin.',
    ],
    maps: ['map:leafre', 'map:valley_of_the_antelope'],
    items: [
      { item: 'item:heroic_star', qty: 1 },
      { item: 'item:heroic_pentagon', qty: 1 },
    ],
    rewards: { exp: null, mesos: null, items: [], other: 'Job: Paladin' },
  },
  gunslinger_second_job: {
    name: '2nd Job — Gunslinger',
    requirements: { level: 30, job: 'pirate', quests: ['quest:pirate_first_job'] },
    startNpc: 'npc:kyrin',
    endNpc: 'npc:kyrin',
    steps: [
      'Habla con [[npc:kyrin]] en [[map:nautilus_harbor]] y recibe la test quest.',
      'Entra a [[map:keru_island]] — portal desde Nautilus.',
      'Junta 30 [[item:black_crystal|Black Crystals]] de los monstruos del test.',
      'Regresa con [[npc:kyrin]] y elige Gunslinger. Raise Gun Mastery and Invisible Shot first.',
    ],
    maps: ['map:nautilus_harbor', 'map:keru_island'],
    items: [{ item: 'item:black_crystal', qty: 30 }],
    rewards: { exp: null, mesos: null, items: [], other: 'Job: Gunslinger' },
  },
  outlaw_third_job: {
    name: '3rd Job — Outlaw',
    requirements: { level: 70, job: 'gunslinger', quests: ['quest:gunslinger_second_job'] },
    startNpc: 'npc:kyrin',
    endNpc: 'npc:pedro',
    steps: [
      'Habla con [[npc:kyrin]] en [[map:nautilus_harbor]], luego con [[npc:pedro]] en [[map:el_nath]].',
      'Door of Dimension en [[map:pirates_door]] — derrota al clon y obtén el Black Charm.',
      'Holy Stone quiz: 5 preguntas — ten mesos para respuestas falladas.',
      'Entrega a [[npc:pedro]] → Outlaw. Prioritize Triple Fire and Octopus Bomb.',
    ],
    maps: ['map:nautilus_harbor', 'map:el_nath', 'map:pirates_door'],
    items: [],
    rewards: { exp: null, mesos: null, items: [], other: 'Job: Outlaw' },
  },
  corsair_fourth_job: {
    name: '4th Job — Corsair',
    requirements: { level: 120, job: 'outlaw', quests: ['quest:outlaw_third_job'] },
    startNpc: 'npc:hellin',
    endNpc: 'npc:hellin',
    steps: [
      'Habla con [[npc:hellin]] en [[map:valley_of_the_antelope]] ([[map:leafre]]).',
      'Consigue [[item:heroic_star]] y [[item:heroic_pentagon]] — tradeables en Royals.',
      'Entrega a [[npc:hellin]] → Corsair.',
    ],
    maps: ['map:leafre', 'map:valley_of_the_antelope'],
    items: [
      { item: 'item:heroic_star', qty: 1 },
      { item: 'item:heroic_pentagon', qty: 1 },
    ],
    rewards: { exp: null, mesos: null, items: [], other: 'Job: Corsair' },
  },
  kerning_pq: {
    name: 'Kerning City Party Quest',
    requirements: { level: 21, job: 'any', quests: [] },
    startNpc: 'npc:lakis',
    endNpc: 'npc:lakis',
    steps: [
      'Forma party de 4 (niveles 21-30) y habla con [[npc:lakis]] en [[map:kerning_city]].',
      'Stage 1: recoge los cupones de cada miembro en las cámaras.',
      'Stage 2: elimina monstruos y recoge las pasadas.',
      'Stage 3: resuelve el laberinto de cajas y activa los switches.',
      'Stage 4: derrota al jefe final y recoge la recompensa.',
    ],
    maps: ['map:kerning_city', 'map:kerning_pq'],
    items: [],
    rewards: { exp: null, mesos: null, items: [], other: 'EXP y drops de KPQ' },
  },
  ludi_pq: {
    name: 'Ludibrium Party Quest',
    requirements: { level: 35, job: 'any', quests: [] },
    startNpc: 'npc:elin',
    endNpc: 'npc:elin',
    steps: [
      'Forma party de 6 (niveles 35-50) y habla con [[npc:elin]] en [[map:ludibrium]].',
      'Stage 1: recoge los pasaportes de los miembros del party.',
      'Stage 2: derrota monstruos y recoge los bloques de puzzle.',
      'Stage 3: completa el puzzle de bloques en el tiempo límite.',
      'Stage 4: derrota al jefe Alishar y recoge la recompensa.',
    ],
    maps: ['map:ludibrium', 'map:ludi_pq'],
    items: [],
    rewards: { exp: null, mesos: null, items: [], other: 'EXP y drops de LPQ' },
  },
  papulatus_prequest: {
    name: 'Papulatus Prequest',
    requirements: { level: 115, job: 'any', quests: [] },
    startNpc: 'npc:rios',
    endNpc: 'npc:rios',
    steps: [
      'Acepta la prequest con [[npc:rios]] en [[map:ludibrium]] (Clock Tower).',
      'Entra al [[map:ludi_labyrinth]] y recolecta [[item:lost_time_piece]] x20.',
      'Entrega a [[npc:rios]] → recibe [[item:papulatus_ticket]].',
    ],
    maps: ['map:ludibrium', 'map:ludi_labyrinth'],
    items: [{ item: 'item:lost_time_piece', qty: 20 }],
    rewards: {
      exp: null,
      mesos: null,
      items: ['item:papulatus_ticket'],
      other: 'Acceso a [[boss:papulatus]] en [[map:papulatus_altar]]',
    },
  },
  pink_bean_prequest: {
    name: 'Pink Bean Prequest',
    requirements: { level: 120, job: 'any', quests: [] },
    startNpc: 'npc:pato',
    endNpc: 'npc:pato',
    steps: [
      'Acepta la prequest con [[npc:pato]] en [[map:mushroom_shrine]].',
      'Recolecta [[item:squishy_liquid]] x50 de los mobs en Mushroom Shrine.',
      'Entrega a [[npc:pato]] → recibe [[item:pink_bean_ticket]].',
    ],
    maps: ['map:mushroom_shrine'],
    items: [{ item: 'item:squishy_liquid', qty: 50 }],
    rewards: {
      exp: null,
      mesos: null,
      items: ['item:pink_bean_ticket'],
      other: 'Acceso a [[boss:pink_bean]] en [[map:pink_bean_altar]]',
    },
  },
};

// ── New guides ─────────────────────────────────────────────────────

const newGuides = [
  {
    id: 'bishop_path',
    title: 'Bishop — Job Path',
    job: 'magician',
    category: 'job_advancement',
    steps: [
      { id: 'bp-01', type: 'travel', text: 'Go to Ellinia → Magic Library.', map: 'Ellinia', mapRef: 'map:ellinia', questRef: 'quest:magician_first_job', req: { level: 10 } },
      { id: 'bp-02', type: 'accept', text: 'Talk to Gwin → 1st Job: Magician. Requires INT 20.', npc: 'Gwin', npcRef: 'npc:gwin', questRef: 'quest:magician_first_job', req: { level: 10 } },
      { id: 'bp-03', type: 'grind', text: 'Grind to level 30. Suggested maps below.', grind_to: { level: 30 }, maps: ['Ellinia Southern Forest (Slimes, Pigs)', 'Ellinia Forest III (Evil Eyes)', 'Ant Tunnel 1 (Jr. Sentinels — if funded)'], trainRefs: ['train:ellinia_southern_forest', 'train:ellinia_forest_iii', 'train:ant_tunnel_1_jr_sentinel'] },
      { id: 'bp-04', type: 'prequest', text: '2nd Job: talk to Gwin, receive the test quest → Golem Temple (Victoria Road). Collect 30 Black Charms from the Stone Golems in the test.', npc: 'Gwin', npcRef: 'npc:gwin', questRef: 'quest:cleric_second_job', mapRef: 'map:golem_temple', itemRefs: ['item:black_charm'], req: { level: 30 } },
      { id: 'bp-05', type: 'complete', text: 'Return to Gwin → choose Cleric. Raise Magic Mastery and Heal first.', npc: 'Gwin', npcRef: 'npc:gwin', questRef: 'quest:cleric_second_job', req: { level: 30 } },
      { id: 'bp-06', type: 'grind', text: 'Grind to level 70.', grind_to: { level: 70 }, maps: ['Kerning PQ (21-30, in party)', 'Ludi PQ (35-50)', 'Mysterious Path 3 (55-70)'], trainRefs: ['train:kerning_pq', 'train:ludi_pq', 'train:mysterious_path_3', 'train:wild_kargo_truckers'] },
      { id: 'bp-07', type: 'prequest', text: "3rd Job: talk to Gwin in Ellinia → then Robeira in El Nath. Door of Dimension (Drake's Cave) → defeat Gwin's clone → Black Charm → Holy Stone quiz (5 questions, bring mesos for failed answers).", npc: 'Robeira (El Nath)', npcRef: 'npc:robeira', questRef: 'quest:priest_third_job', mapRef: 'map:drakes_cave', req: { level: 70 } },
      { id: 'bp-08', type: 'complete', text: 'Turn in to Robeira → Priest. Prioritize Holy Symbol and Shining Ray depending on your build.', npc: 'Robeira', npcRef: 'npc:robeira', questRef: 'quest:priest_third_job', req: { level: 70 } },
      { id: 'bp-09', type: 'grind', text: 'Grind to level 120.', grind_to: { level: 120 }, maps: ['Wolf Spiders (80-100)', 'Himes / Dreamy Ghosts (90-120, HS mule ideal)', 'Gallos (100-120 alternative)'], trainRefs: ['train:wolf_spiders', 'train:himes', 'train:gallos'] },
      { id: 'bp-10', type: 'prequest', text: '4th Job: talk to Hellin in Leafre (Valley of the Antelope). Collect Heroic Star (Manon) and Heroic Pentagon (Griffey) — drops are tradeable in Royals, you can buy them.', npc: 'Hellin (Leafre)', npcRef: 'npc:hellin', questRef: 'quest:bishop_fourth_job', req: { level: 120 }, items: ['Heroic Star', 'Heroic Pentagon'], itemRefs: ['item:heroic_star', 'item:heroic_pentagon'] },
      { id: 'bp-11', type: 'complete', text: "Turn in to Hellin → Bishop. Buy Big Bang and Infinity skill books and max according to The Clinic's guide.", npc: 'Hellin', npcRef: 'npc:hellin', questRef: 'quest:bishop_fourth_job', req: { level: 120 } },
    ],
  },
  {
    id: 'ice_lit_mage_path',
    title: 'Ice/Lightning Arch Mage — Job Path',
    job: 'magician',
    category: 'job_advancement',
    steps: [
      { id: 'il-01', type: 'travel', text: 'Go to Ellinia → Magic Library.', map: 'Ellinia', mapRef: 'map:ellinia', questRef: 'quest:magician_first_job', req: { level: 10 } },
      { id: 'il-02', type: 'accept', text: 'Talk to Gwin → 1st Job: Magician. Requires INT 20.', npc: 'Gwin', npcRef: 'npc:gwin', questRef: 'quest:magician_first_job', req: { level: 10 } },
      { id: 'il-03', type: 'grind', text: 'Grind to level 30. Suggested maps below.', grind_to: { level: 30 }, maps: ['Ellinia Southern Forest (Slimes, Pigs)', 'Ellinia Forest III (Evil Eyes)', 'Ant Tunnel 1 (Jr. Sentinels — if funded)'], trainRefs: ['train:ellinia_southern_forest', 'train:ellinia_forest_iii', 'train:ant_tunnel_1_jr_sentinel'] },
      { id: 'il-04', type: 'prequest', text: '2nd Job: talk to Gwin, receive the test quest → Golem Temple (Victoria Road). Collect 30 Black Charms from the Stone Golems in the test.', npc: 'Gwin', npcRef: 'npc:gwin', questRef: 'quest:il_mage_second_job', mapRef: 'map:golem_temple', itemRefs: ['item:black_charm'], req: { level: 30 } },
      { id: 'il-05', type: 'complete', text: 'Return to Gwin → choose Ice/Lightning Wizard (IL Mage). Raise Magic Mastery and Thunder Bolt first.', npc: 'Gwin', npcRef: 'npc:gwin', questRef: 'quest:il_mage_second_job', req: { level: 30 } },
      { id: 'il-06', type: 'grind', text: 'Grind to level 70.', grind_to: { level: 70 }, maps: ['Kerning PQ (21-30, in party)', 'Ludi PQ (35-50)', 'Mysterious Path 3 (55-70)', 'Fire Turtles / Wild Kargo (55-70 alternative)'], trainRefs: ['train:kerning_pq', 'train:ludi_pq', 'train:mysterious_path_3', 'train:fire_turtle_area', 'train:wild_kargo_truckers'] },
      { id: 'il-07', type: 'prequest', text: "3rd Job: talk to Gwin in Ellinia → then Robeira in El Nath. Door of Dimension (Drake's Cave) → defeat Gwin's clone → Black Charm → Holy Stone quiz (5 questions, bring mesos for failed answers).", npc: 'Robeira (El Nath)', npcRef: 'npc:robeira', questRef: 'quest:il_arch_mage_third_job', mapRef: 'map:drakes_cave', req: { level: 70 } },
      { id: 'il-08', type: 'complete', text: 'Turn in to Robeira → IL Arch Mage. Prioritize Blizzard and Chain Lightning depending on your build.', npc: 'Robeira', npcRef: 'npc:robeira', questRef: 'quest:il_arch_mage_third_job', req: { level: 70 } },
      { id: 'il-09', type: 'grind', text: 'Grind to level 120.', grind_to: { level: 120 }, maps: ['Wolf Spiders (80-100)', 'Himes / Dreamy Ghosts (90-120, HS mule ideal)', 'Gallos (100-120 alternative)'], trainRefs: ['train:wolf_spiders', 'train:himes', 'train:gallos'] },
      { id: 'il-10', type: 'prequest', text: '4th Job: talk to Hellin in Leafre (Valley of the Antelope). Collect Heroic Star (Manon) and Heroic Pentagon (Griffey) — drops are tradeable in Royals, you can buy them.', npc: 'Hellin (Leafre)', npcRef: 'npc:hellin', questRef: 'quest:il_arch_mage_fourth_job', req: { level: 120 }, items: ['Heroic Star', 'Heroic Pentagon'], itemRefs: ['item:heroic_star', 'item:heroic_pentagon'] },
      { id: 'il-11', type: 'complete', text: "Turn in to Hellin → Ice/Lightning Arch Mage. Buy Big Bang and Infinity skill books and max according to The Clinic's guide.", npc: 'Hellin', npcRef: 'npc:hellin', questRef: 'quest:il_arch_mage_fourth_job', req: { level: 120 } },
    ],
  },
  {
    id: 'marksman_path',
    title: 'Marksman — Job Path',
    job: 'bowman',
    category: 'job_advancement',
    steps: [
      { id: 'ms-01', type: 'travel', text: 'Go to Henesys → Bowman Instructional School.', map: 'Henesys', mapRef: 'map:henesys', questRef: 'quest:bowman_first_job', req: { level: 10 } },
      { id: 'ms-02', type: 'accept', text: 'Talk to Athena Pierce → 1st Job: Bowman. Requires DEX 25.', npc: 'Athena Pierce', npcRef: 'npc:athena_pierce', questRef: 'quest:bowman_first_job', req: { level: 10 } },
      { id: 'ms-03', type: 'grind', text: 'Grind to level 30. Suggested maps below.', grind_to: { level: 30 }, maps: ['Henesys Hunting Ground I (Orange Mushrooms, Pigs)', 'Henesys Hunting Ground II (Green Mushrooms)', 'Kerning Construction Site (Octopus — if leeching)'], trainRefs: ['train:henesys_hg1', 'train:henesys_hg2', 'train:construction_site_octopus'] },
      { id: 'ms-04', type: 'prequest', text: '2nd Job: talk to Athena Pierce, receive the test quest → Henesys Dungeon (portal in Henesys). Collect 30 Black Gems from the Horny Mushrooms in the test.', npc: 'Athena Pierce', npcRef: 'npc:athena_pierce', questRef: 'quest:crossbowman_second_job', mapRef: 'map:henesys_dungeon', itemRefs: ['item:black_gem'], req: { level: 30 } },
      { id: 'ms-05', type: 'complete', text: 'Return to Athena Pierce → choose Crossbowman. Raise Crossbow Mastery and Iron Arrow first.', npc: 'Athena Pierce', npcRef: 'npc:athena_pierce', questRef: 'quest:crossbowman_second_job', req: { level: 30 } },
      { id: 'ms-06', type: 'grind', text: 'Grind to level 70.', grind_to: { level: 70 }, maps: ['Kerning PQ (21-30, in party)', 'Ludi PQ (35-50)', 'Mysterious Path 3 (55-70)', 'Wild Kargo / Truckers (55-70 alternative)'], trainRefs: ['train:kerning_pq', 'train:ludi_pq', 'train:mysterious_path_3', 'train:wild_kargo_truckers'] },
      { id: 'ms-07', type: 'prequest', text: "3rd Job: talk to Athena Pierce in Henesys → then Rene in El Nath. Door of Dimension (Mushroom Castle) → defeat Athena Pierce's clone → Black Charm → Holy Stone quiz (5 questions, bring mesos for failed answers).", npc: 'Rene (El Nath)', npcRef: 'npc:rene', questRef: 'quest:sniper_third_job', mapRef: 'map:mushroom_castle', req: { level: 70 } },
      { id: 'ms-08', type: 'complete', text: 'Turn in to Rene → Sniper. Prioritize Snipe and Ice Shot depending on your build.', npc: 'Rene', npcRef: 'npc:rene', questRef: 'quest:sniper_third_job', req: { level: 70 } },
      { id: 'ms-09', type: 'grind', text: 'Grind to level 120.', grind_to: { level: 120 }, maps: ['Wolf Spiders (80-100)', 'Himes / Dreamy Ghosts (90-120, HS mule ideal)', 'Gallos (100-120 alternative)'], trainRefs: ['train:wolf_spiders', 'train:himes', 'train:gallos'] },
      { id: 'ms-10', type: 'prequest', text: '4th Job: talk to Hellin in Leafre (Valley of the Antelope). Collect Heroic Star (Manon) and Heroic Pentagon (Griffey) — drops are tradeable in Royals, you can buy them.', npc: 'Hellin (Leafre)', npcRef: 'npc:hellin', questRef: 'quest:marksman_fourth_job', req: { level: 120 }, items: ['Heroic Star', 'Heroic Pentagon'], itemRefs: ['item:heroic_star', 'item:heroic_pentagon'] },
      { id: 'ms-11', type: 'complete', text: "Turn in to Hellin → Marksman. Buy Piercing Arrow and Sharp Eyes skill books and max according to The Clinic's guide.", npc: 'Hellin', npcRef: 'npc:hellin', questRef: 'quest:marksman_fourth_job', req: { level: 120 } },
    ],
  },
  {
    id: 'corsair_path',
    title: 'Corsair — Job Path',
    job: 'pirate',
    category: 'job_advancement',
    steps: [
      { id: 'cr-01', type: 'travel', text: 'Go to Nautilus Harbor → Nautilus HQ.', map: 'Nautilus Harbor', mapRef: 'map:nautilus_harbor', questRef: 'quest:pirate_first_job', req: { level: 10 } },
      { id: 'cr-02', type: 'accept', text: 'Talk to Kyrin → 1st Job: Pirate. Requires STR 20 and DEX 20.', npc: 'Kyrin', npcRef: 'npc:kyrin', questRef: 'quest:pirate_first_job', req: { level: 10 } },
      { id: 'cr-03', type: 'grind', text: 'Grind to level 30. Suggested maps below.', grind_to: { level: 30 }, maps: ['Florina Beach (Crab, Krip)', 'Nautilus Training Room (Jr. Cellion)', 'Kerning Construction Site (Octopus — if leeching)'], trainRefs: ['train:florina_beach', 'train:nautilus_training_room', 'train:construction_site_octopus'] },
      { id: 'cr-04', type: 'prequest', text: '2nd Job: talk to Kyrin, receive the test quest → Keru Island (portal from Nautilus). Collect 30 Black Crystals from the test monkeys and cracklers.', npc: 'Kyrin', npcRef: 'npc:kyrin', questRef: 'quest:gunslinger_second_job', mapRef: 'map:keru_island', itemRefs: ['item:black_crystal'], req: { level: 30 } },
      { id: 'cr-05', type: 'complete', text: 'Return to Kyrin → choose Gunslinger. Raise Gun Mastery and Invisible Shot first.', npc: 'Kyrin', npcRef: 'npc:kyrin', questRef: 'quest:gunslinger_second_job', req: { level: 30 } },
      { id: 'cr-06', type: 'grind', text: 'Grind to level 70.', grind_to: { level: 70 }, maps: ['Kerning PQ (21-30, in party)', 'Ludi PQ (35-50)', 'Mysterious Path 3 (55-70)', 'Wild Kargo / Truckers (55-70 alternative)'], trainRefs: ['train:kerning_pq', 'train:ludi_pq', 'train:mysterious_path_3', 'train:wild_kargo_truckers'] },
      { id: 'cr-07', type: 'prequest', text: "3rd Job: talk to Kyrin in Nautilus → then Pedro in El Nath. Door of Dimension (Pirate's Door) → defeat Kyrin's clone → Black Charm → Holy Stone quiz (5 questions, bring mesos for failed answers).", npc: 'Pedro (El Nath)', npcRef: 'npc:pedro', questRef: 'quest:outlaw_third_job', mapRef: 'map:pirates_door', req: { level: 70 } },
      { id: 'cr-08', type: 'complete', text: 'Turn in to Pedro → Outlaw. Prioritize Triple Fire and Octopus Bomb depending on your build.', npc: 'Pedro', npcRef: 'npc:pedro', questRef: 'quest:outlaw_third_job', req: { level: 70 } },
      { id: 'cr-09', type: 'grind', text: 'Grind to level 120.', grind_to: { level: 120 }, maps: ['Wolf Spiders (80-100)', 'Himes / Dreamy Ghosts (90-120, HS mule ideal)', 'Gallos (100-120 alternative)'], trainRefs: ['train:wolf_spiders', 'train:himes', 'train:gallos'] },
      { id: 'cr-10', type: 'prequest', text: '4th Job: talk to Hellin in Leafre (Valley of the Antelope). Collect Heroic Star (Manon) and Heroic Pentagon (Griffey) — drops are tradeable in Royals, you can buy them.', npc: 'Hellin (Leafre)', npcRef: 'npc:hellin', questRef: 'quest:corsair_fourth_job', req: { level: 120 }, items: ['Heroic Star', 'Heroic Pentagon'], itemRefs: ['item:heroic_star', 'item:heroic_pentagon'] },
      { id: 'cr-11', type: 'complete', text: "Turn in to Hellin → Corsair. Buy Battleship and Elemental Boost skill books and max according to The Clinic's guide.", npc: 'Hellin', npcRef: 'npc:hellin', questRef: 'quest:corsair_fourth_job', req: { level: 120 } },
    ],
  },
  {
    id: 'paladin_path',
    title: 'Paladin — Job Path',
    job: 'warrior',
    category: 'job_advancement',
    steps: [
      { id: 'pl-01', type: 'travel', text: "Go to Perion → Warriors' Sanctuary.", map: 'Perion', mapRef: 'map:perion', questRef: 'quest:fighter_first_job', req: { level: 10 } },
      { id: 'pl-02', type: 'accept', text: 'Talk to Dances with Balrog → 1st Job: Warrior. Requires STR 35.', npc: 'Dances with Balrog', npcRef: 'npc:dances_with_balrog', questRef: 'quest:fighter_first_job', req: { level: 10 } },
      { id: 'pl-03', type: 'grind', text: 'Grind to level 30. Suggested maps below.', grind_to: { level: 30 }, maps: ['Perion Warning Street (Slimes, Stumps)', 'Perion Dungeon (Evil Eyes, Dark Stumps)', 'Construction Site (Octopus — if leeching from KC)'], trainRefs: ['train:perion_warning_street', 'train:perion_dungeon', 'train:construction_site_octopus'] },
      { id: 'pl-04', type: 'prequest', text: '2nd Job: talk to Dances with Balrog, receive the test quest → Forest East of Henesys (portal near Henesys). Collect 30 Black Crystals from the Dark Axe Stumps in the test.', npc: 'Dances with Balrog', npcRef: 'npc:dances_with_balrog', questRef: 'quest:page_second_job', mapRef: 'map:forest_east_henesys', itemRefs: ['item:black_crystal'], req: { level: 30 } },
      { id: 'pl-05', type: 'complete', text: 'Return to Dances with Balrog → choose Page. Raise Sword Mastery and HP Recovery first.', npc: 'Dances with Balrog', npcRef: 'npc:dances_with_balrog', questRef: 'quest:page_second_job', req: { level: 30 } },
      { id: 'pl-06', type: 'grind', text: 'Grind to level 70.', grind_to: { level: 70 }, maps: ['Kerning PQ (21-30, in party)', 'Ludi PQ (35-50)', 'Mysterious Path 3 (55-70)', 'Wild Kargo / Truckers (55-70 alternative)'], trainRefs: ['train:kerning_pq', 'train:ludi_pq', 'train:mysterious_path_3', 'train:wild_kargo_truckers'] },
      { id: 'pl-07', type: 'prequest', text: "3rd Job: talk to Dances with Balrog in Perion → then Tylus in El Nath. Door of Dimension (Sleepywood Forest) → defeat Dances with Balrog's clone → Black Charm → Holy Stone quiz (5 questions, bring mesos for failed answers).", npc: 'Tylus (El Nath)', npcRef: 'npc:tylus', questRef: 'quest:white_knight_third_job', mapRef: 'map:sleepywood_forest', req: { level: 70 } },
      { id: 'pl-08', type: 'complete', text: 'Turn in to Tylus → White Knight. Prioritize Charge and Magic Crash depending on your build.', npc: 'Tylus', npcRef: 'npc:tylus', questRef: 'quest:white_knight_third_job', req: { level: 70 } },
      { id: 'pl-09', type: 'grind', text: 'Grind to level 120.', grind_to: { level: 120 }, maps: ['Wolf Spiders (80-100)', 'Himes / Dreamy Ghosts (90-120, HS mule ideal)', 'Gallos (100-120 alternative)'], trainRefs: ['train:wolf_spiders', 'train:himes', 'train:gallos'] },
      { id: 'pl-10', type: 'prequest', text: '4th Job: talk to Hellin in Leafre (Valley of the Antelope). Collect Heroic Star (Manon) and Heroic Pentagon (Griffey) — drops are tradeable in Royals, you can buy them.', npc: 'Hellin (Leafre)', npcRef: 'npc:hellin', questRef: 'quest:paladin_fourth_job', req: { level: 120 }, items: ['Heroic Star', 'Heroic Pentagon'], itemRefs: ['item:heroic_star', 'item:heroic_pentagon'] },
      { id: 'pl-11', type: 'complete', text: "Turn in to Hellin → Paladin. Buy Guardian and Heaven's Hammer skill books and max according to The Clinic's guide.", npc: 'Hellin', npcRef: 'npc:hellin', questRef: 'quest:paladin_fourth_job', req: { level: 120 } },
    ],
  },
  {
    id: 'kerning_pq',
    title: 'Kerning City Party Quest',
    job: 'any',
    category: 'party_quest',
    steps: [
      { id: 'kpq-01', type: 'travel', text: 'Go to Kerning City → find Lakis near the Construction Site PQ portal.', map: 'Kerning City', mapRef: 'map:kerning_city', npc: 'Lakis', npcRef: 'npc:lakis', questRef: 'quest:kerning_pq', req: { level: 21 } },
      { id: 'kpq-02', type: 'accept', text: 'Form a party of 4 (levels 21-30) and talk to Lakis to enter Kerning PQ.', npc: 'Lakis', npcRef: 'npc:lakis', questRef: 'quest:kerning_pq', mapRef: 'map:kerning_pq', req: { level: 21 } },
      { id: 'kpq-03', type: 'collect', text: 'Stage 1: each party member collects their coupon from the designated room. Split up and meet at the exit.', mapRef: 'map:kerning_pq', questRef: 'quest:kerning_pq' },
      { id: 'kpq-04', type: 'collect', text: 'Stage 2: kill monsters and collect the passes dropped. Hand them to the NPC at the end of the stage.', mapRef: 'map:kerning_pq', questRef: 'quest:kerning_pq' },
      { id: 'kpq-05', type: 'prequest', text: 'Stage 3: navigate the box maze — push boxes onto switches to open gates. Coordinate with your party.', mapRef: 'map:kerning_pq', questRef: 'quest:kerning_pq' },
      { id: 'kpq-06', type: 'complete', text: 'Stage 4: defeat the final boss and loot the reward. Exit and talk to Lakis to re-enter.', npc: 'Lakis', npcRef: 'npc:lakis', questRef: 'quest:kerning_pq', mapRef: 'map:kerning_pq' },
    ],
  },
  {
    id: 'ludi_pq',
    title: 'Ludibrium Party Quest',
    job: 'any',
    category: 'party_quest',
    steps: [
      { id: 'lpq-01', type: 'travel', text: 'Go to Ludibrium → find Elin at the Party Quest entrance.', map: 'Ludibrium', mapRef: 'map:ludibrium', npc: 'Elin', npcRef: 'npc:elin', questRef: 'quest:ludi_pq', req: { level: 35 } },
      { id: 'lpq-02', type: 'accept', text: 'Form a party of 6 (levels 35-50) and talk to Elin to enter Ludibrium PQ.', npc: 'Elin', npcRef: 'npc:elin', questRef: 'quest:ludi_pq', mapRef: 'map:ludi_pq', req: { level: 35 } },
      { id: 'lpq-03', type: 'collect', text: 'Stage 1: each party member collects their passport from the designated room.', mapRef: 'map:ludi_pq', questRef: 'quest:ludi_pq' },
      { id: 'lpq-04', type: 'collect', text: 'Stage 2: kill monsters and collect puzzle blocks. Bring them to the center platform.', mapRef: 'map:ludi_pq', questRef: 'quest:ludi_pq' },
      { id: 'lpq-05', type: 'prequest', text: 'Stage 3: assemble the block puzzle before the timer runs out. Assign roles: killers, collectors, builder.', mapRef: 'map:ludi_pq', questRef: 'quest:ludi_pq' },
      { id: 'lpq-06', type: 'complete', text: 'Stage 4: defeat Alishar and collect the reward. Exit and talk to Elin to re-enter.', npc: 'Elin', npcRef: 'npc:elin', questRef: 'quest:ludi_pq', mapRef: 'map:ludi_pq' },
    ],
  },
  {
    id: 'papulatus_prequest',
    title: 'Papulatus — Full Prequest',
    job: 'any',
    category: 'boss_prequest',
    steps: [
      { id: 'pp-01', type: 'travel', text: 'Go to Ludibrium → Clock Tower area → talk to Rios.', map: 'Ludibrium', mapRef: 'map:ludibrium', npc: 'Rios', npcRef: 'npc:rios', questRef: 'quest:papulatus_prequest', req: { level: 115 } },
      { id: 'pp-02', type: 'accept', text: "Accept Papulatus prequest from Rios. You'll need to collect Lost Time Pieces from the Labyrinth.", npc: 'Rios', npcRef: 'npc:rios', questRef: 'quest:papulatus_prequest', req: { level: 115 } },
      { id: 'pp-03', type: 'collect', text: 'Enter the Ludibrium Labyrinth and collect Lost Time Piece x20 (drops from Lorangs and labyrinth mobs).', mapRef: 'map:ludi_labyrinth', questRef: 'quest:papulatus_prequest', items: ['Lost Time Piece x20'], itemRefs: ['item:lost_time_piece'] },
      { id: 'pp-04', type: 'complete', text: 'Return to Rios with 20 Lost Time Pieces → receive Papulatus Ticket.', npc: 'Rios', npcRef: 'npc:rios', questRef: 'quest:papulatus_prequest', itemRefs: ['item:lost_time_piece', 'item:papulatus_ticket'] },
      { id: 'pp-05', type: 'travel', text: "Run day: enter Papulatus' Altar with your party and ticket. Recommended level 120+. Coordinate with The Clinic: watch for time-stop mechanics.", map: "Papulatus' Altar", mapRef: 'map:papulatus_altar', bossRef: 'boss:papulatus', itemRefs: ['item:papulatus_ticket'], req: { level: 115 } },
    ],
  },
  {
    id: 'pink_bean_prequest',
    title: 'Pink Bean — Full Prequest',
    job: 'any',
    category: 'boss_prequest',
    steps: [
      { id: 'pb-01', type: 'travel', text: 'Go to Mushroom Shrine (Zipangu) → find Pato near the entrance.', map: 'Mushroom Shrine', mapRef: 'map:mushroom_shrine', npc: 'Pato', npcRef: 'npc:pato', questRef: 'quest:pink_bean_prequest', req: { level: 120 } },
      { id: 'pb-02', type: 'accept', text: 'Accept the Pink Bean prequest from Pato. You will need Squishy Liquid from mobs in the area.', npc: 'Pato', npcRef: 'npc:pato', questRef: 'quest:pink_bean_prequest', req: { level: 120 } },
      { id: 'pb-03', type: 'collect', text: 'Collect Squishy Liquid x50 from Himes and other mobs in Mushroom Shrine. Tradeable in Royals — you can buy them.', mapRef: 'map:mushroom_shrine', questRef: 'quest:pink_bean_prequest', items: ['Squishy Liquid x50'], itemRefs: ['item:squishy_liquid'] },
      { id: 'pb-04', type: 'complete', text: 'Return to Pato with 50 Squishy Liquid → receive Pink Bean Ticket.', npc: 'Pato', npcRef: 'npc:pato', questRef: 'quest:pink_bean_prequest', itemRefs: ['item:squishy_liquid', 'item:pink_bean_ticket'] },
      { id: 'pb-05', type: 'travel', text: "Run day: enter Pink Bean's Altar with your party and ticket. Recommended level 130+. Coordinate with The Clinic: watch for stun and seduce phases.", map: "Pink Bean's Altar", mapRef: 'map:pink_bean_altar', bossRef: 'boss:pink_bean', itemRefs: ['item:pink_bean_ticket'], req: { level: 120 } },
    ],
  },
  {
    id: 'nlc_travel',
    title: 'New Leaf City — Travel Guide',
    job: 'any',
    category: 'utility',
    steps: [
      { id: 'nlc-01', type: 'travel', text: 'Go to any major town (Henesys, Ellinia, Kerning, Perion, or Leafre) → find Spinel.', map: 'Henesys', mapRef: 'map:henesys', npc: 'Spinel', npcRef: 'npc:spinel', req: { level: 1 } },
      { id: 'nlc-02', type: 'accept', text: 'Talk to Spinel → select "Move to Masteria" → choose New Leaf City. Small meso fee applies.', npc: 'Spinel', npcRef: 'npc:spinel', mapRef: 'map:new_leaf_city' },
      { id: 'nlc-03', type: 'complete', text: 'You arrive in New Leaf City (Masteria). Use Spinel in NLC to return to Victoria Island or other regions.', map: 'New Leaf City', mapRef: 'map:new_leaf_city', npc: 'Spinel', npcRef: 'npc:spinel' },
    ],
  },
];

// ── Apply database merges ──────────────────────────────────────────

mergeEntities(path.join(DB, 'maps.json'), newMaps);
mergeEntities(path.join(DB, 'npcs.json'), newNpcs);
mergeEntities(path.join(DB, 'items.json'), newItems);
mergeEntities(path.join(DB, 'quests.json'), newQuests);
mergeEntities(path.join(DB, 'monsters.json'), newMonsters);
mergeEntities(path.join(DB, 'bosses.json'), newBosses);
mergeEntities(path.join(DB, 'training.json'), newTraining);

// Patch existing map connections
const maps = loadJson(path.join(DB, 'maps.json'));
maps.entities.ludi_pq.connections = ['map:ludibrium', 'map:mysterious_path_3'];
maps.entities.mysterious_path_3.connections.push('map:fire_turtle_area');
maps.entities.henesys.connections.push('map:forest_east_henesys', 'map:sleepywood_forest');
maps.entities.kerning_city.connections.push('map:kerning_pq');
maps.entities.mushroom_shrine.connections.push('map:pink_bean_altar');
maps.entities.el_nath.connections.push('map:ludibrium');
saveJson(path.join(DB, 'maps.json'), maps);

// Update dark_axe_stump to include forest_east_henesys
const mobs = loadJson(path.join(DB, 'monsters.json'));
if (mobs.entities.dark_axe_stump && !mobs.entities.dark_axe_stump.maps.includes('map:forest_east_henesys')) {
  mobs.entities.dark_axe_stump.maps.push('map:forest_east_henesys');
}
saveJson(path.join(DB, 'monsters.json'), mobs);

// ── Merge guides ───────────────────────────────────────────────────

const guides = loadJson(path.join(DATA, 'guides.json'));
guides.version = '1.2.0';
guides.guides.push(...newGuides);
saveJson(path.join(DATA, 'guides.json'), guides);

console.log(`Built v1.2.0: ${guides.guides.length} guides (+${newGuides.length} new)`);
console.log(`  maps +${Object.keys(newMaps).length}, npcs +${Object.keys(newNpcs).length}, quests +${Object.keys(newQuests).length}`);
console.log(`  items +${Object.keys(newItems).length}, bosses +${Object.keys(newBosses).length}, monsters +${Object.keys(newMonsters).length}, training +${Object.keys(newTraining).length}`);
