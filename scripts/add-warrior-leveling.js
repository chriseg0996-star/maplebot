#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const guidesPath = path.join(__dirname, '..', 'data', 'guides.json');
const guides = JSON.parse(fs.readFileSync(guidesPath, 'utf8'));

if (guides.guides.some((g) => g.id === 'warrior_leveling')) {
  console.log('warrior_leveling already exists');
  process.exit(0);
}

const nlIdx = guides.guides.findIndex((g) => g.id === 'nightlord_leveling');
const insertAt = nlIdx >= 0 ? nlIdx + 1 : 1;

guides.guides.splice(insertAt, 0, {
  id: 'warrior_leveling',
  title: 'Warrior — Leveling',
  job: 'warrior',
  category: 'leveling',
  steps: [
    {
      id: 'wr-lv-01',
      type: 'grind',
      text: 'Levels 10–30: Kerning Construction Site (Octopus) and Subway B1 (Stirge).',
      grind_to: { level: 30 },
      maps: ['Kerning Construction Site', 'Subway B1'],
      trainRefs: ['train:construction_site_octopus', 'train:subway_b1_stirge'],
      req: { level: 10 }
    },
    {
      id: 'wr-lv-02',
      type: 'grind',
      text: 'Levels 30–50: Kerning PQ (21–30) and Ludi PQ (35–50) when you can party. Solo: Ant Tunnel.',
      grind_to: { level: 50 },
      maps: ['Kerning PQ', 'Ludi PQ', 'Ant Tunnel I'],
      trainRefs: ['train:kerning_pq', 'train:ludi_pq'],
      req: { level: 30 }
    },
    {
      id: 'wr-lv-03',
      type: 'grind',
      text: 'Levels 50–70: Mysterious Path 3 or Wild Kargo / Truckers.',
      grind_to: { level: 70 },
      maps: ['Mysterious Path 3', 'Wild Kargo / Truckers'],
      trainRefs: ['train:mysterious_path_3', 'train:wild_kargo_truckers'],
      req: { level: 50 }
    },
    {
      id: 'wr-lv-04',
      type: 'grind',
      text: 'Levels 70–100: Wolf Spiders in Silent Swamp.',
      grind_to: { level: 100 },
      maps: ['Silent Swamp — Wolf Spiders'],
      trainRefs: ['train:wolf_spiders'],
      req: { level: 70 }
    },
    {
      id: 'wr-lv-05',
      type: 'grind',
      text: 'Levels 100–120: Himes / Dreamy Ghosts or Gallos.',
      grind_to: { level: 120 },
      maps: ['Himes', 'Gallos'],
      trainRefs: ['train:himes', 'train:gallos'],
      req: { level: 100 }
    },
    {
      id: 'wr-lv-06',
      type: 'grind',
      text: 'Levels 120–130: Continue Himes or move toward LHC / Minar Forest.',
      grind_to: { level: 130 },
      maps: ['Himes', 'LHC entrance areas'],
      trainRefs: ['train:himes'],
      req: { level: 120 }
    },
    {
      id: 'wr-lv-07',
      type: 'grind',
      text: 'Levels 130–150: Singapore Ulu Estate I → II → III (Veetron).',
      grind_to: { level: 150 },
      maps: ['Singapore: Ulu Estate I', 'Singapore: Ulu Estate II', 'Singapore: Ulu Estate III'],
      trainRefs: ['train:singapore_ulu_estate'],
      req: { level: 130 }
    },
    {
      id: 'wr-lv-08',
      type: 'grind',
      text: 'Levels 150–200: Leech at endgame maps, boss runs, or your comfortable train map.',
      grind_to: { level: 200 },
      maps: ['Your current training map'],
      trainRefs: ['train:singapore_ulu_estate'],
      req: { level: 150 }
    }
  ]
});

guides.version = '1.5.0';
fs.writeFileSync(guidesPath, JSON.stringify(guides, null, 2) + '\n');
console.log('Added warrior_leveling guide');
