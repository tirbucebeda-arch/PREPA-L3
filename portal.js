(() => {
  'use strict';

  const SESSION_KEY = 'revision-hub-session-v1';
  const ACCOUNTS = Array.isArray(window.UNIFIED_SITE_ACCOUNTS) ? window.UNIFIED_SITE_ACCOUNTS : [];
  const $ = id => document.getElementById(id);
  const normalizeCode = value => String(value || '').trim().replace(/\s+/g, '').toUpperCase();

  function safeSet(storage, key, value) {
    try {
      storage.setItem(key, value);
      return true;
    } catch (_) {
      return false;
    }
  }

  function safeGet(storage, key) {
    try {
      return storage.getItem(key);
    } catch (_) {
      return null;
    }
  }

  function safeRemove(storage, key) {
    try { storage.removeItem(key); } catch (_) {}
  }

  function accountCodes(account) {
    const values = [account && account.code, ...(Array.isArray(account && account.codeAliases) ? account.codeAliases : [])];
    return [...new Set(values.map(normalizeCode).filter(Boolean))];
  }

  function findAccount(code) {
    const normalized = normalizeCode(code);
    return ACCOUNTS.find(account => accountCodes(account).includes(normalized)) || null;
  }

  function makeSession(account, requestedCode = '') {
    return {
      code: accountCodes(account).includes(normalizeCode(requestedCode)) ? normalizeCode(requestedCode) : normalizeCode(account.code),
      name: account.name || account.nom || account.code,
      id: Number(account.id) || null
    };
  }

  function saveSession(account, requestedCode = '') {
    const session = makeSession(account, requestedCode);
    const payload = JSON.stringify(session);

    // Une seule session persistante, commune à tous les espaces.
    safeSet(localStorage, SESSION_KEY, payload);
    return session;
  }

  function readStoredSession() {
    const raw = safeGet(localStorage, SESSION_KEY);
    try {
      const data = JSON.parse(raw || 'null');
      if (!data || !data.code) return null;
      const account = findAccount(data.code);
      return account ? makeSession(account, data.code) : null;
    } catch (_) {
      return null;
    }
  }

  function clearAllSessions() {
    safeRemove(localStorage, SESSION_KEY);
    safeRemove(sessionStorage, SESSION_KEY);
    safeRemove(localStorage, 'unified-site-session-v1');
    safeRemove(localStorage, 'quizPromoSession');
    safeRemove(sessionStorage, 'sp-site-access-v3');
    safeRemove(sessionStorage, 'sp-site-account-v3');
  }

  function showChoice(session) {
    $('loginPanel').classList.add('hidden');
    $('choicePanel').classList.remove('hidden');
    $('studentName').textContent = session.name || 'Étudiant(e)';
    $('studentCode').textContent = `Code : ${session.code}`;
  }

  function showLogin() {
    $('choicePanel').classList.add('hidden');
    $('loginPanel').classList.remove('hidden');
    $('portalCode').value = '';
    $('portalError').textContent = '';
    requestAnimationFrame(() => $('portalCode').focus());
  }

  function prepareAndOpen(event) {
    const link = event.currentTarget;
    const target = link.dataset.target || link.getAttribute('href');
    const session = readStoredSession();

    if (!session) {
      event.preventDefault();
      showLogin();
      $('portalError').textContent = 'Aucune session active. Entre ton code.';
      return;
    }

    event.preventDefault();
    safeSet(localStorage, SESSION_KEY, JSON.stringify(session));

    // Tous les espaces lisent maintenant la même session commune.

    const destination = new URL(target, document.baseURI).href;
    window.location.assign(destination);
  }

  $('portalLoginForm').addEventListener('submit', event => {
    event.preventDefault();
    const code = normalizeCode($('portalCode').value);
    if (!code) {
      $('portalError').textContent = "Entre ton code d’accès.";
      $('portalCode').focus();
      return;
    }

    const account = findAccount(code);
    if (!account) {
      $('portalError').textContent = 'Code incorrect ou non autorisé.';
      $('portalCode').value = '';
      $('portalCode').focus();
      return;
    }

    const session = saveSession(account, code);
    showChoice(session);
  });

  document.querySelectorAll('.site-card[data-target]').forEach(link => {
    link.addEventListener('click', prepareAndOpen);
  });

  $('portalLogout').addEventListener('click', () => {
    clearAllSessions();
    showLogin();
  });

  const existing = readStoredSession();
  if (existing) {
    const refreshed = saveSession(existing);
    showChoice(refreshed);
  } else {
    showLogin();
  }
})();
