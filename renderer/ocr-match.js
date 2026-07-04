// OCR map matching — display-only highlight, never auto-check.
(function (global) {
  const { normalizeMapName, findMapId, dbResolve, refName } = global.MaplebotDb;

  const DEFAULT_MATCH_THRESHOLD = 0.75;

  function getMatchThreshold() {
    try {
      const raw = localStorage.getItem('maplebot-state');
      if (!raw) return DEFAULT_MATCH_THRESHOLD;
      const pct = JSON.parse(raw).settings?.ocrMatchThreshold;
      return Number.isFinite(pct) ? pct / 100 : DEFAULT_MATCH_THRESHOLD;
    } catch (_) {
      return DEFAULT_MATCH_THRESHOLD;
    }
  }

  function stripAnnotations(s) {
    return s.replace(/\(.*?\)/g, ' ');
  }

  /** Common MapleStory bitmap-font OCR misreads */
  function repairOcrText(raw) {
    return (raw || '')
      .replace(/[|!]/g, 'I')
      .replace(/(\d)O/g, '$10')
      .replace(/O(\d)/g, '0$1')
      .replace(/\brn\b/g, 'm')
      .replace(/\bcl\b/g, 'd')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function normalizeOcrMap(s) {
    return normalizeMapName(repairOcrText(s));
  }

  function levRatio(a, b) {
    const m = a.length, n = b.length;
    if (!m || !n) return 0;
    const dp = new Array(n + 1);
    for (let j = 0; j <= n; j++) dp[j] = j;
    for (let i = 1; i <= m; i++) {
      let prev = dp[0];
      dp[0] = i;
      for (let j = 1; j <= n; j++) {
        const tmp = dp[j];
        dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
        prev = tmp;
      }
    }
    return 1 - dp[n] / Math.max(m, n);
  }

  function mapSimilarity(a, b) {
    if (!a || !b) return 0;
    if (a === b) return 1;
    if (a.includes(b) || b.includes(a)) return 0.9;
    const noSpaceA = a.replace(/ /g, '');
    const noSpaceB = b.replace(/ /g, '');
    if (noSpaceA.includes(noSpaceB) || noSpaceB.includes(noSpaceA)) return 0.88;
    return levRatio(a, b);
  }

  function resolveOcrToMapId(mapName) {
    const normalized = normalizeOcrMap(mapName);
    if (!normalized) return null;
    const id = findMapId(normalized);
    if (id) return id;
    const threshold = getMatchThreshold();
    for (const [alias, mapId] of global.MaplebotDb.db.mapAliases) {
      if (mapSimilarity(alias, normalized) >= threshold) return mapId;
    }
    return null;
  }

  function mapDisplayName(mapId) {
    if (!mapId || !global.MaplebotDb.db) return null;
    const ent = global.MaplebotDb.db.byType.maps.get(mapId);
    return ent ? ent.name : null;
  }

  function findStepForMap(mapName, guide) {
    const mapId = resolveOcrToMapId(mapName);
    const target = normalizeOcrMap(mapName);
    if (!target && !mapId) return null;
    let best = null;
    const threshold = getMatchThreshold();

    if (mapId) {
      const mapRef = `map:${mapId}`;
      for (const st of guide.steps) {
        if (st.mapRef === mapRef) {
          return { stepId: st.id, score: 1, mapId };
        }
      }
    }

    for (const st of guide.steps) {
      if (st.mapRef) {
        const ent = dbResolve(st.mapRef);
        if (ent && mapId && st.mapRef === `map:${mapId}`) {
          return { stepId: st.id, score: 1, mapId };
        }
        const name = refName(st.mapRef, st.map);
        const score = mapSimilarity(normalizeMapName(name), target);
        if (score >= threshold && (!best || score > best.score)) {
          best = { stepId: st.id, score, mapId: st.mapRef.slice(4) };
        }
      } else if (st.map) {
        const score = mapSimilarity(normalizeMapName(st.map), target);
        if (score >= threshold && (!best || score > best.score)) {
          best = { stepId: st.id, score };
        }
      }
    }
    if (best) return best;

    for (const st of guide.steps) {
      for (const m of st.maps || []) {
        const score = mapSimilarity(normalizeMapName(stripAnnotations(m)), target);
        if (score >= threshold && (!best || score > best.score)) {
          best = { stepId: st.id, score };
        }
      }
    }
    return best;
  }

  const ocrView = {
    mapName: null,
    resolvedMapId: null,
    matchedStepId: null,
    matchedGuideId: null,
    lastScrollKey: null,
    lastUserScrollAt: 0
  };

  function runOcrMatch(activeGuide) {
    ocrView.matchedGuideId = activeGuide ? activeGuide.id : null;
    ocrView.matchedStepId = null;
    ocrView.resolvedMapId = null;
    if (!activeGuide || !ocrView.mapName) return;
    ocrView.resolvedMapId = resolveOcrToMapId(ocrView.mapName);
    const hit = findStepForMap(ocrView.mapName, activeGuide);
    ocrView.matchedStepId = hit ? hit.stepId : null;
    if (hit && hit.mapId) ocrView.resolvedMapId = hit.mapId;
  }

  function applyOcrHighlight(container, ocrStatus, activeGuide) {
    if (ocrView.mapName && ocrView.matchedGuideId !== activeGuide?.id) {
      runOcrMatch(activeGuide);
    }
    container.querySelectorAll('.step.ocr-here').forEach((el) => el.classList.remove('ocr-here'));
    if (!ocrView.matchedStepId || ocrStatus !== 'ready') return;
    const el = container.querySelector(`.step[data-step-id="${ocrView.matchedStepId}"]`);
    if (!el) return;
    el.classList.add('ocr-here');
    const key = `${activeGuide?.id}|${ocrView.mapName}`;
    if (ocrView.lastScrollKey !== key) {
      ocrView.lastScrollKey = key;
      if (Date.now() - ocrView.lastUserScrollAt > 4000) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }

  function getClosestMapHints(mapName, limit = 3) {
    const normalized = normalizeOcrMap(mapName);
    if (!normalized || !global.MaplebotDb.db) return [];
    const byId = new Map();
    for (const [alias, mapId] of global.MaplebotDb.db.mapAliases) {
      const score = mapSimilarity(alias, normalized);
      const prev = byId.get(mapId);
      if (!prev || score > prev.score) {
        const ent = global.MaplebotDb.db.byType.maps.get(mapId);
        byId.set(mapId, { mapId, name: ent && ent.name, score, ref: `map:${mapId}` });
      }
    }
    return [...byId.values()]
      .filter((h) => h.score >= 0.45)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  function getClosestMapHint(mapName) {
    return getClosestMapHints(mapName, 1)[0] || null;
  }

  global.MaplebotOcr = {
    ocrView,
    repairOcrText,
    normalizeOcrMap,
    findStepForMap,
    runOcrMatch,
    applyOcrHighlight,
    resolveOcrToMapId,
    mapDisplayName,
    getClosestMapHint,
    getClosestMapHints,
    getMatchThreshold
  };
})(window);
