export const playerAccessCopy = {
  playerSearchLabel: ['Email, player ID or save reference', 'Courriel, numéro de joueur ou référence de favori'],
  playerAccessGrant: ['Suspend and restore player access', 'Suspendre et réactiver les comptes joueurs'],
  playerSearchEmpty: ['No player found.', 'Aucun joueur trouvé.'],
  playerSearchCount: ['Player accounts found', 'Comptes joueurs trouvés'],
  playerActive: ['Active', 'Actif'],
  playerSuspendedState: ['Suspended', 'Suspendu'],
  playerVerified: ['Verified email', 'Courriel vérifié'],
  playerUnverified: ['Unverified email', 'Courriel à vérifier'],
  playerSessions: ['Active sessions', 'Sessions actives'],
  playerSendRecovery: ['Send a recovery link', 'Envoyer un lien de récupération'],
  playerRecoverySent: ['Recovery email sent.', 'Courriel de récupération envoyé.'],
  playerRecoveryLocal: ['Recovery link generated in the local demo.', 'Lien de récupération créé dans la démo locale.'],
  playerRecoveryExpired: ['This request expired. Send a new link.', 'Cette demande a expiré. Envoyez un nouveau lien.'],
  playerSuspend: ['Suspend access', 'Suspendre l’accès'],
  playerRestore: ['Restore access', 'Réactiver l’accès'],
  playerConfirmSuspend: ['Confirm suspension', 'Confirmer la suspension'],
  playerConfirmRestore: ['Confirm restoration', 'Confirmer la réactivation'],
  playerCancel: ['Cancel', 'Annuler'],
  player_suspended: ['Access suspended', 'Accès suspendu'],
  player_restored: ['Access restored', 'Accès réactivé'],
  player_recovery_requested: ['Recovery link requested', 'Lien de récupération demandé'],
  playerAccessHistory: ['Access history', 'Historique des accès'],
  playerSaveHistory: ['First saves', 'Premiers ajouts aux favoris'],
  playerNoHistory: ['No staff actions yet.', 'Aucune intervention pour le moment.'],
  playerAccessConflict: ['Another operator changed this account. Review its current status.', 'Un collègue a modifié ce compte. Vérifiez son état actuel.'],
  playerSuspended: ['This account is suspended. Contact support.', 'Ce compte est suspendu. Contactez le soutien.'],
  playerNotFound: ['Player account not found.', 'Compte joueur introuvable.'],
  recoveryDeliveryUnavailable: ['Email delivery is unavailable. Try again later.', 'L’envoi de courriels est indisponible. Réessayez plus tard.']
};

export function createPlayerAccessUi({ api, t, element, action, canManage, locale }) {
  const byId = (id) => document.getElementById(id);
  const form = byId('coming-soon-save-search');
  const record = byId('player-record');
  const statusForm = byId('player-status-form');
  let matches = [];
  let player;
  let generation = 0;
  let operation = 0;
  let busy = false;
  let message = '';
  let searched = false;

  function render() {
    byId('player-search-status').textContent = searched
      ? (matches.length ? t('playerSearchCount') + ' · ' + matches.length : t('playerSearchEmpty')) : '';
    byId('player-matches').replaceChildren(...(matches.length > 1 ? matches : []).map((item) => {
      const line = element('li');
      line.append(action(item.email, () => open(item.id), 'ghost'));
      return line;
    }));
    record.hidden = !player;
    if (!player) return;
    const suspended = player.status === 'suspended';
    byId('player-record-title').textContent = player.email;
    byId('player-record-summary').textContent = ['player-' + player.id, t(suspended ? 'playerSuspendedState' : 'playerActive'),
      t(player.emailVerified ? 'playerVerified' : 'playerUnverified'), t('playerSessions') + ' · ' + player.activeSessions].join('　|　');
    const actions = byId('player-record-actions');
    actions.replaceChildren();
    if (!suspended) actions.append(action(t('playerSendRecovery'), () => change('recovery'), 'ghost'));
    if (canManage()) actions.append(action(t(suspended ? 'playerRestore' : 'playerSuspend'), () => {
      statusForm.hidden = false;
      statusForm.elements.reason.focus();
    }, 'ghost'));
    for (const button of actions.children) button.disabled = busy;
    byId('player-confirm-status').disabled = busy;
    byId('player-confirm-status').textContent = t(suspended ? 'playerConfirmRestore' : 'playerConfirmSuspend');
    byId('player-action-status').textContent = message ? t(message) : '';
    byId('player-events').replaceChildren(...(player.events.length ? player.events.map((event) => {
      const line = element('li');
      line.append(element('strong', t(event.action)), element('small',
        [new Date(event.createdAt).toLocaleString(locale()), event.actor, event.reason].filter(Boolean).join(' · ')));
      return line;
    }) : [element('li', t('playerNoHistory'))]));
  }

  function resetRecord() {
    ++operation;
    player = undefined;
    message = '';
    busy = false;
    statusForm.hidden = true;
    statusForm.reset();
    byId('player-event-details').open = false;
  }

  async function open(id) {
    const current = ++generation;
    resetRecord();
    render();
    try {
      const result = await api('admin/players/' + id, undefined, 'GET');
      if (current !== generation) return;
      player = result;
      render();
      byId('player-record-title').focus();
    } catch (error) {
      if (current === generation) byId('player-search-status').textContent = t(error.message);
    }
  }

  async function change(kind) {
    if (!player || busy) return;
    const id = player.id;
    const current = ++operation;
    const status = player.status === 'active' ? 'suspended' : 'active';
    busy = true;
    message = 'loading';
    render();
    let completed = false;
    try {
      const payload = kind === 'recovery' ? {} : { status, version: player.version, reason: statusForm.elements.reason.value.trim() };
      const result = await api('admin/players/' + id + '/' + kind, payload);
      if (current !== operation) return;
      message = kind === 'recovery' ? ({ local: 'playerRecoveryLocal', sent: 'playerRecoverySent', expired: 'playerRecoveryExpired' })[result.delivery]
        : (status === 'active' ? 'player_restored' : 'player_suspended');
      completed = true;
      statusForm.hidden = true;
      statusForm.reset();
    } catch (error) {
      if (current !== operation) return;
      message = error.message;
    }
    if (completed || message === 'playerAccessConflict') {
      try {
        const fresh = await api('admin/players/' + id, undefined, 'GET');
        if (current !== operation) return;
        player = fresh;
      } catch (error) {
        if (current !== operation) return;
        message = error.message;
        player = undefined;
        byId('player-search-status').textContent = t(message);
      }
    }
    busy = false;
    render();
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const current = ++generation;
    resetRecord();
    matches = [];
    searched = false;
    render();
    const query = form.elements.query.value.trim();
    if (!query) return;
    byId('player-search-status').textContent = t('loading');
    try {
      const rows = await api('admin/players?' + new URLSearchParams({ q: query }), undefined, 'GET');
      if (current !== generation) return;
      matches = rows;
      searched = true;
      render();
      if (matches.length === 1) await open(matches[0].id);
    } catch (error) {
      if (current === generation) byId('player-search-status').textContent = t(error.message);
    }
  });
  statusForm.addEventListener('submit', (event) => { event.preventDefault(); void change('access'); });
  byId('player-cancel-status').addEventListener('click', () => { statusForm.hidden = true; statusForm.reset(); });
  return { open, render, clear() {
    ++generation;
    matches = [];
    searched = false;
    resetRecord();
    render();
  } };
}
