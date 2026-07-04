// Maplebot — display-only quest helper. Nunca envía input al juego.

const { refName, renderTextWithLinks, loadDatabase, buildMigrationReport } = window.MaplebotDb;
const { openDbPanel } = window.MaplebotDbPanel;
const { ocrView, runOcrMatch, applyOcrHighlight } = window.MaplebotOcr;

const state = {
  guides: [],
  activeGuideId: null,
  level: 10,
  done: {},
  opacity: 1,
  favorites: {},
  recent: [],
  view: 'steps',
  libQuery: ''
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
  } catch (_) { /* corrupt state */ }
  if (!Array.isArray(state.recent)) state.recent = [];
  if (!state.favorites || typeof state.favorites !== 'object') state.favorites = {};
}

function save() {
  const { guides, view, libQuery, ...persistable } = state;
  localStorage.setItem('maplebot-state', JSON.stringify(persistable));
}

async function loadGuides() {
  const data = await window.maplebot.getGuides();
  state.guides = data.guides;
  if (!state.activeGuideId) state.activeGuideId = data.guides[0]?.id;
}

function activeGuide() {
  return state.guides.find((g) => g.id === state.activeGuideId) || state.guides[0];
}

function orderedGuides() {
  const byCat = {};
  state.guides.forEach((g) => {
    const cat = guideCategory(g);
    (byCat[cat] = byCat[cat] || []).push(g);
  });
  return Object.keys(CATEGORIES).flatMap((cat) => byCat[cat] || []);
}

function setActiveGuide(id, { toSteps = true } = {}) {
  if (!state.guides.some((g) => g.id === id)) return;
  state.activeGuideId = id;
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

function render() {
  renderSelect();
  $('#level-input').value = state.level;
  $('#btn-library').classList.toggle('active', state.view === 'library');
  document.body.classList.toggle('in-library', state.view === 'library');
  if (state.view === 'library') renderLibrary();
  else renderSteps();
}

function renderDashboard(guide) {
  const cat = guideCategory(guide);
  const p = guideProgress(guide);
  const fav = !!state.favorites[guide.id];
  const pct = p.total ? Math.round((p.done / p.total) * 100) : 0;
  $('#dash-title').textContent = guide.title;
  $('#dash-job').textContent = (guide.job || 'any').toUpperCase();
  $('#dash-cat').textContent = CATEGORIES[cat];
  $('#dash-count').textContent = `${p.done}/${p.total}`;
  $('#dash-fill').style.width = `${pct}%`;
  const favBtn = $('#dash-fav');
  favBtn.textContent = fav ? '★' : '☆';
  favBtn.classList.toggle('on', fav);
}

function renderSelect() {
  const sel = $('#guide-select');
  const byCat = {};
  state.guides.forEach((g) => {
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
}

function renderSteps() {
  const guide = activeGuide();
  if (!guide) return;
  renderDashboard(guide);
  const container = $('#steps');
  container.innerHTML = '';
  let currentMarked = false;
  let doneCount = 0;

  guide.steps.forEach((step) => {
    const status = stepStatus(step);
    if (status === 'done' || status === 'skipped') doneCount++;
    const el = document.createElement('div');
    el.className = `step ${status}`;
    el.dataset.stepId = step.id;
    if (status === 'pending' && !currentMarked) {
      el.classList.add('current');
      currentMarked = true;
    }
    const meta = [];
    const npcName = refName(step.npcRef, step.npc);
    if (npcName) meta.push(`NPC: ${npcName}`);
    const mapName = refName(step.mapRef, step.map);
    if (mapName) meta.push(mapName);
    if (step.req && step.req.level) meta.push(`Lv ${step.req.level}+`);
    if (step.itemRefs && step.itemRefs.length) {
      meta.push(step.itemRefs.map((r) => refName(r, r)).join(', '));
    } else if (step.items) meta.push(step.items.join(', '));

    el.innerHTML = `
      <div class="step-check">${status === 'done' ? '✓' : ''}</div>
      <div class="step-body">
        <span class="step-tag ${step.type}">${step.type}</span>
        <div class="step-text">${renderTextWithLinks(step.text)}</div>
        ${meta.length ? `<div class="step-meta">${meta.join(' · ')}</div>` : ''}
        ${step.maps ? `<ul class="step-maps">${step.maps.map((m) => `<li>${m}</li>`).join('')}</ul>` : ''}
      </div>`;

    el.addEventListener('click', (e) => {
      if (e.target.classList && e.target.classList.contains('db-link')) {
        openDbPanel(e.target.dataset.ref);
        return;
      }
      state.done[step.id] = !state.done[step.id];
      save();
      render();
    });
    container.appendChild(el);
  });

  $('#progress-label').textContent = `${doneCount}/${guide.steps.length} steps`;
  applyOcrHighlight(container, ocrStatus, guide);
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
  $('#progress-label').textContent = `${state.guides.length} guides`;
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
        <button class="lib-fav ${isFav ? 'on' : ''}" data-fav="${g.id}" title="Favorite">${isFav ? '★' : '☆'}</button>
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
  const matchesQuery = (g) => {
    if (!q) return true;
    const cat = guideCategory(g);
    return g.title.toLowerCase().includes(q) ||
      cat.includes(q) || CATEGORIES[cat].toLowerCase().includes(q) ||
      (g.job || '').toLowerCase().includes(q);
  };
  const matches = state.guides.filter(matchesQuery);
  if (!matches.length) {
    list.innerHTML = `<div class="lib-empty">No results for "${state.libQuery.trim()}"</div>`;
    return;
  }
  const sections = [];
  const favs = matches.filter((g) => state.favorites[g.id]);
  if (favs.length) sections.push({ label: '★ Favorites', guides: favs });
  const recents = state.recent.map((id) => matches.find((g) => g.id === id)).filter(Boolean);
  if (recents.length) sections.push({ label: 'Recent', guides: recents });
  const byCat = {};
  matches.forEach((g) => { const cat = guideCategory(g); (byCat[cat] = byCat[cat] || []).push(g); });
  Object.keys(CATEGORIES).filter((cat) => byCat[cat]).forEach((cat) =>
    sections.push({ label: CATEGORIES[cat], guides: byCat[cat] }));
  list.innerHTML = sections.map((s) =>
    `<div class="lib-cat">${s.label}</div>` + s.guides.map(libCard).join('')).join('');
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
const OCR_TOGGLE_LABELS = { off: 'OFF', starting: 'STARTING...', ready: 'READY' };
const OCR_BAR_LABELS = { off: 'OCR OFF', starting: 'OCR STARTING', ready: 'OCR READY' };

async function updateOcrCalibrationUI() {
  try {
    const cfg = await window.maplebot.getOCRConfig();
    $('#ocr-calibrate').classList.toggle('calibrated', !!cfg);
    $('#ocr-calibrate').title = cfg ? 'Recalibrate map name region' : 'Calibrate the map name region';
  } catch (_) { /* ignore */ }
}

function updateOcrUI() {
  $('#ocr-toggle-state').textContent = OCR_TOGGLE_LABELS[ocrStatus] || 'OFF';
  const toggle = $('#ocr-toggle');
  toggle.classList.toggle('starting', ocrStatus === 'starting');
  toggle.classList.toggle('on', ocrStatus === 'ready');
  $('#ocr-status').textContent = OCR_BAR_LABELS[ocrStatus] || 'OCR OFF';
  $('#ocr-map').classList.toggle('visible', ocrStatus === 'ready');
  if (ocrStatus !== 'ready') {
    document.querySelectorAll('.step.ocr-here').forEach((el) => el.classList.remove('ocr-here'));
  }
}

function onOcrResult(r) {
  const name = $('#ocr-map-name');
  const conf = $('#ocr-map-conf');
  const match = $('#ocr-map-match');
  if (r.reason === 'uncalibrated') {
    name.textContent = 'Not calibrated — use CAL';
    name.classList.add('unknown');
    conf.textContent = '';
    match.textContent = '';
    return;
  }
  if (Number.isFinite(r.confidence)) conf.textContent = `Confidence: ${r.confidence}%`;
  const detected = r.ok ? r.normalized : (r.lastValid && r.lastValid.name);
  if (!detected) {
    name.textContent = 'Unknown Map';
    name.classList.add('unknown');
    match.textContent = '';
    return;
  }
  name.classList.remove('unknown');
  name.textContent = detected;
  if (detected !== ocrView.mapName || ocrView.matchedGuideId !== state.activeGuideId) {
    ocrView.mapName = detected;
    runOcrMatch(activeGuide());
    if (state.view === 'steps') applyOcrHighlight($('#steps'), ocrStatus, activeGuide());
  }
  match.textContent = ocrView.matchedStepId ? '🟢 Map Match' : '🔴 Wrong Map';
  match.className = ocrView.matchedStepId ? 'match' : 'wrong';
}

async function toggleOcr() {
  if (ocrStatus === 'off') {
    ocrStatus = 'starting';
    updateOcrUI();
    try { await window.maplebot.startOCR(); } catch (_) { ocrStatus = 'off'; updateOcrUI(); }
  } else {
    await window.maplebot.stopOCR();
  }
}

function bindControls() {
  $('#ocr-toggle').addEventListener('click', toggleOcr);
  $('#ocr-calibrate').addEventListener('click', () => {
    window.maplebot.calibrateOCR();
    setTimeout(updateOcrCalibrationUI, 500);
  });
  window.maplebot.onOCRStatusChanged((s) => { ocrStatus = s; updateOcrUI(); });
  window.maplebot.onOCRResult(onOcrResult);
  ['wheel', 'touchmove'].forEach((ev) =>
    $('#steps').addEventListener(ev, () => { ocrView.lastUserScrollAt = Date.now(); }, { passive: true }));
  $('#guide-select').addEventListener('change', (e) => setActiveGuide(e.target.value, { toSteps: false }));
  $('#btn-prev').addEventListener('click', () => stepGuide(-1));
  $('#btn-next').addEventListener('click', () => stepGuide(1));
  $('#dash-fav').addEventListener('click', () => {
    const guide = activeGuide();
    if (!guide) return;
    if (state.favorites[guide.id]) delete state.favorites[guide.id];
    else state.favorites[guide.id] = true;
    save();
    renderDashboard(guide);
  });
  $('#level-input').addEventListener('change', (e) => {
    state.level = Math.min(200, Math.max(1, parseInt(e.target.value, 10) || 1));
    save();
    render();
  });
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
  $('#btn-quit').addEventListener('click', () => window.maplebot.quit());
  window.maplebot.onLockChanged((locked) => {
    $('#btn-lock').textContent = locked ? '🔒' : '🔓';
    $('#lock-label').textContent = locked ? 'LOCK (F8 to release)' : '';
  });
}

(async function init() {
  load();
  window.MaplebotDbPanel.bindPanel();
  window.MaplebotEditor.init({
    getState: () => state,
    getActiveGuide: activeGuide,
    editBtn: $('#btn-edit-guide'),
    newBtn: $('#btn-new-guide'),
    onSaved: (g) => { state.activeGuideId = g.id; save(); render(); }
  });
  bindControls();
  window.maplebot.setOpacity(state.opacity);
  window.maplebot.getOCRStatus().then((s) => { ocrStatus = s; updateOcrUI(); }).catch(() => {});
  updateOcrCalibrationUI();
  loadDatabase().then(() => {
    if (state.guides.length) {
      render();
      console.log('[Migration Report]', JSON.stringify(buildMigrationReport(state.guides), null, 2));
    }
  });
  try {
    await loadGuides();
    render();
  } catch (err) {
    $('#steps').innerHTML = `<div class="step"><div class="step-body"><div class="step-text">Error loading guides.json: ${err.message}</div></div></div>`;
  }
})();
