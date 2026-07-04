#!/usr/bin/env node
/** Validates guides.json refs against database entities. */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PREFIX = { map: 'maps', npc: 'npcs', mob: 'monsters', item: 'items', quest: 'quests', boss: 'bosses', train: 'training' };
const DB_FILES = Object.values(PREFIX);

const guides = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'guides.json'), 'utf8'));
const db = {};
for (const type of DB_FILES) {
  const j = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'database', `${type}.json`), 'utf8'));
  db[type] = j.entities || {};
}

const errors = [];
const stepIds = new Set();

for (const g of guides.guides) {
  for (const st of g.steps) {
    if (stepIds.has(st.id)) errors.push(`Duplicate step id: ${st.id}`);
    stepIds.add(st.id);
    for (const r of [st.mapRef, st.npcRef, st.questRef, st.bossRef, ...(st.itemRefs || []), ...(st.trainRefs || [])].filter(Boolean)) {
      const i = r.indexOf(':');
      const p = r.slice(0, i);
      const id = r.slice(i + 1);
      const t = PREFIX[p];
      if (!t || !db[t][id]) errors.push(`Broken ref ${g.id}/${st.id}: ${r}`);
    }
  }
}

if (errors.length) {
  console.error(`Validation FAILED (${errors.length} issues):`);
  errors.slice(0, 30).forEach((e) => console.error(' ', e));
  process.exit(1);
}
console.log(`Validation OK: ${guides.guides.length} guides, ${stepIds.size} steps, 0 broken refs`);
process.exit(0);
