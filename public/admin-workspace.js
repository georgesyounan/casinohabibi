export const adminWorkspaceCopy = {
  navOperations: ['Operations', 'Opérations'],
  navPublishing: ['Games & publishing', 'Jeux et contenu'],
  navRetention: ['Engagement', 'Fidélisation'],
  navAdministration: ['Administration', 'Administration'],
  navFind: ['Find a tool', 'Rechercher un outil'],
  navClose: ['Close search', 'Fermer la recherche'],
  navSearchHint: ['Search modules and tools…', 'Chercher un module ou un outil…'],
  navMatchCount: ['Tools found · {n}', 'Outils trouvés · {n}'],
  navNoMatches: ['No matching tools. Try another term.', 'Aucun outil trouvé. Essayez un autre mot.'],
  navAccount: ['Staff account', 'Compte du personnel'],
  navTool: ['Tool', 'Outil'],
  navSummary: ['Overview', 'Aperçu'],
  navReports: ['Detailed reports', 'Rapports détaillés'],
  navQuick: ['Quick actions', 'Accès rapides'],
  navFindPlayer: ['Find a player', 'Rechercher un joueur'],
  navOpenWallet: ['Open the test cashier', 'Ouvrir la caisse de test'],
  navSupportQueue: ['Open support inbox', 'Traiter les demandes'],
  navManageCatalogue: ['Manage game catalogue', 'Gérer le catalogue'],
  navRounds: ['rounds', 'parties'],
  navRefresh: ['Refresh', 'Actualiser'],
  adminWorkspace: ['Back office', 'Administration'],
  adminViewLobby: ['View lobby', 'Voir le hall'],
  adminSection: ['Section', 'Section'],
  adminSectionNavigation: ['Back-office sections', 'Sections de l’administration'],
  adminSettings: ['Settings', 'Paramètres'],
  adminNavDashboard: ['Dashboard', 'Tableau de bord'],
  adminNavCatalogue: ['Game catalogue', 'Catalogue de jeux'],
  adminNavComingSoon: ['Coming Soon', 'À venir'],
  adminNavPlayers: ['Players', 'Joueurs'],
  adminNavWebsite: ['Website content', 'Contenu du site'],
  adminNavStaff: ['Staff and permissions', 'Équipe et accès'],
  adminNavAudit: ['Audit log', 'Journal d’audit'],
  adminNavSecurity: ['My security', 'Ma sécurité'],
  adminProviderListings: ['Listings', 'Fiches'],
  adminImportCatalogue: ['Import', 'Importer'],
  adminProviderKeys: ['Provider keys', 'Clés API'],
  adminJsonExample: ['JSON example', 'Exemple JSON'],
  adminWebsiteBrand: ['Brand and contact', 'Image de marque et contact'],
  adminWebsiteDisplay: ['Display and region', 'Affichage et région'],
  brandLanguages: ['Site languages', 'Langues du site'],
  brandDefaultLanguage: ['Default language', 'Langue par défaut'],
  brandLobbySections: ['Public sections', 'Sections publiques'],
  brandDisplayMarket: ['Display market', 'Marché d’affichage'],
  brandDisplayMarketHelp: ['Country or region code, such as CA or CA-QC. Leave blank for all markets.', 'Code de pays ou de région, comme CA ou CA-QC. Vide pour tous les marchés.'],
  brandReportingZone: ['Reporting time zone', 'Fuseau horaire des rapports'],
  staffPublishWebsite: ['Publish website content', 'Publier le contenu du site'],
  staffPublishCatalogue: ['Publish or archive catalogue titles', 'Publier ou archiver les titres du catalogue'],
  staffDraftOnly: ['You can save and preview drafts. A publisher makes them live.', 'Vous pouvez enregistrer et prévisualiser les brouillons. Un responsable autorisé les publie.'],
  staffReason: ['Reason for access change', 'Motif de la modification des accès'],
  staffReasonRequired: ['Enter a reason for the access change.', 'Saisissez un motif pour la modification des accès.'],
  staffRequestConflict: ['This request reference is already in use. Reload the section and try again.', 'Cette référence de demande est déjà utilisée. Rechargez la section et réessayez.'],
  configConflict: ['This version changed while you were editing. Reload the draft to review the latest version.', 'Cette version a changé pendant votre modification. Rechargez le brouillon pour consulter la version récente.'],
  auditDetails: ['Change details', 'Détails de la modification'],
  auditRecord: ['Record ID', 'Identifiant du dossier'],
  auditRevision: ['Revision', 'Révision'],
  auditFields: ['Changed fields', 'Champs modifiés'],
  auditTransition: ['Status', 'État'],
  auditReason: ['Reason', 'Motif'],
  adminWebsiteLobby: ['Lobby', 'Hall'],
  adminWebsitePolicies: ['Policies and footer', 'Politiques et pied de page'],
  adminDemoActivity: ['Demo activity and reports', 'Activité de la démo et rapports'],
  adminAddStaff: ['Add staff access', 'Ajouter un accès employé'],
  adminCloseEditor: ['Close editor', 'Fermer l’éditeur']
};

const searchAliases = {
  'coming-soon-saves': 'player joueur profil account search recherche',
  'support-inbox': 'support ticket aide assistance demandes clients',
  'review-subjects': 'kyc identité identité risques screening retrait dossier verification enquête',
  'review-cashier':
    'cashier caisse depot retrait paiement payment withdrawal deposit portefeuille wallet',
  'review-settings': 'kyc moyens paiement politique regles limites gateway routes',
  'engagement-campaigns': 'crm campagnes courriel email communications',
  'operator-shelves': 'hall lobby rayons selections featured planification',
  'operator-pilot': 'finance rapprochement settlement journal tests scenarios',
  'growth-partners': 'affiliate partenaires affiliation referral parrainage',
  'website-editorial': 'cms pages traductions translation guides contenu',
  'catalog-import': 'fournisseurs providers import jeux games',
  'staff-management': 'equipe permissions acces employes staff roles',
  'mfa-settings': '2fa mfa securite double authentification security',
  'overview-reports': 'csv rapport statistiques resultats suivi publication analytics',
};
const fold = (value) => value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();
const make = (tag, cls, text) => {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text) node.textContent = text;
  return node;
};

export function createAdminWorkspace(root, onOpen, t) {
  const views = [...root.querySelectorAll('[data-admin-view]')];
  const panels = [...root.querySelectorAll('[data-admin-panel]')];
  const destinations = new Map([...views, ...panels].map((node) => [node.id, node]));
  const links = [...root.querySelectorAll('[data-admin-link]')];
  const primary = links.filter((link) => link.hasAttribute('data-admin-primary'));
  const picker = root.querySelector('#admin-section-picker');
  const groups = [...root.querySelectorAll('.nav-group')];
  const dialog = root.querySelector('#admin-directory');
  const search = root.querySelector('#admin-directory-query');
  const results = root.querySelector('#admin-directory-results');
  const trigger = root.querySelector('#admin-directory-open');
  const account = root.querySelector('#admin-account-menu');
  const parentOf = (node) => node?.closest('[data-admin-view]');
  const primaryFor = (view) => primary.find((link) => link.hash.slice(1) === view.id);
  const groupName = (link) => link.closest('.nav-group').querySelector('p').textContent;
  const localPickers = new Map();
  let role,
    permissions = {},
    currentView,
    currentPanel,
    returnTo,
    entries = [];

  function allowed(node) {
    return Boolean(
      node &&
        (!node.dataset.roles || node.dataset.roles.split(',').includes(role)) &&
        (!node.dataset.permission || permissions[node.dataset.permission]),
    );
  }
  function available(node) {
    return allowed(node) && allowed(parentOf(node));
  }

  for (const view of views) {
    const nav = view.querySelector('nav:has(a[data-admin-link])');
    if (!nav) continue;
    const label = make('label', 'local-picker');
    const name = make('span');
    name.dataset.copy = 'navTool';
    const select = make('select');
    select.dataset.toolsFor = view.id;
    label.append(name, select);
    nav.after(label);
    select.addEventListener('change', () => open(select.value));
    localPickers.set(view.id, { label, select, nav });
  }

  function updateContext() {
    if (!currentView) return;
    const link = primaryFor(currentView);
    root.querySelector('#admin-crumb-group').textContent = groupName(link);
    root.querySelector('#admin-crumb-view').textContent = link.textContent.trim();
    picker.value = currentView.id;
    const local = localPickers.get(currentView.id);
    if (local && currentPanel) local.select.value = currentPanel.id;
  }

  function updateDirectory() {
    const parts = fold(search.value).split(/\s+/).filter(Boolean);
    const found = parts.length
      ? entries.filter((entry) => parts.every((word) => entry.index.includes(word)))
      : entries.filter((entry) => entry.primary);
    const fragment = document.createDocumentFragment();
    for (const group of groups) {
      const matches = found.filter((entry) => entry.group === group);
      if (!matches.length) continue;
      const block = make('section', 'jump-group');
      block.append(make('h3', '', group.querySelector('p').textContent));
      for (const entry of matches) {
        const link = make('a', 'jump-result');
        link.href = '#' + entry.id;
        const icon = make('i', entry.icon);
        icon.setAttribute('aria-hidden', 'true');
        const label = make('span');
        label.append(make('strong', '', entry.title));
        if (!entry.primary) label.append(make('small', '', entry.parent));
        const arrow = make('i', 'ui-icon ico-next');
        arrow.setAttribute('aria-hidden', 'true');
        link.append(icon, label, arrow);
        block.append(link);
      }
      fragment.append(block);
    }
    results.replaceChildren(fragment);
    const status = root.querySelector('#admin-directory-status');
    status.textContent = !parts.length
      ? ''
      : found.length
        ? t('navMatchCount').replace('{n}', String(found.length))
        : t('navNoMatches');
    results.scrollTop = 0;
  }

  function syncPicker() {
    if (!role) return;
    const options = [];
    for (const group of groups) {
      const list = primary.filter(
        (link) =>
          link.closest('.nav-group') === group && available(destinations.get(link.hash.slice(1))),
      );
      group.hidden = list.length === 0;
      if (!list.length) continue;
      const groupOption = document.createElement('optgroup');
      groupOption.label = group.querySelector('p').textContent;
      groupOption.append(...list.map((link) => new Option(link.textContent.trim(), link.hash.slice(1))));
      options.push(groupOption);
    }
    picker.replaceChildren(...options);
    entries = links
      .filter((link) => available(destinations.get(link.hash.slice(1))))
      .map((link) => {
        const id = link.hash.slice(1),
          view = parentOf(destinations.get(id)),
          top = primaryFor(view);
        const title = link.textContent.trim(),
          parent = top.textContent.trim();
        return {
          id,
          title,
          parent,
          group: top.closest('.nav-group'),
          primary: top === link,
          icon: top.querySelector('.ui-icon').className,
          index: fold([title, parent, id, searchAliases[id] || ''].join(' ')),
        };
      });
    for (const [view, local] of localPickers) {
      const eligible = [...local.nav.querySelectorAll('[data-admin-link]')].filter((link) =>
        available(destinations.get(link.hash.slice(1))),
      );
      local.select.replaceChildren(
        ...eligible.map((link) => new Option(link.textContent.trim(), link.hash.slice(1))),
      );
      local.label.hidden = local.nav.hidden = eligible.length < 2;
      local.nav.classList.toggle('many-tools', eligible.length > 4);
    }
    search.placeholder = t('navSearchHint');
    trigger.querySelector('kbd').textContent = /Mac|iPhone|iPad/.test(navigator.platform)
      ? '⌘ K'
      : 'Ctrl K';
    updateContext();
    if (dialog.open) updateDirectory();
  }

  function focusCurrent() {
    (currentPanel || currentView)?.querySelector('[data-admin-heading]')?.focus({ preventScroll: true });
  }
  function showFromLocation(focus = false) {
    if (!role) return;
    const hash = location.hash.slice(1),
      target = destinations.get(hash);
    const accessible = available(target);
    const view = accessible ? parentOf(target) : views.find(allowed);
    if (hash && !accessible) history.replaceState(null, '', '#' + view.id);
    const reportShortcut =
      view.id === 'overview' &&
      (!hash || hash === 'overview') &&
      new URLSearchParams(location.search).get('report') === 'rounds';
    const panel =
      accessible && target !== view
        ? target
        : reportShortcut
          ? destinations.get('overview-reports')
          : panels.find((node) => parentOf(node) === view && allowed(node));
    const changed = currentView !== view || currentPanel !== panel;
    currentView = view;
    currentPanel = panel;
    for (const node of views) node.hidden = node !== view;
    for (const node of panels) node.hidden = node !== panel;
    for (const link of links) {
      if ([view.id, panel?.id].includes(link.hash.slice(1))) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    }
    updateContext();
    if (changed) onOpen(view.id, panel?.id);
    if (focus) {
      focusCurrent();
      window.scrollTo(0, 0);
    }
  }
  function open(id, focus = true) {
    if (!role || !destinations.has(id)) return;
    if (dialog.open) dialog.close();
    returnTo = null;
    account.open = false;
    if (location.hash !== '#' + id) history.pushState(null, '', '#' + id);
    showFromLocation(focus);
  }
  function openDirectory() {
    if (!role || root.hidden || dialog.open || document.querySelector('dialog[open]')) return;
    returnTo = document.activeElement === document.body ? trigger : document.activeElement;
    account.open = false;
    search.value = '';
    updateDirectory();
    dialog.showModal();
    search.focus();
  }

  function dismissDirectory() {
    if (!dialog.open) return;
    dialog.close();
    if (returnTo?.isConnected) returnTo.focus({ preventScroll: true });
    returnTo = null;
  }

  root.addEventListener('click', (event) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    const link = event.target.closest('a[href^="#"]');
    if (!link || !destinations.has(link.hash.slice(1))) return;
    event.preventDefault();
    open(link.hash.slice(1));
  });
  picker.addEventListener('change', () => open(picker.value));
  trigger.addEventListener('click', openDirectory);
  search.addEventListener('input', updateDirectory);
  root.querySelector('#admin-directory-close').addEventListener('click', dismissDirectory);
  dialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    dismissDirectory();
  });
  dialog.addEventListener('click', (event) => {
    if (event.target !== dialog) return;
    const box = dialog.getBoundingClientRect();
    if (
      event.clientX < box.left ||
      event.clientX > box.right ||
      event.clientY < box.top ||
      event.clientY > box.bottom
    )
      dismissDirectory();
  });
  dialog.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      dismissDirectory();
      return;
    }
    const items = [...results.querySelectorAll('a')];
    if (event.target === search && event.key === 'Enter' && items.length) {
      event.preventDefault();
      open(items[0].hash.slice(1));
      return;
    }
    if (!['ArrowDown', 'ArrowUp'].includes(event.key) || !items.length) return;
    const i = items.indexOf(document.activeElement);
    event.preventDefault();
    if (event.key === 'ArrowUp' && i <= 0) search.focus();
    else items[Math.min(items.length - 1, event.key === 'ArrowDown' ? i + 1 : i - 1)].focus();
  });
  document.addEventListener('keydown', (event) => {
    if (!role || root.hidden) return;
    if (
      (event.metaKey || event.ctrlKey) &&
      !event.altKey &&
      event.key.toLowerCase() === 'k' &&
      !document.querySelector('dialog[open]')
    ) {
      event.preventDefault();
      openDirectory();
    } else if (event.key === 'Escape' && account.open) {
      account.open = false;
      account.querySelector('summary').focus();
    }
  });
  document.addEventListener('click', (event) => {
    if (account.open && !account.contains(event.target)) account.open = false;
  });
  window.addEventListener('hashchange', () => showFromLocation(true));

  function setRole(nextRole, grants, focus = false) {
    if (dialog.open) dialog.close();
    returnTo = null;
    account.open = false;
    role = nextRole;
    permissions = grants;
    currentView = currentPanel = undefined;
    for (const node of root.querySelectorAll('[data-roles]:not([data-admin-view],[data-admin-panel])'))
      node.hidden = !allowed(node);
    for (const link of links) {
      const control = link.hasAttribute('data-admin-primary') ? link.closest('li') : link;
      control.hidden = !available(destinations.get(link.hash.slice(1)));
    }
    syncPicker();
    showFromLocation(focus);
  }
  return {
    setRole,
    syncPicker,
    open,
    focusCurrent,
    isOpen: (id) => [currentView?.id, currentPanel?.id].includes(id),
  };
}
