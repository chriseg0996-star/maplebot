// Companion Database — indexes, resolve, links (display-only).
(function (global) {
  const DB_TYPE_BY_PREFIX = {
    map: 'maps', npc: 'npcs', mob: 'monsters', item: 'items',
    quest: 'quests', boss: 'bosses', train: 'training'
  };

  let dbRaw = null;
  let db = null;

  const ROMAN_SUFFIX = { i: '1', ii: '2', iii: '3', iv: '4', v: '5', vi: '6' };

  function stripRefPrefix(ref) {
    const s = String(ref);
    const i = s.indexOf(':');
    return i === -1 ? s : s.slice(i + 1);
  }

  function normalizeMapName(s) {
    let t = (s || '').toLowerCase()
      .replace(/[^a-z0-9 ]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    t = t.replace(/\b(i{1,3}|iv|vi?)$/, (m) => ROMAN_SUFFIX[m] || m);
    return t;
  }

  function buildDbIndexes(raw) {
    const idx = {
      byType: {},
      mapAliases: new Map(),
      reverse: {
        mapMonsters: new Map(),
        mapNpcs: new Map(),
        itemDroppedBy: new Map(),
        npcQuests: new Map(),
        itemQuests: new Map(),
        mapGuides: new Map()
      }
    };
    for (const type of Object.values(DB_TYPE_BY_PREFIX)) {
      const entities = (raw && raw[type] && raw[type].entities) || {};
      idx.byType[type] = new Map(Object.entries(entities));
    }
    idx.byType.maps.forEach((m, id) => {
      if (m.name) idx.mapAliases.set(normalizeMapName(m.name), id);
      (m.aliases || []).forEach((a) => idx.mapAliases.set(normalizeMapName(a), id));
    });
    const push = (map, ref, val) => {
      const k = stripRefPrefix(ref);
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(val);
    };
    idx.byType.monsters.forEach((mob, id) => {
      (mob.maps || []).forEach((ref) => push(idx.reverse.mapMonsters, ref, id));
      (mob.drops || []).forEach((d) => d && d.item && push(idx.reverse.itemDroppedBy, d.item, id));
    });
    idx.byType.npcs.forEach((npc, id) => {
      if (npc.map) push(idx.reverse.mapNpcs, npc.map, id);
    });
    idx.byType.quests.forEach((q, id) => {
      [q.startNpc, q.endNpc].forEach((ref) => ref && push(idx.reverse.npcQuests, ref, id));
      (q.items || []).forEach((it) => it && it.item && push(idx.reverse.itemQuests, it.item, id));
      ((q.rewards && q.rewards.items) || []).forEach((ref) => push(idx.reverse.itemQuests, ref, id));
    });
    return idx;
  }

  let guidesIndex = [];

  function setGuidesIndex(guides) {
    guidesIndex = guides || [];
    if (!db) return;
    db.reverse.mapGuides = new Map();
    const pushG = (ref, info) => {
      const k = stripRefPrefix(ref);
      if (!db.reverse.mapGuides.has(k)) db.reverse.mapGuides.set(k, []);
      db.reverse.mapGuides.get(k).push(info);
    };
    for (const g of guidesIndex) {
      for (const st of g.steps) {
        const info = { guideId: g.id, guideTitle: g.title, stepId: st.id, stepText: st.text };
        if (st.mapRef) pushG(st.mapRef, info);
        (st.trainRefs || []).forEach((r) => {
          const tr = dbResolve(r);
          if (tr && tr.maps) tr.maps.forEach((m) => pushG(m, info));
        });
      }
    }
  }

  function getGuidesForRef(ref) {
    if (!db || !ref) return [];
    return db.reverse.mapGuides.get(stripRefPrefix(ref)) || [];
  }

  function resolveGrindLine(line) {
    if (!db || !line) return null;
    const s = String(line).trim();
    if (s.startsWith('train:') || s.startsWith('map:')) return dbResolve(s) ? { ref: s, entity: dbResolve(s) } : null;
    const stripped = s.replace(/\(.*?\)/g, ' ').trim();
    for (const [alias, id] of db.mapAliases) {
      if (stripped.toLowerCase().includes(alias) || alias.includes(normalizeMapName(stripped))) {
        return { ref: `map:${id}`, entity: db.byType.maps.get(id) };
      }
    }
    for (const [id, t] of db.byType.training) {
      if (t.name && stripped.toLowerCase().includes(t.name.toLowerCase())) {
        return { ref: `train:${id}`, entity: t };
      }
    }
    return null;
  }

  function listEntities(typePrefix) {
    const type = DB_TYPE_BY_PREFIX[typePrefix];
    if (!db || !type || !db.byType[type]) return [];
    return [...db.byType[type].entries()].map(([id, e]) => ({
      ref: `${typePrefix}:${id}`,
      name: e.name || id
    }));
  }

  function dbResolve(ref) {
    if (!db || typeof ref !== 'string') return null;
    const i = ref.indexOf(':');
    if (i === -1) return null;
    const type = DB_TYPE_BY_PREFIX[ref.slice(0, i)];
    const id = ref.slice(i + 1);
    if (!type || !id) return null;
    return db.byType[type].get(id) || null;
  }

  function refType(ref) {
    if (!ref || typeof ref !== 'string') return null;
    const i = ref.indexOf(':');
    return i === -1 ? null : ref.slice(0, i);
  }

  function refName(ref, fallback) {
    const e = ref ? dbResolve(ref) : null;
    return (e && e.name) || fallback || null;
  }

  function parseLinks(text) {
    const s = String(text ?? '');
    const out = [];
    const re = /\[\[([a-z]+:[a-z0-9_]+)(?:\|([^\]]+))?\]\]/g;
    let last = 0;
    let m;
    while ((m = re.exec(s)) !== null) {
      if (m.index > last) out.push({ text: s.slice(last, m.index) });
      const entity = dbResolve(m[1]);
      out.push({ ref: m[1], label: m[2] || (entity && entity.name) || m[1] });
      last = m.index + m[0].length;
    }
    if (last < s.length) out.push({ text: s.slice(last) });
    return out;
  }

  function renderTextWithLinks(text, onLinkClass) {
    return parseLinks(text)
      .map((seg) => seg.ref
        ? `<span class="db-link ${onLinkClass || ''}" data-ref="${seg.ref}">${seg.label}</span>`
        : seg.text)
      .join('');
  }

  function findMapEntity(name) {
    if (!db) return null;
    const id = db.mapAliases.get(normalizeMapName(name));
    return id ? (db.byType.maps.get(id) || null) : null;
  }

  function findMapId(name) {
    if (!db) return null;
    return db.mapAliases.get(normalizeMapName(name)) || null;
  }

  async function loadDatabase() {
    try {
      dbRaw = await window.maplebot.getDatabase();
      db = buildDbIndexes(dbRaw);
    } catch (_) {
      dbRaw = null;
      db = null;
    }
  }

  function buildMigrationReport(guides) {
    const rep = {
      totalGuides: guides.length,
      totalSteps: 0,
      normalizedRefs: 0,
      legacyRefs: 0,
      coveragePct: 0,
      brokenRefs: []
    };
    for (const g of guides) {
      for (const st of g.steps) {
        rep.totalSteps++;
        const refs = [st.mapRef, st.npcRef, st.questRef, st.bossRef, ...(st.itemRefs || [])].filter(Boolean);
        refs.forEach((r) => {
          rep.normalizedRefs++;
          if (!dbResolve(r)) rep.brokenRefs.push(`${g.id}/${st.id}: ${r}`);
        });
        if (st.map && !st.mapRef) rep.legacyRefs++;
        if (st.npc && !st.npcRef) rep.legacyRefs++;
        if (st.items && !(st.itemRefs && st.itemRefs.length)) rep.legacyRefs++;
        if (st.maps) rep.legacyRefs += st.maps.length;
      }
    }
    const total = rep.normalizedRefs + rep.legacyRefs;
    rep.coveragePct = total ? Math.round((rep.normalizedRefs / total) * 100) : 100;
    return rep;
  }

  global.MaplebotDb = {
    DB_TYPE_BY_PREFIX,
    get db() { return db; },
    get dbRaw() { return dbRaw; },
    stripRefPrefix,
    normalizeMapName,
    dbResolve,
    refType,
    refName,
    parseLinks,
    renderTextWithLinks,
    findMapEntity,
    findMapId,
    loadDatabase,
    buildMigrationReport,
    setGuidesIndex,
    getGuidesForRef,
    resolveGrindLine,
    listEntities
  };
})(window);
