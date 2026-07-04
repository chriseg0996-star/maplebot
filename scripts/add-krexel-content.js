#!/usr/bin/env node
/** Add Krexel prequest guide + DB entities (Singapore / Ulu City). */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

function load(name) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, 'data', name), 'utf8'));
}

function save(rel, data) {
  fs.writeFileSync(path.join(ROOT, 'data', rel), JSON.stringify(data, null, 2) + '\n');
}

// --- maps ---
const maps = load('database/maps.json');
Object.assign(maps.entities, {
  boat_quay_town: {
    name: 'Boat Quay Town',
    aliases: ['Boat Quay', 'Singapore Boat Quay', 'BoatQuay Town', 'Boat Quay Town Singapore'],
    region: 'singapore',
    connections: ['map:ghost_ship_2', 'map:ulu_city_entrance', 'map:singapore'],
    recommendedLevel: [63, 80],
    notes: 'Ghost Ship prequest hub — [[npc:ralph_wanderer]] ([[quest:krexel_prequest]]).'
  },
  mysterious_path_2: {
    name: 'Mysterious Path 2',
    aliases: ['Mysterious Path II', 'MysteriousPath2'],
    region: 'singapore',
    connections: ['map:ghost_ship_2', 'map:mysterious_path_3'],
    recommendedLevel: [63, 75],
    notes: 'Pac Pinky kills for Ghost Ship prequest ([[quest:krexel_prequest]]).'
  },
  ghost_ship_2: {
    name: 'Ghost Ship 2',
    aliases: ['Ghost Ship II', 'GhostShip2'],
    region: 'singapore',
    connections: ['map:boat_quay_town', 'map:mysterious_path_2', 'map:ghost_ship_6'],
    recommendedLevel: [63, 80],
    notes: 'Slimy kills for Ghost Ship prequest ([[quest:krexel_prequest]]).'
  },
  ghost_ship_6: {
    name: 'Ghost Ship 6',
    aliases: ['Ghost Ship VI', 'GhostShip6'],
    region: 'singapore',
    connections: ['map:ghost_ship_2', 'map:engine_room'],
    recommendedLevel: [70, 85],
    notes: 'Mr. Anchor kills — [[quest:krexel_prequest]] Ghost Ship chain.'
  },
  engine_room: {
    name: 'Engine Room',
    aliases: ['Ghost Ship Engine Room', 'Engine Room Ghost Ship'],
    region: 'singapore',
    connections: ['map:ghost_ship_6'],
    recommendedLevel: [70, 85],
    notes: 'Drop [[item:white_essence]] on the door to spawn [[mob:captain_latanica]] ([[quest:krexel_prequest]]).'
  },
  ulu_city_entrance: {
    name: 'Ulu City Entrance',
    aliases: ['Ulu City Entrance Singapore', 'UluCity Entrance'],
    region: 'singapore',
    connections: [
      'map:boat_quay_town',
      'map:singapore_ulu_estate_1',
      'map:ulu_city_center',
      'map:destroyed_park_2'
    ],
    recommendedLevel: [70, 130],
    notes: '[[npc:commando_jim]] — Ulu City prequest turn-ins ([[quest:krexel_prequest]]). Berserkie for [[item:sweat_bead]].'
  },
  ulu_city_center: {
    name: 'Ulu City Center',
    aliases: ['Ulu City Centre', 'UluCity Center'],
    region: 'singapore',
    connections: ['map:ulu_city_entrance', 'map:singapore_ulu_estate_2'],
    recommendedLevel: [70, 130],
    notes: 'Petrifighter — [[item:moss_rock]] ([[quest:krexel_prequest]]).'
  },
  destroyed_park_2: {
    name: 'Destroyed Park II',
    aliases: ['Destroyed Park 2', 'Destroyed Park II', 'DestroyedPark2'],
    region: 'singapore',
    connections: ['map:ulu_city_entrance', 'map:krexels_lair'],
    recommendedLevel: [70, 130],
    notes: 'Duku — [[item:rafflesia]] ([[quest:krexel_prequest]]).'
  },
  krexels_lair: {
    name: "Krexel's Lair",
    aliases: ['Krexel Lair', 'Krexel Map', 'Krexel Boss Room'],
    region: 'singapore',
    connections: ['map:destroyed_park_2'],
    recommendedLevel: [120, 200],
    notes: 'Boss [[boss:krexel]] — requires [[item:soul_lantern]] + [[item:mallet]] to enter and summon.'
  }
});

if (maps.entities.singapore && !maps.entities.singapore.connections.includes('map:boat_quay_town')) {
  maps.entities.singapore.connections.push('map:boat_quay_town');
}
if (maps.entities.singapore_ulu_estate_1) {
  maps.entities.singapore_ulu_estate_1.notes =
    'Veetron — [[item:veetron_horn]] ([[quest:krexel_prequest]]). High-level training.';
  if (!maps.entities.singapore_ulu_estate_1.connections.includes('map:ulu_city_entrance')) {
    maps.entities.singapore_ulu_estate_1.connections.push('map:ulu_city_entrance');
  }
}
if (maps.entities.singapore_ulu_estate_2) {
  maps.entities.singapore_ulu_estate_2.notes =
    'Slygie — [[item:slygie_tail]] ([[quest:krexel_prequest]]). High-level training.';
}
if (maps.entities.singapore_ulu_estate_3) {
  maps.entities.singapore_ulu_estate_3.notes =
    'Montrecer — [[item:oil_canister]] ([[quest:krexel_prequest]]). Highest Ulu Estate map.';
}
save('database/maps.json', maps);

// --- npcs ---
const npcs = load('database/npcs.json');
Object.assign(npcs.entities, {
  ralph_wanderer: {
    name: 'Ralph the Wanderer',
    map: 'map:boat_quay_town',
    position: 'Boat Quay Town (center)',
    shop: null,
    roles: ['quest']
  },
  commando_jim: {
    name: 'Commando Jim',
    map: 'map:ulu_city_entrance',
    position: 'Ulu City Entrance',
    shop: null,
    roles: ['quest']
  }
});
save('database/npcs.json', npcs);

// --- items ---
const items = load('database/items.json');
Object.assign(items.entities, {
  soul_lantern: {
    name: 'Soul Lantern',
    type: 'etc',
    use: 'Requerido en [[quest:krexel_prequest]] — drop de [[mob:captain_latanica]] o comprable en FM (~6–9m, tradeable en Royals).',
    soldBy: []
  },
  white_essence: {
    name: 'White Essence',
    type: 'quest',
    use: 'Recompensa de Ghost Ship quest — usado para spawnear [[mob:captain_latanica]] en [[map:engine_room]] ([[quest:krexel_prequest]]).',
    soldBy: []
  },
  black_essence: {
    name: 'Black Essence',
    type: 'quest',
    use: 'Drop de [[mob:captain_latanica]] ([[quest:krexel_prequest]]).',
    soldBy: []
  },
  mallet: {
    name: 'Mallet',
    type: 'quest',
    use: 'Recompensa de Ulu City Energy Thieves — necesario para entrar a [[map:krexels_lair]] ([[quest:krexel_prequest]]).',
    soldBy: []
  },
  veetron_horn: {
    name: 'Veetron Horn',
    type: 'etc',
    use: '50 requeridos en [[quest:krexel_prequest]] — drop de [[mob:veetron]] en [[map:singapore_ulu_estate_1]].',
    soldBy: []
  },
  sweat_bead: {
    name: 'Sweat Bead',
    type: 'etc',
    use: '50 requeridos en [[quest:krexel_prequest]] — drop de [[mob:berserkie]] en [[map:ulu_city_entrance]].',
    soldBy: []
  },
  oil_canister: {
    name: 'Oil Canister',
    type: 'etc',
    use: '30 requeridos en [[quest:krexel_prequest]] — drop de [[mob:montrecer]] en [[map:singapore_ulu_estate_3]].',
    soldBy: []
  },
  slygie_tail: {
    name: 'Slygie Tail',
    type: 'etc',
    use: '100 requeridos en [[quest:krexel_prequest]] — drop de [[mob:slygie]] en [[map:singapore_ulu_estate_2]].',
    soldBy: []
  },
  moss_rock: {
    name: 'Moss Rock',
    type: 'etc',
    use: '100 requeridos en [[quest:krexel_prequest]] — drop de [[mob:petrifighter]] en [[map:ulu_city_center]].',
    soldBy: []
  },
  rafflesia: {
    name: 'Rafflesia',
    type: 'etc',
    use: '100 requeridos en [[quest:krexel_prequest]] — drop de [[mob:duku]] en [[map:destroyed_park_2]].',
    soldBy: []
  }
});
save('database/items.json', items);

// --- monsters ---
const monsters = load('database/monsters.json');
Object.assign(monsters.entities, {
  pac_pinky: {
    name: 'Pac Pinky',
    level: 63,
    hp: 8000,
    exp: 250,
    maps: ['map:mysterious_path_2'],
    drops: []
  },
  slimy: {
    name: 'Slimy',
    level: 65,
    hp: 9000,
    exp: 280,
    maps: ['map:ghost_ship_2'],
    drops: []
  },
  selkie_jr: {
    name: 'Selkie Jr.',
    level: 67,
    hp: 9500,
    exp: 300,
    maps: ['map:mysterious_path_3'],
    drops: []
  },
  mr_anchor: {
    name: 'Mr. Anchor',
    level: 70,
    hp: 12000,
    exp: 350,
    maps: ['map:ghost_ship_6'],
    drops: []
  },
  captain_latanica: {
    name: 'Captain Latanica',
    level: 75,
    hp: 500000,
    exp: 5000,
    maps: ['map:engine_room'],
    drops: [
      { item: 'item:black_essence', questOnly: true },
      { item: 'item:soul_lantern', questOnly: true }
    ]
  },
  veetron: {
    name: 'Veetron',
    level: 130,
    hp: 500000,
    exp: 8000,
    maps: ['map:singapore_ulu_estate_1', 'map:singapore_ulu_estate_2'],
    drops: [{ item: 'item:veetron_horn', questOnly: true }]
  },
  berserkie: {
    name: 'Berserkie',
    level: 70,
    hp: 15000,
    exp: 400,
    maps: ['map:ulu_city_entrance'],
    drops: [{ item: 'item:sweat_bead', questOnly: true }]
  },
  montrecer: {
    name: 'Montrecer',
    level: 140,
    hp: 600000,
    exp: 9000,
    maps: ['map:singapore_ulu_estate_3'],
    drops: [{ item: 'item:oil_canister', questOnly: true }]
  },
  slygie: {
    name: 'Slygie',
    level: 135,
    hp: 550000,
    exp: 8500,
    maps: ['map:singapore_ulu_estate_2'],
    drops: [{ item: 'item:slygie_tail', questOnly: true }]
  },
  petrifighter: {
    name: 'Petrifighter',
    level: 75,
    hp: 18000,
    exp: 450,
    maps: ['map:ulu_city_center'],
    drops: [{ item: 'item:moss_rock', questOnly: true }]
  },
  duku: {
    name: 'Duku',
    level: 80,
    hp: 25000,
    exp: 500,
    maps: ['map:destroyed_park_2'],
    drops: [{ item: 'item:rafflesia', questOnly: true }]
  },
  krexel: {
    name: 'Krexel',
    level: 120,
    hp: 50000000,
    exp: 500000,
    maps: ['map:krexels_lair'],
    drops: []
  }
});
save('database/monsters.json', monsters);

// --- quests ---
const quests = load('database/quests.json');
quests.entities.krexel_prequest = {
  name: 'Krexel Prequest (cadena completa)',
  requirements: { level: 70, job: 'any', quests: [] },
  startNpc: 'npc:ralph_wanderer',
  endNpc: 'npc:commando_jim',
  steps: [
    'Opcional: compra [[item:soul_lantern]] en FM (~6–9m, tradeable) para saltar la línea Ghost Ship.',
    'Ghost Ship: habla con [[npc:ralph_wanderer]] en [[map:boat_quay_town]] — The Secret of Ghost Ship (100 [[mob:pac_pinky]], 100 [[mob:slimy]]).',
    'Making the Path to the Sea: 120 [[mob:slimy]] en [[map:ghost_ship_2]], 120 [[mob:selkie_jr]] en [[map:mysterious_path_3]].',
    'The Great Secret Reveals: 300 [[mob:mr_anchor]] en [[map:ghost_ship_6]] → recibe [[item:white_essence]].',
    'Fight for the Future: [[map:engine_room]] — suelta [[item:white_essence]] en la puerta, mata [[mob:captain_latanica]], recoge [[item:black_essence]] + [[item:soul_lantern]].',
    'Entering Ulu City: [[item:veetron_horn]] x50, [[item:sweat_bead]] x50, [[item:oil_canister]] x30 → entrega a [[npc:commando_jim]] en [[map:ulu_city_entrance]].',
    'Pushing Forward: [[item:slygie_tail]] x100 ([[map:singapore_ulu_estate_2]]), [[item:moss_rock]] x100 ([[map:ulu_city_center]]).',
    'Ulu City Energy Thieves: 100 [[mob:duku]] + [[item:rafflesia]] x100 en [[map:destroyed_park_2]] — necesitas [[item:soul_lantern]] → recibe [[item:mallet]].',
    'Entra a [[map:krexels_lair]] con [[item:soul_lantern]] + [[item:mallet]] y derrota [[boss:krexel]].',
    'Opcional: Savior of Ulu City — acepta con [[npc:commando_jim]] y mata [[boss:krexel]] para EXP extra.'
  ],
  maps: [
    'map:boat_quay_town',
    'map:mysterious_path_2',
    'map:ghost_ship_2',
    'map:mysterious_path_3',
    'map:ghost_ship_6',
    'map:engine_room',
    'map:ulu_city_entrance',
    'map:singapore_ulu_estate_1',
    'map:singapore_ulu_estate_2',
    'map:singapore_ulu_estate_3',
    'map:ulu_city_center',
    'map:destroyed_park_2',
    'map:krexels_lair'
  ],
  items: [
    { item: 'item:soul_lantern', qty: 1 },
    { item: 'item:veetron_horn', qty: 50 },
    { item: 'item:sweat_bead', qty: 50 },
    { item: 'item:oil_canister', qty: 30 },
    { item: 'item:slygie_tail', qty: 100 },
    { item: 'item:moss_rock', qty: 100 },
    { item: 'item:rafflesia', qty: 100 }
  ],
  rewards: {
    exp: null,
    mesos: null,
    items: ['item:mallet'],
    other: 'Acceso a [[boss:krexel]] en [[map:krexels_lair]]'
  }
};
save('database/quests.json', quests);

// --- bosses ---
const bosses = load('database/bosses.json');
bosses.entities.krexel = {
  name: 'Krexel',
  map: 'map:krexels_lair',
  requirements: { level: 70 },
  recommendedLevel: 120,
  prequests: ['quest:krexel_prequest'],
  partySize: [6, 12],
  entries: { perDay: null, consumes: 'item:mallet' },
  drops: []
};
save('database/bosses.json', bosses);

// --- guides ---
const guides = load('guides.json');
if (guides.guides.some((g) => g.id === 'krexel_prequest')) {
  console.log('krexel_prequest guide already exists — skipping guide push');
} else {
  const insertAt = guides.guides.findIndex((g) => g.id === 'nlc_travel');
  const krexelGuide = {
    id: 'krexel_prequest',
    title: 'Krexel — Full Prequest',
    job: 'any',
    category: 'boss_prequest',
    steps: [
      {
        id: 'kr-01',
        type: 'travel',
        text: 'Go to Singapore → Boat Quay Town → Ralph the Wanderer. Level 70+ required. Tip: Soul Lantern is tradable on FM (~6–9m) — skip to step 6 if you buy one.',
        map: 'Boat Quay Town',
        mapRef: 'map:boat_quay_town',
        npc: 'Ralph the Wanderer',
        npcRef: 'npc:ralph_wanderer',
        questRef: 'quest:krexel_prequest',
        req: { level: 70 }
      },
      {
        id: 'kr-02',
        type: 'prequest',
        text: 'The Secret of Ghost Ship: kill 100 Pac Pinky (Mysterious Path 2) and 100 Slimy (Ghost Ship 2). Return to Ralph.',
        mapRef: 'map:mysterious_path_2',
        npcRef: 'npc:ralph_wanderer',
        questRef: 'quest:krexel_prequest',
        req: { level: 63 }
      },
      {
        id: 'kr-03',
        type: 'prequest',
        text: 'Making the Path to the Sea: kill 120 Slimy (Ghost Ship 2) and 120 Selkie Jr. (Mysterious Path 3). Return to Ralph.',
        mapRef: 'map:ghost_ship_2',
        npcRef: 'npc:ralph_wanderer',
        questRef: 'quest:krexel_prequest',
        req: { level: 63 }
      },
      {
        id: 'kr-04',
        type: 'prequest',
        text: 'The Great Secret Reveals: kill 300 Mr. Anchor in Ghost Ship 6. Keep ETC inventory space — turn-in gives White Essence.',
        mapRef: 'map:ghost_ship_6',
        npcRef: 'npc:ralph_wanderer',
        questRef: 'quest:krexel_prequest',
        itemRefs: ['item:white_essence'],
        req: { level: 70 }
      },
      {
        id: 'kr-05',
        type: 'prequest',
        text: 'Accept "Fight for the Future" before the boss fight. Engine Room — drop White Essence on the door to spawn Captain Latanica. Kill him and loot Black Essence + Soul Lantern.',
        mapRef: 'map:engine_room',
        npcRef: 'npc:ralph_wanderer',
        questRef: 'quest:krexel_prequest',
        itemRefs: ['item:white_essence', 'item:black_essence', 'item:soul_lantern'],
        req: { level: 70 }
      },
      {
        id: 'kr-06',
        type: 'collect',
        text: 'Entering Ulu City: collect Veetron Horn x50 (Ulu Estate I), Sweat Bead x50 (Berserkie, Ulu City Entrance), Oil Canister x30 (Montrecer, Ulu Estate III). Turn in to Commando Jim.',
        mapRef: 'map:ulu_city_entrance',
        npc: 'Commando Jim',
        npcRef: 'npc:commando_jim',
        questRef: 'quest:krexel_prequest',
        items: ['Veetron Horn x50', 'Sweat Bead x50', 'Oil Canister x30'],
        itemRefs: ['item:veetron_horn', 'item:sweat_bead', 'item:oil_canister'],
        req: { level: 70 }
      },
      {
        id: 'kr-07',
        type: 'collect',
        text: 'Pushing Forward in Ulu City: collect Slygie Tail x100 (Ulu Estate II) and Moss Rock x100 (Petrifighter, Ulu City Center). Return to Commando Jim.',
        mapRef: 'map:ulu_city_center',
        npcRef: 'npc:commando_jim',
        questRef: 'quest:krexel_prequest',
        items: ['Slygie Tail x100', 'Moss Rock x100'],
        itemRefs: ['item:slygie_tail', 'item:moss_rock'],
        req: { level: 70 }
      },
      {
        id: 'kr-08',
        type: 'prequest',
        text: 'Ulu City Energy Thieves: kill 100 Duku and collect Rafflesia x100 in Destroyed Park II. You need Soul Lantern in inventory — turn in to Commando Jim for the Mallet.',
        mapRef: 'map:destroyed_park_2',
        npcRef: 'npc:commando_jim',
        questRef: 'quest:krexel_prequest',
        items: ['Rafflesia x100'],
        itemRefs: ['item:rafflesia', 'item:soul_lantern', 'item:mallet'],
        req: { level: 70 }
      },
      {
        id: 'kr-09',
        type: 'complete',
        text: 'Prequest complete — you have Soul Lantern + Mallet. Enter Krexel\'s Lair from Destroyed Park II and summon the boss.',
        mapRef: 'map:krexels_lair',
        npcRef: 'npc:commando_jim',
        questRef: 'quest:krexel_prequest',
        itemRefs: ['item:soul_lantern', 'item:mallet'],
        req: { level: 70 }
      },
      {
        id: 'kr-10',
        type: 'travel',
        text: 'Run day: party Krexel with Soul Lantern + Mallet. Recommended level 120+. Coordinate with The Clinic for HP phases and seduce mechanics.',
        map: "Krexel's Lair",
        mapRef: 'map:krexels_lair',
        bossRef: 'boss:krexel',
        itemRefs: ['item:soul_lantern', 'item:mallet'],
        req: { level: 70 }
      },
      {
        id: 'kr-11',
        type: 'complete',
        text: 'Bonus: accept "Savior of Ulu City" from Commando Jim — kill Krexel and turn in for extra quest EXP.',
        npc: 'Commando Jim',
        npcRef: 'npc:commando_jim',
        questRef: 'quest:krexel_prequest',
        bossRef: 'boss:krexel',
        req: { level: 70 }
      }
    ]
  };
  if (insertAt >= 0) {
    guides.guides.splice(insertAt, 0, krexelGuide);
  } else {
    guides.guides.push(krexelGuide);
  }
  save('guides.json', guides);
}

const stepCount = guides.guides.reduce((n, g) => n + g.steps.length, 0);
console.log(`Krexel content added: ${guides.guides.length} guides, ${stepCount} steps total`);
