(() => {
  'use strict';

  const CFG = window.APP_CONFIG || { appName: 'Ernährungs-App', version: '0.1.0' };
  const STORAGE = {
    settings: 'nutrition.settings.v1',
    entries: 'nutrition.entries.v1',
    onboarded: 'nutrition.onboarded.v1'
  };

  const state = {
    view: 'today',
    selectedDate: todayISO(),
    editingId: null,
    settings: load(STORAGE.settings, { dailyCalories: 1700, dailyProtein: 80 }),
    entries: load(STORAGE.entries, []),
    onboarded: localStorage.getItem(STORAGE.onboarded) === 'yes'
  };

  const app = document.getElementById('app');
  const modalRoot = document.getElementById('modal-root');
  const toastRoot = document.getElementById('toast-root');

  document.title = `${CFG.appName} · v${CFG.version}`;

  function load(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function persist() {
    localStorage.setItem(STORAGE.settings, JSON.stringify(state.settings));
    localStorage.setItem(STORAGE.entries, JSON.stringify(state.entries));
  }

  function todayISO() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function nowTime() {
    const d = new Date();
    return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  }

  function displayDate(iso) {
    const [y,m,d] = iso.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return new Intl.DateTimeFormat('de-DE', { weekday:'long', day:'2-digit', month:'long', year:'numeric' }).format(date);
  }

  function shortDate(iso) {
    const [y,m,d] = iso.split('-');
    return `${d}.${m}.${y}`;
  }

  function dateToInput(de) {
    const match = /^([0-3]\d)\.([01]\d)\.(\d{4})$/.exec(de.trim());
    return match ? `${match[3]}-${match[2]}-${match[1]}` : '';
  }

  function offsetDate(iso, delta) {
    const [y,m,d] = iso.split('-').map(Number);
    const date = new Date(y, m - 1, d + delta);
    return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
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

  function esc(s='') {
    return String(s).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  }

  function icon(name) {
    const map = {
      settings:'⚙', calendar:'▣', prev:'‹', next:'›', flame:'♨', protein:'💪', leaf:'♧', clock:'◷',
      plus:'＋', home:'⌂', recipe:'▤', fasting:'☾', stats:'▥', back:'←', edit:'✎', trash:'♲', food:'♜', target:'◎', rocket:'↗'
    };
    return map[name] || '•';
  }

  function showToast(message) {
    toastRoot.innerHTML = `<div class="toast">${esc(message)}</div>`;
    setTimeout(() => { toastRoot.innerHTML = ''; }, 1800);
  }

  function setView(view, opts={}) {
    state.view = view;
    if ('editingId' in opts) state.editingId = opts.editingId;
    window.scrollTo({ top: 0, behavior: 'instant' });
    render();
  }

  function bottomNav(active) {
    const tabs = [
      ['today','home','Heute'],
      ['add','plus','Erfassen'],
      ['recipes','recipe','Rezepte'],
      ['fasting','fasting','Fasten'],
      ['stats','stats','Auswertung']
    ];
    return `<nav class="bottom-nav" aria-label="Hauptnavigation">
      ${tabs.map(([view,ic,label]) => `<button class="nav-button ${active===view?'active':''}" data-nav="${view}">
        <span class="nav-icon">${icon(ic)}</span><span>${label}</span>
      </button>`).join('')}
    </nav>`;
  }

  function render() {
    if (!state.onboarded) return renderOnboarding();

    if (state.view === 'today') renderToday();
    else if (state.view === 'add') renderForm();
    else if (state.view === 'settings') renderSettings();
    else if (['recipes','fasting','stats'].includes(state.view)) renderPlaceholder(state.view);
    else renderToday();
    bindCommon();
  }

  function renderOnboarding() {
    app.innerHTML = `<main class="onboarding">
      <section class="onboarding-card">
        <div class="brand-mark">♧</div>
        <h1>Willkommen</h1>
        <p>Lege deine Tagesziele fest. Die Werte kannst du später jederzeit in den Einstellungen ändern.</p>
        <form id="onboarding-form">
          <div class="goal-grid">
            <div class="goal-field"><label for="goal-cal">Kalorien pro Tag</label><input id="goal-cal" inputmode="numeric" value="${state.settings.dailyCalories}" aria-label="Kalorien pro Tag"></div>
            <div class="goal-field"><label for="goal-protein">Protein pro Tag (g)</label><input id="goal-protein" inputmode="decimal" value="${state.settings.dailyProtein}" aria-label="Protein pro Tag"></div>
          </div>
          <button class="primary-button" type="submit">Starten</button>
        </form>
        <div class="version">Prototyp · Version ${esc(CFG.version)}</div>
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
      localStorage.setItem(STORAGE.onboarded, 'yes');
      persist();
      render();
    });
  }

  function dailyEntries(date) {
    return state.entries.filter(e => e.date === date).sort((a,b) => a.time.localeCompare(b.time));
  }

  function dailyTotals(date) {
    return dailyEntries(date).reduce((sum,e) => {
      sum.calories += Number(e.calories || 0);
      sum.protein += Number(e.protein || 0);
      sum.fiber += Number(e.fiber || 0);
      return sum;
    }, { calories:0, protein:0, fiber:0 });
  }

  function progress(value, target) {
    if (!target) return 0;
    return Math.max(0, Math.min(100, (Number(value)/Number(target))*100));
  }

  function renderToday() {
    const entries = dailyEntries(state.selectedDate);
    const totals = dailyTotals(state.selectedDate);
    const isToday = state.selectedDate === todayISO();

    app.innerHTML = `<main class="page">
      <header class="topbar"><h1>${isToday?'Heute':'Tagesübersicht'}</h1><button class="icon-button" data-nav="settings" aria-label="Einstellungen">${icon('settings')}</button></header>
      <div class="date-nav">
        <button class="icon-button" id="prev-day" aria-label="Vorheriger Tag">${icon('prev')}</button>
        <div class="date-label">${esc(displayDate(state.selectedDate))}</div>
        <button class="icon-button" id="next-day" aria-label="Nächster Tag">${icon('next')}</button>
      </div>
      ${!isToday ? `<button class="today-chip" id="go-today">Heute</button>` : `<span class="today-chip" aria-hidden="true">Heute</span>`}

      <section class="summary-grid" aria-label="Tageswerte">
        ${summaryCard('calories', icon('flame'), `<strong>${fmt(totals.calories,0)}</strong><span>/ ${fmt(state.settings.dailyCalories,0)} kcal</span>`, progress(totals.calories,state.settings.dailyCalories))}
        ${summaryCard('protein', icon('protein'), `<strong>Protein ${fmt(totals.protein)}</strong><span>/ ${fmt(state.settings.dailyProtein)} g</span>`, progress(totals.protein,state.settings.dailyProtein))}
        ${summaryCard('fiber', icon('leaf'), `<strong>Ballaststoffe ${fmt(totals.fiber)}</strong><span>g</span>`, Math.min(100, totals.fiber*3))}
      </section>

      ${entries.length ? `
        <div class="section-title">${icon('clock')} Einträge</div>
        <section class="entry-list">
          ${entries.map((e,i) => entryCard(e,i)).join('')}
        </section>` : emptyState()}

      <button class="primary-button floating-action" id="add-food">${icon('plus')} Essen erfassen</button>
    </main>${bottomNav('today')}`;

    document.getElementById('prev-day').onclick = () => { state.selectedDate = offsetDate(state.selectedDate,-1); render(); };
    document.getElementById('next-day').onclick = () => { state.selectedDate = offsetDate(state.selectedDate,1); render(); };
    const todayBtn = document.getElementById('go-today');
    if (todayBtn) todayBtn.onclick = () => { state.selectedDate = todayISO(); render(); };
    document.getElementById('add-food').onclick = () => setView('add', { editingId:null });
    document.querySelectorAll('[data-entry-id]').forEach(btn => btn.onclick = () => setView('add',{ editingId:btn.dataset.entryId }));
  }

  function summaryCard(cls, ic, line, pct) {
    return `<div class="summary-card ${cls}"><div class="metric-icon">${ic}</div><div><div class="metric-line">${line}</div><div class="progress" aria-hidden="true"><span style="width:${pct.toFixed(1)}%"></span></div></div></div>`;
  }

  function entryCard(e,index) {
    const palette = ['var(--apricot-pale)','var(--lavender-pale)','var(--sage-pale)','var(--bluegray-pale)'];
    const parts = [`${fmt(e.calories,0)} kcal`];
    if (e.protein != null) parts.push(`${fmt(e.protein)} g Protein`);
    if (e.fiber != null) parts.push(`${fmt(e.fiber)} g Ballaststoffe`);
    return `<button class="entry-card" data-entry-id="${esc(e.id)}">
      <span class="time-chip" style="background:${palette[index%palette.length]}">${esc(e.time)}</span>
      <span class="entry-main"><strong>${esc(e.name)}</strong><span class="entry-sub">${parts.join(' · ')}</span></span>
      <span class="chev">›</span>
    </button>`;
  }

  function emptyState() {
    return `<section class="empty-state"><div class="empty-illustration" aria-hidden="true"><div class="sprig">♧</div><div class="bowl"></div><div class="spoon"></div></div><h2>Noch nichts eingetragen</h2><p>Für diesen Tag gibt es noch keine Ernährungseinträge.</p></section>`;
  }

  function renderForm() {
    const editing = state.editingId ? state.entries.find(e => e.id === state.editingId) : null;
    const initial = editing || { name:'', calories:'', protein:'', fiber:'', date:state.selectedDate, time:nowTime() };
    app.innerHTML = `<main class="page">
      <header class="topbar"><button class="icon-button" id="form-back" aria-label="Zurück">${icon('back')}</button><h1>${editing?'Eintrag bearbeiten':'Essen erfassen'}</h1><span style="width:44px"></span></header>
      ${editing?`<div class="info-banner">${icon('edit')} <span>Du bearbeitest einen bestehenden Eintrag.</span></div>`:''}
      <form id="food-form" class="form-card">
        ${fieldRow(icon('food'),'Essen',`<textarea id="name" autocomplete="off" placeholder="z. B. Roggenbrot mit Käse">${esc(initial.name)}</textarea><p class="input-help">Das große Feld eignet sich auch gut für Stift- bzw. Handschrifteingabe.</p>`)}
        ${fieldRow(icon('flame'),'Kalorien (kcal)',`<input id="calories" type="text" inputmode="decimal" value="${esc(initial.calories)}" placeholder="0">`)}
        ${fieldRow(icon('protein'),'Protein (g)',`<input id="protein" type="text" inputmode="decimal" value="${initial.protein??''}" placeholder="optional">`)}
        ${fieldRow(icon('leaf'),'Ballaststoffe (g)',`<input id="fiber" type="text" inputmode="decimal" value="${initial.fiber??''}" placeholder="optional">`)}
        ${fieldRow(icon('calendar'),'Datum',`<input id="date" type="date" value="${esc(initial.date)}">`)}
        ${fieldRow(icon('clock'),'Uhrzeit',`<input id="time" type="time" value="${esc(initial.time)}">`)}
        <div class="form-actions">
          <button class="primary-button" type="submit">${editing?'Änderungen speichern':'Speichern'}</button>
          ${editing?`<button class="danger-button" type="button" id="delete-entry">${icon('trash')} Eintrag löschen</button>`:''}
        </div>
      </form>
    </main>${bottomNav('add')}`;

    document.getElementById('form-back').onclick = () => setView('today');
    document.getElementById('food-form').addEventListener('submit', e => {
      e.preventDefault();
      const name = document.getElementById('name').value.trim();
      const calories = parseNum(document.getElementById('calories').value);
      const protein = parseNum(document.getElementById('protein').value);
      const fiber = parseNum(document.getElementById('fiber').value);
      const date = document.getElementById('date').value;
      const time = document.getElementById('time').value;
      if (!name) return showToast('Bitte eine Bezeichnung eingeben.');
      if (calories == null || calories < 0) return showToast('Bitte gültige Kalorien eingeben.');
      if (!date || !time) return showToast('Bitte Datum und Uhrzeit angeben.');
      if ((protein != null && protein < 0) || (fiber != null && fiber < 0)) return showToast('Nährwerte dürfen nicht negativ sein.');
      const now = new Date().toISOString();
      if (editing) {
        Object.assign(editing,{ name, calories, protein, fiber, date, time, updatedAt:now });
      } else {
        state.entries.push({ id:uuid(), name, calories, protein, fiber, fat:null, carbohydrates:null, date, time, source:'manual', createdAt:now, updatedAt:now });
      }
      state.selectedDate = date;
      persist();
      showToast(editing?'Änderungen gespeichert.':'Eintrag gespeichert.');
      state.editingId = null;
      state.view = 'today';
      setTimeout(render, 60);
    });
    if (editing) document.getElementById('delete-entry').onclick = () => confirmDelete(editing);
  }

  function fieldRow(ic,label,control) {
    return `<div class="form-row"><div class="field-icon" aria-hidden="true">${ic}</div><div class="field"><label>${label}</label>${control}</div></div>`;
  }

  function confirmDelete(entry) {
    modalRoot.innerHTML = `<div class="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="delete-title"><div class="modal">
      <h2 id="delete-title">Eintrag löschen?</h2><p>„${esc(entry.name)}“ wird aus deinem Ernährungstagebuch entfernt.</p>
      <div class="modal-actions"><button class="danger-button" id="confirm-delete">Löschen</button><button class="secondary-button" id="cancel-delete">Abbrechen</button></div>
    </div></div>`;
    document.getElementById('cancel-delete').onclick = () => modalRoot.innerHTML = '';
    document.getElementById('confirm-delete').onclick = () => {
      state.entries = state.entries.filter(e => e.id !== entry.id);
      persist(); modalRoot.innerHTML = ''; state.editingId = null; state.view = 'today'; showToast('Eintrag gelöscht.'); render();
    };
  }

  function renderSettings() {
    app.innerHTML = `<main class="page">
      <header class="topbar"><button class="icon-button" id="settings-back" aria-label="Zurück">${icon('back')}</button><h1>Einstellungen</h1><span style="width:44px"></span></header>
      <div class="settings-title">${icon('target')} Tagesziele</div>
      <form id="settings-form">
        <div class="setting-card calories"><div class="metric-icon">${icon('flame')}</div><div><label for="set-calories">Kalorien pro Tag</label><input id="set-calories" inputmode="numeric" value="${esc(state.settings.dailyCalories)}"><span>kcal</span></div></div>
        <div class="setting-card protein"><div class="metric-icon">${icon('protein')}</div><div><label for="set-protein">Protein pro Tag</label><input id="set-protein" inputmode="decimal" value="${esc(state.settings.dailyProtein)}"><span>g</span></div></div>
        <button class="primary-button" type="submit" style="margin-top:16px">Tagesziele speichern</button>
      </form>
      <div class="settings-note">${icon('rocket')}<br>Weitere Module sind in zukünftigen Versionen geplant.</div>
      <div class="version">Version ${esc(CFG.version)}</div>
    </main>${bottomNav('')}`;
    document.getElementById('settings-back').onclick = () => setView('today');
    document.getElementById('settings-form').addEventListener('submit', e => {
      e.preventDefault();
      const calories = parseNum(document.getElementById('set-calories').value);
      const protein = parseNum(document.getElementById('set-protein').value);
      if (!calories || calories <= 0 || !protein || protein <= 0) return showToast('Bitte gültige Tagesziele eingeben.');
      state.settings.dailyCalories = calories; state.settings.dailyProtein = protein; persist(); showToast('Tagesziele gespeichert.');
    });
  }

  function renderPlaceholder(view) {
    const data = {
      recipes:['▤','Rezepte','Rezepte folgen in einer späteren Version.'],
      fasting:['☾','Fasten','Der Fastentimer folgt in einer späteren Version.'],
      stats:['▥','Auswertung','Wochen-, Monats- und Fastenauswertungen folgen in einer späteren Version.']
    }[view];
    app.innerHTML = `<main class="page placeholder-page"><div class="placeholder-icon">${data[0]}</div><h1>${data[1]}</h1><p>${data[2]}</p></main>${bottomNav(view)}`;
  }

  function bindCommon() {
    document.querySelectorAll('[data-nav]').forEach(btn => {
      btn.onclick = () => {
        const view = btn.dataset.nav;
        if (view === 'today') state.selectedDate = state.selectedDate || todayISO();
        setView(view, { editingId:null });
      };
    });
  }

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
  }

  render();
})();
