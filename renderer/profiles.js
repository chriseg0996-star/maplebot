// Character profiles — separate progress per character (localStorage).
(function (global) {
  function defaultProfile(name) {
    return {
      id: 'p_' + Date.now(),
      name: name || 'Adventurer',
      level: 10,
      job: 'any',
      activeGuideId: null,
      done: {},
      favorites: {},
      recent: []
    };
  }

  function normalizeState(state) {
    if (!state.profiles || !state.profiles.length) {
      const legacy = {
        level: state.level || 10,
        activeGuideId: state.activeGuideId,
        done: state.done || {},
        favorites: state.favorites || {},
        recent: state.recent || []
      };
      const p = defaultProfile('Adventurer');
      Object.assign(p, legacy);
      state.profiles = [p];
      state.activeProfileId = p.id;
    }
    if (!state.activeProfileId) state.activeProfileId = state.profiles[0].id;
    state.profiles.forEach((p) => {
      if (p.name === 'Character 1') p.name = 'Adventurer';
    });
    if (!state.settings) {
      state.settings = {
        ocrMinConfidence: 60,
        ocrFastTick: false,
        ocrDisplayId: null,
        hideSkipped: false,
        alwaysOnTopLevel: 'screen-saver'
      };
    }
    return state;
  }

  function activeProfile(state) {
    return state.profiles.find((p) => p.id === state.activeProfileId) || state.profiles[0];
  }

  function switchProfile(state, id) {
    const p = state.profiles.find((x) => x.id === id);
    if (!p) return;
    state.activeProfileId = id;
    state.level = p.level;
    state.activeGuideId = p.activeGuideId;
    state.done = p.done;
    state.favorites = p.favorites;
    state.recent = p.recent;
  }

  function syncProfile(state) {
    const p = activeProfile(state);
    if (!p) return;
    p.level = state.level;
    p.activeGuideId = state.activeGuideId;
    p.done = state.done;
    p.favorites = state.favorites;
    p.recent = state.recent;
  }

  function addProfile(state, name) {
    const p = defaultProfile(name || `Hero ${state.profiles.length + 1}`);
    state.profiles.push(p);
    switchProfile(state, p.id);
    return p;
  }

  global.MaplebotProfiles = {
    defaultProfile, normalizeState, activeProfile, switchProfile, syncProfile, addProfile
  };
})(window);
