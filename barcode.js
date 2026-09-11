(() => {
  'use strict';

  const ZXING_URL = 'https://cdn.jsdelivr.net/npm/@zxing/browser@0.2.1/umd/zxing-browser.min.js';
  const PRODUCT_FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e'];
  let active = null;
  let loaderPromise = null;

  function cleanCode(value) {
    return String(value || '').replace(/[^0-9]/g, '');
  }

  async function stop() {
    const current = active;
    active = null;
    if (!current) return;
    try { current.stop?.(); } catch {}
    if (current.raf) cancelAnimationFrame(current.raf);
    if (current.stream) {
      current.stream.getTracks().forEach(track => {
        try { track.stop(); } catch {}
      });
    }
    if (current.video) {
      try { current.video.pause(); } catch {}
      try { current.video.srcObject = null; } catch {}
    }
  }

  async function loadZxing() {
    if (window.ZXingBrowser?.BrowserMultiFormatOneDReader) return window.ZXingBrowser;
    if (loaderPromise) return loaderPromise;
    loaderPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-mampfo-zxing]');
      if (existing) {
        existing.addEventListener('load', () => resolve(window.ZXingBrowser), { once: true });
        existing.addEventListener('error', () => reject(new Error('Barcode-Bibliothek konnte nicht geladen werden.')), { once: true });
        return;
      }
      const script = document.createElement('script');
      script.src = ZXING_URL;
      script.async = true;
      script.crossOrigin = 'anonymous';
      script.dataset.mampfoZxing = '1';
      script.onload = () => window.ZXingBrowser ? resolve(window.ZXingBrowser) : reject(new Error('Barcode-Bibliothek wurde nicht initialisiert.'));
      script.onerror = () => reject(new Error('Barcode-Bibliothek konnte nicht geladen werden. Barcode-Nummer bitte manuell eingeben.'));
      document.head.appendChild(script);
    });
    try { return await loaderPromise; }
    catch (error) { loaderPromise = null; throw error; }
  }

  async function startNative(video, onDetected, onStatus) {
    let formats = PRODUCT_FORMATS;
    if (typeof BarcodeDetector.getSupportedFormats === 'function') {
      try {
        const supported = await BarcodeDetector.getSupportedFormats();
        const filtered = PRODUCT_FORMATS.filter(format => supported.includes(format));
        if (filtered.length) formats = filtered;
      } catch {}
    }
    const detector = new BarcodeDetector({ formats });
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }
    });
    await stop();
    video.srcObject = stream;
    await video.play();
    const current = { stream, video, raf: null, stopped: false, scanning: false, last: 0, stop() { this.stopped = true; } };
    active = current;
    onStatus?.('Kamera aktiv. Barcode in den Rahmen halten.');

    const loop = timestamp => {
      if (active !== current || current.stopped) return;
      if (!current.scanning && timestamp - current.last >= 140 && video.readyState >= 2) {
        current.last = timestamp;
        current.scanning = true;
        detector.detect(video).then(results => {
          if (active !== current || current.stopped) return;
          const hit = (results || []).find(item => cleanCode(item.rawValue).length >= 8);
          if (hit) onDetected?.(cleanCode(hit.rawValue));
        }).catch(() => {}).finally(() => { current.scanning = false; });
      }
      current.raf = requestAnimationFrame(loop);
    };
    current.raf = requestAnimationFrame(loop);
    return current;
  }

  async function startZxing(video, onDetected, onStatus) {
    onStatus?.('Kompatibler Scanner wird geladen …');
    const ZX = await loadZxing();
    await stop();
    const reader = new ZX.BrowserMultiFormatOneDReader(undefined, {
      delayBetweenScanAttempts: 120,
      delayBetweenScanSuccess: 500
    });
    let controls;
    controls = await reader.decodeFromConstraints({
      audio: false,
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }
    }, video, result => {
      if (!result) return;
      const code = cleanCode(typeof result.getText === 'function' ? result.getText() : result.text);
      if (code.length >= 8) onDetected?.(code);
    });
    const current = {
      video,
      stop() {
        try { controls?.stop?.(); } catch {}
        try { ZX.BrowserCodeReader?.releaseAllStreams?.(); } catch {}
      }
    };
    active = current;
    onStatus?.('Kamera aktiv. Barcode in den Rahmen halten.');
    return current;
  }

  async function start(video, onDetected, onStatus) {
    if (!video) throw new Error('Kamera-Vorschau fehlt.');
    if (!navigator.mediaDevices?.getUserMedia) throw new Error('Dieser Browser stellt keinen Kamerazugriff bereit.');
    await stop();
    if ('BarcodeDetector' in window) {
      try { return await startNative(video, onDetected, onStatus); }
      catch (error) {
        if (error?.name === 'NotAllowedError' || error?.name === 'NotFoundError' || error?.name === 'NotReadableError') throw error;
        return await startZxing(video, onDetected, onStatus);
      }
    }
    return await startZxing(video, onDetected, onStatus);
  }

  window.MampfoBarcode = { start, stop, cleanCode, zxingVersion: '0.2.1' };
})();
