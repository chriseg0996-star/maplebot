// OCR map matching — display-only highlight, never auto-check.
(function (global) {
  const { normalizeMapName, findMapId, dbResolve, refName } = global.MaplebotDb;

  function stripAnnotations(s) {
    return s.replace(/\(.*?\)/g, ' ');
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

  const MATCH_THRESHOLD = 0.75;

  function mapSimilarity(a, b) {
    if (!a || !b) return 0;
    if (a === b) return 1;
    if (a.includes(b) || b.includes(a)) return 0.9;
    return levRatio(a, b);
  }

  function resolveOcrToMapId(mapName) {
    const normalized = normalizeMapName(mapName);
    if (!normalized) return null;
    const id = findMapId(normalized);
    if (id) return id;
    for (const [alias, mapId] of global.MaplebotDb.db.mapAliases) {
      if (mapSimilarity(alias, normalized) >= MATCH_THRESHOLD) return mapId;
    }
    return null;
  }

  function findStepForMap(mapName, guide) {
    const mapId = resolveOcrToMapId(mapName);
    const target = normalizeMapName(mapName);
    if (!target && !mapId) return null;
    let best = null;

    if (mapId) {
      const mapRef = `map:${mapId}`;
      for (const st of guide.steps) {
        if (st.mapRef === mapRef) {
          return { stepId: st.id, score: 1 };
        }
      }
    }

    for (const st of guide.steps) {
      if (st.mapRef) {
        const ent = dbResolve(st.mapRef);
        if (ent && mapId && st.mapRef === `map:${mapId}`) {
          return { stepId: st.id, score: 1 };
        }
        const name = refName(st.mapRef, st.map);
        const score = mapSimilarity(normalizeMapName(name), target);
        if (score >= MATCH_THRESHOLD && (!best || score > best.score)) best = { stepId: st.id, score };
      } else if (st.map) {
        const score = mapSimilarity(normalizeMapName(st.map), target);
        if (score >= MATCH_THRESHOLD && (!best || score > best.score)) best = { stepId: st.id, score };
      }
    }
    if (best) return best;

    for (const st of guide.steps) {
      for (const m of st.maps || []) {
        const score = mapSimilarity(normalizeMapName(stripAnnotations(m)), target);
        if (score >= MATCH_THRESHOLD && (!best || score > best.score)) best = { stepId: st.id, score };
      }
    }
    return best;
  }

  const ocrView = {
    mapName: null,
    matchedStepId: null,
    matchedGuideId: null,
    lastScrollKey: null,
    lastUserScrollAt: 0
  };

  function runOcrMatch(activeGuide) {
    ocrView.matchedGuideId = activeGuide ? activeGuide.id : null;
    ocrView.matchedStepId = null;
    if (!activeGuide || !ocrView.mapName) return;
    const hit = findStepForMap(ocrView.mapName, activeGuide);
    ocrView.matchedStepId = hit ? hit.stepId : null;
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

  global.MaplebotOcr = {
    ocrView,
    findStepForMap,
    runOcrMatch,
    applyOcrHighlight,
    resolveOcrToMapId
  };
})(window);
