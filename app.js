(() => {
  'use strict';

  const CFG = window.APP_CONFIG || { appName: 'Mampfo', version: '0.6.1' };
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
  const LEGACY = {
    settings: 'nutrition.settings.v1',
    entries: 'nutrition.entries.v1',
    onboarded: 'nutrition.onboarded.v1'
  };

  function load(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function has(key) {
    return localStorage.getItem(key) !== null;
  }

  function migrateLegacyData() {
    if (!has(STORAGE.settings) && has(LEGACY.settings)) {
      localStorage.setItem(STORAGE.settings, localStorage.getItem(LEGACY.settings));
    }
    if (!has(STORAGE.entries) && has(LEGACY.entries)) {
      const legacyEntries = load(LEGACY.entries, []).map(entry => ({
        ...entry,
        source: entry.source || 'manual',
        foodId: entry.foodId || null,
        recipeId: entry.recipeId || null,
        fat: entry.fat ?? null,
        carbohydrates: entry.carbohydrates ?? null,
        amount: entry.amount ?? null,
        unit: entry.unit ?? null
      }));
      localStorage.setItem(STORAGE.entries, JSON.stringify(legacyEntries));
    }
    if (!has(STORAGE.onboarded) && has(LEGACY.onboarded)) {
      localStorage.setItem(STORAGE.onboarded, localStorage.getItem(LEGACY.onboarded));
    }
    if (!has(STORAGE.foods)) localStorage.setItem(STORAGE.foods, '[]');
    if (!has(STORAGE.recipes)) localStorage.setItem(STORAGE.recipes, '[]');
    if (!has(STORAGE.fastPlans)) localStorage.setItem(STORAGE.fastPlans, '[]');
    if (!has(STORAGE.fastingSessions)) localStorage.setItem(STORAGE.fastingSessions, '[]');
  }

  function migrateToV4() {
    migrateLegacyData();
    const entries = load(STORAGE.entries, []).map(entry => ({
      foodId: null,
      recipeId: null,
      source: 'manual',
      fat: null,
      carbohydrates: null,
      amount: null,
      unit: null,
      ...entry
    }));
    const foods = load(STORAGE.foods, []).map(food => ({
      favorite: false,
      usageCount: 0,
      lastUsedAt: null,
      fat: null,
      carbohydrates: null,
      baseAmount: 1,
      baseUnit: 'portion',
      ...food
    }));
    const recipes = load(STORAGE.recipes, []).map(recipe => ({
      calculationMode: 'manual',
      servings: 1,
      totalCalories: 0,
      totalProtein: null,
      totalFiber: null,
      totalFat: null,
      totalCarbohydrates: null,
      ingredients: [],
      ...recipe,
      ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients.map(ingredient => ({
        id: ingredient.id || uuid(),
        name: ingredient.name || '',
        foodId: ingredient.foodId || null,
        origin: ingredient.origin || (ingredient.foodId ? 'savedFood' : 'manual'),
        amount: ingredient.amount ?? 1,
        unit: ingredient.unit || 'portion',
        calories: ingredient.calories ?? 0,
        protein: ingredient.protein ?? null,
        fiber: ingredient.fiber ?? null,
        fat: ingredient.fat ?? null,
        carbohydrates: ingredient.carbohydrates ?? null
      })) : []
    }));
    const fastPlans = load(STORAGE.fastPlans, []).map(plan => ({
      id: plan.id || uuid(),
      fastingMinutes: Number(plan.fastingMinutes || 840),
      eatingMinutes: Number(plan.eatingMinutes || 600),
      anchorType: plan.anchorType === 'fastingStart' ? 'fastingStart' : 'eatingStart',
      anchorTime: /^\d{2}:\d{2}$/.test(plan.anchorTime || '') ? plan.anchorTime : '09:00',
      preset: ['12:12', '14:10', '16:8', 'custom'].includes(plan.preset) ? plan.preset : 'custom',
      activeFrom: plan.activeFrom || new Date().toISOString(),
      createdAt: plan.createdAt || plan.activeFrom || new Date().toISOString(),
      updatedAt: plan.updatedAt || plan.createdAt || new Date().toISOString()
    }));
    const fastingSessions = load(STORAGE.fastingSessions, []).map(session => ({
      id: session.id || uuid(),
      startAt: session.startAt || new Date().toISOString(),
      endAt: session.endAt || null,
      plannedEndAt: session.plannedEndAt || session.endAt || null,
      targetMinutes: Number(session.targetMinutes || 0),
      planId: session.planId || null,
      startSource: session.startSource || 'manual',
      endSource: session.endSource || (session.endAt ? 'manual' : null),
      cycleKey: session.cycleKey || null,
      deleted: Boolean(session.deleted),
      createdAt: session.createdAt || session.startAt || new Date().toISOString(),
      updatedAt: session.updatedAt || session.createdAt || new Date().toISOString()
    }));
    localStorage.setItem(STORAGE.entries, JSON.stringify(entries));
    localStorage.setItem(STORAGE.foods, JSON.stringify(foods));
    localStorage.setItem(STORAGE.recipes, JSON.stringify(recipes));
    localStorage.setItem(STORAGE.fastPlans, JSON.stringify(fastPlans));
    localStorage.setItem(STORAGE.fastingSessions, JSON.stringify(fastingSessions));
    localStorage.setItem(STORAGE.dataVersion, '4');
  }

  migrateToV4();

  const state = {
    view: 'today',
    addTab: 'input',
    selectedDate: todayISO(),
    editingId: null,
    editingFoodId: null,
    foodEditOrigin: 'settings',
    editingRecipeId: null,
    selectedRecipeId: null,
    recipeSearch: '',
    addRecipeSearch: '',
    recipeLogOrigin: 'recipes',
    selectedSavedFoodId: null,
    recipeDraftIngredients: null,
    recipeDraftForId: null,
    recipeEditorMode: null,
    fastingTab: 'timer',
    fastingPlanEditing: false,
    statsTab: 'overview',
    statsPeriod: '7d',
    statsIncludeToday: false,
    statsCustomStart: offsetDate(todayISO(), -6),
    statsCustomEnd: todayISO(),
    settings: load(STORAGE.settings, { dailyCalories: 1700, dailyProtein: 80 }),
    entries: load(STORAGE.entries, []),
    savedFoods: load(STORAGE.foods, []),
    recipes: load(STORAGE.recipes, []),
    fastPlans: load(STORAGE.fastPlans, []),
    fastingSessions: load(STORAGE.fastingSessions, []),
    onboarded: localStorage.getItem(STORAGE.onboarded) === 'yes'
  };

  state.entries = state.entries.map(entry => ({
    foodId: null,
    recipeId: null,
    source: 'manual',
    fat: null,
    carbohydrates: null,
    amount: null,
    unit: null,
    ...entry
  }));
  state.savedFoods = state.savedFoods.map(food => ({
    favorite: false,
    usageCount: 0,
    lastUsedAt: null,
    fat: null,
    carbohydrates: null,
    baseAmount: 1,
    baseUnit: 'portion',
    ...food
  }));

  state.recipes = state.recipes.map(recipe => ({
    calculationMode: 'manual',
    servings: 1,
    totalCalories: 0,
    totalProtein: null,
    totalFiber: null,
    totalFat: null,
    totalCarbohydrates: null,
    ingredients: [],
    ...recipe,
    ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients.map(ingredient => ({
      id: ingredient.id || uuid(),
      name: ingredient.name || '',
      foodId: ingredient.foodId || null,
      origin: ingredient.origin || (ingredient.foodId ? 'savedFood' : 'manual'),
      amount: ingredient.amount ?? 1,
      unit: ingredient.unit || 'portion',
      calories: ingredient.calories ?? 0,
      protein: ingredient.protein ?? null,
      fiber: ingredient.fiber ?? null,
      fat: ingredient.fat ?? null,
      carbohydrates: ingredient.carbohydrates ?? null
    })) : []
  }));

  state.fastPlans = state.fastPlans.map(plan => ({
    id: plan.id || uuid(),
    fastingMinutes: Number(plan.fastingMinutes || 840),
    eatingMinutes: Number(plan.eatingMinutes || 600),
    anchorType: plan.anchorType === 'fastingStart' ? 'fastingStart' : 'eatingStart',
    anchorTime: /^\d{2}:\d{2}$/.test(plan.anchorTime || '') ? plan.anchorTime : '09:00',
    preset: ['12:12', '14:10', '16:8', 'custom'].includes(plan.preset) ? plan.preset : 'custom',
    activeFrom: plan.activeFrom || new Date().toISOString(),
    createdAt: plan.createdAt || plan.activeFrom || new Date().toISOString(),
    updatedAt: plan.updatedAt || plan.createdAt || new Date().toISOString()
  }));

  state.fastingSessions = state.fastingSessions.map(session => ({
    id: session.id || uuid(),
    startAt: session.startAt || new Date().toISOString(),
    endAt: session.endAt || null,
    plannedEndAt: session.plannedEndAt || session.endAt || null,
    targetMinutes: Number(session.targetMinutes || 0),
    planId: session.planId || null,
    startSource: session.startSource || 'manual',
    endSource: session.endSource || (session.endAt ? 'manual' : null),
    cycleKey: session.cycleKey || null,
    deleted: Boolean(session.deleted),
    createdAt: session.createdAt || session.startAt || new Date().toISOString(),
    updatedAt: session.updatedAt || session.createdAt || new Date().toISOString()
  }));

  const app = document.getElementById('app');
  const modalRoot = document.getElementById('modal-root');
  const toastRoot = document.getElementById('toast-root');

  document.title = `${CFG.appName} · v${CFG.version}`;

  function persist() {
    localStorage.setItem(STORAGE.settings, JSON.stringify(state.settings));
    localStorage.setItem(STORAGE.entries, JSON.stringify(state.entries));
    localStorage.setItem(STORAGE.foods, JSON.stringify(state.savedFoods));
    localStorage.setItem(STORAGE.recipes, JSON.stringify(state.recipes));
    localStorage.setItem(STORAGE.fastPlans, JSON.stringify(state.fastPlans));
    localStorage.setItem(STORAGE.fastingSessions, JSON.stringify(state.fastingSessions));
    localStorage.setItem(STORAGE.onboarded, state.onboarded ? 'yes' : 'no');
    localStorage.setItem(STORAGE.dataVersion, '4');
  }

  function todayISO() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function nowTime() {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  function localDateTimeISO(date, time) {
    return `${date}T${time || '00:00'}:00`;
  }

  function displayDate(iso) {
    const [y, m, d] = iso.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return new Intl.DateTimeFormat('de-DE', {
      weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
    }).format(date);
  }

  function shortDate(iso) {
    const [y, m, d] = iso.split('-');
    return `${d}.${m}.${y}`;
  }

  function offsetDate(iso, delta) {
    const [y, m, d] = iso.split('-').map(Number);
    const date = new Date(y, m - 1, d + delta);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  function fmt(value, digits = 1) {
    const num = Number(value || 0);
    return new Intl.NumberFormat('de-DE', { maximumFractionDigits: digits }).format(num);
  }

  function cleanNumber(value, digits = 6) {
    if (value == null || value === '') return null;
    const num = Number(value);
    if (!Number.isFinite(num)) return null;
    const factor = 10 ** digits;
    return Math.round((num + Number.EPSILON) * factor) / factor;
  }

  function inputNumber(value, digits = 2) {
    if (value == null || value === '') return '';
    const num = cleanNumber(value, digits);
    if (num == null) return '';
    return new Intl.NumberFormat('de-DE', { useGrouping: false, maximumFractionDigits: digits }).format(num);
  }

  function parseNum(value) {
    if (value == null || value === '') return null;
    const n = Number(String(value).replace(',', '.'));
    return Number.isFinite(n) ? n : null;
  }

  function uuid() {
    return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function esc(s = '') {
    return String(s).replace(/[&<>'"]/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[c]));
  }

  function normalizeName(name) {
    return String(name || '').trim().toLocaleLowerCase('de-DE').replace(/\s+/g, ' ');
  }

  function sameValue(a, b) {
    if (a == null && b == null) return true;
    if (a == null || b == null) return false;
    return Math.abs(Number(a) - Number(b)) < 0.000001;
  }

  const NUTRIENT_KEYS = ['calories', 'protein', 'fiber', 'fat', 'carbohydrates'];

  function sameNutrientSet(a, b) {
    return NUTRIENT_KEYS.every(key => sameValue(a[key], b[key]));
  }

  function unitLabel(unit, amount = 1) {
    if (unit === 'g') return 'g';
    if (unit === 'ml') return 'ml';
    if (unit === 'piece') return 'Stück';
    if (unit === 'portion') return Number(amount) === 1 ? 'Portion' : 'Portionen';
    return unit || 'Portion';
  }

  function amountLabel(amount, unit) {
    if (amount == null || amount === '') return '';
    return `${fmt(amount)} ${unitLabel(unit || 'portion', amount)}`;
  }

  function scaleFactor(food, amount, unit) {
    const baseAmount = Number(food.baseAmount || 1);
    const selectedAmount = Number(amount);
    const baseUnit = food.baseUnit || 'portion';
    if (!Number.isFinite(baseAmount) || baseAmount <= 0 || !Number.isFinite(selectedAmount) || selectedAmount < 0) return null;
    if ((unit || baseUnit) !== baseUnit) return null;
    return selectedAmount / baseAmount;
  }

  function scaledFoodValues(food, amount, unit) {
    const factor = scaleFactor(food, amount, unit);
    if (factor == null) return null;
    const result = {};
    NUTRIENT_KEYS.forEach(key => {
      result[key] = food[key] == null ? null : Number(food[key]) * factor;
    });
    return result;
  }

  function valuesAtFoodBase(food, values) {
    const amount = Number(values.amount);
    const baseAmount = Number(food.baseAmount || 1);
    const baseUnit = food.baseUnit || 'portion';
    const unit = values.unit || 'portion';
    if (!Number.isFinite(amount) || amount <= 0 || unit !== baseUnit) return null;
    const factor = baseAmount / amount;
    const result = {};
    NUTRIENT_KEYS.forEach(key => {
      result[key] = values[key] == null ? null : Number(values[key]) * factor;
    });
    return result;
  }

  function sameNutrients(food, values) {
    const expected = scaledFoodValues(food, values.amount, values.unit);
    if (!expected) return false;
    return NUTRIENT_KEYS.every(key => {
      if (expected[key] == null && values[key] == null) return true;
      if (expected[key] == null || values[key] == null) return false;
      return Math.abs(Number(expected[key]) - Number(values[key])) <= 0.011;
    });
  }

  function entryMatchesFood(food, values) {
    if (!food || !values) return false;
    if (normalizeName(food.name) !== normalizeName(values.name)) return false;
    const comparable = {
      ...values,
      amount: values.amount ?? food.baseAmount ?? 1,
      unit: values.unit ?? food.baseUnit ?? 'portion'
    };
    return sameNutrients(food, comparable);
  }

  function assignFoodNutrientsFromEntry(food, values, keepBase = false) {
    const normalized = keepBase ? valuesAtFoodBase(food, values) : null;
    if (normalized) {
      NUTRIENT_KEYS.forEach(key => { food[key] = normalized[key]; });
    } else {
      NUTRIENT_KEYS.forEach(key => { food[key] = values[key]; });
      food.baseAmount = values.amount || 1;
      food.baseUnit = values.unit || 'portion';
    }
  }

  function icon(name) {
    const map = {
      settings: '⚙', calendar: '▣', prev: '‹', next: '›', flame: '♨', protein: '💪', leaf: '♧', clock: '◷',
      plus: '＋', home: '⌂', recipe: '▤', fasting: '☾', stats: '▥', back: '←', edit: '✎', trash: '♲',
      food: '♜', scale: '↔', drop: '◒', carbs: '◇', target: '◎', rocket: '↗', star: '★', starEmpty: '☆', recent: '◷', search: '⌕', list: '☷', portions: '◫', bowl: '◡', save: '✓', moon: '☾', sun: '☼', plan: '◴'
    };
    return map[name] || '•';
  }

  function showToast(message) {
    toastRoot.innerHTML = `<div class="toast">${esc(message)}</div>`;
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => { toastRoot.innerHTML = ''; }, 1800);
  }

  function setView(view, opts = {}) {
    const previousView = state.view;
    state.view = view;
    if (previousView === 'recipeEdit' && view !== 'recipeEdit') {
      state.recipeDraftIngredients = null;
      state.recipeDraftForId = null;
      state.recipeEditorMode = null;
    }
    if ('editingId' in opts) state.editingId = opts.editingId;
    if ('editingFoodId' in opts) state.editingFoodId = opts.editingFoodId;
    if ('foodEditOrigin' in opts) state.foodEditOrigin = opts.foodEditOrigin;
    if ('editingRecipeId' in opts) state.editingRecipeId = opts.editingRecipeId;
    if ('selectedRecipeId' in opts) state.selectedRecipeId = opts.selectedRecipeId;
    if ('recipeLogOrigin' in opts) state.recipeLogOrigin = opts.recipeLogOrigin;
    if ('selectedSavedFoodId' in opts) state.selectedSavedFoodId = opts.selectedSavedFoodId;
    window.scrollTo({ top: 0, behavior: 'instant' });
    render();
  }

  function bottomNav(active) {
    const tabs = [
      ['today', 'home', 'Heute'],
      ['add', 'plus', 'Erfassen'],
      ['recipes', 'recipe', 'Rezepte'],
      ['fasting', 'fasting', 'Fasten'],
      ['stats', 'stats', 'Auswertung']
    ];
    return `<nav class="bottom-nav" aria-label="Hauptnavigation">
      ${tabs.map(([view, ic, label]) => `<button class="nav-button ${active === view ? 'active' : ''}" data-nav="${view}">
        <span class="nav-icon">${icon(ic)}</span><span>${label}</span>
      </button>`).join('')}
    </nav>`;
  }

  function render() {
    if (!state.onboarded) return renderOnboarding();

    if (state.view === 'today') renderToday();
    else if (state.view === 'add') renderAdd();
    else if (state.view === 'settings') renderSettings();
    else if (state.view === 'foods') renderFoodManager();
    else if (state.view === 'foodEdit') renderFoodEdit();
    else if (state.view === 'recipes') renderRecipes();
    else if (state.view === 'recipeEdit') renderRecipeEdit();
    else if (state.view === 'recipeDetail') renderRecipeDetail();
    else if (state.view === 'recipeLog') renderRecipeLog();
    else if (state.view === 'fasting') renderFasting();
    else if (state.view === 'stats') renderStats();
    else renderToday();
    bindCommon();
  }

  function renderOnboarding() {
    app.innerHTML = `<main class="onboarding">
      <section class="onboarding-card">
        <div class="brand-mark">♧</div>
        <div class="brand-kicker">${esc(CFG.appName)}</div>
        <h1>Willkommen</h1>
        <p>Lege deine Tagesziele fest. Die Werte kannst du später jederzeit in den Einstellungen ändern.</p>
        <form id="onboarding-form">
          <div class="goal-grid">
            <div class="goal-field"><label for="goal-cal">Kalorien pro Tag</label><input id="goal-cal" inputmode="numeric" value="${state.settings.dailyCalories}" aria-label="Kalorien pro Tag"></div>
            <div class="goal-field"><label for="goal-protein">Protein pro Tag (g)</label><input id="goal-protein" inputmode="decimal" value="${state.settings.dailyProtein}" aria-label="Protein pro Tag"></div>
          </div>
          <button class="primary-button" type="submit">Starten</button>
        </form>
        <div class="version">Version ${esc(CFG.version)}</div>
      </section>
    </main>`;
    document.getElementById('onboarding-form').addEventListener('submit', e => {
      e.preventDefault();
      const calories = parseNum(document.getElementById('goal-cal').value);
      const protein = parseNum(document.getElementById('goal-protein').value);
      if (!calories || calories <= 0 || !protein || protein <= 0) return showToast('Bitte gültige Tagesziele eingeben.');
      state.settings.dailyCalories = calories;
      state.settings.dailyProtein = protein;
      state.onboarded = true;
      persist();
      render();
    });
  }

  function dailyEntries(date) {
    return state.entries.filter(e => e.date === date).sort((a, b) => a.time.localeCompare(b.time));
  }

  function dailyTotals(date) {
    return dailyEntries(date).reduce((sum, e) => {
      sum.calories += Number(e.calories || 0);
      sum.protein += Number(e.protein || 0);
      sum.fiber += Number(e.fiber || 0);
      sum.fat += Number(e.fat || 0);
      sum.carbohydrates += Number(e.carbohydrates || 0);
      return sum;
    }, { calories: 0, protein: 0, fiber: 0, fat: 0, carbohydrates: 0 });
  }

  function progress(value, target) {
    if (!target) return 0;
    return Math.max(0, Math.min(100, (Number(value) / Number(target)) * 100));
  }

  function todayFastStatusMarkup(isToday) {
    if (!isToday) return `<button class="today-chip today-return-chip" id="go-today">↩ <span>Zum heutigen Tag</span></button>`;
    const now = new Date();
    const plan = activeFastPlan(now);
    if (!plan) return `<span class="today-chip today-status-chip"><strong>Heute</strong></span>`;
    const status = fastingStatus(now);
    if (!status) return `<span class="today-chip today-status-chip"><strong>Heute</strong></span>`;
    const isFast = status.phase === 'fasting';
    return `<span class="today-chip today-status-chip ${isFast ? 'is-fasting' : 'is-eating'}" id="today-fast-status">
      <strong>Heute</strong><span class="today-status-separator">·</span><span class="today-phase">${isFast ? icon('moon') : icon('bowl')} ${isFast ? 'Fasten' : 'Essensphase'}</span>
    </span>`;
  }

  function updateTodayFastStatus() {
    if (state.view !== 'today' || state.selectedDate !== todayISO()) return;
    const node = document.getElementById('today-fast-status');
    const plan = activeFastPlan(new Date());
    if (!plan) return;
    const status = fastingStatus(new Date());
    if (!status || !node) return;
    const isFast = status.phase === 'fasting';
    node.classList.toggle('is-fasting', isFast);
    node.classList.toggle('is-eating', !isFast);
    node.innerHTML = `<strong>Heute</strong><span class="today-status-separator">·</span><span class="today-phase">${isFast ? icon('moon') : icon('bowl')} ${isFast ? 'Fasten' : 'Essensphase'}</span>`;
  }

  function renderToday() {
    const entries = dailyEntries(state.selectedDate);
    const totals = dailyTotals(state.selectedDate);
    const isToday = state.selectedDate === todayISO();

    app.innerHTML = `<main class="page">
      <header class="topbar">
        <div><div class="brand-kicker">${esc(CFG.appName)}</div><h1>${isToday ? 'Heute' : 'Tagesübersicht'}</h1></div>
        <button class="icon-button" data-nav="settings" aria-label="Einstellungen">${icon('settings')}</button>
      </header>
      <div class="date-nav">
        <button class="icon-button" id="prev-day" aria-label="Vorheriger Tag">${icon('prev')}</button>
        <div class="date-label">${esc(displayDate(state.selectedDate))}</div>
        <button class="icon-button" id="next-day" aria-label="Nächster Tag">${icon('next')}</button>
      </div>
      ${todayFastStatusMarkup(isToday)}

      <section class="summary-grid" aria-label="Tageswerte">
        ${summaryCard('calories', icon('flame'), `<strong>${fmt(totals.calories, 0)}</strong><span>/ ${fmt(state.settings.dailyCalories, 0)} kcal</span>`, progress(totals.calories, state.settings.dailyCalories))}
        ${summaryCard('protein', icon('protein'), `<strong>Protein ${fmt(totals.protein)}</strong><span>/ ${fmt(state.settings.dailyProtein)} g</span>`, progress(totals.protein, state.settings.dailyProtein))}
        ${summaryCard('fiber', icon('leaf'), `<strong>Ballaststoffe ${fmt(totals.fiber)}</strong><span>g</span>`, Math.min(100, totals.fiber * 3))}
      </section>

      <details class="secondary-nutrients">
        <summary>Weitere Nährwerte</summary>
        <div class="secondary-nutrient-grid">
          <div><span>${icon('drop')}</span><small>Fett</small><strong>${fmt(totals.fat)} g</strong></div>
          <div><span>${icon('carbs')}</span><small>Kohlenhydrate</small><strong>${fmt(totals.carbohydrates)} g</strong></div>
        </div>
      </details>

      ${entries.length ? `
        <div class="section-title">${icon('clock')} Einträge</div>
        <section class="entry-list">
          ${entries.map((e, i) => entryCard(e, i)).join('')}
        </section>` : emptyState()}

      <button class="primary-button floating-action" id="add-food">${icon('plus')} Essen erfassen</button>
    </main>${bottomNav('today')}`;

    document.getElementById('prev-day').onclick = () => { state.selectedDate = offsetDate(state.selectedDate, -1); render(); };
    document.getElementById('next-day').onclick = () => { state.selectedDate = offsetDate(state.selectedDate, 1); render(); };
    const todayBtn = document.getElementById('go-today');
    if (todayBtn) todayBtn.onclick = () => { state.selectedDate = todayISO(); render(); };
    document.getElementById('add-food').onclick = () => {
      state.addTab = 'input';
      setView('add', { editingId: null, selectedSavedFoodId: null });
    };
    document.querySelectorAll('[data-entry-id]').forEach(btn => {
      btn.onclick = () => setView('add', { editingId: btn.dataset.entryId, selectedSavedFoodId: null });
    });
  }

  function summaryCard(cls, ic, line, pct) {
    return `<div class="summary-card ${cls}"><div class="metric-icon">${ic}</div><div><div class="metric-line">${line}</div><div class="progress" aria-hidden="true"><span style="width:${pct.toFixed(1)}%"></span></div></div></div>`;
  }

  function entryCard(e, index) {
    const palette = ['var(--apricot-pale)', 'var(--lavender-pale)', 'var(--sage-pale)', 'var(--bluegray-pale)'];
    const parts = [`${fmt(e.calories, 0)} kcal`];
    if (e.protein != null) parts.push(`${fmt(e.protein)} g Protein`);
    if (e.fiber != null) parts.push(`${fmt(e.fiber)} g Ballaststoffe`);
    const quantity = e.amount != null ? `<span class="entry-quantity">${esc(amountLabel(e.amount, e.unit))}</span>` : '';
    return `<button class="entry-card" data-entry-id="${esc(e.id)}">
      <span class="time-chip" style="background:${palette[index % palette.length]}">${esc(e.time)}</span>
      <span class="entry-main"><strong>${esc(e.name)}</strong>${quantity}<span class="entry-sub">${parts.join(' · ')}</span></span>
      <span class="chev">›</span>
    </button>`;
  }

  function emptyState() {
    return `<section class="empty-state"><div class="empty-illustration" aria-hidden="true"><div class="sprig">♧</div><div class="bowl"></div><div class="spoon"></div></div><h2>Noch nichts eingetragen</h2><p>Für diesen Tag gibt es noch keine Ernährungseinträge.</p></section>`;
  }

  function renderAdd() {
    if (state.editingId) return renderFoodForm();

    app.innerHTML = `<main class="page">
      <header class="topbar"><div><div class="brand-kicker">${esc(CFG.appName)}</div><h1>Erfassen</h1></div><button class="icon-button" data-nav="settings" aria-label="Einstellungen">${icon('settings')}</button></header>
      ${addTabs()}
      <section id="add-content"></section>
    </main>${bottomNav('add')}`;

    bindAddTabs();
    renderAddTabContent();
  }

  function addTabs() {
    return `<div class="segmented" role="tablist" aria-label="Erfassen">
      <button class="segment ${state.addTab === 'input' ? 'active' : ''}" data-add-tab="input" role="tab">✏ Eingeben</button>
      <button class="segment ${state.addTab === 'favorites' ? 'active' : ''}" data-add-tab="favorites" role="tab">${icon('star')} Favoriten</button>
      <button class="segment ${state.addTab === 'recipes' ? 'active' : ''}" data-add-tab="recipes" role="tab">${icon('recipe')} Rezepte</button>
      <button class="segment ${state.addTab === 'foods' ? 'active' : ''}" data-add-tab="foods" role="tab">${icon('list')} Lebensmittel</button>
      <button class="segment ${state.addTab === 'recent' ? 'active' : ''}" data-add-tab="recent" role="tab">${icon('recent')} Zuletzt</button>
    </div>`;
  }

  function bindAddTabs() {
    document.querySelectorAll('[data-add-tab]').forEach(btn => {
      btn.onclick = () => {
        state.addTab = btn.dataset.addTab;
        state.selectedSavedFoodId = null;
        render();
      };
    });
  }

  function renderAddTabContent() {
    const target = document.getElementById('add-content');
    if (!target) return;
    if (state.addTab === 'input') renderFoodForm(target);
    else if (state.addTab === 'favorites') renderFavorites(target);
    else if (state.addTab === 'recipes') renderAddRecipes(target);
    else if (state.addTab === 'foods') renderAddFoods(target);
    else renderRecent(target);
  }

  function getSelectedFood() {
    return state.selectedSavedFoodId ? state.savedFoods.find(f => f.id === state.selectedSavedFoodId) : null;
  }

  function renderFoodForm(target = app) {
    const editing = state.editingId ? state.entries.find(e => e.id === state.editingId) : null;
    const selectedFood = !editing ? getSelectedFood() : null;
    const linkedTemplate = editing?.foodId ? state.savedFoods.find(f => f.id === editing.foodId) : null;
    const linkedRecipe = editing?.recipeId ? state.recipes.find(r => r.id === editing.recipeId) : null;
    const recipeSnapshot = editing?.source === 'recipe' && (editing.unit || 'portion') === 'portion' ? editing : null;
    const scalableFood = selectedFood || linkedTemplate || null;
    const initial = editing ? {
      ...editing,
      amount: editing.amount ?? (scalableFood?.baseAmount ?? 1),
      unit: editing.unit ?? (scalableFood?.baseUnit ?? 'portion'),
      fat: editing.fat ?? null,
      carbohydrates: editing.carbohydrates ?? null
    } : (selectedFood ? {
      name: selectedFood.name,
      calories: selectedFood.calories,
      protein: selectedFood.protein,
      fiber: selectedFood.fiber,
      fat: selectedFood.fat,
      carbohydrates: selectedFood.carbohydrates,
      amount: selectedFood.baseAmount || 1,
      unit: selectedFood.baseUnit || 'portion',
      date: state.selectedDate,
      time: nowTime()
    } : {
      name: '', calories: '', protein: '', fiber: '', fat: '', carbohydrates: '',
      amount: 1, unit: 'portion', date: state.selectedDate, time: nowTime()
    });

    const standalone = target === app;
    const unitOptions = ['portion', 'g', 'ml', 'piece'].map(unit => `<option value="${unit}" ${initial.unit === unit ? 'selected' : ''}>${unitLabel(unit, 2)}</option>`).join('');
    const extraOpen = initial.fat != null || initial.carbohydrates != null ? ' open' : '';
    const quantityHint = recipeSnapshot
      ? `<p class="input-help scaling-help">Rezept-Snapshot: Änderungen der Portionsmenge berechnen die beim Eintragen gespeicherten Nährwerte proportional neu.</p>`
      : scalableFood
        ? `<p class="input-help scaling-help">Automatische Berechnung auf Basis von ${esc(amountLabel(scalableFood.baseAmount || 1, scalableFood.baseUnit || 'portion'))}. Die Einheit bleibt dabei gleich.</p>`
        : `<p class="input-help">Für eine persönliche Standardportion kannst du „1 Portion“ unverändert lassen.</p>`;

    const formMarkup = `${editing ? `<div class="info-banner">${icon('edit')} <span>Du bearbeitest einen bestehenden Eintrag.</span></div>` : ''}
      ${selectedFood ? `<div class="selected-template"><span>${icon('star')}</span><div><small>Aus gespeicherten Lebensmitteln · ${esc(amountLabel(selectedFood.baseAmount || 1, selectedFood.baseUnit || 'portion'))}</small><strong>${esc(selectedFood.name)}</strong></div><button type="button" id="clear-template" aria-label="Vorlage entfernen">×</button></div>` : ''}
      ${recipeSnapshot ? `<div class="selected-template recipe-selected"><span>${icon('recipe')}</span><div><small>Rezept-Eintrag · ${esc(amountLabel(editing.amount || 1, 'portion'))}${linkedRecipe ? ' · Rezept weiterhin vorhanden' : ' · Rezept-Snapshot'}</small><strong>${esc(editing.name)}</strong></div></div>` : ''}
      <form id="food-form" class="form-card">
        ${fieldRow(icon('food'), 'Essen', `<textarea id="name" autocomplete="off" placeholder="z. B. Roggenbrot mit Käse">${esc(initial.name)}</textarea><div id="suggestions" class="suggestions" aria-live="polite"></div><p class="input-help">Ab zwei Zeichen zeigt Mampfo passende gespeicherte Lebensmittel an.</p>`)}
        ${fieldRow(icon('scale'), 'Menge', `<div class="amount-unit-row"><input id="amount" type="text" inputmode="decimal" value="${inputNumber(initial.amount ?? 1, 2)}" placeholder="1"><select id="unit" ${(scalableFood || recipeSnapshot) ? 'disabled' : ''} aria-label="Einheit">${unitOptions}</select></div>${quantityHint}`)}
        ${fieldRow(icon('flame'), 'Kalorien (kcal)', `<input id="calories" type="text" inputmode="decimal" value="${inputNumber(initial.calories, 2)}" placeholder="0">`)}
        ${fieldRow(icon('protein'), 'Protein (g)', `<input id="protein" type="text" inputmode="decimal" value="${inputNumber(initial.protein, 2)}" placeholder="optional">`)}
        ${fieldRow(icon('leaf'), 'Ballaststoffe (g)', `<input id="fiber" type="text" inputmode="decimal" value="${inputNumber(initial.fiber, 2)}" placeholder="optional">`)}
        <details class="extra-nutrients"${extraOpen}>
          <summary>Weitere Nährwerte</summary>
          <div class="extra-nutrient-fields">
            ${fieldRow(icon('drop'), 'Fett (g)', `<input id="fat" type="text" inputmode="decimal" value="${inputNumber(initial.fat, 2)}" placeholder="optional">`)}
            ${fieldRow(icon('carbs'), 'Kohlenhydrate (g)', `<input id="carbohydrates" type="text" inputmode="decimal" value="${inputNumber(initial.carbohydrates, 2)}" placeholder="optional">`)}
          </div>
        </details>
        ${fieldRow(icon('calendar'), 'Datum', `<input id="date" type="date" value="${esc(initial.date)}">`)}
        ${fieldRow(icon('clock'), 'Uhrzeit', `<input id="time" type="time" value="${esc(initial.time)}">`)}
        ${editing ? `<div id="entry-food-link-area" class="entry-food-link-area">${entryFoodLinkMarkup(editing)}</div>` : ''}
        <div class="form-actions">
          <button class="primary-button" type="submit">${editing ? 'Änderungen speichern' : 'Speichern'}</button>
          ${editing ? `<button class="danger-button" type="button" id="delete-entry">${icon('trash')} Eintrag löschen</button>` : ''}
        </div>
      </form>`;

    if (standalone) {
      app.innerHTML = `<main class="page">
        <header class="topbar"><button class="icon-button" id="form-back" aria-label="Zurück">${icon('back')}</button><h1>Eintrag bearbeiten</h1><span style="width:44px"></span></header>
        ${formMarkup}
      </main>${bottomNav('add')}`;
      document.getElementById('form-back').onclick = () => setView('today', { editingId: null });
    } else {
      target.innerHTML = formMarkup;
    }

    if (selectedFood) {
      document.getElementById('clear-template').onclick = () => {
        state.selectedSavedFoodId = null;
        render();
      };
    }

    const nameInput = document.getElementById('name');
    nameInput.addEventListener('input', () => {
      if (state.selectedSavedFoodId && normalizeName(nameInput.value) !== normalizeName(getSelectedFood()?.name)) {
        state.selectedSavedFoodId = null;
        const chip = document.querySelector('.selected-template');
        if (chip) chip.remove();
        const unitSelect = document.getElementById('unit');
        if (unitSelect) unitSelect.disabled = false;
      }
      updateSuggestions(nameInput.value);
    });
    nameInput.addEventListener('focus', () => updateSuggestions(nameInput.value));
    nameInput.addEventListener('blur', () => window.setTimeout(() => { const box = document.getElementById('suggestions'); if (box) box.innerHTML = ''; }, 180));

    if (recipeSnapshot) {
      const amountInput = document.getElementById('amount');
      amountInput.addEventListener('input', () => applyRecipeEntryScalingToForm(recipeSnapshot));
    } else if (scalableFood) {
      const amountInput = document.getElementById('amount');
      amountInput.addEventListener('input', () => {
        if (normalizeName(document.getElementById('name').value) !== normalizeName(scalableFood.name)) return;
        if (!editing && state.selectedSavedFoodId !== scalableFood.id) return;
        applyFoodScalingToForm(scalableFood);
      });
    }

    document.getElementById('food-form').addEventListener('submit', handleFoodSubmit);
    if (editing) {
      document.getElementById('delete-entry').onclick = () => confirmDeleteEntry(editing);
      bindEntryFoodLink(editing);
      if (editing.foodId) {
        ['name', 'amount', 'unit', 'calories', 'protein', 'fiber', 'fat', 'carbohydrates'].forEach(id => {
          const control = document.getElementById(id);
          if (!control) return;
          const refresh = () => refreshEntryFoodLink(editing, formValues());
          control.addEventListener('input', refresh);
          control.addEventListener('change', refresh);
        });
      }
    }
    updateSuggestions(nameInput.value);
  }

  function applyFoodScalingToForm(food) {
    const amount = parseNum(document.getElementById('amount')?.value);
    const unit = document.getElementById('unit')?.value || food.baseUnit || 'portion';
    if (amount == null || amount < 0) return;
    const values = scaledFoodValues(food, amount, unit);
    if (!values) return;
    NUTRIENT_KEYS.forEach(key => {
      const input = document.getElementById(key);
      if (!input) return;
      input.value = values[key] == null ? '' : inputNumber(values[key], 2);
    });
  }

  function scaledRecipeEntryValues(entry, portions) {
    const originalPortions = Number(entry.amount || 1);
    const divisor = originalPortions > 0 ? originalPortions : 1;
    const factor = Number(portions) / divisor;
    const result = {};
    NUTRIENT_KEYS.forEach(key => {
      result[key] = entry[key] == null ? null : cleanNumber(Number(entry[key]) * factor);
    });
    return result;
  }

  function applyRecipeEntryScalingToForm(entry) {
    const portions = parseNum(document.getElementById('amount')?.value);
    if (portions == null || portions <= 0) return;
    const values = scaledRecipeEntryValues(entry, portions);
    NUTRIENT_KEYS.forEach(key => {
      const input = document.getElementById(key);
      if (!input) return;
      input.value = values[key] == null ? '' : inputNumber(values[key], 2);
    });
  }

  function entryFoodLinkMarkup(entry, previewValues = null) {
    const linkedFood = entry.foodId ? state.savedFoods.find(food => food.id === entry.foodId) : null;
    if (linkedFood) {
      const matches = entryMatchesFood(linkedFood, previewValues || entry);
      if (matches) {
        return `<div class="linked-food-status"><span class="linked-food-icon">✓</span><span><small>In Lebensmitteln gespeichert</small><strong>${esc(linkedFood.name)}</strong></span></div>`;
      }
      return `<div class="linked-food-status linked-food-status-warning"><span class="linked-food-icon">!</span><span><small>Eintrag weicht vom gespeicherten Lebensmittel ab</small><strong>${esc(linkedFood.name)}</strong></span></div><p class="catalog-help">Beim Speichern entscheidest du, ob nur der Tagebucheintrag geändert, die Vorlage aktualisiert oder ein neues Lebensmittel angelegt wird.</p>`;
    }
    return `<button type="button" class="save-entry-food-button" id="save-entry-as-food">${icon('starEmpty')} <span>In Lebensmitteln speichern</span></button><p class="catalog-help">Übernimmt die aktuell eingetragenen Nährwerte als wiederverwendbares Lebensmittel.</p>`;
  }

  function bindEntryFoodLink(entry) {
    const button = document.getElementById('save-entry-as-food');
    if (button) button.onclick = () => saveEditedEntryAsFood(entry);
  }

  function refreshEntryFoodLink(entry, previewValues = null) {
    const area = document.getElementById('entry-food-link-area');
    if (!area) return;
    area.innerHTML = entryFoodLinkMarkup(entry, previewValues);
    bindEntryFoodLink(entry);
  }

  function linkHistoricalEntryToFood(entry, food) {
    entry.foodId = food.id;
    // Die ursprüngliche Herkunft bleibt erhalten (z. B. source = 'manual').
    registerFoodUse(food, entry);
    persist();
    refreshEntryFoodLink(entry);
  }

  function createFoodFromValues(values, entry) {
    const now = new Date().toISOString();
    const food = {
      id: uuid(),
      name: values.name,
      calories: values.calories,
      protein: values.protein,
      fiber: values.fiber,
      fat: values.fat,
      carbohydrates: values.carbohydrates,
      baseAmount: values.amount || 1,
      baseUnit: values.unit || 'portion',
      favorite: false,
      usageCount: 0,
      lastUsedAt: null,
      createdAt: now,
      updatedAt: now
    };
    state.savedFoods.push(food);
    linkHistoricalEntryToFood(entry, food);
    return food;
  }

  function saveEditedEntryAsFood(entry) {
    const values = formValues();
    const error = validateFoodValues(values);
    if (error) return showToast(error);

    const existing = state.savedFoods.find(food => normalizeName(food.name) === normalizeName(values.name));
    if (existing && sameNutrients(existing, values)) {
      linkHistoricalEntryToFood(entry, existing);
      showToast(`„${existing.name}“ ist bereits gespeichert und wurde verknüpft.`);
      return;
    }

    if (existing) return promptLinkOrUpdateHistoricalFood(existing, entry, values);

    modalRoot.innerHTML = `<div class="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="history-save-food-title"><div class="modal">
      <div class="modal-icon sage">${icon('star')}</div>
      <h2 id="history-save-food-title">Als Lebensmittel speichern?</h2>
      <p>„${esc(values.name)}“ wird zu deinen gespeicherten Lebensmitteln hinzugefügt.</p>
      <div class="compare-box single"><div><small>Aktuelle Werte · ${esc(amountLabel(values.amount, values.unit))}</small><strong>${fmt(values.calories, 0)} kcal</strong><span>${values.protein != null ? `${fmt(values.protein)} g Protein` : 'Protein offen'} · ${values.fiber != null ? `${fmt(values.fiber)} g Ballaststoffe` : 'Ballaststoffe offen'}${values.fat != null ? ` · ${fmt(values.fat)} g Fett` : ''}${values.carbohydrates != null ? ` · ${fmt(values.carbohydrates)} g Kohlenhydrate` : ''}</span></div></div>
      <p class="modal-note">Änderungen im Bearbeitungsformular werden erst mit „Änderungen speichern“ in den Tagebucheintrag übernommen.</p>
      <div class="modal-actions"><button class="primary-button" id="confirm-history-save-food">Speichern</button><button class="secondary-button" id="cancel-history-save-food">Abbrechen</button></div>
    </div></div>`;

    document.getElementById('cancel-history-save-food').onclick = () => { modalRoot.innerHTML = ''; };
    document.getElementById('confirm-history-save-food').onclick = () => {
      const food = createFoodFromValues(values, entry);
      modalRoot.innerHTML = '';
      showToast(`„${food.name}“ wurde gespeichert und verknüpft.`);
    };
  }

  function promptLinkOrUpdateHistoricalFood(food, entry, values) {
    modalRoot.innerHTML = `<div class="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="history-existing-food-title"><div class="modal">
      <div class="modal-icon apricot">${icon('edit')}</div>
      <h2 id="history-existing-food-title">Lebensmittel bereits vorhanden</h2>
      <p>Für „${esc(food.name)}“ sind andere Nährwerte gespeichert.</p>
      <div class="compare-box">
        <div><small>Gespeichert · ${esc(amountLabel(food.baseAmount || 1, food.baseUnit || 'portion'))}</small><strong>${fmt(food.calories, 0)} kcal</strong><span>${food.protein != null ? `${fmt(food.protein)} g Protein` : 'Protein offen'} · ${food.fiber != null ? `${fmt(food.fiber)} g Ballaststoffe` : 'Ballaststoffe offen'}</span></div>
        <div><small>Dieser Eintrag · ${esc(amountLabel(values.amount, values.unit))}</small><strong>${fmt(values.calories, 0)} kcal</strong><span>${values.protein != null ? `${fmt(values.protein)} g Protein` : 'Protein offen'} · ${values.fiber != null ? `${fmt(values.fiber)} g Ballaststoffe` : 'Ballaststoffe offen'}</span></div>
      </div>
      <p class="modal-note">Der Tagebucheintrag selbst bleibt unverändert, bis du „Änderungen speichern“ wählst.</p>
      <div class="modal-actions">
        <button class="primary-button" id="history-update-food">Gespeichertes Lebensmittel aktualisieren</button>
        <button class="secondary-button" id="history-link-food">Mit vorhandenem Lebensmittel verknüpfen</button>
        <button class="secondary-button" id="history-cancel-food">Abbrechen</button>
      </div>
    </div></div>`;

    document.getElementById('history-cancel-food').onclick = () => { modalRoot.innerHTML = ''; };
    document.getElementById('history-link-food').onclick = () => {
      linkHistoricalEntryToFood(entry, food);
      modalRoot.innerHTML = '';
      showToast('Eintrag mit gespeichertem Lebensmittel verknüpft.');
    };
    document.getElementById('history-update-food').onclick = () => {
      food.name = values.name;
      assignFoodNutrientsFromEntry(food, values, true);
      food.updatedAt = new Date().toISOString();
      linkHistoricalEntryToFood(entry, food);
      modalRoot.innerHTML = '';
      showToast('Lebensmittel aktualisiert und Eintrag verknüpft.');
    };
  }

  function fieldRow(ic, label, control) {
    return `<div class="form-row"><div class="field-icon" aria-hidden="true">${ic}</div><div class="field"><label>${label}</label>${control}</div></div>`;
  }

  function searchFoods(query) {
    const needle = normalizeName(query);
    if (needle.length < 2) return [];
    return state.savedFoods
      .filter(food => normalizeName(food.name).includes(needle))
      .sort((a, b) => {
        if (a.favorite !== b.favorite) return a.favorite ? -1 : 1;
        if ((b.usageCount || 0) !== (a.usageCount || 0)) return (b.usageCount || 0) - (a.usageCount || 0);
        const dateCompare = String(b.lastUsedAt || '').localeCompare(String(a.lastUsedAt || ''));
        if (dateCompare) return dateCompare;
        return a.name.localeCompare(b.name, 'de');
      });
  }

  function updateSuggestions(query) {
    const box = document.getElementById('suggestions');
    if (!box) return;
    const results = searchFoods(query).slice(0, 5);
    if (!results.length) {
      box.innerHTML = '';
      return;
    }
    box.innerHTML = `<div class="suggestion-list">${results.map(food => foodSuggestion(food)).join('')}</div>`;
    box.querySelectorAll('[data-suggestion-id]').forEach(btn => {
      btn.onclick = () => selectSavedFood(btn.dataset.suggestionId);
    });
  }

  function foodSuggestion(food) {
    const parts = [`${fmt(food.calories, 0)} kcal`];
    if (food.protein != null) parts.push(`${fmt(food.protein)} g Protein`);
    if (food.fiber != null) parts.push(`${fmt(food.fiber)} g Ballaststoffe`);
    return `<button type="button" class="suggestion-card" data-suggestion-id="${esc(food.id)}">
      <span class="suggestion-star">${food.favorite ? icon('star') : icon('starEmpty')}</span>
      <span><strong>${esc(food.name)}</strong><small>${esc(amountLabel(food.baseAmount || 1, food.baseUnit || 'portion'))} · ${parts.join(' · ')}</small></span>
    </button>`;
  }

  function selectSavedFood(foodId) {
    const food = state.savedFoods.find(f => f.id === foodId);
    if (!food) return;
    state.selectedSavedFoodId = food.id;
    state.addTab = 'input';
    if (state.view === 'add' && !state.editingId) render();
  }

  function formValues() {
    return {
      name: document.getElementById('name').value.trim(),
      amount: parseNum(document.getElementById('amount').value),
      unit: document.getElementById('unit').value,
      calories: parseNum(document.getElementById('calories').value),
      protein: parseNum(document.getElementById('protein').value),
      fiber: parseNum(document.getElementById('fiber').value),
      fat: parseNum(document.getElementById('fat').value),
      carbohydrates: parseNum(document.getElementById('carbohydrates').value),
      date: document.getElementById('date').value,
      time: document.getElementById('time').value
    };
  }

  function validateFoodValues(values) {
    if (!values.name) return 'Bitte eine Bezeichnung eingeben.';
    if (values.amount == null || values.amount <= 0) return 'Bitte eine gültige Menge eingeben.';
    if (!['portion', 'g', 'ml', 'piece'].includes(values.unit)) return 'Bitte eine gültige Einheit auswählen.';
    if (values.calories == null || values.calories < 0) return 'Bitte gültige Kalorien eingeben.';
    if (!values.date || !values.time) return 'Bitte Datum und Uhrzeit angeben.';
    if ([values.protein, values.fiber, values.fat, values.carbohydrates].some(value => value != null && value < 0)) return 'Nährwerte dürfen nicht negativ sein.';
    return null;
  }

  function foodEntryMoment(values) {
    if (!values?.date || !values?.time) return null;
    const moment = new Date(localDateTimeISO(values.date, values.time));
    return Number.isNaN(moment.getTime()) ? null : moment;
  }

  function fastingSessionContainingMoment(moment, now = new Date()) {
    if (!(moment instanceof Date) || Number.isNaN(moment.getTime())) return null;
    // Zukunftseinträge sind Planung, keine bereits erfolgte Nahrungsaufnahme.
    if (moment.getTime() > now.getTime()) return null;
    if (!state.fastPlans.length) return null;

    synchronizeFastingSessions(now);
    return state.fastingSessions
      .filter(session => !session.deleted)
      .filter(session => {
        const start = new Date(session.startAt);
        const end = new Date(session.endAt || session.plannedEndAt || session.startAt);
        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return false;
        // Exakt am Beginn oder Ende liegt der Eintrag nicht "innerhalb" der Fastenphase.
        return moment.getTime() > start.getTime() && moment.getTime() < end.getTime();
      })
      .sort((a, b) => new Date(b.startAt) - new Date(a.startAt))[0] || null;
  }

  function fastingConflictDateTime(value) {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat('de-DE', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    }).format(date);
  }

  function resolveFastingConflictBeforeFoodSave(values, continueSave) {
    const moment = foodEntryMoment(values);
    const session = fastingSessionContainingMoment(moment, new Date());
    if (!session) return continueSave();

    const sessionStart = new Date(session.startAt);
    const sessionEnd = new Date(session.endAt || session.plannedEndAt);
    const mealTime = clockText(moment);

    modalRoot.innerHTML = `<div class="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="food-fasting-conflict-title"><div class="modal">
      <div class="modal-icon lavender">${icon('moon')}</div>
      <h2 id="food-fasting-conflict-title">Fastenphase anpassen?</h2>
      <p>Der Essenseintrag um <strong>${esc(mealTime)} Uhr</strong> liegt innerhalb einer aufgezeichneten Fastenphase.</p>
      <div class="compare-box single"><div><small>Fastenphase</small><strong>${esc(fastingConflictDateTime(sessionStart))}</strong><span>bis ${esc(fastingConflictDateTime(sessionEnd))}</span></div></div>
      <p class="modal-note">Mampfo ändert die Fastenzeit nicht automatisch. Du entscheidest, ob dieses Essen die Fastenphase beendet.</p>
      <div class="modal-actions">
        <button class="primary-button" id="food-end-fast">Fasten um ${esc(mealTime)} beenden</button>
        <button class="secondary-button" id="food-keep-fast">Nur Essen speichern</button>
        <button class="secondary-button" id="food-fast-cancel">Abbrechen</button>
      </div>
    </div></div>`;

    document.getElementById('food-fast-cancel').onclick = () => { modalRoot.innerHTML = ''; };
    document.getElementById('food-keep-fast').onclick = () => {
      modalRoot.innerHTML = '';
      continueSave();
    };
    document.getElementById('food-end-fast').onclick = () => {
      session.endAt = moment.toISOString();
      session.endSource = 'foodEntry';
      session.updatedAt = new Date().toISOString();
      persist();
      modalRoot.innerHTML = '';
      continueSave();
    };
  }

  function handleFoodSubmit(event) {
    event.preventDefault();
    const values = formValues();
    const error = validateFoodValues(values);
    if (error) return showToast(error);

    const editing = state.editingId ? state.entries.find(e => e.id === state.editingId) : null;
    const timestampChanged = editing && (editing.date !== values.date || editing.time !== values.time);
    const continueSave = () => continueFoodSubmit(values, editing);

    // Neue Einträge werden immer gegen den Fastenverlauf geprüft. Beim Bearbeiten
    // ist die Prüfung nur nötig, wenn Datum oder Uhrzeit verändert wurden.
    if (!editing || timestampChanged) return resolveFastingConflictBeforeFoodSave(values, continueSave);
    return continueSave();
  }

  function continueFoodSubmit(values, editing) {
    const now = new Date().toISOString();

    if (editing) {
      const linkedFood = editing.foodId ? state.savedFoods.find(food => food.id === editing.foodId) : null;
      if (linkedFood && !entryMatchesFood(linkedFood, values)) {
        return promptLinkedEntryEdit(editing, linkedFood, values, now);
      }
      Object.assign(editing, values, { updatedAt: now });
      return finishEditedEntry(editing, 'Änderungen gespeichert.');
    }

    const selected = getSelectedFood();
    const sameNameSelected = selected && normalizeName(selected.name) === normalizeName(values.name);
    const existingByName = state.savedFoods.find(f => normalizeName(f.name) === normalizeName(values.name));
    const entry = {
      id: uuid(),
      ...values,
      source: 'manual',
      foodId: null,
      recipeId: null,
      createdAt: now,
      updatedAt: now
    };
    state.entries.push(entry);
    state.selectedDate = values.date;

    if (sameNameSelected) {
      entry.source = 'savedFood';
      entry.foodId = selected.id;
      registerFoodUse(selected, entry);
      persist();
      if (sameNutrients(selected, values)) return finishNewEntry('Eintrag gespeichert.');
      return promptUpdateSavedFood(selected, entry, true);
    }

    if (existingByName) {
      if (sameNutrients(existingByName, values)) {
        entry.source = 'savedFood';
        entry.foodId = existingByName.id;
        registerFoodUse(existingByName, entry);
        persist();
        return finishNewEntry('Eintrag gespeichert.');
      }
      persist();
      return promptUpdateSavedFood(existingByName, entry, false);
    }

    persist();
    promptSaveNewFood(entry);
  }

  function recalculateFoodUse(foodId) {
    if (!foodId) return;
    const food = state.savedFoods.find(item => item.id === foodId);
    if (!food) return;
    const linkedEntries = state.entries.filter(entry => entry.foodId === foodId);
    food.usageCount = linkedEntries.length;
    food.lastUsedAt = linkedEntries.reduce((latest, entry) => {
      const usedAt = localDateTimeISO(entry.date, entry.time);
      return !latest || usedAt > latest ? usedAt : latest;
    }, null);
  }

  function finishEditedEntry(entry, message) {
    state.selectedDate = entry.date;
    state.editingId = null;
    modalRoot.innerHTML = '';
    persist();
    showToast(message);
    state.view = 'today';
    window.setTimeout(render, 50);
  }

  function promptLinkedEntryEdit(entry, linkedFood, values, now) {
    const nameChanged = normalizeName(values.name) !== normalizeName(linkedFood.name);
    const otherWithName = state.savedFoods.find(food => food.id !== linkedFood.id && normalizeName(food.name) === normalizeName(values.name));
    const newFoodButton = nameChanged && !otherWithName
      ? `<button class="secondary-button" id="save-linked-as-new">Als neues Lebensmittel speichern</button>`
      : '';
    const conflictNote = nameChanged && otherWithName
      ? `<p class="modal-note">Unter dem Namen „${esc(otherWithName.name)}“ ist bereits ein anderes Lebensmittel gespeichert. Ein neues Lebensmittel mit demselben Namen wird deshalb nicht automatisch angelegt.</p>`
      : '';

    modalRoot.innerHTML = `<div class="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="linked-edit-title"><div class="modal">
      <div class="modal-icon apricot">${icon('edit')}</div>
      <h2 id="linked-edit-title">Gespeichertes Lebensmittel ebenfalls ändern?</h2>
      <p>Dieser Tagebucheintrag ist mit „${esc(linkedFood.name)}“ verknüpft und weicht jetzt von der gespeicherten Vorlage ab.</p>
      <div class="compare-box">
        <div><small>Gespeichert · ${esc(amountLabel(linkedFood.baseAmount || 1, linkedFood.baseUnit || 'portion'))}</small><strong>${esc(linkedFood.name)}</strong><span>${fmt(linkedFood.calories, 0)} kcal${linkedFood.protein != null ? ` · ${fmt(linkedFood.protein)} g Protein` : ''}${linkedFood.fiber != null ? ` · ${fmt(linkedFood.fiber)} g Ballaststoffe` : ''}</span></div>
        <div><small>Geänderter Eintrag · ${esc(amountLabel(values.amount, values.unit))}</small><strong>${esc(values.name)}</strong><span>${fmt(values.calories, 0)} kcal${values.protein != null ? ` · ${fmt(values.protein)} g Protein` : ''}${values.fiber != null ? ` · ${fmt(values.fiber)} g Ballaststoffe` : ''}</span></div>
      </div>
      ${conflictNote}
      <div class="modal-actions">
        <button class="primary-button" id="update-linked-food">Gespeichertes Lebensmittel aktualisieren</button>
        ${newFoodButton}
        <button class="secondary-button" id="edit-entry-only">Nur Tagebucheintrag ändern</button>
        <button class="secondary-button" id="cancel-linked-edit">Abbrechen</button>
      </div>
    </div></div>`;

    document.getElementById('cancel-linked-edit').onclick = () => { modalRoot.innerHTML = ''; };

    document.getElementById('edit-entry-only').onclick = () => {
      const oldFoodId = entry.foodId;
      Object.assign(entry, values, { updatedAt: now });
      entry.foodId = null;
      if (entry.source === 'savedFood') entry.source = 'manual';
      recalculateFoodUse(oldFoodId);
      finishEditedEntry(entry, 'Tagebucheintrag geändert und Verknüpfung gelöst.');
    };

    document.getElementById('update-linked-food').onclick = () => {
      if (otherWithName) {
        showToast(`„${otherWithName.name}“ ist bereits als anderes Lebensmittel gespeichert.`);
        return;
      }
      linkedFood.name = values.name;
      assignFoodNutrientsFromEntry(linkedFood, values, true);
      linkedFood.updatedAt = now;
      Object.assign(entry, values, { updatedAt: now, foodId: linkedFood.id });
      recalculateFoodUse(linkedFood.id);
      finishEditedEntry(entry, 'Eintrag und gespeichertes Lebensmittel aktualisiert.');
    };

    const saveAsNew = document.getElementById('save-linked-as-new');
    if (saveAsNew) saveAsNew.onclick = () => {
      const oldFoodId = entry.foodId;
      const createdAt = new Date().toISOString();
      const normalizedForNewFood = valuesAtFoodBase(linkedFood, values);
      const newFood = {
        id: uuid(),
        name: values.name,
        calories: normalizedForNewFood ? normalizedForNewFood.calories : values.calories,
        protein: normalizedForNewFood ? normalizedForNewFood.protein : values.protein,
        fiber: normalizedForNewFood ? normalizedForNewFood.fiber : values.fiber,
        fat: normalizedForNewFood ? normalizedForNewFood.fat : values.fat,
        carbohydrates: normalizedForNewFood ? normalizedForNewFood.carbohydrates : values.carbohydrates,
        baseAmount: normalizedForNewFood ? (linkedFood.baseAmount || 1) : (values.amount || 1),
        baseUnit: normalizedForNewFood ? (linkedFood.baseUnit || 'portion') : (values.unit || 'portion'),
        favorite: false,
        usageCount: 0,
        lastUsedAt: null,
        createdAt,
        updatedAt: createdAt
      };
      state.savedFoods.push(newFood);
      Object.assign(entry, values, { updatedAt: now, foodId: newFood.id });
      recalculateFoodUse(oldFoodId);
      recalculateFoodUse(newFood.id);
      finishEditedEntry(entry, 'Eintrag geändert und als neues Lebensmittel gespeichert.');
    };
  }

  function registerFoodUse(food, entry) {
    food.usageCount = Number(food.usageCount || 0) + 1;
    const usedAt = localDateTimeISO(entry.date, entry.time);
    if (!food.lastUsedAt || usedAt > food.lastUsedAt) food.lastUsedAt = usedAt;
    food.updatedAt = new Date().toISOString();
  }

  function finishNewEntry(message) {
    modalRoot.innerHTML = '';
    state.selectedSavedFoodId = null;
    state.editingId = null;
    state.addTab = 'input';
    state.view = 'today';
    persist();
    showToast(message);
    render();
  }

  function promptSaveNewFood(entry) {
    modalRoot.innerHTML = `<div class="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="save-food-title"><div class="modal">
      <div class="modal-icon sage">${icon('star')}</div>
      <h2 id="save-food-title">Für später speichern?</h2>
      <p><strong>${esc(entry.name)}</strong><br><span class="modal-quantity">${esc(amountLabel(entry.amount, entry.unit))}</span><br>${fmt(entry.calories, 0)} kcal${entry.protein != null ? ` · ${fmt(entry.protein)} g Protein` : ''}${entry.fiber != null ? ` · ${fmt(entry.fiber)} g Ballaststoffe` : ''}${entry.fat != null ? ` · ${fmt(entry.fat)} g Fett` : ''}${entry.carbohydrates != null ? ` · ${fmt(entry.carbohydrates)} g Kohlenhydrate` : ''}</p>
      <div class="modal-actions"><button class="primary-button" id="save-new-food">Speichern</button><button class="secondary-button" id="skip-new-food">Nein</button></div>
    </div></div>`;

    document.getElementById('skip-new-food').onclick = () => finishNewEntry('Eintrag gespeichert.');
    document.getElementById('save-new-food').onclick = () => {
      const now = new Date().toISOString();
      const food = {
        id: uuid(),
        name: entry.name,
        calories: entry.calories,
        protein: entry.protein,
        fiber: entry.fiber,
        fat: entry.fat,
        carbohydrates: entry.carbohydrates,
        baseAmount: entry.amount || 1,
        baseUnit: entry.unit || 'portion',
        favorite: false,
        usageCount: 1,
        lastUsedAt: localDateTimeISO(entry.date, entry.time),
        createdAt: now,
        updatedAt: now
      };
      state.savedFoods.push(food);
      entry.source = 'savedFood';
      entry.foodId = food.id;
      finishNewEntry('Eintrag und Lebensmittel gespeichert.');
    };
  }

  function promptUpdateSavedFood(food, entry, selectedWasUsed) {
    modalRoot.innerHTML = `<div class="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="update-food-title"><div class="modal">
      <div class="modal-icon apricot">${icon('edit')}</div>
      <h2 id="update-food-title">Gespeichertes Lebensmittel aktualisieren?</h2>
      <p>Für „${esc(food.name)}“ sind bereits andere Nährwerte gespeichert.</p>
      <div class="compare-box">
        <div><small>Gespeichert · ${esc(amountLabel(food.baseAmount || 1, food.baseUnit || 'portion'))}</small><strong>${fmt(food.calories, 0)} kcal</strong><span>${food.protein != null ? `${fmt(food.protein)} g Protein` : 'Protein offen'} · ${food.fiber != null ? `${fmt(food.fiber)} g Ballaststoffe` : 'Ballaststoffe offen'}</span></div>
        <div><small>Dieser Eintrag · ${esc(amountLabel(entry.amount, entry.unit))}</small><strong>${fmt(entry.calories, 0)} kcal</strong><span>${entry.protein != null ? `${fmt(entry.protein)} g Protein` : 'Protein offen'} · ${entry.fiber != null ? `${fmt(entry.fiber)} g Ballaststoffe` : 'Ballaststoffe offen'}</span></div>
      </div>
      <div class="modal-actions"><button class="primary-button" id="update-saved-food">Gespeichertes Lebensmittel aktualisieren</button><button class="secondary-button" id="one-off-food">Nur diesen Eintrag verwenden</button></div>
    </div></div>`;

    document.getElementById('one-off-food').onclick = () => {
      if (!selectedWasUsed) {
        entry.source = 'manual';
        entry.foodId = null;
      }
      persist();
      finishNewEntry('Eintrag gespeichert.');
    };
    document.getElementById('update-saved-food').onclick = () => {
      food.name = entry.name;
      assignFoodNutrientsFromEntry(food, entry, true);
      food.updatedAt = new Date().toISOString();
      if (!selectedWasUsed) registerFoodUse(food, entry);
      entry.source = 'savedFood';
      entry.foodId = food.id;
      persist();
      finishNewEntry('Eintrag gespeichert und Lebensmittel aktualisiert.');
    };
  }

  function renderFavorites(target) {
    const foods = state.savedFoods.filter(f => f.favorite).sort((a, b) => a.name.localeCompare(b.name, 'de'));
    target.innerHTML = `<div class="section-heading"><div><h2>Favoriten</h2><p>Deine schnellsten Wege zum nächsten Eintrag.</p></div></div>
      ${foods.length ? `<div class="food-grid">${foods.map(food => savedFoodCard(food, { showLastUsed: false })).join('')}</div>` : emptyFoodState('star')}`;
    bindSavedFoodCards(target);
  }

  function renderAddRecipes(target) {
    const needle = normalizeName(state.addRecipeSearch);
    const recipes = [...state.recipes]
      .filter(recipe => !needle || normalizeName(recipe.name).includes(needle) || (recipe.ingredients || []).some(item => normalizeName(item.name).includes(needle)))
      .sort((a, b) => a.name.localeCompare(b.name, 'de'));

    target.innerHTML = `<div class="section-heading"><div><h2>Rezepte</h2><p>Wähle ein Rezept und trage direkt die gewünschte Portionsmenge ein.</p></div></div>
      <div class="manager-search add-recipe-search"><span>${icon('search')}</span><input id="add-recipe-search" type="search" placeholder="Rezept suchen" autocomplete="off" value="${esc(state.addRecipeSearch)}"></div>
      <div id="add-recipe-list" class="recipe-grid quick-recipe-grid">${addRecipeListMarkup(recipes)}</div>`;

    document.getElementById('add-recipe-search').addEventListener('input', event => {
      state.addRecipeSearch = event.target.value;
      const q = normalizeName(state.addRecipeSearch);
      const filtered = [...state.recipes]
        .filter(recipe => !q || normalizeName(recipe.name).includes(q) || (recipe.ingredients || []).some(item => normalizeName(item.name).includes(q)))
        .sort((a, b) => a.name.localeCompare(b.name, 'de'));
      document.getElementById('add-recipe-list').innerHTML = addRecipeListMarkup(filtered);
      bindAddRecipeCards(target);
    });
    bindAddRecipeCards(target);
  }

  function addRecipeListMarkup(recipes) {
    if (!state.recipes.length) {
      return `<div class="mini-empty compact"><div class="mini-empty-icon">${icon('recipe')}</div><h3>Noch keine Rezepte</h3><p>Lege zuerst im Register Rezepte ein Rezept an.</p></div>`;
    }
    if (!recipes.length) return `<div class="mini-empty compact"><div class="mini-empty-icon">${icon('search')}</div><h3>Keine Treffer</h3><p>Für diese Suche wurde kein Rezept gefunden.</p></div>`;
    return recipes.map(recipe => {
      const per = recipePerPortion(recipe);
      return `<article class="recipe-card"><button class="recipe-card-main" data-log-recipe-id="${esc(recipe.id)}"><span class="recipe-card-icon">${icon('bowl')}</span><span class="recipe-card-copy"><strong>${esc(recipe.name)}</strong><small>${recipeNutrientLine(per)}</small><span>pro Portion · zum Erfassen antippen</span></span><span class="chev">›</span></button></article>`;
    }).join('');
  }

  function bindAddRecipeCards(root) {
    root.querySelectorAll('[data-log-recipe-id]').forEach(btn => {
      btn.onclick = () => setView('recipeLog', { selectedRecipeId: btn.dataset.logRecipeId, recipeLogOrigin: 'add' });
    });
  }

  function renderRecent(target) {
    const recent = [...state.savedFoods]
      .filter(f => f.lastUsedAt)
      .sort((a, b) => String(b.lastUsedAt).localeCompare(String(a.lastUsedAt)))
      .slice(0, 10);
    const frequent = [...state.savedFoods]
      .filter(f => Number(f.usageCount || 0) > 0)
      .sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0) || String(b.lastUsedAt || '').localeCompare(String(a.lastUsedAt || '')))
      .slice(0, 5);

    target.innerHTML = `<div class="section-heading"><div><h2>Zuletzt verwendet</h2><p>Maximal zehn unterschiedliche Lebensmittel.</p></div></div>
      ${recent.length ? `<div class="food-grid">${recent.map(food => savedFoodCard(food, { showLastUsed: true })).join('')}</div>` : emptyFoodState('recent')}
      <div class="section-heading spaced"><div><h2>Häufig verwendet</h2><p>Deine fünf meistgenutzten gespeicherten Lebensmittel.</p></div></div>
      ${frequent.length ? `<div class="food-grid">${frequent.map(food => savedFoodCard(food, { showCount: true })).join('')}</div>` : `<div class="quiet-card">Noch keine Nutzungsdaten vorhanden.</div>`}`;
    bindSavedFoodCards(target);
  }

  function emptyFoodState(kind) {
    const data = kind === 'star'
      ? [icon('starEmpty'), 'Noch keine Favoriten', 'Markiere häufig verwendete Lebensmittel mit ★, damit du sie hier schnell wiederfindest.']
      : [icon('recent'), 'Noch keine zuletzt verwendeten Lebensmittel', 'Sobald du gespeicherte Lebensmittel verwendest, erscheinen sie hier.'];
    return `<div class="mini-empty"><div class="mini-empty-icon">${data[0]}</div><h3>${data[1]}</h3><p>${data[2]}</p></div>`;
  }

  function savedFoodCard(food, options = {}) {
    const parts = [`${fmt(food.calories, 0)} kcal`];
    if (food.protein != null) parts.push(`${fmt(food.protein)} g Protein`);
    if (food.fiber != null) parts.push(`${fmt(food.fiber)} g Ballaststoffe`);
    const base = amountLabel(food.baseAmount || 1, food.baseUnit || 'portion');
    let meta = '';
    if (options.showLastUsed && food.lastUsedAt) meta = `<span class="food-meta">${esc(lastUsedLabel(food.lastUsedAt))}</span>`;
    if (options.showCount) meta = `<span class="food-meta">${Number(food.usageCount || 0)}× verwendet</span>`;
    return `<article class="saved-food-card">
      <button class="saved-food-main" data-select-food="${esc(food.id)}">
        <strong>${esc(food.name)}</strong>
        <span><b class="food-base">${esc(base)}</b> · ${parts.join(' · ')}</span>
        ${meta}
      </button>
      <button class="favorite-button ${food.favorite ? 'active' : ''}" data-toggle-favorite="${esc(food.id)}" aria-label="Favorit umschalten">${food.favorite ? icon('star') : icon('starEmpty')}</button>
    </article>`;
  }

  function bindSavedFoodCards(root) {
    root.querySelectorAll('[data-select-food]').forEach(btn => {
      btn.onclick = () => selectSavedFood(btn.dataset.selectFood);
    });
    root.querySelectorAll('[data-toggle-favorite]').forEach(btn => {
      btn.onclick = event => {
        event.stopPropagation();
        toggleFavorite(btn.dataset.toggleFavorite);
      };
    });
  }

  function lastUsedLabel(value) {
    const datePart = String(value).slice(0, 10);
    const timePart = String(value).slice(11, 16);
    if (datePart === todayISO()) return `heute, ${timePart}`;
    if (datePart === offsetDate(todayISO(), -1)) return `gestern, ${timePart}`;
    return `${shortDate(datePart).slice(0, 5)}, ${timePart}`;
  }

  function toggleFavorite(foodId) {
    const food = state.savedFoods.find(f => f.id === foodId);
    if (!food) return;
    food.favorite = !food.favorite;
    food.updatedAt = new Date().toISOString();
    persist();
    showToast(food.favorite ? 'Zu Favoriten hinzugefügt.' : 'Aus Favoriten entfernt.');
    render();
  }

  function confirmDeleteEntry(entry) {
    modalRoot.innerHTML = `<div class="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="delete-title"><div class="modal">
      <h2 id="delete-title">Eintrag löschen?</h2><p>„${esc(entry.name)}“ wird aus deinem Ernährungstagebuch entfernt.</p>
      <div class="modal-actions"><button class="danger-button" id="confirm-delete">Löschen</button><button class="secondary-button" id="cancel-delete">Abbrechen</button></div>
    </div></div>`;
    document.getElementById('cancel-delete').onclick = () => { modalRoot.innerHTML = ''; };
    document.getElementById('confirm-delete').onclick = () => {
      state.entries = state.entries.filter(e => e.id !== entry.id);
      persist();
      modalRoot.innerHTML = '';
      state.editingId = null;
      state.view = 'today';
      showToast('Eintrag gelöscht.');
      render();
    };
  }

  function cloudSettingsMarkup() {
    const cloud = window.MampfoCloud;
    if (!cloud || !cloud.isConfigured()) {
      return `<section class="cloud-card cloud-unconfigured">
        <div class="cloud-card-head"><span class="cloud-icon">☁</span><div><strong>Supabase noch nicht konfiguriert</strong><small>Project URL und Publishable Key fehlen noch.</small></div></div>
        <p>Trage die Werte in <code>supabase-config.js</code> ein und führe vorher <code>SUPABASE_SETUP.sql</code> in deinem Supabase-Projekt aus.</p>
        <div class="cloud-hint">Nur einen <strong>Publishable Key</strong> verwenden. Secret- oder service_role-Keys gehören niemals in die PWA.</div>
      </section>`;
    }

    const user = cloud.currentUser();
    if (!user) {
      return `<section class="cloud-card">
        <div class="cloud-card-head"><span class="cloud-icon">☁</span><div><strong>Mampfo Cloud</strong><small>Supabase ist konfiguriert · noch nicht angemeldet</small></div></div>
        <form id="cloud-auth-form" class="cloud-auth-form">
          <label><span>E-Mail</span><input id="cloud-email" type="email" autocomplete="email" required placeholder="name@beispiel.de"></label>
          <label><span>Passwort</span><input id="cloud-password" type="password" autocomplete="current-password" minlength="6" required placeholder="mindestens 6 Zeichen"></label>
          <div class="cloud-actions"><button type="submit" class="primary-button">Anmelden</button><button type="button" class="secondary-button" id="cloud-signup">Konto erstellen</button></div>
        </form>
        <p class="cloud-footnote">Deine bestehenden Mampfo-Daten bleiben weiterhin lokal gespeichert. Die Cloud wird erst nach einer zusätzlichen Bestätigung befüllt.</p>
      </section>`;
    }

    const local = cloud.localCounts();
    return `<section class="cloud-card">
      <div class="cloud-card-head"><span class="cloud-icon connected">☁</span><div><strong>Mampfo Cloud</strong><small>Angemeldet als ${esc(user.email || 'Mampfo-Konto')}</small></div></div>
      <div class="cloud-status-line"><span class="cloud-status-dot"></span><span id="cloud-status-text">Cloud-Status wird geprüft …</span></div>
      <div class="cloud-counts local">
        <div><span>Ernährung</span><strong>${local.entries}</strong></div>
        <div><span>Lebensmittel</span><strong>${local.foods}</strong></div>
        <div><span>Rezepte</span><strong>${local.recipes}</strong></div>
        <div><span>Fastenpläne</span><strong>${local.fastPlans}</strong></div>
        <div><span>Fastenphasen</span><strong>${local.fastingSessions}</strong></div>
      </div>
      <div id="cloud-remote-summary" class="cloud-remote-summary"><span>Cloud</span><strong>Prüfung läuft …</strong></div>
      <div class="cloud-actions stacked">
        <button type="button" class="secondary-button" id="cloud-check">↻ Cloud prüfen</button>
        <button type="button" class="primary-button" id="cloud-initialize" disabled>Lokale Daten in Cloud übernehmen</button>
        <button type="button" class="cloud-logout" id="cloud-logout">Abmelden</button>
      </div>
      <p class="cloud-footnote">v0.6.1 lädt nur in eine <strong>leere</strong> persönliche Cloud hoch. Bereits vorhandene Cloud-Daten werden nicht überschrieben oder zusammengeführt.</p>
    </section>`;
  }

  function cloudCountsText(counts) {
    return `${counts.entries} Ernährung · ${counts.foods} Lebensmittel · ${counts.recipes} Rezepte · ${counts.fastPlans} Pläne · ${counts.fastingSessions} Fastenphasen`;
  }

  async function refreshCloudStatus() {
    const cloud = window.MampfoCloud;
    const status = document.getElementById('cloud-status-text');
    const summary = document.getElementById('cloud-remote-summary');
    const init = document.getElementById('cloud-initialize');
    if (!cloud || !status || !summary || !init) return;
    status.textContent = 'Cloud-Status wird geprüft …';
    init.disabled = true;
    try {
      const user = await cloud.getUser();
      if (!user) {
        showToast('Bitte erneut anmelden.');
        render();
        return;
      }
      const counts = await cloud.cloudCounts();
      summary.innerHTML = `<span>Cloud</span><strong>${esc(cloudCountsText(counts))}</strong>`;
      if (counts.isEmpty) {
        status.textContent = 'Cloud ist leer · Erst-Upload möglich';
        init.disabled = false;
        init.classList.remove('cloud-blocked');
      } else {
        status.textContent = 'Cloud enthält bereits Mampfo-Daten';
        init.disabled = true;
        init.classList.add('cloud-blocked');
      }
    } catch (error) {
      status.textContent = error.message || 'Cloud-Prüfung fehlgeschlagen.';
      summary.innerHTML = '<span>Cloud</span><strong>nicht verfügbar</strong>';
      init.disabled = true;
    }
  }

  function confirmCloudInitialization() {
    const cloud = window.MampfoCloud;
    if (!cloud) return;
    const counts = cloud.localCounts();
    modalRoot.innerHTML = `<div class="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="cloud-init-title"><div class="modal">
      <h2 id="cloud-init-title">Mampfo Cloud initialisieren?</h2>
      <p>Die lokalen Daten dieses Geräts werden als erster Cloud-Stand hochgeladen. Lokal wird nichts gelöscht oder ersetzt.</p>
      <div class="cloud-confirm-list">
        <div><span>Ernährungseinträge</span><strong>${counts.entries}</strong></div>
        <div><span>Lebensmittel</span><strong>${counts.foods}</strong></div>
        <div><span>Rezepte</span><strong>${counts.recipes}</strong></div>
        <div><span>Fastenpläne</span><strong>${counts.fastPlans}</strong></div>
        <div><span>Fastenphasen</span><strong>${counts.fastingSessions}</strong></div>
      </div>
      <p class="cloud-warning">Vor dem Upload prüft Mampfo die Cloud noch einmal. Ist sie nicht leer, wird der Vorgang abgebrochen.</p>
      <div class="modal-actions"><button class="primary-button" id="confirm-cloud-init">Jetzt hochladen</button><button class="secondary-button" id="cancel-cloud-init">Abbrechen</button></div>
    </div></div>`;
    document.getElementById('cancel-cloud-init').onclick = () => { modalRoot.innerHTML = ''; };
    document.getElementById('confirm-cloud-init').onclick = async () => {
      const button = document.getElementById('confirm-cloud-init');
      button.disabled = true;
      button.textContent = 'Upload läuft …';
      try {
        const result = await cloud.initializeCloud(CFG.version);
        modalRoot.innerHTML = '';
        showToast('Mampfo Cloud wurde initialisiert.');
        await refreshCloudStatus();
      } catch (error) {
        button.disabled = false;
        button.textContent = 'Jetzt hochladen';
        showToast(error.message || 'Cloud-Upload fehlgeschlagen.');
      }
    };
  }

  function bindCloudSettings() {
    const cloud = window.MampfoCloud;
    if (!cloud || !cloud.isConfigured()) return;

    const authForm = document.getElementById('cloud-auth-form');
    authForm?.addEventListener('submit', async e => {
      e.preventDefault();
      const email = document.getElementById('cloud-email').value.trim();
      const password = document.getElementById('cloud-password').value;
      if (!email || password.length < 6) return showToast('Bitte E-Mail und Passwort eingeben.');
      const button = authForm.querySelector('button[type="submit"]');
      button.disabled = true;
      button.textContent = 'Anmeldung …';
      try {
        await cloud.signIn(email, password);
        showToast('Angemeldet.');
        render();
      } catch (error) {
        button.disabled = false;
        button.textContent = 'Anmelden';
        showToast(error.message || 'Anmeldung fehlgeschlagen.');
      }
    });

    document.getElementById('cloud-signup')?.addEventListener('click', async () => {
      const email = document.getElementById('cloud-email').value.trim();
      const password = document.getElementById('cloud-password').value;
      if (!email || password.length < 6) return showToast('Bitte E-Mail und mindestens 6 Zeichen Passwort eingeben.');
      const button = document.getElementById('cloud-signup');
      button.disabled = true;
      button.textContent = 'Konto wird erstellt …';
      try {
        const result = await cloud.signUp(email, password);
        if (result.session) {
          showToast('Konto erstellt und angemeldet.');
          render();
        } else {
          button.disabled = false;
          button.textContent = 'Konto erstellen';
          showToast('Konto erstellt. Bitte Bestätigungs-Mail öffnen und danach anmelden.');
        }
      } catch (error) {
        button.disabled = false;
        button.textContent = 'Konto erstellen';
        showToast(error.message || 'Konto konnte nicht erstellt werden.');
      }
    });

    document.getElementById('cloud-logout')?.addEventListener('click', async () => {
      await cloud.signOut();
      showToast('Von Mampfo Cloud abgemeldet.');
      render();
    });
    document.getElementById('cloud-check')?.addEventListener('click', refreshCloudStatus);
    document.getElementById('cloud-initialize')?.addEventListener('click', confirmCloudInitialization);
    if (cloud.currentUser()) refreshCloudStatus();
  }

  function renderSettings() {
    app.innerHTML = `<main class="page">
      <header class="topbar"><button class="icon-button" id="settings-back" aria-label="Zurück">${icon('back')}</button><h1>Einstellungen</h1><span style="width:44px"></span></header>
      <div class="settings-title">${icon('target')} Tagesziele</div>
      <form id="settings-form">
        <div class="setting-card calories"><div class="metric-icon">${icon('flame')}</div><div><label for="set-calories">Kalorien pro Tag</label><div class="inline-unit"><input id="set-calories" inputmode="numeric" value="${esc(state.settings.dailyCalories)}"><span>kcal</span></div></div></div>
        <div class="setting-card protein"><div class="metric-icon">${icon('protein')}</div><div><label for="set-protein">Protein pro Tag</label><div class="inline-unit"><input id="set-protein" inputmode="decimal" value="${esc(state.settings.dailyProtein)}"><span>g</span></div></div></div>
        <button class="primary-button" type="submit" style="margin-top:16px">Tagesziele speichern</button>
      </form>

      <div class="settings-title">${icon('list')} Gespeicherte Lebensmittel</div>
      <button class="manage-foods-card" id="manage-foods">
        <span class="manage-icon">${icon('star')}</span>
        <span><strong>Lebensmittel verwalten</strong><small>${state.savedFoods.length === 1 ? '1 gespeichertes Lebensmittel' : `${state.savedFoods.length} gespeicherte Lebensmittel`}</small></span>
        <span class="chev">›</span>
      </button>

      <div class="settings-title">☁ Datenaustausch</div>
      ${cloudSettingsMarkup()}

      <div class="settings-note">${icon('rocket')}<br>Ernährung, Rezepte, Fasten und die vollständige Auswertung sind verfügbar. v0.6.1 bereitet zusätzlich den sicheren Geräteabgleich über Supabase vor.</div>
      <div class="version">${esc(CFG.appName)} · Version ${esc(CFG.version)}</div>
    </main>${bottomNav('')}`;

    document.getElementById('settings-back').onclick = () => setView('today');
    document.getElementById('manage-foods').onclick = () => setView('foods');
    document.getElementById('settings-form').addEventListener('submit', e => {
      e.preventDefault();
      const calories = parseNum(document.getElementById('set-calories').value);
      const protein = parseNum(document.getElementById('set-protein').value);
      if (!calories || calories <= 0 || !protein || protein <= 0) return showToast('Bitte gültige Tagesziele eingeben.');
      state.settings.dailyCalories = calories;
      state.settings.dailyProtein = protein;
      persist();
      showToast('Tagesziele gespeichert.');
    });
    bindCloudSettings();
  }

  function renderAddFoods(target) {
    const sorted = [...state.savedFoods].sort((a, b) => a.name.localeCompare(b.name, 'de'));
    target.innerHTML = `<div class="section-heading food-library-heading"><div><h2>Lebensmittel</h2><p>Deine persönliche Lebensmitteldatenbank direkt beim Erfassen.</p></div><button type="button" class="secondary-button compact-action" id="add-new-food">${icon('plus')} Neu</button></div>
      <div class="manager-search"><span>${icon('search')}</span><input id="add-food-search" type="search" placeholder="Lebensmittel suchen" autocomplete="off"></div>
      <div class="manager-caption">${state.savedFoods.length === 1 ? '<strong>1</strong> gespeichertes Lebensmittel' : `<strong>${state.savedFoods.length}</strong> gespeicherte Lebensmittel`}</div>
      <section id="add-food-list" class="manager-list">${managerFoodList(sorted)}</section>`;

    const refresh = value => {
      const needle = normalizeName(value);
      const foods = sorted.filter(food => normalizeName(food.name).includes(needle));
      document.getElementById('add-food-list').innerHTML = managerFoodList(foods);
      bindManagerCards(document.getElementById('add-food-list'), 'add');
    };
    document.getElementById('add-food-search').addEventListener('input', event => refresh(event.target.value));
    document.getElementById('add-new-food').onclick = () => setView('foodEdit', { editingFoodId: '__new__', foodEditOrigin: 'add' });
    bindManagerCards(document.getElementById('add-food-list'), 'add');
  }

  function renderFoodManager() {
    const sorted = [...state.savedFoods].sort((a, b) => a.name.localeCompare(b.name, 'de'));
    app.innerHTML = `<main class="page">
      <header class="topbar"><button class="icon-button" id="foods-back" aria-label="Zurück">${icon('back')}</button><h1>Lebensmittel</h1><button class="icon-button" id="manager-new-food" aria-label="Neues Lebensmittel">${icon('plus')}</button></header>
      <div class="manager-search"><span>${icon('search')}</span><input id="food-manager-search" type="search" placeholder="Lebensmittel suchen" autocomplete="off"></div>
      <div class="manager-caption">${state.savedFoods.length === 1 ? '<strong>1</strong> gespeichertes Lebensmittel' : `<strong>${state.savedFoods.length}</strong> gespeicherte Lebensmittel`}</div>
      <section id="manager-list" class="manager-list">${managerFoodList(sorted)}</section>
    </main>${bottomNav('')}`;
    document.getElementById('foods-back').onclick = () => setView('settings');
    document.getElementById('manager-new-food').onclick = () => setView('foodEdit', { editingFoodId: '__new__', foodEditOrigin: 'settings' });
    document.getElementById('food-manager-search').addEventListener('input', event => {
      const needle = normalizeName(event.target.value);
      const foods = sorted.filter(food => normalizeName(food.name).includes(needle));
      document.getElementById('manager-list').innerHTML = managerFoodList(foods);
      bindManagerCards(document.getElementById('manager-list'), 'settings');
    });
    bindManagerCards(document.getElementById('manager-list'), 'settings');
  }

  function managerFoodList(foods) {
    if (!foods.length) return `<div class="mini-empty compact"><div class="mini-empty-icon">${icon('search')}</div><h3>Keine Treffer</h3><p>Für diese Suche wurde kein gespeichertes Lebensmittel gefunden.</p></div>`;
    return foods.map(food => `<article class="manager-food-card">
      <button class="manager-food-main" data-edit-food="${esc(food.id)}">
        <span class="manager-food-title"><strong>${esc(food.name)}</strong><small>${esc(amountLabel(food.baseAmount || 1, food.baseUnit || 'portion'))} · ${fmt(food.calories, 0)} kcal${food.protein != null ? ` · ${fmt(food.protein)} g Protein` : ''}${food.fiber != null ? ` · ${fmt(food.fiber)} g Ballaststoffe` : ''}</small></span>
        <span class="chev">›</span>
      </button>
      <button class="favorite-button ${food.favorite ? 'active' : ''}" data-manager-favorite="${esc(food.id)}" aria-label="Favorit umschalten">${food.favorite ? icon('star') : icon('starEmpty')}</button>
    </article>`).join('');
  }

  function bindManagerCards(root = document, origin = 'settings') {
    root.querySelectorAll('[data-edit-food]').forEach(btn => {
      btn.onclick = () => setView('foodEdit', { editingFoodId: btn.dataset.editFood, foodEditOrigin: origin });
    });
    root.querySelectorAll('[data-manager-favorite]').forEach(btn => {
      btn.onclick = event => {
        event.stopPropagation();
        const food = state.savedFoods.find(f => f.id === btn.dataset.managerFavorite);
        if (!food) return;
        food.favorite = !food.favorite;
        food.updatedAt = new Date().toISOString();
        persist();
        if (origin === 'add') renderAddTabContent();
        else renderFoodManager();
        showToast(food.favorite ? 'Zu Favoriten hinzugefügt.' : 'Aus Favoriten entfernt.');
      };
    });
  }

  function renderFoodEdit() {
    const isNew = state.editingFoodId === '__new__';
    const food = isNew ? {
      id: null, name: '', baseAmount: 100, baseUnit: 'g', calories: null, protein: null, fiber: null,
      fat: null, carbohydrates: null, favorite: false, usageCount: 0, lastUsedAt: null
    } : state.savedFoods.find(f => f.id === state.editingFoodId);
    if (!food) return returnFromFoodEdit();

    const unitOptions = ['portion', 'g', 'ml', 'piece'].map(unit => `<option value="${unit}" ${food.baseUnit === unit ? 'selected' : ''}>${unitLabel(unit, 2)}</option>`).join('');
    const extraOpen = food.fat != null || food.carbohydrates != null ? ' open' : '';
    const normalizeButton = ['g', 'ml'].includes(food.baseUnit) && Number(food.baseAmount) !== 100
      ? `<button type="button" class="reference-normalize-button" id="normalize-reference">Auf 100 ${food.baseUnit} umrechnen</button>` : '';

    app.innerHTML = `<main class="page">
      <header class="topbar"><button class="icon-button" id="food-edit-back" aria-label="Zurück">${icon('back')}</button><h1>${isNew ? 'Lebensmittel anlegen' : 'Lebensmittel bearbeiten'}</h1><span style="width:44px"></span></header>
      <div class="info-banner">${icon('star')} <span>Die Nährwerte beziehen sich auf die angegebene Bezugsmenge. ${isNew ? 'Lege eine praktische Referenzmenge fest.' : 'Änderungen gelten nur für zukünftige Einträge.'}</span></div>
      <form id="saved-food-form" class="form-card">
        ${fieldRow(icon('food'), 'Name', `<input id="saved-name" type="text" value="${esc(food.name)}" autocomplete="off">`)}
        ${fieldRow(icon('scale'), 'Bezugsmenge', `<div class="amount-unit-row"><input id="saved-base-amount" type="text" inputmode="decimal" value="${inputNumber(food.baseAmount ?? 1, 3)}"><select id="saved-base-unit">${unitOptions}</select></div><div id="reference-tools">${normalizeButton}</div><p class="input-help" id="reference-help">Änderst du nur die Menge bei gleicher Einheit, rechnet Mampfo alle vorhandenen Nährwerte proportional mit um.</p>`)}
        ${fieldRow(icon('flame'), 'Kalorien (kcal)', `<input id="saved-calories" type="text" inputmode="decimal" value="${inputNumber(food.calories, 2)}">`)}
        ${fieldRow(icon('protein'), 'Protein (g)', `<input id="saved-protein" type="text" inputmode="decimal" value="${inputNumber(food.protein, 2)}" placeholder="optional">`)}
        ${fieldRow(icon('leaf'), 'Ballaststoffe (g)', `<input id="saved-fiber" type="text" inputmode="decimal" value="${inputNumber(food.fiber, 2)}" placeholder="optional">`)}
        <details class="extra-nutrients"${extraOpen}>
          <summary>Weitere Nährwerte</summary>
          <div class="extra-nutrient-fields">
            ${fieldRow(icon('drop'), 'Fett (g)', `<input id="saved-fat" type="text" inputmode="decimal" value="${inputNumber(food.fat, 2)}" placeholder="optional">`)}
            ${fieldRow(icon('carbs'), 'Kohlenhydrate (g)', `<input id="saved-carbohydrates" type="text" inputmode="decimal" value="${inputNumber(food.carbohydrates, 2)}" placeholder="optional">`)}
          </div>
        </details>
        <button type="button" class="favorite-toggle ${food.favorite ? 'active' : ''}" id="food-favorite-toggle">${food.favorite ? icon('star') : icon('starEmpty')} <span>${food.favorite ? 'Favorit' : 'Als Favorit markieren'}</span></button>
        <div class="form-actions">
          <button class="primary-button" type="submit">${isNew ? 'Lebensmittel speichern' : 'Änderungen speichern'}</button>
          ${isNew ? '' : `<button class="danger-button" type="button" id="delete-saved-food">${icon('trash')} Lebensmittel löschen</button>`}
        </div>
      </form>
    </main>${bottomNav('')}`;

    const amountInput = document.getElementById('saved-base-amount');
    const unitSelect = document.getElementById('saved-base-unit');
    const nutrientInputs = {
      calories: document.getElementById('saved-calories'), protein: document.getElementById('saved-protein'),
      fiber: document.getElementById('saved-fiber'), fat: document.getElementById('saved-fat'), carbohydrates: document.getElementById('saved-carbohydrates')
    };
    let amountAnchor = null;

    const captureAmountAnchor = () => {
      amountAnchor = {
        amount: parseNum(amountInput.value), unit: unitSelect.value,
        nutrients: Object.fromEntries(Object.entries(nutrientInputs).map(([key, el]) => [key, parseNum(el.value)]))
      };
    };
    const writeScaledNutrients = newAmount => {
      if (!amountAnchor || amountAnchor.amount == null || amountAnchor.amount <= 0 || newAmount == null || newAmount <= 0) return;
      if (unitSelect.value !== amountAnchor.unit) return;
      const factor = newAmount / amountAnchor.amount;
      Object.entries(nutrientInputs).forEach(([key, el]) => {
        const value = amountAnchor.nutrients[key];
        if (value != null) el.value = inputNumber(value * factor, key === 'calories' ? 2 : 2);
      });
    };
    const updateReferenceTools = () => {
      const unit = unitSelect.value;
      const amount = parseNum(amountInput.value);
      const tools = document.getElementById('reference-tools');
      if (['g', 'ml'].includes(unit) && amount != null && amount > 0 && Math.abs(amount - 100) > 0.000001) {
        tools.innerHTML = `<button type="button" class="reference-normalize-button" id="normalize-reference">Auf 100 ${unit} umrechnen</button>`;
        document.getElementById('normalize-reference').onclick = () => {
          captureAmountAnchor();
          amountInput.value = '100';
          writeScaledNutrients(100);
          captureAmountAnchor();
          updateReferenceTools();
          showToast(`Auf 100 ${unit} umgerechnet.`);
        };
      } else tools.innerHTML = '';
    };

    amountInput.addEventListener('focus', captureAmountAnchor);
    amountInput.addEventListener('input', () => {
      if (!amountAnchor) captureAmountAnchor();
      writeScaledNutrients(parseNum(amountInput.value));
      updateReferenceTools();
    });
    amountInput.addEventListener('blur', () => { amountAnchor = null; });
    unitSelect.addEventListener('change', () => {
      amountAnchor = null;
      document.getElementById('reference-help').textContent = 'Einheitenwechsel werden nicht automatisch umgerechnet. Bitte prüfe die Nährwerte manuell.';
      updateReferenceTools();
    });
    updateReferenceTools();

    document.getElementById('food-edit-back').onclick = returnFromFoodEdit;
    document.getElementById('food-favorite-toggle').onclick = event => {
      food.favorite = !food.favorite;
      if (!isNew) {
        food.updatedAt = new Date().toISOString();
        persist();
      }
      event.currentTarget.classList.toggle('active', food.favorite);
      event.currentTarget.innerHTML = `${food.favorite ? icon('star') : icon('starEmpty')} <span>${food.favorite ? 'Favorit' : 'Als Favorit markieren'}</span>`;
      showToast(food.favorite ? 'Zu Favoriten hinzugefügt.' : 'Aus Favoriten entfernt.');
    };
    document.getElementById('saved-food-form').addEventListener('submit', e => {
      e.preventDefault();
      const values = {
        name: document.getElementById('saved-name').value.trim(),
        baseAmount: parseNum(amountInput.value),
        baseUnit: unitSelect.value,
        calories: parseNum(nutrientInputs.calories.value), protein: parseNum(nutrientInputs.protein.value),
        fiber: parseNum(nutrientInputs.fiber.value), fat: parseNum(nutrientInputs.fat.value), carbohydrates: parseNum(nutrientInputs.carbohydrates.value)
      };
      if (!values.name) return showToast('Bitte einen Namen eingeben.');
      if (values.baseAmount == null || values.baseAmount <= 0) return showToast('Bitte eine gültige Bezugsmenge eingeben.');
      if (!['portion', 'g', 'ml', 'piece'].includes(values.baseUnit)) return showToast('Bitte eine gültige Einheit auswählen.');
      if (values.calories == null || values.calories < 0) return showToast('Bitte gültige Kalorien eingeben.');
      if ([values.protein, values.fiber, values.fat, values.carbohydrates].some(value => value != null && value < 0)) return showToast('Nährwerte dürfen nicht negativ sein.');
      const duplicate = state.savedFoods.find(f => (!isNew && f.id === food.id) ? false : normalizeName(f.name) === normalizeName(values.name));
      if (duplicate) return showToast('Ein Lebensmittel mit diesem Namen ist bereits gespeichert.');
      if (isNew) {
        const now = new Date().toISOString();
        state.savedFoods.push({ id: uuid(), ...values, favorite: food.favorite, usageCount: 0, lastUsedAt: null, createdAt: now, updatedAt: now });
      } else {
        Object.assign(food, values, { updatedAt: new Date().toISOString() });
      }
      persist();
      showToast(isNew ? 'Lebensmittel angelegt.' : 'Lebensmittel gespeichert.');
      returnFromFoodEdit();
    });
    if (!isNew) document.getElementById('delete-saved-food').onclick = () => confirmDeleteSavedFood(food);
  }

  function returnFromFoodEdit() {
    state.editingFoodId = null;
    if (state.foodEditOrigin === 'add') {
      state.view = 'add';
      state.addTab = 'foods';
      render();
    } else {
      state.view = 'foods';
      render();
    }
  }

  function confirmDeleteSavedFood(food) {
    modalRoot.innerHTML = `<div class="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="delete-food-title"><div class="modal">
      <h2 id="delete-food-title">Gespeichertes Lebensmittel löschen?</h2>
      <p>„${esc(food.name)}“ wird aus deinen gespeicherten Lebensmitteln entfernt.<br><br>Bereits vorhandene Tagebucheinträge bleiben erhalten.</p>
      <div class="modal-actions"><button class="danger-button" id="confirm-food-delete">Löschen</button><button class="secondary-button" id="cancel-food-delete">Abbrechen</button></div>
    </div></div>`;
    document.getElementById('cancel-food-delete').onclick = () => { modalRoot.innerHTML = ''; };
    document.getElementById('confirm-food-delete').onclick = () => {
      state.savedFoods = state.savedFoods.filter(f => f.id !== food.id);
      state.entries.forEach(entry => {
        if (entry.foodId === food.id) entry.foodId = null;
      });
      persist();
      modalRoot.innerHTML = '';
      state.editingFoodId = null;
      showToast('Lebensmittel gelöscht.');
      if (state.foodEditOrigin === 'add') { state.view = 'add'; state.addTab = 'foods'; } else state.view = 'foods';
      render();
    };
  }


  function recipePerPortion(recipe) {
    const servings = Number(recipe.servings || 1);
    const divisor = servings > 0 ? servings : 1;
    return {
      calories: Number(recipe.totalCalories || 0) / divisor,
      protein: recipe.totalProtein == null ? null : Number(recipe.totalProtein) / divisor,
      fiber: recipe.totalFiber == null ? null : Number(recipe.totalFiber) / divisor,
      fat: recipe.totalFat == null ? null : Number(recipe.totalFat) / divisor,
      carbohydrates: recipe.totalCarbohydrates == null ? null : Number(recipe.totalCarbohydrates) / divisor
    };
  }

  function recipeNutrientLine(values, includeExtras = false) {
    const parts = [`${fmt(values.calories, 0)} kcal`];
    if (values.protein != null) parts.push(`${fmt(values.protein)} g Protein`);
    if (values.fiber != null) parts.push(`${fmt(values.fiber)} g Ballaststoffe`);
    if (includeExtras && values.fat != null) parts.push(`${fmt(values.fat)} g Fett`);
    if (includeExtras && values.carbohydrates != null) parts.push(`${fmt(values.carbohydrates)} g Kohlenhydrate`);
    return parts.join(' · ');
  }

  function normalizeRecipeIngredient(ingredient) {
    return {
      id: ingredient.id || uuid(),
      name: ingredient.name || '',
      foodId: ingredient.foodId || null,
      origin: ingredient.origin || (ingredient.foodId ? 'savedFood' : 'manual'),
      amount: ingredient.amount ?? 1,
      unit: ingredient.unit || 'portion',
      calories: ingredient.calories ?? 0,
      protein: ingredient.protein ?? null,
      fiber: ingredient.fiber ?? null,
      fat: ingredient.fat ?? null,
      carbohydrates: ingredient.carbohydrates ?? null
    };
  }

  function cloneIngredients(ingredients) {
    return (ingredients || []).map(item => normalizeRecipeIngredient({ ...item, id: item.id || uuid() }));
  }

  function ingredientTotals(ingredients) {
    const list = ingredients || [];
    if (!list.length) return { calories: 0, protein: null, fiber: null, fat: null, carbohydrates: null };
    const totals = { calories: 0, protein: 0, fiber: 0, fat: 0, carbohydrates: 0 };
    const complete = { protein: true, fiber: true, fat: true, carbohydrates: true };
    list.forEach(ingredient => {
      totals.calories += Number(ingredient.calories || 0);
      ['protein', 'fiber', 'fat', 'carbohydrates'].forEach(key => {
        if (ingredient[key] == null) complete[key] = false;
        else totals[key] += Number(ingredient[key]);
      });
    });
    return {
      calories: cleanNumber(totals.calories),
      protein: complete.protein ? cleanNumber(totals.protein) : null,
      fiber: complete.fiber ? cleanNumber(totals.fiber) : null,
      fat: complete.fat ? cleanNumber(totals.fat) : null,
      carbohydrates: complete.carbohydrates ? cleanNumber(totals.carbohydrates) : null
    };
  }

  function ingredientScaledFromSnapshot(ingredient, amount) {
    const oldAmount = Number(ingredient.amount || 0);
    const newAmount = Number(amount);
    if (!Number.isFinite(oldAmount) || oldAmount <= 0 || !Number.isFinite(newAmount) || newAmount <= 0) return null;
    const factor = newAmount / oldAmount;
    const result = { ...ingredient, amount: cleanNumber(newAmount, 3) };
    NUTRIENT_KEYS.forEach(key => {
      result[key] = ingredient[key] == null ? null : cleanNumber(Number(ingredient[key]) * factor);
    });
    return result;
  }

  function renderRecipes() {
    const needle = normalizeName(state.recipeSearch);
    const recipes = [...state.recipes]
      .filter(recipe => !needle || normalizeName(recipe.name).includes(needle) || (recipe.ingredients || []).some(item => normalizeName(item.name).includes(needle)))
      .sort((a, b) => a.name.localeCompare(b.name, 'de'));

    app.innerHTML = `<main class="page">
      <header class="topbar"><div><div class="brand-kicker">${esc(CFG.appName)}</div><h1>Rezepte</h1></div><button class="icon-button" data-nav="settings" aria-label="Einstellungen">${icon('settings')}</button></header>
      <div class="recipe-toolbar">
        <div class="manager-search"><span>${icon('search')}</span><input id="recipe-search" type="search" placeholder="Rezept oder Zutat suchen" autocomplete="off" value="${esc(state.recipeSearch)}"></div>
        <button class="primary-button recipe-new-button" id="new-recipe">${icon('plus')} Neues Rezept</button>
      </div>
      <div class="manager-caption">${state.recipes.length === 1 ? '<strong>1</strong> Rezept' : `<strong>${state.recipes.length}</strong> Rezepte`}</div>
      <section id="recipe-list" class="recipe-grid">${recipeListMarkup(recipes)}</section>
    </main>${bottomNav('recipes')}`;

    document.getElementById('new-recipe').onclick = () => setView('recipeEdit', { editingRecipeId: 'new' });
    document.getElementById('recipe-search').addEventListener('input', event => {
      state.recipeSearch = event.target.value;
      const q = normalizeName(state.recipeSearch);
      const filtered = [...state.recipes]
        .filter(recipe => !q || normalizeName(recipe.name).includes(q) || (recipe.ingredients || []).some(item => normalizeName(item.name).includes(q)))
        .sort((a, b) => a.name.localeCompare(b.name, 'de'));
      document.getElementById('recipe-list').innerHTML = recipeListMarkup(filtered);
      bindRecipeCards();
    });
    bindRecipeCards();
  }

  function recipeListMarkup(recipes) {
    if (!state.recipes.length) {
      return `<div class="recipe-empty"><div class="recipe-empty-icon">${icon('recipe')}</div><h2>Noch keine Rezepte</h2><p>Speichere deine eigenen Gerichte und füge sie später mit wenigen Klicks deinem Ernährungstagebuch hinzu.</p><button class="secondary-button" id="first-recipe">${icon('plus')} Erstes Rezept erstellen</button></div>`;
    }
    if (!recipes.length) return `<div class="mini-empty compact"><div class="mini-empty-icon">${icon('search')}</div><h3>Keine Treffer</h3><p>Für diese Suche wurde kein Rezept oder keine passende Zutat gefunden.</p></div>`;
    return recipes.map(recipe => {
      const per = recipePerPortion(recipe);
      const mode = recipe.calculationMode === 'ingredients' ? `${(recipe.ingredients || []).length} ${(recipe.ingredients || []).length === 1 ? 'Zutat' : 'Zutaten'}` : 'Direkte Nährwerte';
      return `<article class="recipe-card">
        <button class="recipe-card-main" data-recipe-id="${esc(recipe.id)}">
          <span class="recipe-card-icon">${icon('bowl')}</span>
          <span class="recipe-card-copy"><strong>${esc(recipe.name)}</strong><small>${recipeNutrientLine(per)}</small><span>${fmt(recipe.servings)} ${Number(recipe.servings) === 1 ? 'Portion' : 'Portionen'} · ${mode}</span></span>
          <span class="chev">›</span>
        </button>
      </article>`;
    }).join('');
  }

  function bindRecipeCards() {
    const first = document.getElementById('first-recipe');
    if (first) first.onclick = () => setView('recipeEdit', { editingRecipeId: 'new' });
    document.querySelectorAll('[data-recipe-id]').forEach(btn => {
      btn.onclick = () => setView('recipeDetail', { selectedRecipeId: btn.dataset.recipeId });
    });
  }

  function initRecipeDraft(recipe, isNew) {
    const key = isNew ? 'new' : recipe.id;
    if (state.recipeDraftForId === key && Array.isArray(state.recipeDraftIngredients)) return;
    state.recipeDraftForId = key;
    state.recipeDraftIngredients = cloneIngredients(recipe?.ingredients || []);
    state.recipeEditorMode = recipe?.calculationMode || 'manual';
  }

  function renderRecipeEdit() {
    const isNew = state.editingRecipeId === 'new' || !state.editingRecipeId;
    const recipe = isNew ? null : state.recipes.find(item => item.id === state.editingRecipeId);
    if (!isNew && !recipe) return setView('recipes', { editingRecipeId: null });
    initRecipeDraft(recipe, isNew);
    const initial = recipe || {
      name: '', servings: 4, totalCalories: '', totalProtein: '', totalFiber: '', totalFat: '', totalCarbohydrates: '', calculationMode: 'manual', ingredients: []
    };
    const extrasOpen = initial.totalFat != null && initial.totalFat !== '' || initial.totalCarbohydrates != null && initial.totalCarbohydrates !== '' ? ' open' : '';
    const mode = state.recipeEditorMode || initial.calculationMode || 'manual';

    app.innerHTML = `<main class="page recipe-editor-page">
      <header class="topbar"><button class="icon-button" id="recipe-edit-back" aria-label="Zurück">${icon('back')}</button><h1>${isNew ? 'Neues Rezept' : 'Rezept bearbeiten'}</h1><span style="width:44px"></span></header>
      <div class="info-banner">${icon('recipe')} <span>Du kannst Nährwerte direkt eingeben oder das Rezept aus Zutaten berechnen lassen.</span></div>
      <form id="recipe-form" class="form-card">
        ${fieldRow(icon('food'), 'Rezeptname', `<input id="recipe-name" type="text" autocomplete="off" value="${esc(initial.name)}" placeholder="z. B. Linsenbolognese">`)}
        ${fieldRow(icon('portions'), 'Anzahl Portionen', `<input id="recipe-servings" type="text" inputmode="decimal" value="${inputNumber(initial.servings ?? 4, 2)}"><p class="input-help">Mampfo berechnet daraus automatisch die Werte pro Portion.</p>`)}
        <div class="recipe-mode-switch" role="tablist" aria-label="Berechnungsart">
          <button type="button" class="recipe-mode-button ${mode === 'manual' ? 'active' : ''}" data-recipe-mode="manual">${icon('edit')} Nährwerte direkt</button>
          <button type="button" class="recipe-mode-button ${mode === 'ingredients' ? 'active' : ''}" data-recipe-mode="ingredients">${icon('list')} Aus Zutaten</button>
        </div>

        <section id="recipe-manual-panel" ${mode === 'manual' ? '' : 'hidden'}>
          <div class="recipe-total-heading"><span>Gesamtes Rezept</span><small>Nährwerte für alle Portionen zusammen</small></div>
          ${fieldRow(icon('flame'), 'Kalorien (kcal)', `<input id="recipe-calories" type="text" inputmode="decimal" value="${inputNumber(initial.totalCalories, 2)}" placeholder="0">`)}
          ${fieldRow(icon('protein'), 'Protein (g)', `<input id="recipe-protein" type="text" inputmode="decimal" value="${inputNumber(initial.totalProtein, 2)}" placeholder="optional">`)}
          ${fieldRow(icon('leaf'), 'Ballaststoffe (g)', `<input id="recipe-fiber" type="text" inputmode="decimal" value="${inputNumber(initial.totalFiber, 2)}" placeholder="optional">`)}
          <details class="extra-nutrients"${extrasOpen}>
            <summary>Weitere Nährwerte</summary>
            <div class="extra-nutrient-fields">
              ${fieldRow(icon('drop'), 'Fett (g)', `<input id="recipe-fat" type="text" inputmode="decimal" value="${inputNumber(initial.totalFat, 2)}" placeholder="optional">`)}
              ${fieldRow(icon('carbs'), 'Kohlenhydrate (g)', `<input id="recipe-carbohydrates" type="text" inputmode="decimal" value="${inputNumber(initial.totalCarbohydrates, 2)}" placeholder="optional">`)}
            </div>
          </details>
        </section>

        <section id="recipe-ingredients-panel" ${mode === 'ingredients' ? '' : 'hidden'}>
          <div class="ingredient-heading"><div><strong>Zutaten</strong><small>Die Nährwerte werden automatisch aus den Zutaten summiert.</small></div><span id="ingredient-count-badge" class="count-badge"></span></div>
          <div id="recipe-ingredient-list" class="ingredient-list"></div>
          <div class="ingredient-add-actions">
            <button type="button" class="secondary-button" id="add-saved-ingredient">${icon('search')} Gespeichertes Lebensmittel</button>
            <button type="button" class="secondary-button" id="add-manual-ingredient">${icon('plus')} Zutat manuell</button>
          </div>
          <p class="ingredient-snapshot-note">${icon('save')} Zutaten werden als Snapshot im Rezept gespeichert. Spätere Änderungen an deinen Lebensmitteln verändern dieses Rezept nicht automatisch.</p>
        </section>

        <section class="recipe-preview" aria-live="polite"><small>Pro Portion</small><strong id="recipe-preview-calories">0 kcal</strong><span id="recipe-preview-main">Protein offen · Ballaststoffe offen</span><span id="recipe-preview-extra"></span></section>
        <div class="form-actions"><button class="primary-button" type="submit">${isNew ? 'Rezept speichern' : 'Änderungen speichern'}</button>${!isNew ? `<button class="danger-button" type="button" id="delete-recipe">${icon('trash')} Rezept löschen</button>` : ''}</div>
      </form>
    </main>${bottomNav('recipes')}`;

    document.getElementById('recipe-edit-back').onclick = () => {
      state.recipeDraftIngredients = null; state.recipeDraftForId = null; state.recipeEditorMode = null;
      isNew ? setView('recipes', { editingRecipeId: null }) : setView('recipeDetail', { selectedRecipeId: recipe.id, editingRecipeId: null });
    };
    document.querySelectorAll('[data-recipe-mode]').forEach(btn => btn.onclick = () => setRecipeEditorMode(btn.dataset.recipeMode));
    ['recipe-servings','recipe-calories','recipe-protein','recipe-fiber','recipe-fat','recipe-carbohydrates'].forEach(id => document.getElementById(id)?.addEventListener('input', updateRecipePreview));
    document.getElementById('add-saved-ingredient').onclick = () => openSavedIngredientPicker();
    document.getElementById('add-manual-ingredient').onclick = () => openManualIngredientModal();
    renderIngredientDraftList();
    updateRecipePreview();
    document.getElementById('recipe-form').addEventListener('submit', event => saveRecipeForm(event, recipe));
    const deleteButton = document.getElementById('delete-recipe');
    if (deleteButton) deleteButton.onclick = () => confirmDeleteRecipe(recipe);
  }

  function setRecipeEditorMode(mode) {
    if (!['manual', 'ingredients'].includes(mode)) return;
    const previousMode = state.recipeEditorMode || 'manual';
    if (mode === 'manual' && previousMode === 'ingredients') {
      const totals = ingredientTotals(state.recipeDraftIngredients || []);
      const mapping = {
        'recipe-calories': totals.calories,
        'recipe-protein': totals.protein,
        'recipe-fiber': totals.fiber,
        'recipe-fat': totals.fat,
        'recipe-carbohydrates': totals.carbohydrates
      };
      Object.entries(mapping).forEach(([id, value]) => {
        const input = document.getElementById(id);
        if (input) input.value = inputNumber(value, 2);
      });
    }
    state.recipeEditorMode = mode;
    document.querySelectorAll('[data-recipe-mode]').forEach(btn => btn.classList.toggle('active', btn.dataset.recipeMode === mode));
    const manual = document.getElementById('recipe-manual-panel');
    const ingredients = document.getElementById('recipe-ingredients-panel');
    if (manual) manual.hidden = mode !== 'manual';
    if (ingredients) ingredients.hidden = mode !== 'ingredients';
    updateRecipePreview();
  }

  function recipeFormValues() {
    const mode = state.recipeEditorMode || 'manual';
    const base = {
      name: document.getElementById('recipe-name').value.trim(),
      servings: parseNum(document.getElementById('recipe-servings').value),
      calculationMode: mode
    };
    if (mode === 'ingredients') {
      const totals = ingredientTotals(state.recipeDraftIngredients || []);
      return {
        ...base,
        totalCalories: totals.calories,
        totalProtein: totals.protein,
        totalFiber: totals.fiber,
        totalFat: totals.fat,
        totalCarbohydrates: totals.carbohydrates,
        ingredients: cloneIngredients(state.recipeDraftIngredients || [])
      };
    }
    return {
      ...base,
      totalCalories: parseNum(document.getElementById('recipe-calories').value),
      totalProtein: parseNum(document.getElementById('recipe-protein').value),
      totalFiber: parseNum(document.getElementById('recipe-fiber').value),
      totalFat: parseNum(document.getElementById('recipe-fat').value),
      totalCarbohydrates: parseNum(document.getElementById('recipe-carbohydrates').value),
      ingredients: cloneIngredients(state.recipeDraftIngredients || [])
    };
  }

  function validateRecipe(values) {
    if (!values.name) return 'Bitte einen Rezeptnamen eingeben.';
    if (values.servings == null || values.servings <= 0) return 'Bitte eine gültige Portionszahl eingeben.';
    if (values.calculationMode === 'ingredients' && !values.ingredients.length) return 'Bitte mindestens eine Zutat hinzufügen.';
    if (values.totalCalories == null || values.totalCalories < 0) return 'Bitte gültige Kalorien eingeben.';
    if ([values.totalProtein, values.totalFiber, values.totalFat, values.totalCarbohydrates].some(value => value != null && value < 0)) return 'Nährwerte dürfen nicht negativ sein.';
    return null;
  }

  function currentRecipePreviewTotals() {
    if ((state.recipeEditorMode || 'manual') === 'ingredients') return ingredientTotals(state.recipeDraftIngredients || []);
    return {
      calories: parseNum(document.getElementById('recipe-calories')?.value) || 0,
      protein: parseNum(document.getElementById('recipe-protein')?.value),
      fiber: parseNum(document.getElementById('recipe-fiber')?.value),
      fat: parseNum(document.getElementById('recipe-fat')?.value),
      carbohydrates: parseNum(document.getElementById('recipe-carbohydrates')?.value)
    };
  }

  function updateRecipePreview() {
    const servings = parseNum(document.getElementById('recipe-servings')?.value);
    const divisor = servings && servings > 0 ? servings : 1;
    const totals = currentRecipePreviewTotals();
    const calEl = document.getElementById('recipe-preview-calories');
    const mainEl = document.getElementById('recipe-preview-main');
    const extraEl = document.getElementById('recipe-preview-extra');
    if (!calEl || !mainEl || !extraEl) return;
    calEl.textContent = `${fmt((totals.calories || 0) / divisor, 0)} kcal`;
    mainEl.textContent = `${totals.protein == null ? 'Protein offen' : `${fmt(totals.protein / divisor)} g Protein`} · ${totals.fiber == null ? 'Ballaststoffe offen' : `${fmt(totals.fiber / divisor)} g Ballaststoffe`}`;
    const extras = [];
    if (totals.fat != null) extras.push(`${fmt(totals.fat / divisor)} g Fett`);
    if (totals.carbohydrates != null) extras.push(`${fmt(totals.carbohydrates / divisor)} g Kohlenhydrate`);
    extraEl.textContent = extras.join(' · ');
    extraEl.hidden = extras.length === 0;
  }

  function renderIngredientDraftList() {
    const list = document.getElementById('recipe-ingredient-list');
    const badge = document.getElementById('ingredient-count-badge');
    if (!list || !badge) return;
    const ingredients = state.recipeDraftIngredients || [];
    badge.textContent = ingredients.length ? String(ingredients.length) : '0';
    if (!ingredients.length) {
      list.innerHTML = `<div class="ingredient-empty"><span>${icon('bowl')}</span><strong>Noch keine Zutaten</strong><small>Füge gespeicherte Lebensmittel hinzu oder erfasse eine Zutat manuell.</small></div>`;
      updateRecipePreview();
      return;
    }
    list.innerHTML = ingredients.map(item => `<article class="ingredient-card">
      <button type="button" class="ingredient-main" data-edit-ingredient="${esc(item.id)}">
        <span class="ingredient-icon">${item.foodId ? icon('food') : icon('edit')}</span>
        <span class="ingredient-copy"><strong>${esc(item.name)}</strong><small>${esc(amountLabel(item.amount, item.unit))} · ${recipeNutrientLine(item, true)}</small><span>${item.foodId ? 'Lebensmittel-Snapshot' : 'Manuelle Zutat'}</span></span><span class="chev">›</span>
      </button>
      <button type="button" class="ingredient-remove" data-remove-ingredient="${esc(item.id)}" aria-label="Zutat entfernen">×</button>
    </article>`).join('');
    list.querySelectorAll('[data-edit-ingredient]').forEach(btn => btn.onclick = () => openIngredientEditModal(btn.dataset.editIngredient));
    list.querySelectorAll('[data-remove-ingredient]').forEach(btn => btn.onclick = () => {
      state.recipeDraftIngredients = ingredients.filter(item => item.id !== btn.dataset.removeIngredient);
      renderIngredientDraftList();
      updateRecipePreview();
    });
    updateRecipePreview();
  }

  function openSavedIngredientPicker() {
    const foods = [...state.savedFoods].sort((a, b) => Number(b.favorite) - Number(a.favorite) || a.name.localeCompare(b.name, 'de'));
    modalRoot.innerHTML = `<div class="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="ingredient-picker-title"><div class="modal ingredient-picker-modal">
      <h2 id="ingredient-picker-title">Lebensmittel auswählen</h2>
      <p>Die aktuellen Werte werden als Snapshot in das Rezept übernommen.</p>
      <div class="manager-search"><span>${icon('search')}</span><input id="ingredient-food-search" type="search" placeholder="Lebensmittel suchen" autocomplete="off"></div>
      <div id="ingredient-food-list" class="ingredient-food-list"></div>
      <div class="modal-actions"><button class="secondary-button" id="ingredient-picker-cancel">Abbrechen</button></div>
    </div></div>`;
    const renderList = () => {
      const q = normalizeName(document.getElementById('ingredient-food-search').value);
      const filtered = foods.filter(food => !q || normalizeName(food.name).includes(q));
      document.getElementById('ingredient-food-list').innerHTML = filtered.length ? filtered.map(food => `<button type="button" class="ingredient-food-choice" data-ingredient-food="${esc(food.id)}"><span>${food.favorite ? icon('star') : icon('food')}</span><span><strong>${esc(food.name)}</strong><small>${esc(amountLabel(food.baseAmount || 1, food.baseUnit || 'portion'))} · ${recipeNutrientLine(food, true)}</small></span><span>›</span></button>`).join('') : `<div class="mini-empty compact"><h3>Keine Treffer</h3><p>Kein gespeichertes Lebensmittel passt zur Suche.</p></div>`;
      document.querySelectorAll('[data-ingredient-food]').forEach(btn => btn.onclick = () => openSavedIngredientAmountModal(btn.dataset.ingredientFood));
    };
    document.getElementById('ingredient-food-search').addEventListener('input', renderList);
    document.getElementById('ingredient-picker-cancel').onclick = () => { modalRoot.innerHTML = ''; };
    renderList();
  }

  function openSavedIngredientAmountModal(foodId) {
    const food = state.savedFoods.find(item => item.id === foodId);
    if (!food) return openSavedIngredientPicker();
    const baseAmount = Number(food.baseAmount || 1);
    const baseUnit = food.baseUnit || 'portion';
    modalRoot.innerHTML = `<div class="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="saved-ingredient-title"><div class="modal">
      <h2 id="saved-ingredient-title">${esc(food.name)}</h2>
      <p>Gespeichert: ${esc(amountLabel(baseAmount, baseUnit))}. Lege die Menge für dieses Rezept fest.</p>
      <label class="modal-field"><span>Menge</span><div class="amount-unit-row"><input id="saved-ingredient-amount" type="text" inputmode="decimal" value="${inputNumber(baseAmount, 3)}"><input type="text" value="${esc(unitLabel(baseUnit, baseAmount))}" disabled></div></label>
      <div id="saved-ingredient-preview" class="ingredient-modal-preview"></div>
      <div class="modal-actions"><button class="primary-button" id="confirm-saved-ingredient">Zutat hinzufügen</button><button class="secondary-button" id="back-saved-ingredient">Zurück</button></div>
    </div></div>`;
    const update = () => {
      const amount = parseNum(document.getElementById('saved-ingredient-amount').value);
      const values = amount && amount > 0 ? scaledFoodValues(food, amount, baseUnit) : null;
      document.getElementById('saved-ingredient-preview').innerHTML = values ? `<strong>${recipeNutrientLine(values, true)}</strong><small>${esc(amountLabel(amount, baseUnit))}</small>` : '<small>Bitte eine gültige Menge eingeben.</small>';
    };
    document.getElementById('saved-ingredient-amount').addEventListener('input', update);
    document.getElementById('back-saved-ingredient').onclick = openSavedIngredientPicker;
    document.getElementById('confirm-saved-ingredient').onclick = () => {
      const amount = parseNum(document.getElementById('saved-ingredient-amount').value);
      if (amount == null || amount <= 0) return showToast('Bitte eine gültige Menge eingeben.');
      const values = scaledFoodValues(food, amount, baseUnit);
      if (!values) return showToast('Die Menge konnte nicht berechnet werden.');
      state.recipeDraftIngredients.push(normalizeRecipeIngredient({ id: uuid(), name: food.name, foodId: food.id, origin: 'savedFood', amount: cleanNumber(amount, 3), unit: baseUnit, ...values }));
      modalRoot.innerHTML = '';
      renderIngredientDraftList();
      showToast('Zutat hinzugefügt.');
    };
    update();
  }

  function openManualIngredientModal(existingId = null) {
    const existing = existingId ? (state.recipeDraftIngredients || []).find(item => item.id === existingId) : null;
    const initial = existing || { name: '', amount: 100, unit: 'g', calories: '', protein: '', fiber: '', fat: '', carbohydrates: '', foodId: null };
    const unitOptions = ['g','ml','piece','portion'].map(unit => `<option value="${unit}" ${initial.unit === unit ? 'selected' : ''}>${unitLabel(unit, initial.amount)}</option>`).join('');
    modalRoot.innerHTML = `<div class="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="manual-ingredient-title"><div class="modal ingredient-edit-modal">
      <h2 id="manual-ingredient-title">${existing ? 'Zutat bearbeiten' : 'Zutat manuell erfassen'}</h2>
      <p>Die Nährwerte gelten für die unten angegebene Menge.</p>
      <label class="modal-field"><span>Name</span><input id="manual-ing-name" type="text" value="${esc(initial.name)}" placeholder="z. B. Tomaten"></label>
      <label class="modal-field"><span>Menge</span><div class="amount-unit-row"><input id="manual-ing-amount" type="text" inputmode="decimal" value="${inputNumber(initial.amount, 3)}"><select id="manual-ing-unit">${unitOptions}</select></div></label>
      <div class="ingredient-nutrient-grid">
        <label class="modal-field"><span>Kalorien (kcal)</span><input id="manual-ing-calories" type="text" inputmode="decimal" value="${inputNumber(initial.calories, 2)}" placeholder="0"></label>
        <label class="modal-field"><span>Protein (g)</span><input id="manual-ing-protein" type="text" inputmode="decimal" value="${inputNumber(initial.protein, 2)}" placeholder="optional"></label>
        <label class="modal-field"><span>Ballaststoffe (g)</span><input id="manual-ing-fiber" type="text" inputmode="decimal" value="${inputNumber(initial.fiber, 2)}" placeholder="optional"></label>
        <label class="modal-field"><span>Fett (g)</span><input id="manual-ing-fat" type="text" inputmode="decimal" value="${inputNumber(initial.fat, 2)}" placeholder="optional"></label>
        <label class="modal-field"><span>Kohlenhydrate (g)</span><input id="manual-ing-carbs" type="text" inputmode="decimal" value="${inputNumber(initial.carbohydrates, 2)}" placeholder="optional"></label>
      </div>
      ${!existing ? `<label class="ingredient-save-food"><input id="manual-ing-save-food" type="checkbox"><span>Auch als Lebensmittel speichern</span></label>` : ''}
      <div class="modal-actions"><button class="primary-button" id="confirm-manual-ingredient">${existing ? 'Änderungen übernehmen' : 'Zutat hinzufügen'}</button><button class="secondary-button" id="cancel-manual-ingredient">Abbrechen</button></div>
    </div></div>`;
    document.getElementById('cancel-manual-ingredient').onclick = () => { modalRoot.innerHTML = ''; };
    document.getElementById('confirm-manual-ingredient').onclick = () => {
      const ingredient = normalizeRecipeIngredient({
        id: existing?.id || uuid(),
        name: document.getElementById('manual-ing-name').value.trim(),
        foodId: existing?.foodId || null,
        origin: existing?.origin || 'manual',
        amount: parseNum(document.getElementById('manual-ing-amount').value),
        unit: document.getElementById('manual-ing-unit').value,
        calories: parseNum(document.getElementById('manual-ing-calories').value),
        protein: parseNum(document.getElementById('manual-ing-protein').value),
        fiber: parseNum(document.getElementById('manual-ing-fiber').value),
        fat: parseNum(document.getElementById('manual-ing-fat').value),
        carbohydrates: parseNum(document.getElementById('manual-ing-carbs').value)
      });
      const err = validateIngredient(ingredient);
      if (err) return showToast(err);
      if (existing) {
        const index = state.recipeDraftIngredients.findIndex(item => item.id === existing.id);
        state.recipeDraftIngredients[index] = ingredient;
        modalRoot.innerHTML = '';
        renderIngredientDraftList();
        return showToast('Zutat aktualisiert.');
      }
      const saveAsFood = document.getElementById('manual-ing-save-food')?.checked;
      if (saveAsFood) return commitManualIngredientWithFood(ingredient);
      state.recipeDraftIngredients.push(ingredient);
      modalRoot.innerHTML = '';
      renderIngredientDraftList();
      showToast('Zutat hinzugefügt.');
    };
  }

  function validateIngredient(ingredient) {
    if (!ingredient.name) return 'Bitte einen Namen für die Zutat eingeben.';
    if (ingredient.amount == null || ingredient.amount <= 0) return 'Bitte eine gültige Menge eingeben.';
    if (ingredient.calories == null || ingredient.calories < 0) return 'Bitte gültige Kalorien eingeben.';
    if ([ingredient.protein, ingredient.fiber, ingredient.fat, ingredient.carbohydrates].some(value => value != null && value < 0)) return 'Nährwerte dürfen nicht negativ sein.';
    return null;
  }

  function foodMatchesIngredient(food, ingredient) {
    if (!food || normalizeName(food.name) !== normalizeName(ingredient.name)) return false;
    if ((food.baseUnit || 'portion') !== ingredient.unit) return false;
    if (!sameValue(food.baseAmount || 1, ingredient.amount)) return false;
    return sameNutrientSet(food, ingredient);
  }

  function newFoodFromIngredient(ingredient) {
    const now = new Date().toISOString();
    return {
      id: uuid(), name: ingredient.name,
      calories: ingredient.calories, protein: ingredient.protein, fiber: ingredient.fiber, fat: ingredient.fat, carbohydrates: ingredient.carbohydrates,
      baseAmount: ingredient.amount, baseUnit: ingredient.unit,
      favorite: false, usageCount: 0, lastUsedAt: null, createdAt: now, updatedAt: now
    };
  }

  function commitManualIngredientWithFood(ingredient) {
    const existing = state.savedFoods.find(food => normalizeName(food.name) === normalizeName(ingredient.name));
    if (!existing) {
      const food = newFoodFromIngredient(ingredient);
      state.savedFoods.push(food);
      ingredient.foodId = food.id;
      state.recipeDraftIngredients.push(ingredient);
      persist();
      modalRoot.innerHTML = '';
      renderIngredientDraftList();
      return showToast('Zutat und Lebensmittel gespeichert.');
    }
    if (foodMatchesIngredient(existing, ingredient)) {
      ingredient.foodId = existing.id;
      state.recipeDraftIngredients.push(ingredient);
      modalRoot.innerHTML = '';
      renderIngredientDraftList();
      return showToast('Vorhandenes Lebensmittel verknüpft.');
    }
    modalRoot.innerHTML = `<div class="modal-backdrop" role="dialog" aria-modal="true"><div class="modal"><h2>Lebensmittel bereits vorhanden</h2><p>Für „${esc(ingredient.name)}“ sind andere Werte gespeichert. Die Rezept-Zutat selbst kann unabhängig davon verwendet werden.</p><div class="modal-actions"><button class="primary-button" id="update-food-from-ing">Lebensmittel aktualisieren</button><button class="secondary-button" id="ingredient-only">Nur als Zutat verwenden</button><button class="secondary-button" id="ingredient-save-cancel">Abbrechen</button></div></div></div>`;
    document.getElementById('update-food-from-ing').onclick = () => {
      existing.name = ingredient.name;
      existing.baseAmount = ingredient.amount;
      existing.baseUnit = ingredient.unit;
      NUTRIENT_KEYS.forEach(key => { existing[key] = ingredient[key]; });
      existing.updatedAt = new Date().toISOString();
      ingredient.foodId = existing.id;
      state.recipeDraftIngredients.push(ingredient);
      persist(); modalRoot.innerHTML = ''; renderIngredientDraftList(); showToast('Lebensmittel aktualisiert und Zutat hinzugefügt.');
    };
    document.getElementById('ingredient-only').onclick = () => {
      state.recipeDraftIngredients.push(ingredient);
      modalRoot.innerHTML = ''; renderIngredientDraftList(); showToast('Zutat hinzugefügt.');
    };
    document.getElementById('ingredient-save-cancel').onclick = () => { modalRoot.innerHTML = ''; };
  }

  function openIngredientEditModal(ingredientId) {
    const ingredient = (state.recipeDraftIngredients || []).find(item => item.id === ingredientId);
    if (!ingredient) return;
    if (!ingredient.foodId || ingredient.origin === 'manual') return openManualIngredientModal(ingredientId);
    const base = ingredient;
    modalRoot.innerHTML = `<div class="modal-backdrop" role="dialog" aria-modal="true"><div class="modal"><h2>${esc(ingredient.name)}</h2><p>Dieser Lebensmittel-Snapshot bleibt unabhängig von späteren Änderungen in der Datenbank.</p><label class="modal-field"><span>Menge</span><div class="amount-unit-row"><input id="snapshot-ing-amount" type="text" inputmode="decimal" value="${inputNumber(ingredient.amount, 3)}"><input type="text" disabled value="${esc(unitLabel(ingredient.unit, ingredient.amount))}"></div></label><div id="snapshot-ing-preview" class="ingredient-modal-preview"></div><div class="modal-actions"><button class="primary-button" id="save-snapshot-ing">Änderungen übernehmen</button><button class="secondary-button" id="cancel-snapshot-ing">Abbrechen</button></div></div></div>`;
    const update = () => {
      const amount = parseNum(document.getElementById('snapshot-ing-amount').value);
      const scaled = amount && amount > 0 ? ingredientScaledFromSnapshot(base, amount) : null;
      document.getElementById('snapshot-ing-preview').innerHTML = scaled ? `<strong>${recipeNutrientLine(scaled, true)}</strong><small>${esc(amountLabel(amount, ingredient.unit))}</small>` : '<small>Bitte eine gültige Menge eingeben.</small>';
    };
    document.getElementById('snapshot-ing-amount').addEventListener('input', update);
    document.getElementById('cancel-snapshot-ing').onclick = () => { modalRoot.innerHTML = ''; };
    document.getElementById('save-snapshot-ing').onclick = () => {
      const amount = parseNum(document.getElementById('snapshot-ing-amount').value);
      const scaled = ingredientScaledFromSnapshot(base, amount);
      if (!scaled) return showToast('Bitte eine gültige Menge eingeben.');
      const index = state.recipeDraftIngredients.findIndex(item => item.id === ingredient.id);
      state.recipeDraftIngredients[index] = scaled;
      modalRoot.innerHTML = ''; renderIngredientDraftList(); showToast('Zutat aktualisiert.');
    };
    update();
  }

  function saveRecipeForm(event, existingRecipe) {
    event.preventDefault();
    const values = recipeFormValues();
    const error = validateRecipe(values);
    if (error) return showToast(error);
    const duplicate = state.recipes.find(recipe => recipe.id !== existingRecipe?.id && normalizeName(recipe.name) === normalizeName(values.name));
    if (duplicate) return showToast('Ein Rezept mit diesem Namen ist bereits gespeichert.');
    const now = new Date().toISOString();
    let recipe = existingRecipe;
    if (recipe) {
      Object.assign(recipe, values, { updatedAt: now });
    } else {
      recipe = { id: uuid(), ...values, createdAt: now, updatedAt: now };
      state.recipes.push(recipe);
    }
    persist();
    state.editingRecipeId = null;
    state.selectedRecipeId = recipe.id;
    state.recipeDraftIngredients = null; state.recipeDraftForId = null; state.recipeEditorMode = null;
    showToast(existingRecipe ? 'Rezept aktualisiert.' : 'Rezept gespeichert.');
    setView('recipeDetail', { selectedRecipeId: recipe.id, editingRecipeId: null });
  }

  function recipeIngredientDetailMarkup(recipe) {
    if (recipe.calculationMode !== 'ingredients') return '';
    const ingredients = recipe.ingredients || [];
    return `<section class="recipe-ingredients-detail"><div class="section-heading"><div><h2>Zutaten</h2><p>${ingredients.length} ${ingredients.length === 1 ? 'Zutat' : 'Zutaten'} · gespeicherter Snapshot</p></div></div><div class="ingredient-detail-list">${ingredients.map(item => `<div class="ingredient-detail-row"><span class="ingredient-detail-icon">${item.foodId ? icon('food') : icon('edit')}</span><span><strong>${esc(item.name)}</strong><small>${esc(amountLabel(item.amount, item.unit))}</small></span><span class="ingredient-detail-kcal">${fmt(item.calories, 0)} kcal</span></div>`).join('')}</div></section>`;
  }

  function renderRecipeDetail() {
    const recipe = state.recipes.find(item => item.id === state.selectedRecipeId);
    if (!recipe) return setView('recipes', { selectedRecipeId: null });
    const per = recipePerPortion(recipe);
    const modeText = recipe.calculationMode === 'ingredients' ? `Aus ${(recipe.ingredients || []).length} ${(recipe.ingredients || []).length === 1 ? 'Zutat' : 'Zutaten'} berechnet · Snapshot` : 'Direkt eingegebene Nährwerte';
    app.innerHTML = `<main class="page">
      <header class="topbar"><button class="icon-button" id="recipe-detail-back" aria-label="Zurück">${icon('back')}</button><h1>${esc(recipe.name)}</h1><button class="icon-button" id="edit-recipe" aria-label="Rezept bearbeiten">${icon('edit')}</button></header>
      <section class="recipe-hero">
        <div class="recipe-hero-icon">${icon('bowl')}</div><small>Pro Portion</small><strong>${fmt(per.calories, 0)} kcal</strong><span>${per.protein != null ? `${fmt(per.protein)} g Protein` : 'Protein offen'} · ${per.fiber != null ? `${fmt(per.fiber)} g Ballaststoffe` : 'Ballaststoffe offen'}</span>
      </section>
      <section class="recipe-detail-grid">
        <div class="quiet-card"><small>Portionen</small><strong>${fmt(recipe.servings)}</strong></div>
        <div class="quiet-card"><small>Gesamtes Rezept</small><strong>${fmt(recipe.totalCalories, 0)} kcal</strong></div>
      </section>
      ${(per.fat != null || per.carbohydrates != null) ? `<details class="secondary-nutrients" open><summary>Weitere Nährwerte pro Portion</summary><div class="secondary-nutrient-grid"><div><span>${icon('drop')}</span><small>Fett</small><strong>${per.fat == null ? '–' : `${fmt(per.fat)} g`}</strong></div><div><span>${icon('carbs')}</span><small>Kohlenhydrate</small><strong>${per.carbohydrates == null ? '–' : `${fmt(per.carbohydrates)} g`}</strong></div></div></details>` : ''}
      ${recipeIngredientDetailMarkup(recipe)}
      <div class="recipe-mode-note">${icon('recipe')} ${esc(modeText)}</div>
      <button class="primary-button floating-action recipe-log-action" id="log-recipe">${icon('plus')} Essen eintragen</button>
    </main>${bottomNav('recipes')}`;
    document.getElementById('recipe-detail-back').onclick = () => setView('recipes', { selectedRecipeId: null });
    document.getElementById('edit-recipe').onclick = () => setView('recipeEdit', { editingRecipeId: recipe.id });
    document.getElementById('log-recipe').onclick = () => setView('recipeLog', { selectedRecipeId: recipe.id, recipeLogOrigin: 'recipes' });
  }

  function confirmDeleteRecipe(recipe) {
    modalRoot.innerHTML = `<div class="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="delete-recipe-title"><div class="modal"><h2 id="delete-recipe-title">Rezept löschen?</h2><p>„${esc(recipe.name)}“ wird aus deinen Rezepten entfernt.<br><br>Bereits vorhandene Ernährungseinträge bleiben erhalten.</p><div class="modal-actions"><button class="danger-button" id="confirm-recipe-delete">Löschen</button><button class="secondary-button" id="cancel-recipe-delete">Abbrechen</button></div></div></div>`;
    document.getElementById('cancel-recipe-delete').onclick = () => { modalRoot.innerHTML = ''; };
    document.getElementById('confirm-recipe-delete').onclick = () => {
      state.recipes = state.recipes.filter(item => item.id !== recipe.id);
      persist();
      modalRoot.innerHTML = '';
      state.editingRecipeId = null;
      state.selectedRecipeId = null;
      state.recipeDraftIngredients = null; state.recipeDraftForId = null; state.recipeEditorMode = null;
      showToast('Rezept gelöscht.');
      setView('recipes');
    };
  }

  function renderRecipeLog() {
    const recipe = state.recipes.find(item => item.id === state.selectedRecipeId);
    if (!recipe) return state.recipeLogOrigin === 'add' ? setView('add', { selectedRecipeId: null }) : setView('recipes', { selectedRecipeId: null });
    const per = recipePerPortion(recipe);
    const fromAdd = state.recipeLogOrigin === 'add';
    app.innerHTML = `<main class="page">
      <header class="topbar"><button class="icon-button" id="recipe-log-back" aria-label="Zurück">${icon('back')}</button><h1>Essen eintragen</h1><span style="width:44px"></span></header>
      <div class="selected-template recipe-selected"><span>${icon('recipe')}</span><div><small>Rezept · Werte pro Portion</small><strong>${esc(recipe.name)}</strong></div></div>
      <form id="recipe-log-form" class="form-card">
        ${fieldRow(icon('portions'), 'Menge', `<input id="recipe-log-portions" type="text" inputmode="decimal" value="1"><div class="portion-chips"><button type="button" data-portions="0.5">½</button><button type="button" data-portions="1" class="active">1</button><button type="button" data-portions="1.5">1½</button><button type="button" data-portions="2">2</button></div>`)}
        <section class="recipe-preview log-preview"><small>Für diesen Eintrag</small><strong id="recipe-log-calories">${fmt(per.calories, 0)} kcal</strong><span id="recipe-log-main">${per.protein != null ? `${fmt(per.protein)} g Protein` : 'Protein offen'} · ${per.fiber != null ? `${fmt(per.fiber)} g Ballaststoffe` : 'Ballaststoffe offen'}</span><span id="recipe-log-extra"></span></section>
        ${fieldRow(icon('calendar'), 'Datum', `<input id="recipe-log-date" type="date" value="${esc(state.selectedDate)}">`)}
        ${fieldRow(icon('clock'), 'Uhrzeit', `<input id="recipe-log-time" type="time" value="${esc(nowTime())}">`)}
        <button class="primary-button" type="submit">${icon('save')} Ins Tagebuch eintragen</button>
      </form>
    </main>${bottomNav(fromAdd ? 'add' : 'recipes')}`;
    document.getElementById('recipe-log-back').onclick = () => {
      if (fromAdd) {
        state.addTab = 'recipes';
        setView('add', { selectedRecipeId: null, recipeLogOrigin: 'recipes' });
      } else {
        setView('recipeDetail', { selectedRecipeId: recipe.id, recipeLogOrigin: 'recipes' });
      }
    };
    document.getElementById('recipe-log-portions').addEventListener('input', () => updateRecipeLogPreview(recipe));
    document.querySelectorAll('[data-portions]').forEach(btn => btn.onclick = () => {
      document.getElementById('recipe-log-portions').value = btn.dataset.portions;
      document.querySelectorAll('[data-portions]').forEach(item => item.classList.toggle('active', item === btn));
      updateRecipeLogPreview(recipe);
    });
    updateRecipeLogPreview(recipe);
    document.getElementById('recipe-log-form').addEventListener('submit', event => saveRecipeLog(event, recipe));
  }

  function scaledRecipeValues(recipe, portions) {
    const per = recipePerPortion(recipe);
    const factor = Number(portions);
    const result = {};
    NUTRIENT_KEYS.forEach(key => { result[key] = per[key] == null ? null : cleanNumber(per[key] * factor); });
    return result;
  }

  function updateRecipeLogPreview(recipe) {
    const portions = parseNum(document.getElementById('recipe-log-portions')?.value);
    const factor = portions != null && portions > 0 ? portions : 0;
    const values = scaledRecipeValues(recipe, factor);
    const cal = document.getElementById('recipe-log-calories');
    const main = document.getElementById('recipe-log-main');
    const extra = document.getElementById('recipe-log-extra');
    if (!cal || !main || !extra) return;
    cal.textContent = `${fmt(values.calories, 0)} kcal`;
    main.textContent = `${values.protein == null ? 'Protein offen' : `${fmt(values.protein)} g Protein`} · ${values.fiber == null ? 'Ballaststoffe offen' : `${fmt(values.fiber)} g Ballaststoffe`}`;
    const extras = [];
    if (values.fat != null) extras.push(`${fmt(values.fat)} g Fett`);
    if (values.carbohydrates != null) extras.push(`${fmt(values.carbohydrates)} g Kohlenhydrate`);
    extra.textContent = extras.join(' · ');
    extra.hidden = extras.length === 0;
  }

  function saveRecipeLog(event, recipe) {
    event.preventDefault();
    const portions = parseNum(document.getElementById('recipe-log-portions').value);
    const date = document.getElementById('recipe-log-date').value;
    const time = document.getElementById('recipe-log-time').value;
    if (portions == null || portions <= 0) return showToast('Bitte eine gültige Portionsmenge eingeben.');
    if (!date || !time) return showToast('Bitte Datum und Uhrzeit angeben.');

    const commit = () => {
      const values = scaledRecipeValues(recipe, portions);
      const now = new Date().toISOString();
      state.entries.push({
        id: uuid(), name: recipe.name, amount: cleanNumber(portions, 3), unit: 'portion',
        calories: cleanNumber(values.calories), protein: cleanNumber(values.protein), fiber: cleanNumber(values.fiber), fat: cleanNumber(values.fat), carbohydrates: cleanNumber(values.carbohydrates),
        date, time, source: 'recipe', foodId: null, recipeId: recipe.id, createdAt: now, updatedAt: now
      });
      state.selectedDate = date;
      state.selectedRecipeId = null;
      state.recipeLogOrigin = 'recipes';
      persist();
      showToast('Rezept ins Tagebuch eingetragen.');
      setView('today');
    };

    resolveFastingConflictBeforeFoodSave({ date, time }, commit);
  }



  function parseClockMinutes(value) {
    const match = /^(\d{2}):(\d{2})$/.exec(String(value || ''));
    if (!match) return null;
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (hours > 23 || minutes > 59) return null;
    return hours * 60 + minutes;
  }

  function clockFromMinutes(total) {
    const normalized = ((Math.round(total) % 1440) + 1440) % 1440;
    return `${String(Math.floor(normalized / 60)).padStart(2, '0')}:${String(normalized % 60).padStart(2, '0')}`;
  }

  function dateAtClock(baseDate, clock) {
    const mins = parseClockMinutes(clock);
    if (mins == null) return null;
    const date = new Date(baseDate);
    date.setHours(Math.floor(mins / 60), mins % 60, 0, 0);
    return date;
  }

  function addDateMinutes(date, minutes) {
    return new Date(date.getTime() + Number(minutes) * 60000);
  }

  function activeFastPlan(now = new Date()) {
    return [...state.fastPlans]
      .filter(plan => new Date(plan.activeFrom).getTime() <= now.getTime())
      .sort((a, b) => new Date(a.activeFrom) - new Date(b.activeFrom))
      .at(-1) || null;
  }

  function pendingFastPlan(now = new Date()) {
    return [...state.fastPlans]
      .filter(plan => new Date(plan.activeFrom).getTime() > now.getTime())
      .sort((a, b) => new Date(a.activeFrom) - new Date(b.activeFrom))[0] || null;
  }

  function planPresetLabel(plan) {
    if (!plan) return '';
    if (plan.preset && plan.preset !== 'custom') return plan.preset;
    const fast = cleanNumber(plan.fastingMinutes / 60, 1);
    const eat = cleanNumber(plan.eatingMinutes / 60, 1);
    return `${fmt(fast)}:${fmt(eat)}`;
  }

  function planWindows(plan) {
    if (!plan) return null;
    const anchor = parseClockMinutes(plan.anchorTime);
    if (anchor == null) return null;
    if (plan.anchorType === 'fastingStart') {
      const fastEnd = anchor + plan.fastingMinutes;
      return {
        fastingStart: clockFromMinutes(anchor), fastingEnd: clockFromMinutes(fastEnd),
        eatingStart: clockFromMinutes(fastEnd), eatingEnd: clockFromMinutes(anchor + 1440)
      };
    }
    const eatEnd = anchor + plan.eatingMinutes;
    return {
      eatingStart: clockFromMinutes(anchor), eatingEnd: clockFromMinutes(eatEnd),
      fastingStart: clockFromMinutes(eatEnd), fastingEnd: clockFromMinutes(anchor + 1440)
    };
  }

  function phaseForPlan(plan, now = new Date()) {
    if (!plan) return null;
    let anchor = dateAtClock(now, plan.anchorTime);
    if (!anchor) return null;
    if (now.getTime() < anchor.getTime()) anchor = addDateMinutes(anchor, -1440);
    const firstPhase = plan.anchorType === 'fastingStart' ? 'fasting' : 'eating';
    const firstDuration = firstPhase === 'fasting' ? plan.fastingMinutes : plan.eatingMinutes;
    const split = addDateMinutes(anchor, firstDuration);
    const cycleEnd = addDateMinutes(anchor, 1440);
    let phase, start, end, totalMinutes;
    if (now.getTime() < split.getTime()) {
      phase = firstPhase; start = anchor; end = split; totalMinutes = firstDuration;
    } else {
      phase = firstPhase === 'fasting' ? 'eating' : 'fasting';
      start = split; end = cycleEnd;
      totalMinutes = 1440 - firstDuration;
    }
    const elapsedMinutes = Math.max(0, (now.getTime() - start.getTime()) / 60000);
    const remainingMinutes = Math.max(0, (end.getTime() - now.getTime()) / 60000);
    return { phase, start, end, totalMinutes, elapsedMinutes, remainingMinutes };
  }

  function durationText(minutes, roundMode = 'floor') {
    const safe = Math.max(0, Number(minutes) || 0);
    const whole = roundMode === 'ceil' ? Math.ceil(safe) : Math.floor(safe);
    const hours = Math.floor(whole / 60);
    const mins = whole % 60;
    if (hours && mins) return `${hours} h ${String(mins).padStart(2, '0')} min`;
    if (hours) return `${hours} h`;
    return `${mins} min`;
  }

  function clockText(date) {
    return new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit' }).format(date);
  }

  function phaseStartText(date, now = new Date()) {
    const a = new Date(date); a.setHours(0,0,0,0);
    const b = new Date(now); b.setHours(0,0,0,0);
    const diff = Math.round((b - a) / 86400000);
    if (diff === 0) return `seit ${clockText(date)} Uhr`;
    if (diff === 1) return `seit gestern, ${clockText(date)} Uhr`;
    return `seit ${new Intl.DateTimeFormat('de-DE', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' }).format(date)} Uhr`;
  }

  function nextAnchorOccurrence(clock, now = new Date()) {
    let candidate = dateAtClock(now, clock);
    if (!candidate) return null;
    if (candidate.getTime() <= now.getTime() + 30000) candidate = addDateMinutes(candidate, 1440);
    return candidate;
  }


  function fastingWindowForDate(plan, dayDate) {
    const anchor = dateAtClock(dayDate, plan.anchorTime);
    if (!anchor) return null;
    const start = plan.anchorType === 'fastingStart'
      ? anchor
      : addDateMinutes(anchor, plan.eatingMinutes);
    const end = addDateMinutes(start, plan.fastingMinutes);
    return { start, end };
  }

  function fastingCycleKey(plan, start) {
    return `${plan.id}:${new Date(start).toISOString()}`;
  }

  function planEffectiveAt(date) {
    return [...state.fastPlans]
      .filter(plan => new Date(plan.activeFrom).getTime() <= date.getTime())
      .sort((a, b) => new Date(a.activeFrom) - new Date(b.activeFrom))
      .at(-1) || null;
  }

  function startOfLocalDay(date) {
    const result = new Date(date);
    result.setHours(0, 0, 0, 0);
    return result;
  }

  function sessionsOverlap(start, end, excludeId = null) {
    const startMs = new Date(start).getTime();
    const endMs = new Date(end).getTime();
    return state.fastingSessions.some(session => {
      if (session.deleted || session.id === excludeId) return false;
      const s = new Date(session.startAt).getTime();
      const e = new Date(session.endAt || session.plannedEndAt || session.startAt).getTime();
      return s < endMs && e > startMs;
    });
  }

  function repairInvalidFastingSessions(now = new Date()) {
    const nowMs = now.getTime();
    let changed = false;
    const valid = [];

    state.fastingSessions.forEach(session => {
      if (session.deleted) {
        valid.push(session);
        return;
      }

      const start = new Date(session.startAt);
      if (Number.isNaN(start.getTime()) || start.getTime() > nowMs) {
        changed = true;
        return;
      }

      if (session.endAt) {
        const end = new Date(session.endAt);
        if (Number.isNaN(end.getTime()) || end.getTime() <= start.getTime() || end.getTime() > nowMs) {
          // Eine abgeschlossene Session kann nicht in der Zukunft enden.
          // Den fehlerhaften Datensatz entfernen wir vollständig; geplante Sessions
          // werden direkt danach aus dem gültigen Fastenplan neu rekonstruiert.
          changed = true;
          return;
        }
      }

      valid.push(session);
    });

    if (changed) state.fastingSessions = valid;
    return changed;
  }

  function currentScheduledFastingWindow(plan, now = new Date()) {
    if (!plan) return null;
    const day = startOfLocalDay(now);
    for (let offset = -1; offset <= 1; offset += 1) {
      const raw = fastingWindowForDate(plan, addDateMinutes(day, offset * 1440));
      if (raw && raw.start.getTime() <= now.getTime() && raw.end.getTime() > now.getTime()) return raw;
    }
    return null;
  }

  function synchronizeFastingSessions(now = new Date()) {
    if (!state.fastPlans.length) return false;
    let changed = repairInvalidFastingSessions(now);
    const plans = [...state.fastPlans].sort((a, b) => new Date(a.activeFrom) - new Date(b.activeFrom));
    const horizon = addDateMinutes(now, 1440);
    plans.forEach((plan, index) => {
      const effectiveStart = new Date(plan.activeFrom);
      const effectiveEnd = plans[index + 1] ? new Date(plans[index + 1].activeFrom) : horizon;
      if (effectiveStart.getTime() > now.getTime()) return;

      let cursor = startOfLocalDay(addDateMinutes(effectiveStart, index === 0 ? -1440 : 0));
      const endCursor = startOfLocalDay(addDateMinutes(new Date(Math.min(horizon.getTime(), effectiveEnd.getTime())), 1440));
      let guard = 0;
      while (cursor.getTime() <= endCursor.getTime() && guard++ < 800) {
        const raw = fastingWindowForDate(plan, cursor);
        cursor = addDateMinutes(cursor, 1440);
        if (!raw) continue;
        if (raw.end.getTime() <= effectiveStart.getTime()) continue;
        if (raw.start.getTime() >= effectiveEnd.getTime()) continue;

        let sessionStart = raw.start;
        if (raw.start.getTime() < effectiveStart.getTime()) {
          if (index > 0) continue;
          sessionStart = effectiveStart;
        }
        const plannedEnd = new Date(Math.min(raw.end.getTime(), effectiveEnd.getTime()));
        if (sessionStart.getTime() > now.getTime()) continue;

        const key = fastingCycleKey(plan, raw.start);
        const existing = state.fastingSessions.find(session => session.cycleKey === key);
        if (existing) {
          if (!existing.deleted && !existing.endAt && existing.plannedEndAt && now.getTime() >= new Date(existing.plannedEndAt).getTime()) {
            existing.endAt = existing.plannedEndAt;
            existing.endSource = existing.endSource || 'schedule';
            existing.updatedAt = now.toISOString();
            changed = true;
          }
          continue;
        }

        if (state.fastingSessions.some(session => session.deleted && session.cycleKey === key)) continue;
        if (sessionsOverlap(sessionStart, plannedEnd)) continue;

        const ended = now.getTime() >= plannedEnd.getTime();
        const stamp = now.toISOString();
        state.fastingSessions.push({
          id: uuid(),
          startAt: sessionStart.toISOString(),
          endAt: ended ? plannedEnd.toISOString() : null,
          plannedEndAt: plannedEnd.toISOString(),
          targetMinutes: Number(plan.fastingMinutes || 0),
          planId: plan.id,
          startSource: 'schedule',
          endSource: ended ? 'schedule' : null,
          cycleKey: key,
          deleted: false,
          createdAt: stamp,
          updatedAt: stamp
        });
        changed = true;
      }
    });

    state.fastingSessions.forEach(session => {
      if (session.deleted || session.endAt || !session.plannedEndAt) return;
      if (now.getTime() >= new Date(session.plannedEndAt).getTime()) {
        session.endAt = session.plannedEndAt;
        session.endSource = session.endSource || 'schedule';
        session.updatedAt = now.toISOString();
        changed = true;
      }
    });

    if (changed) persist();
    return changed;
  }

  function activeFastingSession(now = new Date()) {
    synchronizeFastingSessions(now);
    return state.fastingSessions
      .filter(session => !session.deleted && !session.endAt && new Date(session.startAt).getTime() <= now.getTime())
      .sort((a, b) => new Date(a.startAt) - new Date(b.startAt))
      .at(-1) || null;
  }

  function nextScheduledFastingWindow(plan, now = new Date()) {
    if (!plan) return null;
    const day = startOfLocalDay(now);
    const candidates = [];
    for (let offset = -1; offset <= 2; offset += 1) {
      const raw = fastingWindowForDate(plan, addDateMinutes(day, offset * 1440));
      if (raw && raw.end.getTime() > now.getTime()) candidates.push(raw);
    }
    return candidates.sort((a, b) => a.start - b.start)[0] || null;
  }

  function nextScheduledFastingStart(plan, now = new Date()) {
    if (!plan) return null;
    const day = startOfLocalDay(now);
    const candidates = [];
    for (let offset = -1; offset <= 2; offset += 1) {
      const raw = fastingWindowForDate(plan, addDateMinutes(day, offset * 1440));
      if (raw && raw.start.getTime() > now.getTime()) candidates.push(raw.start);
    }
    return candidates.sort((a, b) => a - b)[0] || null;
  }

  function fastingStatus(now = new Date()) {
    const plan = activeFastPlan(now);
    if (!plan) return null;
    synchronizeFastingSessions(now);
    const active = activeFastingSession(now);
    if (active) {
      const start = new Date(active.startAt);
      const end = new Date(active.plannedEndAt || addDateMinutes(start, active.targetMinutes || plan.fastingMinutes));
      const totalMinutes = Math.max(1, (end - start) / 60000);
      return {
        phase: 'fasting',
        plan,
        session: active,
        start,
        end,
        totalMinutes,
        elapsedMinutes: Math.max(0, (now - start) / 60000),
        remainingMinutes: Math.max(0, (end - now) / 60000)
      };
    }

    const scheduled = phaseForPlan(plan, now);
    if (!scheduled) return null;
    if (scheduled.phase === 'fasting') {
      const currentWindow = currentScheduledFastingWindow(plan, now);
      const endedEarly = currentWindow ? state.fastingSessions
        .filter(session => !session.deleted && session.endAt && session.planId === plan.id)
        .filter(session => {
          const start = new Date(session.startAt);
          const end = new Date(session.endAt);
          const planned = new Date(session.plannedEndAt || session.endAt);
          if ([start, end, planned].some(value => Number.isNaN(value.getTime()))) return false;
          return end.getTime() <= now.getTime()
            && planned.getTime() > now.getTime()
            && start.getTime() < currentWindow.end.getTime()
            && end.getTime() > currentWindow.start.getTime();
        })
        .sort((a, b) => new Date(a.endAt) - new Date(b.endAt))
        .at(-1) : null;
      if (endedEarly) {
        const start = new Date(endedEarly.endAt);
        const end = nextScheduledFastingStart(plan, now) || addDateMinutes(start, plan.eatingMinutes);
        return {
          phase: 'eating',
          plan,
          session: null,
          start,
          end,
          totalMinutes: Math.max(1, (end - start) / 60000),
          elapsedMinutes: Math.max(0, (now - start) / 60000),
          remainingMinutes: Math.max(0, (end - now) / 60000),
          override: 'fast-ended-early'
        };
      }
    }
    return { ...scheduled, plan, session: null };
  }

  function localDateTimeInputValue(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    return `${y}-${m}-${d}T${hh}:${mm}`;
  }

  function parseLocalDateTimeInput(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function fastingDurationMinutes(session) {
    if (!session?.endAt) return 0;
    return Math.max(0, (new Date(session.endAt) - new Date(session.startAt)) / 60000);
  }

  function fastingHistoryDate(date) {
    return new Intl.DateTimeFormat('de-DE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }).format(date);
  }

  function localDayKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  function nextLocalDayStart(date) {
    const next = startOfLocalDay(date);
    next.setDate(next.getDate() + 1);
    return next;
  }

  function fastingHistoryDays(sessions, now = new Date()) {
    const days = new Map();
    const nowMs = now.getTime();
    sessions.forEach(session => {
      const sessionStart = new Date(session.startAt);
      const storedEnd = session.endAt ? new Date(session.endAt) : null;
      if (Number.isNaN(sessionStart.getTime()) || sessionStart.getTime() > nowMs) return;
      if (storedEnd && Number.isNaN(storedEnd.getTime())) return;

      const running = !storedEnd;
      const sessionEnd = new Date(Math.min(storedEnd ? storedEnd.getTime() : nowMs, nowMs));
      if (sessionEnd <= sessionStart) return;

      let cursor = new Date(sessionStart);
      let guard = 0;
      while (cursor < sessionEnd && guard++ < 400) {
        const dayStart = startOfLocalDay(cursor);
        const dayEnd = nextLocalDayStart(dayStart);
        const segmentStart = new Date(Math.max(sessionStart.getTime(), dayStart.getTime()));
        const segmentEnd = new Date(Math.min(sessionEnd.getTime(), dayEnd.getTime()));
        if (segmentEnd <= segmentStart) break;

        const key = localDayKey(dayStart);
        if (!days.has(key)) days.set(key, { key, date: dayStart, segments: [], totalMinutes: 0 });
        const day = days.get(key);
        const minutes = (segmentEnd - segmentStart) / 60000;
        day.segments.push({
          sessionId: session.id,
          start: segmentStart,
          end: segmentEnd,
          dayStart,
          dayEnd,
          minutes,
          targetMinutes: Number(session.targetMinutes || 0),
          running: running && segmentEnd.getTime() === sessionEnd.getTime() && segmentEnd.getTime() === nowMs
        });
        day.totalMinutes += minutes;
        cursor = new Date(segmentEnd);
      }
    });

    return [...days.values()]
      .map(day => ({ ...day, segments: day.segments.sort((a, b) => a.start - b.start) }))
      .sort((a, b) => b.date - a.date);
  }

  function fastingSegmentClock(segment, edge) {
    const value = edge === 'start' ? segment.start : segment.end;
    if (edge === 'start' && value.getTime() === segment.dayStart.getTime()) return '00:00';
    if (edge === 'end' && value.getTime() === segment.dayEnd.getTime()) return '24:00';
    return clockText(value);
  }

  function fastingDayTargetText(day) {
    const targets = [...new Set(day.segments.map(segment => Number(segment.targetMinutes || 0)).filter(value => value > 0))];
    if (targets.length === 1) return ` · Ziel ${durationText(targets[0])}`;
    if (targets.length > 1) return ' · verschiedene Ziele';
    return '';
  }

  function fastingHistoryMarkup() {
    const now = new Date();
    synchronizeFastingSessions(now);
    const sessions = state.fastingSessions
      .filter(session => !session.deleted && new Date(session.startAt).getTime() <= now.getTime())
      .filter(session => !session.endAt || new Date(session.endAt).getTime() <= now.getTime())
      .sort((a, b) => new Date(b.startAt) - new Date(a.startAt));
    const days = fastingHistoryDays(sessions, now);
    return `<section class="fasting-history-head">
      <div><h2>Fastenverlauf</h2><p>Fastenzeit je Kalendertag. Tippe einen Zeitraum an, um die vollständige Fastenphase zu bearbeiten.</p></div>
      <button type="button" class="secondary-button compact-action" id="add-fasting-session">${icon('plus')} Nachtragen</button>
    </section>
    ${days.length ? `<section class="fasting-history-list">${days.map(day => `
      <article class="fasting-day-card">
        <header class="fasting-day-head">
          <div>
            <strong>${esc(fastingHistoryDate(day.date))}</strong>
            <small>${day.segments.length === 1 ? '1 Fastenzeitraum' : `${day.segments.length} Fastenzeiträume`}${fastingDayTargetText(day)}</small>
          </div>
          <span class="fasting-day-total">${durationText(day.totalMinutes)}</span>
        </header>
        <div class="fasting-day-segments">
          ${day.segments.map(segment => `<button type="button" class="fasting-day-segment" data-fasting-session="${esc(segment.sessionId)}">
            <span class="fasting-history-moon">${icon('moon')}</span>
            <span class="fasting-day-segment-main">
              <strong>${fastingSegmentClock(segment, 'start')} – ${fastingSegmentClock(segment, 'end')}</strong>
              <small>${durationText(segment.minutes)} Fasten${segment.running ? ' · läuft' : ''}</small>
            </span>
            <span class="chev">›</span>
          </button>`).join('')}
        </div>
        <footer class="fasting-day-footer"><span>Fastenzeit an diesem Tag</span><strong>${durationText(day.totalMinutes)}</strong></footer>
      </article>`).join('')}</section>` : `<section class="fasting-history-placeholder"><div>${icon('list')}</div><h2>Noch keine Fastenzeiten</h2><p>Abgeschlossene Fastenphasen werden hier nach Kalendertagen aufgeteilt. Du kannst vollständige Fastenphasen auch nachträglich ergänzen.</p></section>`}`;
  }

  function openFastingSessionEditor(sessionId = null) {
    synchronizeFastingSessions(new Date());
    const session = sessionId ? state.fastingSessions.find(item => item.id === sessionId && !item.deleted) : null;
    const activePlan = activeFastPlan(new Date());
    const now = new Date();
    const defaultEnd = now;
    const defaultStart = addDateMinutes(defaultEnd, -(activePlan?.fastingMinutes || 840));
    const startValue = localDateTimeInputValue(session?.startAt || defaultStart);
    const endValue = localDateTimeInputValue(session?.endAt || defaultEnd);
    modalRoot.innerHTML = `<div class="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="fast-session-editor-title"><div class="modal">
      <h2 id="fast-session-editor-title">${session ? 'Fastenphase bearbeiten' : 'Fastenphase nachtragen'}</h2>
      <label class="modal-field"><span>Beginn</span><input id="fast-session-start" type="datetime-local" value="${esc(startValue)}"></label>
      <label class="modal-field"><span>Ende</span><input id="fast-session-end" type="datetime-local" max="${esc(localDateTimeInputValue(now))}" value="${esc(endValue)}"></label>
      <div class="fasting-session-preview" id="fast-session-preview"></div>
      <div class="modal-actions">
        <button class="primary-button" id="save-fast-session">${session ? 'Änderungen speichern' : 'Fastenphase speichern'}</button>
        ${session ? '<button class="danger-soft-button" id="delete-fast-session">Fastenphase löschen</button>' : ''}
        <button class="secondary-button" id="cancel-fast-session">Abbrechen</button>
      </div>
    </div></div>`;

    const update = () => {
      const start = parseLocalDateTimeInput(document.getElementById('fast-session-start').value);
      const end = parseLocalDateTimeInput(document.getElementById('fast-session-end').value);
      const box = document.getElementById('fast-session-preview');
      if (!start || !end || end <= start) {
        box.innerHTML = '<small>Bitte Beginn und Ende prüfen.</small>';
        return;
      }
      if (end.getTime() > Date.now()) {
        box.innerHTML = '<small>Das Ende einer abgeschlossenen Fastenphase darf nicht in der Zukunft liegen.</small>';
        return;
      }
      box.innerHTML = `<small>Dauer</small><strong>${durationText((end - start) / 60000)}</strong>`;
    };
    document.getElementById('fast-session-start').addEventListener('input', update);
    document.getElementById('fast-session-end').addEventListener('input', update);
    document.getElementById('cancel-fast-session').onclick = () => { modalRoot.innerHTML = ''; };
    document.getElementById('save-fast-session').onclick = () => {
      const start = parseLocalDateTimeInput(document.getElementById('fast-session-start').value);
      const end = parseLocalDateTimeInput(document.getElementById('fast-session-end').value);
      if (!start || !end || end <= start) return showToast('Bitte Beginn und Ende prüfen.');
      if (end.getTime() > Date.now()) return showToast('Das Ende einer abgeschlossenen Fastenphase darf nicht in der Zukunft liegen.');
      if (sessionsOverlap(start, end, session?.id || null)) return showToast('Diese Fastenphase überschneidet sich mit einer vorhandenen Fastenphase.');
      const plan = planEffectiveAt(start) || activeFastPlan(new Date());
      const stamp = new Date().toISOString();
      if (session) {
        session.startAt = start.toISOString();
        session.endAt = end.toISOString();
        session.startSource = 'manual';
        session.endSource = 'manual';
        session.updatedAt = stamp;
      } else {
        state.fastingSessions.push({
          id: uuid(),
          startAt: start.toISOString(),
          endAt: end.toISOString(),
          plannedEndAt: end.toISOString(),
          targetMinutes: Number(plan?.fastingMinutes || (end - start) / 60000),
          planId: plan?.id || null,
          startSource: 'manual',
          endSource: 'manual',
          cycleKey: null,
          deleted: false,
          createdAt: stamp,
          updatedAt: stamp
        });
      }
      persist();
      modalRoot.innerHTML = '';
      state.fastingTab = 'history';
      renderFasting(); bindCommon();
      showToast(session ? 'Fastenphase aktualisiert.' : 'Fastenphase nachgetragen.');
    };
    document.getElementById('delete-fast-session')?.addEventListener('click', () => {
      modalRoot.innerHTML = `<div class="modal-backdrop" role="dialog" aria-modal="true"><div class="modal"><h2>Fastenphase löschen?</h2><p>Diese aufgezeichnete Fastenphase wird aus dem Verlauf entfernt.</p><div class="modal-actions"><button class="danger-button" id="confirm-delete-fast-session">Löschen</button><button class="secondary-button" id="cancel-delete-fast-session">Abbrechen</button></div></div></div>`;
      document.getElementById('cancel-delete-fast-session').onclick = () => { modalRoot.innerHTML = ''; };
      document.getElementById('confirm-delete-fast-session').onclick = () => {
        if (session.cycleKey) session.deleted = true;
        else state.fastingSessions = state.fastingSessions.filter(item => item.id !== session.id);
        persist();
        modalRoot.innerHTML = '';
        renderFasting(); bindCommon();
        showToast('Fastenphase gelöscht.');
      };
    });
    update();
  }

  function beginFastNow() {
    const now = new Date();
    const plan = activeFastPlan(now);
    if (!plan) return showToast('Bitte zuerst einen Fastenplan einrichten.');
    synchronizeFastingSessions(now);
    if (activeFastingSession(now)) return showToast('Eine Fastenphase läuft bereits.');
    const nextWindow = nextScheduledFastingWindow(plan, now);
    let plannedEnd = nextWindow?.end || addDateMinutes(now, plan.fastingMinutes);
    if (plannedEnd <= now) plannedEnd = addDateMinutes(now, plan.fastingMinutes);
    const stamp = now.toISOString();
    state.fastingSessions.push({
      id: uuid(),
      startAt: stamp,
      endAt: null,
      plannedEndAt: plannedEnd.toISOString(),
      targetMinutes: Number(plan.fastingMinutes),
      planId: plan.id,
      startSource: 'manual',
      endSource: null,
      cycleKey: null,
      deleted: false,
      createdAt: stamp,
      updatedAt: stamp
    });
    persist();
    renderFasting(); bindCommon();
    showToast('Fastenphase gestartet.');
  }

  function endFastNow() {
    const now = new Date();
    const session = activeFastingSession(now);
    if (!session) return showToast('Aktuell läuft keine Fastenphase.');
    session.endAt = now.toISOString();
    session.endSource = 'manual';
    session.updatedAt = now.toISOString();
    persist();
    renderFasting(); bindCommon();
    showToast(`Fasten beendet: ${durationText(fastingDurationMinutes(session))}.`);
  }

  function editActiveFastingSession() {
    const now = new Date();
    const session = activeFastingSession(now);
    if (!session) return;
    modalRoot.innerHTML = `<div class="modal-backdrop" role="dialog" aria-modal="true"><div class="modal">
      <h2>Laufende Fastenphase bearbeiten</h2>
      <label class="modal-field"><span>Fastenbeginn</span><input id="active-fast-start" type="datetime-local" value="${esc(localDateTimeInputValue(session.startAt))}"></label>
      <label class="modal-field"><span>Geplantes Ende</span><input id="active-fast-end" type="datetime-local" value="${esc(localDateTimeInputValue(session.plannedEndAt))}"></label>
      <div class="fasting-session-preview" id="active-fast-preview"></div>
      <div class="modal-actions"><button class="primary-button" id="save-active-fast">Zeiten speichern</button><button class="secondary-button" id="cancel-active-fast">Abbrechen</button></div>
    </div></div>`;
    const update = () => {
      const start = parseLocalDateTimeInput(document.getElementById('active-fast-start').value);
      const end = parseLocalDateTimeInput(document.getElementById('active-fast-end').value);
      const box = document.getElementById('active-fast-preview');
      if (!start || !end || end <= start) return box.innerHTML = '<small>Bitte Zeiten prüfen.</small>';
      box.innerHTML = `<small>Geplante Dauer dieser Phase</small><strong>${durationText((end - start) / 60000)}</strong>`;
    };
    document.getElementById('active-fast-start').addEventListener('input', update);
    document.getElementById('active-fast-end').addEventListener('input', update);
    document.getElementById('cancel-active-fast').onclick = () => { modalRoot.innerHTML = ''; };
    document.getElementById('save-active-fast').onclick = () => {
      const start = parseLocalDateTimeInput(document.getElementById('active-fast-start').value);
      const end = parseLocalDateTimeInput(document.getElementById('active-fast-end').value);
      if (!start || !end || end <= start) return showToast('Bitte Zeiten prüfen.');
      if (sessionsOverlap(start, end, session.id)) return showToast('Diese Fastenphase überschneidet sich mit einer vorhandenen Fastenphase.');
      session.startAt = start.toISOString();
      session.plannedEndAt = end.toISOString();
      session.startSource = 'manual';
      session.updatedAt = new Date().toISOString();
      if (end.getTime() <= Date.now()) {
        session.endAt = end.toISOString();
        session.endSource = 'manual';
      }
      persist();
      modalRoot.innerHTML = '';
      renderFasting(); bindCommon();
      showToast('Fastenzeiten aktualisiert.');
    };
    update();
  }

  function renderFastingTabs(active) {
    return `<div class="fasting-tabs" role="tablist" aria-label="Fastenbereiche">
      <button type="button" class="fasting-tab ${active === 'timer' ? 'active' : ''}" data-fasting-tab="timer">${icon('clock')} Timer</button>
      <button type="button" class="fasting-tab ${active === 'history' ? 'active' : ''}" data-fasting-tab="history">${icon('list')} Verlauf</button>
      <button type="button" class="fasting-tab ${active === 'plan' ? 'active' : ''}" data-fasting-tab="plan">${icon('plan')} Plan</button>
    </div>`;
  }

  function bindFastingTabs() {
    document.querySelectorAll('[data-fasting-tab]').forEach(button => {
      button.onclick = () => {
        state.fastingTab = button.dataset.fastingTab;
        state.fastingPlanEditing = false;
        renderFasting();
        bindCommon();
      };
    });
  }

  function renderFasting() {
    const now = new Date();
    const activePlan = activeFastPlan(now);
    const pending = pendingFastPlan(now);
    if (!activePlan) {
      state.fastingTab = 'plan';
      app.innerHTML = `<main class="page fasting-page">
        <header class="topbar"><div><div class="eyebrow">Fasten</div><h1>Fasten einrichten</h1></div></header>
        <section class="fasting-welcome">
          <div class="fasting-welcome-icon">${icon('moon')}</div>
          <h2>Dein Rhythmus, ganz in Ruhe</h2>
          <p>Wähle einen Fastenrhythmus und eine Startzeit. Mampfo berechnet die aktuelle Phase aus festen Zeitpunkten, auch wenn die App zwischendurch geschlossen ist.</p>
        </section>
        ${fastPlanForm(null, true)}
      </main>${bottomNav('fasting')}`;
      bindFastPlanForm(true, null);
      return;
    }

    const tab = state.fastingTab || 'timer';
    let content = '';
    if (tab === 'timer') content = fastingTimerMarkup(activePlan, pending, now);
    else if (tab === 'history') content = fastingHistoryMarkup();
    else content = fastingPlanMarkup(activePlan, pending);

    app.innerHTML = `<main class="page fasting-page">
      <header class="topbar"><div><div class="eyebrow">Intervallfasten</div><h1>Fasten</h1></div></header>
      ${renderFastingTabs(tab)}
      ${content}
    </main>${bottomNav('fasting')}`;
    bindFastingTabs();
    document.getElementById('open-fast-plan')?.addEventListener('click', () => {
      state.fastingTab = 'plan';
      state.fastingPlanEditing = false;
      renderFasting(); bindCommon();
    });
    if (tab === 'plan') bindFastingPlanPage(activePlan);
    if (tab === 'history') {
      document.getElementById('add-fasting-session')?.addEventListener('click', () => openFastingSessionEditor());
      document.querySelectorAll('[data-fasting-session]').forEach(button => {
        button.onclick = () => {
          const session = state.fastingSessions.find(item => item.id === button.dataset.fastingSession && !item.deleted);
          if (session && !session.endAt) editActiveFastingSession();
          else openFastingSessionEditor(button.dataset.fastingSession);
        };
      });
    }
    if (tab === 'timer') {
      document.getElementById('begin-fast-now')?.addEventListener('click', beginFastNow);
      document.getElementById('end-fast-now')?.addEventListener('click', endFastNow);
      document.getElementById('edit-active-fast')?.addEventListener('click', editActiveFastingSession);
    }
  }

  function fastingTimerMarkup(plan, pending, now) {
    const phase = fastingStatus(now);
    if (!phase) return `<div class="settings-note">Der aktuelle Fastenplan konnte nicht berechnet werden.</div>`;
    const isFast = phase.phase === 'fasting';
    const progress = Math.max(0, Math.min(100, phase.elapsedMinutes / phase.totalMinutes * 100));
    const windows = planWindows(plan);
    const pendingNote = pending ? `<div class="fasting-pending-note">${icon('plan')} Neuer Plan ab <strong>${new Intl.DateTimeFormat('de-DE', { weekday:'short', day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' }).format(new Date(pending.activeFrom))}</strong>: ${esc(planPresetLabel(pending))}</div>` : '';
    return `<section class="fasting-status ${isFast ? 'is-fasting' : 'is-eating'}">
      <div class="fasting-status-icon">${isFast ? icon('moon') : icon('bowl')}</div>
      <div class="fasting-status-kicker">${isFast ? 'FASTEN' : 'ESSENSPHASE'}</div>
      <div class="fasting-since">${phaseStartText(phase.start, now)}</div>
      <strong class="fasting-main-time">${isFast ? durationText(phase.elapsedMinutes) : durationText(phase.remainingMinutes, 'ceil')}</strong>
      <div class="fasting-main-label">${isFast ? 'gefastet' : 'noch bis zum Fasten'}</div>
      ${isFast ? `<div class="fasting-secondary-time">noch ${durationText(phase.remainingMinutes, 'ceil')}</div>` : ''}
      <div class="fasting-progress"><span style="width:${progress.toFixed(2)}%"></span></div>
      <div class="fasting-end-text">${isFast ? 'Fasten endet' : 'Fasten beginnt'} um <strong>${clockText(phase.end)} Uhr</strong></div>
      <div class="fasting-actions">
        ${isFast
          ? `<button type="button" class="primary-button" id="end-fast-now">${icon('bowl')} Fasten jetzt beenden</button><button type="button" class="secondary-button" id="edit-active-fast">${icon('edit')} Zeit bearbeiten</button>`
          : `<button type="button" class="primary-button" id="begin-fast-now">${icon('moon')} Fasten jetzt beginnen</button>`}
      </div>
    </section>
    <section class="fasting-plan-summary">
      <div class="fasting-plan-badge">${esc(planPresetLabel(plan))}</div>
      <div><strong>Dein aktueller Plan</strong><small>🍴 ${windows.eatingStart} – ${windows.eatingEnd} · ☾ ${windows.fastingStart} – ${windows.fastingEnd}</small></div>
      <button type="button" class="mini-link" id="open-fast-plan">Plan</button>
    </section>
    ${pendingNote}
    <div class="fasting-info-note">${icon('clock')} Der Timer muss nicht im Hintergrund laufen. Mampfo berechnet den Status beim Öffnen anhand deiner gespeicherten Zeiten neu.</div>`;
  }

  function fastingPlanMarkup(plan, pending) {
    const windows = planWindows(plan);
    const pendingMarkup = pending ? `<section class="pending-plan-card"><small>Geplanter Wechsel</small><strong>${esc(planPresetLabel(pending))}</strong><span>ab ${new Intl.DateTimeFormat('de-DE', { weekday:'long', day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' }).format(new Date(pending.activeFrom))} Uhr</span><span>${planWindows(pending).eatingStart} – ${planWindows(pending).eatingEnd} Essen · ${planWindows(pending).fastingStart} – ${planWindows(pending).fastingEnd} Fasten</span></section>` : '';
    return `<section class="current-plan-card">
      <div class="current-plan-top"><div><small>Aktueller Plan</small><strong>${esc(planPresetLabel(plan))}</strong></div><span class="plan-round-icon">${icon('plan')}</span></div>
      <div class="plan-window-row eating"><span>${icon('bowl')}</span><div><small>Essensphase</small><strong>${windows.eatingStart} – ${windows.eatingEnd}</strong></div></div>
      <div class="plan-window-row fasting"><span>${icon('moon')}</span><div><small>Fastenphase</small><strong>${windows.fastingStart} – ${windows.fastingEnd}</strong></div></div>
    </section>
    ${pendingMarkup}
    ${state.fastingPlanEditing ? fastPlanForm(plan, false) : `<button type="button" class="primary-button floating-action" id="edit-fast-plan">${icon('edit')} Plan ändern</button>`}
    <div class="fasting-info-note">Eine Änderung gilt ab dem nächsten Startzeitpunkt des neuen Plans. Der bisherige Rhythmus bleibt bis dahin aktiv.</div>`;
  }

  function fastPlanForm(plan, initial) {
    const preset = plan?.preset || '14:10';
    const fastingMinutes = Number(plan?.fastingMinutes || 840);
    const customHours = cleanNumber(fastingMinutes / 60, 1);
    const anchorType = plan?.anchorType || 'eatingStart';
    const anchorTime = plan?.anchorTime || '09:00';
    const presets = [
      ['12:12', '12 h Fasten · 12 h Essen'],
      ['14:10', '14 h Fasten · 10 h Essen'],
      ['16:8', '16 h Fasten · 8 h Essen']
    ];
    return `<form class="fast-plan-form" id="fast-plan-form" data-preset="${esc(preset)}" data-anchor="${esc(anchorType)}">
      <div class="section-heading"><div><h2>${initial ? 'Fastenrhythmus' : 'Neuen Plan festlegen'}</h2><p>Wähle eine Voreinstellung oder deinen eigenen Rhythmus.</p></div></div>
      <div class="fast-preset-grid">
        ${presets.map(([value, note]) => `<button type="button" class="fast-preset ${preset === value ? 'active' : ''}" data-fast-preset="${value}"><strong>${value}</strong><small>${note}</small></button>`).join('')}
        <button type="button" class="fast-preset ${preset === 'custom' ? 'active' : ''}" data-fast-preset="custom"><strong>Eigener</strong><small>Rhythmus frei festlegen</small></button>
      </div>
      <div class="custom-fast-row" id="custom-fast-row" ${preset === 'custom' ? '' : 'hidden'}>
        <label for="custom-fast-hours">Fastendauer in Stunden</label>
        <div class="custom-fast-input"><input id="custom-fast-hours" inputmode="decimal" type="number" min="1" max="23" step="0.5" value="${esc(String(customHours))}"><span>h Fasten</span></div>
        <small id="custom-eating-hint"></small>
      </div>
      <div class="fast-anchor-section">
        <label>Orientierung</label>
        <div class="fast-anchor-switch">
          <button type="button" class="${anchorType === 'eatingStart' ? 'active' : ''}" data-fast-anchor="eatingStart">${icon('bowl')} Essensphase beginnt</button>
          <button type="button" class="${anchorType === 'fastingStart' ? 'active' : ''}" data-fast-anchor="fastingStart">${icon('moon')} Fasten beginnt</button>
        </div>
        <div class="fast-time-field"><label for="fast-anchor-time">Uhrzeit</label><input id="fast-anchor-time" type="time" value="${esc(anchorTime)}"></div>
      </div>
      <div class="fast-plan-preview" id="fast-plan-preview"></div>
      <div class="form-actions">
        <button type="submit" class="primary-button">${initial ? 'Fastenplan aktivieren' : 'Plan speichern'}</button>
        ${initial ? '' : '<button type="button" class="secondary-button" id="cancel-fast-plan">Abbrechen</button>'}
      </div>
    </form>`;
  }

  function draftFastPlanFromForm() {
    const form = document.getElementById('fast-plan-form');
    if (!form) return null;
    const preset = form.dataset.preset || '14:10';
    let fastingMinutes;
    if (preset === '12:12') fastingMinutes = 720;
    else if (preset === '14:10') fastingMinutes = 840;
    else if (preset === '16:8') fastingMinutes = 960;
    else {
      const hours = parseNum(document.getElementById('custom-fast-hours')?.value);
      if (hours == null || hours <= 0 || hours >= 24) return null;
      fastingMinutes = Math.round(hours * 60);
    }
    const eatingMinutes = 1440 - fastingMinutes;
    const anchorTime = document.getElementById('fast-anchor-time')?.value;
    if (parseClockMinutes(anchorTime) == null) return null;
    return { fastingMinutes, eatingMinutes, anchorType: form.dataset.anchor || 'eatingStart', anchorTime, preset };
  }

  function updateFastPlanPreview() {
    const draft = draftFastPlanFromForm();
    const preview = document.getElementById('fast-plan-preview');
    if (!preview) return;
    if (!draft) {
      preview.innerHTML = `<span>Bitte einen gültigen Rhythmus und eine Uhrzeit angeben.</span>`;
      return;
    }
    const windows = planWindows(draft);
    const customHint = document.getElementById('custom-eating-hint');
    if (customHint) customHint.textContent = `${fmt(draft.eatingMinutes / 60, 1)} h Essensphase`;
    preview.innerHTML = `<small>Vorschau</small><strong>${esc(planPresetLabel(draft))}</strong>
      <div><span class="eat-dot"></span> Essen ${windows.eatingStart} – ${windows.eatingEnd}</div>
      <div><span class="fast-dot"></span> Fasten ${windows.fastingStart} – ${windows.fastingEnd}</div>`;
  }

  function bindFastPlanForm(initial, currentPlan) {
    document.querySelectorAll('[data-fast-preset]').forEach(button => {
      button.onclick = () => {
        const form = document.getElementById('fast-plan-form');
        form.dataset.preset = button.dataset.fastPreset;
        document.querySelectorAll('[data-fast-preset]').forEach(item => item.classList.toggle('active', item === button));
        document.getElementById('custom-fast-row').hidden = button.dataset.fastPreset !== 'custom';
        updateFastPlanPreview();
      };
    });
    document.querySelectorAll('[data-fast-anchor]').forEach(button => {
      button.onclick = () => {
        const form = document.getElementById('fast-plan-form');
        form.dataset.anchor = button.dataset.fastAnchor;
        document.querySelectorAll('[data-fast-anchor]').forEach(item => item.classList.toggle('active', item === button));
        updateFastPlanPreview();
      };
    });
    ['custom-fast-hours', 'fast-anchor-time'].forEach(id => document.getElementById(id)?.addEventListener('input', updateFastPlanPreview));
    document.getElementById('fast-plan-form').addEventListener('submit', event => {
      event.preventDefault();
      const draft = draftFastPlanFromForm();
      if (!draft) return showToast('Bitte Fastenrhythmus und Uhrzeit prüfen.');
      saveFastPlan(draft, initial);
    });
    document.getElementById('cancel-fast-plan')?.addEventListener('click', () => {
      state.fastingPlanEditing = false;
      renderFasting(); bindCommon();
    });
    updateFastPlanPreview();
  }

  function bindFastingPlanPage(activePlan) {
    document.getElementById('edit-fast-plan')?.addEventListener('click', () => {
      state.fastingPlanEditing = true;
      renderFasting(); bindCommon();
    });
    if (state.fastingPlanEditing) bindFastPlanForm(false, activePlan);
  }

  function saveFastPlan(draft, initial) {
    const now = new Date();
    const activation = initial ? now : nextAnchorOccurrence(draft.anchorTime, now);
    if (!activation) return showToast('Die Startzeit konnte nicht berechnet werden.');
    const stamp = now.toISOString();
    const plan = { id: uuid(), ...draft, activeFrom: activation.toISOString(), createdAt: stamp, updatedAt: stamp };
    if (initial) {
      state.fastPlans = [plan];
      state.fastingTab = 'timer';
      state.fastingPlanEditing = false;
      persist();
      showToast('Fastenplan aktiviert.');
      renderFasting(); bindCommon();
      return;
    }
    state.fastPlans = state.fastPlans.filter(existing => new Date(existing.activeFrom).getTime() <= now.getTime());
    state.fastPlans.push(plan);
    state.fastingPlanEditing = false;
    persist();
    showToast(`Neuer Plan ab ${clockText(activation)} Uhr gespeichert.`);
    renderFasting(); bindCommon();
  }

  function statsDateISO(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  function statsMonthStart(iso) {
    const [y, m] = iso.split('-').map(Number);
    return `${y}-${String(m).padStart(2, '0')}-01`;
  }

  function statsPreviousMonthRange() {
    const [y, m] = todayISO().split('-').map(Number);
    const end = new Date(y, m - 1, 0);
    const start = new Date(end.getFullYear(), end.getMonth(), 1);
    return { start: statsDateISO(start), end: statsDateISO(end), label: 'Letzter Monat' };
  }

  function statsPeriodRange() {
    const today = todayISO();
    if (state.statsPeriod === '30d') return { start: offsetDate(today, -29), end: today, label: 'Letzte 30 Tage' };
    if (state.statsPeriod === 'month') return { start: statsMonthStart(today), end: today, label: 'Dieser Monat' };
    if (state.statsPeriod === 'prevMonth') return statsPreviousMonthRange();
    if (state.statsPeriod === 'custom') {
      let start = state.statsCustomStart || offsetDate(today, -6);
      let end = state.statsCustomEnd || today;
      if (start > end) [start, end] = [end, start];
      if (end > today) end = today;
      return { start, end, label: `${shortDate(start)} – ${shortDate(end)}` };
    }
    return { start: offsetDate(today, -6), end: today, label: 'Letzte 7 Tage' };
  }

  function statsDatesBetween(start, end) {
    const result = [];
    let cur = start;
    let guard = 0;
    while (cur <= end && guard < 400) {
      result.push(cur);
      cur = offsetDate(cur, 1);
      guard += 1;
    }
    return result;
  }

  function statsNutritionDay(date) {
    const entries = dailyEntries(date);
    const keys = ['calories', 'protein', 'fiber', 'fat', 'carbohydrates'];
    const totals = Object.fromEntries(keys.map(key => [key, 0]));
    const complete = Object.fromEntries(keys.map(key => [key, entries.length > 0]));
    entries.forEach(entry => {
      keys.forEach(key => {
        if (entry[key] == null || entry[key] === '') complete[key] = false;
        else totals[key] += Number(entry[key]) || 0;
      });
    });
    return { date, entries, hasData: entries.length > 0, totals, complete };
  }

  function statsNutritionData() {
    const range = statsPeriodRange();
    const dates = statsDatesBetween(range.start, range.end);
    return { range, days: dates.map(statsNutritionDay) };
  }

  function statsEligibleDays(days, key) {
    const today = todayISO();
    return days.filter(day => day.hasData && day.complete[key] && (state.statsIncludeToday || day.date !== today));
  }

  function statsAverage(days, key) {
    const eligible = statsEligibleDays(days, key);
    if (!eligible.length) return { value: null, count: 0 };
    return { value: eligible.reduce((sum, day) => sum + day.totals[key], 0) / eligible.length, count: eligible.length };
  }

  function statsMetricConfig(key) {
    return {
      calories: { label: 'Kalorien', unit: 'kcal', icon: 'flame', cls: 'calories', digits: 0, target: Number(state.settings.dailyCalories || 0) || null },
      protein: { label: 'Protein', unit: 'g', icon: 'protein', cls: 'protein', digits: 1, target: Number(state.settings.dailyProtein || 0) || null },
      fiber: { label: 'Ballaststoffe', unit: 'g', icon: 'leaf', cls: 'fiber', digits: 1, target: null },
      fat: { label: 'Fett', unit: 'g', icon: 'drop', cls: 'fat', digits: 1, target: null },
      carbohydrates: { label: 'Kohlenhydrate', unit: 'g', icon: 'carbs', cls: 'carbs', digits: 1, target: null }
    }[key];
  }

  function statsAverageCard(key, days) {
    const cfg = statsMetricConfig(key);
    const avg = statsAverage(days, key);
    const totalTracked = days.filter(day => day.hasData).length;
    const value = avg.value == null ? '–' : fmt(avg.value, cfg.digits);
    return `<article class="stats-kpi-card ${cfg.cls}">
      <span class="stats-kpi-icon-wrap"><span class="stats-kpi-icon">${icon(cfg.icon)}</span></span>
      <div><small>Ø ${cfg.label}</small><strong>${value}${avg.value == null ? '' : ` ${cfg.unit}`}</strong><span>${avg.count} ${avg.count === 1 ? 'geeigneter Tag' : 'geeignete Tage'} · ${totalTracked} Ernährungstage</span></div>
    </article>`;
  }

  function statsPeriodControls(range) {
    const includesToday = range.start <= todayISO() && range.end >= todayISO();
    const presets = [
      ['7d', '7 Tage'], ['30d', '30 Tage'], ['month', 'Dieser Monat'], ['prevMonth', 'Letzter Monat'], ['custom', 'Eigener Zeitraum']
    ];
    return `<section class="stats-period-panel">
      <div class="stats-period-pills" role="group" aria-label="Zeitraum">
        ${presets.map(([value, label]) => `<button class="stats-period-pill ${state.statsPeriod === value ? 'active' : ''}" data-stats-period="${value}">${label}</button>`).join('')}
      </div>
      ${state.statsPeriod === 'custom' ? `<div class="stats-custom-range">
        <label><span>Von</span><input type="date" id="stats-custom-start" value="${esc(state.statsCustomStart)}" max="${todayISO()}"></label>
        <label><span>Bis</span><input type="date" id="stats-custom-end" value="${esc(state.statsCustomEnd)}" max="${todayISO()}"></label>
        <button class="secondary-button stats-apply-range" id="stats-apply-custom">Anwenden</button>
      </div>` : ''}
      <div class="stats-period-meta"><strong>${esc(range.label)}</strong>${includesToday ? `<label class="stats-today-toggle"><input type="checkbox" id="stats-include-today" ${state.statsIncludeToday ? 'checked' : ''}><span>Heute in Durchschnitt einbeziehen</span></label>` : ''}</div>
    </section>`;
  }

  function statsTabBar() {
    return `<div class="stats-tabs" role="tablist" aria-label="Auswertung">
      ${[['overview','Übersicht'],['nutrition','Ernährung'],['fasting','Fasten'],['rhythm','Rhythmus']].map(([key,label]) => `<button class="stats-tab ${state.statsTab === key ? 'active' : ''}" data-stats-tab="${key}" role="tab">${label}</button>`).join('')}
    </div>`;
  }

  function statsDayLabel(iso, compact = false) {
    const [y, m, d] = iso.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    if (compact) return new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit' }).format(date);
    return new Intl.DateTimeFormat('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' }).format(date);
  }

  function statsNutrientChart(key, days) {
    const cfg = statsMetricConfig(key);
    const numeric = days.filter(day => day.hasData).map(day => day.totals[key]);
    const maxData = numeric.length ? Math.max(...numeric) : 0;
    const maxValue = Math.max(maxData, cfg.target || 0, 1) * 1.08;
    const targetPct = cfg.target ? Math.min(100, (cfg.target / maxValue) * 100) : null;
    return `<section class="stats-chart-card">
      <div class="stats-chart-head"><div><small>Tageswerte</small><h3>${cfg.label}</h3></div>${cfg.target ? `<span class="stats-target-note">Ziel ${fmt(cfg.target, cfg.digits)} ${cfg.unit}</span>` : ''}</div>
      <div class="stats-bar-chart ${cfg.cls} ${days.length > 14 ? 'dense' : ''}" role="img" aria-label="${cfg.label} pro Tag">
        ${days.map(day => {
          const has = day.hasData;
          const complete = day.complete[key];
          const value = day.totals[key];
          const pct = has ? Math.max(value > 0 ? 2 : 0, Math.min(100, (value / maxValue) * 100)) : 0;
          return `<button class="stats-bar-cell ${has ? '' : 'no-data'} ${complete ? '' : 'partial'}" data-stats-day="${day.date}" ${has ? '' : 'disabled'} title="${has ? `${statsDayLabel(day.date)}: ${fmt(value, cfg.digits)} ${cfg.unit}${complete ? '' : ' · teilweise erfasst'}` : `${statsDayLabel(day.date)}: keine Daten`}">
            <span class="stats-bar-value">${has ? `${fmt(value, cfg.digits)}${complete ? '' : '○'}` : '–'}</span>
            <span class="stats-bar-track">${targetPct != null ? `<i class="stats-target-line" style="bottom:${targetPct.toFixed(2)}%"></i>` : ''}<span class="stats-bar-fill" style="height:${pct.toFixed(2)}%"></span></span>
            <span class="stats-bar-label">${statsDayLabel(day.date, true)}</span>
          </button>`;
        }).join('')}
      </div>
      ${days.some(day => day.hasData && !day.complete[key]) ? `<p class="stats-chart-help">○ teilweise erfasst: Mindestens ein Eintrag des Tages enthält keinen Wert für ${cfg.label}.</p>` : ''}
    </section>`;
  }

  function statsDataBasis(days) {
    const tracked = days.filter(day => day.hasData).length;
    const total = days.length;
    const rows = ['calories','protein','fiber','fat','carbohydrates'].map(key => {
      const cfg = statsMetricConfig(key);
      const complete = days.filter(day => day.hasData && day.complete[key]).length;
      return `<div><span>${cfg.label}</span><strong>${complete} von ${total} Tagen vollständig</strong></div>`;
    }).join('');
    return `<details class="stats-data-basis"><summary>Datenbasis · Ernährung an ${tracked} von ${total} Tagen erfasst</summary><div class="stats-data-grid">${rows}</div></details>`;
  }

  function statsDayEnd(dateISO) {
    const [y, m, d] = dateISO.split('-').map(Number);
    return new Date(y, m - 1, d + 1, 0, 0, 0, 0);
  }

  function statsDayStart(dateISO) {
    const [y, m, d] = dateISO.split('-').map(Number);
    return new Date(y, m - 1, d, 0, 0, 0, 0);
  }

  function statsDurationCompact(minutes) {
    const whole = Math.max(0, Math.round(Number(minutes) || 0));
    const h = Math.floor(whole / 60);
    const m = whole % 60;
    if (h && m) return `${h}:${String(m).padStart(2, '0')} h`;
    if (h) return `${h} h`;
    return `${m} min`;
  }

  function statsPlanActiveOnDay(dateISO, now = new Date()) {
    const dayStart = statsDayStart(dateISO);
    const dayEnd = statsDayEnd(dateISO);
    if (dayStart.getTime() > now.getTime()) return false;
    return state.fastPlans.some(plan => {
      const activeFrom = new Date(plan.activeFrom);
      return !Number.isNaN(activeFrom.getTime()) && activeFrom.getTime() < dayEnd.getTime() && activeFrom.getTime() <= now.getTime();
    });
  }

  function statsFastingData(range = statsPeriodRange()) {
    const now = new Date();
    synchronizeFastingSessions(now);
    const dates = statsDatesBetween(range.start, range.end);
    const sessions = state.fastingSessions
      .filter(session => !session.deleted)
      .filter(session => {
        const start = new Date(session.startAt);
        if (Number.isNaN(start.getTime()) || start.getTime() > now.getTime()) return false;
        if (session.endAt && new Date(session.endAt).getTime() > now.getTime()) return false;
        return true;
      });
    const dayMap = new Map(fastingHistoryDays(sessions, now).map(day => [day.key, day]));
    const days = dates.map(date => {
      const raw = dayMap.get(date);
      const hasData = statsPlanActiveOnDay(date, now) || Boolean(raw);
      const segments = raw?.segments || [];
      const targets = [...new Set(segments.map(segment => Number(segment.targetMinutes || 0)).filter(value => value > 0))];
      let targetMinutes = targets.length === 1 ? targets[0] : null;
      if (!targetMinutes && targets.length === 0 && hasData) {
        const at = new Date(Math.min(statsDayEnd(date).getTime() - 1, now.getTime()));
        const plan = planEffectiveAt(at);
        if (plan) targetMinutes = Number(plan.fastingMinutes || 0) || null;
      }
      return {
        date,
        hasData,
        segments,
        totalMinutes: raw?.totalMinutes || 0,
        targetMinutes,
        variedTargets: targets.length > 1,
        running: segments.some(segment => segment.running)
      };
    });

    const rangeStart = statsDayStart(range.start);
    const rangeEnd = statsDayEnd(range.end);
    const touchingSessions = sessions.filter(session => {
      const start = new Date(session.startAt);
      const end = new Date(session.endAt || now);
      return start.getTime() < rangeEnd.getTime() && end.getTime() > rangeStart.getTime();
    }).sort((a, b) => new Date(b.startAt) - new Date(a.startAt));
    const completedSessions = touchingSessions.filter(session => session.endAt);
    const runningSessions = touchingSessions.filter(session => !session.endAt);
    return { range, days, completedSessions, runningSessions, now };
  }

  function statsEligibleFastingDays(days) {
    const today = todayISO();
    return days.filter(day => day.hasData && (state.statsIncludeToday || day.date !== today));
  }

  function statsAverageFastingDay(days) {
    const eligible = statsEligibleFastingDays(days);
    if (!eligible.length) return { value: null, count: 0 };
    return { value: eligible.reduce((sum, day) => sum + day.totalMinutes, 0) / eligible.length, count: eligible.length };
  }

  function statsEligibleCompletedSessions(data) {
    if (state.statsIncludeToday) return data.completedSessions;
    const today = todayISO();
    return data.completedSessions.filter(session => localDayKey(new Date(session.endAt)) !== today);
  }

  function statsFastingSessionMetrics(data) {
    const sessions = statsEligibleCompletedSessions(data);
    const durations = sessions.map(fastingDurationMinutes).filter(value => value > 0);
    if (!durations.length) return { count: 0, average: null, longest: null, shortest: null };
    return {
      count: durations.length,
      average: durations.reduce((sum, value) => sum + value, 0) / durations.length,
      longest: Math.max(...durations),
      shortest: Math.min(...durations)
    };
  }

  function statsFastingAverageCard(data) {
    const avg = statsAverageFastingDay(data.days);
    const tracked = data.days.filter(day => day.hasData).length;
    return `<article class="stats-kpi-card fasting"><span class="stats-kpi-icon-wrap"><span class="stats-kpi-icon">${icon('moon')}</span></span><div><small>Ø Fastenzeit pro Tag</small><strong>${avg.value == null ? '–' : durationText(Math.round(avg.value))}</strong><span>${avg.count} ${avg.count === 1 ? 'geeigneter Tag' : 'geeignete Tage'} · ${tracked} Fastentage</span></div></article>`;
  }

  function statsOverview(days, fastingData, rhythmData, nutritionData) {
    const first = statsRhythmAverage(rhythmData.days, 'firstMinutes');
    const last = statsRhythmAverage(rhythmData.days, 'lastMinutes');
    const windowAvg = statsRhythmAverage(rhythmData.days, 'windowMinutes');
    return `<section class="stats-overview">
      <div class="stats-kpi-grid stats-kpi-grid-four">
        ${statsAverageCard('calories', days)}
        ${statsAverageCard('protein', days)}
        ${statsAverageCard('fiber', days)}
        ${statsFastingAverageCard(fastingData)}
      </div>
      <div class="stats-kpi-grid stats-rhythm-overview-grid">
        ${statsRhythmCard('Ø erste Mahlzeit', statsClockAverageText(first.value), `${first.count} geeignete Tage`, 'sun', 'rhythm-first')}
        ${statsRhythmCard('Ø letzte Mahlzeit', statsClockAverageText(last.value), `${last.count} geeignete Tage`, 'moon', 'rhythm-last')}
        ${statsRhythmCard('Ø Essensfenster', windowAvg.value == null ? '–' : durationText(Math.round(windowAvg.value)), `${windowAvg.count} berechenbare Tage`, 'clock', 'rhythm-window')}
      </div>
      ${statsComparisonView(nutritionData, fastingData, rhythmData)}
      ${statsDataBasis(days)}
    </section>`;
  }

  function statsNutritionView(days) {
    return `<section class="stats-nutrition-view">
      <div class="stats-kpi-grid stats-kpi-grid-five">
        ${statsAverageCard('calories', days)}
        ${statsAverageCard('protein', days)}
        ${statsAverageCard('fiber', days)}
        ${statsAverageCard('fat', days)}
        ${statsAverageCard('carbohydrates', days)}
      </div>
      ${statsNutrientChart('calories', days)}
      ${statsNutrientChart('protein', days)}
      ${statsNutrientChart('fiber', days)}
      <details class="stats-more-charts"><summary>Weitere Nährwerte</summary>
        ${statsNutrientChart('fat', days)}
        ${statsNutrientChart('carbohydrates', days)}
      </details>
      ${statsDataBasis(days)}
    </section>`;
  }

  function statsFastingChart(data) {
    const days = data.days;
    const maxMinutes = 1440;
    return `<section class="stats-chart-card stats-fasting-chart-card">
      <div class="stats-chart-head"><div><small>Kalendertage</small><h3>Fastenzeit pro Tag</h3></div><span class="stats-target-note">0–24 h</span></div>
      <div class="stats-bar-chart fasting ${days.length > 14 ? 'dense' : ''}" role="img" aria-label="Fastenzeit pro Kalendertag">
        ${days.map(day => {
          const pct = day.hasData ? Math.min(100, Math.max(day.totalMinutes > 0 ? 2 : 0, day.totalMinutes / maxMinutes * 100)) : 0;
          const targetPct = day.targetMinutes ? Math.min(100, day.targetMinutes / maxMinutes * 100) : null;
          const title = day.hasData
            ? `${statsDayLabel(day.date)}: ${durationText(Math.round(day.totalMinutes))}${day.running ? ' · läuft' : ''}${day.targetMinutes ? ` · Ziel ${durationText(day.targetMinutes)}` : day.variedTargets ? ' · verschiedene Ziele' : ''}`
            : `${statsDayLabel(day.date)}: keine Fastendaten`;
          return `<button class="stats-bar-cell ${day.hasData ? '' : 'no-data'} ${day.running ? 'running' : ''}" data-stats-fast-day="${day.date}" ${day.hasData ? '' : 'disabled'} title="${esc(title)}">
            <span class="stats-bar-value">${day.hasData ? `${statsDurationCompact(day.totalMinutes)}${day.running ? '•' : ''}` : '–'}</span>
            <span class="stats-bar-track">${targetPct != null ? `<i class="stats-target-line fasting-target" style="bottom:${targetPct.toFixed(2)}%"></i>` : ''}<span class="stats-bar-fill" style="height:${pct.toFixed(2)}%"></span></span>
            <span class="stats-bar-label">${statsDayLabel(day.date, true)}</span>
          </button>`;
        }).join('')}
      </div>
      <p class="stats-chart-help">Die kleine Referenzmarke zeigt das damalige Fastenziel. • kennzeichnet eine aktuell laufende Fastenzeit. Tage vor Einrichtung des Fastenplans erscheinen als keine Daten.</p>
    </section>`;
  }

  function statsFastingSessionCard(session, now = new Date()) {
    const start = new Date(session.startAt);
    const end = session.endAt ? new Date(session.endAt) : now;
    const minutes = Math.max(0, (end - start) / 60000);
    const startLabel = new Intl.DateTimeFormat('de-DE', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' }).format(start);
    const endLabel = session.endAt
      ? new Intl.DateTimeFormat('de-DE', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' }).format(end)
      : 'läuft';
    return `<article class="stats-fast-session ${session.endAt ? '' : 'running'}">
      <span class="stats-fast-session-icon">${icon('moon')}</span>
      <div class="stats-fast-session-main"><strong>${esc(startLabel)} → ${esc(endLabel)}</strong><small>${session.endAt ? 'Zusammenhängende Fastenphase' : 'Aktuell laufende Fastenphase'}</small></div>
      <div class="stats-fast-session-values"><strong>${durationText(Math.round(minutes))}</strong><small>Ziel ${session.targetMinutes ? durationText(session.targetMinutes) : '–'}</small></div>
    </article>`;
  }

  function statsFastingDataBasis(data) {
    const withData = data.days.filter(day => day.hasData).length;
    const total = data.days.length;
    const completed = data.completedSessions.length;
    return `<details class="stats-data-basis"><summary>Datenbasis · Fastendaten an ${withData} von ${total} Tagen</summary><div class="stats-data-grid">
      <div><span>Kalendertage mit Fastenplan/-daten</span><strong>${withData} von ${total}</strong></div>
      <div><span>Abgeschlossene Fastenphasen im Zeitraum</span><strong>${completed}</strong></div>
      <div><span>Laufende Fastenphase</span><strong>${data.runningSessions.length ? 'ja · nur bis jetzt gerechnet' : 'nein'}</strong></div>
      <div><span>Durchschnitt heute</span><strong>${state.statsIncludeToday ? 'einbezogen' : 'ausgeschlossen'}</strong></div>
    </div></details>`;
  }

  function statsFastingView(data) {
    if (!state.fastPlans.length) {
      return `<section class="stats-coming-large"><div>${icon('moon')}</div><h2>Noch kein Fastenplan</h2><p>Richte zuerst im Bereich „Fasten“ einen Plan ein. Danach kann Mampfo deine Fastenzeiten über Tage und Phasen auswerten.</p><button class="primary-button stats-open-fasting" id="stats-open-fasting">Fasten einrichten</button></section>`;
    }
    const daily = statsAverageFastingDay(data.days);
    const phases = statsFastingSessionMetrics(data);
    const sessionList = [...data.runningSessions, ...data.completedSessions].sort((a, b) => new Date(b.startAt) - new Date(a.startAt));
    return `<section class="stats-fasting-view">
      <div class="stats-kpi-grid stats-fast-kpi-grid">
        <article class="stats-kpi-card fasting"><span class="stats-kpi-icon-wrap"><span class="stats-kpi-icon">${icon('moon')}</span></span><div><small>Ø Fastenzeit pro Tag</small><strong>${daily.value == null ? '–' : durationText(Math.round(daily.value))}</strong><span>${daily.count} ${daily.count === 1 ? 'Kalendertag' : 'Kalendertage'}</span></div></article>
        <article class="stats-kpi-card fasting-phase"><span class="stats-kpi-icon-wrap"><span class="stats-kpi-icon">${icon('clock')}</span></span><div><small>Ø Fastenphase</small><strong>${phases.average == null ? '–' : durationText(Math.round(phases.average))}</strong><span>${phases.count} abgeschlossene ${phases.count === 1 ? 'Phase' : 'Phasen'}</span></div></article>
        <article class="stats-kpi-card fasting-long"><span class="stats-kpi-icon-wrap"><span class="stats-kpi-icon">↗</span></span><div><small>Längste Phase</small><strong>${phases.longest == null ? '–' : durationText(Math.round(phases.longest))}</strong><span>zusammenhängend</span></div></article>
        <article class="stats-kpi-card fasting-short"><span class="stats-kpi-icon-wrap"><span class="stats-kpi-icon">↘</span></span><div><small>Kürzeste Phase</small><strong>${phases.shortest == null ? '–' : durationText(Math.round(phases.shortest))}</strong><span>zusammenhängend</span></div></article>
      </div>
      ${statsFastingChart(data)}
      <section class="stats-fast-sessions-card">
        <div class="stats-chart-head"><div><small>Zusammenhängende Sessions</small><h3>Fastenphasen</h3></div><span class="stats-target-note">${phases.count} abgeschlossen</span></div>
        ${sessionList.length ? `<div class="stats-fast-session-list">${sessionList.map(session => statsFastingSessionCard(session, data.now)).join('')}</div>` : `<div class="stats-fast-empty">Noch keine Fastenphasen im gewählten Zeitraum.</div>`}
      </section>
      ${statsFastingDataBasis(data)}
    </section>`;
  }

  function statsRangeDayCount(range) {
    return statsDatesBetween(range.start, range.end).length;
  }

  function statsPreviousRange(range) {
    const [sy, sm, sd] = range.start.split('-').map(Number);
    if (state.statsPeriod === 'month' || state.statsPeriod === 'prevMonth') {
      const startDate = new Date(sy, sm - 2, 1);
      const endDate = new Date(sy, sm - 1, 0);
      return { start: statsDateISO(startDate), end: statsDateISO(endDate), label: 'Vorheriger Monat' };
    }
    const count = Math.max(1, statsRangeDayCount(range));
    return { start: offsetDate(range.start, -count), end: offsetDate(range.start, -1), label: `Vorherige ${count} Tage` };
  }

  function statsNutritionForRange(range) {
    return { range, days: statsDatesBetween(range.start, range.end).map(statsNutritionDay) };
  }

  function statsRhythmDay(date) {
    const entries = dailyEntries(date);
    if (!entries.length) return { date, entries, hasData: false, firstMinutes: null, lastMinutes: null, windowMinutes: null };
    const times = entries.map(entry => parseClockMinutes(entry.time)).filter(value => value != null).sort((a,b) => a-b);
    if (!times.length) return { date, entries, hasData: false, firstMinutes: null, lastMinutes: null, windowMinutes: null };
    const firstMinutes = times[0];
    const lastMinutes = times[times.length - 1];
    return { date, entries, hasData: true, firstMinutes, lastMinutes, windowMinutes: times.length >= 2 ? Math.max(0, lastMinutes - firstMinutes) : null };
  }

  function statsRhythmData(range = statsPeriodRange()) {
    return { range, days: statsDatesBetween(range.start, range.end).map(statsRhythmDay) };
  }

  function statsEligibleRhythmDays(days, key) {
    const today = todayISO();
    return days.filter(day => day.hasData && day[key] != null && (state.statsIncludeToday || day.date !== today));
  }

  function statsRhythmAverage(days, key) {
    const eligible = statsEligibleRhythmDays(days, key);
    if (!eligible.length) return { value: null, count: 0 };
    return { value: eligible.reduce((sum, day) => sum + Number(day[key]), 0) / eligible.length, count: eligible.length };
  }

  function statsClockAverageText(value) {
    return value == null ? '–' : clockFromMinutes(Math.round(value));
  }

  function statsRhythmCard(label, value, sub, iconName, cls='rhythm') {
    return `<article class="stats-kpi-card ${cls}"><span class="stats-kpi-icon-wrap"><span class="stats-kpi-icon">${icon(iconName)}</span></span><div><small>${esc(label)}</small><strong>${esc(value)}</strong><span>${esc(sub)}</span></div></article>`;
  }

  function statsPlanEatingInfoForDay(date) {
    const probe = statsDayStart(date); probe.setHours(12,0,0,0);
    const plan = planEffectiveAt(probe);
    if (!plan) return null;
    const windows = planWindows(plan);
    if (!windows) return null;
    const start = parseClockMinutes(windows.eatingStart);
    const end = parseClockMinutes(windows.eatingEnd);
    return { start, end, label: `${windows.eatingStart}–${windows.eatingEnd}` };
  }

  function statsTimeInsideWindow(minutes, planInfo) {
    if (!planInfo || minutes == null) return null;
    const { start, end } = planInfo;
    if (start == null || end == null) return null;
    if (start <= end) return minutes >= start && minutes <= end;
    return minutes >= start || minutes <= end;
  }

  function statsRhythmTimeline(days, fastingData) {
    const fastingByDate = new Map((fastingData?.days || []).map(day => [day.date, day]));
    const rows = days.filter(day => day.hasData);
    if (!rows.length) return `<section class="stats-coming-large"><div>${icon('clock')}</div><h2>Noch keine Essenszeiten</h2><p>Für den gewählten Zeitraum gibt es keine Ernährungseinträge, aus denen ein Tagesrhythmus berechnet werden kann.</p></section>`;
    return `<section class="stats-rhythm-card"><div class="stats-chart-head"><div><small>Tatsächliche Zeiten</small><h3>Tagesrhythmus</h3></div><span class="stats-target-note">00–24 Uhr</span></div>
      <div class="stats-rhythm-list">${rows.map(day => {
        const firstPct = day.firstMinutes / 1440 * 100;
        const lastPct = day.lastMinutes / 1440 * 100;
        const widthPct = Math.max(0.8, lastPct - firstPct);
        const planInfo = statsPlanEatingInfoForDay(day.date);
        const outside = planInfo && (!statsTimeInsideWindow(day.firstMinutes, planInfo) || !statsTimeInsideWindow(day.lastMinutes, planInfo));
        const fastDay = fastingByDate.get(day.date);
        return `<button class="stats-rhythm-row" data-stats-rhythm-day="${day.date}">
          <span class="stats-rhythm-date"><strong>${statsDayLabel(day.date, true)}</strong><small>${day.entries.length} ${day.entries.length === 1 ? 'Eintrag' : 'Einträge'}</small></span>
          <span class="stats-rhythm-track"><i class="stats-rhythm-window" style="left:${firstPct.toFixed(2)}%;width:${widthPct.toFixed(2)}%"></i><i class="stats-rhythm-dot first" style="left:${firstPct.toFixed(2)}%"></i><i class="stats-rhythm-dot last" style="left:${lastPct.toFixed(2)}%"></i></span>
          <span class="stats-rhythm-values"><strong>${clockFromMinutes(day.firstMinutes)}–${clockFromMinutes(day.lastMinutes)}</strong><small>${day.windowMinutes == null ? 'Essensfenster offen' : durationText(day.windowMinutes)}${fastDay?.hasData ? ` · ${durationText(Math.round(fastDay.totalMinutes))} Fasten` : ''}${outside ? ' · außerhalb Planfenster' : ''}</small></span>
        </button>`;
      }).join('')}</div>
      <div class="stats-rhythm-axis"><span>00</span><span>06</span><span>12</span><span>18</span><span>24</span></div>
      <p class="stats-chart-help">Die Linie verbindet erste und letzte erfasste Mahlzeit des Tages. Ein einzelner Eintrag liefert noch kein Essensfenster.</p>
    </section>`;
  }

  function statsRhythmView(data, fastingData) {
    const first = statsRhythmAverage(data.days, 'firstMinutes');
    const last = statsRhythmAverage(data.days, 'lastMinutes');
    const windowAvg = statsRhythmAverage(data.days, 'windowMinutes');
    const tracked = data.days.filter(day => day.hasData).length;
    const windows = data.days.filter(day => day.windowMinutes != null).length;
    return `<section class="stats-rhythm-view">
      <div class="stats-kpi-grid stats-rhythm-kpi-grid">
        ${statsRhythmCard('Ø erste Mahlzeit', statsClockAverageText(first.value), `${first.count} ${first.count === 1 ? 'geeigneter Tag' : 'geeignete Tage'}`, 'sun', 'rhythm-first')}
        ${statsRhythmCard('Ø letzte Mahlzeit', statsClockAverageText(last.value), `${last.count} ${last.count === 1 ? 'geeigneter Tag' : 'geeignete Tage'}`, 'moon', 'rhythm-last')}
        ${statsRhythmCard('Ø Essensfenster', windowAvg.value == null ? '–' : durationText(Math.round(windowAvg.value)), `${windowAvg.count} ${windowAvg.count === 1 ? 'berechenbarer Tag' : 'berechenbare Tage'}`, 'clock', 'rhythm-window')}
      </div>
      ${statsRhythmTimeline(data.days, fastingData)}
      <details class="stats-data-basis"><summary>Datenbasis · Essenszeiten an ${tracked} von ${data.days.length} Tagen</summary><div class="stats-data-grid"><div><span>Tage mit Ernährungseinträgen</span><strong>${tracked} von ${data.days.length}</strong></div><div><span>Tage mit berechenbarem Essensfenster</span><strong>${windows} von ${data.days.length}</strong></div><div><span>Durchschnitt heute</span><strong>${state.statsIncludeToday ? 'einbezogen' : 'ausgeschlossen'}</strong></div></div></details>
    </section>`;
  }

  function statsSigned(value, digits=0, unit='') {
    if (value == null || !Number.isFinite(value)) return '–';
    const rounded = cleanNumber(value, digits);
    const prefix = rounded > 0 ? '+' : '';
    return `${prefix}${fmt(rounded, digits)}${unit ? ` ${unit}` : ''}`;
  }

  function statsTimeDeltaText(minutes) {
    if (minutes == null || !Number.isFinite(minutes)) return '–';
    const rounded = Math.round(minutes);
    if (!rounded) return '±0 min';
    return `${rounded > 0 ? '+' : '−'}${Math.abs(rounded)} min ${rounded > 0 ? 'später' : 'früher'}`;
  }

  function statsComparisonView(currentNutrition, currentFasting, currentRhythm) {
    const previousRange = statsPreviousRange(currentNutrition.range);
    const prevNutrition = statsNutritionForRange(previousRange);
    const prevFasting = statsFastingData(previousRange);
    const prevRhythm = statsRhythmData(previousRange);
    const cCal = statsAverage(currentNutrition.days, 'calories').value;
    const pCal = statsAverage(prevNutrition.days, 'calories').value;
    const cPro = statsAverage(currentNutrition.days, 'protein').value;
    const pPro = statsAverage(prevNutrition.days, 'protein').value;
    const cFast = statsAverageFastingDay(currentFasting.days).value;
    const pFast = statsAverageFastingDay(prevFasting.days).value;
    const cFirst = statsRhythmAverage(currentRhythm.days, 'firstMinutes').value;
    const pFirst = statsRhythmAverage(prevRhythm.days, 'firstMinutes').value;
    const cWindow = statsRhythmAverage(currentRhythm.days, 'windowMinutes').value;
    const pWindow = statsRhythmAverage(prevRhythm.days, 'windowMinutes').value;
    const row = (label, current, previous, delta) => `<div><span>${esc(label)}</span><strong>${esc(current)}</strong><small>${esc(delta)} · vorher ${esc(previous)}</small></div>`;
    return `<section class="stats-comparison-card"><div class="stats-chart-head"><div><small>Neutraler Vergleich</small><h3>Vorheriger Zeitraum</h3></div><span class="stats-target-note">${esc(previousRange.label)}</span></div><div class="stats-comparison-grid">
      ${row('Kalorien', cCal == null ? '–' : `${fmt(cCal,0)} kcal`, pCal == null ? '–' : `${fmt(pCal,0)} kcal`, cCal == null || pCal == null ? '–' : statsSigned(cCal-pCal,0,'kcal'))}
      ${row('Protein', cPro == null ? '–' : `${fmt(cPro,1)} g`, pPro == null ? '–' : `${fmt(pPro,1)} g`, cPro == null || pPro == null ? '–' : statsSigned(cPro-pPro,1,'g'))}
      ${row('Fastenzeit', cFast == null ? '–' : durationText(Math.round(cFast)), pFast == null ? '–' : durationText(Math.round(pFast)), cFast == null || pFast == null ? '–' : statsSigned(Math.round(cFast-pFast),0,'min'))}
      ${row('Erste Mahlzeit', statsClockAverageText(cFirst), statsClockAverageText(pFirst), cFirst == null || pFirst == null ? '–' : statsTimeDeltaText(cFirst-pFirst))}
      ${row('Essensfenster', cWindow == null ? '–' : durationText(Math.round(cWindow)), pWindow == null ? '–' : durationText(Math.round(pWindow)), cWindow == null || pWindow == null ? '–' : statsSigned(Math.round(cWindow-pWindow),0,'min'))}
    </div><p class="stats-chart-help">Die Veränderungen werden nur beschrieben und nicht bewertet.</p></section>`;
  }

  function renderStats() {
    const nutrition = statsNutritionData();
    const fasting = statsFastingData(nutrition.range);
    const rhythm = statsRhythmData(nutrition.range);
    app.innerHTML = `<main class="page stats-page">
      <header class="topbar"><div><div class="brand-kicker">${esc(CFG.appName)}</div><h1>Auswertung</h1></div><button class="icon-button" data-nav="settings" aria-label="Einstellungen">${icon('settings')}</button></header>
      ${statsTabBar()}
      ${statsPeriodControls(nutrition.range)}
      <div class="stats-content">
        ${state.statsTab === 'overview' ? statsOverview(nutrition.days, fasting, rhythm, nutrition) : state.statsTab === 'nutrition' ? statsNutritionView(nutrition.days) : state.statsTab === 'fasting' ? statsFastingView(fasting) : statsRhythmView(rhythm, fasting)}
      </div>
    </main>${bottomNav('stats')}`;
    bindStats();
  }

  function bindStats() {
    document.querySelectorAll('[data-stats-tab]').forEach(btn => btn.onclick = () => { state.statsTab = btn.dataset.statsTab; render(); });
    document.querySelectorAll('[data-stats-period]').forEach(btn => btn.onclick = () => {
      state.statsPeriod = btn.dataset.statsPeriod;
      if (state.statsPeriod !== 'custom') state.statsIncludeToday = false;
      render();
    });
    document.getElementById('stats-include-today')?.addEventListener('change', e => { state.statsIncludeToday = e.target.checked; render(); });
    document.getElementById('stats-apply-custom')?.addEventListener('click', () => {
      const start = document.getElementById('stats-custom-start')?.value;
      const end = document.getElementById('stats-custom-end')?.value;
      if (!start || !end) return showToast('Bitte Start- und Enddatum wählen.');
      if (start > todayISO()) return showToast('Der Zeitraum darf nicht vollständig in der Zukunft liegen.');
      state.statsCustomStart = start;
      state.statsCustomEnd = end > todayISO() ? todayISO() : end;
      render();
    });
    document.querySelectorAll('[data-stats-day]').forEach(btn => btn.onclick = () => showStatsDayDetail(btn.dataset.statsDay));
    document.querySelectorAll('[data-stats-fast-day]').forEach(btn => btn.onclick = () => showStatsFastingDayDetail(btn.dataset.statsFastDay));
    document.querySelectorAll('[data-stats-rhythm-day]').forEach(btn => btn.onclick = () => { state.selectedDate = btn.dataset.statsRhythmDay; setView('today'); });
    document.getElementById('stats-open-fasting')?.addEventListener('click', () => { state.fastingTab = 'plan'; setView('fasting'); });
  }

  function showStatsDayDetail(date) {
    const day = statsNutritionDay(date);
    if (!day.hasData) return;
    const metricRow = key => {
      const cfg = statsMetricConfig(key);
      return `<div><span>${cfg.label}</span><strong>${fmt(day.totals[key], cfg.digits)} ${cfg.unit}${day.complete[key] ? '' : ' ○'}</strong></div>`;
    };
    modalRoot.innerHTML = `<div class="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="stats-day-title"><div class="modal stats-day-modal">
      <h2 id="stats-day-title">${esc(displayDate(date))}</h2>
      <p>${day.entries.length} ${day.entries.length === 1 ? 'Ernährungseintrag' : 'Ernährungseinträge'}${date === todayISO() ? ' · laufender Tag' : ''}</p>
      <div class="stats-day-detail-grid">${['calories','protein','fiber','fat','carbohydrates'].map(metricRow).join('')}</div>
      ${Object.values(day.complete).some(v => !v) ? `<p class="stats-partial-note">○ Mindestens ein Nährwert ist an diesem Tag nur teilweise erfasst.</p>` : ''}
      <div class="modal-actions"><button class="primary-button" id="stats-open-day">Tag öffnen</button><button class="secondary-button" id="stats-close-day">Schließen</button></div>
    </div></div>`;
    document.getElementById('stats-close-day').onclick = () => { modalRoot.innerHTML = ''; };
    document.getElementById('stats-open-day').onclick = () => { modalRoot.innerHTML = ''; state.selectedDate = date; setView('today'); };
  }

  function showStatsFastingDayDetail(date) {
    const data = statsFastingData();
    const day = data.days.find(item => item.date === date);
    if (!day?.hasData) return;
    const segments = day.segments.length
      ? day.segments.map(segment => `<div class="stats-fast-day-segment"><span>${icon('moon')} ${fastingSegmentClock(segment, 'start')} – ${fastingSegmentClock(segment, 'end')}</span><strong>${durationText(Math.round(segment.minutes))}${segment.running ? ' · läuft' : ''}</strong></div>`).join('')
      : `<div class="stats-fast-day-segment"><span>Keine gespeicherte Fastenzeit</span><strong>0 min</strong></div>`;
    const target = day.variedTargets ? 'verschiedene Ziele' : day.targetMinutes ? durationText(day.targetMinutes) : '–';
    modalRoot.innerHTML = `<div class="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="stats-fast-day-title"><div class="modal stats-day-modal">
      <h2 id="stats-fast-day-title">${esc(displayDate(date))}</h2>
      <p>Fastenzeit dieses Kalendertages${date === todayISO() ? ' · laufender Tag' : ''}</p>
      <div class="stats-fast-day-total"><small>Gesamt</small><strong>${durationText(Math.round(day.totalMinutes))}</strong><span>Ziel: ${esc(target)}</span></div>
      <div class="stats-fast-day-segments">${segments}</div>
      <div class="modal-actions"><button class="primary-button" id="stats-open-fast-history">Fastenverlauf öffnen</button><button class="secondary-button" id="stats-close-fast-day">Schließen</button></div>
    </div></div>`;
    document.getElementById('stats-close-fast-day').onclick = () => { modalRoot.innerHTML = ''; };
    document.getElementById('stats-open-fast-history').onclick = () => { modalRoot.innerHTML = ''; state.fastingTab = 'history'; setView('fasting'); };
  }

  function renderPlaceholder(view) {
    const data = {
      stats: ['▥', 'Auswertung', 'Wochen-, Monats- und Fastenauswertungen folgen in einer späteren Version.']
    }[view];
    app.innerHTML = `<main class="page placeholder-page"><div class="placeholder-icon">${data[0]}</div><h1>${data[1]}</h1><p>${data[2]}</p></main>${bottomNav(view)}`;
  }

  function bindCommon() {
    document.querySelectorAll('[data-nav]').forEach(btn => {
      btn.onclick = () => {
        const view = btn.dataset.nav;
        if (view === 'today') state.selectedDate = state.selectedDate || todayISO();
        if (view === 'add') state.addTab = 'input';
        if (view === 'fasting') { state.fastingTab = 'timer'; state.fastingPlanEditing = false; }
        if (view === 'stats' && !state.statsTab) state.statsTab = 'overview';
        setView(view, { editingId: null, editingFoodId: null, editingRecipeId: null, selectedRecipeId: null, selectedSavedFoodId: null, recipeLogOrigin: 'recipes' });
      };
    });
  }

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
  }

  window.setInterval(() => {
    if (!state.onboarded) return;
    if (state.view === 'fasting' && (state.fastingTab === 'timer' || state.fastingTab === 'history')) {
      renderFasting();
      bindCommon();
    } else if (state.view === 'today' && state.selectedDate === todayISO()) {
      updateTodayFastStatus();
    }
  }, 30000);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden || !state.onboarded) return;
    if (state.view === 'fasting' && (state.fastingTab === 'timer' || state.fastingTab === 'history')) {
      renderFasting();
      bindCommon();
    } else if (state.view === 'today' && state.selectedDate === todayISO()) {
      updateTodayFastStatus();
    }
  });

  persist();
  render();
})();
