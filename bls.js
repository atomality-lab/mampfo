(() => {
  'use strict';

  const DB_NAME = 'mampfo.bls.v1';
  const DB_VERSION = 1;
  const FOOD_STORE = 'foods';
  const META_STORE = 'meta';
  const META_KEY = 'bls4';
  let cache = null;

  const GROUPS = {
    B: 'Brot und Kleingebäck',
    C: 'Cerealien, Getreide, Getreideprodukte, Reis- und Haferdrinks',
    D: 'Dauerbackwaren, Kuchen, Feinbackwaren',
    E: 'Eier und Eierprodukte, Teigwaren',
    F: 'Früchte, Obst und Obsterzeugnisse',
    G: 'Gemüse und Gemüseerzeugnisse',
    H: 'Hülsenfrüchte, Schalenobst, Samen und pflanzliche Alternativen',
    K: 'Kartoffeln, stärkereiche Pflanzenteile und Pilze',
    M: 'Milch, Milcherzeugnisse und Käse',
    N: 'Alkoholfreie Getränke',
    P: 'Alkoholische Getränke',
    Q: 'Speisefette und Öle',
    R: 'Würzmittel, Saucen, Back- und Kochzutaten',
    S: 'Süßwaren, Zucker, Schokolade, Eis und süße Aufstriche',
    T: 'Fische, Krusten-, Schalen- und Weichtiere',
    U: 'Rind-, Kalb-, Schweine-, Schaf- und Lammfleisch',
    V: 'Wild, Geflügel, Federwild und Innereien',
    W: 'Fleisch- und Wurstwaren',
    X: 'Menükomponenten überwiegend pflanzlich',
    Y: 'Menükomponenten überwiegend tierisch'
  };

  function normalize(text) {
    return String(text || '')
      .toLocaleLowerCase('de-DE')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/ß/g, 'ss')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  function decodeXml(value) {
    return String(value || '')
      .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
      .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&gt;/g, '>')
      .replace(/&lt;/g, '<')
      .replace(/&amp;/g, '&');
  }

  function u16(view, offset) { return view.getUint16(offset, true); }
  function u32(view, offset) { return view.getUint32(offset, true); }

  function zipEntries(buffer) {
    const view = new DataView(buffer);
    let eocd = -1;
    const min = Math.max(0, buffer.byteLength - 65557);
    for (let i = buffer.byteLength - 22; i >= min; i -= 1) {
      if (u32(view, i) === 0x06054b50) { eocd = i; break; }
    }
    if (eocd < 0) throw new Error('Die XLSX-Datei enthält kein lesbares ZIP-Verzeichnis.');
    const count = u16(view, eocd + 10);
    let pos = u32(view, eocd + 16);
    const decoder = new TextDecoder('utf-8');
    const entries = new Map();
    for (let n = 0; n < count; n += 1) {
      if (u32(view, pos) !== 0x02014b50) throw new Error('Das ZIP-Verzeichnis der XLSX-Datei ist beschädigt.');
      const method = u16(view, pos + 10);
      const compressedSize = u32(view, pos + 20);
      const uncompressedSize = u32(view, pos + 24);
      const nameLen = u16(view, pos + 28);
      const extraLen = u16(view, pos + 30);
      const commentLen = u16(view, pos + 32);
      const localOffset = u32(view, pos + 42);
      const nameBytes = new Uint8Array(buffer, pos + 46, nameLen);
      const name = decoder.decode(nameBytes).replace(/\\/g, '/');
      entries.set(name, { name, method, compressedSize, uncompressedSize, localOffset });
      pos += 46 + nameLen + extraLen + commentLen;
    }
    return entries;
  }

  async function readZipText(buffer, entries, name) {
    const entry = entries.get(name);
    if (!entry) return null;
    const view = new DataView(buffer);
    const pos = entry.localOffset;
    if (u32(view, pos) !== 0x04034b50) throw new Error(`ZIP-Eintrag ${name} ist beschädigt.`);
    const nameLen = u16(view, pos + 26);
    const extraLen = u16(view, pos + 28);
    const dataStart = pos + 30 + nameLen + extraLen;
    const bytes = new Uint8Array(buffer, dataStart, entry.compressedSize);
    let output;
    if (entry.method === 0) {
      output = bytes;
    } else if (entry.method === 8) {
      if (typeof DecompressionStream !== 'function') {
        throw new Error('Dieses Gerät unterstützt den lokalen XLSX-Import leider nicht. Bitte aktualisiere den Browser.');
      }
      const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
      output = new Uint8Array(await new Response(stream).arrayBuffer());
    } else {
      throw new Error(`Nicht unterstützte XLSX-Kompression (${entry.method}).`);
    }
    return new TextDecoder('utf-8').decode(output);
  }

  function parseSharedStrings(xml) {
    if (!xml) return [];
    const values = [];
    const si = /<si\b[^>]*>([\s\S]*?)<\/si>/g;
    let match;
    while ((match = si.exec(xml))) {
      const parts = [];
      const t = /<t\b[^>]*>([\s\S]*?)<\/t>/g;
      let tm;
      while ((tm = t.exec(match[1]))) parts.push(decodeXml(tm[1]));
      values.push(parts.join(''));
    }
    return values;
  }

  function columnFromRef(ref) {
    const m = /^([A-Z]+)/i.exec(ref || '');
    return m ? m[1].toUpperCase() : '';
  }

  function cellValue(attrs, body, shared) {
    const type = /\bt="([^"]+)"/.exec(attrs)?.[1] || '';
    if (type === 'inlineStr') {
      const parts = [];
      const re = /<t\b[^>]*>([\s\S]*?)<\/t>/g;
      let m;
      while ((m = re.exec(body))) parts.push(decodeXml(m[1]));
      return parts.join('');
    }
    const raw = /<v\b[^>]*>([\s\S]*?)<\/v>/.exec(body)?.[1];
    if (raw == null) return '';
    if (type === 's') return shared[Number(raw)] ?? '';
    if (type === 'str') return decodeXml(raw);
    return raw;
  }

  function rowCells(rowXml, shared) {
    const map = new Map();
    const re = /<c\b([^>]*)>([\s\S]*?)<\/c>/g;
    let m;
    while ((m = re.exec(rowXml))) {
      const ref = /\br="([^"]+)"/.exec(m[1])?.[1] || '';
      const col = columnFromRef(ref);
      if (col) map.set(col, cellValue(m[1], m[2], shared));
    }
    return map;
  }

  function findNutrientColumn(headers, code) {
    const candidates = [...headers.entries()].filter(([, text]) => {
      const value = String(text || '').trim();
      return new RegExp(`^${code}(?:\\s|$)`, 'i').test(value) && !/Datenherkunft|Referenz/i.test(value);
    });
    return candidates[0]?.[0] || null;
  }

  function num(value) {
    if (value == null || value === '') return null;
    const n = Number(String(value).replace(',', '.'));
    return Number.isFinite(n) ? n : null;
  }

  async function parseBlsXlsx(arrayBuffer, progress = () => {}) {
    progress({ stage: 'zip', message: 'BLS-Datei wird geöffnet …', percent: 5 });
    const entries = zipEntries(arrayBuffer);
    const sheetName = entries.has('xl/worksheets/sheet1.xml')
      ? 'xl/worksheets/sheet1.xml'
      : [...entries.keys()].find(name => /^xl\/worksheets\/sheet\d+\.xml$/i.test(name));
    if (!sheetName) throw new Error('In der XLSX-Datei wurde kein Tabellenblatt gefunden.');

    progress({ stage: 'strings', message: 'Lebensmittelnamen werden vorbereitet …', percent: 12 });
    const sharedXml = await readZipText(arrayBuffer, entries, 'xl/sharedStrings.xml');
    const shared = parseSharedStrings(sharedXml);

    progress({ stage: 'sheet', message: 'BLS-Nährwerte werden gelesen …', percent: 22 });
    const sheetXml = await readZipText(arrayBuffer, entries, sheetName);
    if (!sheetXml) throw new Error('Das BLS-Tabellenblatt konnte nicht gelesen werden.');

    const rows = /<row\b[^>]*>([\s\S]*?)<\/row>/g;
    const first = rows.exec(sheetXml);
    if (!first) throw new Error('Die XLSX-Datei enthält keine Datenzeilen.');
    const headerCells = rowCells(first[1], shared);
    const headers = new Map([...headerCells].map(([col, value]) => [col, String(value || '').trim()]));

    const codeCol = [...headers.entries()].find(([, v]) => /BLS\s*Code/i.test(v))?.[0] || 'A';
    const nameCol = [...headers.entries()].find(([, v]) => /Lebensmittelbezeichnung/i.test(v))?.[0] || 'B';
    const nameEnCol = [...headers.entries()].find(([, v]) => /^Food name$/i.test(v))?.[0] || 'C';
    const nutrientCols = {
      calories: findNutrientColumn(headers, 'ENERCC'),
      protein: findNutrientColumn(headers, 'PROT625'),
      fat: findNutrientColumn(headers, 'FAT'),
      carbohydrates: findNutrientColumn(headers, 'CHO'),
      fiber: findNutrientColumn(headers, 'FIBT')
    };
    const missing = Object.entries(nutrientCols).filter(([, col]) => !col).map(([key]) => key);
    if (missing.length) {
      throw new Error(`Die Datei sieht nicht wie BLS 4.0 aus. Fehlende Kernspalten: ${missing.join(', ')}.`);
    }

    const foods = [];
    let row;
    let processed = 0;
    while ((row = rows.exec(sheetXml))) {
      processed += 1;
      const cells = rowCells(row[1], shared);
      const code = String(cells.get(codeCol) || '').trim();
      const name = String(cells.get(nameCol) || '').trim();
      if (!code || !name) continue;
      const item = {
        code,
        name,
        nameEn: String(cells.get(nameEnCol) || '').trim(),
        group: GROUPS[code.charAt(0).toUpperCase()] || '',
        calories: num(cells.get(nutrientCols.calories)),
        protein: num(cells.get(nutrientCols.protein)),
        fiber: num(cells.get(nutrientCols.fiber)),
        fat: num(cells.get(nutrientCols.fat)),
        carbohydrates: num(cells.get(nutrientCols.carbohydrates)),
        search: normalize(`${name} ${cells.get(nameEnCol) || ''} ${code}`)
      };
      foods.push(item);
      if (processed % 400 === 0) {
        progress({ stage: 'rows', message: `${foods.length.toLocaleString('de-DE')} Lebensmittel gelesen …`, percent: Math.min(86, 22 + Math.round(processed / 90)) });
      }
    }
    if (foods.length < 1000) throw new Error(`Es wurden nur ${foods.length} Lebensmittel gefunden. Bitte wähle die Hauptdatei BLS_4_0_Daten_2025_DE.xlsx.`);
    progress({ stage: 'parsed', message: `${foods.length.toLocaleString('de-DE')} Lebensmittel vorbereitet.`, percent: 88 });
    return foods;
  }

  function openDb() {
    return new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) return reject(new Error('IndexedDB wird auf diesem Gerät nicht unterstützt.'));
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(FOOD_STORE)) db.createObjectStore(FOOD_STORE, { keyPath: 'code' });
        if (!db.objectStoreNames.contains(META_STORE)) db.createObjectStore(META_STORE, { keyPath: 'key' });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error || new Error('BLS-Datenbank konnte nicht geöffnet werden.'));
    });
  }

  function transactionDone(tx) {
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error('BLS-Datenbankfehler.'));
      tx.onabort = () => reject(tx.error || new Error('BLS-Speicherung wurde abgebrochen.'));
    });
  }

  async function saveFoods(foods, fileName, progress = () => {}) {
    const db = await openDb();
    const tx = db.transaction([FOOD_STORE, META_STORE], 'readwrite');
    const store = tx.objectStore(FOOD_STORE);
    store.clear();
    foods.forEach(food => store.put(food));
    tx.objectStore(META_STORE).put({
      key: META_KEY,
      version: '4.0',
      count: foods.length,
      importedAt: new Date().toISOString(),
      fileName: fileName || 'BLS 4.0',
      attribution: 'Max Rubner-Institut (2025): Bundeslebensmittelschlüssel (BLS), Version 4.0 – Deutsche Nährstoffdatenbank. DOI: 10.25826/Data20251217-134202-0',
      license: 'CC BY 4.0'
    });
    progress({ stage: 'save', message: 'Lokale BLS-Suche wird gespeichert …', percent: 94 });
    await transactionDone(tx);
    db.close();
    cache = foods;
    progress({ stage: 'done', message: 'BLS 4.0 ist einsatzbereit.', percent: 100 });
  }

  async function importFile(file, progress) {
    if (!file) throw new Error('Bitte eine BLS-XLSX-Datei auswählen.');
    if (!/\.xlsx$/i.test(file.name || '')) throw new Error('Bitte die Datei BLS_4_0_Daten_2025_DE.xlsx auswählen.');
    const buffer = await file.arrayBuffer();
    const foods = await parseBlsXlsx(buffer, progress);
    await saveFoods(foods, file.name, progress);
    return { count: foods.length };
  }

  async function getMeta() {
    const db = await openDb();
    const result = await new Promise((resolve, reject) => {
      const req = db.transaction(META_STORE, 'readonly').objectStore(META_STORE).get(META_KEY);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return result;
  }

  async function allFoods() {
    if (cache) return cache;
    const db = await openDb();
    const result = await new Promise((resolve, reject) => {
      const req = db.transaction(FOOD_STORE, 'readonly').objectStore(FOOD_STORE).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
    db.close();
    cache = result;
    return result;
  }

  function score(item, query, tokens) {
    const name = normalize(item.name);
    const search = item.search || normalize(`${item.name} ${item.nameEn || ''} ${item.code || ''}`);
    let value = 0;
    if (name === query) value += 120;
    if (name.startsWith(query)) value += 80;
    if (name.split(' ').some(part => part.startsWith(query))) value += 45;
    if (search.includes(query)) value += 30;
    for (const token of tokens) {
      if (name.split(' ').some(part => part === token)) value += 18;
      else if (name.split(' ').some(part => part.startsWith(token))) value += 12;
      else if (search.includes(token)) value += 6;
      else return -1;
    }
    return value;
  }

  async function search(query, limit = 40) {
    const q = normalize(query);
    if (q.length < 2) return [];
    const tokens = q.split(/\s+/).filter(Boolean);
    const foods = await allFoods();
    return foods
      .map(item => ({ item, score: score(item, q, tokens) }))
      .filter(row => row.score >= 0)
      .sort((a, b) => b.score - a.score || a.item.name.localeCompare(b.item.name, 'de'))
      .slice(0, limit)
      .map(row => row.item);
  }

  async function clear() {
    const db = await openDb();
    const tx = db.transaction([FOOD_STORE, META_STORE], 'readwrite');
    tx.objectStore(FOOD_STORE).clear();
    tx.objectStore(META_STORE).clear();
    await transactionDone(tx);
    db.close();
    cache = null;
  }

  window.MampfoBLS = {
    importFile,
    getMeta,
    search,
    clear,
    allFoods,
    parseBlsXlsx,
    normalize,
    attribution: 'Max Rubner-Institut (2025): Bundeslebensmittelschlüssel (BLS), Version 4.0 – Deutsche Nährstoffdatenbank. DOI: 10.25826/Data20251217-134202-0',
    license: 'CC BY 4.0',
    sourceUrl: 'https://blsdb.de/download'
  };
})();
