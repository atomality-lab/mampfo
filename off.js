(() => {
  'use strict';

  const SEARCH_URL = 'https://world.openfoodfacts.org/cgi/search.pl';
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

    const requestedPage = Math.max(1, Number(page) || 1);
    const url = new URL(SEARCH_URL);
    url.searchParams.set('search_terms', q);
    url.searchParams.set('search_simple', '1');
    url.searchParams.set('action', 'process');
    url.searchParams.set('json', '1');
    url.searchParams.set('page', String(requestedPage));
    url.searchParams.set('page_size', String(PAGE_SIZE));
    url.searchParams.set('sort_by', 'popularity_key');
    url.searchParams.set('lc', 'de');
    url.searchParams.set('fields', FIELDS.join(','));

    let response;
    try {
      response = await fetch(url.toString(), {
        method: 'GET',
        mode: 'cors',
        cache: 'no-store',
        headers: { 'Accept': 'application/json' }
      });
    } catch {
      throw new Error('Open Food Facts ist gerade nicht erreichbar. Bitte später erneut versuchen.');
    }

    if (!response.ok) {
      if (response.status === 429) throw new Error('Zu viele Suchanfragen. Bitte kurz warten und dann erneut suchen.');
      throw new Error(`Open Food Facts konnte nicht abgefragt werden (${response.status}).`);
    }

    const contentType = String(response.headers.get('content-type') || '').toLowerCase();
    const rawText = await response.text();
    if (!contentType.includes('json')) {
      const looksHtml = /^\s*<!doctype|^\s*<html/i.test(rawText);
      throw new Error(looksHtml
        ? 'Open Food Facts hat unerwartet eine Webseite statt Produktdaten geliefert. Bitte später erneut versuchen.'
        : 'Open Food Facts hat ein unerwartetes Antwortformat geliefert.');
    }

    let payload;
    try {
      payload = JSON.parse(rawText);
    } catch {
      throw new Error('Die Antwort von Open Food Facts konnte nicht gelesen werden. Bitte später erneut versuchen.');
    }

    const sourceProducts = Array.isArray(payload?.products) ? payload.products : [];
    const products = sourceProducts.map(normalizeProduct).filter(item => item.code && item.name);
    const count = Number(payload?.count ?? products.length);
    const pageSize = Number(payload?.page_size || PAGE_SIZE) || PAGE_SIZE;
    const pageCountReturned = Number(payload?.page_count || products.length) || 0;
    const totalPages = count > 0 ? Math.max(1, Math.ceil(count / pageSize)) : 0;

    return {
      products,
      count,
      page: Number(payload?.page || requestedPage),
      pageCount: totalPages,
      pageCountReturned,
      isCountExact: true
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
