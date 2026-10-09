(() => {
  'use strict';
  const loginPanel = document.getElementById('loginPanel');
  const chooserPanel = document.getElementById('chooserPanel');
  const loginForm = document.getElementById('loginForm');
  const codeInput = document.getElementById('codeInput');
  const loginError = document.getElementById('loginError');
  const welcomeName = document.getElementById('welcomeName');
  const logoutButton = document.getElementById('logoutButton');

  function showLogin() {
    chooserPanel.classList.add('hidden');
    loginPanel.classList.remove('hidden');
    loginError.textContent = '';
    codeInput.value = '';
    requestAnimationFrame(() => codeInput.focus());
  }

  function showChooser(session) {
    loginPanel.classList.add('hidden');
    chooserPanel.classList.remove('hidden');
    welcomeName.textContent = session.name || 'Étudiant';
  }

  loginForm.addEventListener('submit', event => {
    event.preventDefault();
    const code = codeInput.value;
    if (!RevisionHub.normalizeCode(code)) {
      loginError.textContent = 'Saisissez votre code personnel.';
      codeInput.focus();
      return;
    }
    const account = RevisionHub.findAccount(code);
    if (!account) {
      loginError.textContent = 'Code incorrect ou non autorisé.';
      codeInput.value = '';
      codeInput.focus();
      return;
    }
    const session = RevisionHub.saveSession(account, code);
    loginError.textContent = '';
    showChooser(session);
  });

  logoutButton.addEventListener('click', () => {
    RevisionHub.clearSession();
    showLogin();
  });

  const session = RevisionHub.getSession();
  if (session) showChooser(session); else showLogin();

  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js?v=20261009-portails-sans-redirection-v14')
      .then(registration => registration.update())
      .catch(() => {});
  }
})();
