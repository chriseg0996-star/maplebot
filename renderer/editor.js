// Guide editor — create/edit guides, export/import JSON (display-only DSL).
(function (global) {
  const STEP_TYPES = ['travel', 'accept', 'complete', 'grind', 'prequest', 'collect'];
  const REF_RE = /^[a-z]+:[a-z0-9_]+$/;

  let editingGuide = null;
  let getState = null;
  let onSaved = null;

  function validateGuide(guide, allGuides, replaceId) {
    const errors = [];
    if (!guide.id || !/^[a-z0-9_]+$/.test(guide.id)) errors.push('Guide id: lowercase snake_case required');
    if (!guide.title?.trim()) errors.push('Title is required');
    if (!guide.steps?.length) errors.push('At least one step required');
    const dup = allGuides.some((g) => g.id === guide.id && g.id !== replaceId);
    if (dup) errors.push(`Guide id "${guide.id}" already exists`);
    const stepIds = new Set();
    guide.steps.forEach((st, i) => {
      if (!st.id) errors.push(`Step ${i + 1}: id required`);
      else if (stepIds.has(st.id)) errors.push(`Duplicate step id: ${st.id}`);
      else stepIds.add(st.id);
      if (!STEP_TYPES.includes(st.type)) errors.push(`Step ${st.id}: invalid type`);
      if (!st.text?.trim()) errors.push(`Step ${st.id}: text required`);
      [st.mapRef, st.npcRef, st.questRef, st.bossRef, ...(st.itemRefs || [])].filter(Boolean).forEach((r) => {
        if (!REF_RE.test(r)) errors.push(`Step ${st.id}: invalid ref "${r}"`);
        else if (global.MaplebotDb.db && global.MaplebotDb.dbResolve(r) === null) {
          errors.push(`Warning: ref "${r}" not in database`);
        }
      });
    });
    return errors;
  }

  function emptyGuide() {
    return {
      id: 'new_guide',
      title: 'New Guide',
      job: 'any',
      category: 'utility',
      steps: [{ id: 'step-01', type: 'travel', text: 'Describe this step.' }]
    };
  }

  function cloneGuide(g) {
    return JSON.parse(JSON.stringify(g));
  }

  function refPickerOptions(typePrefix) {
    const list = global.MaplebotDb.listEntities(typePrefix);
    return list.map((e) => `<option value="${e.ref}">${e.name}</option>`).join('');
  }

  function renderEditorForm() {
    const g = editingGuide;
    const cats = Object.keys({
      job_advancement: 1, boss_prequest: 1, leveling: 1, party_quest: 1, training_spots: 1, utility: 1
    });
    const stepsHtml = g.steps.map((st, idx) => `
      <div class="ed-step" data-idx="${idx}">
        <div class="ed-step-head">
          <span>Step ${idx + 1}</span>
          <button type="button" class="ed-step-up" data-idx="${idx}" title="Move up">↑</button>
          <button type="button" class="ed-step-down" data-idx="${idx}" title="Move down">↓</button>
          <button type="button" class="ed-step-del" data-idx="${idx}" title="Remove">✕</button>
        </div>
        <label>ID <input class="ed-in" data-field="id" data-idx="${idx}" value="${st.id || ''}" /></label>
        <label>Type
          <select class="ed-in" data-field="type" data-idx="${idx}">
            ${STEP_TYPES.map((t) => `<option value="${t}" ${st.type === t ? 'selected' : ''}>${t}</option>`).join('')}
          </select>
        </label>
        <label>Text <textarea class="ed-in" data-field="text" data-idx="${idx}" rows="2">${st.text || ''}</textarea></label>
        <label>Map ref
          <input class="ed-in" list="dl-maps" data-field="mapRef" data-idx="${idx}" value="${st.mapRef || ''}" placeholder="map:kerning_city" />
        </label>
        <label>NPC ref
          <input class="ed-in" list="dl-npcs" data-field="npcRef" data-idx="${idx}" value="${st.npcRef || ''}" placeholder="npc:dark_lord" />
        </label>
        <label>Req level <input class="ed-in" data-field="reqLevel" data-idx="${idx}" type="number" value="${st.req?.level || ''}" /></label>
        <label>Maps (grind, comma-sep) <input class="ed-in" data-field="maps" data-idx="${idx}" value="${(st.maps || []).join(', ')}" /></label>
      </div>`).join('');

    return `
      <datalist id="dl-maps">${refPickerOptions('map')}</datalist>
      <datalist id="dl-npcs">${refPickerOptions('npc')}</datalist>
      <div class="ed-form">
        <label>Guide ID <input id="ed-guide-id" value="${g.id}" /></label>
        <label>Title <input id="ed-guide-title" value="${g.title || ''}" /></label>
        <label>Job <input id="ed-guide-job" value="${g.job || 'any'}" /></label>
        <label>Category
          <select id="ed-guide-cat">
            ${cats.map((c) => `<option value="${c}" ${g.category === c ? 'selected' : ''}>${c}</option>`).join('')}
          </select>
        </label>
        <div id="ed-steps">${stepsHtml}</div>
        <button type="button" id="ed-add-step">+ Add step</button>
        <div id="ed-errors" class="ed-errors"></div>
        <div class="ed-actions">
          <button type="button" id="ed-save">Apply + save locally</button>
          <button type="button" id="ed-export">Export JSON</button>
          <button type="button" id="ed-import">Import JSON</button>
          <button type="button" id="ed-cancel">Cancel</button>
        </div>
      </div>`;
  }

  function readFormFromDom() {
    const g = {
      id: document.getElementById('ed-guide-id').value.trim(),
      title: document.getElementById('ed-guide-title').value.trim(),
      job: document.getElementById('ed-guide-job').value.trim() || 'any',
      category: document.getElementById('ed-guide-cat').value,
      steps: []
    };
    document.querySelectorAll('.ed-step').forEach((row) => {
      const idx = parseInt(row.dataset.idx, 10);
      const get = (field) => row.querySelector(`[data-field="${field}"]`)?.value?.trim() || '';
      const st = {
        id: get('id'),
        type: get('type'),
        text: get('text')
      };
      const mapRef = get('mapRef');
      const npcRef = get('npcRef');
      const reqLevel = parseInt(get('reqLevel'), 10);
      const mapsRaw = get('maps');
      if (mapRef) st.mapRef = mapRef;
      if (npcRef) st.npcRef = npcRef;
      if (reqLevel) st.req = { level: reqLevel };
      if (mapsRaw) st.maps = mapsRaw.split(',').map((s) => s.trim()).filter(Boolean);
      g.steps.push(st);
    });
    return g;
  }

  function showErrors(errors) {
    const el = document.getElementById('ed-errors');
    el.innerHTML = errors.length
      ? errors.map((e) => `<div>${e}</div>`).join('')
      : '';
  }

  function openEditor(guide) {
    const state = getState();
    editingGuide = guide ? cloneGuide(guide) : emptyGuide();
    const replaceId = guide ? guide.id : null;
    document.getElementById('editor-modal').classList.add('open');
    document.getElementById('editor-body').innerHTML = renderEditorForm();
    bindEditorEvents(replaceId);
  }

  function closeEditor() {
    document.getElementById('editor-modal').classList.remove('open');
    editingGuide = null;
  }

  function bindEditorEvents(replaceId) {
    document.getElementById('ed-add-step').addEventListener('click', () => {
      const n = editingGuide.steps.length + 1;
      editingGuide.steps.push({ id: `step-${String(n).padStart(2, '0')}`, type: 'travel', text: '' });
      document.getElementById('editor-body').innerHTML = renderEditorForm();
      bindEditorEvents(replaceId);
    });

    document.querySelectorAll('.ed-step-del').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.idx, 10);
        editingGuide.steps.splice(idx, 1);
        document.getElementById('editor-body').innerHTML = renderEditorForm();
        bindEditorEvents(replaceId);
      });
    });

    document.querySelectorAll('.ed-step-up').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.idx, 10);
        if (idx > 0) {
          [editingGuide.steps[idx - 1], editingGuide.steps[idx]] = [editingGuide.steps[idx], editingGuide.steps[idx - 1]];
          document.getElementById('editor-body').innerHTML = renderEditorForm();
          bindEditorEvents(replaceId);
        }
      });
    });

    document.querySelectorAll('.ed-step-down').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.idx, 10);
        if (idx < editingGuide.steps.length - 1) {
          [editingGuide.steps[idx], editingGuide.steps[idx + 1]] = [editingGuide.steps[idx + 1], editingGuide.steps[idx]];
          document.getElementById('editor-body').innerHTML = renderEditorForm();
          bindEditorEvents(replaceId);
        }
      });
    });

    document.getElementById('ed-save').addEventListener('click', async () => {
      const g = readFormFromDom();
      const state = getState();
      const errors = validateGuide(g, state.guides, replaceId);
      showErrors(errors.filter((e) => !e.startsWith('Warning:')));
      if (errors.some((e) => !e.startsWith('Warning:'))) return;
      const idx = state.guides.findIndex((x) => x.id === replaceId);
      if (idx >= 0) state.guides[idx] = g;
      else state.guides.push(g);
      await window.maplebot.saveUserGuides(state.guides);
      if (onSaved) onSaved(g);
      closeEditor();
    });

    document.getElementById('ed-export').addEventListener('click', async () => {
      const g = readFormFromDom();
      const state = getState();
      const payload = { version: '1.0.0', server: 'MapleRoyals v83', guides: state.guides };
      if (!state.guides.some((x) => x.id === g.id)) payload.guides = [...state.guides, g];
      else payload.guides = state.guides.map((x) => (x.id === g.id ? g : x));
      await window.maplebot.exportGuides(payload);
    });

    document.getElementById('ed-import').addEventListener('click', async () => {
      const res = await window.maplebot.importGuides();
      if (!res.ok) return;
      const state = getState();
      res.guides.forEach((imp) => {
        const idx = state.guides.findIndex((x) => x.id === imp.id);
        if (idx >= 0) state.guides[idx] = imp;
        else state.guides.push(imp);
      });
      if (onSaved) onSaved(state.guides[0]);
      closeEditor();
    });

    document.getElementById('ed-cancel').addEventListener('click', closeEditor);
  }

  function init(opts) {
    getState = opts.getState;
    onSaved = opts.onSaved;
    document.getElementById('editor-close').addEventListener('click', closeEditor);
    document.getElementById('editor-backdrop').addEventListener('click', closeEditor);
    if (opts.editBtn) {
      opts.editBtn.addEventListener('click', () => {
        const g = opts.getActiveGuide();
        openEditor(g);
      });
    }
    if (opts.newBtn) {
      opts.newBtn.addEventListener('click', () => openEditor(null));
    }
  }

  global.MaplebotEditor = { init, openEditor, closeEditor, validateGuide };
})(window);
