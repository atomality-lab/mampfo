(() => {
  'use strict';

  const CONFIG = window.MAMPFO_SUPABASE || {};
  const SESSION_KEY = 'mampfo.cloudSession.v1';
  const DEVICE_KEY = 'mampfo.deviceId.v1';
  const BASELINE_PREFIX = 'mampfo.syncBaseline.v2.';
  const CONFLICT_PREFIX = 'mampfo.syncConflicts.v2.';
  const STATUS_PREFIX = 'mampfo.syncStatus.v2.';
  const STORAGE = {
    settings: 'mampfo.settings.v2',
    entries: 'mampfo.entries.v2',
    foods: 'mampfo.savedFoods.v2',
    recipes: 'mampfo.recipes.v3',
    fastPlans: 'mampfo.fastPlans.v4',
    fastingSessions: 'mampfo.fastingSessions.v4',
    onboarded: 'mampfo.onboarded.v2',
    dataVersion: 'mampfo.dataVersion'
  };
  const TABLES = {
    entries: 'mampfo_food_entries',
    foods: 'mampfo_saved_foods',
    recipes: 'mampfo_recipes',
    fastPlans: 'mampfo_fast_plans',
    fastingSessions: 'mampfo_fasting_sessions',
    settings: 'mampfo_user_settings',
    syncState: 'mampfo_sync_state'
  };
  const COLLECTIONS = ['entries', 'foods', 'recipes', 'fastPlans', 'fastingSessions'];
  let syncPromise = null;
  let syncTimer = null;
  let appReady = false;

  function cleanUrl(value) {
    return String(value || '').trim().replace(/\/+$/, '');
  }

  function apiKey() {
    return String(CONFIG.publishableKey || CONFIG.anonKey || '').trim();
  }

  function isConfigured() {
    const url = cleanUrl(CONFIG.url);
    const key = apiKey();
    return /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(url)
      && key.length > 20
      && !/DEIN|YOUR|PROJECT/i.test(`${url} ${key}`);
  }

  function loadJson(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function saveJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
    return value;
  }

  function deepClone(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }

  function saveSession(session) {
    if (!session) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    const normalized = { ...session };
    if (!normalized.expires_at && normalized.expires_in) {
      normalized.expires_at = Math.floor(Date.now() / 1000) + Number(normalized.expires_in);
    }
    localStorage.setItem(SESSION_KEY, JSON.stringify(normalized));
    return normalized;
  }

  function session() {
    return loadJson(SESSION_KEY, null);
  }

  function currentUser() {
    return session()?.user || null;
  }

  function deviceId() {
    let id = localStorage.getItem(DEVICE_KEY);
    if (!id) {
      id = crypto.randomUUID ? crypto.randomUUID() : `device-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      localStorage.setItem(DEVICE_KEY, id);
    }
    return id;
  }

  function userKey(prefix, userId) {
    return `${prefix}${userId}`;
  }

  function messageFromPayload(payload, fallback) {
    return payload?.msg || payload?.message || payload?.error_description || payload?.error || fallback;
  }

  async function parseResponse(response) {
    const text = await response.text();
    if (!text) return null;
    try { return JSON.parse(text); } catch { return { message: text }; }
  }

  async function authRequest(path, { method = 'POST', body = null, token = null } = {}) {
    if (!isConfigured()) throw new Error('Supabase ist noch nicht konfiguriert.');
    const headers = { apikey: apiKey(), 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    let response;
    try {
      response = await fetch(`${cleanUrl(CONFIG.url)}/auth/v1/${path}`, {
        method,
        headers,
        body: body == null ? undefined : JSON.stringify(body)
      });
    } catch {
      throw new Error('Supabase ist gerade nicht erreichbar. Lokale Mampfo-Daten bleiben unverändert.');
    }
    const payload = await parseResponse(response);
    if (!response.ok) throw new Error(messageFromPayload(payload, `Supabase-Fehler ${response.status}`));
    return payload;
  }

  async function signUp(email, password) {
    const payload = await authRequest('signup', { body: { email, password } });
    if (payload?.access_token) saveSession(payload);
    return {
      session: payload?.access_token ? payload : null,
      user: payload?.user || null,
      needsConfirmation: Boolean(payload?.user && !payload?.access_token)
    };
  }

  async function signIn(email, password) {
    const payload = await authRequest('token?grant_type=password', { body: { email, password } });
    saveSession(payload);
    return payload;
  }

  async function refreshSession() {
    const current = session();
    if (!current?.refresh_token) return null;
    try {
      const payload = await authRequest('token?grant_type=refresh_token', { body: { refresh_token: current.refresh_token } });
      return saveSession(payload);
    } catch (error) {
      saveSession(null);
      throw error;
    }
  }

  async function ensureSession() {
    let current = session();
    if (!current?.access_token) return null;
    const expiresAt = Number(current.expires_at || 0);
    if (expiresAt && expiresAt <= Math.floor(Date.now() / 1000) + 60) current = await refreshSession();
    return current;
  }

  async function getUser() {
    const current = await ensureSession();
    if (!current?.access_token) return null;
    try {
      const user = await authRequest('user', { method: 'GET', token: current.access_token });
      saveSession({ ...current, user });
      return user;
    } catch (error) {
      if (/JWT|token|session|unauthor/i.test(error.message || '')) saveSession(null);
      throw error;
    }
  }

  async function signOut() {
    const current = session();
    if (current?.access_token && isConfigured()) {
      try { await authRequest('logout', { token: current.access_token, body: {} }); } catch { /* lokal trotzdem abmelden */ }
    }
    saveSession(null);
  }

  async function restRequest(table, { method = 'GET', query = '', body = null, prefer = '' } = {}) {
    const current = await ensureSession();
    if (!current?.access_token) throw new Error('Bitte zuerst bei Mampfo Cloud anmelden.');
    const headers = {
      apikey: apiKey(),
      Authorization: `Bearer ${current.access_token}`,
      'Content-Type': 'application/json'
    };
    if (prefer) headers.Prefer = prefer;
    let response;
    try {
      response = await fetch(`${cleanUrl(CONFIG.url)}/rest/v1/${table}${query}`, {
        method,
        headers,
        body: body == null ? undefined : JSON.stringify(body)
      });
    } catch {
      throw new Error('Cloud nicht erreichbar. Deine lokalen Daten wurden nicht verändert.');
    }
    const payload = await parseResponse(response);
    if (!response.ok) {
      const msg = messageFromPayload(payload, `Cloud-Fehler ${response.status}`);
      if (response.status === 404 || /relation .* does not exist|schema cache/i.test(msg)) {
        throw new Error('Die Mampfo-Cloudtabellen fehlen noch. Bitte SUPABASE_SETUP.sql im Supabase SQL Editor ausführen.');
      }
      throw new Error(msg);
    }
    return { response, payload };
  }

  async function countTable(table, column = 'record_id', filter = '') {
    const suffix = filter ? `&${filter}` : '';
    const { response, payload } = await restRequest(table, {
      query: `?select=${encodeURIComponent(column)}&limit=1${suffix}`,
      prefer: 'count=exact'
    });
    const range = response.headers.get('content-range') || '';
    const match = range.match(/\/(\d+|\*)$/);
    if (match && match[1] !== '*') return Number(match[1]);
    return Array.isArray(payload) && payload.length ? payload.length : 0;
  }

  async function cloudCounts() {
    const result = {
      entries: await countTable(TABLES.entries, 'record_id', 'deleted_at=is.null'),
      foods: await countTable(TABLES.foods, 'record_id', 'deleted_at=is.null'),
      recipes: await countTable(TABLES.recipes, 'record_id', 'deleted_at=is.null'),
      fastPlans: await countTable(TABLES.fastPlans, 'record_id', 'deleted_at=is.null'),
      fastingSessions: await countTable(TABLES.fastingSessions, 'record_id', 'deleted_at=is.null'),
      settings: await countTable(TABLES.settings, 'user_id'),
      syncState: await countTable(TABLES.syncState, 'user_id')
    };
    result.dataTotal = result.entries + result.foods + result.recipes + result.fastPlans + result.fastingSessions + result.settings;
    result.isEmpty = result.dataTotal === 0 && result.syncState === 0;
    result.isInitialized = result.syncState > 0;
    return result;
  }

  function storageSnapshot() {
    return {
      entries: loadJson(STORAGE.entries, []),
      foods: loadJson(STORAGE.foods, []),
      recipes: loadJson(STORAGE.recipes, []),
      fastPlans: loadJson(STORAGE.fastPlans, []),
      fastingSessions: loadJson(STORAGE.fastingSessions, []),
      settings: loadJson(STORAGE.settings, {}),
      onboarded: localStorage.getItem(STORAGE.onboarded) === 'yes',
      dataVersion: Number(localStorage.getItem(STORAGE.dataVersion) || 4)
    };
  }

  function localData() {
    try {
      const bridge = window.MampfoDataBridge;
      if (bridge?.snapshot) return deepClone(bridge.snapshot());
    } catch { /* LocalStorage fallback */ }
    return storageSnapshot();
  }

  function localCounts() {
    const data = localData();
    return {
      entries: data.entries.length,
      foods: data.foods.length,
      recipes: data.recipes.length,
      fastPlans: data.fastPlans.length,
      fastingSessions: data.fastingSessions.filter(item => !item.deleted).length,
      settings: 1,
      dataTotal: data.entries.length + data.foods.length + data.recipes.length + data.fastPlans.length + data.fastingSessions.filter(item => !item.deleted).length + 1
    };
  }

  function stableValue(value) {
    if (Array.isArray(value)) return value.map(stableValue);
    if (value && typeof value === 'object') {
      const result = {};
      Object.keys(value).sort().forEach(key => { result[key] = stableValue(value[key]); });
      return result;
    }
    return value;
  }

  function hashValue(value) {
    const text = JSON.stringify(stableValue(value));
    let hash = 2166136261;
    for (let i = 0; i < text.length; i += 1) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(16).padStart(8, '0');
  }

  function absentState() { return { kind: 'absent', hash: null, payload: null }; }
  function deletedState(payload = null) { return { kind: 'deleted', hash: null, payload: payload ? deepClone(payload) : null }; }
  function activeState(payload) { return { kind: 'active', hash: hashValue(payload), payload: deepClone(payload) }; }

  function stateFromRecord(record) {
    if (!record) return absentState();
    if (record.deleted) return deletedState(record);
    return activeState(record);
  }

  function stateFromRemoteRow(row) {
    if (!row) return absentState();
    if (row.deleted_at) return deletedState(row.payload || null);
    return activeState(row.payload || {});
  }

  function stateFromBaseline(entry) {
    if (!entry) return absentState();
    return entry.deleted ? deletedState() : { kind: 'active', hash: entry.hash || null, payload: null };
  }

  function statesEqual(a, b) {
    if (a.kind !== b.kind) return false;
    if (a.kind === 'active') return a.hash === b.hash;
    return true;
  }

  function baselineEntry(state) {
    if (state.kind === 'absent') return null;
    return state.kind === 'deleted' ? { deleted: true, hash: null } : { deleted: false, hash: state.hash };
  }

  function emptyBaseline(userId) {
    return {
      schema: 2,
      userId,
      collections: Object.fromEntries(COLLECTIONS.map(key => [key, {}])),
      settings: null,
      updatedAt: null
    };
  }

  function loadBaseline(userId) {
    const baseline = loadJson(userKey(BASELINE_PREFIX, userId), null);
    if (!baseline || baseline.schema !== 2 || baseline.userId !== userId) return emptyBaseline(userId);
    COLLECTIONS.forEach(key => { if (!baseline.collections?.[key]) baseline.collections[key] = {}; });
    return baseline;
  }

  function saveBaseline(userId, baseline) {
    baseline.schema = 2;
    baseline.userId = userId;
    baseline.updatedAt = new Date().toISOString();
    saveJson(userKey(BASELINE_PREFIX, userId), baseline);
  }

  function conflicts(userId = currentUser()?.id) {
    if (!userId) return [];
    return loadJson(userKey(CONFLICT_PREFIX, userId), []);
  }

  function saveConflicts(userId, items) {
    saveJson(userKey(CONFLICT_PREFIX, userId), items || []);
  }

  function syncStatus(userId = currentUser()?.id) {
    if (!userId) return null;
    return loadJson(userKey(STATUS_PREFIX, userId), null);
  }

  function setSyncStatus(userId, patch) {
    const current = syncStatus(userId) || {};
    return saveJson(userKey(STATUS_PREFIX, userId), { ...current, ...patch });
  }

  function recordRows(records, userId) {
    const now = new Date().toISOString();
    return records.map(record => ({
      user_id: userId,
      record_id: String(record.id),
      payload: record,
      record_updated_at: record.updatedAt || record.createdAt || now,
      deleted_at: record.deleted ? (record.updatedAt || now) : null,
      cloud_updated_at: now
    }));
  }

  async function upsertRows(table, rows, conflict = 'user_id,record_id') {
    const size = 100;
    for (let i = 0; i < rows.length; i += size) {
      const chunk = rows.slice(i, i + size);
      if (!chunk.length) continue;
      await restRequest(table, {
        method: 'POST',
        query: `?on_conflict=${encodeURIComponent(conflict)}`,
        body: chunk,
        prefer: 'resolution=merge-duplicates,return=minimal'
      });
    }
  }

  async function fetchAllRows(table) {
    const result = [];
    const size = 1000;
    let offset = 0;
    for (;;) {
      const { payload } = await restRequest(table, { query: `?select=*&order=record_id.asc&limit=${size}&offset=${offset}` });
      const rows = Array.isArray(payload) ? payload : [];
      result.push(...rows);
      if (rows.length < size) break;
      offset += size;
      if (offset > 100000) throw new Error('Zu viele Cloud-Datensätze für einen sicheren Abgleich.');
    }
    return result;
  }

  async function fetchSingleton(table) {
    const { payload } = await restRequest(table, { query: '?select=*&limit=1' });
    return Array.isArray(payload) && payload.length ? payload[0] : null;
  }

  async function fetchRemoteSnapshot() {
    const rows = {};
    for (const collection of COLLECTIONS) rows[collection] = await fetchAllRows(TABLES[collection]);
    rows.settings = await fetchSingleton(TABLES.settings);
    rows.syncState = await fetchSingleton(TABLES.syncState);
    return rows;
  }

  function mapLocal(records) {
    return new Map((records || []).filter(record => record?.id != null).map(record => [String(record.id), record]));
  }

  function mapRemote(rows) {
    return new Map((rows || []).map(row => [String(row.record_id), row]));
  }

  function fastingSessionSemanticHash(record) {
    if (!record || record.deleted || !record.cycleKey) return null;
    return hashValue({
      cycleKey: record.cycleKey,
      startAt: record.startAt || null,
      endAt: record.endAt || null,
      plannedEndAt: record.plannedEndAt || null,
      targetMinutes: Number(record.targetMinutes || 0),
      startSource: record.startSource || null,
      endSource: record.endSource || null
    });
  }

  function effectiveLocalState(id, localMap, baseEntry) {
    if (localMap.has(id)) return stateFromRecord(localMap.get(id));
    return baseEntry ? deletedState() : absentState();
  }

  function effectiveRemoteState(id, remoteMap, baseEntry) {
    if (remoteMap.has(id)) return stateFromRemoteRow(remoteMap.get(id));
    return baseEntry ? deletedState() : absentState();
  }

  function collectionArray(snapshot, collection) {
    return snapshot[collection] || [];
  }

  function applyStateToSnapshot(snapshot, collection, recordId, state) {
    const records = collectionArray(snapshot, collection);
    const index = records.findIndex(item => String(item.id) === String(recordId));
    if (state.kind === 'active') {
      if (index >= 0) records[index] = deepClone(state.payload);
      else records.push(deepClone(state.payload));
      return;
    }
    if (collection === 'fastingSessions' && state.kind === 'deleted') {
      const tombstone = state.payload ? { ...deepClone(state.payload), deleted: true } : (index >= 0 ? { ...records[index], deleted: true } : null);
      if (tombstone) {
        if (index >= 0) records[index] = tombstone;
        else records.push(tombstone);
      } else if (index >= 0) records.splice(index, 1);
      return;
    }
    if (index >= 0) records.splice(index, 1);
    if (collection === 'foods') {
      (snapshot.entries || []).forEach(entry => {
        if (String(entry.foodId || '') === String(recordId)) entry.foodId = null;
      });
    }
  }

  function settingsPayload(snapshot) {
    return {
      settings: deepClone(snapshot.settings || {}),
      onboarded: Boolean(snapshot.onboarded),
      dataVersion: Number(snapshot.dataVersion || 4)
    };
  }

  function applySettingsToSnapshot(snapshot, state) {
    if (state.kind !== 'active' || !state.payload) return;
    snapshot.settings = deepClone(state.payload.settings || {});
    snapshot.onboarded = Boolean(state.payload.onboarded);
    snapshot.dataVersion = Number(state.payload.dataVersion || snapshot.dataVersion || 4);
  }

  async function pushRecordState(collection, recordId, state, userId, fallbackPayload = null) {
    const now = new Date().toISOString();
    if (state.kind === 'absent') return;
    const payload = state.kind === 'active' ? state.payload : (state.payload || fallbackPayload || { id: recordId, deleted: true });
    await upsertRows(TABLES[collection], [{
      user_id: userId,
      record_id: String(recordId),
      payload,
      record_updated_at: state.kind === 'active' ? (payload.updatedAt || payload.createdAt || now) : now,
      deleted_at: state.kind === 'deleted' ? now : null,
      cloud_updated_at: now
    }]);
  }

  async function pushSettingsState(state, userId) {
    if (state.kind !== 'active') return;
    const now = new Date().toISOString();
    await upsertRows(TABLES.settings, [{
      user_id: userId,
      payload: state.payload,
      record_updated_at: now,
      cloud_updated_at: now
    }], 'user_id');
  }

  function conflictId(collection, recordId) {
    return `${collection}:${recordId}`;
  }

  function serializeConflictState(state) {
    return { kind: state.kind, hash: state.hash || null, payload: state.payload ? deepClone(state.payload) : null };
  }

  function makeConflict(collection, recordId, localState, remoteState, baseEntry) {
    return {
      id: conflictId(collection, recordId),
      collection,
      recordId: String(recordId),
      local: serializeConflictState(localState),
      remote: serializeConflictState(remoteState),
      baseline: baseEntry ? { ...baseEntry } : null,
      detectedAt: new Date().toISOString()
    };
  }

  function markBaselineRecord(baseline, collection, recordId, state) {
    const entry = baselineEntry(state);
    if (!entry) delete baseline.collections[collection][recordId];
    else baseline.collections[collection][recordId] = entry;
  }

  function activeCloudStateFromRow(row) {
    return row ? stateFromRemoteRow(row) : absentState();
  }

  async function touchSyncState(userId, appVersion) {
    const old = await fetchSingleton(TABLES.syncState);
    const now = new Date().toISOString();
    await upsertRows(TABLES.syncState, [{
      user_id: userId,
      initialized_at: old?.initialized_at || now,
      source_device_id: deviceId(),
      app_version: appVersion,
      schema_version: Math.max(2, Number(old?.schema_version || 1)),
      cloud_updated_at: now
    }], 'user_id');
  }

  async function initializeCloud(appVersion = '0.6.2') {
    const user = await getUser();
    if (!user?.id) throw new Error('Die Anmeldung konnte nicht bestätigt werden.');
    const before = await cloudCounts();
    if (!before.isEmpty) {
      throw new Error('In dieser Mampfo-Cloud sind bereits Daten vorhanden. Nutze jetzt „Synchronisieren“, um die Geräte sicher abzugleichen.');
    }

    const data = localData();
    await upsertRows(TABLES.entries, recordRows(data.entries, user.id));
    await upsertRows(TABLES.foods, recordRows(data.foods, user.id));
    await upsertRows(TABLES.recipes, recordRows(data.recipes, user.id));
    await upsertRows(TABLES.fastPlans, recordRows(data.fastPlans, user.id));
    await upsertRows(TABLES.fastingSessions, recordRows(data.fastingSessions, user.id));

    const stamp = new Date().toISOString();
    await upsertRows(TABLES.settings, [{
      user_id: user.id,
      payload: settingsPayload(data),
      record_updated_at: stamp,
      cloud_updated_at: stamp
    }], 'user_id');

    await upsertRows(TABLES.syncState, [{
      user_id: user.id,
      initialized_at: stamp,
      source_device_id: deviceId(),
      app_version: appVersion,
      schema_version: 2,
      cloud_updated_at: stamp
    }], 'user_id');

    const baseline = emptyBaseline(user.id);
    COLLECTIONS.forEach(collection => {
      (data[collection] || []).forEach(record => markBaselineRecord(baseline, collection, String(record.id), stateFromRecord(record)));
    });
    baseline.settings = baselineEntry(activeState(settingsPayload(data)));
    saveBaseline(user.id, baseline);
    saveConflicts(user.id, []);
    setSyncStatus(user.id, { lastSyncAt: stamp, lastError: null, conflictCount: 0, uploaded: localCounts().dataTotal, downloaded: 0 });
    return await cloudCounts();
  }

  async function performSync(appVersion = '0.6.2', reason = 'manual') {
    const user = await getUser();
    if (!user?.id) throw new Error('Bitte zuerst bei Mampfo Cloud anmelden.');
    const counts = await cloudCounts();
    if (!counts.isInitialized) {
      if (counts.isEmpty) throw new Error('Die Cloud ist noch leer. Bitte zuerst den Erst-Upload durchführen.');
      throw new Error('Cloud-Daten vorhanden, aber die Mampfo-Initialisierung fehlt. Bitte den Cloud-Stand prüfen.');
    }

    const remote = await fetchRemoteSnapshot();
    const local = localData();
    const working = deepClone(local);
    const baseline = loadBaseline(user.id);
    const previousConflicts = new Map(conflicts(user.id).map(item => [item.id, item]));
    const nextConflicts = [];
    let uploaded = 0;
    let downloaded = 0;
    let changedLocal = false;

    for (const collection of COLLECTIONS) {
      const localMap = mapLocal(local[collection]);
      const remoteMap = mapRemote(remote[collection]);
      const baseMap = baseline.collections[collection] || {};

      // Geplante Fasten-Sessions können auf zwei Geräten dieselbe cycleKey besitzen,
      // aber vor dem ersten Cloud-Abgleich unterschiedliche UUIDs bekommen haben.
      // Semantisch identische Dubletten werden beim ersten Merge auf die bereits
      // vorhandene Cloud-ID vereinheitlicht, statt doppelt im Verlauf zu erscheinen.
      if (collection === 'fastingSessions') {
        const remoteBySemantic = new Map();
        for (const [remoteId, row] of remoteMap) {
          if (baseMap[remoteId] || row.deleted_at) continue;
          const semantic = fastingSessionSemanticHash(row.payload);
          if (semantic) remoteBySemantic.set(semantic, remoteId);
        }
        for (const [localId, record] of [...localMap]) {
          if (baseMap[localId] || record.deleted) continue;
          const semantic = fastingSessionSemanticHash(record);
          const remoteId = semantic ? remoteBySemantic.get(semantic) : null;
          if (!remoteId || remoteId === localId) continue;
          localMap.delete(localId);
          working.fastingSessions = (working.fastingSessions || []).filter(item => String(item.id) !== localId);
          changedLocal = true;
        }
      }

      const ids = new Set([...localMap.keys(), ...remoteMap.keys(), ...Object.keys(baseMap)]);

      for (const id of ids) {
        const baseEntry = baseMap[id] || null;
        const baseState = stateFromBaseline(baseEntry);
        const localState = effectiveLocalState(id, localMap, baseEntry);
        const remoteState = effectiveRemoteState(id, remoteMap, baseEntry);

        if (!baseEntry) {
          if (localState.kind === 'absent' && remoteState.kind !== 'absent') {
            if (remoteState.kind === 'active') {
              applyStateToSnapshot(working, collection, id, remoteState);
              downloaded += 1;
              changedLocal = true;
            }
            markBaselineRecord(baseline, collection, id, remoteState);
            continue;
          }
          if (remoteState.kind === 'absent' && localState.kind !== 'absent') {
            if (localState.kind === 'active') {
              await pushRecordState(collection, id, localState, user.id);
              uploaded += 1;
              markBaselineRecord(baseline, collection, id, localState);
            }
            continue;
          }
          if (statesEqual(localState, remoteState)) {
            markBaselineRecord(baseline, collection, id, localState);
            continue;
          }
          if (localState.kind === 'deleted' && remoteState.kind === 'absent') continue;
          if (remoteState.kind === 'deleted' && localState.kind === 'absent') {
            markBaselineRecord(baseline, collection, id, remoteState);
            continue;
          }
          nextConflicts.push(makeConflict(collection, id, localState, remoteState, null));
          continue;
        }

        const localChanged = !statesEqual(localState, baseState);
        const remoteChanged = !statesEqual(remoteState, baseState);

        if (!localChanged && !remoteChanged) continue;
        if (localChanged && !remoteChanged) {
          await pushRecordState(collection, id, localState, user.id, remoteMap.get(id)?.payload || null);
          uploaded += 1;
          markBaselineRecord(baseline, collection, id, localState);
          continue;
        }
        if (!localChanged && remoteChanged) {
          applyStateToSnapshot(working, collection, id, remoteState);
          downloaded += 1;
          changedLocal = true;
          markBaselineRecord(baseline, collection, id, remoteState);
          continue;
        }
        if (statesEqual(localState, remoteState)) {
          markBaselineRecord(baseline, collection, id, localState);
          continue;
        }
        const fresh = makeConflict(collection, id, localState, remoteState, baseEntry);
        const old = previousConflicts.get(fresh.id);
        if (old && old.local?.hash === fresh.local.hash && old.local?.kind === fresh.local.kind && old.remote?.hash === fresh.remote.hash && old.remote?.kind === fresh.remote.kind) {
          fresh.detectedAt = old.detectedAt;
        }
        nextConflicts.push(fresh);
      }
    }

    const localSettingsState = activeState(settingsPayload(local));
    const remoteSettingsState = remote.settings ? activeState(remote.settings.payload || {}) : absentState();
    const baseSettingsState = stateFromBaseline(baseline.settings);
    if (!baseline.settings) {
      if (remoteSettingsState.kind === 'absent') {
        await pushSettingsState(localSettingsState, user.id);
        uploaded += 1;
        baseline.settings = baselineEntry(localSettingsState);
      } else if (statesEqual(localSettingsState, remoteSettingsState)) {
        baseline.settings = baselineEntry(localSettingsState);
      } else {
        nextConflicts.push(makeConflict('settings', '__settings__', localSettingsState, remoteSettingsState, null));
      }
    } else {
      const localChanged = !statesEqual(localSettingsState, baseSettingsState);
      const remoteChanged = !statesEqual(remoteSettingsState, baseSettingsState);
      if (localChanged && !remoteChanged) {
        await pushSettingsState(localSettingsState, user.id);
        uploaded += 1;
        baseline.settings = baselineEntry(localSettingsState);
      } else if (!localChanged && remoteChanged) {
        if (remoteSettingsState.kind === 'active') {
          applySettingsToSnapshot(working, remoteSettingsState);
          downloaded += 1;
          changedLocal = true;
          baseline.settings = baselineEntry(remoteSettingsState);
        }
      } else if (localChanged && remoteChanged) {
        if (statesEqual(localSettingsState, remoteSettingsState)) baseline.settings = baselineEntry(localSettingsState);
        else nextConflicts.push(makeConflict('settings', '__settings__', localSettingsState, remoteSettingsState, baseline.settings));
      }
    }

    if (changedLocal) {
      if (window.MampfoDataBridge?.apply) window.MampfoDataBridge.apply(working, { source: 'cloud' });
      else {
        localStorage.setItem(STORAGE.settings, JSON.stringify(working.settings || {}));
        localStorage.setItem(STORAGE.entries, JSON.stringify(working.entries || []));
        localStorage.setItem(STORAGE.foods, JSON.stringify(working.foods || []));
        localStorage.setItem(STORAGE.recipes, JSON.stringify(working.recipes || []));
        localStorage.setItem(STORAGE.fastPlans, JSON.stringify(working.fastPlans || []));
        localStorage.setItem(STORAGE.fastingSessions, JSON.stringify(working.fastingSessions || []));
        localStorage.setItem(STORAGE.onboarded, working.onboarded ? 'yes' : 'no');
        localStorage.setItem(STORAGE.dataVersion, String(working.dataVersion || 4));
      }
    }

    saveBaseline(user.id, baseline);
    saveConflicts(user.id, nextConflicts);
    await touchSyncState(user.id, appVersion);
    const stamp = new Date().toISOString();
    setSyncStatus(user.id, {
      lastSyncAt: stamp,
      lastError: null,
      reason,
      conflictCount: nextConflicts.length,
      uploaded,
      downloaded
    });
    return { uploaded, downloaded, conflicts: nextConflicts.length, changedLocal, lastSyncAt: stamp };
  }

  async function syncNow(appVersion = '0.6.2', options = {}) {
    if (syncPromise) return syncPromise;
    const reason = options.reason || 'manual';
    syncPromise = performSync(appVersion, reason).catch(error => {
      const userId = currentUser()?.id;
      if (userId) setSyncStatus(userId, { lastError: error.message || String(error), lastAttemptAt: new Date().toISOString(), reason });
      throw error;
    }).finally(() => { syncPromise = null; });
    return syncPromise;
  }

  function scheduleSync(appVersion = '0.6.2', options = {}) {
    if (!appReady || !isConfigured() || !currentUser()) return;
    window.clearTimeout(syncTimer);
    const delay = Number(options.delay ?? 1600);
    syncTimer = window.setTimeout(() => {
      if (window.MampfoDataBridge?.canAutoSync && !window.MampfoDataBridge.canAutoSync()) return;
      syncNow(appVersion, { reason: options.reason || 'automatic' }).catch(() => {});
    }, Math.max(0, delay));
  }

  function onAppReady(appVersion = '0.6.2') {
    appReady = true;
    scheduleSync(appVersion, { delay: 1200, reason: 'app-start' });
  }

  function stateSignature(state) {
    return `${state.kind}:${state.kind === 'active' ? state.hash : ''}`;
  }

  async function fetchRemoteRecordState(collection, recordId) {
    if (collection === 'settings') {
      const row = await fetchSingleton(TABLES.settings);
      return row ? activeState(row.payload || {}) : absentState();
    }
    const { payload } = await restRequest(TABLES[collection], {
      query: `?select=*&record_id=eq.${encodeURIComponent(recordId)}&limit=1`
    });
    const row = Array.isArray(payload) && payload.length ? payload[0] : null;
    return activeCloudStateFromRow(row);
  }

  function currentLocalConflictState(conflict) {
    const snapshot = localData();
    if (conflict.collection === 'settings') return activeState(settingsPayload(snapshot));
    const map = mapLocal(snapshot[conflict.collection]);
    const baseline = loadBaseline(currentUser()?.id || '');
    const baseEntry = baseline.collections?.[conflict.collection]?.[conflict.recordId] || conflict.baseline || null;
    return effectiveLocalState(conflict.recordId, map, baseEntry);
  }

  async function resolveConflict(conflictIdentifier, choice, appVersion = '0.6.2') {
    const user = await getUser();
    if (!user?.id) throw new Error('Bitte zuerst anmelden.');
    const list = conflicts(user.id);
    const conflict = list.find(item => item.id === conflictIdentifier);
    if (!conflict) return { remaining: list.length };
    const currentLocal = currentLocalConflictState(conflict);
    const currentRemote = await fetchRemoteRecordState(conflict.collection, conflict.recordId);
    if (stateSignature(currentLocal) !== stateSignature(conflict.local) || stateSignature(currentRemote) !== stateSignature(conflict.remote)) {
      await syncNow(appVersion, { reason: 'conflict-refresh' });
      throw new Error('Der Datensatz hat sich inzwischen erneut geändert. Mampfo hat den Konflikt aktualisiert.');
    }

    const baseline = loadBaseline(user.id);
    let finalState;
    if (choice === 'local') {
      finalState = currentLocal;
      if (conflict.collection === 'settings') await pushSettingsState(finalState, user.id);
      else await pushRecordState(conflict.collection, conflict.recordId, finalState, user.id, currentRemote.payload || conflict.remote?.payload || null);
    } else if (choice === 'cloud') {
      finalState = currentRemote;
      const snapshot = localData();
      if (conflict.collection === 'settings') applySettingsToSnapshot(snapshot, finalState);
      else applyStateToSnapshot(snapshot, conflict.collection, conflict.recordId, finalState);
      if (window.MampfoDataBridge?.apply) window.MampfoDataBridge.apply(snapshot, { source: 'cloud-conflict' });
    } else {
      throw new Error('Unbekannte Konfliktentscheidung.');
    }

    if (conflict.collection === 'settings') baseline.settings = baselineEntry(finalState);
    else markBaselineRecord(baseline, conflict.collection, conflict.recordId, finalState);
    saveBaseline(user.id, baseline);
    const remaining = list.filter(item => item.id !== conflictIdentifier);
    saveConflicts(user.id, remaining);
    await touchSyncState(user.id, appVersion);
    setSyncStatus(user.id, { lastSyncAt: new Date().toISOString(), lastError: null, conflictCount: remaining.length });
    scheduleSync(appVersion, { delay: 300, reason: 'after-conflict' });
    return { remaining: remaining.length };
  }

  window.MampfoCloud = {
    isConfigured,
    signUp,
    signIn,
    signOut,
    getUser,
    currentUser,
    session,
    localCounts,
    cloudCounts,
    initializeCloud,
    syncNow,
    scheduleSync,
    onAppReady,
    conflicts,
    resolveConflict,
    syncStatus,
    deviceId
  };
})();
