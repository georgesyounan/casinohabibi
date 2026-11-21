export const adminWorkspaceCopy = {
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

export function createAdminWorkspace(root, onOpen) {
  const views = [...root.querySelectorAll('[data-admin-view]')];
  const panels = [...root.querySelectorAll('[data-admin-panel]')];
  const destinations = new Map([...views, ...panels].map((section) => [section.id, section]));
  const links = [...root.querySelectorAll('[data-admin-link]')];
  const tabGroups = [...root.querySelectorAll('.admin-tabs')];
  const picker = root.querySelector('#admin-section-picker');
  let role;
  let permissions;
  let currentView;
  let currentPanel;

  function canOpen(section) {
    return section && (!section.dataset.roles || section.dataset.roles.split(',').includes(role)) &&
      (!section.dataset.permission || permissions[section.dataset.permission]);
  }

  function syncPicker() {
    if (!role) return;
    picker.replaceChildren(...links.filter((link) => link.hasAttribute('data-admin-primary') && !link.closest('li').hidden)
      .map((link) => new Option(link.textContent, link.hash.slice(1))));
    if (currentView) picker.value = currentView.id;
  }

  function focusCurrent() {
    (currentPanel || currentView)?.querySelector('[data-admin-heading]').focus({ preventScroll: true });
  }

  function showFromLocation(focus = false) {
    if (!role) return;
    const hash = location.hash.slice(1);
    const target = destinations.get(hash);
    const requestedView = target?.closest('[data-admin-view]');
    const allowed = canOpen(target) && canOpen(requestedView);
    const view = allowed ? requestedView : views[0];
    if (hash && !allowed) history.replaceState(null, '', '#' + view.id);
    const panel = allowed && target !== view ? target
      : panels.find((candidate) => candidate.closest('[data-admin-view]') === view && canOpen(candidate));
    const changedView = currentView !== view;
    const changed = changedView || currentPanel !== panel;
    currentView = view;
    currentPanel = panel;
    for (const node of views) node.hidden = node !== view;
    for (const node of panels) node.hidden = node !== panel;
    for (const link of links) {
      const active = [view.id, panel?.id].includes(link.hash.slice(1));
      if (active) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    }
    picker.value = view.id;
    if (focus && changed) {
      focusCurrent();
      if (changedView) window.scrollTo(0, 0);
      else (panel || view).scrollIntoView({ block: 'nearest' });
    }
    if (changed) onOpen(view.id, panel?.id);
  }

  function open(id, focus = true) {
    if (!role || !destinations.has(id)) return;
    const hash = '#' + id;
    if (location.hash !== hash) history.pushState(null, '', hash);
    showFromLocation(focus);
  }

  root.addEventListener('click', (event) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest('a[href^="#"]');
    if (!link || !destinations.has(link.hash.slice(1))) return;
    event.preventDefault();
    open(link.hash.slice(1));
  });
  picker.addEventListener('change', () => open(picker.value));
  window.addEventListener('hashchange', () => showFromLocation(true));

  function setRole(nextRole, grantedPermissions, focus = false) {
    role = nextRole;
    permissions = grantedPermissions;
    currentView = currentPanel = undefined;
    for (const node of root.querySelectorAll('[data-roles]:not([data-admin-view], [data-admin-panel])')) node.hidden = !canOpen(node);
    for (const link of links) {
      const target = destinations.get(link.hash.slice(1));
      const control = link.hasAttribute('data-admin-primary') ? link.closest('li') : link;
      control.hidden = !canOpen(target) || !canOpen(target.closest('[data-admin-view]'));
    }
    for (const tabs of tabGroups) tabs.hidden = tabs.querySelectorAll('a:not([hidden])').length < 2;
    syncPicker();
    showFromLocation(focus);
  }

  return { setRole, syncPicker, open, focusCurrent, isOpen: (id) => [currentView?.id, currentPanel?.id].includes(id) };
}
