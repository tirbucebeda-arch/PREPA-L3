// Relais de session pour les sites ouverts depuis un dossier local (file://).
(() => {
  'use strict';
  // Keep local-folder navigation usable when the browser denies Web Storage.
  for (const storageName of ['localStorage', 'sessionStorage']) {
    try {
      const storage = window[storageName];
      storage.setItem('__revision_probe__', '1');
      storage.removeItem('__revision_probe__');
    } catch (_) {
      const values = new Map();
      const storage = {
        getItem: key => values.has(String(key)) ? values.get(String(key)) : null,
        setItem: (key, value) => values.set(String(key), String(value)),
        removeItem: key => values.delete(String(key)),
        clear: () => values.clear(),
        key: index => Array.from(values.keys())[index] || null,
        get length() { return values.size; }
      };
      try { Object.defineProperty(window, storageName, { configurable: true, value: storage }); } catch (_) {}
    }
  }
  const KEY = 'revision-hub-session-v1';
  const PARAM = 'hubSession';
  const parse = value => { try { return JSON.parse(value || 'null'); } catch (_) { return null; } };
  function encode(session) {
    try {
      const json = JSON.stringify({ code: String(session?.code || ''), name: String(session?.name || 'Étudiant'), phone: String(session?.phone || ''), createdAt: Number(session?.createdAt) || Date.now() });
      return btoa(unescape(encodeURIComponent(json))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
    } catch (_) { return ''; }
  }
  function decode(token) {
    try {
      const value = String(token || '').replace(/-/g, '+').replace(/_/g, '/');
      const json = decodeURIComponent(escape(atob(value + '='.repeat((4 - value.length % 4) % 4))));
      const session = JSON.parse(json);
      return session?.code ? session : null;
    } catch (_) { return null; }
  }
  const url = new URL(location.href);
  const incomingToken = url.searchParams.get(PARAM) || '';
  const incomingSession = decode(incomingToken);
  if (incomingSession) { try { localStorage.setItem(KEY, JSON.stringify(incomingSession)); } catch (_) {} }
  let stored = null;
  try { stored = parse(localStorage.getItem(KEY)); } catch (_) {}
  let session = incomingSession || stored;
  const token = incomingToken || encode(session);
  function getSession() {
    try { return parse(localStorage.getItem(KEY)) || session; } catch (_) { return session; }
  }
  function withSession(raw) {
    const target = new URL(raw, location.href);
    const current = getSession();
    if (current?.code) target.searchParams.set(PARAM, encode(current));
    return target.href;
  }
  window.RevisionSessionBridge = Object.freeze({ getSession, encode, token,
    clear: () => { session = null; },
    navigate: raw => { location.href = withSession(raw); }
  });
  document.addEventListener('click', event => {
    const link = event.target.closest?.('a[href]');
    if (!link) return;
    const raw = link.getAttribute('href') || '';
    if (!raw || raw.startsWith('#')) return;
    const target = new URL(raw, location.href);
    if (target.origin !== location.origin || !target.pathname.endsWith('.html')) return;
    link.href = withSession(raw);
  }, true);
  if (incomingToken && history.replaceState) {
    url.searchParams.delete(PARAM);
    try { history.replaceState(null, '', url.href); } catch (_) {}
  }
  function propagate() {
    if (!token) return;
    document.querySelectorAll('a[href]').forEach(link => {
      const raw = link.getAttribute('href') || '';
      if (!raw || raw.includes(PARAM + '=') || ['#', 'http:', 'https:', 'mailto:', 'tel:', 'javascript:'].some(prefix => raw.startsWith(prefix))) return;
      const file = raw.split('#')[0].split('?')[0].toLowerCase();
      if (!file.endsWith('.html')) return;
      try { const target = new URL(raw, location.href); target.searchParams.set(PARAM, token); link.href = target.href; } catch (_) {}
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', propagate, { once: true }); else propagate();
})();
