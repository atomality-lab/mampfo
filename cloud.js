(() => {
  'use strict';

  const CONFIG = window.MAMPFO_SUPABASE || {};
  const SESSION_KEY = 'mampfo.cloudSession.v1';
  const DEVICE_KEY = 'mampfo.deviceId.v1';
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
    if (expiresAt && expiresAt <= Math.floor(Date.now() / 1000) + 60) {
      current = await refreshSession();
    }
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

  async function countTable(table, column = 'record_id') {
    const { response, payload } = await restRequest(table, {
      query: `?select=${encodeURIComponent(column)}&limit=1`,
      prefer: 'count=exact'
    });
    const range = response.headers.get('content-range') || '';
    const match = range.match(/\/(\d+|\*)$/);
    if (match && match[1] !== '*') return Number(match[1]);
    // Sicherheits-Fallback: Auch ohne Count-Header darf ein vorhandener Datensatz
    // niemals fälschlich als "leere Cloud" interpretiert werden.
    return Array.isArray(payload) && payload.length ? payload.length : 0;
  }

  async function cloudCounts() {
    const result = {
      entries: await countTable(TABLES.entries),
      foods: await countTable(TABLES.foods),
      recipes: await countTable(TABLES.recipes),
      fastPlans: await countTable(TABLES.fastPlans),
      fastingSessions: await countTable(TABLES.fastingSessions),
      settings: await countTable(TABLES.settings, 'user_id'),
      syncState: await countTable(TABLES.syncState, 'user_id')
    };
    result.dataTotal = result.entries + result.foods + result.recipes + result.fastPlans + result.fastingSessions + result.settings;
    result.isEmpty = result.dataTotal === 0 && result.syncState === 0;
    return result;
  }

  function localData() {
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

  async function initializeCloud(appVersion = '0.6.1') {
    const user = await getUser();
    if (!user?.id) throw new Error('Die Anmeldung konnte nicht bestätigt werden.');
    const before = await cloudCounts();
    if (!before.isEmpty) {
      throw new Error('In dieser Mampfo-Cloud sind bereits Daten vorhanden. v0.6.1 überschreibt oder mischt diese Daten bewusst nicht.');
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
      payload: {
        settings: data.settings,
        onboarded: data.onboarded,
        dataVersion: data.dataVersion
      },
      record_updated_at: stamp,
      cloud_updated_at: stamp
    }], 'user_id');

    await upsertRows(TABLES.syncState, [{
      user_id: user.id,
      initialized_at: stamp,
      source_device_id: deviceId(),
      app_version: appVersion,
      schema_version: 1,
      cloud_updated_at: stamp
    }], 'user_id');

    return await cloudCounts();
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
    deviceId
  };
})();
