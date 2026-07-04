#!/usr/bin/env node
/** Generate OCR-friendly map aliases and merge into maps.json */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const mapsPath = path.join(ROOT, 'data', 'database', 'maps.json');

const ROMAN = { i: '1', ii: '2', iii: '3', iv: '4', v: '5', vi: '6' };

function normalizeKey(s) {
  return (s || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()
    .replace(/\b(i{1,3}|iv|vi?)$/, (m) => ROMAN[m] || m);
}

function ocrVariants(label) {
  const out = new Set();
  const base = (label || '').trim();
  if (!base) return out;

  out.add(base);
  out.add(base.replace(/['']/g, ''));
  out.add(base.replace(/\s+/g, ''));
  out.add(base.replace(/\bIII\b/g, '3').replace(/\bII\b/g, '2').replace(/\bIV\b/g, '4').replace(/\bI\b/g, '1'));

  const lower = base.toLowerCase();
  const swaps = [
    lower.replace(/o/g, '0'),
    lower.replace(/0/g, 'o'),
    lower.replace(/l/g, '1'),
    lower.replace(/i/g, '1'),
    lower.replace(/rn/g, 'm'),
    lower.replace(/vv/g, 'w'),
    lower.replace(/cl/g, 'd'),
    lower.replace(/fi/g, 'fl'),
    lower.replace(/li/g, 'h'),
    lower.replace(/ /g, ''),
    lower.replace(/road/g, 'rd'),
    lower.replace(/forest/g, 'frst'),
    lower.replace(/entrance/g, 'entr'),
  ];
  swaps.forEach((s) => { if (s && s !== lower) out.add(s); });

  // Title-case restore for display aliases where we had lowercase swaps
  [...out].forEach((v) => {
    if (/^[a-z0-9 ]+$/.test(v) && v !== lower) out.add(v);
  });

  return [...out].filter((v) => v.length >= 3);
}

const data = JSON.parse(fs.readFileSync(mapsPath, 'utf8'));
let added = 0;
const seen = new Set();

for (const ent of Object.values(data.entities)) {
  const existing = new Set((ent.aliases || []).map(normalizeKey));
  existing.add(normalizeKey(ent.name));
  const next = [...(ent.aliases || [])];

  for (const seed of [ent.name, ...(ent.aliases || [])]) {
    for (const v of ocrVariants(seed)) {
      const key = normalizeKey(v);
      if (!key || key.length < 3 || seen.has(`${ent.name}:${key}`) || existing.has(key)) continue;
      seen.add(`${ent.name}:${key}`);
      existing.add(key);
      next.push(v);
      added++;
    }
  }
  ent.aliases = next;
}

fs.writeFileSync(mapsPath, JSON.stringify(data, null, 2) + '\n');
console.log(`OCR alias audit: added ${added} aliases across ${Object.keys(data.entities).length} maps`);
