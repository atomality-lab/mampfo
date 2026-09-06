(() => {
  'use strict';

  const SEARCH_URL = 'https://search.openfoodfacts.org/search';
  const SOURCE_URL = 'https://world.openfoodfacts.org/';
  const ATTRIBUTION = 'Open Food Facts – offene Produktdatenbank (ODbL)';
  const PAGE_SIZE = 20;
  const FIELDS = [
    'code', 'product_name', 'brands', 'quantity', 'product_quantity_unit',
    'nutriments', 'nutrition_data_per', 'countries'
  ];

  function textValue(value, preferred = ['de', 'en']) {
    if (value == null) return '';
    if (typeof value === 'string' || typeof value === 'number') return String(value).trim();
    if (Array.isArray(value)) return value.map(item => textValue(item, preferred)).filter(Boolean).join(', ');
    if (typeof value === 'object') {
      for (const lang of preferred) {
        if (value[lang]) return textValue(value[lang], preferred);
      }
      for (const candidate of Object.values(value)) {
        const text = textValue(candidate, preferred);
        if (text) return text;
      }
    }
    return '';
  }

  function numberOrNull(value) {
    if (value == null || value === '') return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }

  function nutrient(nutriments, key) {
    if (!nutriments || typeof nutriments !== 'object') return null;
    return numberOrNull(nutriments[`${key}_100g`]);
  }

  function normalizeProduct(raw) {
    raw = raw || {};
    const nutriments = raw.nutriments || {};
    let calories = nutrient(nutriments, 'energy-kcal');
    if (calories == null) {
      const kj = nutrient(nutriments, 'energy-kj');
      if (kj != null) calories = kj / 4.184;
    }
    const quantityUnit = textValue(raw.product_quantity_unit).toLowerCase();
    const liquid = ['ml', 'cl', 'dl', 'l'].includes(quantityUnit);
    return {
      code: textValue(raw.code),
      name: textValue(raw.product_name) || 'Produkt ohne Namen',
      brands: textValue(raw.brands),
      quantity: textValue(raw.quantity),
      calories,
      protein: nutrient(nutriments, 'proteins'),
      fiber: nutrient(nutriments, 'fiber'),
      fat: nutrient(nutriments, 'fat'),
      carbohydrates: nutrient(nutriments, 'carbohydrates'),
      baseAmount: 100,
      baseUnit: liquid ? 'ml' : 'g',
      rawUnitHint: quantityUnit || null
    };
  }

  async function search(query, page = 1) {
    const q = String(query || '').trim();
    if (q.length < 2) return { products: [], count: 0, page: 1, pageCount: 0 };
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      throw new Error('Die Open-Food-Facts-Suche benötigt eine Internetverbindung.');
    }
    const url = new URL(SEARCH_URL);
    url.searchParams.set('q', q);
    url.searchParams.set('langs', 'de,en');
    url.searchParams.set('page', String(Math.max(1, Number(page) || 1)));
    url.searchParams.set('page_size', String(PAGE_SIZE));
    url.searchParams.set('boost_phrase', 'true');
    url.searchParams.set('fields', FIELDS.join(','));

    let response;
    try {
      response = await fetch(url.toString(), { method: 'GET', mode: 'cors', cache: 'no-store' });
    } catch {
      throw new Error('Open Food Facts ist gerade nicht erreichbar. Bitte später erneut versuchen.');
    }
    if (!response.ok) {
      if (response.status === 429) throw new Error('Zu viele Suchanfragen. Bitte kurz warten und dann erneut suchen.');
      throw new Error(`Open Food Facts konnte nicht abgefragt werden (${response.status}).`);
    }
    const payload = await response.json();
    if (Array.isArray(payload?.errors) && payload.errors.length) {
      throw new Error(payload.errors[0]?.description || payload.errors[0]?.title || 'Produktsuche nicht möglich.');
    }
    const hits = Array.isArray(payload?.hits) ? payload.hits : [];
    const products = hits.map(normalizeProduct).filter(item => item.code && item.name);
    return {
      products,
      count: Number(payload?.count || products.length),
      page: Number(payload?.page || page || 1),
      pageCount: Number(payload?.page_count || 0),
      isCountExact: payload?.is_count_exact !== false
    };
  }

  window.MampfoOFF = {
    search,
    normalizeProduct,
    sourceUrl: SOURCE_URL,
    attribution: ATTRIBUTION,
    pageSize: PAGE_SIZE
  };
})();
