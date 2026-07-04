// Companion DB detail panel — read-only entity viewer.
(function (global) {
  const {
    dbResolve, refType, refName, renderTextWithLinks, stripRefPrefix, db
  } = global.MaplebotDb;

  let panelOpen = false;
  let onOpenLink = null;

  function esc(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function linkRef(ref, label) {
    const name = label || refName(ref, ref);
    return `<span class="db-link db-panel-link" data-ref="${esc(ref)}">${esc(name)}</span>`;
  }

  function field(label, html) {
    if (!html) return '';
    return `<div class="db-field"><span class="db-field-label">${esc(label)}</span><div class="db-field-value">${html}</div></div>`;
  }

  function renderMap(e, id) {
    const conn = (e.connections || []).map((r) => linkRef(r)).join(', ') || '—';
    const lvl = e.recommendedLevel ? `Lv ${e.recommendedLevel[0]}–${e.recommendedLevel[1]}` : '—';
    const mobs = (db.reverse.mapMonsters.get(id) || [])
      .map((mid) => linkRef(`mob:${mid}`)).join(', ') || '—';
    const npcs = (db.reverse.mapNpcs.get(stripRefPrefix(`map:${id}`)) || [])
      .map((nid) => linkRef(`npc:${nid}`)).join(', ') || '—';
    return [
      field('Region', esc(e.region || '—')),
      field('Level range', esc(lvl)),
      field('Connections', conn),
      field('Monsters', mobs),
      field('NPCs', npcs),
      field('Notes', renderTextWithLinks(e.notes || ''))
    ].join('');
  }

  function renderNpc(e) {
    return [
      field('Map', e.map ? linkRef(e.map) : '—'),
      field('Position', esc(e.position || '—')),
      field('Roles', esc((e.roles || []).join(', ') || '—')),
      field('Quests', (db.reverse.npcQuests.get(stripRefPrefix(e.map ? '' : '')) || []).join(', '))
    ].join('');
  }

  function renderNpcFull(e, id) {
    const quests = (db.reverse.npcQuests.get(id) || [])
      .map((qid) => linkRef(`quest:${qid}`)).join(', ') || '—';
    return [
      field('Map', e.map ? linkRef(e.map) : '—'),
      field('Position', esc(e.position || '—')),
      field('Roles', esc((e.roles || []).join(', ') || '—')),
      field('Quests', quests)
    ].join('');
  }

  function renderMob(e, id) {
    const maps = (e.maps || []).map((r) => linkRef(r)).join(', ') || '—';
    const drops = (e.drops || []).map((d) => {
      const item = linkRef(d.item);
      return d.questOnly ? `${item} (quest)` : item;
    }).join(', ') || '—';
    const stats = [e.level && `Lv ${e.level}`, e.hp && `HP ${e.hp}`, e.exp && `EXP ${e.exp}`].filter(Boolean).join(' · ') || '—';
    return [
      field('Stats', esc(stats)),
      field('Maps', maps),
      field('Drops', drops)
    ].join('');
  }

  function renderItem(e, id) {
    const dropped = (db.reverse.itemDroppedBy.get(id) || [])
      .map((mid) => linkRef(`mob:${mid}`)).join(', ') || '—';
    const quests = (db.reverse.itemQuests.get(id) || [])
      .map((qid) => linkRef(`quest:${qid}`)).join(', ') || '—';
    return [
      field('Type', esc(e.type || '—')),
      field('Use', renderTextWithLinks(e.use || '—')),
      field('Dropped by', dropped),
      field('Used in quests', quests)
    ].join('');
  }

  function renderQuest(e) {
    const items = (e.items || []).map((it) => `${linkRef(it.item)} ×${it.qty || 1}`).join(', ') || '—';
    const rewards = e.rewards ? [
      e.rewards.exp != null && `EXP ${e.rewards.exp}`,
      e.rewards.mesos != null && `${e.rewards.mesos} mesos`,
      ...(e.rewards.items || []).map((r) => linkRef(r)),
      e.rewards.other
    ].filter(Boolean).join(', ') : '—';
    return [
      field('Requirements', esc(
        [e.requirements?.level && `Lv ${e.requirements.level}+`,
          e.requirements?.job,
          (e.requirements?.quests || []).map((r) => refName(r, r)).join(', ')
        ].filter(Boolean).join(' · ') || '—'
      )),
      field('Start NPC', e.startNpc ? linkRef(e.startNpc) : '—'),
      field('End NPC', e.endNpc ? linkRef(e.endNpc) : '—'),
      field('Maps', (e.maps || []).map((r) => linkRef(r)).join(', ') || '—'),
      field('Items needed', items),
      field('Steps', (e.steps || []).map((s) => `<div class="db-quest-step">${renderTextWithLinks(s)}</div>`).join('') || '—'),
      field('Rewards', typeof rewards === 'string' ? esc(rewards) : rewards)
    ].join('');
  }

  function renderBoss(e) {
    return [
      field('Map', e.map ? linkRef(e.map) : '—'),
      field('Level req', esc(e.requirements?.level ? `Lv ${e.requirements.level}+` : '—')),
      field('Recommended', esc(e.recommendedLevel ? `Lv ${e.recommendedLevel}+` : '—')),
      field('Prequests', (e.prequests || []).map((r) => linkRef(r)).join(', ') || '—'),
      field('Party size', esc(e.partySize ? `${e.partySize[0]}–${e.partySize[1]}` : '—')),
      field('Entry', e.entries?.consumes ? linkRef(e.entries.consumes) : '—')
    ].join('');
  }

  function renderTrain(e) {
    return [
      field('Level range', esc(e.levelRange ? `Lv ${e.levelRange[0]}–${e.levelRange[1]}` : '—')),
      field('Maps', (e.maps || []).map((r) => linkRef(r)).join(', ') || '—'),
      field('Notes', renderTextWithLinks(e.notes || ''))
    ].join('');
  }

  function renderBody(ref, entity) {
    if (!entity) {
      return `<div class="db-empty">Not in database yet.<br><code>${esc(ref)}</code></div>`;
    }
    const type = refType(ref);
    const id = stripRefPrefix(ref);
    switch (type) {
      case 'map': return renderMap(entity, id);
      case 'npc': return renderNpcFull(entity, id);
      case 'mob': return renderMob(entity, id);
      case 'item': return renderItem(entity, id);
      case 'quest': return renderQuest(entity);
      case 'boss': return renderBoss(entity);
      case 'train': return renderTrain(entity);
      default: return `<div class="db-empty">Unknown type: ${esc(type)}</div>`;
    }
  }

  function openDbPanel(ref) {
    if (!ref) return;
    const panel = document.getElementById('db-panel');
    const entity = dbResolve(ref);
    const type = refType(ref) || 'unknown';
    document.getElementById('db-panel-type').textContent = type.toUpperCase();
    document.getElementById('db-panel-title').textContent = entity ? entity.name : ref;
    document.getElementById('db-panel-body').innerHTML = renderBody(ref, entity);
    panel.classList.add('open');
    panelOpen = true;

    panel.querySelectorAll('.db-panel-link').forEach((el) => {
      el.addEventListener('click', (ev) => {
        ev.stopPropagation();
        openDbPanel(el.dataset.ref);
      });
    });
  }

  function closeDbPanel() {
    document.getElementById('db-panel').classList.remove('open');
    panelOpen = false;
  }

  function bindPanel() {
    document.getElementById('db-panel-close').addEventListener('click', closeDbPanel);
    document.getElementById('db-panel-backdrop').addEventListener('click', closeDbPanel);
  }

  global.MaplebotDbPanel = { openDbPanel, closeDbPanel, bindPanel, isOpen: () => panelOpen };
})(window);
