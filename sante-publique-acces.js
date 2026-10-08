// Santé publique utilise uniquement la session commune du portail.
(() => {
  'use strict';

  function addControls(account) {
    if (document.getElementById('hubSiteSwitch')) return;
    const container = document.querySelector('.toolbar, .nav-actions');
    if (!container) return;

    const badge = document.createElement('span');
    badge.className = 'access-user-badge';
    badge.textContent = account.name || 'Compte autorisé';
    badge.title = account.name || 'Compte autorisé';

    const switchLink = document.createElement('a');
    switchLink.id = 'hubSiteSwitch';
    switchLink.className = 'access-lock-button';
    switchLink.href = 'index.html';
    switchLink.textContent = 'Choisir un autre site';
    switchLink.style.textDecoration = 'none';

    const logout = document.createElement('button');
    logout.type = 'button';
    logout.className = 'access-lock-button';
    logout.textContent = 'Déconnexion';
    logout.addEventListener('click', () => {
      if (window.RevisionHub) RevisionHub.clearSession();
      location.replace('index.html');
    });

    container.appendChild(badge);
    container.appendChild(switchLink);
    container.appendChild(logout);
  }

  function unlockSite(account) {
    document.documentElement.classList.remove('access-pending');
    document.body.classList.remove('access-locked');
    const gate = document.getElementById('accessGate');
    if (gate) gate.remove();
    addControls(account);
    window.currentSiteAccount = { id: account.id, name: account.name, code: account.code };
    window.dispatchEvent(new CustomEvent('site-access-granted', { detail: window.currentSiteAccount }));
  }

  function initAccess() {
    const session = window.RevisionHub && RevisionHub.getSession();
    if (!session) {
      // Aucun deuxième formulaire de code : le portail reste l'unique point de connexion.
      location.replace('index.html');
      return;
    }
    const account = RevisionHub.findAccount(session.code) || session;
    unlockSite(account);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAccess, { once: true });
  } else {
    initAccess();
  }
})();
