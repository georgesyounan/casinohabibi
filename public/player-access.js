import { showBreakPeriod } from './account-break.js';

export const playerAccessCopy = {
  playerSearchLabel: ['Email, player ID or reference', 'Courriel, numéro de joueur ou référence'],
  playerRounds: ['Demo round history', 'Historique des parties de démo'],
  playerNoRounds: ['No matching round.', 'Aucune partie correspondante.'],
  playerRewardHistory: ['Quests and rewards', 'Quêtes et récompenses'],
  roundSupport: ['Get help with this round', 'Aide sur cette partie'],
  playerFavoriteHistory: ['Favorite activity', 'Historique des favoris'],
  playerNoFavorites: ['No favorite activity yet.', 'Aucune activité de favoris.'],
  playerAddedFavorite: ['Added to favorites', 'Ajout aux favoris'],
  playerRemovedFavorite: ['Removed from favorites', 'Retrait des favoris'],
  playerOlder: ['Show older activity', 'Afficher les activités précédentes'],
  playerPrevious: ['Previous', 'Précédent'], playerNext: ['Next', 'Suivant'],
  favoriteRequestConflict: ['This request was already used for a different change.', 'Cette demande a déjà servi à une autre modification.'],
  playerAccessGrant: ['Suspend and restore player access', 'Suspendre et réactiver les comptes joueurs'],
  playerSearchEmpty: ['No player found.', 'Aucun joueur trouvé.'],
  playerSearchCount: ['Player accounts found', 'Comptes joueurs trouvés'],
  playerActive: ['Active', 'Actif'],
  playerSuspendedState: ['Suspended', 'Suspendu'],
  playerVerified: ['Verified email', 'Courriel vérifié'],
  playerUnverified: ['Unverified email', 'Courriel à vérifier'],
  playerSessions: ['Active sessions', 'Sessions actives'],
  playerSendRecovery: ['Send a recovery link', 'Envoyer un lien de récupération'],
  playerRecoverySending: ['The recovery email is being sent.', 'L’envoi du courriel de récupération est en cours.'],
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

export function createPlayerAccessUi({ api, t, element, action, canManage, locale, renderRound, supportHref }) {
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
  let activityQuery = '';
  let roundPage = 0;
  let roundCursors = [null];
  let roundRequest = 0;
  let breakTimer;
  let breakRequest = 0;

  function renderBreak() {
    const period = byId('player-record-break');
    period.hidden = !player.accountBreak;
    showBreakPeriod(period, player.accountBreak, t, locale());
  }
  async function refreshBreak() {
    if (!player || document.hidden || !record.getClientRects().length) return;
    const id = player.id;
    const request = ++breakRequest;
    try {
      const { accountBreak } = await api('admin/players/' + id + '/break', undefined, 'GET');
      if (request !== breakRequest || player?.id !== id) return;
      if (player.accountBreak?.endsAt === accountBreak?.endsAt && player.accountBreak?.startedAt === accountBreak?.startedAt) return;
      player.accountBreak = accountBreak;
      renderBreak();
    } catch (error) {
      if (request === breakRequest && ['staffAuth', 'staffForbidden', 'playerNotFound'].includes(error.message)) {
        resetRecord();
        render();
      }
    }
  }
  window.addEventListener('focus', refreshBreak);
  document.addEventListener('visibilitychange', refreshBreak);

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
    renderBreak();
    const cases=player.supportCases;
    byId('player-case-count').textContent=t('supportPlayerCases')+' · '+cases.total;
    byId('player-case-list').replaceChildren(...cases.tickets.map(ticket=>{
      const row=element('li');
      const link=element('a','case-'+ticket.id);
      link.href=supportHref('case',ticket.id);
      const state={open:'supportStatusOpen',answered:'supportStatusAnswered',closed:'supportStatusClosed'};
      row.append(link,element('small',[t(state[ticket.status]),ticket.reference].filter(Boolean).join(' · ')));
      return row;
    }));
    byId('player-case-all').href=supportHref('supportPlayer',player.id);
    byId('player-case-all').hidden=!cases.total;
    if (!cases.total) byId('player-case-list').append(element('li',t('supportNoInbox')));
    const earned=player.discovery||[];
    const list=byId('player-reward-list');
    list.replaceChildren(...earned.map(i=>{
      const line=element('li');line.textContent=[i.spec[locale()==='fr-CA'?'titleFr':'titleEn'],i.marks.length+'/'+i.goal,i.award && 'grant-'+i.award.grantId,i.award?.claimId && 'claim-'+i.award.claimId].filter(Boolean).join(' · ');return line;
    }));
    byId('player-reward-details').hidden=!earned.length;
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
    const rounds = player.rounds;
    byId('player-round-list').replaceChildren(...(rounds.entries.length
      ? rounds.entries.map(entry => renderRound(entry)) : [element('li', t('playerNoRounds'))]));
    byId('player-round-pages').hidden = !roundPage && !rounds.nextCursor;
    byId('player-round-prev').disabled = !roundPage;
    byId('player-round-next').disabled = !rounds.nextCursor;
    byId('player-round-page').textContent = 'Page ' + (roundPage + 1);
    const { entries, nextCursor } = player.savedActivity;
    byId('player-favorite-events').replaceChildren(...(entries.length ? entries.map((event) => {
      const row = element('li');
      row.append(element('strong', t(event.action === 'save' ? 'playerAddedFavorite' : 'playerRemovedFavorite') + ' · ' + event.slug),
        element('small', ['activity-' + event.id, 'save-' + event.saveId, new Date(event.createdAt).toLocaleString(locale()), event.duringAccountBreak && t('breakDuringSave')].filter(Boolean).join(' · ')));
      return row;
    }) : [element('li', t('playerNoFavorites'))]));
    byId('player-more-activity').hidden = !nextCursor;
    byId('player-events').replaceChildren(...(player.events.length ? player.events.map((event) => {
      const line = element('li');
      line.append(element('strong', t(event.action)), element('small',
        [new Date(event.createdAt).toLocaleString(locale()), event.actor, event.reason].filter(Boolean).join(' · ')));
      return line;
    }) : [element('li', t('playerNoHistory'))]));
  }

  function resetRecord() {
    ++breakRequest;
    clearInterval(breakTimer);
    ++operation;
    player = undefined;
    message = '';
    busy = false;
    statusForm.hidden = true;
    statusForm.reset();
    ++roundRequest;
    roundPage = 0;
    roundCursors = [null];
    byId('player-round-status').textContent = '';
    byId('player-round-details').open = false;
    byId('player-case-details').open = false;
    byId('player-reward-details').open = false;
    byId('player-event-details').open = false;
    byId('player-activity-details').open = false;
  }

  async function open(id, reference = '') {
    const current = ++generation;
    resetRecord();
    const ref = /^(activity|round)-([1-9]\d*)$/i.exec(reference);
    activityQuery = ref ? '?' + ref[1].toLowerCase() + '=' + ref[2] : '';
    render();
    try {
      const result = await api('admin/players/' + id + activityQuery, undefined, 'GET');
      if (current !== generation) return;
      player = result;
      breakTimer = setInterval(refreshBreak, 15_000);
      byId('player-activity-details').open = activityQuery.startsWith('?activity=');
      byId('player-round-details').open = activityQuery.startsWith('?round=');
      byId('player-reward-details').open = /^claim-[1-9]\d*$/i.test(reference);
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
      message = kind === 'recovery' ? ({ local: 'playerRecoveryLocal', sending: 'playerRecoverySending', sent: 'playerRecoverySent', expired: 'playerRecoveryExpired' })[result.delivery]
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
        const fresh = await api('admin/players/' + id + activityQuery, undefined, 'GET');
        if (current !== operation) return;
        ++roundRequest;
        roundPage = 0;
        roundCursors = [null];
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
      if (matches.length === 1) await open(matches[0].id, query);
    } catch (error) {
      if (current === generation) byId('player-search-status').textContent = t(error.message);
    }
  });
  statusForm.addEventListener('submit', (event) => { event.preventDefault(); void change('access'); });
  async function pageRounds(next) {
    const target = player;
    if (!target || next < 0 || (next > roundPage && !target.rounds.nextCursor)) return;
    const request = ++roundRequest;
    const cursor = next > roundPage ? target.rounds.nextCursor : roundCursors[next];
    const query = cursor ? '?beforeRound=' + cursor : '';
    for (const id of ['player-round-prev','player-round-next']) byId(id).disabled = true;
    byId('player-round-status').textContent = t('loading');
    try {
      const response = await api('admin/players/' + target.id + query, undefined, 'GET');
      if (request !== roundRequest || target !== player) return;
      roundCursors = [...roundCursors.slice(0,next), cursor];
      roundPage = next;
      target.rounds = response.rounds;
      byId('player-round-status').textContent = '';
    } catch (error) {
      if (request !== roundRequest || target !== player) return;
      byId('player-round-status').textContent = t(error.message);
    }
    render();
  }
  byId('player-round-prev').addEventListener('click', () => void pageRounds(roundPage - 1));
  byId('player-round-next').addEventListener('click', () => void pageRounds(roundPage + 1));
  byId('player-more-activity').addEventListener('click', async (event) => {
    const target = player;
    const cursor = target?.savedActivity.nextCursor;
    if (!cursor) return;
    const button = event.currentTarget;
    button.disabled = true;
    try {
      const result = await api('admin/players/' + target.id + '?beforeActivity=' + cursor, undefined, 'GET');
      if (target === player) {
        target.savedActivity.entries.push(...result.savedActivity.entries);
        target.savedActivity.nextCursor = result.savedActivity.nextCursor;
        render();
      }
    } catch (error) { if (target === player) byId('player-action-status').textContent = t(error.message); }
    finally { button.disabled = false; }
  });
  byId('player-cancel-status').addEventListener('click', () => { statusForm.hidden = true; statusForm.reset(); });
  return { open, render, clear() {
    ++generation;
    matches = [];
    searched = false;
    activityQuery = '';
    resetRecord();
    render();
  } };
}
