(() => {
  'use strict';

  const CFG = window.APP_CONFIG || { appName: 'Mampfo', version: '0.3.2' };
  const STORAGE = {
    settings: 'mampfo.settings.v2',
    entries: 'mampfo.entries.v2',
    foods: 'mampfo.savedFoods.v2',
    recipes: 'mampfo.recipes.v3',
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
  }

  function migrateToV3() {
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
      ...recipe
    }));
    localStorage.setItem(STORAGE.entries, JSON.stringify(entries));
    localStorage.setItem(STORAGE.foods, JSON.stringify(foods));
    localStorage.setItem(STORAGE.recipes, JSON.stringify(recipes));
    localStorage.setItem(STORAGE.dataVersion, '3');
  }

  migrateToV3();

  const state = {
    view: 'today',
    addTab: 'input',
    selectedDate: todayISO(),
    editingId: null,
    editingFoodId: null,
    editingRecipeId: null,
    selectedRecipeId: null,
    recipeSearch: '',
    selectedSavedFoodId: null,
    settings: load(STORAGE.settings, { dailyCalories: 1700, dailyProtein: 80 }),
    entries: load(STORAGE.entries, []),
    savedFoods: load(STORAGE.foods, []),
    recipes: load(STORAGE.recipes, []),
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
    ...recipe
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
    localStorage.setItem(STORAGE.onboarded, state.onboarded ? 'yes' : 'no');
    localStorage.setItem(STORAGE.dataVersion, '3');
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
      food: '♜', scale: '↔', drop: '◒', carbs: '◇', target: '◎', rocket: '↗', star: '★', starEmpty: '☆', recent: '◷', search: '⌕', list: '☷', portions: '◫', bowl: '◡', save: '✓'
    };
    return map[name] || '•';
  }

  function showToast(message) {
    toastRoot.innerHTML = `<div class="toast">${esc(message)}</div>`;
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => { toastRoot.innerHTML = ''; }, 1800);
  }

  function setView(view, opts = {}) {
    state.view = view;
    if ('editingId' in opts) state.editingId = opts.editingId;
    if ('editingFoodId' in opts) state.editingFoodId = opts.editingFoodId;
    if ('editingRecipeId' in opts) state.editingRecipeId = opts.editingRecipeId;
    if ('selectedRecipeId' in opts) state.selectedRecipeId = opts.selectedRecipeId;
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
    else if (['fasting', 'stats'].includes(state.view)) renderPlaceholder(state.view);
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
      ${!isToday ? `<button class="today-chip" id="go-today">Heute</button>` : `<span class="today-chip" aria-hidden="true">Heute</span>`}

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
    else renderRecent(target);
  }

  function getSelectedFood() {
    return state.selectedSavedFoodId ? state.savedFoods.find(f => f.id === state.selectedSavedFoodId) : null;
  }

  function renderFoodForm(target = app) {
    const editing = state.editingId ? state.entries.find(e => e.id === state.editingId) : null;
    const selectedFood = !editing ? getSelectedFood() : null;
    const linkedTemplate = editing?.foodId ? state.savedFoods.find(f => f.id === editing.foodId) : null;
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
    const quantityHint = scalableFood
      ? `<p class="input-help scaling-help">Automatische Berechnung auf Basis von ${esc(amountLabel(scalableFood.baseAmount || 1, scalableFood.baseUnit || 'portion'))}. Die Einheit bleibt dabei gleich.</p>`
      : `<p class="input-help">Für eine persönliche Standardportion kannst du „1 Portion“ unverändert lassen.</p>`;

    const formMarkup = `${editing ? `<div class="info-banner">${icon('edit')} <span>Du bearbeitest einen bestehenden Eintrag.</span></div>` : ''}
      ${selectedFood ? `<div class="selected-template"><span>${icon('star')}</span><div><small>Aus gespeicherten Lebensmitteln · ${esc(amountLabel(selectedFood.baseAmount || 1, selectedFood.baseUnit || 'portion'))}</small><strong>${esc(selectedFood.name)}</strong></div><button type="button" id="clear-template" aria-label="Vorlage entfernen">×</button></div>` : ''}
      <form id="food-form" class="form-card">
        ${fieldRow(icon('food'), 'Essen', `<textarea id="name" autocomplete="off" placeholder="z. B. Roggenbrot mit Käse">${esc(initial.name)}</textarea><div id="suggestions" class="suggestions" aria-live="polite"></div><p class="input-help">Ab zwei Zeichen zeigt Mampfo passende gespeicherte Lebensmittel an.</p>`)}
        ${fieldRow(icon('scale'), 'Menge', `<div class="amount-unit-row"><input id="amount" type="text" inputmode="decimal" value="${initial.amount ?? 1}" placeholder="1"><select id="unit" ${scalableFood ? 'disabled' : ''} aria-label="Einheit">${unitOptions}</select></div>${quantityHint}`)}
        ${fieldRow(icon('flame'), 'Kalorien (kcal)', `<input id="calories" type="text" inputmode="decimal" value="${initial.calories ?? ''}" placeholder="0">`)}
        ${fieldRow(icon('protein'), 'Protein (g)', `<input id="protein" type="text" inputmode="decimal" value="${initial.protein ?? ''}" placeholder="optional">`)}
        ${fieldRow(icon('leaf'), 'Ballaststoffe (g)', `<input id="fiber" type="text" inputmode="decimal" value="${initial.fiber ?? ''}" placeholder="optional">`)}
        <details class="extra-nutrients"${extraOpen}>
          <summary>Weitere Nährwerte</summary>
          <div class="extra-nutrient-fields">
            ${fieldRow(icon('drop'), 'Fett (g)', `<input id="fat" type="text" inputmode="decimal" value="${initial.fat ?? ''}" placeholder="optional">`)}
            ${fieldRow(icon('carbs'), 'Kohlenhydrate (g)', `<input id="carbohydrates" type="text" inputmode="decimal" value="${initial.carbohydrates ?? ''}" placeholder="optional">`)}
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

    if (scalableFood) {
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
      input.value = values[key] == null ? '' : String(Math.round(values[key] * 100) / 100).replace('.', ',');
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

  function handleFoodSubmit(event) {
    event.preventDefault();
    const values = formValues();
    const error = validateFoodValues(values);
    if (error) return showToast(error);

    const editing = state.editingId ? state.entries.find(e => e.id === state.editingId) : null;
    const now = new Date().toISOString();

    if (editing) {
      const linkedFood = editing.foodId ? state.savedFoods.find(food => food.id === editing.foodId) : null;
      if (linkedFood && !entryMatchesFood(linkedFood, values)) {
        return promptLinkedEntryEdit(editing, linkedFood, values, now);
      }
      Object.assign(editing, values, { updatedAt: now });
      state.selectedDate = values.date;
      state.editingId = null;
      persist();
      showToast('Änderungen gespeichert.');
      state.view = 'today';
      return window.setTimeout(render, 50);
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

      <div class="settings-note">${icon('rocket')}<br>Rezepte und Portionen sind jetzt aktiv. Zutatenbasierte Rezepte folgen mit v0.3.3; Fasten und Auswertung später.</div>
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
  }

  function renderFoodManager() {
    const sorted = [...state.savedFoods].sort((a, b) => a.name.localeCompare(b.name, 'de'));
    app.innerHTML = `<main class="page">
      <header class="topbar"><button class="icon-button" id="foods-back" aria-label="Zurück">${icon('back')}</button><h1>Lebensmittel</h1><span style="width:44px"></span></header>
      <div class="manager-search"><span>${icon('search')}</span><input id="food-manager-search" type="search" placeholder="Lebensmittel suchen" autocomplete="off"></div>
      <div class="manager-caption">${state.savedFoods.length === 1 ? '<strong>1</strong> gespeichertes Lebensmittel' : `<strong>${state.savedFoods.length}</strong> gespeicherte Lebensmittel`}</div>
      <section id="manager-list" class="manager-list">${managerFoodList(sorted)}</section>
    </main>${bottomNav('')}`;
    document.getElementById('foods-back').onclick = () => setView('settings');
    document.getElementById('food-manager-search').addEventListener('input', event => {
      const needle = normalizeName(event.target.value);
      const foods = sorted.filter(food => normalizeName(food.name).includes(needle));
      document.getElementById('manager-list').innerHTML = managerFoodList(foods);
      bindManagerCards();
    });
    bindManagerCards();
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

  function bindManagerCards() {
    document.querySelectorAll('[data-edit-food]').forEach(btn => {
      btn.onclick = () => setView('foodEdit', { editingFoodId: btn.dataset.editFood });
    });
    document.querySelectorAll('[data-manager-favorite]').forEach(btn => {
      btn.onclick = () => toggleFavorite(btn.dataset.managerFavorite);
    });
  }

  function renderFoodEdit() {
    const food = state.savedFoods.find(f => f.id === state.editingFoodId);
    if (!food) return setView('foods', { editingFoodId: null });
    const unitOptions = ['portion', 'g', 'ml', 'piece'].map(unit => `<option value="${unit}" ${food.baseUnit === unit ? 'selected' : ''}>${unitLabel(unit, 2)}</option>`).join('');
    const extraOpen = food.fat != null || food.carbohydrates != null ? ' open' : '';

    app.innerHTML = `<main class="page">
      <header class="topbar"><button class="icon-button" id="food-edit-back" aria-label="Zurück">${icon('back')}</button><h1>Lebensmittel bearbeiten</h1><span style="width:44px"></span></header>
      <div class="info-banner">${icon('star')} <span>Die Nährwerte beziehen sich auf die angegebene Bezugsmenge. Änderungen gelten nur für zukünftige Einträge.</span></div>
      <form id="saved-food-form" class="form-card">
        ${fieldRow(icon('food'), 'Name', `<input id="saved-name" type="text" value="${esc(food.name)}" autocomplete="off">`)}
        ${fieldRow(icon('scale'), 'Bezugsmenge', `<div class="amount-unit-row"><input id="saved-base-amount" type="text" inputmode="decimal" value="${food.baseAmount ?? 1}"><select id="saved-base-unit">${unitOptions}</select></div><p class="input-help">Beispiel: 100 g, 250 ml, 1 Stück oder 1 Portion.</p>`)}
        ${fieldRow(icon('flame'), 'Kalorien (kcal)', `<input id="saved-calories" type="text" inputmode="decimal" value="${food.calories ?? ''}">`)}
        ${fieldRow(icon('protein'), 'Protein (g)', `<input id="saved-protein" type="text" inputmode="decimal" value="${food.protein ?? ''}" placeholder="optional">`)}
        ${fieldRow(icon('leaf'), 'Ballaststoffe (g)', `<input id="saved-fiber" type="text" inputmode="decimal" value="${food.fiber ?? ''}" placeholder="optional">`)}
        <details class="extra-nutrients"${extraOpen}>
          <summary>Weitere Nährwerte</summary>
          <div class="extra-nutrient-fields">
            ${fieldRow(icon('drop'), 'Fett (g)', `<input id="saved-fat" type="text" inputmode="decimal" value="${food.fat ?? ''}" placeholder="optional">`)}
            ${fieldRow(icon('carbs'), 'Kohlenhydrate (g)', `<input id="saved-carbohydrates" type="text" inputmode="decimal" value="${food.carbohydrates ?? ''}" placeholder="optional">`)}
          </div>
        </details>
        <button type="button" class="favorite-toggle ${food.favorite ? 'active' : ''}" id="food-favorite-toggle">${food.favorite ? icon('star') : icon('starEmpty')} <span>${food.favorite ? 'Favorit' : 'Als Favorit markieren'}</span></button>
        <div class="form-actions">
          <button class="primary-button" type="submit">Änderungen speichern</button>
          <button class="danger-button" type="button" id="delete-saved-food">${icon('trash')} Lebensmittel löschen</button>
        </div>
      </form>
    </main>${bottomNav('')}`;

    document.getElementById('food-edit-back').onclick = () => setView('foods', { editingFoodId: null });
    document.getElementById('food-favorite-toggle').onclick = event => {
      food.favorite = !food.favorite;
      food.updatedAt = new Date().toISOString();
      persist();
      event.currentTarget.classList.toggle('active', food.favorite);
      event.currentTarget.innerHTML = `${food.favorite ? icon('star') : icon('starEmpty')} <span>${food.favorite ? 'Favorit' : 'Als Favorit markieren'}</span>`;
      showToast(food.favorite ? 'Zu Favoriten hinzugefügt.' : 'Aus Favoriten entfernt.');
    };
    document.getElementById('saved-food-form').addEventListener('submit', e => {
      e.preventDefault();
      const values = {
        name: document.getElementById('saved-name').value.trim(),
        baseAmount: parseNum(document.getElementById('saved-base-amount').value),
        baseUnit: document.getElementById('saved-base-unit').value,
        calories: parseNum(document.getElementById('saved-calories').value),
        protein: parseNum(document.getElementById('saved-protein').value),
        fiber: parseNum(document.getElementById('saved-fiber').value),
        fat: parseNum(document.getElementById('saved-fat').value),
        carbohydrates: parseNum(document.getElementById('saved-carbohydrates').value)
      };
      if (!values.name) return showToast('Bitte einen Namen eingeben.');
      if (values.baseAmount == null || values.baseAmount <= 0) return showToast('Bitte eine gültige Bezugsmenge eingeben.');
      if (!['portion', 'g', 'ml', 'piece'].includes(values.baseUnit)) return showToast('Bitte eine gültige Einheit auswählen.');
      if (values.calories == null || values.calories < 0) return showToast('Bitte gültige Kalorien eingeben.');
      if ([values.protein, values.fiber, values.fat, values.carbohydrates].some(value => value != null && value < 0)) return showToast('Nährwerte dürfen nicht negativ sein.');
      const duplicate = state.savedFoods.find(f => f.id !== food.id && normalizeName(f.name) === normalizeName(values.name));
      if (duplicate) return showToast('Ein Lebensmittel mit diesem Namen ist bereits gespeichert.');
      Object.assign(food, values, { updatedAt: new Date().toISOString() });
      persist();
      showToast('Lebensmittel gespeichert.');
      setView('foods', { editingFoodId: null });
    });
    document.getElementById('delete-saved-food').onclick = () => confirmDeleteSavedFood(food);
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
      state.view = 'foods';
      showToast('Lebensmittel gelöscht.');
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

  function renderRecipes() {
    const needle = normalizeName(state.recipeSearch);
    const recipes = [...state.recipes]
      .filter(recipe => !needle || normalizeName(recipe.name).includes(needle))
      .sort((a, b) => a.name.localeCompare(b.name, 'de'));

    app.innerHTML = `<main class="page">
      <header class="topbar"><div><div class="brand-kicker">${esc(CFG.appName)}</div><h1>Rezepte</h1></div><button class="icon-button" data-nav="settings" aria-label="Einstellungen">${icon('settings')}</button></header>
      <div class="recipe-toolbar">
        <div class="manager-search"><span>${icon('search')}</span><input id="recipe-search" type="search" placeholder="Rezept suchen" autocomplete="off" value="${esc(state.recipeSearch)}"></div>
        <button class="primary-button recipe-new-button" id="new-recipe">${icon('plus')} Neues Rezept</button>
      </div>
      <div class="manager-caption">${state.recipes.length === 1 ? '<strong>1</strong> Rezept' : `<strong>${state.recipes.length}</strong> Rezepte`}</div>
      <section id="recipe-list" class="recipe-grid">${recipeListMarkup(recipes)}</section>
    </main>${bottomNav('recipes')}`;

    document.getElementById('new-recipe').onclick = () => setView('recipeEdit', { editingRecipeId: 'new' });
    document.getElementById('recipe-search').addEventListener('input', event => {
      state.recipeSearch = event.target.value;
      const q = normalizeName(state.recipeSearch);
      const filtered = [...state.recipes].filter(recipe => !q || normalizeName(recipe.name).includes(q)).sort((a, b) => a.name.localeCompare(b.name, 'de'));
      document.getElementById('recipe-list').innerHTML = recipeListMarkup(filtered);
      bindRecipeCards();
    });
    bindRecipeCards();
  }

  function recipeListMarkup(recipes) {
    if (!state.recipes.length) {
      return `<div class="recipe-empty"><div class="recipe-empty-icon">${icon('recipe')}</div><h2>Noch keine Rezepte</h2><p>Speichere deine eigenen Gerichte und füge sie später mit wenigen Klicks deinem Ernährungstagebuch hinzu.</p><button class="secondary-button" id="first-recipe">${icon('plus')} Erstes Rezept erstellen</button></div>`;
    }
    if (!recipes.length) return `<div class="mini-empty compact"><div class="mini-empty-icon">${icon('search')}</div><h3>Keine Treffer</h3><p>Für diese Suche wurde kein Rezept gefunden.</p></div>`;
    return recipes.map(recipe => {
      const per = recipePerPortion(recipe);
      return `<article class="recipe-card">
        <button class="recipe-card-main" data-recipe-id="${esc(recipe.id)}">
          <span class="recipe-card-icon">${icon('bowl')}</span>
          <span class="recipe-card-copy"><strong>${esc(recipe.name)}</strong><small>${recipeNutrientLine(per)}</small><span>${fmt(recipe.servings)} ${Number(recipe.servings) === 1 ? 'Portion' : 'Portionen'} · Werte pro Portion</span></span>
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

  function renderRecipeEdit() {
    const isNew = state.editingRecipeId === 'new' || !state.editingRecipeId;
    const recipe = isNew ? null : state.recipes.find(item => item.id === state.editingRecipeId);
    if (!isNew && !recipe) return setView('recipes', { editingRecipeId: null });
    const initial = recipe || {
      name: '', servings: 4, totalCalories: '', totalProtein: '', totalFiber: '', totalFat: '', totalCarbohydrates: ''
    };
    const extrasOpen = initial.totalFat != null && initial.totalFat !== '' || initial.totalCarbohydrates != null && initial.totalCarbohydrates !== '' ? ' open' : '';

    app.innerHTML = `<main class="page">
      <header class="topbar"><button class="icon-button" id="recipe-edit-back" aria-label="Zurück">${icon('back')}</button><h1>${isNew ? 'Neues Rezept' : 'Rezept bearbeiten'}</h1><span style="width:44px"></span></header>
      <div class="info-banner">${icon('recipe')} <span>In v0.3.2 gibst du die Nährwerte für das gesamte Rezept direkt ein. Zutaten folgen mit v0.3.3.</span></div>
      <form id="recipe-form" class="form-card">
        ${fieldRow(icon('food'), 'Rezeptname', `<input id="recipe-name" type="text" autocomplete="off" value="${esc(initial.name)}" placeholder="z. B. Linsenbolognese">`)}
        ${fieldRow(icon('portions'), 'Anzahl Portionen', `<input id="recipe-servings" type="text" inputmode="decimal" value="${initial.servings ?? 4}"><p class="input-help">Mampfo berechnet daraus automatisch die Werte pro Portion.</p>`)}
        <div class="recipe-total-heading"><span>Gesamtes Rezept</span><small>Nährwerte für alle Portionen zusammen</small></div>
        ${fieldRow(icon('flame'), 'Kalorien (kcal)', `<input id="recipe-calories" type="text" inputmode="decimal" value="${initial.totalCalories ?? ''}" placeholder="0">`)}
        ${fieldRow(icon('protein'), 'Protein (g)', `<input id="recipe-protein" type="text" inputmode="decimal" value="${initial.totalProtein ?? ''}" placeholder="optional">`)}
        ${fieldRow(icon('leaf'), 'Ballaststoffe (g)', `<input id="recipe-fiber" type="text" inputmode="decimal" value="${initial.totalFiber ?? ''}" placeholder="optional">`)}
        <details class="extra-nutrients"${extrasOpen}>
          <summary>Weitere Nährwerte</summary>
          <div class="extra-nutrient-fields">
            ${fieldRow(icon('drop'), 'Fett (g)', `<input id="recipe-fat" type="text" inputmode="decimal" value="${initial.totalFat ?? ''}" placeholder="optional">`)}
            ${fieldRow(icon('carbs'), 'Kohlenhydrate (g)', `<input id="recipe-carbohydrates" type="text" inputmode="decimal" value="${initial.totalCarbohydrates ?? ''}" placeholder="optional">`)}
          </div>
        </details>
        <section class="recipe-preview" aria-live="polite"><small>Pro Portion</small><strong id="recipe-preview-calories">0 kcal</strong><span id="recipe-preview-main">Protein offen · Ballaststoffe offen</span><span id="recipe-preview-extra"></span></section>
        <div class="form-actions"><button class="primary-button" type="submit">${isNew ? 'Rezept speichern' : 'Änderungen speichern'}</button>${!isNew ? `<button class="danger-button" type="button" id="delete-recipe">${icon('trash')} Rezept löschen</button>` : ''}</div>
      </form>
    </main>${bottomNav('recipes')}`;

    document.getElementById('recipe-edit-back').onclick = () => isNew ? setView('recipes', { editingRecipeId: null }) : setView('recipeDetail', { selectedRecipeId: recipe.id, editingRecipeId: null });
    ['recipe-servings','recipe-calories','recipe-protein','recipe-fiber','recipe-fat','recipe-carbohydrates'].forEach(id => document.getElementById(id).addEventListener('input', updateRecipePreview));
    updateRecipePreview();
    document.getElementById('recipe-form').addEventListener('submit', event => saveRecipeForm(event, recipe));
    const deleteButton = document.getElementById('delete-recipe');
    if (deleteButton) deleteButton.onclick = () => confirmDeleteRecipe(recipe);
  }

  function recipeFormValues() {
    return {
      name: document.getElementById('recipe-name').value.trim(),
      servings: parseNum(document.getElementById('recipe-servings').value),
      totalCalories: parseNum(document.getElementById('recipe-calories').value),
      totalProtein: parseNum(document.getElementById('recipe-protein').value),
      totalFiber: parseNum(document.getElementById('recipe-fiber').value),
      totalFat: parseNum(document.getElementById('recipe-fat').value),
      totalCarbohydrates: parseNum(document.getElementById('recipe-carbohydrates').value)
    };
  }

  function validateRecipe(values) {
    if (!values.name) return 'Bitte einen Rezeptnamen eingeben.';
    if (values.servings == null || values.servings <= 0) return 'Bitte eine gültige Portionszahl eingeben.';
    if (values.totalCalories == null || values.totalCalories < 0) return 'Bitte gültige Kalorien eingeben.';
    if ([values.totalProtein, values.totalFiber, values.totalFat, values.totalCarbohydrates].some(value => value != null && value < 0)) return 'Nährwerte dürfen nicht negativ sein.';
    return null;
  }

  function updateRecipePreview() {
    const servings = parseNum(document.getElementById('recipe-servings')?.value);
    const divisor = servings && servings > 0 ? servings : 1;
    const calories = parseNum(document.getElementById('recipe-calories')?.value);
    const protein = parseNum(document.getElementById('recipe-protein')?.value);
    const fiber = parseNum(document.getElementById('recipe-fiber')?.value);
    const fat = parseNum(document.getElementById('recipe-fat')?.value);
    const carbs = parseNum(document.getElementById('recipe-carbohydrates')?.value);
    const calEl = document.getElementById('recipe-preview-calories');
    const mainEl = document.getElementById('recipe-preview-main');
    const extraEl = document.getElementById('recipe-preview-extra');
    if (!calEl || !mainEl || !extraEl) return;
    calEl.textContent = `${fmt((calories || 0) / divisor, 0)} kcal`;
    mainEl.textContent = `${protein == null ? 'Protein offen' : `${fmt(protein / divisor)} g Protein`} · ${fiber == null ? 'Ballaststoffe offen' : `${fmt(fiber / divisor)} g Ballaststoffe`}`;
    const extras = [];
    if (fat != null) extras.push(`${fmt(fat / divisor)} g Fett`);
    if (carbs != null) extras.push(`${fmt(carbs / divisor)} g Kohlenhydrate`);
    extraEl.textContent = extras.join(' · ');
    extraEl.hidden = extras.length === 0;
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
      Object.assign(recipe, values, { calculationMode: 'manual', updatedAt: now });
    } else {
      recipe = { id: uuid(), calculationMode: 'manual', ...values, createdAt: now, updatedAt: now };
      state.recipes.push(recipe);
    }
    persist();
    state.editingRecipeId = null;
    state.selectedRecipeId = recipe.id;
    showToast(existingRecipe ? 'Rezept aktualisiert.' : 'Rezept gespeichert.');
    setView('recipeDetail', { selectedRecipeId: recipe.id, editingRecipeId: null });
  }

  function renderRecipeDetail() {
    const recipe = state.recipes.find(item => item.id === state.selectedRecipeId);
    if (!recipe) return setView('recipes', { selectedRecipeId: null });
    const per = recipePerPortion(recipe);
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
      <div class="recipe-mode-note">${icon('recipe')} Direkt eingegebene Nährwerte · Zutaten folgen mit v0.3.3.</div>
      <button class="primary-button floating-action recipe-log-action" id="log-recipe">${icon('plus')} Essen eintragen</button>
    </main>${bottomNav('recipes')}`;
    document.getElementById('recipe-detail-back').onclick = () => setView('recipes', { selectedRecipeId: null });
    document.getElementById('edit-recipe').onclick = () => setView('recipeEdit', { editingRecipeId: recipe.id });
    document.getElementById('log-recipe').onclick = () => setView('recipeLog', { selectedRecipeId: recipe.id });
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
      showToast('Rezept gelöscht.');
      setView('recipes');
    };
  }

  function renderRecipeLog() {
    const recipe = state.recipes.find(item => item.id === state.selectedRecipeId);
    if (!recipe) return setView('recipes', { selectedRecipeId: null });
    const per = recipePerPortion(recipe);
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
    </main>${bottomNav('recipes')}`;
    document.getElementById('recipe-log-back').onclick = () => setView('recipeDetail', { selectedRecipeId: recipe.id });
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
    NUTRIENT_KEYS.forEach(key => { result[key] = per[key] == null ? null : per[key] * factor; });
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
    const values = scaledRecipeValues(recipe, portions);
    const now = new Date().toISOString();
    state.entries.push({
      id: uuid(), name: recipe.name, amount: portions, unit: 'portion',
      calories: values.calories, protein: values.protein, fiber: values.fiber, fat: values.fat, carbohydrates: values.carbohydrates,
      date, time, source: 'recipe', foodId: null, recipeId: recipe.id, createdAt: now, updatedAt: now
    });
    state.selectedDate = date;
    state.selectedRecipeId = null;
    persist();
    showToast('Rezept ins Tagebuch eingetragen.');
    setView('today');
  }

  function renderPlaceholder(view) {
    const data = {
      fasting: ['☾', 'Fasten', 'Der Fastentimer folgt in einer späteren Version.'],
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
        setView(view, { editingId: null, editingFoodId: null, editingRecipeId: null, selectedRecipeId: null, selectedSavedFoodId: null });
      };
    });
  }

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
  }

  persist();
  render();
})();
