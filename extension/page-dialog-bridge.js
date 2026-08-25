(function () {
  'use strict';

  if (window.__BOT_PAGE_DIALOG_BRIDGE__) return;
  window.__BOT_PAGE_DIALOG_BRIDGE__ = true;

  const STORAGE_KEY = '__BOT_DIALOG_BYPASS_UNTIL_TS__';
  const PROP_KEY = '__BOT_DIALOG_BYPASS_UNTIL__';
  const TICKET_ATTR = 'data-bot-ticket';
  const CID_ATTR = 'data-bot-cid';

  function readGlobal(target, name) {
    try {
      const value = target && target[name];
      return value === undefined || value === null ? '' : String(value).trim();
    } catch (_error) {
      return '';
    }
  }

  function readUrlValue(target, name) {
    try {
      const href = target && target.location && target.location.href;
      return href ? String(new URL(href).searchParams.get(name) || '').trim() : '';
    } catch (_error) {
      return '';
    }
  }

  function exposeCourseContext() {
    let ticket = '';
    let cid = '';
    const targets = [window];
    try { if (window.parent && window.parent !== window) targets.push(window.parent); } catch (_error) {}
    try { if (window.top && !targets.includes(window.top)) targets.push(window.top); } catch (_error) {}

    for (const target of targets) {
      ticket = ticket || readGlobal(target, 'pTicket') || readUrlValue(target, 'ticket');
      cid = cid || readGlobal(target, 'cid') || readUrlValue(target, 'cid');
      if (ticket && cid) break;
    }

    const root = document.documentElement;
    if (!root) return;
    if (ticket) root.setAttribute(TICKET_ATTR, ticket);
    if (cid) root.setAttribute(CID_ATTR, cid);
  }

  function getUntil() {
    let stored = 0;
    let property = 0;
    try {
      stored = Number(sessionStorage.getItem(STORAGE_KEY) || '0');
    } catch (_error) {}
    try {
      property = Number(window[PROP_KEY] || 0);
    } catch (_error) {}
    return Math.max(stored, property);
  }

  function isActive() {
    return Date.now() < getUntil();
  }

  function patch(name, factory) {
    const originalKey = '__BOT_PAGE_ORIGINAL_' + name + '__';
    if (typeof window[name] !== 'function' || window[originalKey]) return;
    const original = window[name];
    window[originalKey] = original;
    window[name] = factory(original);
  }

  patch('alert', (original) => function (message) {
    if (isActive()) return;
    return original.call(this, message);
  });

  patch('confirm', (original) => function (message) {
    if (isActive()) return true;
    return original.call(this, message);
  });

  patch('prompt', (original) => function (message, defaultValue) {
    if (isActive()) return defaultValue || '';
    return original.call(this, message, defaultValue);
  });

  exposeCourseContext();
  let contextAttempts = 0;
  const contextTimer = setInterval(() => {
    exposeCourseContext();
    contextAttempts += 1;
    if (contextAttempts >= 40) clearInterval(contextTimer);
  }, 250);
})();
