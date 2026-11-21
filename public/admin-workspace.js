export const adminWorkspaceCopy = {
  adminWorkspace: ['Back office', 'Administration'],
  adminViewLobby: ['View lobby', 'Voir le hall'],
  adminSection: ['Section', 'Section'],
  adminSectionNavigation: ['Back-office sections', 'Sections de l’administration'],
  adminSettings: ['Settings', 'Paramètres'],
  adminNavDashboard: ['Dashboard', 'Tableau de bord'],
  adminNavCatalogue: ['Game catalogue', 'Catalogue de jeux'],
  adminNavComingSoon: ['Coming Soon', 'À venir'],
  adminNavPlayers: ['Player activity', 'Activité des joueurs'],
  adminNavWebsite: ['Website content', 'Contenu du site'],
  adminNavStaff: ['Staff and permissions', 'Équipe et accès'],
  adminNavAudit: ['Audit log', 'Journal d’audit'],
  adminNavSecurity: ['My security', 'Ma sécurité'],
  adminProviderListings: ['Listings', 'Fiches'],
  adminImportCatalogue: ['Import', 'Importer'],
  adminProviderKeys: ['Provider keys', 'Clés API'],
  adminJsonExample: ['JSON example', 'Exemple JSON'],
  adminWebsiteBrand: ['Brand and contact', 'Image de marque et contact'],
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
  let currentView;
  let currentPanel;

  function canOpen(section) {
    return section && (!section.dataset.roles || section.dataset.roles.split(',').includes(role));
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

  function setRole(nextRole, focus = false) {
    role = nextRole;
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
