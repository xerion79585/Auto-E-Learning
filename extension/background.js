/* global chrome */

// The extension executes only files bundled in the package. Network requests
// are limited to validated JSON/data endpoints used by the allowlist, runtime
// configuration, course list, and question bank.
const PASSWORD_SALT = '43a9aa7b0866d195ef0785e28b65f4a4';
const PASSWORD_HASH = '6fcd2f5139c8132f3f415bc0114128f624f4fe00d1591a2e275ded5e711a6845';
const LARGE_RESPONSE_THRESHOLD = 4 * 1024 * 1024;
const LARGE_RESPONSE_CHUNK_SIZE = 512 * 1024;
const LARGE_RESPONSE_TTL_MS = 5 * 60 * 1000;
const largeResponses = new Map();

async function sha256Hex(value) {
  const bytes = new TextEncoder().encode(`${PASSWORD_SALT}${value}`);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function verifyPassword(password) {
  if (typeof password !== 'string' || !password) return false;
  return (await sha256Hex(password)) === PASSWORD_HASH;
}

function getHeaderValue(headers, name) {
  if (!headers) return '';
  const lowerName = name.toLowerCase();
  for (const [key, value] of headers.entries()) {
    if (key.toLowerCase() === lowerName) return value;
  }
  return '';
}

function cleanupLargeResponses() {
  const expiredAt = Date.now() - LARGE_RESPONSE_TTL_MS;
  for (const [id, item] of largeResponses.entries()) {
    if (item.createdAt < expiredAt) largeResponses.delete(id);
  }
}

function createLargeResponseId() {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function isPermittedDataUrl(value) {
  try {
    const url = new URL(String(value || ''));
    if (url.protocol !== 'https:') return false;

    if (url.hostname === 'docs.google.com') {
      return url.pathname.startsWith('/spreadsheets/');
    }

    return url.hostname === 'raw.githubusercontent.com'
      && url.pathname.startsWith('/xerion79585/Auto-E-Learning/')
      && url.pathname.endsWith('.json');
  } catch (_error) {
    return false;
  }
}

function isSafeTabUrl(value) {
  try {
    const url = new URL(String(value || ''));
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch (_error) {
    return false;
  }
}

async function performRequest(details) {
  if (!details || typeof details.url !== 'string') {
    throw new Error('Missing request URL');
  }
  if (!isPermittedDataUrl(details.url)) {
    throw new Error('Request URL is not an approved data endpoint');
  }

  const controller = new AbortController();
  const timeoutMs = Number(details.timeout) > 0 ? Number(details.timeout) : 180000;
  const timeoutId = setTimeout(() => controller.abort(), Math.min(timeoutMs, 300000));

  try {
    const init = {
      method: String(details.method || 'GET').toUpperCase(),
      headers: details.headers || {},
      redirect: 'follow',
      // Avoid credentials so public CORS responses work without sharing cookies.
      credentials: 'omit',
      signal: controller.signal
    };

    if (details.data !== undefined && details.data !== null && init.method !== 'GET' && init.method !== 'HEAD') {
      init.body = typeof details.data === 'string' ? details.data : JSON.stringify(details.data);
    }

    const response = await fetch(details.url, init);
    const bytes = new Uint8Array(await response.arrayBuffer());
    const responseText = new TextDecoder().decode(bytes);

    cleanupLargeResponses();
    if (responseText.length > LARGE_RESPONSE_THRESHOLD) {
      const largeResponseId = createLargeResponseId();
      largeResponses.set(largeResponseId, {
        text: responseText,
        createdAt: Date.now()
      });
      return {
        ok: true,
        status: response.status,
        statusText: response.statusText,
        responseText: '',
        response: null,
        finalUrl: response.url,
        loaded: bytes.byteLength,
        total: responseText.length,
        largeResponseId,
        largeResponseLength: responseText.length,
        headers: Array.from(response.headers.entries()).map(([key, value]) => `${key}: ${value}`).join('\r\n')
      };
    }

    let responseBody = responseText;
    if (String(details.responseType || '').toLowerCase() === 'json') {
      try {
        responseBody = responseText ? JSON.parse(responseText) : null;
      } catch (_error) {
        responseBody = null;
      }
    }

    return {
      ok: true,
      status: response.status,
      statusText: response.statusText,
      responseText,
      response: responseBody,
      finalUrl: response.url,
      loaded: bytes.byteLength,
      total: Number(getHeaderValue(response.headers, 'content-length')) || 0,
      headers: Array.from(response.headers.entries()).map(([key, value]) => `${key}: ${value}`).join('\r\n')
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

function sendActiveTabMessage(message) {
  chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
    const tab = tabs && tabs[0];
    if (!tab || typeof tab.id !== 'number') return;
    chrome.tabs.sendMessage(tab.id, message, () => {
      // The active tab may not be one of our matched pages. Ignore that case.
      void chrome.runtime.lastError;
    });
  });
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || typeof message.type !== 'string') return undefined;

  if (message.type === 'storage.getAll') {
    chrome.storage.local.get(null).then(sendResponse);
    return true;
  }

  if (message.type === 'storage.set') {
    const key = String(message.key || '');
    if (!key) {
      sendResponse({ ok: false, error: 'Missing storage key' });
      return undefined;
    }
    chrome.storage.local.set({ [key]: message.value }).then(() => sendResponse({ ok: true }));
    return true;
  }

  if (message.type === 'storage.remove') {
    const key = String(message.key || '');
    chrome.storage.local.remove(key).then(() => sendResponse({ ok: true }));
    return true;
  }

  if (message.type === 'auth.verify') {
    verifyPassword(message.password)
      .then((valid) => sendResponse({ ok: true, valid }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (message.type === 'http.request') {
    performRequest(message.details)
      .then(sendResponse)
      .catch((error) => sendResponse({
        ok: false,
        error: error && error.name === 'AbortError' ? 'Request timed out' : String(error && error.message || error)
      }));
    return true;
  }

  if (message.type === 'http.readChunk') {
    cleanupLargeResponses();
    const id = String(message.id || '');
    const item = largeResponses.get(id);
    if (!item) {
      sendResponse({ ok: false, error: 'Large response expired' });
      return undefined;
    }

    const offset = Math.max(0, Number(message.offset) || 0);
    const length = Math.min(LARGE_RESPONSE_CHUNK_SIZE, Math.max(1, Number(message.length) || LARGE_RESPONSE_CHUNK_SIZE));
    const chunk = item.text.slice(offset, offset + length);
    const nextOffset = offset + chunk.length;
    sendResponse({
      ok: true,
      chunk,
      offset,
      nextOffset,
      total: item.text.length,
      done: nextOffset >= item.text.length
    });
    return undefined;
  }

  if (message.type === 'http.releaseLarge') {
    largeResponses.delete(String(message.id || ''));
    sendResponse({ ok: true });
    return undefined;
  }

  if (message.type === 'bot.inject') {
    const tabId = _sender && _sender.tab && _sender.tab.id;
    const frameId = _sender && Number.isInteger(_sender.frameId) ? _sender.frameId : 0;
    if (typeof tabId !== 'number') {
      sendResponse({ ok: false, error: 'Missing tab id' });
      return undefined;
    }

    const target = { tabId, frameIds: [frameId] };
    Promise.all([
      chrome.scripting.executeScript({ target, files: ['page-dialog-bridge.js'], world: 'MAIN' }),
      chrome.scripting.executeScript({ target, files: ['auto_elearning_bot.js'], world: 'ISOLATED' })
    ])
      .then(() => sendResponse({ ok: true }))
      .catch((error) => sendResponse({ ok: false, error: String(error && error.message || error) }));
    return true;
  }

  if (message.type === 'tabs.open') {
    const url = String(message.url || '');
    if (!isSafeTabUrl(url)) {
      sendResponse({ ok: false, error: 'Invalid URL' });
      return undefined;
    }
    chrome.tabs.create({ url, active: message.active !== false }, () => sendResponse({ ok: !chrome.runtime.lastError }));
    return true;
  }

  if (message.type === 'auth.changed') {
    sendActiveTabMessage({ type: 'auth.changed' });
    sendResponse({ ok: true });
    return undefined;
  }

  return undefined;
});
