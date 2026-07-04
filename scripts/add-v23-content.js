#!/usr/bin/env node
/** Add v2.3 guides + DB entities (Dark Knight, Thunder Breaker, Showa PQ). */
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
  ice_valley: {
    name: 'Ice Valley',
    aliases: ['Ice Valley Field', 'El Nath Ice Valley', 'Ice Valley I'],
    region: 'el_nath_mts',
    connections: ['map:el_nath'],
    recommendedLevel: [70, 80],
    notes: 'Door of Dimension del 3rd job Spearman ([[quest:dragon_knight_third_job]]).'
  },
  showa_town: {
    name: 'Showa Town',
    aliases: ['Showa', 'Zipangu Showa Town', 'ShowaTown'],
    region: 'zipangu',
    connections: ['map:new_leaf_city'],
    recommendedLevel: null,
    notes: 'Zipangu hub — travel from [[map:new_leaf_city]] via [[npc:spinel]] (Masteria routes).'
  },
  showa_bathhouse: {
    name: 'Showa Bathhouse',
    aliases: ['Showa PQ', 'Showa Bathhouse PQ', 'Ninja Castle Bathhouse'],
    region: 'zipangu',
    connections: ['map:showa_town'],
    recommendedLevel: [50, 70],
    notes: 'Showa Party Quest interior ([[quest:showa_pq]]). Party 2–6, levels 50–70.'
  }
});
if (maps.entities.new_leaf_city && !maps.entities.new_leaf_city.connections.includes('map:showa_town')) {
  maps.entities.new_leaf_city.connections.push('map:showa_town');
}
save('database/maps.json', maps);

// --- npcs ---
const npcs = load('database/npcs.json');
npcs.entities.ichiro = {
  name: 'Ichiro',
  map: 'map:showa_town',
  position: 'Showa Town (Bathhouse entrance)',
  shop: null,
  roles: ['quest', 'pq']
};
save('database/npcs.json', npcs);

// --- quests ---
const quests = load('database/quests.json');
Object.assign(quests.entities, {
  spearman_second_job: {
    name: '2nd Job — Spearman',
    requirements: { level: 30, job: 'warrior', quests: ['quest:fighter_first_job'] },
    startNpc: 'npc:dances_with_balrog',
    endNpc: 'npc:dances_with_balrog',
    steps: [
      'Habla con [[npc:dances_with_balrog]] en [[map:perion]] y recibe la test quest.',
      'Entra a [[map:underground_pass]] — portal en Perion.',
      'Junta 30 [[item:black_crystal|Black Crystals]] de los monstruos del test.',
      'Regresa con [[npc:dances_with_balrog]] y elige Spearman. Raise Pole Arm Mastery and Iron Body first.'
    ],
    maps: ['map:perion', 'map:underground_pass'],
    items: [{ item: 'item:black_crystal', qty: 30 }],
    rewards: { exp: null, mesos: null, items: [], other: 'Job: Spearman' }
  },
  dragon_knight_third_job: {
    name: '3rd Job — Dragon Knight',
    requirements: { level: 70, job: 'spearman', quests: ['quest:spearman_second_job'] },
    startNpc: 'npc:dances_with_balrog',
    endNpc: 'npc:tylus',
    steps: [
      'Habla con [[npc:dances_with_balrog]] en [[map:perion]], luego con [[npc:tylus]] en [[map:el_nath]].',
      'Door of Dimension en [[map:ice_valley]] — derrota al clon y obtén el Black Charm.',
      'Holy Stone quiz: 5 preguntas — ten mesos para respuestas falladas.',
      'Entrega a [[npc:tylus]] → Dragon Knight. Prioritize Dragon Roar and Power Stance.'
    ],
    maps: ['map:perion', 'map:el_nath', 'map:ice_valley'],
    items: [],
    rewards: { exp: null, mesos: null, items: [], other: 'Job: Dragon Knight' }
  },
  dark_knight_fourth_job: {
    name: '4th Job — Dark Knight',
    requirements: { level: 120, job: 'dragon_knight', quests: ['quest:dragon_knight_third_job'] },
    startNpc: 'npc:hellin',
    endNpc: 'npc:hellin',
    steps: [
      'Habla con [[npc:hellin]] en [[map:valley_of_the_antelope]] ([[map:leafre]]).',
      'Consigue [[item:heroic_star]] y [[item:heroic_pentagon]] — tradeables en Royals.',
      'Entrega a [[npc:hellin]] → Dark Knight.'
    ],
    maps: ['map:leafre', 'map:valley_of_the_antelope'],
    items: [
      { item: 'item:heroic_star', qty: 1 },
      { item: 'item:heroic_pentagon', qty: 1 }
    ],
    rewards: { exp: null, mesos: null, items: [], other: 'Job: Dark Knight' }
  },
  thunder_breaker_fourth_job: {
    name: '4th Job — Thunder Breaker',
    requirements: { level: 120, job: 'marauder', quests: ['quest:marauder_third_job'] },
    startNpc: 'npc:hellin',
    endNpc: 'npc:hellin',
    steps: [
      'Habla con [[npc:hellin]] en [[map:valley_of_the_antelope]] ([[map:leafre]]).',
      'Consigue [[item:heroic_star]] y [[item:heroic_pentagon]] — tradeables en Royals.',
      'Entrega a [[npc:hellin]] → Thunder Breaker.'
    ],
    maps: ['map:leafre', 'map:valley_of_the_antelope'],
    items: [
      { item: 'item:heroic_star', qty: 1 },
      { item: 'item:heroic_pentagon', qty: 1 }
    ],
    rewards: { exp: null, mesos: null, items: [], other: 'Job: Thunder Breaker' }
  },
  showa_pq: {
    name: 'Showa Bathhouse Party Quest',
    requirements: { level: 50, job: 'any', quests: [] },
    startNpc: 'npc:ichiro',
    endNpc: 'npc:ichiro',
    steps: [
      'Viaja a [[map:showa_town]] desde [[map:new_leaf_city]] (Masteria / Zipangu route).',
      'Forma party de 2–6 (niveles 50–70) y habla con [[npc:ichiro]] para entrar.',
      'Stage 1: elimina monstruos y recoge los scrolls repartidos en las salas.',
      'Stage 2: derrota a los jefes de cada piso y avanza por el bathhouse.',
      'Stage 3: derrota al jefe final y recoge la recompensa. Habla con [[npc:ichiro]] para re-entrar.'
    ],
    maps: ['map:showa_town', 'map:showa_bathhouse'],
    items: [],
    rewards: { exp: null, mesos: null, items: [], other: 'EXP y drops de Showa PQ' }
  }
});
save('database/quests.json', quests);

// --- training (optional grind link for showa) ---
const training = load('database/training.json');
training.entities.showa_pq_grind = {
  name: 'Showa Bathhouse PQ',
  maps: ['map:showa_bathhouse'],
  levelRange: [50, 70],
  jobs: ['any'],
  notes: 'Party PQ — good meso/EXP at 50–70 if you can find a party.'
};
save('database/training.json', training);

// --- guides ---
const guides = load('guides.json');
guides.version = '1.3.0';

const TRAIN_30 = ['train:perion_warning_street', 'train:perion_dungeon', 'train:construction_site_octopus'];
const TRAIN_70 = ['train:kerning_pq', 'train:ludi_pq', 'train:mysterious_path_3', 'train:wild_kargo_truckers'];
const TRAIN_120 = ['train:wolf_spiders', 'train:himes', 'train:gallos'];
const TRAIN_PIRATE_30 = ['train:florina_beach', 'train:nautilus_training_room', 'train:construction_site_octopus'];

guides.guides.push(
  {
    id: 'dark_knight_path',
    title: 'Dark Knight — Job Path',
    job: 'warrior',
    category: 'job_advancement',
    steps: [
      { id: 'dk-01', type: 'travel', text: "Go to Perion → Warriors' Sanctuary.", map: 'Perion', mapRef: 'map:perion', questRef: 'quest:fighter_first_job', req: { level: 10 } },
      { id: 'dk-02', type: 'accept', text: 'Talk to Dances with Balrog → 1st Job: Warrior. Requires STR 35.', npc: 'Dances with Balrog', npcRef: 'npc:dances_with_balrog', questRef: 'quest:fighter_first_job', req: { level: 10 } },
      { id: 'dk-03', type: 'grind', text: 'Grind to level 30. Suggested maps below.', grind_to: { level: 30 }, maps: ['Perion Warning Street (Slimes, Stumps)', 'Perion Dungeon (Evil Eyes, Dark Stumps)', 'Construction Site (Octopus — if leeching from KC)'], trainRefs: TRAIN_30 },
      { id: 'dk-04', type: 'prequest', text: '2nd Job: talk to Dances with Balrog, receive the test quest → Underground Pass (portal in Perion). Collect 30 Black Crystals from the test monsters.', npc: 'Dances with Balrog', npcRef: 'npc:dances_with_balrog', questRef: 'quest:spearman_second_job', mapRef: 'map:underground_pass', itemRefs: ['item:black_crystal'], req: { level: 30 } },
      { id: 'dk-05', type: 'complete', text: 'Return to Dances with Balrog → choose Spearman. Raise Pole Arm Mastery and Iron Body first.', npc: 'Dances with Balrog', npcRef: 'npc:dances_with_balrog', questRef: 'quest:spearman_second_job', req: { level: 30 } },
      { id: 'dk-06', type: 'grind', text: 'Grind to level 70.', grind_to: { level: 70 }, maps: ['Kerning PQ (21-30, in party)', 'Ludi PQ (35-50)', 'Mysterious Path 3 (55-70)', 'Wild Kargo / Truckers (55-70 alternative)'], trainRefs: TRAIN_70 },
      { id: 'dk-07', type: 'prequest', text: "3rd Job: talk to Dances with Balrog in Perion → then Tylus in El Nath. Door of Dimension (Ice Valley) → defeat Dances with Balrog's clone → Black Charm → Holy Stone quiz (5 questions, bring mesos for failed answers).", npc: 'Tylus (El Nath)', npcRef: 'npc:tylus', questRef: 'quest:dragon_knight_third_job', mapRef: 'map:ice_valley', req: { level: 70 } },
      { id: 'dk-08', type: 'complete', text: 'Turn in to Tylus → Dragon Knight. Prioritize Dragon Roar and Power Stance depending on your build.', npc: 'Tylus', npcRef: 'npc:tylus', questRef: 'quest:dragon_knight_third_job', req: { level: 70 } },
      { id: 'dk-09', type: 'grind', text: 'Grind to level 120.', grind_to: { level: 120 }, maps: ['Wolf Spiders (80-100)', 'Himes / Dreamy Ghosts (90-120, HS mule ideal)', 'Gallos (100-120 alternative)'], trainRefs: TRAIN_120 },
      { id: 'dk-10', type: 'prequest', text: '4th Job: talk to Hellin in Leafre (Valley of the Antelope). Collect Heroic Star (Manon) and Heroic Pentagon (Griffey) — drops are tradeable in Royals, you can buy them.', npc: 'Hellin (Leafre)', npcRef: 'npc:hellin', questRef: 'quest:dark_knight_fourth_job', req: { level: 120 }, items: ['Heroic Star', 'Heroic Pentagon'], itemRefs: ['item:heroic_star', 'item:heroic_pentagon'] },
      { id: 'dk-11', type: 'complete', text: 'Turn in to Hellin → Dark Knight. Buy Advanced Charge and Beholder skill books and max according to The Clinic\'s guide.', npc: 'Hellin', npcRef: 'npc:hellin', questRef: 'quest:dark_knight_fourth_job', req: { level: 120 } }
    ]
  },
  {
    id: 'thunder_breaker_path',
    title: 'Thunder Breaker — Job Path',
    job: 'pirate',
    category: 'job_advancement',
    steps: [
      { id: 'tb-01', type: 'travel', text: 'Go to Nautilus Harbor → Nautilus HQ.', map: 'Nautilus Harbor', mapRef: 'map:nautilus_harbor', questRef: 'quest:pirate_first_job', req: { level: 10 } },
      { id: 'tb-02', type: 'accept', text: 'Talk to Kyrin → 1st Job: Pirate. Requires STR 20 and DEX 20.', npc: 'Kyrin', npcRef: 'npc:kyrin', questRef: 'quest:pirate_first_job', req: { level: 10 } },
      { id: 'tb-03', type: 'grind', text: 'Grind to level 30. Suggested maps below.', grind_to: { level: 30 }, maps: ['Florina Beach (Crab, Krip)', 'Nautilus Training Room (Jr. Cellion)', 'Kerning Construction Site (Octopus — if leeching)'], trainRefs: TRAIN_PIRATE_30 },
      { id: 'tb-04', type: 'prequest', text: '2nd Job: talk to Kyrin, receive the test quest → Keru Island (portal from Nautilus). Collect 30 Black Crystals from the test monkeys and cracklers.', npc: 'Kyrin', npcRef: 'npc:kyrin', questRef: 'quest:brawler_second_job', mapRef: 'map:keru_island', itemRefs: ['item:black_crystal'], req: { level: 30 } },
      { id: 'tb-05', type: 'complete', text: 'Return to Kyrin → choose Brawler. Raise Knuckle Mastery and Corkscrew Blow first.', npc: 'Kyrin', npcRef: 'npc:kyrin', questRef: 'quest:brawler_second_job', req: { level: 30 } },
      { id: 'tb-06', type: 'grind', text: 'Grind to level 70.', grind_to: { level: 70 }, maps: ['Kerning PQ (21-30, in party)', 'Ludi PQ (35-50)', 'Mysterious Path 3 (55-70)', 'Wild Kargo / Truckers (55-70 alternative)'], trainRefs: TRAIN_70 },
      { id: 'tb-07', type: 'prequest', text: "3rd Job: talk to Kyrin in Nautilus → then Pedro in El Nath. Door of Dimension (Pirate's Door) → defeat Kyrin's clone → Black Charm → Holy Stone quiz (5 questions, bring mesos for failed answers).", npc: 'Pedro (El Nath)', npcRef: 'npc:pedro', questRef: 'quest:marauder_third_job', mapRef: 'map:pirates_door', req: { level: 70 } },
      { id: 'tb-08', type: 'complete', text: 'Turn in to Pedro → Marauder. Prioritize Energy Charge and Transformation depending on your build.', npc: 'Pedro', npcRef: 'npc:pedro', questRef: 'quest:marauder_third_job', req: { level: 70 } },
      { id: 'tb-09', type: 'grind', text: 'Grind to level 120.', grind_to: { level: 120 }, maps: ['Wolf Spiders (80-100)', 'Himes / Dreamy Ghosts (90-120, HS mule ideal)', 'Gallos (100-120 alternative)'], trainRefs: TRAIN_120 },
      { id: 'tb-10', type: 'prequest', text: '4th Job: talk to Hellin in Leafre (Valley of the Antelope). Collect Heroic Star (Manon) and Heroic Pentagon (Griffey) — drops are tradeable in Royals, you can buy them.', npc: 'Hellin (Leafre)', npcRef: 'npc:hellin', questRef: 'quest:thunder_breaker_fourth_job', req: { level: 120 }, items: ['Heroic Star', 'Heroic Pentagon'], itemRefs: ['item:heroic_star', 'item:heroic_pentagon'] },
      { id: 'tb-11', type: 'complete', text: 'Turn in to Hellin → Thunder Breaker. Buy Lightning Charge and Typhoon skill books and max according to The Clinic\'s guide.', npc: 'Hellin', npcRef: 'npc:hellin', questRef: 'quest:thunder_breaker_fourth_job', req: { level: 120 } }
    ]
  },
  {
    id: 'showa_pq',
    title: 'Showa Bathhouse PQ',
    job: 'any',
    category: 'party_quest',
    steps: [
      { id: 'spq-01', type: 'travel', text: 'Reach New Leaf City via Spinel (from any major town), then travel to Showa Town in Zipangu.', map: 'Showa Town', mapRef: 'map:showa_town', npc: 'Spinel', npcRef: 'npc:spinel', req: { level: 50 } },
      { id: 'spq-02', type: 'accept', text: 'Form a party of 2–6 (levels 50–70) and talk to Ichiro at the Bathhouse entrance to enter Showa PQ.', npc: 'Ichiro', npcRef: 'npc:ichiro', questRef: 'quest:showa_pq', mapRef: 'map:showa_bathhouse', req: { level: 50 } },
      { id: 'spq-03', type: 'collect', text: 'Stage 1: clear rooms and collect the scrolls dropped by monsters. Split up and meet at the stage exit.', mapRef: 'map:showa_bathhouse', questRef: 'quest:showa_pq' },
      { id: 'spq-04', type: 'prequest', text: 'Stage 2: defeat floor bosses and push through the bathhouse halls. Watch for invincible phases — burst when vulnerable.', mapRef: 'map:showa_bathhouse', questRef: 'quest:showa_pq' },
      { id: 'spq-05', type: 'complete', text: 'Stage 3: defeat the final boss, loot rewards, and exit. Talk to Ichiro to run again.', npc: 'Ichiro', npcRef: 'npc:ichiro', questRef: 'quest:showa_pq', mapRef: 'map:showa_bathhouse' }
    ]
  }
);

save('guides.json', guides);

const stepCount = guides.guides.reduce((n, g) => n + g.steps.length, 0);
console.log(`v2.3 content added: ${guides.guides.length} guides, ${stepCount} steps total`);
