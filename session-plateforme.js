// Authentification commune à tous les espaces de la plateforme.
(() => {
  'use strict';

  const HUB_SESSION_KEY = 'revision-hub-session-v1';
  const LEGACY_SESSION_KEY = 'unified-site-session-v1';

  const normalizeCode = value => String(value || '')
    .trim()
    .replace(/\s+/g, '')
    .toUpperCase();

  function safeParse(value) {
    try { return JSON.parse(value || 'null'); } catch (_) { return null; }
  }

  function getCreatedAccounts() {
    try {
      const rows = JSON.parse(localStorage.getItem('quizPromoCreatedStudents') || '[]');
      if (!Array.isArray(rows)) return [];
      return rows.map((row, index) => ({
        id: `local-${index}-${normalizeCode(row.code || row.matricule || row.id)}`,
        name: row.nom || row.nomPrenoms || row.name || row.fullName || 'Étudiant',
        phone: row.telephone || row.numero || row.phone || row.tel || '',
        code: normalizeCode(row.code || row.matricule || row.id)
      })).filter(row => row.code);
    } catch (_) {
      return [];
    }
  }

  function accountCodes(account) {
    const values = [account && account.code, ...(Array.isArray(account && account.codeAliases) ? account.codeAliases : [])];
    return [...new Set(values.map(normalizeCode).filter(Boolean))];
  }

  function accountHasCode(account, code) {
    const normalized = normalizeCode(code);
    return Boolean(normalized && accountCodes(account).includes(normalized));
  }

  function getAccounts() {
    const baseAccounts = Array.isArray(window.SHARED_SITE_ACCOUNTS)
      ? window.SHARED_SITE_ACCOUNTS
      : [];
    const map = new Map();
    [...baseAccounts, ...getCreatedAccounts()].forEach(account => {
      const code = normalizeCode(account.code);
      if (code && !map.has(code)) {
        const aliases = Array.isArray(account.codeAliases)
          ? [...new Set(account.codeAliases.map(normalizeCode).filter(alias => alias && alias !== code))]
          : [];
        map.set(code, { ...account, code, ...(aliases.length ? { codeAliases: aliases } : {}) });
      }
    });
    return Array.from(map.values());
  }

  function findAccount(code) {
    const normalized = normalizeCode(code);
    if (!normalized) return null;
    return getAccounts().find(account => accountHasCode(account, normalized)) || null;
  }

  function sessionFromAccount(account, previous = null, requestedCode = '') {
    const primaryCode = normalizeCode(account && account.code);
    if (!primaryCode) return null;
    const candidate = normalizeCode(requestedCode || (previous && previous.code));
    const sessionCode = accountHasCode(account, candidate) ? candidate : primaryCode;
    return {
      id: account.id || (previous && previous.id) || primaryCode,
      name: account.name || account.nom || account.nomPrenoms || (previous && previous.name) || 'Étudiant',
      phone: account.phone || account.telephone || (previous && previous.phone) || '',
      code: sessionCode,
      createdAt: Number(previous && previous.createdAt) || Date.now(),
      updatedAt: Date.now()
    };
  }

  function removeLegacySessions() {
    localStorage.removeItem(LEGACY_SESSION_KEY);
    localStorage.removeItem('quizPromoSession');
    sessionStorage.removeItem(LEGACY_SESSION_KEY);
    sessionStorage.removeItem('quizPromoSession');
    sessionStorage.removeItem('sp-site-access-v3');
    sessionStorage.removeItem('sp-site-account-v3');
  }

  function saveSession(account, requestedCode = '') {
    const previous = safeParse(localStorage.getItem(HUB_SESSION_KEY));
    const session = sessionFromAccount(account, previous, requestedCode);
    if (!session) return null;
    localStorage.setItem(HUB_SESSION_KEY, JSON.stringify(session));
    removeLegacySessions();
    return session;
  }

  function findLegacySession() {
    const unified = safeParse(localStorage.getItem(LEGACY_SESSION_KEY))
      || safeParse(sessionStorage.getItem(LEGACY_SESSION_KEY));
    if (unified && unified.code) return unified;

    const quizCode = normalizeCode(
      localStorage.getItem('quizPromoSession') || sessionStorage.getItem('quizPromoSession')
    );
    if (quizCode) return { code: quizCode };

    const spAccount = safeParse(sessionStorage.getItem('sp-site-account-v3'));
    if (spAccount) {
      const account = getAccounts().find(item => String(item.id) === String(spAccount.id));
      if (account) return { code: account.code };
    }
    return null;
  }

  function getSession() {
    try {
      let stored = safeParse(localStorage.getItem(HUB_SESSION_KEY));
      if (!stored || !stored.code) stored = findLegacySession();
      if (!stored || !stored.code) return null;

      const account = findAccount(stored.code);
      if (!account) return null;

      const refreshed = sessionFromAccount(account, stored, stored.code);
      localStorage.setItem(HUB_SESSION_KEY, JSON.stringify(refreshed));
      removeLegacySessions();
      return refreshed;
    } catch (_) {
      return null;
    }
  }

  function clearSession() {
    localStorage.removeItem(HUB_SESSION_KEY);
    sessionStorage.removeItem(HUB_SESSION_KEY);
    removeLegacySessions();
  }

  window.RevisionHub = Object.freeze({
    HUB_SESSION_KEY,
    normalizeCode,
    getAccounts,
    findAccount,
    saveSession,
    getSession,
    clearSession
  });
})();
