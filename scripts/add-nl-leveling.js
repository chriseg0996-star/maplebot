#!/usr/bin/env node
/** Night Lord leveling guide + quest stub */
const fs = require('fs');
const path = require('path');

const guidesPath = path.join(__dirname, '..', 'data', 'guides.json');
const guides = JSON.parse(fs.readFileSync(guidesPath, 'utf8'));

if (guides.guides.some((g) => g.id === 'nightlord_leveling')) {
  console.log('nightlord_leveling already exists');
  process.exit(0);
}

guides.guides.splice(1, 0, {
  id: 'nightlord_leveling',
  title: 'Night Lord — Leveling',
  job: 'thief',
  category: 'leveling',
  steps: [
    {
      id: 'nl-lv-01',
      type: 'grind',
      text: 'Levels 10–30: Kerning Construction Site (Octopus) and Subway B1 (Stirge).',
      grind_to: { level: 30 },
      maps: ['Kerning Construction Site', 'Subway B1'],
      trainRefs: ['train:construction_site_octopus', 'train:subway_b1_stirge'],
      req: { level: 10 }
    },
    {
      id: 'nl-lv-02',
      type: 'grind',
      text: 'Levels 30–50: Party quest when you can find a party — Kerning PQ (21–30) then Ludi PQ (35–50). Solo: Ant Tunnel / Swamp.',
      grind_to: { level: 50 },
      maps: ['Kerning PQ', 'Ludi PQ', 'Ant Tunnel I'],
      trainRefs: ['train:kerning_pq', 'train:ludi_pq'],
      req: { level: 30 }
    },
    {
      id: 'nl-lv-03',
      type: 'grind',
      text: 'Levels 50–70: Mysterious Path 3 or Wild Kargo / Truckers (55–70). NL stars shine here.',
      grind_to: { level: 70 },
      maps: ['Mysterious Path 3', 'Wild Kargo / Truckers'],
      trainRefs: ['train:mysterious_path_3', 'train:wild_kargo_truckers'],
      req: { level: 50 }
    },
    {
      id: 'nl-lv-04',
      type: 'grind',
      text: 'Levels 70–100: Wolf Spiders in Silent Swamp. Steady solo EXP.',
      grind_to: { level: 100 },
      maps: ['Silent Swamp — Wolf Spiders'],
      trainRefs: ['train:wolf_spiders'],
      req: { level: 70 }
    },
    {
      id: 'nl-lv-05',
      type: 'grind',
      text: 'Levels 100–120: Himes / Dreamy Ghosts (HS mule helps). Alternative: Gallos.',
      grind_to: { level: 120 },
      maps: ['Himes', 'Gallos'],
      trainRefs: ['train:himes', 'train:gallos'],
      req: { level: 100 }
    },
    {
      id: 'nl-lv-06',
      type: 'grind',
      text: 'Levels 120–140: Continue Himes or move to LHC / Temple of Time prep maps. Boss prequest guides in library when ready.',
      grind_to: { level: 140 },
      maps: ['Himes', 'LHC entrance areas'],
      trainRefs: ['train:himes'],
      req: { level: 120 }
    },
    {
      id: 'nl-lv-07',
      type: 'grind',
      text: 'Levels 140–200: Showa PQ (50–70 party, still viable meso/EXP), leech at endgame maps, or grind at your comfortable map. Use OCR to confirm map name.',
      grind_to: { level: 200 },
      maps: ['Showa Bathhouse PQ', 'Your current training map'],
      trainRefs: ['train:showa_pq_grind'],
      req: { level: 140 }
    }
  ]
});

guides.version = '1.4.0';
fs.writeFileSync(guidesPath, JSON.stringify(guides, null, 2) + '\n');
console.log('Added nightlord_leveling guide');
