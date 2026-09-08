(() => {
  'use strict';

  const CONFIG = window.MAMPFO_SUPABASE || {};
  const SESSION_KEY = 'mampfo.cloudSession.v1';
  const DEVICE_KEY = 'mampfo.deviceId.v1';
  const DEVICE_LABEL_KEY = 'mampfo.deviceLabel.v1';
  const BASELINE_PREFIX = 'mampfo.syncBaseline.v2.';
  const CONFLICT_PREFIX = 'mampfo.syncConflicts.v2.';
  const STATUS_PREFIX = 'mampfo.syncStatus.v2.';
  const BACKUP_PREFIX = 'mampfo.syncBackup.v3.';
  const DELETION_PREFIX = 'mampfo.syncDeletions.v4.';
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

  function isOnline() {
    return typeof navigator === 'undefined' || navigator.onLine !== false;
  }

  function isConnectivityError(error) {
    const message = String(error?.message || error || '');
    return /nicht erreichbar|offline|netzwerk|network|failed to fetch|load failed/i.test(message);
  }

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

  function suggestedDeviceLabel() {
    const ua = String(typeof navigator !== 'undefined' ? navigator.userAgent || '' : '');
    const platform = String(typeof navigator !== 'undefined' ? navigator.platform || '' : '');
    const touch = Number(typeof navigator !== 'undefined' ? navigator.maxTouchPoints || 0 : 0);
    if (/iPad/i.test(ua) || (/Mac/i.test(platform) && touch > 1)) return 'iPad';
    if (/iPhone|iPod/i.test(ua)) return 'iPhone';
    if (/Android/i.test(ua)) return /Mobile/i.test(ua) ? 'Android-Smartphone' : 'Android-Tablet';
    if (/Windows/i.test(ua) || /Win/i.test(platform)) return 'Windows-PC';
    if (/Macintosh|Mac OS/i.test(ua) || /Mac/i.test(platform)) return 'Mac';
    if (/Linux/i.test(ua) || /Linux/i.test(platform)) return 'Linux-Gerät';
    return 'Dieses Gerät';
  }

  function deviceLabel() {
    const saved = String(localStorage.getItem(DEVICE_LABEL_KEY) || '').trim();
    if (saved) return saved;
    const label = suggestedDeviceLabel();
    localStorage.setItem(DEVICE_LABEL_KEY, label);
    return label;
  }

  function setDeviceLabel(value) {
    const normalized = String(value || '').trim().replace(/\s+/g, ' ').slice(0, 40);
    if (!normalized) throw new Error('Bitte einen Gerätenamen eingeben.');
    localStorage.setItem(DEVICE_LABEL_KEY, normalized);
    return normalized;
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
      // Ein abgelaufenes Token während Offline-Betrieb darf die lokale Anmeldung
      // nicht zerstören. Erst ein echter Auth-Fehler verwirft die Sitzung.
      if (!isConnectivityError(error)) saveSession(null);
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

  function deletionKey(userId) {
    return userKey(DELETION_PREFIX, userId);
  }

  function emptyDeletions(userId) {
    return {
      schema: 1,
      userId,
      collections: Object.fromEntries(COLLECTIONS.map(key => [key, {}])),
      updatedAt: null
    };
  }

  function loadDeletions(userId = currentUser()?.id) {
    if (!userId) return null;
    const saved = loadJson(deletionKey(userId), null);
    if (!saved || saved.schema !== 1 || saved.userId !== userId) return emptyDeletions(userId);
    COLLECTIONS.forEach(key => { if (!saved.collections?.[key]) saved.collections[key] = {}; });
    return saved;
  }

  function saveDeletions(userId, data) {
    if (!userId || !data) return null;
    data.schema = 1;
    data.userId = userId;
    data.updatedAt = new Date().toISOString();
    return saveJson(deletionKey(userId), data);
  }

  function recordDeletion(collection, recordId, payload = null) {
    const userId = currentUser()?.id;
    if (!userId || !COLLECTIONS.includes(collection) || recordId == null) return false;
    const data = loadDeletions(userId);
    data.collections[collection][String(recordId)] = {
      deletedAt: new Date().toISOString(),
      payload: payload ? deepClone(payload) : null
    };
    saveDeletions(userId, data);
    markPending(userId, 'local-change');
    return true;
  }

  function deletionMarker(collection, recordId, userId = currentUser()?.id) {
    if (!userId || !COLLECTIONS.includes(collection)) return null;
    const data = loadDeletions(userId);
    return data?.collections?.[collection]?.[String(recordId)] || null;
  }

  function clearDeletion(collection, recordId, userId = currentUser()?.id) {
    if (!userId || !COLLECTIONS.includes(collection)) return false;
    const data = loadDeletions(userId);
    if (!data?.collections?.[collection]?.[String(recordId)]) return false;
    delete data.collections[collection][String(recordId)];
    saveDeletions(userId, data);
    return true;
  }

  function syncStatus(userId = currentUser()?.id) {
    if (!userId) return null;
    return loadJson(userKey(STATUS_PREFIX, userId), null);
  }

  function setSyncStatus(userId, patch) {
    const current = syncStatus(userId) || {};
    return saveJson(userKey(STATUS_PREFIX, userId), { ...current, ...patch });
  }


  function backupKey(userId) {
    return userKey(BACKUP_PREFIX, userId);
  }

  function lastBackup(userId = currentUser()?.id) {
    if (!userId) return null;
    return loadJson(backupKey(userId), null);
  }

  function createLocalBackup(userId, reason, snapshot = localData(), appVersion = '0.7.2.5') {
    if (!userId) throw new Error('Für die Sicherheitskopie fehlt die Benutzerzuordnung.');
    const backup = {
      schema: 1,
      userId,
      createdAt: new Date().toISOString(),
      reason: reason || 'sync',
      appVersion,
      snapshot: deepClone(snapshot)
    };
    try {
      saveJson(backupKey(userId), backup);
      return backup;
    } catch {
      throw new Error('Mampfo konnte vor dem Cloud-Abgleich keine lokale Sicherheitskopie anlegen. Der Abgleich wurde vorsichtshalber nicht fortgesetzt.');
    }
  }

  function markPending(userId, reason = 'offline') {
    if (!userId) return null;
    const current = syncStatus(userId) || {};
    return setSyncStatus(userId, {
      pending: true,
      pendingSince: current.pendingSince || new Date().toISOString(),
      pendingReason: reason
    });
  }

  function clearPending(userId) {
    if (!userId) return null;
    return setSyncStatus(userId, { pending: false, pendingSince: null, pendingReason: null });
  }

  function applySnapshotLocally(snapshot, source = 'cloud') {
    if (window.MampfoDataBridge?.apply) {
      window.MampfoDataBridge.apply(deepClone(snapshot), { source });
      return;
    }
    localStorage.setItem(STORAGE.settings, JSON.stringify(snapshot.settings || {}));
    localStorage.setItem(STORAGE.entries, JSON.stringify(snapshot.entries || []));
    localStorage.setItem(STORAGE.foods, JSON.stringify(snapshot.foods || []));
    localStorage.setItem(STORAGE.recipes, JSON.stringify(snapshot.recipes || []));
    localStorage.setItem(STORAGE.fastPlans, JSON.stringify(snapshot.fastPlans || []));
    localStorage.setItem(STORAGE.fastingSessions, JSON.stringify(snapshot.fastingSessions || []));
    localStorage.setItem(STORAGE.onboarded, snapshot.onboarded ? 'yes' : 'no');
    localStorage.setItem(STORAGE.dataVersion, String(snapshot.dataVersion || 4));
  }

  function restoreLastBackup(appVersion = '0.7.2.5') {
    const userId = currentUser()?.id;
    if (!userId) throw new Error('Bitte zuerst bei Mampfo Cloud anmelden.');
    const backup = lastBackup(userId);
    if (!backup?.snapshot) throw new Error('Es ist kein lokaler Rücksprungpunkt vorhanden.');
    applySnapshotLocally(backup.snapshot, 'cloud-backup-restore');
    markPending(userId, 'backup-restore');
    setSyncStatus(userId, {
      lastRestoreAt: new Date().toISOString(),
      lastError: null,
      restoreSourceAt: backup.createdAt || null
    });
    scheduleSync(appVersion, { delay: 500, reason: 'backup-restore' });
    return { restoredAt: new Date().toISOString(), backupAt: backup.createdAt || null };
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

  function externalFoodIdentity(record) {
    if (!record || record.deleted) return null;
    const source = String(record.source || '').toLowerCase();
    const sourceId = String(record.sourceId || '').trim();
    if (!sourceId || !['bls', 'openfoodfacts'].includes(source)) return null;
    return `${source}:${sourceId}`;
  }

  function externalFoodCore(record) {
    if (!record) return null;
    return {
      source: String(record.source || '').toLowerCase(),
      sourceId: String(record.sourceId || ''),
      sourceVersion: record.sourceVersion || null,
      name: record.name || '',
      calories: record.calories ?? null,
      protein: record.protein ?? null,
      fiber: record.fiber ?? null,
      fat: record.fat ?? null,
      carbohydrates: record.carbohydrates ?? null,
      baseAmount: Number(record.baseAmount || 1),
      baseUnit: record.baseUnit || 'portion',
      sourceBrand: record.sourceBrand || null,
      sourceQuantity: record.sourceQuantity || null
    };
  }

  function replaceFoodReferences(snapshot, fromId, toId) {
    if (String(fromId) === String(toId)) return;
    (snapshot.entries || []).forEach(entry => {
      if (String(entry.foodId || '') === String(fromId)) entry.foodId = String(toId);
    });
    (snapshot.recipes || []).forEach(recipe => {
      (recipe.ingredients || []).forEach(ingredient => {
        if (String(ingredient.foodId || '') === String(fromId)) ingredient.foodId = String(toId);
      });
    });
  }

  function mergeExternalFoodUsage(localFood, remoteFood, canonicalId) {
    const dates = [localFood?.lastUsedAt, remoteFood?.lastUsedAt].filter(Boolean).sort();
    const created = [localFood?.createdAt, remoteFood?.createdAt].filter(Boolean).sort();
    const updated = [localFood?.updatedAt, remoteFood?.updatedAt].filter(Boolean).sort();
    return {
      ...deepClone(remoteFood || {}),
      id: String(canonicalId),
      favorite: Boolean(localFood?.favorite || remoteFood?.favorite),
      usageCount: Math.max(Number(localFood?.usageCount || 0), Number(remoteFood?.usageCount || 0)),
      lastUsedAt: dates.length ? dates[dates.length - 1] : null,
      createdAt: created.length ? created[0] : (remoteFood?.createdAt || localFood?.createdAt || new Date().toISOString()),
      updatedAt: updated.length ? updated[updated.length - 1] : (remoteFood?.updatedAt || localFood?.updatedAt || new Date().toISOString())
    };
  }

  function canonicalizeExternalFoodIds(localSnapshot, remoteFoodRows, baseline) {
    const remoteByIdentity = new Map();
    for (const row of remoteFoodRows || []) {
      if (row.deleted_at) continue;
      const identity = externalFoodIdentity(row.payload);
      if (identity && !remoteByIdentity.has(identity)) remoteByIdentity.set(identity, row);
    }
    let changed = false;
    const notes = [];
    const foods = localSnapshot.foods || [];
    for (let index = foods.length - 1; index >= 0; index -= 1) {
      const food = foods[index];
      const oldId = String(food?.id || '');
      const identity = externalFoodIdentity(food);
      const remoteRow = identity ? remoteByIdentity.get(identity) : null;
      if (!remoteRow || !oldId) continue;
      const canonicalId = String(remoteRow.record_id);
      if (oldId === canonicalId) continue;
      // Bereits synchronisierte IDs werden nicht still umgebogen. In diesem Fall
      // greift weiterhin die normale Konflikt-/Löschlogik.
      if (baseline.collections.foods?.[oldId]) continue;

      replaceFoodReferences(localSnapshot, oldId, canonicalId);
      const coreEqual = hashValue(externalFoodCore(food)) === hashValue(externalFoodCore(remoteRow.payload || {}));
      const existingCanonicalIndex = foods.findIndex((item, i) => i !== index && String(item.id || '') === canonicalId);
      if (existingCanonicalIndex >= 0) {
        const existing = foods[existingCanonicalIndex];
        foods[existingCanonicalIndex] = coreEqual ? mergeExternalFoodUsage(food, existing, canonicalId) : existing;
        foods.splice(index, 1);
      } else {
        foods[index] = coreEqual ? mergeExternalFoodUsage(food, remoteRow.payload || {}, canonicalId) : { ...food, id: canonicalId };
      }
      if (coreEqual) baseline.collections.foods[canonicalId] = baselineEntry(stateFromRemoteRow(remoteRow));
      changed = true;
      notes.push({ source: food.source, sourceId: food.sourceId, fromId: oldId, toId: canonicalId, coreEqual });
    }
    return { changed, notes };
  }

  function fastingSyncMinute(value) {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    date.setSeconds(0, 0);
    return date.toISOString();
  }

  function fastingSessionSemanticCore(record) {
    if (!record || record.deleted) return null;
    return {
      cycleKey: record.cycleKey || null,
      planId: record.planId || null,
      startAt: fastingSyncMinute(record.startAt),
      endAt: fastingSyncMinute(record.endAt),
      plannedEndAt: fastingSyncMinute(record.plannedEndAt),
      targetMinutes: Number(record.targetMinutes || 0)
    };
  }

  function fastingSessionSemanticHash(record) {
    if (!record || record.deleted || !record.cycleKey) return null;
    return hashValue(fastingSessionSemanticCore(record));
  }

  function fastingStatesSemanticallyEqual(a, b) {
    if (!a || !b || a.kind !== 'active' || b.kind !== 'active') return false;
    const left = fastingSessionSemanticCore(a.payload);
    const right = fastingSessionSemanticCore(b.payload);
    return Boolean(left && right && hashValue(left) === hashValue(right));
  }

  function fastingSourceRank(source) {
    if (source === 'foodEntry') return 4;
    if (source === 'manual') return 3;
    if (source === 'schedule') return 2;
    return 1;
  }

  function preferredFastingSource(a, b) {
    return fastingSourceRank(a) >= fastingSourceRank(b) ? (a || b || null) : (b || a || null);
  }

  function canonicalFastingState(localState, remoteState, recordId) {
    const local = localState?.payload || {};
    const remote = remoteState?.payload || {};
    const updated = [local.updatedAt, remote.updatedAt].filter(Boolean).sort();
    const created = [local.createdAt, remote.createdAt].filter(Boolean).sort();
    const base = (new Date(local.updatedAt || 0).getTime() || 0) >= (new Date(remote.updatedAt || 0).getTime() || 0) ? local : remote;
    return activeState({
      ...deepClone(base),
      id: String(recordId),
      startSource: preferredFastingSource(local.startSource, remote.startSource),
      endSource: preferredFastingSource(local.endSource, remote.endSource),
      createdAt: created.length ? created[0] : (base.createdAt || base.startAt || new Date().toISOString()),
      updatedAt: updated.length ? updated[updated.length - 1] : (base.updatedAt || base.createdAt || new Date().toISOString()),
      deleted: false
    });
  }

  function effectiveLocalState(id, localMap, baseEntry, deletion = null) {
    if (localMap.has(id)) return stateFromRecord(localMap.get(id));
    // v0.7.2.3: Fehlen allein ist keine Löschung mehr. Nur eine explizite
    // Löschmarke darf einen Datensatz in der Cloud als gelöscht markieren.
    if (deletion) return deletedState(deletion.payload || null);
    if (baseEntry) return stateFromBaseline(baseEntry);
    return absentState();
  }

  function effectiveRemoteState(id, remoteMap, baseEntry) {
    if (remoteMap.has(id)) return stateFromRemoteRow(remoteMap.get(id));
    // Cloud-Zeilen werden von Mampfo per deleted_at gelöscht und nicht hart entfernt.
    // Eine fehlende Zeile wird daher vorsichtshalber nicht als Löschung interpretiert.
    if (baseEntry) return stateFromBaseline(baseEntry);
    return absentState();
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

  async function initializeCloud(appVersion = '0.7.2.5') {
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

  async function performSync(appVersion = '0.7.2.5', reason = 'manual') {
    const user = await getUser();
    if (!user?.id) throw new Error('Bitte zuerst bei Mampfo Cloud anmelden.');
    const counts = await cloudCounts();
    if (!counts.isInitialized) {
      if (counts.isEmpty) throw new Error('Die Cloud ist noch leer. Bitte zuerst den Erst-Upload durchführen.');
      throw new Error('Cloud-Daten vorhanden, aber die Mampfo-Initialisierung fehlt. Bitte den Cloud-Stand prüfen.');
    }

    const remote = await fetchRemoteSnapshot();
    const originalLocal = localData();
    // Ein einzelner lokaler Rücksprungpunkt schützt vor unerwarteten Cloud-Pulls
    // und vor einem Abbruch mitten im mehrstufigen Geräteabgleich.
    createLocalBackup(user.id, reason, originalLocal, appVersion);
    const baseline = loadBaseline(user.id);
    const deletions = loadDeletions(user.id);
    const local = deepClone(originalLocal);
    // Externe Referenzlebensmittel besitzen eine stabile Quell-ID (BLS-Code bzw. Barcode).
    // Wurde dasselbe Produkt auf zwei Geräten unabhängig übernommen, wird die bereits
    // vorhandene Cloud-ID als kanonische Mampfo-ID verwendet. Dadurch entstehen beim
    // Geräteabgleich keine doppelten Pfirsiche, Haferdrinks usw.
    const externalDedupe = canonicalizeExternalFoodIds(local, remote.foods, baseline);
    const working = deepClone(local);
    const previousConflicts = new Map(conflicts(user.id).map(item => [item.id, item]));
    const nextConflicts = [];
    let uploaded = 0;
    let downloaded = 0;
    let changedLocal = externalDedupe.changed;

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

      const deletionIds = Object.keys(deletions?.collections?.[collection] || {});
      const ids = new Set([...localMap.keys(), ...remoteMap.keys(), ...Object.keys(baseMap), ...deletionIds]);

      for (const id of ids) {
        const baseEntry = baseMap[id] || null;
        const baseState = stateFromBaseline(baseEntry);
        const explicitDeletion = deletions?.collections?.[collection]?.[String(id)] || null;
        const localState = effectiveLocalState(id, localMap, baseEntry, explicitDeletion);
        const remoteState = effectiveRemoteState(id, remoteMap, baseEntry);
        const localPhysicallyMissing = !localMap.has(id);

        // v0.7.2.5: Bei Fastenphasen sind createdAt/updatedAt sowie die technische
        // Herkunft (schedule/manual/foodEntry) keine fachlichen Unterschiede, wenn
        // cycleKey, Start, Ende, geplantes Ende und Ziel identisch sind. Solche
        // Metadatenunterschiede dürfen keinen sichtbaren Konflikt erzeugen.
        if (collection === 'fastingSessions'
          && fastingStatesSemanticallyEqual(localState, remoteState)
          && !statesEqual(localState, remoteState)) {
          const finalState = canonicalFastingState(localState, remoteState, id);
          if (!statesEqual(localState, finalState)) {
            applyStateToSnapshot(working, collection, id, finalState);
            downloaded += 1;
            changedLocal = true;
          }
          if (!statesEqual(remoteState, finalState)) {
            await pushRecordState(collection, id, finalState, user.id, remoteMap.get(id)?.payload || null);
            uploaded += 1;
          }
          markBaselineRecord(baseline, collection, id, finalState);
          clearDeletion(collection, id, user.id);
          continue;
        }

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
            if (localState.kind === 'deleted') clearDeletion(collection, id, user.id);
            continue;
          }
          if (localState.kind === 'deleted' && remoteState.kind === 'absent') {
            clearDeletion(collection, id, user.id);
            continue;
          }
          if (remoteState.kind === 'deleted' && localState.kind === 'absent') {
            markBaselineRecord(baseline, collection, id, remoteState);
            continue;
          }
          nextConflicts.push(makeConflict(collection, id, localState, remoteState, null));
          continue;
        }

        const localChanged = !statesEqual(localState, baseState);
        const remoteChanged = !statesEqual(remoteState, baseState);

        if (!localChanged && !remoteChanged) {
          // Sicherheitsreparatur: Ist der Cloud-Datensatz aktiv, lokal aber ohne
          // ausdrückliche Löschmarke verschwunden, wird er wiederhergestellt.
          if (localPhysicallyMissing && !explicitDeletion && remoteState.kind === 'active') {
            applyStateToSnapshot(working, collection, id, remoteState);
            downloaded += 1;
            changedLocal = true;
          }
          // v0.7.2.4: Eine bereits vollständig abgearbeitete Löschmarke darf
          // nicht dauerhaft den Status "Abgleich nötig" erzeugen. Wenn lokaler
          // Effektivzustand, Cloud und Baseline bereits identisch sind, ist die
          // Marke redundant und kann sicher entfernt werden.
          if (explicitDeletion && statesEqual(localState, remoteState) && statesEqual(remoteState, baseState)) {
            clearDeletion(collection, id, user.id);
          }
          continue;
        }
        if (localChanged && !remoteChanged) {
          await pushRecordState(collection, id, localState, user.id, remoteMap.get(id)?.payload || null);
          uploaded += 1;
          markBaselineRecord(baseline, collection, id, localState);
          if (localState.kind === 'deleted') clearDeletion(collection, id, user.id);
          continue;
        }
        if (!localChanged && remoteChanged) {
          applyStateToSnapshot(working, collection, id, remoteState);
          downloaded += 1;
          changedLocal = true;
          markBaselineRecord(baseline, collection, id, remoteState);
          if (remoteState.kind === 'deleted') clearDeletion(collection, id, user.id);
          continue;
        }
        if (statesEqual(localState, remoteState)) {
          markBaselineRecord(baseline, collection, id, localState);
          if (localState.kind === 'deleted') clearDeletion(collection, id, user.id);
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

    if (changedLocal) applySnapshotLocally(working, 'cloud');

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
      downloaded,
      pending: false,
      pendingSince: null,
      pendingReason: null,
      inProgress: false
    });
    return { uploaded, downloaded, conflicts: nextConflicts.length, changedLocal, lastSyncAt: stamp };
  }

  async function syncNow(appVersion = '0.7.2.5', options = {}) {
    if (syncPromise) return syncPromise;
    const reason = options.reason || 'manual';
    const userId = currentUser()?.id;
    if (!isOnline()) {
      markPending(userId, reason);
      const error = new Error('Du bist gerade offline. Deine Änderungen bleiben lokal gespeichert und werden synchronisiert, sobald wieder eine Verbindung besteht.');
      if (userId) setSyncStatus(userId, { lastError: error.message, lastAttemptAt: new Date().toISOString(), reason, inProgress: false });
      throw error;
    }
    if (userId) setSyncStatus(userId, { inProgress: true, lastAttemptAt: new Date().toISOString(), reason });
    syncPromise = performSync(appVersion, reason).catch(error => {
      const activeUserId = currentUser()?.id || userId;
      if (activeUserId) {
        if (isConnectivityError(error)) markPending(activeUserId, reason);
        setSyncStatus(activeUserId, { lastError: error.message || String(error), lastAttemptAt: new Date().toISOString(), reason, inProgress: false });
      }
      throw error;
    }).finally(() => { syncPromise = null; });
    return syncPromise;
  }

  function scheduleSync(appVersion = '0.7.2.5', options = {}) {
    if (!appReady || !isConfigured() || !currentUser()) return;
    const reason = options.reason || 'automatic';
    if (['local-change', 'backup-restore', 'after-conflict'].includes(reason)) markPending(currentUser()?.id, reason);
    if (!isOnline()) {
      markPending(currentUser()?.id, reason);
      return;
    }
    window.clearTimeout(syncTimer);
    const delay = Number(options.delay ?? 1600);
    syncTimer = window.setTimeout(() => {
      if (window.MampfoDataBridge?.canAutoSync && !window.MampfoDataBridge.canAutoSync()) {
        markPending(currentUser()?.id, reason);
        return;
      }
      syncNow(appVersion, { reason }).catch(() => {});
    }, Math.max(0, delay));
  }

  function onAppReady(appVersion = '0.7.2.5') {
    appReady = true;
    if (!isOnline()) {
      markPending(currentUser()?.id, 'app-start-offline');
      return;
    }
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
    const userId = currentUser()?.id || '';
    const baseline = loadBaseline(userId);
    const baseEntry = baseline.collections?.[conflict.collection]?.[conflict.recordId] || conflict.baseline || null;
    return effectiveLocalState(conflict.recordId, map, baseEntry, deletionMarker(conflict.collection, conflict.recordId, userId));
  }

  async function resolveConflict(conflictIdentifier, choice, appVersion = '0.7.2.5') {
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
      createLocalBackup(user.id, 'conflict-cloud-choice', snapshot, appVersion);
      if (conflict.collection === 'settings') applySettingsToSnapshot(snapshot, finalState);
      else applyStateToSnapshot(snapshot, conflict.collection, conflict.recordId, finalState);
      applySnapshotLocally(snapshot, 'cloud-conflict');
    } else {
      throw new Error('Unbekannte Konfliktentscheidung.');
    }

    if (conflict.collection === 'settings') baseline.settings = baselineEntry(finalState);
    else {
      markBaselineRecord(baseline, conflict.collection, conflict.recordId, finalState);
      // Nach einer bewussten Konfliktentscheidung ist eine alte lokale
      // Löschmarke abgearbeitet und darf den nächsten Sync nicht erneut beeinflussen.
      clearDeletion(conflict.collection, conflict.recordId, user.id);
    }
    saveBaseline(user.id, baseline);
    const remaining = list.filter(item => item.id !== conflictIdentifier);
    saveConflicts(user.id, remaining);
    await touchSyncState(user.id, appVersion);
    setSyncStatus(user.id, { lastSyncAt: new Date().toISOString(), lastError: null, conflictCount: remaining.length, inProgress: false });
    scheduleSync(appVersion, { delay: 300, reason: 'after-conflict' });
    return { remaining: remaining.length };
  }

  function localNeedsSync(userId = currentUser()?.id) {
    if (!userId) return false;
    const baseline = loadBaseline(userId);
    if (!baseline.updatedAt) return true;

    // v0.7.2.3: Diese Funktion steuert ausschließlich die Statusanzeige.
    // Inhaltliche Hash-Unterschiede werden hier bewusst NICHT bewertet:
    // Ältere Datensätze können beim Laden um harmlose Standardfelder ergänzt
    // werden (z. B. null/default-Werte), wodurch ihr JSON-Hash abweicht,
    // obwohl der fachliche Datensatz unverändert ist. Echte lokale Änderungen
    // setzen über persist()/recordDeletion() ohnehin den persistenten pending-Status.
    // Für die zusätzliche Sicherheitsprüfung reichen daher strukturelle
    // Abweichungen: neue/fehlende IDs, Tombstones und explizite Löschmarken.
    const snapshot = localData();
    const deletions = loadDeletions(userId);

    for (const collection of COLLECTIONS) {
      const localMap = mapLocal(snapshot[collection]);
      const baseMap = baseline.collections[collection] || {};
      const deletionMap = deletions?.collections?.[collection] || {};
      const ids = new Set([...localMap.keys(), ...Object.keys(baseMap), ...Object.keys(deletionMap)]);

      for (const id of ids) {
        const localRecord = localMap.get(id) || null;
        const baseEntry = baseMap[id] || null;
        const deletion = deletionMap[id] || null;

        // Eine ausdrückliche lokale Löschung muss nur solange als offen gelten,
        // wie sie nicht bereits in der Sync-Basis als gelöscht bestätigt ist.
        // Alte, abgearbeitete Marker aus früheren Versionen erzeugen damit
        // keinen dauerhaften falschen Alarm mehr.
        if (deletion && !baseEntry?.deleted) return true;

        // Neuer lokaler Datensatz, der noch nicht Teil der Sync-Basis ist.
        if (localRecord && !baseEntry) return true;

        // Früher aktiver Datensatz fehlt lokal: Reparatur/Download erforderlich.
        if (!localRecord && baseEntry && !baseEntry.deleted) return true;

        // Baseline kennt eine Löschung, lokal ist der Datensatz aber wieder aktiv.
        if (localRecord && baseEntry?.deleted && !localRecord.deleted) return true;

        // Fasten-Sessions können als lokale Tombstones im Array erhalten bleiben.
        if (localRecord?.deleted && baseEntry && !baseEntry.deleted) return true;
      }
    }

    return false;
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
    deviceId,
    deviceLabel,
    setDeviceLabel,
    isOnline,
    lastBackup,
    restoreLastBackup,
    recordDeletion,
    deletionMarker,
    localNeedsSync
  };
})();
