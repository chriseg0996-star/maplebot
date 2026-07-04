// Maplebot — display-only quest helper.
const {
  refName, renderTextWithLinks, loadDatabase, buildMigrationReport,
  setGuidesIndex, resolveGrindLine
} = window.MaplebotDb;
const { openDbPanel } = window.MaplebotDbPanel;
const { ocrView, runOcrMatch, applyOcrHighlight, getClosestMapHints, resolveOcrToMapId, mapDisplayName, extractMapCandidate, repairOcrText } = window.MaplebotOcr;
const { normalizeState, activeProfile, switchProfile, syncProfile, addProfile, renameProfile, removeProfile, importProfile } = window.MaplebotProfiles;

const state = {
  guides: [],
  activeGuideId: null,
  level: 10,
  done: {},
  opacity: 1,
  favorites: {},
  recent: [],
  view: 'steps',
  libQuery: '',
  profiles: [],
  activeProfileId: null,
  settings: {
    filterMyJob: true,
    ocrMinConfidence: 45,
    ocrFastTick: false,
    ocrDisplayId: null,
    hideSkipped: false,
    collapseCompleted: true,
    alwaysOnTopLevel: 'screen-saver',
    ocrMatchThreshold: 75
  }
};

const CATEGORIES = {
  job_advancement: 'Job Advancement',
  boss_prequest: 'Boss Prequests',
  leveling: 'Leveling',
  party_quest: 'Party Quests',
  training_spots: 'Training Spots',
  utility: 'Utility'
};

function guideCategory(g) {
  return CATEGORIES[g.category] ? g.category : 'utility';
}

const $ = (sel) => document.querySelector(sel);

function load() {
  try {
    const raw = localStorage.getItem('maplebot-state');
    if (raw) Object.assign(state, JSON.parse(raw));
  } catch (_) { /* ignore */ }
  normalizeState(state);
  switchProfile(state, state.activeProfileId);
}

function save() {
  syncProfile(state);
  const { guides, view, libQuery, ...persistable } = state;
  localStorage.setItem('maplebot-state', JSON.stringify(persistable));
}

async function loadGuides() {
  const data = await window.maplebot.getGuides();
  state.guides = data.guides;
  setGuidesIndex(state.guides);
  if (!state.activeGuideId) state.activeGuideId = data.guides[0]?.id;
}

function activeGuide() {
  return state.guides.find((g) => g.id === state.activeGuideId) || visibleGuides()[0] || state.guides[0];
}

function effectiveJob() {
  const pJob = activeProfile(state)?.job;
  if (pJob && pJob !== 'any') return pJob;
  const g = activeGuide();
  if (g?.job && g.job !== 'any') return g.job;
  return 'any';
}

function guideForProfile(g) {
  const job = effectiveJob();
  if (job !== 'any' && g.job !== 'any' && g.job !== job) return false;
  if (!state.settings.filterMyJob) return true;
  if (job === 'any') return g.job === 'any';
  return true;
}

function visibleGuides() {
  return state.guides.filter(guideForProfile);
}

function ensureActiveGuideValid() {
  const vis = visibleGuides();
  if (!vis.length) return;
  if (!vis.some((g) => g.id === state.activeGuideId)) {
    const pick = suggestGuideForJob(effectiveJob(), state.level) || vis[0].id;
    state.activeGuideId = pick;
  }
}

function suggestGuideForJob(job, level = 10) {
  const j = job && job !== 'any' ? job : effectiveJob();
  if (!j || j === 'any') return null;
  const relevant = state.guides.filter((g) => (g.job === j || g.job === 'any'));
  const leveling = relevant.filter((g) => g.category === 'leveling' && g.job === j);
  if (level >= 100 && leveling.length) return leveling[0].id;
  const jobAdv = relevant.filter((g) => g.category === 'job_advancement' && g.job === j);
  if (level < 100 && jobAdv.length) {
    const fav = jobAdv.find((g) => state.favorites[g.id]);
    if (fav) return fav.id;
    return jobAdv[0].id;
  }
  if (leveling.length) return leveling[0].id;
  const fav = relevant.find((g) => state.favorites[g.id]);
  if (fav) return fav.id;
  const recent = state.recent.find((id) => relevant.some((g) => g.id === id));
  if (recent) return recent;
  return relevant[0]?.id || null;
}

function applyJobGuideIfFresh() {
  const job = effectiveJob();
  const suggested = suggestGuideForJob(job, state.level);
  if (!suggested) return;
  const g = state.guides.find((x) => x.id === state.activeGuideId);
  const prog = g ? guideProgress(g) : { done: 0 };
  const wrongClass = g && job !== 'any' && g.job !== 'any' && g.job !== job;
  const preferLeveling = state.level >= 100 && g && g.category === 'job_advancement' &&
    g.job === job && suggested !== state.activeGuideId;
  if (wrongClass || preferLeveling || (prog.done === 0 && state.activeGuideId !== suggested)) {
    state.activeGuideId = suggested;
  }
}

function syncProfileJobFromGuide() {
  const g = activeGuide();
  const p = activeProfile(state);
  if (!g || !p || g.job === 'any') return;
  if (!p.job || p.job === 'any') p.job = g.job;
}

function orderedGuides() {
  const pool = visibleGuides();
  const byCat = {};
  pool.forEach((g) => {
    const cat = guideCategory(g);
    (byCat[cat] = byCat[cat] || []).push(g);
  });
  return Object.keys(CATEGORIES).flatMap((cat) => byCat[cat] || []);
}

function setActiveGuide(id, { toSteps = true } = {}) {
  const g = state.guides.find((x) => x.id === id);
  if (!g) return;
  state.activeGuideId = id;
  const p = activeProfile(state);
  if (p && g.job && g.job !== 'any' && (!p.job || p.job === 'any')) p.job = g.job;
  state.recent = [id, ...state.recent.filter((r) => r !== id)].slice(0, 5);
  if (toSteps) state.view = 'steps';
  save();
  animateSwap();
  render();
}

function stepGuide(dir) {
  const order = orderedGuides();
  if (!order.length) return;
  const idx = order.findIndex((g) => g.id === state.activeGuideId);
  setActiveGuide(order[(idx + dir + order.length) % order.length].id);
}

function animateSwap() {
  const c = $('#steps');
  c.classList.remove('swap');
  void c.offsetWidth;
  c.classList.add('swap');
}

function stepStatus(step) {
  if (state.done[step.id]) return 'done';
  if (step.req && step.req.level && step.type !== 'prequest' && state.level >= step.req.level + 15) {
    return 'skipped';
  }
  return 'pending';
}

function guideProgress(guide) {
  let done = 0;
  guide.steps.forEach((s) => {
    const st = stepStatus(s);
    if (st === 'done' || st === 'skipped') done++;
  });
  return { done, total: guide.steps.length };
}

function profileInitial(name) {
  const n = (name || 'A').trim();
  return (n[0] || 'A').toUpperCase();
}

let renameProfileId = null;

function renderProfileBar() {
  const p = activeProfile(state);
  if (!p) return;
  $('#profile-name').textContent = p.name;
  const lvEl = $('#profile-level');
  lvEl.textContent = p.level;
  lvEl.classList.toggle('warn', state.level <= 20);
  $('#profile-trigger').classList.toggle('open', !$('#profile-menu').classList.contains('hidden'));

  const canDelete = state.profiles.length > 1;
  const list = $('#profile-list');
  list.innerHTML = state.profiles.map((prof) => `
    <button type="button" class="profile-option ${prof.id === state.activeProfileId ? 'active' : ''}" data-id="${prof.id}">
      <span class="profile-option-name">${prof.name}</span>
      <span class="profile-option-lv">${prof.level}</span>
      <span class="profile-option-actions">
        <button type="button" class="profile-rename" data-id="${prof.id}" title="Rename">✎</button>
        ${canDelete ? `<button type="button" class="profile-delete" data-id="${prof.id}" title="Remove">×</button>` : ''}
      </span>
      ${prof.id === state.activeProfileId ? '<span class="profile-option-check">✓</span>' : ''}
    </button>`).join('');

  list.querySelectorAll('.profile-rename').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      renameProfileId = btn.dataset.id;
      const target = state.profiles.find((x) => x.id === renameProfileId);
      $('#profile-new-name').value = target ? target.name : '';
      $('#profile-new-name').focus();
      $('#btn-add-profile').textContent = 'Save';
    });
  });
  list.querySelectorAll('.profile-delete').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      syncProfile(state);
      if (removeProfile(state, btn.dataset.id)) {
        renameProfileId = null;
        $('#btn-add-profile').textContent = 'Add';
        save();
        render();
      }
    });
  });
}

function setLevel(lv) {
  state.level = Math.min(200, Math.max(1, parseInt(lv, 10) || 1));
  activeProfile(state).level = state.level;
  applyJobGuideIfFresh();
  save();
  render();
}

function openProfileMenu() {
  $('#profile-menu').classList.remove('hidden');
  $('#profile-trigger').classList.add('open');
  const p = activeProfile(state);
  if (p) {
    $('#profile-level-edit').value = p.level;
    $('#profile-job').value = p.job || 'any';
  }
  if (state.level <= 15) {
    setTimeout(() => $('#profile-level-edit').focus(), 50);
  }
}

function closeProfileMenu() {
  $('#profile-menu').classList.add('hidden');
  $('#profile-trigger').classList.remove('open');
}

function toggleProfileMenu() {
  if ($('#profile-menu').classList.contains('hidden')) openProfileMenu();
  else closeProfileMenu();
}

function renderGrindMaps(step) {
  const lines = [];
  (step.trainRefs || []).forEach((r) => {
    const name = refName(r, r);
    lines.push(`<li><span class="db-link grind-link" data-ref="${r}">${name}</span></li>`);
  });
  (step.maps || []).forEach((m) => {
    const hit = resolveGrindLine(m);
    if (hit) {
      lines.push(`<li><span class="db-link grind-link" data-ref="${hit.ref}">${m}</span></li>`);
    } else {
      lines.push(`<li>${m}</li>`);
    }
  });
  return lines.length ? `<ul class="step-maps">${lines.join('')}</ul>` : '';
}

function render() {
  ensureActiveGuideValid();
  renderProfileBar();
  $('#profile-job').value = activeProfile(state).job || 'any';
  renderSelect();
  $('#level-input').value = state.level;
  $('#btn-library').classList.toggle('active', state.view === 'library');
  document.body.classList.toggle('in-library', state.view === 'library');
  document.body.classList.toggle('play-mode', state.view === 'steps');
  if (state.view === 'library') renderLibrary();
  else renderSteps();
}

function renderGuideMeta(guide) {
  if (!guide) return;
  const p = guideProgress(guide);
  const fav = !!state.favorites[guide.id];
  $('#progress-label').textContent = `${p.done}/${p.total}`;
  const favBtn = $('#btn-fav');
  if (favBtn) {
    favBtn.textContent = fav ? '★' : '☆';
    favBtn.classList.toggle('on', fav);
  }
}

function stepMetaHtml(step) {
  const meta = [];
  const npcName = refName(step.npcRef, step.npc);
  if (npcName) meta.push(`NPC: ${npcName}`);
  const mapName = refName(step.mapRef, step.map);
  if (mapName) meta.push(mapName);
  if (step.req && step.req.level) meta.push(`Lv ${step.req.level}+`);
  if (step.itemRefs && step.itemRefs.length) {
    meta.push(step.itemRefs.map((r) => refName(r, r)).join(', '));
  } else if (step.items) meta.push(step.items.join(', '));
  return meta.length ? `<div class="step-meta">${meta.join(' · ')}</div>` : '';
}

function bindStepClick(el, step) {
  el.addEventListener('click', (e) => {
    if (e.target.classList && e.target.classList.contains('db-link')) {
      openDbPanel(e.target.dataset.ref);
      return;
    }
    state.done[step.id] = !state.done[step.id];
    save();
    render();
  });
}

function createStepEl(step, status, { variant = 'default' } = {}) {
  const el = document.createElement('div');
  el.className = `step ${status} step--${variant}`;
  el.dataset.stepId = step.id;
  const meta = variant === 'hero' ? stepMetaHtml(step) : '';
  const maps = variant === 'hero' ? renderGrindMaps(step) : '';
  el.innerHTML = `
    <div class="step-check">${status === 'done' ? '✓' : ''}</div>
    <div class="step-body">
      <div class="step-text">${renderTextWithLinks(step.text)}</div>
      ${meta}${maps}
    </div>`;
  bindStepClick(el, step);
  return el;
}

function renderSteps() {
  const guide = activeGuide();
  if (!guide) return;
  renderGuideMeta(guide);
  const container = $('#steps');
  container.innerHTML = '';
  let doneCount = 0;
  const pending = [];
  const done = [];

  guide.steps.forEach((step) => {
    const status = stepStatus(step);
    if (status === 'done' || status === 'skipped') doneCount++;
    if (state.settings.hideSkipped && status === 'skipped') return;
    if (status === 'done') done.push({ step, status });
    else pending.push({ step, status });
  });

  const showDone = state._showCompleted === true;
  const collapseDone = state.settings.collapseCompleted !== false;

  if (pending.length) {
    const hero = pending[0];
    const heroEl = createStepEl(hero.step, hero.status, { variant: 'hero' });
    heroEl.classList.add('current');
    container.appendChild(heroEl);

    const rest = pending.slice(1);
    if (rest.length) {
      const showUp = state._showUpNext === true;
      const toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'expand-btn';
      toggle.textContent = showUp ? `Hide ${rest.length} upcoming` : `${rest.length} upcoming step${rest.length > 1 ? 's' : ''}`;
      toggle.addEventListener('click', () => {
        state._showUpNext = !state._showUpNext;
        renderSteps();
      });
      container.appendChild(toggle);
      if (showUp) {
        rest.forEach(({ step, status }) => {
          container.appendChild(createStepEl(step, status, { variant: 'compact' }));
        });
      }
    }
  } else {
    const allDone = document.createElement('div');
    allDone.className = 'play-complete';
    allDone.textContent = 'Guide complete — pick another from the library (F10).';
    container.appendChild(allDone);
  }

  if (done.length && collapseDone) {
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'expand-btn';
    toggle.textContent = showDone ? `Hide ${done.length} done` : `${done.length} done`;
    toggle.addEventListener('click', () => {
      state._showCompleted = !state._showCompleted;
      renderSteps();
    });
    container.appendChild(toggle);
    if (showDone) {
      const doneBlock = document.createElement('div');
      doneBlock.className = 'completed-block';
      done.forEach(({ step, status }) => doneBlock.appendChild(createStepEl(step, status, { variant: 'compact' })));
      container.appendChild(doneBlock);
    }
  } else if (done.length) {
    done.forEach(({ step, status }) => container.appendChild(createStepEl(step, status)));
  }

  applyOcrHighlight(container, ocrStatus, guide);
}

function renderSelect() {
  const sel = $('#guide-select');
  const pool = visibleGuides();
  const byCat = {};
  pool.forEach((g) => {
    const cat = guideCategory(g);
    (byCat[cat] = byCat[cat] || []).push(g);
  });
  sel.innerHTML = Object.keys(CATEGORIES)
    .filter((cat) => byCat[cat])
    .map((cat) =>
      `<optgroup label="${CATEGORIES[cat]}">` +
      byCat[cat].map((g) =>
        `<option value="${g.id}" ${g.id === state.activeGuideId ? 'selected' : ''}>${g.title}</option>`
      ).join('') +
      '</optgroup>')
    .join('');
  $('#btn-filter-job').classList.toggle('active', !!state.settings.filterMyJob);
  const ej = effectiveJob();
  const jobLabel = ej === 'any' ? 'All' : ej.charAt(0).toUpperCase() + ej.slice(1);
  $('#btn-filter-job').textContent = state.settings.filterMyJob ? jobLabel : 'All';
  $('#btn-filter-job').title = state.settings.filterMyJob
    ? (ej === 'any'
      ? 'Set class in profile ▾ to filter (using active guide for now)'
      : `Showing ${ej} + universal guides (click for all)`)
    : 'Showing all guides (click for your class only)';
  $('#level-input').classList.toggle('level-needs-set', state.level <= 15);
  $('#level-input').title = state.level <= 15
    ? 'Set your real level — guides and suggestions use this number'
    : 'Character level';
}

function renderLibrary() {
  const container = $('#steps');
  container.innerHTML = `
    <input id="lib-search" type="text" placeholder="Search Guides..." spellcheck="false" />
    <div id="lib-list"></div>`;
  const input = $('#lib-search');
  input.value = state.libQuery;
  input.addEventListener('input', () => { state.libQuery = input.value; renderLibList(); });
  renderLibList();
  input.focus();
  const vis = visibleGuides();
  $('#progress-label').textContent = state.settings.filterMyJob
    ? `${vis.length} guides · Mine`
    : `${state.guides.length} guides`;
}

function libCard(g) {
  const cat = guideCategory(g);
  const p = guideProgress(g);
  const isActive = g.id === state.activeGuideId;
  const isFav = !!state.favorites[g.id];
  return `
    <div class="lib-guide ${isActive ? 'active' : ''}" data-id="${g.id}">
      <div class="lib-guide-top">
        <div class="lib-guide-title">${g.title}</div>
        <button class="lib-fav ${isFav ? 'on' : ''}" data-fav="${g.id}">${isFav ? '★' : '☆'}</button>
      </div>
      <div class="lib-guide-meta">
        <span class="lib-badge">${(g.job || 'any').toUpperCase()}</span>
        <span>${CATEGORIES[cat]}</span>
        ${isActive ? '<span class="lib-active">● active</span>' : ''}
        <span class="lib-progress">${p.done}/${p.total}</span>
      </div>
    </div>`;
}

function renderLibList() {
  const list = $('#lib-list');
  const q = state.libQuery.trim().toLowerCase();
  const matches = visibleGuides().filter((g) => {
    if (!q) return true;
    const cat = guideCategory(g);
    return g.title.toLowerCase().includes(q) || CATEGORIES[cat].toLowerCase().includes(q);
  });
  if (!matches.length) {
    list.innerHTML = `<div class="lib-empty">No results</div>`;
    return;
  }
  let html = '';
  if (!q && state.recent.length) {
    const visIds = new Set(visibleGuides().map((g) => g.id));
    const recentGuides = state.recent
      .map((id) => state.guides.find((g) => g.id === id))
      .filter((g) => g && visIds.has(g.id));
    if (recentGuides.length) {
      html += '<div class="lib-cat">Continue</div>' + recentGuides.map(libCard).join('');
    }
  }
  const byCat = {};
  matches.forEach((g) => { const cat = guideCategory(g); (byCat[cat] = byCat[cat] || []).push(g); });
  html += Object.keys(CATEGORIES).filter((c) => byCat[c])
    .map((c) => `<div class="lib-cat">${CATEGORIES[c]}</div>` + byCat[c].map(libCard).join('')).join('');
  list.innerHTML = html;
  list.querySelectorAll('.lib-fav').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.fav;
      if (state.favorites[id]) delete state.favorites[id];
      else state.favorites[id] = true;
      save();
      renderLibList();
    });
  });
  list.querySelectorAll('.lib-guide').forEach((el) => {
    el.addEventListener('click', () => setActiveGuide(el.dataset.id));
  });
}

let ocrStatus = 'off';

async function applyOcrSettings() {
  await window.maplebot.setOCRSettings({
    minConfidence: state.settings.ocrMinConfidence,
    fastTick: state.settings.ocrFastTick,
    displayId: state.settings.ocrDisplayId,
    intervalMs: state.settings.ocrFastTick ? 2000 : 3000
  });
}

async function loadSettingsUI() {
  const displays = await window.maplebot.getDisplays();
  const sel = $('#set-display');
  sel.innerHTML = '<option value="">Primary monitor</option>' + displays.map((d) =>
    `<option value="${d.id}" ${d.id === state.settings.ocrDisplayId ? 'selected' : ''}>${d.label}${d.primary ? ' ★' : ''}</option>`
  ).join('');
  $('#set-ocr-conf').value = state.settings.ocrMinConfidence;
  $('#set-ocr-match').value = state.settings.ocrMatchThreshold ?? 75;
  $('#set-ocr-match-val').textContent = `${state.settings.ocrMatchThreshold ?? 75}%`;
  $('#set-ocr-fast').checked = state.settings.ocrFastTick;
  $('#set-hide-skipped').checked = state.settings.hideSkipped;
  $('#set-collapse-done').checked = state.settings.collapseCompleted !== false;
  $('#set-on-top').value = state.settings.alwaysOnTopLevel;
  await applyOcrSettings();
}

function renderOcrMatchStatus(detected, confidence, nameEl, matchEl, hintEl, confEl) {
  const cleaned = repairOcrText(extractMapCandidate(detected) || detected);
  const resolvedId = resolveOcrToMapId(cleaned);
  const canonical = resolvedId ? mapDisplayName(resolvedId) : null;
  nameEl.textContent = canonical
    ? (canonical.toLowerCase() !== cleaned.toLowerCase() ? `${canonical}` : canonical)
    : cleaned;
  if (Number.isFinite(confidence)) confEl.textContent = `Confidence: ${confidence}%`;
  if (detected !== ocrView.mapName || ocrView.matchedGuideId !== state.activeGuideId) {
    ocrView.mapName = cleaned;
    runOcrMatch(activeGuide());
    if (state.view === 'steps') applyOcrHighlight($('#steps'), ocrStatus, activeGuide());
  }
  const hasMatch = !!ocrView.matchedStepId;
  if (hasMatch) {
    matchEl.textContent = '🟢 Guide step';
    matchEl.className = 'match';
    hintEl.textContent = canonical ? `Matched: ${canonical}` : '';
  } else if (resolvedId) {
    matchEl.textContent = '📍 Known map';
    matchEl.className = 'match';
    hintEl.textContent = canonical
      ? `${canonical} — not this step's train map`
      : "Known map — not this step's train map";
  } else {
    matchEl.textContent = '🔴 Unrecognized';
    matchEl.className = 'wrong';
    const hints = getClosestMapHints(detected, 2);
    hintEl.innerHTML = hints.length
      ? hints.map((h) =>
          `<span class="ocr-hint-link db-link" data-ref="${h.ref}">${h.name} (${Math.round(h.score * 100)}%)</span>`
        ).join(' · ')
      : 'No map match — redo CAL on map name (top-left of game)';
    hintEl.querySelectorAll('.ocr-hint-link').forEach((el) => {
      el.addEventListener('click', (e) => { e.stopPropagation(); openDbPanel(el.dataset.ref); });
    });
  }
}

function onOcrResult(r) {
  const name = $('#ocr-map-name');
  const conf = $('#ocr-map-conf');
  const match = $('#ocr-map-match');
  const hint = $('#ocr-map-hint');
  if (r.reason === 'uncalibrated') {
    name.textContent = 'Not calibrated — use CAL';
    name.classList.add('unknown');
    conf.textContent = '';
    match.textContent = '';
    hint.textContent = '';
    return;
  }
  if (r.reason === 'error') {
    name.textContent = 'OCR error';
    name.classList.add('unknown');
    hint.textContent = r.message || 'Capture failed — check monitor in ⚙';
    return;
  }
  if (r.skipped && r.lastValid) {
    name.classList.remove('unknown');
    renderOcrMatchStatus(r.lastValid.name, r.lastValid.confidence, name, match, hint, conf);
    return;
  }
  const softMin = Math.min(r.minConfidence ?? 45, 28);
  const stale = r.lastValid && r.lastValid.name?.length >= 2 && r.lastValid.confidence >= softMin;
  let detected = r.ok ? r.normalized : (stale ? r.lastValid.name : null);
  if (!detected && r.normalized) {
    const salvaged = extractMapCandidate(r.normalized);
    if (salvaged) detected = salvaged;
  }
  let showConf = r.ok ? r.confidence : (stale ? r.lastValid.confidence : r.confidence);
  if (!detected) {
    name.textContent = r.normalized ? `"${r.normalized.slice(0, 40)}…"` : 'No map read';
    name.classList.add('unknown');
    match.textContent = '';
    const salvagedHint = r.normalized && extractMapCandidate(r.normalized);
    if (salvagedHint) {
      name.classList.remove('unknown');
      renderOcrMatchStatus(salvagedHint, r.confidence, name, match, hint, conf);
      return;
    }
    if (r.reason === 'no_text' || (Number.isFinite(r.confidence) && r.confidence < softMin)) {
      hint.textContent = 'CAL box too big? Redo CAL — tight box on map name only (not minimap/chat)';
    } else if (r.normalized && Number.isFinite(r.confidence)) {
      hint.textContent = `Low confidence ${r.confidence}% (need ${r.minConfidence ?? 45}%) — lower slider in ⚙`;
    } else {
      hint.textContent = 'Drag CAL over the map name (top-left of game)';
    }
    if (Number.isFinite(showConf)) conf.textContent = `Confidence: ${showConf}%`;
    else conf.textContent = '';
    return;
  }
  name.classList.remove('unknown');
  renderOcrMatchStatus(detected, showConf, name, match, hint, conf);
}

function bindControls() {
  $('#profile-trigger').addEventListener('click', (e) => {
    e.stopPropagation();
    toggleProfileMenu();
  });
  document.addEventListener('click', () => closeProfileMenu());
  $('#profile-menu').addEventListener('click', (e) => {
    e.stopPropagation();
    const opt = e.target.closest('.profile-option');
    if (!opt || e.target.closest('.profile-rename, .profile-delete')) return;
    syncProfile(state);
    switchProfile(state, opt.dataset.id);
    save();
    closeProfileMenu();
    render();
  });
  $('#btn-add-profile').addEventListener('click', () => {
    const name = $('#profile-new-name').value.trim();
    if (!name) return;
    syncProfile(state);
    if (renameProfileId) {
      renameProfile(state, renameProfileId, name);
      renameProfileId = null;
      $('#btn-add-profile').textContent = 'Add';
    } else {
      addProfile(state, name);
    }
    $('#profile-new-name').value = '';
    save();
    closeProfileMenu();
    render();
  });
  $('#btn-export-profile').addEventListener('click', async () => {
    syncProfile(state);
    await window.maplebot.exportProfile(activeProfile(state));
  });
  $('#btn-import-profile').addEventListener('click', async () => {
    const res = await window.maplebot.importProfile();
    if (!res.ok || !res.profile) return;
    syncProfile(state);
    importProfile(state, res.profile);
    save();
    closeProfileMenu();
    render();
  });
  $('#profile-new-name').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') $('#btn-add-profile').click();
  });
  $('#profile-job').addEventListener('change', (e) => {
    syncProfile(state);
    activeProfile(state).job = e.target.value;
    applyJobGuideIfFresh();
    save();
    render();
  });
  $('#profile-level-edit').addEventListener('change', (e) => setLevel(e.target.value));
  $('#profile-level-edit').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { setLevel(e.target.value); closeProfileMenu(); }
  });
  $('#btn-settings').addEventListener('click', () => {
    $('#settings-panel').classList.toggle('hidden');
  });
  $('#btn-ocr-preview').addEventListener('click', async () => {
    const box = $('#ocr-cal-preview');
    const img = $('#ocr-cal-preview-img');
    const txt = $('#ocr-cal-preview-text');
    txt.textContent = 'Capturing…';
    box.classList.remove('hidden');
    const r = await window.maplebot.previewOCR();
    if (!r.ok) {
      txt.textContent = r.reason === 'uncalibrated' ? 'CAL first — drag box over map name' : (r.message || 'Capture failed');
      img.removeAttribute('src');
      return;
    }
    img.src = r.image;
    txt.textContent = r.text
      ? `Read: "${r.text}" (${r.confidence}%)${r.confidence < 40 ? ' — redo CAL: box too big or wrong monitor' : ''}`
      : `No text (${r.confidence}%) — redo CAL on map name only`;
  });
  $('#set-ocr-conf').addEventListener('input', (e) => {
    state.settings.ocrMinConfidence = parseInt(e.target.value, 10);
    save();
    applyOcrSettings();
  });
  $('#set-ocr-match').addEventListener('input', (e) => {
    state.settings.ocrMatchThreshold = parseInt(e.target.value, 10);
    $('#set-ocr-match-val').textContent = `${state.settings.ocrMatchThreshold}%`;
    save();
    if (ocrView.mapName) {
      runOcrMatch(activeGuide());
      if (state.view === 'steps') applyOcrHighlight($('#steps'), ocrStatus, activeGuide());
      onOcrResult({ ok: true, normalized: ocrView.mapName, confidence: null, lastValid: { name: ocrView.mapName } });
    }
  });
  $('#set-ocr-fast').addEventListener('change', (e) => {
    state.settings.ocrFastTick = e.target.checked;
    save();
    applyOcrSettings();
  });
  $('#set-display').addEventListener('change', (e) => {
    state.settings.ocrDisplayId = e.target.value ? parseInt(e.target.value, 10) : null;
    save();
    applyOcrSettings();
  });
  $('#set-hide-skipped').addEventListener('change', (e) => {
    state.settings.hideSkipped = e.target.checked;
    save();
    render();
  });
  $('#set-collapse-done').addEventListener('change', (e) => {
    state.settings.collapseCompleted = e.target.checked;
    state._showCompleted = false;
    save();
    render();
  });
  $('#set-on-top').addEventListener('change', (e) => {
    state.settings.alwaysOnTopLevel = e.target.value;
    window.maplebot.setAlwaysOnTopLevel(e.target.value);
    save();
  });
  $('#btn-tray').addEventListener('click', () => window.maplebot.minimizeToTray());
  $('#btn-close').addEventListener('click', () => window.maplebot.quit());
  window.maplebot.onHotkey((action) => {
    if (action === 'cycle-guide') stepGuide(1);
    if (action === 'toggle-library') {
      state.view = state.view === 'library' ? 'steps' : 'library';
      animateSwap();
      render();
    }
  });
  $('#ocr-toggle').addEventListener('click', async () => {
    if (ocrStatus === 'off') {
      ocrStatus = 'starting';
      $('#ocr-toggle-state').textContent = 'STARTING...';
      try { await window.maplebot.startOCR(); } catch (_) { ocrStatus = 'off'; }
    } else await window.maplebot.stopOCR();
  });
  $('#ocr-calibrate').addEventListener('click', () => {
    window.maplebot.calibrateOCR(state.settings.ocrDisplayId);
    setTimeout(async () => {
      const cfg = await window.maplebot.getOCRConfig();
      $('#ocr-calibrate').classList.toggle('calibrated', !!cfg);
      if (cfg?.displayId != null && cfg.displayId !== state.settings.ocrDisplayId) {
        state.settings.ocrDisplayId = cfg.displayId;
        save();
        await loadSettingsUI();
      }
    }, 500);
  });
  window.maplebot.onOCRStatusChanged((s) => {
    ocrStatus = s;
    $('#ocr-toggle-state').textContent = s === 'ready' ? 'ON' : s === 'off' ? 'OFF' : '…';
    $('#ocr-status').textContent = s === 'ready' ? 'OCR' : '';
    document.body.classList.toggle('ocr-on', s === 'ready');
    $('#ocr-toggle').classList.toggle('on', s === 'ready');
  });
  window.maplebot.onOCRResult(onOcrResult);
  ['wheel', 'touchmove'].forEach((ev) =>
    $('#steps').addEventListener(ev, () => { ocrView.lastUserScrollAt = Date.now(); }, { passive: true }));
  $('#guide-select').addEventListener('change', (e) => setActiveGuide(e.target.value, { toSteps: false }));
  $('#btn-filter-job').addEventListener('click', () => {
    state.settings.filterMyJob = !state.settings.filterMyJob;
    ensureActiveGuideValid();
    save();
    render();
  });
  $('#btn-prev').addEventListener('click', () => stepGuide(-1));
  $('#btn-next').addEventListener('click', () => stepGuide(1));
  $('#btn-fav').addEventListener('click', () => {
    const g = activeGuide();
    if (!g) return;
    if (state.favorites[g.id]) delete state.favorites[g.id];
    else state.favorites[g.id] = true;
    save();
    renderGuideMeta(g);
  });
  $('#level-input').addEventListener('change', (e) => setLevel(e.target.value));
  $('#btn-library').addEventListener('click', () => {
    state.view = state.view === 'library' ? 'steps' : 'library';
    animateSwap();
    render();
  });
  $('#btn-opacity').addEventListener('click', () => {
    state.opacity = state.opacity > 0.45 ? state.opacity - 0.15 : 1;
    window.maplebot.setOpacity(state.opacity);
    save();
  });
  $('#btn-lock').addEventListener('click', () => window.maplebot.toggleLock());
  $('#btn-collapse').addEventListener('click', () => {
    const collapsed = document.body.classList.toggle('collapsed');
    window.maplebot.setCollapsed(collapsed, $('#titlebar').offsetHeight + 2);
  });
  window.maplebot.onLockChanged((locked) => {
    $('#btn-lock').textContent = locked ? '●' : '○';
    $('#lock-label').textContent = locked ? 'locked' : '';
  });
  bindUpdateHandlers();
}

function bindUpdateHandlers() {
  const el = $('#update-label');
  if (!el || !window.maplebot.onUpdateAvailable) return;

  window.maplebot.onUpdateAvailable(({ version }) => {
    el.classList.remove('hidden', 'downloading', 'ready');
    el.textContent = `v${version} available — click to download`;
    el.onclick = async () => {
      el.classList.add('downloading');
      el.textContent = 'Downloading update…';
      el.onclick = null;
      await window.maplebot.downloadUpdate();
    };
  });
  window.maplebot.onUpdateProgress((pct) => {
    el.classList.add('downloading');
    el.classList.remove('hidden');
    el.textContent = `Downloading ${pct}%`;
  });
  window.maplebot.onUpdateDownloaded(({ version }) => {
    el.classList.remove('downloading');
    el.classList.add('ready');
    el.textContent = `v${version} ready — restart to install`;
    el.onclick = () => window.maplebot.installUpdate();
  });
  window.maplebot.onUpdateError(() => {
    el.classList.add('hidden');
  });
}

(async function init() {
  load();
  window.MaplebotDbPanel.bindPanel();
  bindControls();
  window.maplebot.setOpacity(state.opacity);
  window.maplebot.setAlwaysOnTopLevel(state.settings.alwaysOnTopLevel);
  await loadSettingsUI();
  await loadDatabase();
  try {
    await loadGuides();
    syncProfileJobFromGuide();
    applyJobGuideIfFresh();
    render();
    console.log('[Migration]', buildMigrationReport(state.guides));
  } catch (err) {
    $('#steps').innerHTML = `<div class="step"><div class="step-body"><div class="step-text">Error: ${err.message}</div></div></div>`;
  }
})();
