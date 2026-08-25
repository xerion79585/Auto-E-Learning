/* global chrome */

(function () {
  'use strict';

  if (window.__AUTO_ELEARNING_EXTENSION_LOADER__) return;
  window.__AUTO_ELEARNING_EXTENSION_LOADER__ = true;

  const ACTIVATED_KEY = '_m2';
  const UID_KEY = '_uId';
  const ALLOWED_UID_KEY = '__auto_elearning_allowed_uid__';
  const ALLOWLIST_CACHE_KEY = '_b_c';
  const ALLOWLIST_CACHE_TIME_KEY = '_b_t';
  const CONFIG_CACHE_KEY = '__learning_helper_config__';
  const CONFIG_CACHE_TIME_KEY = '__learning_helper_config_time__';
  const CONFIG_CACHE_TTL_MS = 5 * 60 * 1000;
  const ALLOWLIST_CACHE_TTL_MS = 60 * 1000;
  const UID_WAIT_MS = 15000;

  const CONFIG_URL = 'https://raw.githubusercontent.com/xerion79585/Auto-E-Learning/main/extension/learning-helper-config.json';
  const DEFAULT_CONFIG = Object.freeze({
    schemaVersion: 1,
    configVersion: 'bundled',
    allowlistUrl: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRSnobSdJ4d_sETE43cvuxnjmNUQK25YU1aYVNHwrDk1lHCw5q_EiLuzY_e4AWkVJ5t6zXefnO68xYH/pub?output=csv',
    questionBankUrl: 'https://raw.githubusercontent.com/xerion79585/Auto-E-Learning/main/questions.json',
    recommendedCoursesSheetName: '推薦課程',
    features: {
      autoHang: true,
      autoExam: true,
      autoQuestionnaire: true
    }
  });

  let values = {};
  let runtimeConfig = DEFAULT_CONFIG;
  let started = false;
  let startPromise = null;
  let gmApisInstalled = false;
  const IS_TOP_FRAME = (() => {
    try {
      return window.top === window;
    } catch (_error) {
      return true;
    }
  })();

  function sendMessage(message) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(message, (response) => {
        const error = chrome.runtime.lastError;
        if (error) {
          reject(new Error(error.message));
          return;
        }
        resolve(response);
      });
    });
  }

  async function setValue(key, value) {
    values[key] = value;
    await sendMessage({ type: 'storage.set', key, value });
  }

  function getStatusElement() {
    let element = document.getElementById('__auto_elearning_extension_status__');
    if (element) return element;

    element = document.createElement('div');
    element.id = '__auto_elearning_extension_status__';
    Object.assign(element.style, {
      position: 'fixed',
      top: '12px',
      right: '12px',
      zIndex: '2147483647',
      maxWidth: '360px',
      padding: '10px 14px',
      color: '#1f2937',
      background: '#fff',
      border: '1px solid #cbd5e1',
      borderRadius: '8px',
      boxShadow: '0 4px 18px rgba(15, 23, 42, 0.18)',
      font: '14px/1.5 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    });
    (document.body || document.documentElement).appendChild(element);
    return element;
  }

  function addCacheBust(url) {
    return `${url}${url.includes('?') ? '&' : '?'}_=${Date.now()}`;
  }

  function showStatus(message, tone) {
    const element = getStatusElement();
    element.textContent = message;
    element.style.borderColor = tone === 'error' ? '#ef4444' : tone === 'success' ? '#22c55e' : '#cbd5e1';
    element.style.color = tone === 'error' ? '#991b1b' : tone === 'success' ? '#166534' : '#1f2937';
  }

  function removeStatus() {
    const element = document.getElementById('__auto_elearning_extension_status__');
    if (element) element.remove();
  }

  function installGmApis() {
    if (gmApisInstalled) return;
    gmApisInstalled = true;

    window.GM_getValue = function (key, fallback) {
      return Object.prototype.hasOwnProperty.call(values, key) ? values[key] : fallback;
    };

    window.GM_setValue = function (key, value) {
      void setValue(String(key), value);
    };

    async function materializeLargeResponse(result, request, isAborted) {
      const id = String(result.largeResponseId || '');
      let offset = 0;
      let responseText = '';
      try {
        while (offset < Number(result.largeResponseLength || 0)) {
          if (isAborted()) return null;
          const part = await sendMessage({
            type: 'http.readChunk',
            id,
            offset,
            length: 512 * 1024
          });
          if (!part || !part.ok) throw new Error(part && part.error || 'Large response read failed');
          responseText += String(part.chunk || '');
          offset = Number(part.nextOffset || offset + String(part.chunk || '').length);
          if (typeof request.onprogress === 'function') {
            request.onprogress({
              loaded: offset,
              total: Number(result.largeResponseLength || 0),
              lengthComputable: true
            });
          }
        }

        let response = responseText;
        if (String(request.responseType || '').toLowerCase() === 'json') {
          response = responseText ? JSON.parse(responseText) : null;
        }
        return Object.assign({}, result, {
          responseText,
          response,
          loaded: offset,
          total: offset
        });
      } finally {
        void sendMessage({ type: 'http.releaseLarge', id });
      }
    }

    window.GM_xmlhttpRequest = function (details) {
      let aborted = false;
      const request = details || {};
      const safeDetails = {
        method: request.method,
        url: request.url,
        headers: request.headers,
        data: request.data,
        responseType: request.responseType,
        timeout: request.timeout,
        anonymous: request.anonymous
      };

      sendMessage({ type: 'http.request', details: safeDetails })
        .then(async (result) => {
          if (aborted) return;
          if (result && result.ok) {
            if (result.largeResponseId) {
              result = await materializeLargeResponse(result, request, () => aborted);
              if (!result || aborted) return;
            } else if (typeof request.onprogress === 'function' && result.loaded) {
              request.onprogress({
                loaded: result.loaded,
                total: result.total || 0,
                lengthComputable: Boolean(result.total)
              });
            }
            if (typeof request.onreadystatechange === 'function') {
              request.onreadystatechange(Object.assign({}, result, { readyState: 4 }));
            }
            if (typeof request.onload === 'function') request.onload(result);
          } else if (typeof request.onerror === 'function') {
            request.onerror(result || { ok: false, error: 'Request failed' });
          }
        })
        .catch((error) => {
          if (!aborted && typeof request.onerror === 'function') request.onerror({ ok: false, error: error.message });
        });

      return {
        abort: function () {
          aborted = true;
        }
      };
    };

    window.GM_openInTab = function (url, options) {
      void sendMessage({ type: 'tabs.open', url: String(url || ''), active: !(options && options.active === false) });
      return { closed: false, close: function () {} };
    };
  }

  async function executeBot() {
    try {
      // The bot is always a file from this extension bundle. Remote data is
      // limited to validated JSON configuration and course/question data.
      window.__LEARNING_HELPER_CONFIG__ = runtimeConfig;
      const result = await sendMessage({ type: 'bot.inject' });
      if (!result || !result.ok) throw new Error(result && result.error || 'Bot injection failed');
      return true;
    } catch (error) {
      console.warn('[學習小幫手] unable to execute bot:', error);
      return false;
    }
  }

  function extractUid() {
    const element = document.querySelector('.co-username');
    if (!element || !element.textContent.trim()) return '';
    return element.textContent.trim().replace(/^平台識別碼：/, '').trim();
  }

  function getKnownUid() {
    const currentUid = extractUid();
    if (currentUid) return currentUid;
    const pageUrl = window.location.href.toLowerCase();
    if (pageUrl.includes('login') || pageUrl.includes('logout')) return '';
    return String(values[ALLOWED_UID_KEY] || values[UID_KEY] || '').trim();
  }

  function sleep(milliseconds) {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
  }

  async function waitForActivationInChildFrame() {
    const startedAt = Date.now();
    while (Date.now() - startedAt < UID_WAIT_MS) {
      const latest = await sendMessage({ type: 'storage.getAll' });
      values = latest && typeof latest === 'object' ? latest : {};
      if (String(values[ACTIVATED_KEY] || '') === '1') return true;
      await sleep(300);
    }
    return false;
  }

  async function waitForUid() {
    const startedAt = Date.now();
    while (Date.now() - startedAt < UID_WAIT_MS) {
      const currentUid = extractUid();
      if (currentUid) return currentUid;

      const latest = await sendMessage({ type: 'storage.getAll' });
      values = latest && typeof latest === 'object' ? latest : values;
      const knownUid = getKnownUid();
      if (knownUid) return knownUid;
      await sleep(300);
    }
    return getKnownUid();
  }

  function parseCsvLine(line) {
    const columns = [];
    let current = '';
    let quoted = false;
    for (let index = 0; index < line.length; index += 1) {
      const character = line[index];
      if (character === '"') {
        if (quoted && line[index + 1] === '"') {
          current += '"';
          index += 1;
        } else {
          quoted = !quoted;
        }
      } else if (character === ',' && !quoted) {
        columns.push(current);
        current = '';
      } else {
        current += character;
      }
    }
    columns.push(current);
    return columns;
  }

  function parseAllowlist(csv) {
    const rows = String(csv || '').replace(/^\uFEFF/, '').replace(/\r/g, '').split('\n');
    const list = [];
    for (let index = 1; index < rows.length; index += 1) {
      if (!rows[index].trim()) continue;
      const columns = parseCsvLine(rows[index]);
      const uid = String(columns[0] || '').trim();
      if (!uid) continue;
      list.push({
        uid,
        reason: String(columns[1] || '').trim(),
        date: String(columns[2] || '').trim()
      });
    }
    return list;
  }

  function parseCachedAllowlist() {
    if (Array.isArray(values[ALLOWLIST_CACHE_KEY])) return values[ALLOWLIST_CACHE_KEY];
    if (typeof values[ALLOWLIST_CACHE_KEY] !== 'string' || !values[ALLOWLIST_CACHE_KEY]) return [];
    try {
      const parsed = JSON.parse(values[ALLOWLIST_CACHE_KEY]);
      return Array.isArray(parsed) ? parsed : [];
    } catch (_error) {
      return [];
    }
  }

  async function request(details) {
    const result = await sendMessage({ type: 'http.request', details });
    if (!result || !result.ok) throw new Error(result && result.error || '網路請求失敗');
    return result;
  }

  function isAllowedConfigUrl(value, kind) {
    try {
      const url = new URL(String(value || ''));
      if (url.protocol !== 'https:') return false;
      if (kind === 'allowlist') {
        return url.hostname === 'docs.google.com' && url.pathname.startsWith('/spreadsheets/');
      }
      if (kind === 'questionBank') {
        return url.hostname === 'raw.githubusercontent.com'
          && url.pathname.startsWith('/xerion79585/Auto-E-Learning/')
          && url.pathname.endsWith('.json');
      }
      return false;
    } catch (_error) {
      return false;
    }
  }

  function getDefaultConfig() {
    return {
      schemaVersion: DEFAULT_CONFIG.schemaVersion,
      configVersion: DEFAULT_CONFIG.configVersion,
      allowlistUrl: DEFAULT_CONFIG.allowlistUrl,
      questionBankUrl: DEFAULT_CONFIG.questionBankUrl,
      recommendedCoursesSheetName: DEFAULT_CONFIG.recommendedCoursesSheetName,
      features: Object.assign({}, DEFAULT_CONFIG.features)
    };
  }

  function sanitizeConfig(candidate) {
    const source = candidate && typeof candidate === 'object' ? candidate : {};
    if (source.schemaVersion !== 1) return getDefaultConfig();
    const config = {
      schemaVersion: 1,
      configVersion: String(source.configVersion || DEFAULT_CONFIG.configVersion).slice(0, 80),
      allowlistUrl: isAllowedConfigUrl(source.allowlistUrl, 'allowlist') ? source.allowlistUrl : DEFAULT_CONFIG.allowlistUrl,
      questionBankUrl: isAllowedConfigUrl(source.questionBankUrl, 'questionBank') ? source.questionBankUrl : DEFAULT_CONFIG.questionBankUrl,
      recommendedCoursesSheetName: String(source.recommendedCoursesSheetName || DEFAULT_CONFIG.recommendedCoursesSheetName).slice(0, 100),
      features: {}
    };
    const sourceFeatures = source.features && typeof source.features === 'object' ? source.features : {};
    Object.keys(DEFAULT_CONFIG.features).forEach((key) => {
      config.features[key] = sourceFeatures[key] === undefined
        ? DEFAULT_CONFIG.features[key]
        : Boolean(sourceFeatures[key]);
    });
    return config;
  }

  function parseCachedConfig() {
    if (values[CONFIG_CACHE_KEY] && typeof values[CONFIG_CACHE_KEY] === 'string') {
      try {
        return sanitizeConfig(JSON.parse(values[CONFIG_CACHE_KEY]));
      } catch (_error) {}
    }
    return sanitizeConfig(DEFAULT_CONFIG);
  }

  async function getRuntimeConfig() {
    const cached = parseCachedConfig();
    const cacheTime = Number(values[CONFIG_CACHE_TIME_KEY] || 0);
    if (cacheTime && Date.now() - cacheTime < CONFIG_CACHE_TTL_MS) return cached;

    try {
      const response = await request({
        method: 'GET',
        url: addCacheBust(CONFIG_URL),
        headers: { 'Cache-Control': 'no-cache' },
        responseType: 'json'
      });
      if (response.status !== 200) throw new Error(`設定伺服器回應 ${response.status}`);
      if (!response.response || typeof response.response !== 'object' || response.response.schemaVersion !== 1) {
        throw new Error('設定檔格式無效');
      }
      const config = sanitizeConfig(response.response);
      await setValue(CONFIG_CACHE_KEY, JSON.stringify(config));
      await setValue(CONFIG_CACHE_TIME_KEY, Date.now());
      return config;
    } catch (_error) {
      return cached;
    }
  }

  async function getAllowlist(url) {
    const cached = parseCachedAllowlist();
    const cacheTime = Number(values[ALLOWLIST_CACHE_TIME_KEY] || 0);
    if (cached.length && Date.now() - cacheTime < ALLOWLIST_CACHE_TTL_MS) return cached;

    try {
      const response = await request({
        method: 'GET',
        url: addCacheBust(url),
        headers: { 'Cache-Control': 'no-cache' },
        responseType: 'text'
      });
      if (response.status !== 200) throw new Error(`白名單伺服器回應 ${response.status}`);
      const list = parseAllowlist(response.responseText);
      await setValue(ALLOWLIST_CACHE_KEY, JSON.stringify(list));
      await setValue(ALLOWLIST_CACHE_TIME_KEY, Date.now());
      return list;
    } catch (error) {
      // A recently-used cache keeps the extension usable during a temporary
      // outage, while an empty cache still blocks the bot completely.
      if (cached.length) return cached;
      throw error;
    }
  }

  async function ensureActivated() {
    if (String(values[ACTIVATED_KEY] || '') === '1') return true;

    const password = window.prompt('請輸入學習小幫手啟用密碼：');
    if (!password) return false;

    const result = await sendMessage({ type: 'auth.verify', password });
    if (!result || !result.valid) {
      window.alert('密碼錯誤');
      return false;
    }

    await setValue(ACTIVATED_KEY, '1');
    return true;
  }

  async function loadAndInjectBot() {
    await executeBot();
  }

  function isHomePage() {
    const path = window.location.pathname.replace(/\/+$/, '') || '/';
    if (path === '/' || path === '/index.php') return true;
    if (path !== '/mooc/index.php') return false;
    return !new URLSearchParams(window.location.search).has('ticket');
  }

  async function start() {
    if (started) return;
    started = true;
    try {
      values = await sendMessage({ type: 'storage.getAll' });
      if (!values || typeof values !== 'object') values = {};
      installGmApis();

      if (!IS_TOP_FRAME && String(values[ACTIVATED_KEY] || '') !== '1') {
        if (!(await waitForActivationInChildFrame())) {
          return;
        }
      }

      if (!(await ensureActivated())) {
        return;
      }

      runtimeConfig = await getRuntimeConfig();
      window.__LEARNING_HELPER_CONFIG__ = runtimeConfig;

      const uid = await waitForUid();
      if (!uid) {
        return;
      }
      await setValue(UID_KEY, uid);

      const allowlist = await getAllowlist(runtimeConfig.allowlistUrl);
      if (!allowlist.some((entry) => entry.uid === uid)) {
        await setValue(ALLOWED_UID_KEY, '');
        if (IS_TOP_FRAME) showStatus('此帳號不在允許名單內。', 'error');
        return;
      }
      await setValue(ALLOWED_UID_KEY, uid);
      removeStatus();
      await loadAndInjectBot();
    } catch (error) {
      console.warn('[學習小幫手] initialization failed:', error);
    }
  }

  chrome.runtime.onMessage.addListener((message) => {
    if (!message || message.type !== 'auth.changed') return;
    started = false;
    startPromise = start();
    void startPromise;
  });

  startPromise = start();
  void startPromise;
})();
