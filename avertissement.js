(() => {
  'use strict';
  const LEGAL_ACK_KEY = 'revision-l3-legal-ack-v1';

  function addFloatingLink() {
    if (document.body?.classList.contains('legal-page-body')) return;
    if (document.querySelector('.legal-floating-link')) return;
    const link = document.createElement('a');
    link.className = 'legal-floating-link';
    link.href = 'droits-auteur.html';
    link.setAttribute('aria-label', "Consulter les droits d’auteur et l’avertissement");
    link.innerHTML = '🛡️ Droits d’auteur';
    document.body.appendChild(link);
  }

  function showInitialWarning() {
    const path = (location.pathname || '').toLowerCase();
    const isPortal = path.endsWith('/') || path.endsWith('/index.html') || path === '';
    if (!isPortal || localStorage.getItem(LEGAL_ACK_KEY) === '1') return;

    const backdrop = document.createElement('div');
    backdrop.className = 'legal-modal-backdrop';
    backdrop.setAttribute('role', 'dialog');
    backdrop.setAttribute('aria-modal', 'true');
    backdrop.setAttribute('aria-labelledby', 'legalModalTitle');
    backdrop.innerHTML = `
      <section class="legal-modal">
        <h2 id="legalModalTitle">Droits d’auteur et avertissement</h2>
        <p><strong>Cette plateforme est destinée uniquement à la révision éducative et pédagogique.</strong> Elle ne doit pas être revendue ni exploitée à des fins commerciales.</p>
        <p>Les sujets, exercices, cours, images et fichiers PDF appartiennent à leurs auteurs, enseignants, établissements, éditeurs ou propriétaires respectifs. Toute demande justifiée de retrait sera prise en compte.</p>
        <p>La structure, l’interface, le code original, l’organisation et les adaptations propres à la plateforme sont protégés. Leur copie, suppression des mentions, revente ou redistribution non autorisée est interdite.</p>
        <div class="legal-modal-actions">
          <a href="droits-auteur.html">Lire le texte complet</a>
          <button type="button" id="legalAcceptButton">J’ai compris</button>
        </div>
      </section>`;
    document.body.appendChild(backdrop);
    const button = document.getElementById('legalAcceptButton');
    button?.focus();
    button?.addEventListener('click', () => {
      localStorage.setItem(LEGAL_ACK_KEY, '1');
      backdrop.remove();
    });
  }

  function init() {
    addFloatingLink();
    showInitialWarning();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
