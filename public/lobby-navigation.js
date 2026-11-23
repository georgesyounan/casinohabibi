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
