// Maplebot — display-only quest helper.
const {
  refName, renderTextWithLinks, loadDatabase, buildMigrationReport,
  setGuidesIndex, resolveGrindLine
} = window.MaplebotDb;
const { openDbPanel } = window.MaplebotDbPanel;
const { ocrView, runOcrMatch, applyOcrHighlight, getClosestMapHint } = window.MaplebotOcr;
const { normalizeState, activeProfile, switchProfile, syncProfile, addProfile } = window.MaplebotProfiles;

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
    ocrMinConfidence: 60,
    ocrFastTick: false,
    ocrDisplayId: null,
    hideSkipped: false,
    alwaysOnTopLevel: 'screen-saver'
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

function profileInitial(name) {
  const n = (name || 'A').trim();
  return (n[0] || 'A').toUpperCase();
}

function renderProfileBar() {
  const p = activeProfile(state);
  if (!p) return;
  $('#profile-avatar').textContent = profileInitial(p.name);
  $('#profile-name').textContent = p.name;
  $('#profile-level').textContent = `Lv ${p.level}`;
  $('#profile-trigger').classList.toggle('open', !$('#profile-menu').classList.contains('hidden'));

  const list = $('#profile-list');
  list.innerHTML = state.profiles.map((prof) => `
    <button type="button" class="profile-option ${prof.id === state.activeProfileId ? 'active' : ''}" data-id="${prof.id}">
      <span class="profile-option-avatar">${profileInitial(prof.name)}</span>
      <span class="profile-option-body">
        <span class="profile-option-name">${prof.name}</span>
        <span class="profile-option-lv">Level ${prof.level}</span>
      </span>
      ${prof.id === state.activeProfileId ? '<span class="profile-option-check">✓</span>' : ''}
    </button>`).join('');
}

function openProfileMenu() {
  $('#profile-menu').classList.remove('hidden');
  $('#profile-trigger').classList.add('open');
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
  renderProfileBar();
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
    if (state.settings.hideSkipped && status === 'skipped') return;

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
        ${renderGrindMaps(step)}
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
  const matches = state.guides.filter((g) => {
    if (!q) return true;
    const cat = guideCategory(g);
    return g.title.toLowerCase().includes(q) || CATEGORIES[cat].toLowerCase().includes(q);
  });
  if (!matches.length) {
    list.innerHTML = `<div class="lib-empty">No results</div>`;
    return;
  }
  const byCat = {};
  matches.forEach((g) => { const cat = guideCategory(g); (byCat[cat] = byCat[cat] || []).push(g); });
  list.innerHTML = Object.keys(CATEGORIES).filter((c) => byCat[c])
    .map((c) => `<div class="lib-cat">${CATEGORIES[c]}</div>` + byCat[c].map(libCard).join('')).join('');
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
  $('#set-ocr-fast').checked = state.settings.ocrFastTick;
  $('#set-hide-skipped').checked = state.settings.hideSkipped;
  $('#set-on-top').value = state.settings.alwaysOnTopLevel;
  await applyOcrSettings();
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
    hint.textContent = r.message || 'Capture error';
    return;
  }
  if (Number.isFinite(r.confidence)) conf.textContent = `Confidence: ${r.confidence}%`;
  const detected = r.ok ? r.normalized : (r.lastValid && r.lastValid.name);
  if (!detected) {
    name.textContent = 'Unknown Map';
    name.classList.add('unknown');
    match.textContent = '';
    hint.textContent = '';
    return;
  }
  name.classList.remove('unknown');
  name.textContent = detected;
  if (detected !== ocrView.mapName || ocrView.matchedGuideId !== state.activeGuideId) {
    ocrView.mapName = detected;
    runOcrMatch(activeGuide());
    if (state.view === 'steps') applyOcrHighlight($('#steps'), ocrStatus, activeGuide());
  }
  const hasMatch = !!ocrView.matchedStepId;
  match.textContent = hasMatch ? '🟢 Map Match' : '🔴 Wrong Map';
  match.className = hasMatch ? 'match' : 'wrong';
  if (!hasMatch) {
    const closest = getClosestMapHint(detected);
    hint.textContent = closest
      ? `Closest: ${closest.name} (${Math.round(closest.score * 100)}%)`
      : '';
  } else hint.textContent = '';
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
    if (!opt) return;
    syncProfile(state);
    switchProfile(state, opt.dataset.id);
    save();
    closeProfileMenu();
    render();
  });
  $('#btn-add-profile').addEventListener('click', () => {
    const name = $('#profile-new-name').value.trim();
    if (!name) return;
    addProfile(state, name);
    $('#profile-new-name').value = '';
    save();
    closeProfileMenu();
    render();
  });
  $('#profile-new-name').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') $('#btn-add-profile').click();
  });
  $('#btn-settings').addEventListener('click', () => {
    $('#settings-panel').classList.toggle('hidden');
  });
  $('#set-ocr-conf').addEventListener('input', (e) => {
    state.settings.ocrMinConfidence = parseInt(e.target.value, 10);
    save();
    applyOcrSettings();
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
  $('#set-on-top').addEventListener('change', (e) => {
    state.settings.alwaysOnTopLevel = e.target.value;
    window.maplebot.setAlwaysOnTopLevel(e.target.value);
    save();
  });
  $('#btn-tray').addEventListener('click', () => window.maplebot.minimizeToTray());
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
    }, 500);
  });
  window.maplebot.onOCRStatusChanged((s) => {
    ocrStatus = s;
    $('#ocr-toggle-state').textContent = s.toUpperCase();
    $('#ocr-toggle').classList.toggle('on', s === 'ready');
    $('#ocr-map').classList.toggle('visible', s === 'ready');
  });
  window.maplebot.onOCRResult(onOcrResult);
  ['wheel', 'touchmove'].forEach((ev) =>
    $('#steps').addEventListener(ev, () => { ocrView.lastUserScrollAt = Date.now(); }, { passive: true }));
  $('#guide-select').addEventListener('change', (e) => setActiveGuide(e.target.value, { toSteps: false }));
  $('#btn-prev').addEventListener('click', () => stepGuide(-1));
  $('#btn-next').addEventListener('click', () => stepGuide(1));
  $('#dash-fav').addEventListener('click', () => {
    const g = activeGuide();
    if (!g) return;
    if (state.favorites[g.id]) delete state.favorites[g.id];
    else state.favorites[g.id] = true;
    save();
    renderDashboard(g);
  });
  $('#level-input').addEventListener('change', (e) => {
    state.level = Math.min(200, Math.max(1, parseInt(e.target.value, 10) || 1));
    activeProfile(state).level = state.level;
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
  window.maplebot.onLockChanged((locked) => {
    $('#btn-lock').textContent = locked ? '🔒' : '🔓';
    $('#lock-label').textContent = locked ? 'LOCK (F8)' : '';
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
    render();
    console.log('[Migration]', buildMigrationReport(state.guides));
  } catch (err) {
    $('#steps').innerHTML = `<div class="step"><div class="step-body"><div class="step-text">Error: ${err.message}</div></div></div>`;
  }
})();
