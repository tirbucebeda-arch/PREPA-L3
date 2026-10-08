// Liaison du Quiz Promo P8 avec l'unique session du portail.
(() => {
  'use strict';

  function addHubControls() {
    if (document.getElementById('hub-switch-site')) return;
    const header = document.querySelector('.app-header');
    if (!header) return;

    const switchLink = document.createElement('a');
    switchLink.id = 'hub-switch-site';
    switchLink.href = 'index.html';
    switchLink.textContent = 'Choisir un autre site';
    switchLink.style.cssText = 'display:inline-block;margin-top:10px;padding:9px 12px;border-radius:10px;background:#fff;color:#0c4a6e;text-decoration:none;font-weight:800;';

    const logout = document.createElement('button');
    logout.type = 'button';
    logout.textContent = 'Déconnexion';
    logout.style.cssText = 'margin-left:8px;padding:9px 12px;border:1px solid rgba(255,255,255,.7);border-radius:10px;background:transparent;color:#fff;font-weight:800;cursor:pointer;';
    logout.addEventListener('click', () => {
      if (window.RevisionHub) RevisionHub.clearSession();
      location.replace('index.html');
    });

    const wrap = document.createElement('div');
    wrap.appendChild(switchLink);
    wrap.appendChild(logout);
    header.appendChild(wrap);

    const backButton = document.getElementById('back-subjects-btn');
    if (backButton) {
      backButton.textContent = '← Choisir un autre site';
      backButton.addEventListener('click', event => {
        event.preventDefault();
        event.stopImmediatePropagation();
        location.href = 'index.html';
      }, true);
    }

    const originalLogout = document.getElementById('logout-btn');
    if (originalLogout) {
      originalLogout.addEventListener('click', event => {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (window.RevisionHub) RevisionHub.clearSession();
        location.replace('index.html');
      }, true);
    }
  }

  function connectFromHub() {
    addHubControls();
    const session = window.RevisionHub && RevisionHub.getSession();
    if (!session) {
      location.replace('index.html');
      return;
    }
    // restoreSession() appartient au Quiz et restaure directement l'espace étudiant.
    if (typeof restoreSession === 'function') restoreSession();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', connectFromHub, { once: true });
  } else {
    connectFromHub();
  }
})();
