import { catalogueCategories } from './catalog.js';

// Public labels used by both the first HTML response and the interactive lobby.
export const lobbyCopy = {
  ...catalogueCategories,
  lobby: ['Casino lobby', 'Hall du casino'],
  admin: ['Administration', 'Administration'],
  playSafely: ['Play safely', 'Jouer de façon responsable'],
  faqTitle: ['Frequently asked questions', 'Questions fréquentes'],
  termsLink: ['Terms', 'Conditions'],
  privacyLink: ['Privacy', 'Confidentialité'],
  supportContact: ['Contact support', 'Contacter le soutien'],
  homeExplore: ['Browse', 'Explorer'],
  homeAll: ['Casino lobby', 'Hall du casino'],
  homeLive: ['Live casino', 'Casino en direct'],
  homeLibrary: ['My library', 'Ma bibliothèque'],
  homeSpotlight: ['In the spotlight', 'À la une'],
  homePrev: ['Previous featured game', 'Jeu vedette précédent'],
  homeNext: ['Next featured game', 'Jeu vedette suivant'],
  homeOrder: ['Sort previews', 'Trier les aperçus'],
  homeFilters: ['Filters', 'Filtres'],
  joinHome: ['Join now', 'S’inscrire'],
  newHome: ['New releases', 'Nouveautés'],
  studioHome: ['Studios & providers', 'Studios et fournisseurs'],
  clubHome: ['Player club','Club des joueurs'],
  promoHome: ['Promotions','Promotions'],
  challengeHome: ['Challenges','Défis'],
  rewardHome: ['Rewards','Récompenses'],
  activityHome: ['Game activity','Activité des jeux'],
  inviteHome: ['Invite a friend','Inviter un ami'],
  helpHome: ['Guides & support','Guides et assistance'],
  homeOriginals: ['House games', 'Jeux maison'],
  homeProviders: ['Provider previews', 'Aperçus des fournisseurs'],
  homeSafer: ['Responsible play', 'Jeu responsable'],
  skipToContent: ['Skip to main content', 'Passer au contenu principal'],
  signin: ['Sign in', 'Se connecter'],
  sandbox: ['Play-money casino', 'Casino en argent fictif'],
  browse: ['Explore games', 'Explorer les jeux'],
  games: ['Casino games', 'Jeux de casino'],
  searchGames: ['Search the catalogue', 'Rechercher dans le catalogue'],
  searchCompact: ['Search', 'Recherche'],
  activityShortcut: ['Activity', 'Activité'],
  favorites: ['Favorites', 'Favoris'],
  recentGames: ['Recently played', 'Joués récemment'],
  featuredBadge: ['Featured', 'En vedette'],
  playNow: ['Play demo', 'Jouer à la démo']
};

const views = {
  sports: ['Sports demo', 'Sports en démo'],
  new: lobbyCopy.newHome,
  studios: lobbyCopy.studioHome,
  promotions: lobbyCopy.promoHome,
  activity: lobbyCopy.activityHome,
  invite: lobbyCopy.inviteHome,
  help: lobbyCopy.helpHome
};

export function lobbyView(value) {
  return Object.hasOwn(views, value) ? value : '';
}

export function viewTitle(view, french) {
  return views[view]?.[Number(french)] || '';
}

export const matches = [
  { id: 'marina', sport: 'football', teams: ['Marina FC', 'Atlas 04'], odds: [2.15, 3.2, 2.7] },
  { id: 'union', sport: 'football', teams: ['Union Nord', 'Rivage SC'], odds: [2.45, 3.1, 2.3] },
  { id: 'comets', sport: 'basketball', teams: ['Metro Comets', 'Port Waves'], odds: [1.78, 2.05] },
  { id: 'bears', sport: 'basketball', teams: ['North Bears', 'City Sparks'], odds: [1.92, 1.86] }
];

// Only the local fixture list, translated literals and validated selection indexes enter this markup.
export function sportsMarkup(french, sport = 'football', picks = new Map(), confirmed = false) {
  const local = (en, fr) => french ? fr : en;
  const price = new Intl.NumberFormat(french ? 'fr-CA' : 'en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const outcome = (m, i) => m.odds.length === 3 && i === 1 ? local('Draw', 'Nul') : m.teams[i === 0 ? 0 : 1];
  const tabs = [['football', 'Soccer'], ['basketball', 'Basketball']].map(([key, label]) =>
    `<button type="button" class="ghost" data-hub-control="${key}" aria-pressed="${sport === key}">${label}</button>`
  ).join('');
  const fixtures = matches.filter(m => m.sport === sport).map(m => {
    const markets = m.odds.map((odd, i) =>
      `<button type="button" class="ghost" data-hub-control="${m.id}-${i}" aria-pressed="${picks.get(m.id) === i}"><span>${outcome(m, i)}</span><strong>${price.format(odd)}</strong></button>`
    ).join('');
    return `<article class="hub-card fixture"><h2><span>${m.teams[0]}</span><small>${local('vs', 'c.')}</small><span>${m.teams[1]}</span></h2><p class="market-label">${local('Match result', 'Résultat du match')}</p><div class="hub-markets">${markets}</div></article>`;
  }).join('');
  const selections = [...picks].map(([id, i]) => {
    const m = matches.find(match => match.id === id);
    return `<div class="hub-slip-line"><span>${outcome(m, i)} · ${price.format(m.odds[i])}</span><button type="button" class="ghost" data-hub-control="remove-${id}" aria-label="${local('Remove', 'Retirer')} ${outcome(m,i)}">×</button></div>`;
  }).join('');
  const action = confirmed
    ? `<p class="hub-note" role="status" tabindex="-1">${local('Demo slip confirmed for this visit.', 'Coupon démo validé pour cette visite.')}</p>`
    : picks.size
      ? `<button type="button" data-hub-control="confirm">${local('Confirm practice slip', 'Valider le coupon démo')}</button>`
      : `<p class="hub-note">${local('Select a price to add a pick.', 'Sélectionnez une cote pour ajouter un choix.')}</p>`;
  return `<p class="hub-note">${local('Fictional fixtures and odds. Build a practice slip without using your balance.', 'Matchs et cotes fictifs. Composez un coupon d’entraînement sans utiliser votre solde.')}</p>
    <div class="hub-choices" aria-label="${local('Choose a sport', 'Choisir un sport')}">${tabs}</div>
    <div class="hub-sports"><div class="hub-list">${fixtures}</div><aside class="hub-card hub-slip"><h2>${local('Practice slip', 'Coupon démo')}<span class="slip-count" aria-hidden="true">${picks.size}</span></h2>${selections}${action}</aside></div>`;
}
