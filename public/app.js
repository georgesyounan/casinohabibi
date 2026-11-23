import { createPlayerSignInUi, playerSignInCopy } from './player-signin-ui.js';
import { lobbyCopy, lobbyView, viewTitle } from './lobby-navigation.js';
import { casinoPageTitle } from './guide-metadata.js';
import { createReviewUi, reviewCopy } from './review-desk.js';
import { createPartnerUi, partnerLobbyCopy } from './partner-lobby.js';
import { createPublicShelf, createShelfEditor, createLobbySections, shelfCopy } from './lobby-shelves.js';
import { createPilotUi, pilotCopy } from './finance-pilot.js';
import { createOperatorUi, operatorCopy } from './operator-workflows.js';
import { providerCatalogCopy, createProviderCatalogUi } from './provider-catalog.js';
import { createSupportQueue } from './support-queue.js';
import { catalogueCategories, games, roundPreview, demoTitle, matchesCatalogue, normalizeCatalogueText } from './catalog.js';
import { comingSoonCopy, createComingSoonUi } from './coming-soon.js';
import { dashboardCopy, createReportUi } from './dashboard.js';
import { websiteContentCopy, createPublicWebsiteContent, createWebsiteEditor } from './website-content.js';
import { followupCopy, createPublicationFollowup } from './publication-followup.js';
import {createGiftMenu, giftLabel} from './gift-menu.js';
import { createEventBoard } from './lobby-events.js';
import { createClubHome } from './player-club.js';
import { discoveryCopy, createDiscoveryPlayer } from './discovery.js';
import {growthCopy,createGrowthPlayer} from './growth-player.js';
import {createGrowthAdmin} from './growth-admin.js';
import { createDiscoveryAdmin } from './discovery-admin.js';
import { accountBreakCopy, createBreakControls, showBreakPeriod } from './account-break.js';
import { playerAccessCopy, createPlayerAccessUi } from './player-access.js';
import { adminWorkspaceCopy, createAdminWorkspace } from './admin-workspace.js';

const appBasePath = document.documentElement.dataset.appBasePath;
const appPath = (path) => appBasePath + path;
const currentRoute = location.pathname.startsWith(appPath('/'))
  ? location.pathname.slice(appBasePath.length) : location.pathname;
const isAdminPage = currentRoute === '/admin';
const copy = {
  ...comingSoonCopy,...providerCatalogCopy,...operatorCopy,...pilotCopy,...shelfCopy,...partnerLobbyCopy,...reviewCopy,
  ...playerAccessCopy, ...playerSignInCopy,
  ...accountBreakCopy,
  ...discoveryCopy,...growthCopy,
  clubOfferChanged:['The daily offer has changed. Check its updated terms.','L’offre du jour a changé. Consultez les nouvelles conditions.'],
  club_daily_settings:['Daily demo bonus updated','Bonus quotidien démo modifié'],
  dailyDemoBonus:['Daily demo bonus','Bonus quotidien démo'],
  weeklyDrawPrize:['Weekly raffle prize','Prix du tirage hebdomadaire'],
  giftAccountChanged:['The active account has changed.','Le compte actif a changé.'],
  giftUnavailable:['This reward is currently unavailable.','Cette récompense est indisponible pour le moment.'],
  telegramClosed:['Telegram enrollment will open soon.','Les inscriptions Telegram ouvriront bientôt.'],
  telegramUnavailable:['Telegram could not confirm this request. Try again in a moment.','Telegram n’a pas pu confirmer la demande. Réessayez dans un instant.'],
  telegramSettings:['Check the bot token and the channel username or numeric ID.','Vérifiez le jeton du bot et le nom ou l’identifiant numérique du canal.'],
  telegramAdminNeeded:['Make the bot an administrator of this channel.','Donnez au bot le rôle d’administrateur du canal.'],
  telegramBotBusy:['Choose a dedicated bot. This one is already connected to another service.','Choisissez un bot dédié. Celui-ci est déjà relié à un autre service.'],
  telegramInviteNeeded:['Give the bot permission to invite members and provide a Telegram invite link for this chat.','Autorisez le bot à inviter des membres et activez un lien d’invitation Telegram pour ce canal.'],
  telegramBusy:['Telegram setup is in progress. Try again shortly.','La configuration Telegram est en cours. Réessayez dans un instant.'],
  telegramChanged:['The Telegram settings changed. Review the channel and save again.','Les paramètres Telegram ont changé. Vérifiez le canal, puis enregistrez.'],
  telegramLinkRequired:['Link your Telegram account before claiming the monthly bonus.','Associez votre compte Telegram avant de réclamer le bonus mensuel.'],
  telegramJoinRequired:['Join the Telegram channel, then verify and claim your bonus.','Rejoignez le canal Telegram, puis cliquez sur « Vérifier et réclamer ».'],
  telegramCodeInvalid:['Check the eight-digit code from the bot. Each code lasts ten minutes.','Vérifiez le code à huit chiffres reçu du bot. Chaque code est valide dix minutes.'],
  telegramAlreadyLinked:['This Telegram account is already linked to another player.','Ce compte Telegram est déjà associé à un autre joueur.'],
  clubDayChanged:['A new daily bonus is available. Refresh and claim it.','Un nouveau bonus quotidien est disponible. Actualisez pour le réclamer.'],
  supportLinkedRef: ['Related reference (optional)', 'Référence liée (facultative)'],
  ...dashboardCopy,
  ...websiteContentCopy,
  ...followupCopy,
  ...adminWorkspaceCopy,
  ...lobbyCopy,
  homeSafetyIntro: ['Manage your play time, set a demo wager limit or take a break.', 'Gérez votre temps de jeu, fixez une limite de mises fictives ou prenez une pause.'],

  primaryNav: ['Main navigation', 'Navigation principale'], footerNav: ['Footer links', 'Liens de pied de page'],

  signup: ['Create an account', 'Créer un compte'],
  account: ['My account', 'Mon compte'], logout: ['Sign out', 'Se déconnecter'],
  headline: ['Your seat at the table.', 'Votre place à la table.'],
  pageDescription: ['Explore the Northplay casino demo with simulated CAD credits. No deposits or withdrawals are available, and no external game providers are connected.', 'Découvrez la démo du casino Northplay avec des crédits fictifs en dollars canadiens. Aucun dépôt ni retrait n’est possible et aucun fournisseur de jeux externe n’est connecté.'],
  intro: ['Explore the game lobby and try a round with simulated CAD funds.', 'Explorez le hall et essayez une partie avec des fonds fictifs en dollars canadiens.'],
  infoLabel: ['Key information', 'À savoir'], cadDisplay: ['CAD currency display', 'Affichage en dollars canadiens'],
  twoLanguages: ['English and Canadian French', 'Anglais et français canadien'], simulatedOnly: ['Simulated play only', 'Jeu simulé seulement'],
  switchToFrench: ['Switch to French', 'Passer au français'], switchToEnglish: ['Switch to English', 'Passer à l’anglais'],
  lobbyEyebrow: ['The game library', 'La ludothèque'],
  gamesIntro: ['Try four built-in games with simulated funds. Imported provider listings are shown separately for the demo and are not playable.', 'Essayez quatre jeux intégrés avec des fonds fictifs. Les fiches de jeux provenant des fournisseurs sont présentées séparément dans la version de démonstration; elles ne sont pas jouables.'],
  simpleEyebrow: ['A clear, simple start', 'Un départ clair et simple'], simpleHeading: ['Your visit, at your pace.', 'Votre visite, à votre rythme.'],
  simpleIntro: ['A few straightforward steps to explore the demo lobby.', 'Quelques étapes simples pour découvrir le hall de démonstration.'],
  stepOneTitle: ['Create and verify your account', 'Créez et confirmez votre compte'], stepOneText: ['Verify your email to receive simulated starting credit and access account controls.', 'Confirmez votre adresse courriel pour recevoir des crédits fictifs et accéder aux contrôles du compte.'],
  stepTwoTitle: ['Try a demo game', 'Essayez un jeu de démonstration'], stepTwoText: ['Choose from four built-in simulated games. Imported provider listings are display-only examples.', 'Choisissez parmi quatre jeux simulés intégrés. Les fiches de fournisseurs importées servent uniquement d’exemples visuels.'],
  stepThreeTitle: ['Set your own pace', 'Choisissez votre rythme'], stepThreeText: ['Use the account controls to set a demo wager limit, take a short pause, or exclude your account.', 'Utilisez les contrôles du compte pour fixer une limite de mises fictives, faire une courte pause ou exclure votre compte.'],
  safetyEyebrow: ['Your account, your settings', 'Votre compte, vos paramètres'],
  safetyHeading: ['Play at a pace that feels right.', 'Jouez à un rythme qui vous convient.'],
  safetyIntro: ['These controls apply to simulated play only. This prototype does not accept deposits or withdrawals.', 'Ces contrôles s’appliquent uniquement au jeu simulé. Ce prototype n’accepte ni dépôts ni retraits.'],
  safetyCta: ['Sign in for account controls', 'Connectez-vous pour accéder aux contrôles'],
  accountControls: ['Open my account controls', 'Ouvrir les contrôles de mon compte'],
  breakTitle: ['Take a pause', 'Faites une pause'], breakText: ['Choose a break from 15 minutes to 30 days in your account.', 'Choisissez une pause de 15 minutes à 30 jours dans votre compte.'],
  limitTitle: ['Set a demo limit', 'Fixez une limite fictive'], limitText: ['Choose a daily cap for simulated wagers. The limit can only be lowered.', 'Choisissez une limite quotidienne de mises fictives. Vous pouvez seulement la réduire.'],
  excludeTitle: ['Exclude your account', 'Excluez votre compte'], excludeText: ['Self-exclusion blocks future sign-ins to this demo account and cannot be undone here.', 'L’autoexclusion bloque les prochaines connexions à ce compte de démonstration et ne peut pas être annulée ici.'],
  helpEyebrow: ['Good to know', 'À retenir'],
  faqBalanceQuestion: ['Can I withdraw my demo balance?', 'Puis-je retirer mon solde de démonstration?'],
  faqBalanceAnswer: ['No. The balance is simulated, has no cash value, and cannot be deposited or withdrawn.', 'Non. Le solde est fictif, n’a aucune valeur monétaire et ne peut être ni déposé ni retiré.'],
  faqGamesQuestion: ['Can I play games from external providers?', 'Puis-je jouer aux jeux de fournisseurs externes?'],
  faqGamesAnswer: ['Not in this demo. It includes four built-in simulated games you can play. Imported provider listings are for catalog preview only; no external games are connected or launched.', 'Pas dans cette version de démonstration. Elle comprend quatre jeux simulés intégrés auxquels vous pouvez jouer. Les fiches importées servent uniquement à prévisualiser le catalogue; aucun jeu externe n’est connecté ni lancé.'],
  faqSafetyQuestion: ['What account controls are available?', 'Quels contrôles sont offerts dans le compte?'],
  faqSafetyAnswer: ['You can set a daily limit for simulated wagers, pause demo play for 15 minutes, or self-exclude the account. These controls apply to this prototype account only.', 'Vous pouvez fixer une limite quotidienne de mises fictives, mettre le jeu en pause pendant 15 minutes ou exclure le compte. Ces contrôles s’appliquent uniquement au compte de ce prototype.'],
  faqEditorTitle: ['Lobby FAQ', 'FAQ du hall'], faqEditorHelp: ['Edit these three entries in both languages. Answers are limited to 500 characters.', 'Modifiez ces trois entrées dans les deux langues. Les réponses sont limitées à 500 caractères.'],

  policyLinksTitle: ['Policy links (optional)', 'Liens vers les politiques (facultatifs)'],
  termsUrlEn: ['Terms page URL · English', 'URL des conditions · anglais'], termsUrlFr: ['Terms page URL · Canadian French', 'URL des conditions · français canadien'],
  privacyUrlEn: ['Privacy page URL · English', 'URL de confidentialité · anglais'], privacyUrlFr: ['Privacy page URL · Canadian French', 'URL de confidentialité · français canadien'],
  policyUrlHelp: ['Optional. Enter a complete HTTPS URL. If only one language URL is set, it is used for both languages.', 'Facultatif. Saisissez une URL HTTPS complète. Si une seule URL est fournie, elle sera utilisée dans les deux langues.'],
  footerTextEnLabel: ['Footer disclaimer · English', 'Mention au pied de page · anglais'],
  footerTextFrLabel: ['Footer disclaimer · Canadian French', 'Mention au pied de page · français canadien'],
  footerTextTitle: ['Footer disclaimer', 'Mention au pied de page'],
  faqQuestionEn: ['Question · English', 'Question · anglais'], faqQuestionFr: ['Question · Canadian French', 'Question · français canadien'],
  faqAnswerEn: ['Answer · English', 'Réponse · anglais'], faqAnswerFr: ['Answer · Canadian French', 'Réponse · français canadien'],
  faqOne: ['FAQ entry 1', 'Entrée FAQ 1'], faqTwo: ['FAQ entry 2', 'Entrée FAQ 2'], faqThree: ['FAQ entry 3', 'Entrée FAQ 3'],
  all: ['All games', 'Tous les jeux'], ...catalogueCategories,
  browseAllGames: ['Browse all games', 'Parcourir tous les jeux'],
  clearGameSearch: ['Clear search', 'Effacer la recherche'],
  providerSortLabel: ['Sort preview listings', 'Trier les fiches de prévisualisation'], providerSortRecent: ['Recently added first', 'Ajouts récents en premier'], providerSortAlpha: ['Alphabetical', 'Ordre alphabétique'],
  demoCountOne: ['{n} playable demo', '{n} démo jouable'], demoCountMany: ['{n} playable demos', '{n} démos jouables'],
  previewCountOne: ['{n} preview', '{n} aperçu'], previewCountMany: ['{n} previews', '{n} aperçus'],
  addFavorite: ['Add {game} to favorites', 'Ajouter {game} aux favoris'], removeFavorite: ['Remove {game} from favorites', 'Retirer {game} des favoris'], noFavoriteGames: ['You have not saved any games yet.', 'Vous n’avez pas encore enregistré de jeux.'],
  favoritesLocal: ['Favorites saved in this browser.', 'Favoris enregistrés dans ce navigateur.'], favoritesSynced: ['Favorites saved to your account.', 'Favoris enregistrés dans votre compte.'], favoriteSaveFailed: ['Could not sync favorites to your account. The change was reverted.', 'Impossible de synchroniser les favoris avec votre compte. Le changement a été annulé.'],
  disclaimer: ['Simulated funds only. No cash value.', 'Fonds fictifs uniquement. Aucune valeur monétaire.'],
  email: ['Email address', 'Adresse courriel'], password: ['Password (10 characters minimum)', 'Mot de passe (au moins 10 caractères)'],
  passwordReset: ['Forgot your password?', 'Mot de passe oublié?'], passwordResetTitle: ['Reset your password', 'Réinitialiser votre mot de passe'], passwordResetHelp: ['Enter your account email. If it matches an account, we will send reset instructions.', 'Saisissez le courriel de votre compte. Si une correspondance existe, nous enverrons les instructions de réinitialisation.'], passwordResetRequested: ['If an account matches that address, reset instructions have been sent.', 'Si une correspondance existe, les instructions de réinitialisation ont été envoyées.'], passwordResetSend: ['Send reset instructions', 'Envoyer les instructions'], passwordResetInvalid: ['This reset link is invalid or expired. Request a new one.', 'Ce lien de réinitialisation est invalide ou expiré. Demandez-en un nouveau.'], passwordResetComplete: ['Password reset. Sign in with your new password.', 'Mot de passe réinitialisé. Connectez-vous avec votre nouveau mot de passe.'], passwordResetSave: ['Set new password', 'Enregistrer le nouveau mot de passe'],
  emailVerification: ['Verify your email', 'Confirmer votre courriel'], emailVerificationHelp: ['Check your email for a verification link. It expires after 24 hours.', 'Consultez votre courriel pour ouvrir le lien de confirmation. Il expire après 24 heures.'], emailVerificationRequired: ['Verify your email before signing in. You can request another link below.', 'Confirmez votre courriel avant de vous connecter. Vous pouvez demander un nouveau lien ci-dessous.'], emailVerificationRequested: ['If this address has an unverified account, a verification link has been sent.', 'Si cette adresse correspond à un compte non confirmé, un lien de confirmation a été envoyé.'], emailVerificationSend: ['Resend verification email', 'Renvoyer le courriel de confirmation'], emailVerificationInvalid: ['This verification link is invalid or expired. Request a new one.', 'Ce lien de confirmation est invalide ou expiré. Demandez-en un nouveau.'], emailVerified: ['Email verified. You can now sign in.', 'Courriel confirmé. Vous pouvez maintenant vous connecter.'], emailVerificationSubmit: ['Verify email address', 'Confirmer le courriel'],
  passwordChangeTitle: ['Change password', 'Changer le mot de passe'], currentPassword: ['Current password', 'Mot de passe actuel'], newPassword: ['New password (10 characters minimum)', 'Nouveau mot de passe (au moins 10 caractères)'], confirmPassword: ['Confirm new password', 'Confirmer le nouveau mot de passe'], passwordMismatch: ['The new passwords do not match.', 'Les nouveaux mots de passe ne correspondent pas.'], passwordChanged: ['Password updated. Other sessions have been signed out.', 'Mot de passe modifié. Les autres sessions ont été fermées.'],
  balanceLabel: ['Simulated balance', 'Solde fictif'], history: ['Recent activity', 'Activité récente'],
  resetDemoBalance: ['Restore demo balance to $100 CAD', 'Rétablir le solde fictif à 100 $ CA'], confirmResetDemoBalance: ['Restore your simulated balance to $100 CAD? Your activity history and daily wager limit will be kept.', 'Rétablir votre solde fictif à 100 $ CA? Votre historique et votre limite quotidienne de mises seront conservés.'], demoBalanceReset: ['Demo balance restored to $100 CAD. Your activity history and daily wager usage were unchanged.', 'Solde fictif rétabli à 100 $ CA. Votre historique et vos mises quotidiennes demeurent inchangés.'], demoBalanceAlreadyAtStart: ['Your simulated balance is already $100 CAD.', 'Votre solde fictif est déjà de 100 $ CA.'], demoBalanceResetHistory: ['Demo balance restored to {balance}', 'Solde fictif rétabli à {balance}'], demoBalanceResetCsv: ['Demo balance reset', 'Réinitialisation du solde fictif'], demoBalanceResetCsvDetail: ['Restored to {balance}', 'Rétabli à {balance}'],
  dailyLimitProgress: ['Today’s demo wagers (UTC): {used} of {limit} · {remaining} remaining', 'Mises fictives aujourd’hui (UTC) : {used} sur {limit} · {remaining} restantes'], dailyLimitProgressLabel: ['Daily simulated wager limit progress', 'Progression vers la limite quotidienne de mises fictives'],
  preferredLanguage: ['Preferred language', 'Langue de préférence'], englishLanguage: ['English (Canada)', 'anglais (Canada)'], frenchLanguage: ['French (Canada)', 'français (Canada)'],
  savedLanguageLabel: ['Saved language', 'Langue enregistrée'],
  emailStatusLabel: ['Email status', 'État du courriel'], emailVerifiedStatus: ['Verified', 'Confirmé'], emailUnverifiedStatus: ['Not verified', 'Non confirmé'],
  accountProfileTitle: ['Player profile', 'Profil joueur'], displayName: ['Display name (optional)', 'Nom affiché (facultatif)'],
  welcomeBackName: ['Welcome back, {name}!', 'Bon retour, {name} !'],
  displayNameHelp: ['Up to 40 characters. This name is used only for this casino demo account.', 'Jusqu’à 40 caractères. Ce nom est utilisé uniquement pour ce compte de démonstration.'],
  displayNameCount: ['{count} of 40 characters', '{count} sur 40 caractères'],
  saveProfile: ['Save profile', 'Enregistrer le profil'], profileSaved: ['Profile saved.', 'Profil enregistré.'],
  accountSecurity: ['Account security', 'Sécurité du compte'], signOutOtherSessions: ['Sign out other sessions', 'Fermer les autres sessions'], confirmSignOutOtherSessions: ['Sign out of all other devices? This device will stay signed in.', 'Fermer toutes les autres sessions? Cet appareil restera connecté.'], sessionsRevoked: ['Other sessions signed out: {count}.', 'Autres sessions fermées : {count}.'], noOtherSessions: ['There were no other active sessions.', 'Aucune autre session active.'],
  changeEmail: ['Change email address', 'Changer l’adresse courriel'], emailChangeTitle: ['Update your email address', 'Modifier votre adresse courriel'], emailChangeHelp: ['Enter your new address and current password. We will send a confirmation link to the new address. Your current address stays active until you confirm.', 'Saisissez votre nouvelle adresse et votre mot de passe actuel. Nous enverrons un lien de confirmation à la nouvelle adresse. Votre adresse actuelle reste active jusqu’à la confirmation.'], emailChangeRequest: ['Send confirmation link', 'Envoyer le lien de confirmation'], emailChangeConfirmHelp: ['Confirm this email address change. The link expires after 24 hours.', 'Confirmez le changement d’adresse courriel. Le lien expire après 24 heures.'], emailChangeConfirm: ['Confirm new email address', 'Confirmer la nouvelle adresse courriel'], emailChangeRequested: ['Check your new email address for a confirmation link.', 'Consultez votre nouvelle adresse courriel pour le lien de confirmation.'], emailChangeComplete: ['Email address updated. Sign in using your new address.', 'Adresse courriel modifiée. Connectez-vous avec votre nouvelle adresse.'], emailChangeInvalid: ['This email change link is invalid or expired. Request a new one.', 'Ce lien de changement d’adresse est invalide ou expiré. Demandez-en un nouveau.'], emailUnchanged: ['That is already your current email address.', 'Cette adresse est déjà votre adresse actuelle.'], emailUnavailable: ['That email address is already in use or has a pending change.', 'Cette adresse est déjà utilisée ou un changement est en attente.'],
  communicationPreferences: ['Communication preferences', 'Préférences de communication'], marketingConsentText: ['I agree to receive casino news and promotional emails. I can withdraw consent at any time. This does not change essential account or security emails.', 'J’accepte de recevoir des nouvelles du casino et des courriels promotionnels. Je peux retirer mon consentement en tout temps. Cela ne change pas les courriels essentiels liés au compte ou à la sécurité.'], savePreferences: ['Save email preferences', 'Enregistrer les préférences de courriel'], consentSaved: ['Email preferences saved.', 'Préférences de courriel enregistrées.'],
  exportData: ['Download my account data', 'Télécharger mes données de compte'], exportDataHelp: ['Download a JSON copy of your profile, demo activity, safer-play settings, and support conversations.', 'Téléchargez une copie JSON de votre profil, de votre activité fictive, de vos paramètres de jeu responsable et de vos conversations avec le soutien.'], exportReady: ['Your account data download is ready.', 'Le téléchargement de vos données de compte est prêt.'], exportActivityCsv: ['Download activity as CSV', 'Télécharger l’activité en CSV'], exportCsvReady: ['Your activity CSV download is ready.', 'Le téléchargement CSV de votre activité est prêt.'],
  starter: ['Starting credit', 'Crédit de départ'], balanceChange: ['Balance change', 'Variation du solde'], loadOlderActivity: ['Load older activity', 'Charger l’activité précédente'], loadingActivity: ['Loading…', 'Chargement…'], close: ['Close', 'Fermer'],
  wager: ['Wager', 'Mise'], play: ['Play a demo round', 'Jouer une partie de démonstration'],
  simulation: ['Demo rounds use simulated funds only.', 'Les parties de démonstration utilisent uniquement des fonds fictifs.'],
  pickColor: ['Choose a colour', 'Choisissez une couleur'], red: ['Red', 'Rouge'], black: ['Black', 'Noir'], green: ['Green', 'Vert'],
  spinResult: ['The wheel landed on', 'La roulette s’est arrêtée sur'],
  won: ['Round won', 'Partie gagnée'], lost: ['Round lost', 'Partie perdue'], push: ['Tie · no change to your simulated balance', 'Égalité · votre solde fictif ne change pas'],
  reels: ['Reels', 'Symboles'], yourHand: ['Your cards', 'Vos cartes'], dealerHand: ['Dealer cards', 'Cartes du croupier'], yourTotal: ['Your total', 'Votre total'], dealerTotal: ['Dealer total', 'Total du croupier'],
  roundResult: ['Round result', 'Résultat de la partie'], roundInProgress: ['Playing…', 'Partie en cours…'],
  slotRules: ['Three reels: a pair wins 1× the wager, three matching symbols win 4×, and any other result loses 1×.', 'Trois rouleaux : une paire rapporte 1 fois la mise, trois symboles identiques rapportent 4 fois la mise et toute autre combinaison fait perdre 1 fois la mise.'],
  blackjackRules: ['You receive two cards; the dealer draws until reaching 17. The higher hand wins. A tie leaves your balance unchanged.', 'Vous recevez deux cartes; le croupier tire jusqu’à atteindre 17. La main la plus élevée gagne. En cas d’égalité, votre solde ne change pas.'],
  rouletteRules: ['Choose red or black. A matching colour wins 1× the wager; zero is green and loses either bet.', 'Choisissez rouge ou noir. La bonne couleur rapporte 1 fois la mise; le zéro est vert et fait perdre la mise.'],
  providers: ['Game providers', 'Fournisseurs de jeux'],
  adminIntro: ['Save or rotate a sandbox provider key. Saved keys are masked.', 'Enregistrez ou remplacez une clé de fournisseur pour l’environnement de test. Les clés enregistrées sont masquées.'],
  providerName: ['Provider name', 'Nom du fournisseur'],
  providerKey: ['Sandbox API key', 'Clé API de test'], save: ['Save key', 'Enregistrer la clé'], list: ['Show saved providers', 'Afficher les fournisseurs enregistrés'],
  audit: ['View key change history', 'Voir l’historique des changements de clés'],
  tenantSettings: ['Casino settings', 'Paramètres du casino'],
  tenantSettingsHelp: ['Save changes as a draft, then publish the version players should see.', 'Enregistrez les changements comme brouillon, puis publiez la version destinée aux joueurs.'],
  operatorOverview: ['Casino overview', 'Aperçu du casino'],
  operatorOverviewHelp: ['Tenant-scoped demo activity. Gameplay metrics use the selected period, and wager totals are simulated CAD values with no cash value.', 'Activité fictive propre au casino. Les statistiques de jeu utilisent la période choisie et les mises sont des montants fictifs en CAD sans valeur monétaire.'],
  overviewShowcaseData: ['Fictional showcase records are included in these demo metrics and support examples.', 'Ces statistiques de démonstration et exemples de soutien comprennent des données fictives.'],
  overviewShowcasePrompt: ['For a presentation example, initialize a fresh demo folder, stop the server, double-click Load Northplay Showcase Data.bat, then restart the demo.', 'Pour préparer un aperçu, initialisez un nouveau dossier de démonstration, arrêtez le serveur, double-cliquez sur Load Northplay Showcase Data.bat, puis redémarrez la démo.'],
  refreshOverview: ['Refresh overview', 'Actualiser l’aperçu'], overviewExport: ['Export CSV', 'Exporter le CSV'], overviewExportReady: ['Report CSV downloaded.', 'Le rapport CSV a été téléchargé.'],
  overviewPeriodLabel: ['Activity period', 'Période d’activité'], overviewPeriod7: ['Last 7 days', '7 derniers jours'], overviewPeriod30: ['Last 30 days', '30 derniers jours'], overviewPeriod90: ['Last 90 days', '90 derniers jours'],
  overviewActivityChart: ['Demo rounds by day', 'Parties de démo par jour'], overviewActivityHelp: ['Bar heights show daily demo rounds for the selected period.', 'La hauteur des barres représente les parties de démo quotidiennes pour la période choisie.'], overviewActivityDetails: ['View daily values', 'Voir les valeurs quotidiennes'], overviewActivitySummary: ['{total} demo rounds across {days} days. Busiest day: {date} ({rounds} rounds).', '{total} parties de démo sur {days} jours. Journée la plus active : {date} ({rounds} parties).'], overviewActivityDay: ['{date}: {rounds} demo rounds', '{date} : {rounds} parties de démo'],
  overviewGameBreakdown: ['Activity by demo title', 'Activité par titre de démo'], overviewGameName: ['Game', 'Jeu'], overviewGameRounds: ['Rounds', 'Parties'], overviewGameShare: ['Round share', 'Part des parties'], overviewGameActivePlayers: ['Active players', 'Joueurs actifs'], overviewGameWagered: ['Simulated wagers (CAD; no cash value)', 'Mises fictives (CAD; aucune valeur monétaire)'],
  overviewPlayers: ['Player accounts', 'Comptes joueurs'], overviewVerified: ['Email verified', 'Courriel confirmé'],
  overviewRounds: ['Demo rounds · {days} days', 'Parties fictives · {days} jours'], overviewActivePlayers: ['Players active in demo · {days} days', 'Joueurs ayant joué à la démo · {days} jours'], overviewWagered: ['Simulated wagers · {days} days', 'Mises fictives · {days} jours'],
  overviewTickets: ['Open support tickets', 'Demandes de soutien ouvertes'], overviewCatalog: ['Enabled catalog listings', 'Fiches actives du catalogue'],
  overviewCatalogStatus: ['Preview catalog status', 'État du catalogue de prévisualisation'], overviewCatalogReady: ['Ready for lobby preview', 'Prêt pour l’aperçu dans le hall'], overviewCatalogEmpty: ['No enabled preview listings', 'Aucune fiche de prévisualisation activée'],
  overviewCatalogNote: ['Preview listings are display-only; no external games are connected.', 'Les fiches sont uniquement visuelles; aucun jeu externe n’est connecté.'],
  overviewBrandingStatus: ['Published casino settings', 'Paramètres du casino publiés'], overviewBrandingReady: ['Published version {version} is current', 'La version publiée {version} est à jour'], overviewBrandingPending: ['Saved draft needs publishing · live version {version}', 'Le brouillon enregistré doit être publié · version en vigueur {version}'],
  overviewBrandingNote: ['Saved draft changes appear in the player lobby after publishing.', 'Les changements du brouillon enregistré apparaissent dans le hall après leur publication.'],
  goToCasinoSettings: ['Open casino settings', 'Ouvrir les paramètres du casino'], goToCatalogManagement: ['Open catalog management', 'Ouvrir la gestion du catalogue'], goToCatalogSetup: ['Set up catalog previews', 'Préparer les aperçus du catalogue'],
  overviewMfaStatus: ['Your two-step verification', 'Votre vérification en deux étapes'], overviewMfaEnabled: ['Enabled for this staff account', 'Activée pour ce compte du personnel'], overviewMfaDisabled: ['Not enabled for this staff account', 'Non activée pour ce compte du personnel'], overviewMfaNote: ['This status applies only to the signed-in staff account.', 'Cet état concerne uniquement le compte du personnel connecté.'], goToMfa: ['Manage two-step verification', 'Gérer la vérification en deux étapes'],
  overviewUpdated: ['Updated {time}', 'Mis à jour à {time}'],
  featuredDemoGames: ['Featured demo games', 'Jeux de démonstration en vedette'],
  featuredDemoGamesHelp: ['Choose up to three built-in demo games to show first in the lobby. Provider catalog listings are managed separately.', 'Choisissez jusqu’à trois jeux de démonstration intégrés à afficher en premier dans le hall. Les fiches des fournisseurs sont gérées séparément.'],
   featuredPreview: ['Featured first: {games}', 'En vedette en premier : {games}'],
  featuredLimit: ['Choose no more than three featured games.', 'Choisissez au plus trois jeux en vedette.'],
  brandName: ['Casino name', 'Nom du casino'], accentColor: ['Accent colour', 'Couleur d’accent'],
  brandLogoLabel: ['Upload logo (PNG, JPEG or WebP; up to 48 KB)', 'Téléverser un logo (PNG, JPEG ou WebP; 48 Ko maximum)'],
  brandLogoHelp: ['Use a compact logo with a transparent background for best results.', 'Pour un meilleur résultat, utilisez un logo compact avec un arrière-plan transparent.'],
  removeBrandLogo: ['Remove logo', 'Retirer le logo'],
  brandLogoInvalid: ['Choose a PNG, JPEG or WebP image no larger than 48 KB.', 'Choisissez une image PNG, JPEG ou WebP de 48 Ko ou moins.'],
  brandFaviconLabel: ['Upload favicon (PNG or WebP; up to 16 KB)', 'Téléverser une icône de site (PNG ou WebP; 16 Ko maximum)'],
  brandFaviconHelp: ['Square artwork works best. Remove the file to use the Northplay default.', 'Une image carrée donne le meilleur résultat. Retirez le fichier pour rétablir l’icône Northplay.'],
  brandFaviconInvalid: ['Choose a PNG or WebP image no larger than 16 KB.', 'Choisissez une image PNG ou WebP de 16 Ko ou moins.'],
  removeBrandFavicon: ['Remove favicon', 'Retirer l’icône'],
  announcementEnLabel: ['Lobby announcement · English (optional)', 'Annonce du hall · anglais (facultative)'],
  announcementFrLabel: ['Lobby announcement · Canadian French (optional)', 'Annonce du hall · français canadien (facultative)'],
  announcementHelp: ['Leave both blank to hide the announcement. Keep both versions aligned.', 'Laissez les deux champs vides pour masquer l’annonce. Gardez les deux versions équivalentes.'],
  heroTitleEn: ['Lobby headline · English', 'Titre du hall · anglais'], heroTitleFr: ['Lobby headline · Canadian French', 'Titre du hall · français canadien'],
  heroIntroEn: ['Lobby introduction · English', 'Présentation du hall · anglais'], heroIntroFr: ['Lobby introduction · Canadian French', 'Présentation du hall · français canadien'],
  heroPreviewEn: ['English preview', 'Aperçu en anglais'], heroPreviewFr: ['Canadian French preview', 'Aperçu en français canadien'],
  supportEmail: ['Support email', 'Courriel du soutien'],
  tenantPreviewTitle: ['Brand preview', 'Aperçu de la marque'], tenantPreviewHelp: ['Live preview of the settings in this form. Save the draft, then publish it for players to see.', 'Aperçu en direct des paramètres de ce formulaire. Enregistrez le brouillon, puis publiez-le pour que les joueurs le voient.'],
  previewBrandPlaceholder: ['Your casino name', 'Le nom de votre casino'], previewEmailPlaceholder: ['No support email set', 'Aucun courriel de soutien défini'],
  supportStatusTotals: ['All requests · {open} open · {answered} answered · {closed} closed','Toutes les demandes · {open} ouvertes · {answered} répondues · {closed} fermées'],
  contactInbox: ['Messages and reward receipts','Messages et reçus de récompense'],
  supportMoreFilters: ['More filters', 'Autres filtres'],
  supportResultRange: ['Requests {start}–{end} of {total}', 'Demandes {start} à {end} sur {total}'],
  supportAllCases: ['View all requests', 'Voir toutes les demandes'],
  supportPlayerFile: ['Open player record', 'Ouvrir la fiche du joueur'],
  supportPlayerCases: ['Support requests', 'Demandes de soutien'],
  supportNewCase: ['New request', 'Nouvelle demande'],
  supportUnreadCase: ['Unread reply', 'Réponse non lue'],
  supportTitle: ['Support centre', 'Centre de soutien'], supportIntro: ['Send a message to the casino support team and check replies here.', 'Écrivez à l’équipe de soutien du casino et consultez les réponses ici.'],
  supportCategory: ['What can we help with?', 'Quel est le sujet de votre demande?'],
  supportMessage: ['Message (10 to 3,000 characters)', 'Message (de 10 à 3 000 caractères)'], supportSend: ['Send support request', 'Envoyer la demande'], supportSent: ['Your request was sent to casino support.', 'Votre demande a été envoyée au soutien du casino.'],
  supportThread: ['Conversation', 'Conversation'], supportPlayerAuthor: ['You', 'Vous'], supportStaffAuthor: ['Casino support', 'Soutien du casino'], supportFollowup: ['Reply to this request (up to 3,000 characters)', 'Répondez à cette demande (3 000 caractères maximum)'], supportFollowupSend: ['Send reply', 'Envoyer la réponse'], supportFollowupSent: ['Your reply was sent. The request is open again.', 'Votre réponse a été envoyée. La demande est rouverte.'],
  supportTickets: ['Your requests', 'Vos demandes'], supportNoTickets: ['You have no support requests yet.', 'Vous n’avez pas encore de demandes de soutien.'], supportReference: ['Reference', 'Référence'], supportCreated: ['Opened', 'Ouverte'], supportLastUpdated: ['Last updated', 'Dernière mise à jour'], supportReply: ['Reply', 'Répondre'], supportReplyLabel: ['Response', 'Réponse'], supportReplyPlaceholder: ['Write a reply for the player', 'Rédigez une réponse au joueur'], supportRateLimited: ['You have sent several requests recently. Please try again later.', 'Vous avez envoyé plusieurs demandes récemment. Veuillez réessayer plus tard.'],
  supportNewReplies: ['New support replies ({count})', 'Réponses de soutien non lues ({count})'], supportUnreadLabel: ['You have {count} unread support replies.', 'Vous avez {count} réponses de soutien non lues.'],
  supportInbox: ['Support inbox', 'Boîte de soutien'], supportInboxHelp: ['Review requests and formal complaints, then reply in English or French.', 'Consultez les demandes et les plaintes officielles, puis répondez en anglais ou en français.'], supportRefresh: ['Refresh inbox', 'Actualiser la boîte'], supportNoInbox: ['There are no support requests.', 'Il n’y a aucune demande de soutien.'], supportSaved: ['Support reply saved.', 'La réponse de soutien a été enregistrée.'], supportConflict: ['This request changed since it was loaded. The inbox was refreshed; review the latest details before trying again.', 'Cette demande a changé depuis son chargement. La boîte a été actualisée; vérifiez les détails les plus récents avant de réessayer.'],
  supportPlayerProtectionContext: ['Relevant player protection controls', 'Mesures de protection pertinentes du compte'], supportPlayerExcluded: ['The account is self-excluded.', 'Le compte est en autoexclusion.'], supportPlayerNoActiveRestriction: ['No active pause, cooling-off period, or self-exclusion is recorded.', 'Aucune pause, suspension temporaire ou autoexclusion n’est active actuellement.'],
  supportCloseNoReply: ['Close without reply', 'Fermer sans répondre'], supportConfirmClose: ['Close this request without sending a reply?', 'Fermer cette demande sans envoyer de réponse?'], supportClosedNoReply: ['Request closed without sending a reply.', 'La demande a été fermée sans réponse.'],
  supportInternalNotes: ['Internal staff notes', 'Notes internes du personnel'], supportNoNotes: ['No internal notes yet.', 'Aucune note interne pour le moment.'], supportNotePlaceholder: ['Add information for other support staff (up to 2,000 characters)', 'Ajoutez une information pour l’équipe de soutien (2 000 caractères maximum)'], supportAddNote: ['Add internal note', 'Ajouter une note interne'], supportNoteSaved: ['Internal note added.', 'La note interne a été ajoutée.'],
  supportAssignedTo: ['Assigned to', 'Attribuée à'], supportUnassigned: ['Unassigned', 'Non attribuée'], supportAssign: ['Assign ticket', 'Attribuer la demande'], supportAssignmentSaved: ['Ticket assignment saved.', 'L’attribution de la demande a été enregistrée.'],
  supportAssigneeFilter: ['Assignment', 'Attribution'], supportAssigneeAll: ['All tickets', 'Toutes les demandes'], supportAssigneeMine: ['Assigned to me', 'Les miennes'],
  supportStatusOpen: ['Open', 'Ouverte'], supportStatusAnswered: ['Answered', 'Répondue'], supportStatusClosed: ['Closed', 'Fermée'], supportCategoryAccount: ['Account', 'Compte'], supportCategoryGame: ['Game listing', 'Jeu'], supportCategoryResponsible: ['Safer play', 'Jeu responsable'], supportCategoryOther: ['Other', 'Autre'], supportCategoryComplaint: ['Complaint', 'Plainte'], supportTopicFilter: ['Request topic', 'Sujet de la demande'], supportTopicAll: ['All topics', 'Tous les sujets'], supportComplaintBadge: ['Formal complaint', 'Plainte officielle'], supportComplaintFilter: ['Case type', 'Type de dossier'], supportComplaintAll: ['All cases', 'Tous les dossiers'], supportComplaintOnly: ['Complaints only', 'Plaintes seulement'], supportNonComplaints: ['Other requests', 'Autres demandes'],
  supportStatusLabel: ['Ticket status', 'État de la demande'],
  supportPriority: ['Priority', 'Priorité'], supportPriorityAll: ['All priorities', 'Toutes les priorités'], supportPriorityLow: ['Low', 'Faible'], supportPriorityNormal: ['Normal', 'Normale'], supportPriorityHigh: ['High', 'Élevée'], supportPriorityUrgent: ['Urgent', 'Urgente'],
  supportSearch: ['Search by player, case, reference or text', 'Rechercher un joueur, un billet, une référence ou du texte'], supportFilter: ['Filter by status', 'Filtrer par état'], supportFilterAll: ['All statuses', 'Tous les états'], supportNoMatches: ['No tickets match these filters.', 'Aucune demande ne correspond à ces filtres.'], supportClearFilters: ['Clear filters', 'Effacer les filtres'],
  loadConfig: ['Load draft', 'Charger le brouillon'],
  saveDraft: ['Save draft', 'Enregistrer le brouillon'], publishConfig: ['Publish version', 'Publier la version'],
  draftSaved: ['Draft saved.', 'Brouillon enregistré.'], configPublished: ['Configuration published.', 'Configuration publiée.'],
  staffLogin: ['Staff sign in', 'Connexion du personnel'],
  staffLoginHelp: ['Sign in with your staff account.', 'Connectez-vous avec votre compte du personnel.'],
  staffLoginIdentifier: ['Username or email', 'Nom d’utilisateur ou courriel'],
  staffOptionalUsername: ['Username (optional)', 'Nom d’utilisateur (facultatif)'],
  staffUsernameTaken: ['This username is already in use.', 'Ce nom d’utilisateur est déjà utilisé.'],
  staffEmail: ['Staff email', 'Courriel du membre du personnel'], staffPassword: ['Password', 'Mot de passe'],
  staffChangePasswordTitle: ['Change my staff password', 'Changer mon mot de passe du personnel'],
  staffChangePasswordHelp: ['Enter your current password and choose a new one. Other staff sessions will be signed out.', 'Saisissez votre mot de passe actuel et choisissez-en un nouveau. Les autres sessions du personnel seront fermées.'],
  staffNewPassword: ['New password (12 characters minimum)', 'Nouveau mot de passe (au moins 12 caractères)'],
  staffConfirmPassword: ['Confirm new password', 'Confirmer le nouveau mot de passe'],
  staffChangePasswordSave: ['Update staff password', 'Modifier le mot de passe du personnel'],
  staffPasswordChanged: ['Password updated. Other staff sessions have been signed out.', 'Mot de passe modifié. Les autres sessions du personnel ont été fermées.'],
  showPassword: ['Show password', 'Afficher le mot de passe'], hidePassword: ['Hide password', 'Masquer le mot de passe'],
  staffSignIn: ['Sign in', 'Se connecter'], staffSigningIn: ['Signing in…', 'Connexion…'], staffSignOut: ['Sign out', 'Se déconnecter'],
  staffManagement: ['Staff access', 'Accès du personnel'], temporaryPassword: ['Initial password for a new account (12 characters minimum); leave blank for an existing account', 'Mot de passe initial pour un nouveau compte (au moins 12 caractères); laissez vide pour un compte existant'],
  staffRole: ['Role', 'Rôle'], staffCreate: ['Add staff member', 'Ajouter un membre du personnel'], staffDisable: ['Disable', 'Désactiver'], staffAccountsHeading: ['Staff accounts', 'Comptes du personnel'],
  roleAdminHelp: ['Full access to staff, casino settings, provider tools, support and audit history.', 'Accès complet au personnel, aux paramètres du casino, aux outils des fournisseurs, au soutien et à l’historique d’audit.'], roleContentHelp: ['Edit website content and catalogue drafts. Assign publishing rights for this brand below.', 'Modifier le contenu du site et les brouillons du catalogue. Attribuez les droits de publication de cette marque ci-dessous.'], roleProviderHelp: ['Manage provider records, stored credentials and catalog previews.', 'Gérer les dossiers des fournisseurs, les identifiants enregistrés et les aperçus du catalogue.'], roleSupportHelp: ['Manage player support requests, assignments, private notes and replies.', 'Gérer les demandes de soutien, les attributions, les notes internes et les réponses.'],
  staffSearch: ['Search staff username or email', 'Rechercher un nom d’utilisateur ou un courriel'], staffFilterRole: ['Filter by role', 'Filtrer par rôle'], staffFilterStatus: ['Filter by status', 'Filtrer par état'], staffFilterMfa: ['Filter by two-step verification', 'Filtrer par vérification en deux étapes'], staffFilterMfaEnabled: ['Enabled', 'Activée'], staffFilterMfaDisabled: ['Not enabled', 'Non activée'], staffFilterAll: ['All', 'Tous'], staffNoMatches: ['No staff accounts match these filters.', 'Aucun compte du personnel ne correspond à ces filtres.'], staffCount: ['Showing {shown} of {total} staff accounts', 'Membres du personnel affichés : {shown} sur {total}'], staffSort: ['Sort by', 'Trier par'], staffSortNewest: ['Newest first', 'Les plus récents'], staffSortOldest: ['Oldest first', 'Les plus anciens'], staffSortEmail: ['Email A to Z', 'Courriel de A à Z'], staffAddedOn: ['Added (UTC) {date}', 'Ajouté le {date} (UTC)'], staffLastActivity: ['Last recorded activity (UTC): {date}', 'Dernière activité enregistrée (UTC) : {date}'], staffNoActivity: ['No recorded activity', 'Aucune activité enregistrée'],
  staffSortActivity: ['Most recently active', 'Activité la plus récente'],
  staffFilterActivity: ['Filter by recorded activity', 'Filtrer selon l’activité enregistrée'], staffActivityHas: ['Has recorded activity', 'Activité enregistrée'], staffActivityNone: ['No recorded activity', 'Aucune activité enregistrée'],
  staffMfaEnabled: ['Two-step verification enabled', 'Vérification en deux étapes activée'], staffMfaDisabled: ['Two-step verification not enabled', 'Vérification en deux étapes non activée'],
  roleAdmin: ['Operator admin', 'Administrateur du casino'], roleContent: ['Content', 'Contenu'], roleProvider: ['Providers', 'Fournisseurs'], roleSupport: ['Support', 'Soutien'],
  active: ['active', 'actif'], disabled: ['disabled', 'désactivé'],
  staffAdded: ['Staff account added.', 'Compte du personnel ajouté.'], staffDisabled: ['Staff account disabled.', 'Compte du personnel désactivé.'], staffReenable: ['Re-enable', 'Réactiver'], staffReenabled: ['Staff account re-enabled.', 'Compte du personnel réactivé.'], staffChangeRole: ['Role', 'Rôle'], staffSaveRole: ['Save access', 'Enregistrer les accès'], staffRoleUpdated: ['Staff access updated.', 'Accès du membre du personnel modifiés.'],
  staffConfirmDisable: ['Disable this staff account? The person will be signed out and cannot access this casino again until an admin re-enables the account.', 'Désactiver ce compte du personnel ? La personne sera déconnectée et ne pourra plus accéder à ce casino tant qu’un membre de l’administration n’aura pas réactivé le compte.'],
  staffConfirmRoleChange: ["Change {email}'s role from {oldRole} to {newRole}? Their permissions will change immediately.", 'Changer le rôle de {email}, de {oldRole} à {newRole} ? Les autorisations de ce compte changeront immédiatement.'],
  staffConfirmReenable: ['Re-enable {email} as {role}? This restores access to the casino admin console.', 'Réactiver {email} avec le rôle {role} ? L’accès à l’interface d’administration du casino sera rétabli.'],
  staffExport: ['Export filtered staff list (CSV)', 'Exporter la liste filtrée du personnel (CSV)'], staffExportReady: ['Filtered staff CSV downloaded.', 'Le fichier CSV filtré du personnel a été téléchargé.'],
  staffAudit: ['View staff activity', 'Voir l’activité du personnel'],
  staffAuditHeading: ['Staff activity history', 'Historique des activités du personnel'], staffAuditSearch: ['Search staff email, action, or target', 'Rechercher un courriel, une action ou une cible'], staffAuditFilter: ['Filter by category', 'Filtrer par catégorie'], staffAuditCategoryStaff: ['Staff access', 'Accès du personnel'], staffAuditCategoryAuth: ['Sign-in and passwords', 'Connexion et mots de passe'], staffAuditCategoryMfa: ['Two-step verification', 'Vérification en deux étapes'], staffAuditCategoryCasino: ['Casino settings', 'Paramètres du casino'], staffAuditCategorySupport: ['Support', 'Soutien'], staffAuditCategoryProviders: ['Providers and catalog', 'Fournisseurs et catalogue'], staffAuditCategoryOther: ['Other', 'Autre'], staffAuditSummary: ['Showing {shown} of {loaded} loaded events', 'Affichage de {shown} des {loaded} événements chargés'],
  staffAuditNoMatches: ['No activity matches these filters.', 'Aucune activité ne correspond à ces filtres.'], staffAuditClearFilters: ['Clear audit filters', 'Effacer les filtres du journal'], staffAuditExport: ['Export all matching events (CSV)', 'Exporter tous les événements correspondants (CSV)'], staffAuditExporting: ['Preparing the full audit export…', 'Préparation de l’exportation complète du journal…'], staffAuditExportReady: ['Full filtered audit CSV downloaded.', 'Le fichier CSV complet filtré du journal d’audit a été téléchargé.'],
  staffAuditLoadMore: ['Load more events', 'Charger plus d’événements'],
  staffAuditFrom: ['From date (UTC)', 'Date de début (UTC)'], staffAuditTo: ['To date (UTC)', 'Date de fin (UTC)'], staffAuditRangeInvalid: ['The start date must be on or before the end date.', 'La date de début doit être antérieure ou égale à la date de fin.'],
  staffAuditTimestamp: ['Date and time (UTC)', 'Date et heure (UTC)'], staffAuditActor: ['Staff member', 'Membre du personnel'], staffAuditAction: ['Action', 'Action'], staffAuditTarget: ['Target', 'Cible'], staffAuditRequestId: ['Request ID', 'ID de requête'],
  mfaTitle: ['Two-step verification', 'Vérification en deux étapes'],
  mfaHelp: ['Add this account to an authenticator app with the secret or copied setup link below, then enter its six-digit code to enable two-step verification.', 'Ajoutez ce compte à une application d’authentification avec le secret ou le lien copié ci-dessous, puis saisissez le code à six chiffres pour activer la vérification en deux étapes.'],
  mfaSetup: ['Set up authenticator', 'Configurer l’authentificateur'], mfaCode: ['Authenticator code', 'Code de l’authentificateur'],
  mfaCopySetup: ['Copy authenticator setup link', 'Copier le lien de configuration de l’authentificateur'], mfaSetupCopied: ['Setup link copied.', 'Lien de configuration copié.'], mfaCopyFailed: ['Could not copy the setup link. Select and copy it from the text above.', 'Impossible de copier le lien. Sélectionnez-le et copiez-le à partir du texte ci-dessus.'],
  mfaLoginHint: ['Leave blank unless two-step verification is already enabled for this account.', 'Laissez ce champ vide si la vérification en deux étapes n’est pas déjà activée pour ce compte.'],
  mfaEnable: ['Enable two-step verification', 'Activer la vérification en deux étapes'], mfaDisable: ['Disable two-step verification', 'Désactiver la vérification en deux étapes'],
  mfaEnabled: ['Two-step verification enabled.', 'Vérification en deux étapes activée.'], mfaDisabled: ['Two-step verification disabled.', 'Vérification en deux étapes désactivée.'],
  mfaConfirmDisable: ['Disable two-step verification for this account? Sign-in will no longer require an authenticator code.', 'Désactiver la vérification en deux étapes pour ce compte ? L’ouverture de session ne demandera plus de code d’authentification.'],
  staffCredentials: ['Username, email, password, or authenticator code is incorrect.', 'L’identifiant, le mot de passe ou le code est incorrect.'],
  staffAuth: ['Please sign in again.', 'Veuillez vous reconnecter.'], staffForbidden: ['Your account does not have permission for this action.', 'Votre compte n’a pas la permission d’effectuer cette action.'],
  staffLifecycle: ['This staff account cannot be changed in its current state.', 'Ce compte du personnel ne peut pas être modifié dans son état actuel.'],
  staffExists: ['This staff member already has access to this casino.', 'Cette personne a déjà accès à ce casino.'],
  staffMfaInvalid: ['The authenticator code is invalid or expired.', 'Le code de l’authentificateur est invalide ou expiré.'],
  staffMfaAlreadyEnabled: ['Two-step verification is already enabled for this account.', 'La vérification en deux étapes est déjà activée pour ce compte.'],
  configDraftMissing: ['There is no saved configuration draft to publish.', 'Aucun brouillon de configuration enregistré ne peut être publié.'],
  platformAdminAuth: ['Platform administrator credentials are invalid.', 'Les identifiants d’administration de la plateforme sont invalides.'],
  platformAdminDisabled: ['Platform administration is not enabled.', 'L’administration de la plateforme n’est pas activée.'],
  tenantSlugTaken: ['This casino address is already in use.', 'Cette adresse de casino est déjà utilisée.'],
  tenantAdminExists: ['This casino already has an operator administrator.', 'Ce casino a déjà un administrateur du casino.'],
  tenantLifecycle: ['This casino cannot move to that status from its current state.', 'Ce casino ne peut pas passer à cet état à partir de son état actuel.'],
  domainInUse: ['This domain is already assigned to another casino.', 'Ce domaine est déjà associé à un autre casino.'],
  domainUnknown: ['There is no verification request for this domain.', 'Aucune demande de vérification n’existe pour ce domaine.'],
  domainNotVerified: ['The domain verification record could not be found.', 'L’enregistrement de vérification du domaine est introuvable.'],
  catalogEmptyTitle: ['The lobby is getting ready', 'Le hall se prépare'],
  catalogEmpty: ['Games will appear here after an approved provider is connected and its catalog is synced.', 'Les jeux apparaîtront ici après la connexion d’un fournisseur approuvé et la synchronisation de son catalogue.'],
  noFavoriteGamesTitle: ['No favorites yet', 'Aucun favori pour le moment'],
  noRecentGamesTitle: ['No recent games yet', 'Aucun jeu récent'], noRecentGames: ['Games you play will appear here.', 'Les jeux auxquels vous jouez apparaîtront ici.'],
  catalogNoMatchesTitle: ['No matching games', 'Aucun jeu correspondant'],
  catalogNoMatches: ['Try another search or choose a different category.', 'Essayez une autre recherche ou choisissez une autre catégorie.'],
  catalogListing: ['Provider preview · not playable', 'Aperçu fournisseur · non jouable'],
  demoGameLabel: ['Playable demo game', 'Jeu de démonstration jouable'],
  catalogSync: ['Catalog data', 'Données du catalogue'],
  catalogSyncHelp: ['Choose the provider and review the full file before publishing. Omitted titles leave the lobby.', 'Choisissez le fournisseur et vérifiez le fichier complet avant de publier. Les titres absents du fichier quittent le hall.'],
  catalogListings: ['Catalog listings', 'Fiches du catalogue'],
  catalogListingsHelp: ['Search imported titles and choose which cards appear in the lobby.', 'Recherchez les titres importés et choisissez les fiches qui apparaissent dans le hall.'],
  catalogListingsRefresh: ['Refresh listings', 'Actualiser les fiches'],
  catalogListingEnabled: ['Visible in lobby preview', 'Visible dans l’aperçu du hall'],
  catalogListingDisabled: ['Hidden from lobby preview', 'Masquée de l’aperçu du hall'],
  catalogListingHide: ['Hide listing', 'Masquer la fiche'], catalogListingShow: ['Show listing', 'Afficher la fiche'],
  catalogListingsEmpty: ['No imported catalog listings yet.', 'Aucune fiche de catalogue importée pour le moment.'],
  catalogListingUpdated: ['Catalog listing updated.', 'Fiche de catalogue modifiée.'],
  sampleCatalogHelp: ['Preview four bilingual sample listings and their effect on the lobby.', 'Prévisualisez quatre fiches fictives bilingues et leur effet sur le hall.'],
  loadSampleCatalog: ['Prepare sample catalog', 'Préparer le catalogue fictif'],
  sampleCatalogPrepared: ['Sample preview ready. Sync to publish these listings.', 'L’aperçu fictif est prêt. Synchronisez le catalogue pour publier ces fiches.'],
  catalogJson: ['Game entries (JSON array)', 'Fiches de jeux (tableau JSON)'],
  catalogFile: ['Load a catalog JSON file (optional)', 'Charger un fichier JSON de catalogue (facultatif)'],
  catalogNeedReview: ['{count} valid listings. Preview changes before syncing this full catalog.', '{count} fiches valides. Prévisualisez les changements avant de synchroniser ce catalogue complet.'],
  catalogReview: ['Preview changes', 'Prévisualiser les changements'],
  catalogDiff: ['Preview · Added: {added} · Updated: {updated} · Unchanged: {unchanged} · To disable: {removed}.', 'Aperçu · Ajouts : {added} · Modifications : {updated} · Sans changement : {unchanged} · Désactivations : {removed}.'],
  catalogNoChanges: ['No changes detected. The catalog already matches ({count} listings); syncing is not needed.', 'Aucun changement détecté. Le catalogue correspond déjà ({count} fiches); la synchronisation n’est pas nécessaire.'],
  catalogRemovedWarning: ['Listings missing from this snapshot will be disabled.', 'Les fiches absentes de cet instantané seront désactivées.'],
  catalogChanged: ['The catalog changed after your preview. Preview it again before syncing.', 'Le catalogue a changé depuis l’aperçu. Prévisualisez-le de nouveau avant la synchronisation.'],
  loading: ['Loading…', 'Chargement…'],
  catalogExample: ['[\n  {\n    "externalId": "provider-game-id",\n    "titleEn": "English game title",\n    "titleFr": "Titre français",\n    "category": "slots"\n  }\n]', '[\n  {\n    "externalId": "identifiant-du-jeu",\n    "titleEn": "English game title",\n    "titleFr": "Titre français",\n    "category": "slots"\n  }\n]'],
  sync: ['Sync catalog', 'Synchroniser le catalogue'], synced: ['Catalog synced.', 'Catalogue synchronisé.'],
  added: ['added', 'ajoutée'], rotated: ['rotated', 'remplacée'],
  saved: ['Provider key saved.', 'Clé du fournisseur enregistrée.'], empty: ['No saved providers.', 'Aucun fournisseur enregistré.'],
  credentials: ['Check your email and password. If you already have an account, sign in.', 'Vérifiez votre courriel et votre mot de passe. Si vous avez déjà un compte, connectez-vous.'],
  rateLimited: ['Too many attempts. Wait 15 minutes before trying again.', 'Trop de tentatives. Attendez 15 minutes avant de réessayer.'],
  invalid: ['Check the form and try again.', 'Vérifiez les renseignements saisis et réessayez.'],
  balance: ['Your simulated balance is too low for this wager.', 'Votre solde fictif est insuffisant pour cette mise.'],
  adminDisabled: ['Admin setup is not loaded. Confirm .env is next to package.json, stop any old server on port 3000, then restart Start Northplay Demo.bat.', 'La configuration d’administration n’a pas été chargée. Vérifiez que .env se trouve à côté de package.json, arrêtez toute ancienne instance sur le port 3000, puis relancez Start Northplay Demo.bat.'],
  tenantUnknown: ['This casino address is not configured.', 'Cette adresse de casino n’est pas configurée.'],
  safety: ['Play controls', 'Contrôles de jeu'],
  exclude: ['Self-exclude this account', 'M’autoexclure de ce compte'],
  paused: ['Play is paused for 15 minutes.', 'Le jeu est suspendu pendant 15 minutes.'],
  excluded: ['This account is self-excluded and cannot sign in or play.', 'Ce compte est autoexclu et ne peut pas ouvrir une session ni jouer.'],
  confirmExclude: ['Self-exclusion will sign you out and prevent this account from signing in again. Continue?', 'L’autoexclusion fermera votre session et empêchera ce compte de se reconnecter. Continuer?'],
  dailyLimitLabel: ['Daily demo wager limit', 'Limite quotidienne de mises fictives'],
  saveLimit: ['Save limit', 'Enregistrer la limite'],
  reminderFrequencyLabel: ['Play-time reminder frequency', 'Fréquence des rappels de temps de jeu'],
  reminder30: ['Every 30 minutes', 'Toutes les 30 minutes'], reminder60: ['Every 60 minutes', 'Toutes les 60 minutes'], reminder120: ['Every 120 minutes', 'Toutes les 120 minutes'],
  saveReminder: ['Save reminder frequency', 'Enregistrer la fréquence des rappels'],
  dailyLimit: ['You have reached your daily demo wager limit.', 'Vous avez atteint votre limite quotidienne de mises fictives.'],
  sessionReminder: ['You have been playing this demo for {minutes} minutes. Consider taking a break.', 'Vous jouez à cette démo depuis {minutes} minutes. Pensez à faire une pause.'], sessionReminderAcknowledge: ['Acknowledge', 'Compris'],
  coolingOffOne: ['1 day', '1 jour'], coolingOffSeven: ['7 days', '7 jours'], coolingOffThirty: ['30 days', '30 jours'],
  coolingOffBlocked: ['Demo play is unavailable during your cooling-off period.', 'Le jeu de démonstration est indisponible pendant la suspension temporaire.'],
  unavailable: ['The service is temporarily unavailable.', 'Le service est temporairement indisponible.']
};

const $ = (selector) => document.querySelector(selector);
const auditActionLabels = {
  website_content_saved: websiteContentCopy.website_content_saved,
  website_content_published: websiteContentCopy.website_content_published,
  website_content_archived: websiteContentCopy.website_content_archived,
  player_suspended: playerAccessCopy.player_suspended, player_restored: playerAccessCopy.player_restored, player_recovery_requested: playerAccessCopy.player_recovery_requested,
  coming_soon_draft_saved: comingSoonCopy.comingSoonAuditSaved,
  coming_soon_published: comingSoonCopy.comingSoonAuditPublished,
  coming_soon_archived: comingSoonCopy.comingSoonAuditArchived,
  staff_login: ['Staff sign-in', 'Connexion du personnel'], staff_logout: ['Staff sign-out', 'Déconnexion du personnel'], staff_password_changed: ['Staff password changed', 'Mot de passe du personnel modifié'],
  staff_mfa_setup: ['Authenticator setup started', 'Configuration de l’authentificateur commencée'], staff_mfa_enabled: ['Two-step verification enabled', 'Vérification en deux étapes activée'], staff_mfa_disabled: ['Two-step verification disabled', 'Vérification en deux étapes désactivée'],
  staff_created: ['Staff account added', 'Compte du personnel ajouté'], staff_disabled: ['Staff account disabled', 'Compte du personnel désactivé'], staff_reenabled: ['Staff account re-enabled', 'Compte du personnel réactivé'], staff_role_changed: ['Staff role changed', 'Rôle du membre du personnel modifié'],
  tenant_config_saved: ['Casino settings saved as draft', 'Paramètres du casino enregistrés comme brouillon'], tenant_config_published: ['Casino settings published', 'Paramètres du casino publiés'],
  support_ticket_assigned: ['Support ticket assigned', 'Demande de soutien attribuée'], support_ticket_unassigned: ['Support ticket unassigned', 'Demande de soutien désattribuée'], support_ticket_note_added: ['Private support note added', 'Note privée ajoutée à la demande de soutien'],
  provider_key_added: ['Provider credentials added', 'Identifiants du fournisseur ajoutés'], provider_key_rotated: ['Provider credentials changed', 'Identifiants du fournisseur modifiés'], provider_catalog_synced: ['Provider catalog imported', 'Catalogue du fournisseur importé'], catalog_listing_enabled: ['Catalog listing enabled', 'Fiche du catalogue activée'], catalog_listing_disabled: ['Catalog listing disabled', 'Fiche du catalogue désactivée'],
};
const workflowAuditLabels={
  discovery_save:['Quest or offer draft saved','Brouillon de quête ou d’offre enregistré'],discovery_publish:['Quest or offer published','Quête ou offre publiée'],discovery_archive:['Quest or offer archived','Quête ou offre archivée'],
  campaign_save:['Campaign draft saved','Brouillon de campagne enregistré'],campaign_schedule:['Campaign scheduled','Campagne planifiée'],campaign_cancel:['Campaign cancelled','Campagne annulée'],campaign_dispatch:['Delivery run requested','Traitement des envois demandé'],
  partner_saved:['Partner saved','Partenaire enregistré'],placement_save:['Placement draft saved','Brouillon de publicité enregistré'],placement_publish:['Placement published','Publicité publiée'],placement_pause:['Placement paused','Publicité suspendue'],
  partner_link_saved:['Partner link updated','Lien partenaire mis à jour'],poll_open:['Poll opened','Sondage ouvert'],poll_publishResults:['Poll results published','Résultats du sondage publiés'],referral_reviewed:['Referral reviewed','Parrainage vérifié'],campaign_spend:['Campaign spend recorded','Dépenses de campagne enregistrées'],
  experiment_started:['Experiment started','Expérience démarrée'],experiment_closed:['Enrollment closed','Inscriptions terminées'],demo_credit_grant:['Test credits granted','Crédits de test octroyés'],demo_credit_debit:['Test credits debited','Crédits de test débités'],demo_credit_reverse:['Test credit entry reversed','Écriture de test contrepassée']
};
function auditActionLabel(action) {
  if(Object.hasOwn(workflowAuditLabels,action))return workflowAuditLabels[action][language];
  if (auditActionLabels[action]) return auditActionLabels[action][language];
  const supportUpdate = action.match(/^support_ticket_(answered|closed)_priority_(low|normal|high|urgent)$/);
  if (supportUpdate) return language ? `Demande de soutien ${supportUpdate[1] === 'answered' ? 'répondue' : 'fermée'} · priorité ${supportUpdate[2]}` : `Support ticket ${supportUpdate[1]} · ${supportUpdate[2]} priority`;
  const withoutReply = action.match(/^support_ticket_closed_without_reply_priority_(low|normal|high|urgent)$/);
  if (withoutReply) return language ? `Demande de soutien fermée sans réponse · priorité ${withoutReply[1]}` : `Support ticket closed without reply · ${withoutReply[1]} priority`;
  const readableAction = action.replaceAll('_', ' ');
  return language ? `Action : ${readableAction}` : `Action: ${readableAction}`;
}
const bootNode = document.getElementById('lobby-settings');
const initialBrand = bootNode ? JSON.parse(bootNode.textContent) : null;
if (initialBrand) {
  initialBrand.brandLogo = document.querySelector('header .brand-logo')?.getAttribute('src') || '';
  initialBrand.brandFavicon = initialBrand.brandFavicon ? document.getElementById('tenant-favicon').getAttribute('href') : '';
}
let language = (localStorage.getItem('northplay-language') || document.documentElement.lang.slice(0, 2)) === 'fr' ? 1 : 0;
let staffMemberCache = [];
let staffAuditCache = [];
let staffAuditNextCursor = null;
let staffAuditLoading = false;
let tenantBrandName = 'Northplay';
let savedTenantDraftSignature;
let savedTenantVersion;
let publicLocales = ['en-CA', 'fr-CA'];
let primaryPublicLocale = 'en-CA';
let publicComingSoon = true;
const resetToken = new URLSearchParams(location.search).get('reset');
const verifyToken = new URLSearchParams(location.search).get('verify');
const emailChangeToken = new URLSearchParams(location.search).get('email-change');
let pendingVerificationEmail;
let pendingVerificationUrl;
const requestedLanguage = new URLSearchParams(location.search).get('lang');
if (['en', 'fr'].includes(requestedLanguage)) {
  language = Number(requestedLanguage === 'fr');
  localStorage.setItem('northplay-language', requestedLanguage);
}
let player;
let accountPending = true;
let editionStatus = 'loading';
let providersStatus = 'loading';
let editionRequest = 0;
let playerSessionStartedAt;
let displayedReminderPeriod;
let displayedReminderLanguage;
const catalogLocation = new URLSearchParams(location.search);
let filter = ['slots', 'table', 'live', 'favorites', 'recent'].includes(catalogLocation.get('category')) ? catalogLocation.get('category') : 'all';
let searchQuery = (catalogLocation.get('q') || '').slice(0, 120);
let selectedCollection = normalizeCatalogueText((catalogLocation.get('collection') || '').slice(0, 128));

function catalogueParams() {
  const params = new URLSearchParams();
  if (searchQuery.trim()) params.set('q', searchQuery.trim());
  if (filter !== 'all') params.set('category', filter);
  if (selectedCollection) params.set('collection', selectedCollection);
  return params;
}
function rememberCatalogue() {
  const url = new URL(location.href);
  const filters = catalogueParams();
  for (const key of ['q', 'category', 'collection']) {
    if (filters.has(key)) url.searchParams.set(key, filters.get(key));
    else url.searchParams.delete(key);
  }
  history.replaceState(history.state, '', url);
}
let providerPage=1,providerPageFilters='',linkedProviderId=Number(/^#provider-game-([1-9][0-9]{0,14})$/.exec(location.hash)?.[1]);
let providerSort = localStorage.getItem('northplay-provider-sort') === 'alpha' ? 'alpha' : 'recent';
let guestFavorites;
try {
  const saved = JSON.parse(localStorage.getItem('northplay-favorites') || '[]');
  guestFavorites = new Set(Array.isArray(saved) ? saved.filter((key) => typeof key === 'string').slice(0, 1000) : []);
} catch {
  guestFavorites = new Set();
}
let favorites = new Set(guestFavorites);
let favoriteSavePending = false;
let favoriteStatusKey;
let favoriteActivityId;
let screen = 'signin';
let selectedGame = games.find(({ id }) => id === sessionStorage.getItem('northplay-pending-game'));
let selectedPreview;
let result;
let dialogError;
function clearPendingDemo() {
  sessionStorage.removeItem('northplay-pending-game');
  sessionStorage.removeItem('northplay-pending-preview');
}
function selectDemo(gameId, preview) {
  selectedGame = games.find(game => game.id === gameId);
  selectedPreview = preview;
}
function startDemo(gameId, preview) {
  selectDemo(gameId, preview);
  if (!selectedGame) return;
  clearPendingDemo();
  afterSignIn = undefined;
  result = undefined;
  if (!player) {
    sessionStorage.setItem('northplay-pending-game', gameId);
    if (preview) sessionStorage.setItem('northplay-pending-preview', preview.slug);
  }
  openPanel(player ? 'play' : 'signin');
}
function clearDemoSelection() {
  selectedGame = undefined;
  selectedPreview = undefined;
  afterSignIn = undefined;
  requestedClubTab = undefined;
  clearPendingDemo();
}
function roundTitle(entry) {
  return demoTitle(entry.game, roundPreview(entry.outcome), language ? 'fr-CA' : 'en-CA');
}
let tenantCopy = { headline: copy.headline, intro: copy.intro, announcement: ['', ''] };
let tenantFaqItems = [];
let tenantFeaturedGameIds = ['gold', 'roulette'];
let tenantPolicyLinks = { termsUrlEn: '', termsUrlFr: '', privacyUrlEn: '', privacyUrlFr: '' };
const t = (key) => tenantCopy?.[key]?.[language] ?? (copy[key] || copy.unavailable)[language];
const defaultFaqItems = () => [
  { questionEn: copy.faqBalanceQuestion[0], answerEn: copy.faqBalanceAnswer[0], questionFr: copy.faqBalanceQuestion[1], answerFr: copy.faqBalanceAnswer[1] },
  { questionEn: copy.faqGamesQuestion[0], answerEn: copy.faqGamesAnswer[0], questionFr: copy.faqGamesQuestion[1], answerFr: copy.faqGamesAnswer[1] },
  { questionEn: copy.faqSafetyQuestion[0], answerEn: copy.faqSafetyAnswer[0], questionFr: copy.faqSafetyQuestion[1], answerFr: copy.faqSafetyAnswer[1] }
];
const money = (cents) => new Intl.NumberFormat(language ? 'fr-CA' : 'en-CA', { style: 'currency', currency: 'CAD' }).format(cents / 100);
const gameName = (game) => game.name[language];
const demoProviderName = () => language ? `Démo ${tenantBrandName}` : `${tenantBrandName} Demo`;
function describeOutcome(gameId, rawOutcome) {
  if (typeof rawOutcome !== 'string' || !rawOutcome) return '';
  try {
    const outcome = JSON.parse(rawOutcome);
    if (gameId === 'roulette' && Number.isInteger(outcome.number) && ['red', 'black', 'green'].includes(outcome.color)) {
      return `${t('spinResult')} ${outcome.number} · ${t(outcome.color)}`;
    }
    if ((gameId === 'gold' || gameId === 'aurora') && Array.isArray(outcome.reels) && outcome.reels.every((symbol) => typeof symbol === 'string')) {
      return `${t('reels')} · ${outcome.reels.join('　')}`;
    }
    if (gameId === 'blackjack' && Array.isArray(outcome.playerCards) && Array.isArray(outcome.dealerCards) && Number.isInteger(outcome.playerScore) && Number.isInteger(outcome.dealerScore)) {
      return `${t('yourHand')} · ${outcome.playerCards.join('  ')} · ${t('yourTotal')}: ${outcome.playerScore} · ${t('dealerHand')} · ${outcome.dealerCards.join('  ')} · ${t('dealerTotal')}: ${outcome.dealerScore}`;
    }
  } catch {
    return '';
  }
  return '';
}

function element(tag, value, className) {
  const node = document.createElement(tag);
  if (value) node.textContent = value;
  if (className) node.className = className;
  return node;
}

function clubCreditLabel(raw) {
  try {
    const details=JSON.parse(raw),type=details?.type;
    if(type==='club_gift')return giftLabel(details.key,Boolean(language));
    if(type==='club_free_spin')return language?'Tour gratuit · Ruée vers l’or':'Free spin · Gold Rush';
    if(type==='club_daily') return t('dailyDemoBonus');
    if(type==='club_raffle') return t('weeklyDrawPrize');
  } catch {}
  return '';
}
function demoBalanceResetDetails(rawOutcome) {
  if (typeof rawOutcome !== 'string' || !rawOutcome) return null;
  try {
    const outcome = JSON.parse(rawOutcome);
    return outcome?.type === 'demo_balance_reset' && Number.isSafeInteger(outcome.newBalance) ? outcome : null;
  } catch {
    return null;
  }
}

function updateSessionReminder() {
  const banner = $('#session-reminder');
  if (!banner) return;
  if (!player || !playerSessionStartedAt || isAdminPage) {
    banner.hidden = true;
    displayedReminderPeriod = undefined;
    displayedReminderLanguage = undefined;
    return;
  }
  const interval = player.safety?.sessionReminderMinutes || 60;
  const periods = Math.floor((Date.now() - playerSessionStartedAt) / (interval * 60_000));
  if (periods < 1) {
    banner.hidden = true;
    displayedReminderPeriod = undefined;
    displayedReminderLanguage = undefined;
    return;
  }
  const key = `northplay-session-reminder:${playerSessionStartedAt}:${interval}`;
  const acknowledgedPeriod = Number(localStorage.getItem(key) || 0);
  if (periods <= acknowledgedPeriod) {
    banner.hidden = true;
    displayedReminderPeriod = undefined;
    displayedReminderLanguage = undefined;
    return;
  }
  if (displayedReminderPeriod === periods && displayedReminderLanguage === language && !banner.hidden) return;
  const message = element('p', t('sessionReminder').replace('{minutes}', new Intl.NumberFormat(language ? 'fr-CA' : 'en-CA').format(periods * interval)));
  const acknowledge = element('button', t('sessionReminderAcknowledge'), 'ghost');
  acknowledge.type = 'button';
  acknowledge.addEventListener('click', () => {
    localStorage.setItem(key, String(periods));
    displayedReminderPeriod = undefined;
    displayedReminderLanguage = undefined;
    updateSessionReminder();
  });
  banner.replaceChildren(message, acknowledge);
  banner.hidden = false;
  displayedReminderPeriod = periods;
  displayedReminderLanguage = language;
}

const pendingPublications = new Map();
async function api(path, data, method = 'POST') {
  const headers = {};
  const options = { method, headers };
  if (data !== undefined) {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(data);
  }
  const auditedMutation = data !== undefined && /^(admin\/(desk\/|shelves\/change|operator\/|config|website-content|coming-soon|discovery\/|growth\/|community\/|staff|players\/|support\/)|providers\/catalog(?:\/status)?$)/.test(path);
  const savingPreview = /^me\/saved\/[1-9]\d*(?:\?|$)/.test(path) && ['PUT', 'DELETE'].includes(method);
  const publication = (path === 'admin/website-content' || path === 'admin/coming-soon') &&
    ['publish', 'archive'].includes(data?.action);
  let attempt;
  const startingBreak = path === 'safety/pause' || path === 'safety/cooling-off';
  if ((auditedMutation || savingPreview || startingBreak) && globalThis.crypto?.randomUUID) {
    if (publication) {
      const signature = JSON.stringify([data.kind, data.slug, data.action, data.version]);
      attempt = pendingPublications.get(path);
      if (attempt?.signature !== signature) {
        attempt = { signature, id: crypto.randomUUID() };
        pendingPublications.set(path, attempt);
      }
    }
    headers['X-Request-ID'] = attempt?.id || crypto.randomUUID();
  }
  const send = async () => {
    const response = await fetch(appPath('/api/' + path), options);
    return { response, payload: await response.json() };
  };
  const { response, payload } = await send().catch(async (error) => {
    if (!headers['X-Request-ID']) throw error;
    try { return await send(); }
    catch (retryError) {
      retryError.requestId = headers['X-Request-ID'];
      throw retryError;
    }
  });
  if (attempt && response.status < 500 && pendingPublications.get(path) === attempt) pendingPublications.delete(path);
  if (!response.ok) {
    const error = new Error(payload.error);
    error.requestId = response.headers.get('X-Request-ID') || headers['X-Request-ID'];
    throw error;
  }
  return payload;
}

function publicLanguage(locale) {
  return (publicLocales.includes(locale) ? locale : primaryPublicLocale) === 'fr-CA' ? 1 : 0;
}

function applyTenant(config) {
  const previousLanguage = language;
  tenantBrandName = config.brandName;
  const habibi = config.brandName.trim().toLowerCase() === 'casino habibi';
  document.body.dataset.lobbyBrand = habibi ? 'habibi' : 'default';
  $('#staff-brand').textContent = config.brandName;
  publicLocales = config.enabledLocales;
  primaryPublicLocale = config.primaryLocale;
  publicComingSoon = config.enabledSections?.comingSoon ?? true;
  const publicFaq = config.enabledSections?.faq ?? true;
  $('#faq').hidden = !publicFaq;
  for (const link of document.querySelectorAll('a[href$="#faq"]')) link.hidden = !publicFaq;
  const onlyTranslation = (publicWebsite.isHelp || comingSoonUi.isDetail) && document.querySelector('link[rel="canonical"]') &&
    document.querySelectorAll('link[rel="alternate"][hreflang]').length < 2;
  $('#language').hidden = !isAdminPage && (publicLocales.length < 2 || onlyTranslation);
  if (!isAdminPage) {
    const preferred = localStorage.getItem('northplay-language');
    language = publicLanguage(preferred ? (preferred === 'fr' ? 'fr-CA' : 'en-CA') : primaryPublicLocale);
  }
  tenantFeaturedGameIds = Array.isArray(config.featuredGameIds) ? config.featuredGameIds : ['gold', 'roulette'];
  if (savedTenantDraftSignature === undefined) renderFeaturedGameEditor(tenantFeaturedGameIds);
  const favicon = $('#tenant-favicon');
  favicon.href = config.brandFavicon || appPath('/favicon.svg');
  if (config.brandFavicon) favicon.type = config.brandFavicon.startsWith('data:image/png;') ? 'image/png' : 'image/webp';
  else favicon.type = 'image/svg+xml';
  tenantPolicyLinks = {
    termsUrlEn: (config.termsUrlEn || '').trim(), termsUrlFr: (config.termsUrlFr || '').trim(),
    privacyUrlEn: (config.privacyUrlEn || '').trim(), privacyUrlFr: (config.privacyUrlFr || '').trim()
  };
  tenantFaqItems = Array.isArray(config.faqItems) ? config.faqItems : defaultFaqItems();
  tenantCopy = {
    headline: [config.heroTitleEn || copy.headline[0], config.heroTitleFr || copy.headline[1]],
    intro: [config.heroIntroEn || copy.intro[0], config.heroIntroFr || copy.intro[1]],
    pageDescription: [config.heroIntroEn || copy.intro[0], config.heroIntroFr || copy.intro[1]],
    announcement: [config.announcementEn || '', config.announcementFr || ''],
    disclaimer: [config.footerTextEn || copy.disclaimer[0], config.footerTextFr || copy.disclaimer[1]]
  };
  $('#lobby-announcement').textContent = t('announcement');
  $('#lobby-announcement').hidden = !$('#lobby-announcement').textContent;
  renderFaqs();
  updatePolicyLinks();
  renderCatalog();
  updateDocumentTitle();
  for (const node of document.querySelectorAll('[data-copy="headline"], [data-copy="intro"]')) node.textContent = t(node.dataset.copy);
  document.documentElement.style.setProperty('--green', config.accentColor);
  document.body.style.setProperty('--published-lobby-accent', config.accentColor);
  if (currentRoute === '/') {
    const channels = config.accentColor.slice(1).match(/../g).map(pair => {
      const value = parseInt(pair, 16) / 255;
      return value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4;
    });
    const lightness = .2126 * channels[0] + .7152 * channels[1] + .0722 * channels[2];
    document.body.style.setProperty('--button-ink', lightness > .179 ? '#080d10' : '#ffffff');
  }
  document.querySelector('meta[name="theme-color"]').content = habibi ? '#0b162b' : config.accentColor;
  for (const brand of document.querySelectorAll('.brand')) {
    const mark = config.brandLogo ? element('img') : element('span', '✧');
    if (config.brandLogo) {
      mark.src = config.brandLogo;
      mark.alt = '';
      mark.className = 'brand-logo';
    }
    mark.setAttribute('aria-hidden', 'true');
    if (habibi) {
      const name = element('strong', '', 'habibi-wordmark');
      name.append(element('small', 'Casino'), document.createTextNode(' Habibi'));
      brand.replaceChildren(mark, name);
      if (brand.tagName === 'A') brand.setAttribute('aria-label', config.brandName);
    } else {
      brand.removeAttribute('aria-label');
      brand.replaceChildren(mark, document.createTextNode(` ${config.brandName.toUpperCase()}`));
    }
  }
  for (const emblem of document.querySelectorAll('.admin-emblem')) {
    if (habibi && config.brandLogo) {
      const image = element('img');
      image.src = config.brandLogo;
      image.alt = '';
      emblem.replaceChildren(image);
    } else {
      emblem.textContent = '✦';
    }
  }
  const supportLink = $('#support-link');
  if (typeof config.supportEmail === 'string' && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(config.supportEmail)) {
    supportLink.href = `mailto:${config.supportEmail}`;
    supportLink.hidden = false;
  } else {
    supportLink.removeAttribute('href');
    supportLink.hidden = true;
  }
  if (language !== previousLanguage) render();
}

function selectedFeaturedGameIds() {
  return [...document.querySelectorAll('[data-featured-game]:checked')].map((input) => input.value);
}

function renderFeaturedGameEditor(selectedIds) {
  const container = $('#featured-game-options');
  if (!container) return;
  const selected = selectedIds ?? (container.querySelector('[data-featured-game]') ? selectedFeaturedGameIds() : tenantFeaturedGameIds);
  container.replaceChildren(...games.map((game) => {
    const label = element('label', '', 'featured-game-choice');
    const input = element('input');
    input.type = 'checkbox';
    input.value = game.id;
    input.dataset.featuredGame = '';
    input.checked = selected.includes(game.id);
    input.addEventListener('change', (event) => {
      if (selectedFeaturedGameIds().length > 3) {
        event.currentTarget.checked = false;
        $('#tenant-config-status').textContent = t('featuredLimit');
        return;
      }
      updateTenantPreview();
    });
    label.append(input, element('span', game.name[language]));
    return label;
  }));
}

function renderFaqs() {
  const list = $('#faq-list');
  if (!list) return;
  list.replaceChildren(...tenantFaqItems.map((item) => {
    const details = element('details');
    details.append(element('summary', language ? item.questionFr : item.questionEn), element('p', language ? item.answerFr : item.answerEn));
    return details;
  }));
}

function updatePolicyLinks() {
  for (const [id, key] of [['terms-link', 'termsUrl'], ['privacy-link', 'privacyUrl']]) {
    const link = $(`#${id}`);
    const url = tenantPolicyLinks[`${key}${language ? 'Fr' : 'En'}`] || tenantPolicyLinks[`${key}En`] || tenantPolicyLinks[`${key}Fr`];
    link.hidden = !url;
    if (url) {
      link.href = url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
    } else {
      link.removeAttribute('href');
    }
  }
}

function updateTenantPreview() {
  const form = $('#tenant-config');
  if (!form) return;
  const brandName = form.elements.brandName.value.trim();
  const accentColor = form.elements.accentColor.value;
  const supportEmail = form.elements.supportEmail.value.trim();
  $('#tenant-preview-name').textContent = brandName || t('previewBrandPlaceholder');
  $('#tenant-preview-email').textContent = supportEmail || t('previewEmailPlaceholder');
  $('#tenant-preview-swatch').style.backgroundColor = accentColor || '#b8ec9d';
  $('#tenant-preview-favicon').src = form.elements.brandFavicon.value || appPath('/favicon.svg');
  const previewSwatch = $('#tenant-preview-swatch');
  previewSwatch.replaceChildren();
  if (form.elements.brandLogo.value) {
    const logo = element('img');
    logo.src = form.elements.brandLogo.value;
    logo.alt = '';
    previewSwatch.append(logo);
  }
  $('#tenant-preview-title-en').textContent = form.elements.heroTitleEn.value.trim() || copy.headline[0];
  $('#tenant-preview-title-fr').textContent = form.elements.heroTitleFr.value.trim() || copy.headline[1];
  $('#tenant-preview-intro-en').textContent = form.elements.heroIntroEn.value.trim() || copy.intro[0];
  $('#tenant-preview-intro-fr').textContent = form.elements.heroIntroFr.value.trim() || copy.intro[1];
  $('#tenant-preview-announcement-en').textContent = form.elements.announcementEn.value.trim() || '—';
  $('#tenant-preview-announcement-fr').textContent = form.elements.announcementFr.value.trim() || '—';
  $('#tenant-preview-announcement').hidden = !form.elements.announcementEn.value.trim() && !form.elements.announcementFr.value.trim();
  $('#tenant-preview-footer-en').textContent = form.elements.footerTextEn.value.trim();
  $('#tenant-preview-footer-fr').textContent = form.elements.footerTextFr.value.trim();
  const featuredIds = selectedFeaturedGameIds();
  const featuredNames = games.filter((game) => featuredIds.includes(game.id)).map((game) => game.name[language]);
  $('#tenant-preview-featured').textContent = featuredNames.length ? t('featuredPreview').replace('{games}', featuredNames.join(', ')) : '';
  $('#tenant-preview-featured').hidden = !featuredNames.length;
  for (let index = 0; index < 3; index += 1) {
    const item = form.elements;
    $(`#tenant-preview-faq-${index}-question-en`).textContent = item[`faq${index}QuestionEn`].value.trim();
    $(`#tenant-preview-faq-${index}-answer-en`).textContent = item[`faq${index}AnswerEn`].value.trim();
    $(`#tenant-preview-faq-${index}-question-fr`).textContent = item[`faq${index}QuestionFr`].value.trim();
    $(`#tenant-preview-faq-${index}-answer-fr`).textContent = item[`faq${index}AnswerFr`].value.trim();
  }
  const publish = $('#publish-config');
  publish.disabled = !currentStaffPermissions.publishWebsite || !savedTenantDraftSignature ||
    JSON.stringify(readTenantConfig()) !== savedTenantDraftSignature;
}

function readTenantConfig() {
  const { elements: fields } = $('#tenant-config');
  return {
    brandName: fields.brandName.value.trim(),
    brandLogo: fields.brandLogo.value,
    brandFavicon: fields.brandFavicon.value,
    featuredGameIds: selectedFeaturedGameIds(),
    accentColor: fields.accentColor.value,
    supportEmail: fields.supportEmail.value.trim(),
    primaryLocale: fields.primaryLocale.value,
    enabledLocales: [['en-CA', fields.localeEn], ['fr-CA', fields.localeFr]]
      .filter(([, input]) => input.checked).map(([locale]) => locale),
    enabledSections: { comingSoon: fields.showComingSoon.checked, faq: fields.showFaq.checked },
    displayMarket: fields.displayMarket.value.trim().toUpperCase(),
    reportingTimeZone: fields.reportingTimeZone.value,
    heroTitleEn: fields.heroTitleEn.value.trim(),
    heroTitleFr: fields.heroTitleFr.value.trim(),
    heroIntroEn: fields.heroIntroEn.value.trim(),
    heroIntroFr: fields.heroIntroFr.value.trim(),
    announcementEn: fields.announcementEn.value.trim(),
    announcementFr: fields.announcementFr.value.trim(),
   faqItems: Array.from({ length: 3 }, (_, index) => ({
      questionEn: fields[`faq${index}QuestionEn`].value.trim(),
      answerEn: fields[`faq${index}AnswerEn`].value.trim(),
      questionFr: fields[`faq${index}QuestionFr`].value.trim(),
      answerFr: fields[`faq${index}AnswerFr`].value.trim()
    })),
    termsUrlEn: fields.termsUrlEn.value.trim(),
    termsUrlFr: fields.termsUrlFr.value.trim(),
    privacyUrlEn: fields.privacyUrlEn.value.trim(),
    privacyUrlFr: fields.privacyUrlFr.value.trim(),
    footerTextEn: fields.footerTextEn.value.trim(),
    footerTextFr: fields.footerTextFr.value.trim()
  };
}

function updateDocumentTitle() {
  if ((publicWebsite.isHelp || comingSoonUi.isDetail) && document.querySelector('link[rel="canonical"]')) return;
  const view = currentRoute === '/' && document.body.dataset.lobbyBrand === 'habibi' ? lobbyView(new URLSearchParams(location.search).get('view')) : '';
  document.title = view ? viewTitle(view, Boolean(language)) + ' · ' + tenantBrandName : isAdminPage ? `${t('adminWorkspace')} · ${tenantBrandName}`
    : publicWebsite.isHelp && publicWebsite.title() ? publicWebsite.title() + ' · ' + tenantBrandName
    : casinoPageTitle(tenantBrandName, Boolean(language));
  document.querySelector('meta[name="description"]')?.setAttribute('content', t('pageDescription'));
}

function updateAccount() {
  const knownMember = accountPending && document.body.hasAttribute('data-member-pending');
  $('#join-home').hidden = Boolean(player) || knownMember || currentRoute !== '/' || document.body.dataset.lobbyBrand !== 'habibi';
  const heroJoin=$('#hero-join');
  if (heroJoin) {heroJoin.hidden=Boolean(player)||knownMember;heroJoin.textContent=t('signup');heroJoin.href=appPath('/?lang='+(language?'fr':'en')+'&access=signup');}
  $('#account').textContent = player ? money(player.balance) : t(knownMember ? 'account' : 'signin');
  const unreadSupport = player?.supportReplies || 0;
  $('#account').setAttribute('aria-label', player ? t('account') + ' · ' + money(player.balance) + (unreadSupport ? ' · ' + t('supportUnreadLabel').replace('{count}', new Intl.NumberFormat(language ? 'fr-CA' : 'en-CA').format(unreadSupport)) : '') : t(knownMember ? 'account' : 'signin'));
  const messages = $('#header-support');
  if (messages) {
    const count = messages.querySelector('.support-count');
    count.hidden = !unreadSupport;
    count.textContent = unreadSupport > 99 ? '99+' : String(unreadSupport);
    const label = unreadSupport ? t('supportNewReplies').replace('{count}', String(unreadSupport)) : t('headerSupport');
    messages.title = label;
    messages.setAttribute('aria-label', label);
  }
  $('#account').classList.toggle('has-support-reply', !messages && Boolean(unreadSupport));
  $('#account').title = unreadSupport ? t('supportUnreadLabel').replace('{count}', String(unreadSupport)) : '';
  $('#safety-controls').textContent = player ? t('accountControls') : t('safetyCta');
}

function action(label, callback, className) {
  const button = element('button', label, className);
  button.type = 'button';
  button.addEventListener('click', callback);
  return button;
}

function supportMessageElement(author, message, createdAt, kind) {
  const item = element('article', '', `support-message ${kind}`);
  const timestamp = new Date(createdAt);
  const metadata = element('div', '', 'support-message-meta');
  metadata.append(element('strong', author));
  const time = element('time', timestamp.toLocaleString(language ? 'fr-CA' : 'en-CA'));
  time.dateTime = timestamp.toISOString();
  metadata.append(time);
  item.append(metadata);
  item.append(element('p', message));
  return item;
}

function supportThreadEntries(ticket) {
  const entries = ticket.messages || [];
  const initialIndex = entries.findIndex((entry) => entry.authorType === 'player' && entry.createdAt === ticket.createdAt && entry.message === ticket.message);
  if (initialIndex >= 0) return entries;
  return [{ authorType: 'player', message: ticket.message, createdAt: ticket.createdAt }, ...entries];
}

function historyEntryElement(entry, showSupport = true) {
  if (!entry.game) {
    const reset = demoBalanceResetDetails(entry.outcome);
    if (reset) {
      const date = entry.createdAt ? ` · ${new Date(entry.createdAt).toLocaleString(language ? 'fr-CA' : 'en-CA')}` : '';
      return element('li', `${t('demoBalanceResetHistory').replace('{balance}', money(reset.newBalance))}${date}`);
    }
    const clubCredit = clubCreditLabel(entry.outcome);
    if (clubCredit) return element('li', `${clubCredit} · +${money(entry.amount)} · ${new Date(entry.createdAt).toLocaleDateString(language?'fr-CA':'en-CA')}`);
    return element('li', `${t('starter')} · +${money(entry.amount)}`);
  }
  const date = entry.createdAt ? ` · ${new Date(entry.createdAt).toLocaleString(language ? 'fr-CA' : 'en-CA')}` : '';
  const change = `${entry.amount > 0 ? '+' : ''}${money(entry.amount)}`;
  const summary = describeOutcome(entry.game, entry.outcome);
  const outcome = summary ? ` · ${t('roundResult')}: ${summary}` : '';
  const row = element('li');
  const ref = 'round-' + entry.id;
  row.append(element('strong', clubCreditLabel(entry.outcome) || roundTitle(entry)), element('span', date + ' · ' + t('wager') + ' ' + money(entry.wager) +
    ' · ' + t('balanceChange') + ' ' + change + outcome), element('small', ref, 'round-reference'));
  if (showSupport) {
    const help = action(t('roundSupport'), () => openSupportCenter(ref), 'round-support-link');
    help.setAttribute('aria-label', t('roundSupport') + ' · ' + ref);
    row.append(help);
  }
  return row;
}

function csvCell(value) {
  let text = String(value ?? '');
  const numeric = /^-?\d+(?:\.\d+)?$/.test(text);
  if (typeof value === 'string' && !numeric && /^[\t\r ]*[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

function field(name, type, label, autocomplete) {
  const input = element('input');
  Object.assign(input, { name, type, autocomplete, required: true });
  if (type === 'password') Object.assign(input, { minLength: 10, maxLength: 128 });
  if (type !== 'password') {
    const wrapper = element('label', label);
    wrapper.append(input);
    return wrapper;
  }
  const wrapper = element('div', '', 'password-field');
  const inputId = `password-field-${++passwordFieldCounter}`;
  input.id = inputId;
  const caption = element('label', label);
  caption.htmlFor = inputId;
  const control = element('div', '', 'password-control');
  const toggle = element('button', t('showPassword'), 'ghost password-toggle');
  toggle.type = 'button';
  toggle.setAttribute('aria-label', t('showPassword'));
  toggle.setAttribute('aria-pressed', 'false');
  toggle.addEventListener('click', () => togglePassword(input, toggle));
  control.append(input, toggle);
  wrapper.append(caption, control);
  return wrapper;
}

let passwordFieldCounter = 0;
function togglePassword(input, button) {
  const showing = input.type === 'password';
  input.type = showing ? 'text' : 'password';
  button.textContent = t(showing ? 'hidePassword' : 'showPassword');
  button.setAttribute('aria-label', t(showing ? 'hidePassword' : 'showPassword'));
  button.setAttribute('aria-pressed', String(showing));
}

function submitForm(fields, caption, callback, busyCaption) {
  const form = element('form');
  const submit = element('button', caption);
  form.append(...fields, submit);
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (submit.disabled) return;
    submit.disabled = true;
    if (busyCaption) {
      form.setAttribute('aria-busy', 'true');
      submit.textContent = busyCaption;
    }
    try {
      await callback(Object.fromEntries(new FormData(form)));
    } catch (error) {
      dialogError = error.message;
      $('#status').textContent = t(dialogError);
    } finally {
      submit.disabled = false;
      if (busyCaption) {
        form.removeAttribute('aria-busy');
        submit.textContent = caption;
      }
    }
  });
  return form;
}

const supportCategoryCopy = { account: 'supportCategoryAccount', game: 'supportCategoryGame', responsible_play: 'supportCategoryResponsible', other: 'supportCategoryOther', complaint: 'supportCategoryComplaint' };
const supportStatusCopy = { open: 'supportStatusOpen', answered: 'supportStatusAnswered', closed: 'supportStatusClosed' };
const supportPriorityCopy = { low: 'supportPriorityLow', normal: 'supportPriorityNormal', high: 'supportPriorityHigh', urgent: 'supportPriorityUrgent' };

let supportReference='';
let supportView='list';
let loadingPlayerCases=false;
let supportList;
let supportTicket;
let supportRequest=0;
let afterSignIn;
let requestedClubTab;
let requestedGift;
function openClub(tab,questId) {
  clearDemoSelection();
  if (player) {
    discoveryPlayer.openTab(tab, player.id,questId);
    openPanel('discovery');
  } else {
    requestedClubTab = tab;
    afterSignIn = 'discovery';
    openPanel('signin');
  }
}

function supportCurrent(request,owner) {
  return request===supportRequest && player?.id===owner && screen==='support' && $('#dialog').open;
}
async function loadPlayerCases(page=1) {
  const request=++supportRequest,owner=player?.id;
  supportView='list';
  loadingPlayerCases=true;
  supportList=undefined;
  supportTicket=undefined;
  renderDialog();
  try {
    const list=await api('support/inbox?page='+page,undefined,'GET');
    if (!supportCurrent(request,owner)) return;
    loadingPlayerCases=false;
    supportList=list;
    player.supportReplies=list.unread;
    updateAccount();
    renderDialog();
  } catch(error) {
    if (supportCurrent(request,owner)) { loadingPlayerCases=false; renderDialog(); $('#status').textContent=t(error.message); }
  }
}
async function readPlayerCase(id,notice) {
  const request=++supportRequest,owner=player?.id;
  supportView='case';
  supportTicket=undefined;
  renderDialog();
  try {
    const result=await api('support/read',{ticketId:id});
    if (!supportCurrent(request,owner)) return;
    supportTicket=result.ticket;
    player.supportReplies=result.unread;
    updateAccount();
    renderDialog();
    if (notice) $('#status').textContent=t(notice);
  } catch(error) {
    if (supportCurrent(request,owner)) $('#status').textContent=t(error.message);
  }
}
function composeSupport(reference='') {
  ++supportRequest;
  supportReference=reference;
  supportView='new';
  renderDialog();
}
function enterPlayerSupport() {
  if (player) openSupportCenter();
  else { clearDemoSelection(); afterSignIn = 'support'; openPanel('signin'); }
}

function openSupportCenter(reference) {
  ++supportRequest;
  supportReference=typeof reference==='string'?reference:'';
  supportView=supportReference?'new':'list';
  supportTicket=undefined;
  supportList=undefined;
  openPanel('support');
  if (supportView==='list') void loadPlayerCases();
}

let breakControls;
let breakRefresh = 0;
let breakTimer;
async function refreshOpenBreak() {
  if (!player || !$('#dialog').open || !['account', 'play'].includes(screen) || document.hidden) return;
  const version = ++breakRefresh;
  const owner = player.id;
  try {
    const fresh = await api('safety/break', undefined, 'GET');
    if (version !== breakRefresh || player?.id !== owner || !$('#dialog').open || !['account', 'play'].includes(screen)) return;
    const was = player.safety.accountBreak;
    const next = fresh.accountBreak;
    if (was?.endsAt === next?.endsAt && was?.startedAt === next?.startedAt) return;
    player.safety.accountBreak = next;
    if (screen === 'account') breakControls?.update(next);
    else renderDialog();
  } catch (error) {
    if (error.message === 'signin' && version === breakRefresh && player?.id === owner && $('#dialog').open) {
      player = null;
      playerSessionStartedAt = undefined;
      restoreGuestFavorites();
      updateAccount();
      updateSessionReminder();
      openPanel('signin');
    }
  }
}

async function resumePlayerEntry(access) {
  const clean=new URL(location.href);
  clean.searchParams.delete('access');history.replaceState(history.state,'',clean);
  if (['signup','signin'].includes(access)) {
    const gift=clean.searchParams.get('gift');
    if(giftLabel(gift,false)){
      if(player){giftMenu.open(gift);return;}
      clearDemoSelection();afterSignIn='gifts';requestedGift=gift;
    } else if(clean.searchParams.get('event')==='raffle'){
      if(player){eventBoard.resume();return;}
      clearDemoSelection();afterSignIn='raffle';
    }
    const tab=clean.searchParams.get('club');
    if(clean.searchParams.get('view')==='promotions' && ['daily','quests','rewards','league'].includes(tab)){
      if(player){clubHome.select(tab);return;}
      clearDemoSelection();afterSignIn='clubHome';requestedClubTab=tab;
    }
    openPanel(player?'account':access);
  }
  else {
    try {
      const saved=JSON.parse(sessionStorage.getItem('habibi-auth-destination') || '{}');
      if(saved.page){
        const previous=new URL(saved.page,location.origin),current=new URL(location.href);
        const route=previous.pathname.slice(appBasePath.length);
        if(previous.origin===location.origin && previous.pathname.startsWith(appPath('/')) && (/^\/$|^\/(coming-soon|help)\/[a-z0-9-]{1,64}$/.test(route)) && previous.href!==current.href){
          previous.searchParams.set('access',access);
          sessionStorage.setItem('habibi-auth-destination',JSON.stringify({...saved,page:null}));
          location.replace(previous.href);
          return;
        }
      }
      if (['discovery','support','clubHome','raffle','gifts'].includes(saved.afterSignIn)) afterSignIn=saved.afterSignIn;
      if(giftLabel(saved.requestedGift,false))requestedGift=saved.requestedGift;
      if (typeof saved.requestedClubTab==='string') requestedClubTab=saved.requestedClubTab;
    } catch {}
    sessionStorage.removeItem('habibi-auth-destination');
    try {
      if (access!=='return') throw new Error(({cancelled:'providerCancelled',expired:'providerExpired',unverified:'providerUnverified'})[access]);
      await playerLoginUi.resume();
    } catch(error) {openPanel('signin');$('#panel .auth-error').textContent=t(error.message);}
  }
}

async function finishPlayerSignIn(auth, openDestination=true) {
  player = auth;
  const favoritesSynced = await adoptAccountFavorites(auth);
  if (!favoritesSynced) $('#favorites-status').textContent = t('favoriteSaveFailed');
  playerSessionStartedAt = auth.sessionStartedAt;
  const pendingSlug = sessionStorage.getItem('northplay-pending-preview');
  if (!pendingSlug) language = publicLanguage(auth.preferredLocale);
  if (publicLocales.includes(auth.preferredLocale)) localStorage.setItem('northplay-language', language ? 'fr' : 'en');
  render();
  if (!openDestination) return;
  const target = afterSignIn || (selectedGame ? 'play' : 'account');
  if (target === 'discovery' && requestedClubTab) discoveryPlayer.openTab(requestedClubTab, player.id);
  if (target === 'play' && pendingSlug) {
    try {
      const fresh = await api('coming-soon/' + encodeURIComponent(pendingSlug) + '?locale=' + siteContentLocale(), undefined, 'GET');
      if (fresh.demoGame !== selectedGame.id) throw new Error('demoUnavailable');
      selectDemo(fresh.demoGame, fresh);
    } catch {
      clearDemoSelection();
      openPanel('account');
      $('#panel').prepend(element('p', t('demoUnavailable')));
      return;
    }
  }
  const pendingClubSection=requestedClubTab, pendingGift=requestedGift;
  requestedGift=undefined;
  clearPendingDemo();
  afterSignIn = undefined;
  requestedClubTab = undefined;
  if (target === 'clubHome') { $('#dialog').close(); clubHome.select(pendingClubSection); }
  else if (target === 'gifts') { $('#dialog').close();requestAnimationFrame(()=>giftMenu.open(pendingGift)); }
  else if (target === 'raffle') { $('#dialog').close();eventBoard.resume(); }
  else if (target === 'support') openSupportCenter(); else openPanel(target);
}
const playerLoginUi=createPlayerSignInUi({
  element,action,api,t,locale:()=>language?'fr-CA':'en-CA',open:openPanel,complete:finishPlayerSignIn,
  verification(email,url){pendingVerificationEmail=email;pendingVerificationUrl=url;openPanel('emailVerification');},
  policy:()=>tenantPolicyLinks[language?'termsUrlFr':'termsUrlEn'] || tenantPolicyLinks.termsUrlEn || tenantPolicyLinks.termsUrlFr,
  saveIntent(){
    const view=new URL(location.href);view.searchParams.delete('access');
    sessionStorage.setItem('habibi-auth-destination',JSON.stringify({afterSignIn,requestedClubTab,requestedGift,page:view.pathname+view.search+view.hash}));
  }
});
function renderDialog() {
  breakControls = undefined;
  const panel = $('#panel');
  panel.replaceChildren();
  const brandedAuth = document.body.dataset.lobbyBrand === 'habibi' && ['signin','signup'].includes(screen);
  const brandedRecovery=document.body.dataset.lobbyBrand==='habibi' && ['emailVerification','passwordReset'].includes(screen);
  $('#dialog').classList.toggle('habibi-auth', brandedAuth || brandedRecovery);
  $('#dialog').dataset.screen = screen;
  $('#status').textContent = dialogError ? t(dialogError) : '';
  const title = element('h2', screen === 'play' ? (selectedPreview ? (language ? selectedPreview.titleFr : selectedPreview.titleEn) : gameName(selectedGame)) : screen === 'support' ? t('supportTitle') : screen === 'passwordReset' ? t('passwordResetTitle') : screen === 'emailVerification' ? t('emailVerification') : screen === 'emailChange' ? t('emailChangeTitle') : t(screen));
  title.id = 'dialog-title';
  title.tabIndex = -1;
  $('#dialog').setAttribute('aria-labelledby', title.id);
  panel.append(title);
  if ($('#dialog').open) title.focus();
  if (brandedAuth) {
    playerLoginUi.mount(panel,title,screen==='signup');
    return;
  }
  if (screen === 'signin' || screen === 'signup') {
    if (selectedPreview && !afterSignIn) panel.append(element('p', language ? selectedPreview.titleFr : selectedPreview.titleEn, 'demo-signin-title'));
    const signup = screen === 'signup';
    const signupFields=[];
    if(signup){
      const code=field('referralCode','text',language?'Code de parrainage (facultatif)':'Referral code (optional)','off');
      const input=code.querySelector('input');input.required=false;input.maxLength=48;signupFields.push(code);
    }
    panel.append(submitForm([
      field('email', 'email', t('email'), 'email'),
      field('password', 'password', t('password'), signup ? 'new-password' : 'current-password'), ...signupFields
    ], t(screen), async (data) => {
      const auth = await api(signup ? 'signup' : 'login', { ...data, ...(signup ? { locale: language ? 'fr-CA' : 'en-CA' } : {}) });
      if (auth.verificationRequired) {
        pendingVerificationEmail = data.email;
        pendingVerificationUrl = auth.verifyUrl;
        openPanel('emailVerification');
        return;
      }
      await finishPlayerSignIn(auth);
    }));
    panel.append(action(t(signup ? 'signin' : 'signup'), () => openPanel(signup ? 'signin' : 'signup'), 'ghost'));
    if (!signup) {
      panel.append(action(t('passwordReset'), () => openPanel('passwordReset'), 'ghost'));
      panel.append(action(t('emailVerificationSend'), () => {
        pendingVerificationEmail = undefined;
        openPanel('emailVerification');
      }, 'ghost'));
    }
    return;
  }
  if (screen === 'emailVerification') {
    if (verifyToken) {
      panel.append(element('p', t('emailVerificationHelp')));
      panel.append(submitForm([], t('emailVerificationSubmit'), async () => {
        await api('email-verification/complete', { token: verifyToken });
        history.replaceState(null, '', location.pathname);
        openPanel('signin');
        $('#status').textContent = t('emailVerified');
      }));
    } else {
      panel.append(element('p', t('emailVerificationHelp')));
      const form = submitForm([field('email', 'email', t('email'), 'email')], t('emailVerificationSend'), async ({ email }) => {
        const result = await api('email-verification/request', { email, locale: language ? 'fr-CA' : 'en-CA' });
        $('#status').textContent = t(result.message);
        if (result.verifyUrl) {
          const link = element('a', t('emailVerificationSubmit'));
          link.href = result.verifyUrl;
          (panel.querySelector('.auth-recovery .auth-form-panel') || panel).append(link);
        }
      });
      if (pendingVerificationEmail) form.querySelector('input').value = pendingVerificationEmail;
      panel.append(form);
      if (pendingVerificationUrl) {
        const link = element('a', t('emailVerificationSubmit'));
        link.href = pendingVerificationUrl;
        panel.append(link);
      }
    }
    panel.append(action(t('signin'), () => { history.replaceState(null, '', location.pathname); openPanel('signin'); }, 'ghost'));
    if (brandedRecovery) playerLoginUi.recovery(panel);
    return;
  }
  if (screen === 'emailChange') {
    if (emailChangeToken) {
      panel.append(element('p', t('emailChangeConfirmHelp')));
      panel.append(submitForm([], t('emailChangeConfirm'), async () => {
        await api('account/email-change/complete', { token: emailChangeToken });
        history.replaceState(null, '', location.pathname);
        player = null;
        restoreGuestFavorites();
        playerSessionStartedAt = undefined;
        updateAccount();
        updateSessionReminder();
        openPanel('signin');
        $('#status').textContent = t('emailChangeComplete');
      }));
    } else {
      panel.append(element('p', t('emailChangeHelp')));
      panel.append(submitForm([
        field('email', 'email', t('email'), 'email'),
        field('password', 'password', t('currentPassword'), 'current-password')
      ], t('emailChangeRequest'), async ({ email, password }) => {
        const response = await api('account/email-change/request', { email, password, locale: language ? 'fr-CA' : 'en-CA' });
        $('#status').textContent = t(response.message);
        if (response.changeUrl) {
          const link = element('a', t('emailChangeConfirm'));
          link.href = response.changeUrl;
          (panel.querySelector('.auth-recovery .auth-form-panel') || panel).append(link);
        }
      }));
    }
    panel.append(action(t('account'), () => { history.replaceState(null, '', location.pathname); openPanel('account'); }, 'ghost'));
    return;
  }
  if (screen === 'passwordReset') {
    if (resetToken) {
      panel.append(submitForm([
        field('password', 'password', t('newPassword'), 'new-password'),
        field('confirmPassword', 'password', t('confirmPassword'), 'new-password')
      ], t('passwordResetSave'), async ({ password, confirmPassword }) => {
        if (password !== confirmPassword) { $('#status').textContent = t('passwordMismatch'); return; }
        await api('password-reset/complete', { token: resetToken, password });
        history.replaceState(null, '', location.pathname);
        openPanel('signin');
        $('#status').textContent = t('passwordResetComplete');
      }));
    } else {
      panel.append(element('p', t('passwordResetHelp')));
      panel.append(submitForm([field('email', 'email', t('email'), 'email')], t('passwordResetSend'), async ({ email }) => {
        const result = await api('password-reset/request', { email, locale: language ? 'fr-CA' : 'en-CA' });
        $('#status').textContent = t(result.message);
        if (result.resetUrl) {
          const link = element('a', t('passwordResetTitle'));
          link.href = result.resetUrl;
          (panel.querySelector('.auth-recovery .auth-form-panel') || panel).append(link);
        }
      }));
    }
    panel.append(action(t('signin'), () => { history.replaceState(null, '', location.pathname); openPanel('signin'); }, 'ghost'));
    if (brandedRecovery) playerLoginUi.recovery(panel);
    return;
  }
  if (screen === 'discovery') {
    const content=element('div');
    panel.append(content);
    void discoveryPlayer.render(content,player.id);
    return;
  }
  if (screen === 'account') {
    panel.append(action(t('discovery'),()=>openPanel('discovery'),'ghost'));
    breakControls = createBreakControls({
      element, t, locale: language ? 'fr-CA' : 'en-CA', period: player.safety.accountBreak,
      browseHref: appPath('/') + '#games',
      submit: async minutes => {
        const owner = player.id;
        ++breakRefresh;
        const safety = minutes === 15 ? await api('safety/pause', {})
          : (await api('safety/cooling-off', { days: minutes / 1440 })).safety;
        if (player?.id === owner) {
          ++breakRefresh;
          player.safety = safety;
          breakControls?.update(safety.accountBreak);
        }
        return safety.accountBreak;
      }
    });
    panel.append(breakControls.section);
  }
  panel.append(element('p', t('balanceLabel') + ' · ' + money(player.balance)));
  const resetBalanceButton = action(t('resetDemoBalance'), async () => {
    if (!window.confirm(t('confirmResetDemoBalance'))) return;
    resetBalanceButton.disabled = true;
    try {
      player = await api('account/demo-balance/reset', {});
      renderDialog();
      $('#status').textContent = t(player.balanceReset ? 'demoBalanceReset' : 'demoBalanceAlreadyAtStart');
    } catch (error) {
      dialogError = error.message;
      $('#status').textContent = t(dialogError);
    } finally {
      resetBalanceButton.disabled = false;
    }
  }, 'ghost');
  panel.append(resetBalanceButton);
  const wageredToday = player.safety.dailyWagered ?? 0;
  const dailyLimit = player.safety.dailyLimit;
  const usage = element('div', '', 'daily-limit-usage');
  usage.append(element('p', t('dailyLimitProgress')
    .replace('{used}', money(wageredToday))
    .replace('{limit}', money(dailyLimit))
    .replace('{remaining}', money(Math.max(0, dailyLimit - wageredToday)))));
  const usageBar = document.createElement('progress');
  usageBar.max = dailyLimit;
  usageBar.value = Math.min(wageredToday, dailyLimit);
  usageBar.setAttribute('aria-label', t('dailyLimitProgressLabel'));
  usage.append(usageBar);
  panel.append(usage);
  if (screen === 'play') {
    if (player.safety.excluded || player.safety.accountBreak) {
      if (player.safety.excluded) panel.append(element('p', t('excluded')));
      else {
        const status = element('div', '', 'account-break');
        showBreakPeriod(status, player.safety.accountBreak, t, language ? 'fr-CA' : 'en-CA');
        panel.append(status);
      }
      return;
    }
    if (selectedPreview?.artwork) {
      const cover = element('img', '', 'demo-round-cover');
      cover.src = selectedPreview.artwork;
      cover.alt = '';
      panel.append(cover);
    }
    panel.append(element('p', t('simulation')));
    const gameRules = { gold: 'slotRules', aurora: 'slotRules', blackjack: 'blackjackRules', roulette: 'rouletteRules' };
    panel.append(element('p', t(gameRules[selectedGame.id]), 'game-rule'));
    const label = element('label', t('wager'));
    const select = element('select');
    select.name = 'wager';
    for (const amount of [100, 500, 1000]) {
      const option = element('option', money(amount));
      option.value = String(amount);
      select.append(option);
    }
    label.append(select);
    let colorSelect;
    if (selectedGame.id === 'roulette') {
      const colorLabel = element('label', t('pickColor'));
      colorSelect = element('select');
      colorSelect.name = 'choice';
      for (const color of ['red', 'black']) {
        const option = element('option', t(color));
        option.value = color;
        colorSelect.append(option);
      }
      colorLabel.append(colorSelect);
      panel.append(colorLabel);
    }
    if (result !== undefined) {
      const resultAnnouncement = element('div');
      resultAnnouncement.setAttribute('role', 'status');
      resultAnnouncement.setAttribute('aria-live', 'polite');
      resultAnnouncement.setAttribute('aria-atomic', 'true');
      resultAnnouncement.append(element('p', result.amount > 0 ? t('won') + ' · +' + money(result.amount) : result.amount === 0 ? t('push') : t('lost') + ' · ' + money(result.amount), 'round-result'));
      const outcomeSummary = describeOutcome(selectedGame.id, result.outcome);
      if (outcomeSummary) {
        const resultClass = ['gold', 'aurora'].includes(selectedGame.id) ? 'reel-result' : selectedGame.id === 'blackjack' ? 'hand-result' : 'round-detail';
        resultAnnouncement.append(element('p', outcomeSummary, resultClass));
      }
      panel.append(resultAnnouncement);
    }
    let pending;
    const roundError = element('p', '', 'demo-round-error');
    roundError.setAttribute('role','alert');
    const fields = colorSelect ? [label, colorSelect.parentElement] : [label];
    panel.append(submitForm(fields, t('play'), async ({ wager, choice }) => {
      if (!pending || pending.wager !== Number(wager) || pending.choice !== choice) {
        const bytes = crypto.getRandomValues(new Uint8Array(18));
        const requestId = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
        pending = { game: selectedGame.id, wager: Number(wager), requestId, ...(choice ? { choice } : {}),
          ...(selectedPreview && {previewSlug: selectedPreview.slug, locale: siteContentLocale()}) };
      }
      const playingAccount = player.id;
      let response;
      try {
        response = await api('play', pending);
      } catch (error) {
        roundError.textContent = t(error.message);
        throw error;
      }
      if (player?.id !== playingAccount) return;
      player = response;
      updateAccount();
      if (!$('#dialog').open || screen !== 'play' || selectedGame?.id !== pending.game ||
          selectedPreview?.slug !== pending.previewSlug || !roundError.isConnected) return;
      result = { amount: response.amount, outcome: response.outcome };
      dialogError = undefined;
      renderDialog();
    }, t('roundInProgress')), roundError, action(t('history'), () => openPanel('account'), 'ghost'));
    return;
  }
  if (screen === 'support') {
    const back=()=>action(t('supportTickets'),()=>loadPlayerCases(supportList?.page || 1),'ghost');
    if (supportView==='list') {
      panel.append(action(t('supportNewCase'),()=>composeSupport()),action(t('account'),()=>openPanel('account'),'ghost'));
      panel.append(element('h3',t('supportTickets')));
      if (!supportList) { panel.append(loadingPlayerCases?element('p',t('loading')):action(t('supportRefresh'),()=>loadPlayerCases(),'ghost'));return; }
      if (!supportList.total) panel.append(element('p',t('supportNoTickets')));
      for (const ticket of supportList.tickets) {
        const row=action('',()=>readPlayerCase(ticket.id),'ghost case-inbox-row');
        row.append(element('strong','#'+ticket.id+' · '+ticket.subject),
          element('small',[ticket.unread?t('supportUnreadCase'):'',t(supportStatusCopy[ticket.status]),ticket.reference,
            new Date(ticket.updatedAt).toLocaleDateString(language?'fr-CA':'en-CA')].filter(Boolean).join(' · ')));
        panel.append(row);
      }
      if (supportList.pages>1) {
        const nav=element('div','','case-pager');
        const prev=action(t('playerPrevious'),()=>loadPlayerCases(supportList.page-1),'ghost');
        const next=action(t('playerNext'),()=>loadPlayerCases(supportList.page+1),'ghost');
        prev.disabled=supportList.page===1;next.disabled=supportList.page===supportList.pages;
        nav.append(prev,element('span',supportList.page+' / '+supportList.pages),next);panel.append(nav);
      }
      return;
    }
    panel.append(back());
    if (supportView==='new') {
      panel.append(element('p', t('supportIntro')));
      const categoryLabel = element('label', t('supportCategory'));
      const category = element('select');
      category.name = 'category';
      for (const [value, key] of Object.entries(supportCategoryCopy)) {
        const option = element('option', t(key));
        option.value = value;
        category.append(option);
      }
      if (supportReference.startsWith('round-')) category.value = 'game';
      categoryLabel.append(category);
      const messageLabel = element('label', t('supportMessage'));
      const message = element('textarea');
      Object.assign(message, { name: 'message', required: true, minLength: 10, maxLength: 3000, rows: 5 });
      messageLabel.append(message);
      const ref=field('reference','text',t('supportLinkedRef'),'off');
      const refInput=ref.querySelector('input');refInput.required=false;refInput.value=supportReference;refInput.placeholder='round-…, claim-…, save-…, activity-…';
      panel.append(submitForm([categoryLabel, messageLabel, ref], t('supportSend'), async ({ category: ticketCategory, message: ticketMessage,reference }) => {
        const request=supportRequest, owner=player.id;
        const opened=await api('support', { category: ticketCategory, message: ticketMessage,reference:reference.trim() });
        if (supportCurrent(request,owner)) await readPlayerCase(opened.id,'supportSent');
      }));
      return;
    }
    if (supportTicket) {
      const ticket=supportTicket;
      const article = element('article', '', 'support-ticket');
      article.append(element('strong', `${t(supportCategoryCopy[ticket.isComplaint ? 'complaint' : ticket.category])} · ${t(supportStatusCopy[ticket.status])}`));
      article.append(element('small', `${t('supportReference')} #${ticket.id}`));
      if(ticket.reference)article.append(element('small',ticket.reference));
      article.append(element('small', `${t('supportCreated')}: ${new Date(ticket.createdAt).toLocaleString(language ? 'fr-CA' : 'en-CA')} · ${t('supportLastUpdated')}: ${new Date(ticket.updatedAt).toLocaleString(language ? 'fr-CA' : 'en-CA')}`));
      article.append(element('h3', t('supportThread')));
      for (const message of supportThreadEntries(ticket)) {
        const author = message.authorType === 'staff' ? t('supportStaffAuthor') : t('supportPlayerAuthor');
        article.append(supportMessageElement(author, message.message, message.createdAt, message.authorType === 'staff' ? 'from-staff' : 'from-player'));
      }
      const followupLabel = element('label', t('supportFollowup'));
      const followup = element('textarea');
      Object.assign(followup, { name: 'message', required: true, maxLength: 3000, rows: 3 });
      followupLabel.append(followup);
      article.append(submitForm([followupLabel], t('supportFollowupSend'), async ({ message }) => {
        const request=supportRequest, owner=player.id;
        await api('support/reply', { ticketId: ticket.id, message });
        if (supportCurrent(request,owner)) await readPlayerCase(ticket.id,'supportFollowupSent');
      }));
      panel.append(article);
    }
    return;
  }
  if (player.displayName) panel.append(element('p', t('welcomeBackName').replace('{name}', player.displayName), 'profile-greeting'));
  reviewUi.player(panel,()=>player?.id);
  panel.append(element('p', player.email), element('p', `${t('emailStatusLabel')}: ${t(player.emailVerified ? 'emailVerifiedStatus' : 'emailUnverifiedStatus')}`), element('p', `${t('savedLanguageLabel')}: ${t(player.preferredLocale === 'fr-CA' ? 'frenchLanguage' : 'englishLanguage')}`), action(t('changeEmail'), () => openPanel('emailChange'), 'ghost'), element('h3', t('accountProfileTitle')));
  const displayNameLabel = element('label', t('displayName'));
  const displayNameInput = element('input');
  Object.assign(displayNameInput, { name: 'displayName', value: player.displayName || '', maxLength: 40, autocomplete: 'nickname' });
  const displayNameHelpText = element('small', t('displayNameHelp'));
  const displayNameCounter = element('small', '');
  displayNameCounter.id = 'display-name-count';
  displayNameCounter.setAttribute('aria-live', 'polite');
  displayNameInput.setAttribute('aria-describedby', 'display-name-count');
  const updateDisplayNameCount = () => {
    displayNameCounter.textContent = t('displayNameCount').replace('{count}', String(displayNameInput.value.length));
  };
  displayNameInput.addEventListener('input', updateDisplayNameCount);
  updateDisplayNameCount();
  displayNameLabel.append(displayNameInput, displayNameHelpText, displayNameCounter);
  const profileLanguageLabel = element('label', t('preferredLanguage'));
  const profileLanguageSelect = element('select');
  profileLanguageSelect.name = 'locale';
  for (const locale of publicLocales) {
    const key = locale === 'fr-CA' ? 'frenchLanguage' : 'englishLanguage';
    const option = element('option', t(key));
    option.value = locale;
    option.selected = player.preferredLocale === locale;
    profileLanguageSelect.append(option);
  }
  profileLanguageLabel.append(profileLanguageSelect);
  const profileForm = element('form');
  const profileSave = element('button', t('saveProfile'));
  if(document.body.dataset.lobbyBrand==='habibi') {
    if(player.username) profileForm.append(element('p',t('username')+' · '+player.username));
    else {
      const alias=field('username','text',t('usernameOptional'),'username'),input=alias.querySelector('input');
      Object.assign(input,{required:false,minLength:3,maxLength:24,pattern:'[A-Za-z0-9][A-Za-z0-9_.\\\\-]{2,23}',spellcheck:false});
      alias.append(element('small',t('usernameHelp')));profileForm.append(alias);
    }
  }
  profileForm.append(displayNameLabel, profileLanguageLabel, profileSave);
  profileForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    profileSave.disabled = true;
    try {
      player = await api('account/profile', { displayName: displayNameInput.value, locale: profileLanguageSelect.value, ...(profileForm.elements.username?.value ? {username:profileForm.elements.username.value} : {}) });
      language = publicLanguage(player.preferredLocale);
      localStorage.setItem('northplay-language', language ? 'fr' : 'en');
      render();
      $('#status').textContent = t('profileSaved');
    } catch (error) {
      dialogError = error.message;
      $('#status').textContent = t(dialogError);
    } finally {
      profileSave.disabled = false;
    }
  });
  panel.append(profileForm);
  panel.append(element('h3', t('accountSecurity')), action(t('signOutOtherSessions'), async () => {
    if (!window.confirm(t('confirmSignOutOtherSessions'))) return;
    try {
      player = await api('account/sessions/revoke-others', {});
      renderDialog();
      const count = player.revokedSessions;
      $('#status').textContent = count ? t('sessionsRevoked').replace('{count}', new Intl.NumberFormat(language ? 'fr-CA' : 'en-CA').format(count)) : t('noOtherSessions');
    } catch (error) {
      dialogError = error.message;
      $('#status').textContent = t(dialogError);
    }
  }, 'ghost'));
  panel.append(element('h3', t('communicationPreferences')));
  const marketingLabel = element('label', t('marketingConsentText'), 'consent-label');
  const marketingCheckbox = element('input');
  Object.assign(marketingCheckbox, { type: 'checkbox', name: 'marketingEmail', checked: Boolean(player.marketingEmailConsent) });
  marketingLabel.prepend(marketingCheckbox);
  const consentForm = element('form');
  const consentButton = element('button', t('savePreferences'));
  consentForm.append(marketingLabel, consentButton);
  consentForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    consentButton.disabled = true;
    try {
      player = await api('account/consents', { marketingEmail: marketingCheckbox.checked });
      renderDialog();
      $('#status').textContent = t('consentSaved');
    } catch (error) {
      dialogError = error.message;
      $('#status').textContent = t(dialogError);
    } finally {
      consentButton.disabled = false;
    }
  });
  panel.append(consentForm, element('h3', t('history')));
  const list = element('ul', '', 'history');
  for (const entry of player.history) list.append(historyEntryElement(entry));
  panel.append(list);
  if (player.historyNextCursor) {
    const loadOlder = action(t('loadOlderActivity'), async () => {
      loadOlder.disabled = true;
      loadOlder.textContent = t('loadingActivity');
      try {
        const page = await api(`account/activity?beforeId=${encodeURIComponent(player.historyNextCursor)}`, undefined, 'GET');
        player.history.push(...page.entries);
        player.historyNextCursor = page.nextCursor;
        renderDialog();
      } catch (error) {
        dialogError = error.message;
        $('#status').textContent = t(dialogError);
      } finally {
        loadOlder.disabled = false;
        loadOlder.textContent = t('loadOlderActivity');
      }
    }, 'ghost');
    panel.append(loadOlder);
  }
  panel.append(submitForm([], t('logout'), async () => {
    await api('logout', {});
    player = null;
    restoreGuestFavorites();
    playerSessionStartedAt = undefined;
    clearDemoSelection();
    updateAccount();
    updateSessionReminder();
    $('#dialog').close();
  }));
  panel.append(element('p', t('exportDataHelp')));
  panel.append(action(t('exportData'), async () => {
    try {
      const data = await api('account/export', undefined, 'GET');
      const blobUrl = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
      const link = element('a', t('exportData'));
      link.href = blobUrl;
      link.download = `northplay-account-data-${new Date().toISOString().slice(0, 10)}.json`;
      panel.append(link);
      link.click();
      setTimeout(() => { URL.revokeObjectURL(blobUrl); link.remove(); }, 60_000);
      $('#status').textContent = t('exportReady');
    } catch (error) {
      dialogError = error.message;
      $('#status').textContent = t(dialogError);
    }
  }, 'ghost'));
  panel.append(action(t('exportActivityCsv'), async () => {
    try {
      const data = await api('account/export', undefined, 'GET');
      const headers = language
        ? ['Date (UTC)', 'Activité', 'Résultat de la partie', 'Mise (CAD)', 'Variation du solde (CAD)', 'Devise', 'Référence']
        : ['Date (UTC)', 'Activity', 'Round result', 'Wager (CAD)', 'Balance change (CAD)', 'Currency', 'Reference'];
      const rows = data.activity.map((entry) => {
        const reset = demoBalanceResetDetails(entry.outcome);
        return [
          entry.createdAt ? new Date(entry.createdAt).toISOString() : '',
          reset ? t('demoBalanceResetCsv') : clubCreditLabel(entry.outcome) || roundTitle(entry) || (language ? 'Crédit de départ' : 'Starting credit'),
          reset ? t('demoBalanceResetCsvDetail').replace('{balance}', money(reset.newBalance)) : describeOutcome(entry.game, entry.outcome),
          (entry.wager / 100).toFixed(2),
          (entry.amount / 100).toFixed(2),
          'CAD', entry.game ? 'round-' + entry.id : ''
        ];
      });
      const csv = '\uFEFF' + [headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n');
      const blobUrl = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
      const link = element('a', t('exportActivityCsv'));
      link.href = blobUrl;
      link.download = `northplay-activity-${new Date().toISOString().slice(0, 10)}.csv`;
      panel.append(link);
      link.click();
      setTimeout(() => { URL.revokeObjectURL(blobUrl); link.remove(); }, 60_000);
      $('#status').textContent = t('exportCsvReady');
    } catch (error) {
      dialogError = error.message;
      $('#status').textContent = t(dialogError);
    }
  }, 'ghost'));
  const passwordForm = element('form');
  const passwordButton = element('button', t('passwordChangeTitle'));
  passwordForm.append(
    field('currentPassword', 'password', t('currentPassword'), 'current-password'),
    field('newPassword', 'password', t('newPassword'), 'new-password'),
    field('confirmPassword', 'password', t('confirmPassword'), 'new-password'),
    passwordButton
  );
  passwordForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(passwordForm));
    if (values.newPassword !== values.confirmPassword) {
      $('#status').textContent = t('passwordMismatch');
      return;
    }
    passwordButton.disabled = true;
    try {
      player = await api('account/password', { currentPassword: values.currentPassword, newPassword: values.newPassword });
      updateAccount();
      renderDialog();
      $('#status').textContent = t('passwordChanged');
    } catch (error) {
      dialogError = error.message;
      $('#status').textContent = t(dialogError);
    } finally {
      passwordButton.disabled = false;
    }
  });
  panel.append(passwordForm);
  const limitForm = element('form');
  const limitLabel = element('label', t('dailyLimitLabel'));
  const limitSelect = element('select');
  limitSelect.name = 'dailyLimit';
  for (const cents of [500, 1000, 2500, 5000, 10000]) {
    const option = element('option', money(cents));
    option.value = String(cents);
    option.selected = player.safety.dailyLimit === cents;
    limitSelect.append(option);
  }
  limitLabel.append(limitSelect);
  const limitButton = element('button', t('saveLimit'));
  limitForm.append(limitLabel, limitButton);
  limitForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    limitButton.disabled = true;
    try {
      player = await api('safety/limit', { dailyLimit: Number(limitSelect.value) });
      openPanel('account');
    } catch (error) {
      dialogError = error.message;
      $('#status').textContent = t(dialogError);
    } finally {
      limitButton.disabled = false;
    }
  });
  panel.append(limitForm);
  const reminderForm = element('form');
  const reminderLabel = element('label', t('reminderFrequencyLabel'));
  const reminderSelect = element('select');
  reminderSelect.name = 'minutes';
  for (const [minutes, key] of [[30, 'reminder30'], [60, 'reminder60'], [120, 'reminder120']]) {
    const option = element('option', t(key));
    option.value = String(minutes);
    option.selected = (player.safety.sessionReminderMinutes || 60) === minutes;
    reminderSelect.append(option);
  }
  reminderLabel.append(reminderSelect);
  const reminderButton = element('button', t('saveReminder'));
  reminderForm.append(reminderLabel, reminderButton);
  reminderForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    reminderButton.disabled = true;
    try {
      player = await api('safety/reminder', { minutes: Number(reminderSelect.value) });
      updateSessionReminder();
      openPanel('account');
    } catch (error) {
      dialogError = error.message;
      $('#status').textContent = t(dialogError);
    } finally {
      reminderButton.disabled = false;
    }
  });
  panel.append(reminderForm);
  const supportReplies = player.supportReplies || 0;
  const supportLabel = supportReplies ? t('supportNewReplies').replace('{count}', new Intl.NumberFormat(language ? 'fr-CA' : 'en-CA').format(supportReplies)) : t('supportTitle');
  panel.append(action(t('contactInbox'),()=>{discoveryPlayer.openTab('inbox',player.id);openPanel('discovery');},'ghost'), action(supportLabel, openSupportCenter, 'ghost'), element('h3', t('safety')),
    action(t('exclude'), async () => {
      if (!window.confirm(t('confirmExclude'))) return;
      await api('safety/exclude', {});
      player = null;
      restoreGuestFavorites();
      playerSessionStartedAt = undefined;
      updateAccount();
      updateSessionReminder();
      $('#dialog').close();
    }, 'ghost'));
}

function openPanel(next) {
  if (!['signup','signin'].includes(next) && ['signup','signin'].includes(screen)) playerLoginUi.reset();
  if (next!=='support') ++supportRequest;
  screen = next;
  dialogError = undefined;
  renderDialog();
  if (!$('#dialog').open) $('#dialog').showModal();
  if ($('#dialog').classList.contains('habibi-auth')) {
    $('#dialog').scrollTop=0;
    $('#panel .auth-body').scrollTop=0;
    $('#dialog-title').focus({preventScroll:true});
  }
  if(next==='account'&&player){
    const owner=player.id,checkbox=$('#panel input[name="marketingEmail"]'),previous=checkbox?.checked;
    if(checkbox)void api('account/consents',undefined,'GET').then(current=>{
      if(player?.id===owner&&checkbox.isConnected&&checkbox.checked===previous){
        player.marketingEmailConsent=current.marketingEmailConsent;
        checkbox.checked=current.marketingEmailConsent;
      }
    }).catch(()=>{});
  }
  clearInterval(breakTimer);
  ++breakRefresh;
  if (player && ['account', 'play'].includes(next)) {
    void refreshOpenBreak();
    breakTimer = setInterval(refreshOpenBreak, 15_000);
  }
}
$('#dialog').addEventListener('close', () => { playerLoginUi.reset(); ++supportRequest; clearInterval(breakTimer); ++breakRefresh; if(!accountPending)void clubHome.sync(true); });
window.addEventListener('focus', refreshOpenBreak);
document.addEventListener('visibilitychange', refreshOpenBreak);

function cacheGuestFavorites() {
  try { localStorage.setItem('northplay-favorites', JSON.stringify([...guestFavorites])); } catch {}
}

function restoreGuestFavorites() {
  favorites = new Set(guestFavorites);
  $('#favorites-status').textContent = '';
  renderCatalog();
}

async function adoptAccountFavorites(account) {
  const merged = new Set([...(Array.isArray(account.favorites) ? account.favorites : []), ...guestFavorites]);
  favorites = merged;
  if (!guestFavorites.size) return true;
  try {
    const saved = await api('account/favorites', { favorites: [...guestFavorites], merge: true });
    favorites = new Set(saved.favorites);
    account.favorites = [...favorites];
    guestFavorites = new Set();
    cacheGuestFavorites();
    return true;
  } catch {
    return false;
  }
}

async function toggleFavorite(key) {
  if (favoriteSavePending) return;
  const previous = new Set(favorites);
  if (favorites.has(key)) favorites.delete(key);
  else favorites.add(key);
  if (!player) {
    guestFavorites = new Set(favorites);
    cacheGuestFavorites();
    announceFavorite('favoritesLocal');
    renderCatalog();
    return;
  }
  favoriteSavePending = true;
  renderCatalog();
  try {
    const preview = /^coming-soon:([1-9]\d*)$/.exec(key);
    const saved = preview ? await api('me/saved/' + preview[1] + '?locale=' + (language ? 'fr-CA' : 'en-CA'), undefined, favorites.has(key) ? 'PUT' : 'DELETE')
      : await api('account/favorite', { key, saved: favorites.has(key) });
    favorites = new Set(saved.favorites);
    player.favorites = [...favorites];
    guestFavorites = new Set();
    cacheGuestFavorites();
    announceFavorite('favoritesSynced', saved.activityId);
    void clubHome.sync(true);
  } catch {
    favorites = previous;
    announceFavorite('favoriteSaveFailed');
  } finally {
    favoriteSavePending = false;
    renderCatalog();
  }
}

function announceFavorite(message, activityId) {
  favoriteStatusKey = message;
  favoriteActivityId = activityId;
  const text = t(message) + (activityId ? ' · activity-' + activityId : '');
  $('#favorites-status').textContent = text;
  comingSoonUi.favoriteStatus(text);
}

function renderCatalog() {
  const recentGameOrder = new Map(), recentPreviews = new Map();
  for (const entry of player?.history || []) {
    if (!entry.game) continue;
    const preview = roundPreview(entry.outcome);
    const order = preview ? recentPreviews : recentGameOrder;
    const key = preview ? preview.slug : entry.game;
    if (!order.has(key)) order.set(key, order.size);
  }
  const editorial = comingSoonUi.renderLobby(filter, searchQuery, selectedCollection, recentPreviews);
  const previewTitle = comingSoonUi.renderDetail();
  if (previewTitle && !document.querySelector('link[rel="canonical"]')) document.title = `${previewTitle} · ${tenantBrandName}`;
  const filtering = filter !== 'all' || Boolean(searchQuery.trim() || selectedCollection);
  $('#lobby').toggleAttribute('data-filtered', filtering);
  $('#home-showcase').hidden = filtering;
  $('#home-games-heading').textContent = t(filter === 'all' ? 'games' : filter === 'recent' ? 'recentGames' : filter === 'live' ? 'homeLive' : filter);
  const originals = $('#home-originals .cards');
  const providers = $('#home-providers .cards');
  providers.replaceChildren();
  const createArt = (icon, theme) => {
    const art = element('span', '', `art ${theme}`);
    const mark = element('span', icon, 'art-icon');
    mark.setAttribute('aria-hidden', 'true');
    art.append(mark);
    return art;
  };
  const updateFavoriteButton = (button, key, name) => {
    const isFavorite = favorites.has(key);
    button.textContent = isFavorite ? '★' : '☆';
    button.disabled = favoriteSavePending;
    button.setAttribute('aria-pressed', String(isFavorite));
    button.setAttribute('aria-label', t(isFavorite ? 'removeFavorite' : 'addFavorite').replace('{game}', name));
  };
  const addFavoriteButton = (art, key, name) => {
    const button = action('', () => { void toggleFavorite(key); }, 'favorite-toggle');
    updateFavoriteButton(button, key, name);
    art.append(button);
  };
  const demoGames = games.filter((game) => {
    const key = `demo:${game.id}`;
    if (filter === 'favorites' && !favorites.has(key)) return false;
    if (filter === 'recent' && !recentGameOrder.has(game.id)) return false;
    if (filter !== 'all' && filter !== 'favorites' && filter !== 'recent' && filter !== game.type) return false;
    return !selectedCollection && matchesCatalogue(searchQuery, [...game.name, demoProviderName()], game.type);
  }).sort((a, b) => filter === 'recent'
    ? recentGameOrder.get(a.id) - recentGameOrder.get(b.id)
    : Number(tenantFeaturedGameIds.includes(b.id)) - Number(tenantFeaturedGameIds.includes(a.id)));
  const providerTitleCollator = new Intl.Collator(language ? 'fr-CA' : 'en-CA', { sensitivity: 'base', numeric: true });
  const visibleGames = providerGames.filter((game) => {
    const key = `provider:${game.provider}:${game.externalId}`;
    if (filter === 'favorites' && !favorites.has(key)) return false;
    if (filter !== 'all' && filter !== 'favorites' && filter !== game.category) return false;
    return !selectedCollection && matchesCatalogue(searchQuery, [game.titleEn, game.titleFr, game.provider, game.externalId], game.category);
  }).sort((a, b) => providerSort === 'recent'
    ? b.id - a.id
    : providerTitleCollator.compare(language ? a.titleFr : a.titleEn, language ? b.titleFr : b.titleEn));
  const hasListings = demoGames.length + visibleGames.length + editorial.count > 0;
  const hasCatalogue = Boolean(games.length || providerGames.length || editorial.available);
  $('#catalog-controls').hidden = !hasCatalogue && !selectedCollection;
  const summary = $('#catalog-summary');
  const seedProviders = providersStatus === 'loading' && summary.dataset.locale === (language ? 'fr-CA' : 'en-CA') ? Number(summary.dataset.providers) : 0;
  $('#provider-sort-control').hidden = !(providerGames.length || seedProviders) || Boolean(selectedCollection);
  const options = $('#home-options');
  options.hidden = $('#catalog-collection-control').hidden && $('#provider-sort-control').hidden;
  options.querySelector('summary').toggleAttribute('data-applied', Boolean(selectedCollection || (!$('#provider-sort-control').hidden && providerSort !== 'recent')));
  $('#provider-sort').value = providerSort;
  const countFormat = new Intl.NumberFormat(language ? 'fr-CA' : 'en-CA');
  const playableCount = demoGames.length + editorial.playable;
  const previewCount = visibleGames.length + (!filtering ? seedProviders : 0) + editorial.count - editorial.playable;
  const counts = [];
  if (playableCount) counts.push(t(playableCount === 1 ? 'demoCountOne' : 'demoCountMany').replace('{n}', countFormat.format(playableCount)));
  if (previewCount) counts.push(t(previewCount === 1 ? 'previewCountOne' : 'previewCountMany').replace('{n}', countFormat.format(previewCount)));
  $('#catalog-summary').textContent = counts.join(' · ');
  $('#catalog-summary').hidden = !counts.length;
  $('#catalog-empty').hidden = hasListings;
  const hasAvailableFavorite = editorial.hasFavorites || games.some((game) => favorites.has(`demo:${game.id}`)) ||
    providerGames.some((game) => favorites.has(`provider:${game.provider}:${game.externalId}`));
  const noFavorites = filter === 'favorites' && !hasAvailableFavorite;
  const noRecentGames = filter === 'recent' && recentGameOrder.size === 0 && recentPreviews.size === 0;
  $('#browse-all-games').hidden = hasListings || (filter === 'all' && !selectedCollection);
  $('#clear-game-search').hidden = hasListings || !searchQuery.trim() || noFavorites || noRecentGames;
  $('[data-copy="catalogEmptyTitle"]').textContent = noFavorites ? t('noFavoriteGamesTitle') : noRecentGames ? t('noRecentGamesTitle') : (hasCatalogue || selectedCollection) ? t('catalogNoMatchesTitle') : t('catalogEmptyTitle');
  $('[data-copy="catalogEmpty"]').textContent = noFavorites ? t('noFavoriteGames') : noRecentGames ? t('noRecentGames') : (hasCatalogue || selectedCollection) ? t('catalogNoMatches') : t('catalogEmpty');
  function demoCard(game) {
    const card = element('article', '', 'card demo-card');
    const art = element('span', '', 'art demo-cover');
    const image = element('img');
    image.src = appPath('/game-' + game.id + '.webp');
    image.alt = '';
    image.width = 464;
    image.height = 300;
    image.decoding = 'async';
    art.append(image);
    const info = element('span', '', 'card-info');
    if (tenantFeaturedGameIds.includes(game.id)) art.append(element('small', t('featuredBadge'), 'featured-label'));
    info.append(element('strong', gameName(game)), element('small', t(game.type)));
    info.append(element('span', t('playNow'), 'home-play-label'));
    const play = action('', () => startDemo(game.id), 'home-game-launch demo-play');
    play.setAttribute('aria-label', t('playNow') + ' · ' + gameName(game));
    play.append(art, info);
    card.append(play);
    addFavoriteButton(card, 'demo:' + game.id, gameName(game));
    return card;
  }
  const layout = JSON.stringify([language, tenantFeaturedGameIds, demoGames.map(game => game.id)]);
  if (originals.dataset.layout !== layout) {
    originals.replaceChildren(...demoGames.map(demoCard));
    originals.dataset.layout = layout;
  } else {
    demoGames.forEach((game, index) => {
      updateFavoriteButton(originals.children[index].querySelector('.favorite-toggle'), 'demo:' + game.id, gameName(game));
    });
  }
  const perPage=8,pages=Math.max(1,Math.ceil(visibleGames.length/perPage));
  const key=JSON.stringify([filter,searchQuery,selectedCollection,providerSort,language]);
  if(providerPageFilters!==key){providerPage=1;providerPageFilters=key;}
  const linkedIndex=linkedProviderId?visibleGames.findIndex(g=>g.id===linkedProviderId):-1;
  if(linkedIndex>=0)providerPage=1+Math.floor(linkedIndex/perPage);
  providerPage=Math.min(providerPage,pages);
  $('#provider-pages').hidden=pages===1;
  $('#provider-pages').setAttribute('aria-label',t('providerPages'));
  $('#provider-page-label').textContent=language?'Fiches fournisseurs · Page '+providerPage+' sur '+pages:'Provider listings · Page '+providerPage+' of '+pages;
  $('#provider-prev').disabled=providerPage<=1;$('#provider-next').disabled=providerPage>=pages;
  for (const game of visibleGames.slice((providerPage-1)*perPage,providerPage*perPage)) {
    const artClass = game.category === 'slots' ? 'gold' : game.category === 'live' ? 'aurora' : 'blackjack';
    const icon = game.category === 'slots' ? '✦' : game.category === 'live' ? '◉' : '♠';
    const card = element('article', '', 'card provider-card');
    card.id='provider-game-'+game.id;card.tabIndex=-1;
    const art = createArt(icon, artClass);
    addFavoriteButton(art, `provider:${game.provider}:${game.externalId}`, language ? game.titleFr : game.titleEn);
    const info = element('span', '', 'card-info');
    info.append(element('small', t('catalogListing'), 'catalog-label'), element('strong', language ? game.titleFr : game.titleEn), element('small', `${t(game.category)} · ${game.provider}`));
    card.append(art, info);
    providers.append(card);
  }
  $('#home-originals').hidden = !demoGames.length;
  $('#home-providers').hidden = !visibleGames.length;
  if(linkedIndex>=0){
    const link=document.getElementById('provider-game-'+linkedProviderId);linkedProviderId=0;
    link?.focus({preventScroll:true});link?.scrollIntoView({block:'nearest'});
  }
  lobbySections.render();
  renderFinderMatches();
  if (!accountPending) void clubHome.sync();
  void eventBoard.sync();
  void giftMenu.sync();
}

let providerStatus;
let currentStaffEmail;
let currentStaffId;
let currentStaffRole;
let currentStaffPermissions = {};
let renderedLanguage = language;
let currentStaffMfaEnabled = false;
let currentMfaSetupUri;
let providerGames = [];

function supportHref(key,id) {
  return appPath('/admin?'+new URLSearchParams({lang:language?'fr':'en',[key]:String(id)})+'#support-inbox');
}
const supportQueue=createSupportQueue({api,t,element,action,renderCase:renderStaffCase,
  formatDate:at=>new Date(at).toLocaleString(language?'fr-CA':'en-CA')});
let latestOverview = null;
const playerAccessUi = createPlayerAccessUi({ api, t, element, action, supportHref, appPath,
  renderRound: entry => historyEntryElement(entry, false),
  canManage: () => currentStaffPermissions.managePlayerAccess, locale: () => language ? 'fr-CA' : 'en-CA' });
const comingSoonUi = createComingSoonUi({
  api, t, element, action, appPath, currentRoute, openPlayer: playerAccessUi.open, catalogueParams,
  lobbyEnabled: () => publicComingSoon,
  isFrench: () => Boolean(language),
  getFavorites: () => favorites,
  favoritePending: () => favoriteSavePending,
  startDemo, toggleFavorite
});

const siteContentLocale = () => language ? 'fr-CA' : 'en-CA';
const clubHome = createClubHome({
  root:$('#player-club'),api,base:appBasePath,french:()=>Boolean(language),account:()=>player,accountPending:()=>accountPending,translate:t,openClub,openGame:startDemo,
  signIn(section){clearDemoSelection();requestedClubTab=section;afterSignIn='clubHome';openPanel('signin');},
  updateAccount(fresh){player=fresh;updateAccount();void giftMenu.sync(true);}
});
const giftMenu=createGiftMenu({api,base:appBasePath,french:()=>Boolean(language),account:()=>player,pending:()=>accountPending,translate:t,
  signin(key){clearDemoSelection();afterSignIn='gifts';requestedGift=key;openPanel('signin');},
  async refreshIdentity(expected){
    const fresh=await api('account',undefined,'GET');
    if((player?.id||0)!==expected)return;
    if(fresh){await finishPlayerSignIn(fresh,false);return;}
    player=null;playerSessionStartedAt=undefined;restoreGuestFavorites();render();
  },
  update(fresh){player=fresh;updateAccount();void clubHome.sync(true);}
});
const eventBoard=createEventBoard({api,base:appBasePath,ticketsChanged:()=>giftMenu.sync(true),french:()=>Boolean(language),account:()=>player,pending:()=>accountPending,translate:t,
  signin(){clearDemoSelection();afterSignIn='raffle';openPanel('signin');}});
const lobbySections = createLobbySections({
  french: () => Boolean(language), appPath, catalogue: comingSoonUi, providers: () => providerGames,
  house: () => ({name:demoProviderName(), count:games.length}), account: () => player, club:openClub, roundTitle, money,
  ready(view) {
    if (view === 'activity') return !accountPending;
    return editionStatus !== 'loading' && (view !== 'studios' || providersStatus !== 'loading');
  },
  editionFailed: () => editionStatus === 'error',
  retryEdition: () => void refreshEdition(),
  onNavigate(url) {
    if (headerFinder) headerFinder.open = false;
    giftMenu.close();
    const params = url.searchParams;
    const category = params.get('category');
    filter = ['slots', 'table', 'live', 'favorites', 'recent'].includes(category) ? category : 'all';
    searchQuery = (params.get('q') || '').slice(0, 120);
    selectedCollection = normalizeCatalogueText((params.get('collection') || '').slice(0, 128));
    $('#game-search').value = searchQuery;
    providerPage = 1;
    markSelectedFilter();
    const locale = params.get('lang');
    if ((locale === 'fr' || locale === 'en') && Boolean(language) !== (locale === 'fr')) {
      language = publicLanguage(locale + '-CA');
      localStorage.setItem('northplay-language', language ? 'fr' : 'en');
      render();
    } else {
      renderCatalog();
      updateDocumentTitle();
    }
    if (initialBrand) {
      const view = lobbyView(params.get('view'));
      for (const link of document.querySelectorAll('link[rel="canonical"],link[rel="alternate"][hreflang]')) {
        const lang = link.hreflang ? link.hreflang.slice(0, 2) : (language ? 'fr' : 'en');
        link.href = location.origin + appPath('/?') + new URLSearchParams(view ? { lang, view } : { lang });
      }
    }
  },
  support: enterPlayerSupport
});
const followupUi = createPublicationFollowup({ api, t, element, appPath, locale: siteContentLocale });
const publicWebsite = createPublicWebsiteContent({ api, element, t, currentRoute, locale: siteContentLocale, brand: () => tenantBrandName });
const websiteEditor = createWebsiteEditor({ api, element, action, t, appPath, locale: siteContentLocale, brand: () => tenantBrandName,
  canPublish: () => Boolean(currentStaffPermissions.publishWebsite) });

const growthPlayer=createGrowthPlayer({api,t,french:()=>Boolean(language),appPath,openSupport:openSupportCenter});
const growthAdmin=createGrowthAdmin({api,t,french:()=>Boolean(language),role:()=>currentStaffRole,appPath,openPlayer:id=>{adminWorkspace.open('coming-soon-saves');void playerAccessUi.open(id);},publish:()=>currentStaffPermissions.publishWebsite});
const discoveryPlayer=createDiscoveryPlayer({api,t,french:()=>Boolean(language),appPath,openSupport:openSupportCenter,extensions:growthPlayer});
const discoveryAdmin=createDiscoveryAdmin({api,t,supportHref,appPath,french:()=>Boolean(language),publish:()=>currentStaffPermissions.publishWebsite,
  openPlayer(ref){adminWorkspace.open('coming-soon-saves');const f=$('#coming-soon-save-search');f.elements.query.value=ref;f.requestSubmit();}});
const providerCatalogUi=createProviderCatalogUi({api,t,appPath,french:()=>Boolean(language),canPublish:()=>Boolean(currentStaffPermissions.publishCatalogue),
  openPanel:id=>adminWorkspace.open(id)});
const operatorUi=createOperatorUi({api,t,french:()=>Boolean(language),role:()=>currentStaffRole,
  staffId:()=>currentStaffId,canPublish:()=>Boolean(currentStaffPermissions.publishCatalogue),open:id=>adminWorkspace.open('operator-'+id)});
const reviewUi=createReviewUi({api,t,french:()=>Boolean(language),role:()=>currentStaffRole,staffId:()=>currentStaffId,open:target=>adminWorkspace.open('review-'+target)});
const partnerUi=createPartnerUi({api,t,french:()=>Boolean(language),appPath,staffId:()=>currentStaffId});
const shelfEditor=createShelfEditor({api,t,french:()=>Boolean(language),staffId:()=>currentStaffId,canPublish:()=>Boolean(currentStaffPermissions.publishCatalogue)});
const publicShelf=createPublicShelf({api,appPath,french:()=>Boolean(language)});
const pilotUi=createPilotUi({api,t,french:()=>Boolean(language),staffId:()=>currentStaffId});
const adminLoaders = {
  ...Object.fromEntries(['subjects','cashier','settings'].map(key=>['review-'+key,()=>reviewUi.load(key)])),
  'operator-clients':partnerUi.load,
  'operator-shelves':shelfEditor.load,
  'operator-pilot':pilotUi.load,
  ...Object.fromEntries(['products','sessions','services','orders'].map(key=>['operator-'+key,()=>operatorUi.load(key)])),
  ...Object.fromEntries(['partners','placements','report','review','experiments','polls','credits'].map(key=>['growth-'+key,()=>growthAdmin.load(key)])),
  'engagement-programs':()=>discoveryAdmin.load('programs'),
  'engagement-campaigns':()=>discoveryAdmin.load('campaigns'),
  'engagement-report':()=>discoveryAdmin.load('report'),
  'website-editorial': websiteEditor.load,
  overview: () => refreshOperatorOverview().catch((error) => { $('#overview-status').textContent = t(error.message); }),
  'coming-soon-admin': comingSoonUi.loadDrafts,
  'coming-soon-saves': comingSoonUi.loadSaves,
  'catalog-management':providerCatalogUi.directory, 'catalog-import':providerCatalogUi.openImport, 'catalog-history':providerCatalogUi.history,
  'support-inbox': supportQueue.refresh,
  'casino-settings': () => { if (savedTenantDraftSignature === undefined) void requestTenantDraft(); },
  'staff-management': () => refreshStaffList().catch((error) => { $('#staff-status').textContent = t(error.message); }),
  'audit-log': () => refreshStaffAudit().catch((error) => { $('#staff-audit-summary').textContent = t(error.message); })
};
const adminWorkspace = createAdminWorkspace($('#admin-tools'), (view, panel) => {
  if(panel!=='operator-clients') partnerUi.clear();
  const editorial = panel === 'website-editorial';
  for (const selector of ['#tenant-config','#tenant-config-preview','#tenant-settings-help']) $(selector).hidden = editorial;
  const load = adminLoaders[panel] || adminLoaders[view];
  if (load) void load();
}, t);

const reportUi = createReportUi({ api, t, element, action, appPath, role: () => currentStaffRole, locale: () => language ? 'fr-CA' : 'en-CA',
  refresh: refreshOperatorOverview, datesChanged: () => resetOverview('reportApplyHint'), openPlayer(reference) {
    adminWorkspace.open('coming-soon-saves');
    const form = $('#coming-soon-save-search');
    form.elements.query.value = reference;
    form.requestSubmit();
  } });

let growthBannerContext;
function render() {
  const growthContext=String(player?.id||0)+'|'+language+'|'+(player?.safety?.accountBreak?.endsAt||0);
  if(!isAdminPage && currentRoute==='/' && growthBannerContext!==growthContext){growthBannerContext=growthContext;void growthPlayer.banner($('#campaign-placement'));}
  const languageChanged = renderedLanguage !== language;
  renderedLanguage = language;
  if (languageChanged && !isAdminPage && currentRoute==='/') void publicShelf.refresh();
  if (languageChanged && !isAdminPage) {
    void publicWebsite.load();
    if (!publicWebsite.isHelp) void refreshEdition();
  }
  document.documentElement.lang = language ? 'fr-CA' : 'en-CA';
  if (initialBrand) {
    const preference = 'northplay_ui_locale=' + (language ? 'fr' : 'en');
    if (!document.cookie.split('; ').includes(preference)) document.cookie = preference + '; Path=' + appPath('/') + '; Max-Age=31536000; SameSite=Lax' + (location.protocol === 'https:' ? '; Secure' : '');
  }
  updateDocumentTitle();
  updateTenantPreview();
  renderFeaturedGameEditor();
  $('#skip-link').href = isAdminPage ? '#admin' : publicWebsite.isHelp ? '#site-public-help' : comingSoonUi.isDetail ? '#coming-soon-detail' : '#lobby';
  for (const node of document.querySelectorAll('[data-copy]')) node.textContent = t(node.dataset.copy);
  if (languageChanged) { adminWorkspace.syncPicker(); websiteEditor.translate(); }
  updateStaffRoleHelp();
  const announcement = $('#lobby-announcement');
  announcement.textContent = t('announcement');
  announcement.hidden = !announcement.textContent;
  renderFaqs();
  for (const node of document.querySelectorAll('[data-copy][aria-label]')) node.setAttribute('aria-label', t(node.dataset.copy));
  $('header nav').setAttribute('aria-label', t('primaryNav'));
  $('footer nav').setAttribute('aria-label', t('footerNav'));
  updatePolicyLinks();
  $('#game-search').placeholder = t(headerFinder ? 'headerSearchHint' : 'searchGames');
  if (headerFinder) {
    const lang = language ? 'fr' : 'en';
    $('#home-search input[name="lang"]').value = lang;
    const search = headerFinder.querySelector('summary');
    const submit = $('#home-search button[type="submit"]');
    const gifts = $('#header-gifts');
    for (const [control, key] of [[search, 'searchGames'], [submit, 'headerSearchSubmit'], [gifts, 'headerGifts']]) {
      control.title = t(key);
      control.setAttribute('aria-label', t(key));
    }
    $('#header-support').href = lobbySections.homeUrl({support:'1'});
  }
  $('#home-search').dataset.compact = t('searchCompact');
  $('#open-discovery').title = t('discovery');
  $('#language').textContent = language ? 'EN' : 'FR';
  $('#language').setAttribute('aria-label', t(language ? 'switchToEnglish' : 'switchToFrench'));
  if (languageChanged && currentStaffEmail && currentStaffRole) {
    $('#staff-identity').textContent = `${currentStaffEmail} · ${staffRoleLabel(currentStaffRole)}`;
  }
  if (languageChanged && currentStaffRole === 'operator_admin') renderStaffList();
  if (languageChanged && currentStaffPermissions.viewAudit) renderStaffAudit();
  if (languageChanged) followupUi.render();
  $('#close').setAttribute('aria-label', t('close'));
  $('#provider-status').textContent = providerStatus ? t(providerStatus) : '';
  updateAccount();
  renderCatalog();
  if (favoriteStatusKey) announceFavorite(favoriteStatusKey, favoriteActivityId);
  comingSoonUi.renderAdmin();
  if (languageChanged) {
    playerAccessUi.render();
    const current=document.querySelector('#engagement:not([hidden]) [data-admin-panel]:not([hidden])');
    if(current)void adminLoaders[current.id]?.();
  }
  providerCatalogUi.renderImport();
  if (languageChanged && adminWorkspace.isOpen('support-inbox')) supportQueue.render();
  if ($('#dialog').open && (languageChanged || !$('#dialog').classList.contains('habibi-auth'))) renderDialog();
  updateSessionReminder();
  if (latestOverview) renderOperatorOverview(latestOverview);
  if(languageChanged&&adminWorkspace.isOpen('catalog-management'))providerCatalogUi.directory();
  if(languageChanged&&adminWorkspace.isOpen('catalog-history'))void providerCatalogUi.history();
  if(languageChanged&&adminWorkspace.isOpen('catalog-import'))providerCatalogUi.showSaved();
  if(languageChanged&&currentStaffId) for(const key of ['subjects','cashier','settings']) if(adminWorkspace.isOpen('review-'+key))void reviewUi.load(key);
  if(languageChanged&&currentStaffId&&adminWorkspace.isOpen('operator-clients'))void partnerUi.load();
  if(languageChanged&&currentStaffId&&adminWorkspace.isOpen('operator-shelves'))void shelfEditor.load();
  if(languageChanged&&currentStaffId&&adminWorkspace.isOpen('operator-pilot'))void pilotUi.load();
  if(languageChanged && currentStaffId) for(const key of ['products','sessions','services','orders'])
    if(adminWorkspace.isOpen('operator-'+key)) void operatorUi.load(key);
}

$('#skip-link').addEventListener('click', (event) => {
  if (!isAdminPage || !currentStaffId) return;
  event.preventDefault();
  adminWorkspace.focusCurrent();
});

$('#language').addEventListener('click', async () => {
  const previousLanguage = language;
  const nextLocale = language ? 'en-CA' : 'fr-CA';
  const alternative = (publicWebsite.isHelp || comingSoonUi.isDetail) && document.querySelector(`link[rel="alternate"][hreflang="${nextLocale}"]`);
  if (alternative) {
    if (player) {
      try { await api('account/preferences', { locale: nextLocale }); }
      catch { return; }
    }
    localStorage.setItem('northplay-language', nextLocale.slice(0, 2));
    const url = new URL(alternative.href);
    if (comingSoonUi.isDetail) {
      const params = new URLSearchParams(location.search);
      for (const [key, value] of url.searchParams) params.set(key, value);
      url.search = params;
    }
    location.assign(url.pathname + url.search);
    return;
  }
  language = 1 - language;
  localStorage.setItem('northplay-language', language ? 'fr' : 'en');
  render();
  if (player) {
    try {
      player = await api('account/preferences', { locale: language ? 'fr-CA' : 'en-CA' });
      updateAccount();
      if ($('#dialog').open) renderDialog();
    } catch {
      language = previousLanguage;
      localStorage.setItem('northplay-language', language ? 'fr' : 'en');
      render();
      if ($('#dialog').open) $('#status').textContent = t('unavailable');
    }
  }
  if (!isAdminPage) {
    const url = new URL(location.href);
    if (publicWebsite.isHelp || url.searchParams.has('lang')) {
      url.searchParams.set('lang', language ? 'fr' : 'en');
      if (url.searchParams.has('locale')) url.searchParams.set('locale', siteContentLocale());
      history.replaceState(history.state, '', url);
    }
  }
});
$('#open-discovery').addEventListener('click',()=>{
  if(!player)afterSignIn='discovery';
  openPanel(player?'discovery':'signin');
});
$('#hero-join')?.addEventListener('click',event=>{if(event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;event.preventDefault();clearDemoSelection();openPanel('signup');});
$('#join-home').addEventListener('click', () => { clearDemoSelection(); openPanel('signup'); });
for (const shortcut of document.querySelectorAll('[data-club]')) {
  shortcut.addEventListener('click', () => { lobbySections.closeMenu(); openClub(shortcut.dataset.club); });
}
$('#account').addEventListener('click', () => {
  clearDemoSelection();
  openPanel(player ? 'account' : 'signin');
});
$('#safety-controls').addEventListener('click', () => openPanel(player ? 'account' : 'signin'));
$('#dialog').addEventListener('cancel', () => {
  if (!player) {
    clearDemoSelection();
  }
});
$('#close').addEventListener('click', () => {
  if (!player) {
    clearDemoSelection();
  }
  $('#dialog').close();
});
const headerFinder = $('#header-finder');
if (!headerFinder) $('#game-search').value = searchQuery;

function renderFinderMatches() {
  if (!headerFinder?.open) return;
  const query = $('#game-search').value.trim();
  const list = $('#finder-matches');
  const matches = new Map();
  const catalogueLink = label => lobbySections.homeUrl({q:label}, '#games');
  function suggest(label, fields, category, href) {
    if (matches.size < 5 && matchesCatalogue(query, fields, category)) matches.set(href, label);
  }
  if (query) {
    for (const game of games) {
      const name = gameName(game);
      suggest(name, [...game.name, demoProviderName()], game.type, catalogueLink(name));
    }
    for (const game of comingSoonUi.titles()) {
      if (matches.size >= 5) break;
      const name = language ? game.titleFr : game.titleEn;
      const locale = siteContentLocale();
      suggest(name, [game.titleFr, game.titleEn, game.studio, game.collectionFr, game.collectionEn], game.category,
        appPath('/coming-soon/' + encodeURIComponent(game.slug)) + '?' + new URLSearchParams({lang:locale.slice(0,2), locale}));
    }
    for (const game of providerGames) {
      if (matches.size >= 5) break;
      const name = language ? game.titleFr : game.titleEn;
      suggest(name, [game.titleEn, game.titleFr, game.provider, game.externalId], game.category, catalogueLink(name));
    }
  }
  const signature = JSON.stringify([...matches]);
  if (list.dataset.matches === signature) return;
  list.dataset.matches = signature;
  list.replaceChildren();
  for (const [href, label] of matches) {
    const item = element('li');
    const link = element('a', label);
    link.href = href;
    if (link.pathname === appPath('/')) link.className = 'hub-link';
    item.append(link);
    list.append(item);
  }
  list.hidden = !matches.size;
}

if (headerFinder) {
  headerFinder.addEventListener('toggle', () => {
    if (headerFinder.open) {
      $('#game-search').focus({preventScroll:true});
      renderFinderMatches();
    }
  });
  document.addEventListener('click', event => {
    if (headerFinder.open && !headerFinder.contains(event.target)) headerFinder.open = false;
  });
  document.addEventListener('focusin', event => {
    if (headerFinder.open && !headerFinder.contains(event.target)) headerFinder.open = false;
  });
  headerFinder.addEventListener('keydown', event => {
    if (!headerFinder.open || event.key !== 'Escape') return;
    event.preventDefault();
    headerFinder.open = false;
    headerFinder.querySelector('summary').focus();
  });
  $('#header-support').addEventListener('click', event => {
    if (accountPending || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    enterPlayerSupport();
  });
}
const filterButtons = [...document.querySelectorAll('#filters [data-filter]')];
function markSelectedFilter() {
  for (const button of filterButtons) button.setAttribute('aria-pressed', String(button.dataset.filter === filter));
}
markSelectedFilter();
document.addEventListener('click', (event) => {
  const options = $('#home-options');
  if (options.open && !options.contains(event.target)) options.open = false;
});
$('#home-options').addEventListener('keydown', (event) => {
  if (event.key !== 'Escape' || !event.currentTarget.open) return;
  event.currentTarget.open = false;
  event.currentTarget.querySelector('summary').focus();
});
$('#home-search').addEventListener('submit', (event) => {
  if (headerFinder && currentRoute !== '/') return;
  event.preventDefault();
  if (headerFinder || lobbySections.active()) {
    const query = $('#game-search').value.trim();
    lobbySections.navigate(lobbySections.homeUrl(query ? {q:query} : {}, '#games'));
    return;
  }
  $('#games').focus();
  $('#games').scrollIntoView({ block: 'start' });
});
document.addEventListener('keydown', (event) => {
  if ((!headerFinder && currentRoute !== '/') || event.key !== '/' || event.ctrlKey || event.altKey || event.metaKey || event.shiftKey ||
      event.defaultPrevented || $('#dialog').open || event.target.closest('input, textarea, select, [contenteditable]')) return;
  event.preventDefault();
  if (headerFinder) headerFinder.open = true;
  $('#game-search').focus();
});
$('#catalog-collection').addEventListener('change', (event) => {
  selectedCollection = event.currentTarget.value;
  if(player&&selectedCollection)void api('discovery/visit',{kind:'collection',key:selectedCollection,locale:language?'fr-CA':'en-CA'}).catch(()=>{});
  rememberCatalogue();
  renderCatalog();
});
$('#filters').addEventListener('click', (event) => {
  const button = event.target.closest('button[data-filter]');
  if (!button) return;
  lobbySections.closeMenu();
  if (lobbySections.active()) {
    if (player && button.dataset.filter === 'favorites') void api('discovery/visit', { kind: 'shelf' }).catch(() => {});
    lobbySections.navigate(lobbySections.homeUrl(button.dataset.filter === 'all' ? {} : { category: button.dataset.filter }, '#games'));
    return;
  }
  filter = button.dataset.filter;
  if(player&&filter==='favorites')void api('discovery/visit',{kind:'shelf'}).catch(()=>{});
  rememberCatalogue();
  markSelectedFilter();
  renderCatalog();
});
$('#browse-all-games').addEventListener('click', () => {
  filter = 'all';
  searchQuery = '';
  selectedCollection = '';
  rememberCatalogue();
  $('#game-search').value = '';
  markSelectedFilter();
  renderCatalog();
});
$('#clear-game-search').addEventListener('click', () => {
  searchQuery = '';
  rememberCatalogue();
  $('#game-search').value = '';
  renderCatalog();
});
$('#game-search').addEventListener('input', (event) => {
  if (headerFinder) { renderFinderMatches(); return; }
  if(lobbySections.active()) return;
  searchQuery = event.currentTarget.value;
  rememberCatalogue();
  renderCatalog();
});
for(const [id,offset] of [['provider-prev',-1],['provider-next',1]]){
  document.getElementById(id).addEventListener('click',()=>{
    providerPage+=offset;renderCatalog();
    $('#catalog .provider-card')?.focus();
  });
}
$('#provider-sort').addEventListener('change', (event) => {
  providerSort = event.currentTarget.value === 'alpha' ? 'alpha' : 'recent';
  localStorage.setItem('northplay-provider-sort', providerSort);
  renderCatalog();
});
$('#provider').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const buttons = Array.from(form.querySelectorAll('button'));
  const { name, key } = Object.fromEntries(new FormData(form));
  const view = event.submitter?.value === 'audit' ? 'audit' : event.submitter?.value === 'list' ? 'list' : 'save';
  for (const button of buttons) button.disabled = true;
  try {
    const providers = await api(view === 'audit' ? 'providers/audit' : view === 'list' ? 'providers/list' : 'providers', view === 'save' ? { name: name.trim(), key } : {});
    const list = $('#providers');
    list.replaceChildren(...providers.map((provider) => element('li', view === 'audit'
      ? `${provider.name} · ${t(provider.action)} · ${new Date(provider.created).toLocaleString(language ? 'fr-CA' : 'en-CA')}`
      : provider.name + ' · ••••••••')));
    providerStatus = view !== 'save' ? (providers.length ? undefined : 'empty') : 'saved';
  } catch (error) {
    providerStatus = error.message;
  } finally {
    form.elements.key.value = '';
    for (const button of buttons) button.disabled = false;
    $('#provider-status').textContent = providerStatus ? t(providerStatus) : '';
  }
});


async function loadTenantDraft() {
  const form = $('#tenant-config');
  const draft = await api('admin/config', undefined, 'GET');
  form.elements.localeEn.checked = draft.config.enabledLocales.includes('en-CA');
  form.elements.localeFr.checked = draft.config.enabledLocales.includes('fr-CA');
  form.elements.primaryLocale.value = draft.config.primaryLocale;
  updateBrandLocaleOptions();
  form.elements.showComingSoon.checked = draft.config.enabledSections.comingSoon;
  form.elements.showFaq.checked = draft.config.enabledSections.faq;
  form.elements.displayMarket.value = draft.config.displayMarket;
  const zone = draft.config.reportingTimeZone;
  const zones = new Set(['UTC', ...(Intl.supportedValuesOf?.('timeZone') ?? []), zone]);
  form.elements.reportingTimeZone.replaceChildren(...[...zones].map((name) => new Option(name, name, false, name === zone)));
  form.elements.brandName.value = draft.config.brandName;
  form.elements.brandLogo.value = draft.config.brandLogo || '';
  $('#brand-logo-file').value = '';
  form.elements.brandFavicon.value = draft.config.brandFavicon || '';
  $('#brand-favicon-file').value = '';
  form.elements.accentColor.value = draft.config.accentColor;
  form.elements.supportEmail.value = draft.config.supportEmail;
  form.elements.heroTitleEn.value = draft.config.heroTitleEn || copy.headline[0];
  form.elements.heroTitleFr.value = draft.config.heroTitleFr || copy.headline[1];
  form.elements.heroIntroEn.value = draft.config.heroIntroEn || copy.intro[0];
  form.elements.heroIntroFr.value = draft.config.heroIntroFr || copy.intro[1];
  form.elements.announcementEn.value = draft.config.announcementEn || '';
  form.elements.announcementFr.value = draft.config.announcementFr || '';
  const faqItems = Array.isArray(draft.config.faqItems) ? draft.config.faqItems : defaultFaqItems();
  faqItems.forEach((item, index) => {
    form.elements[`faq${index}QuestionEn`].value = item.questionEn;
    form.elements[`faq${index}AnswerEn`].value = item.answerEn;
    form.elements[`faq${index}QuestionFr`].value = item.questionFr;
    form.elements[`faq${index}AnswerFr`].value = item.answerFr;
  });
  renderFeaturedGameEditor(Array.isArray(draft.config.featuredGameIds) ? draft.config.featuredGameIds : ['gold', 'roulette']);
  form.elements.termsUrlEn.value = draft.config.termsUrlEn || '';
  form.elements.termsUrlFr.value = draft.config.termsUrlFr || '';
  form.elements.privacyUrlEn.value = draft.config.privacyUrlEn || '';
  form.elements.privacyUrlFr.value = draft.config.privacyUrlFr || '';
  form.elements.footerTextEn.value = draft.config.footerTextEn || copy.disclaimer[0];
  form.elements.footerTextFr.value = draft.config.footerTextFr || copy.disclaimer[1];
  savedTenantVersion = draft.version;
  savedTenantDraftSignature = draft.status === 'draft' ? JSON.stringify(readTenantConfig()) : null;
  $('#tenant-config-fields').disabled = false;
  $('#save-config').disabled = false;
  updateTenantPreview();
  $('#tenant-config-status').textContent = `v${draft.version}`;
}
function updateBrandLocaleOptions() {
  const { localeEn, localeFr, primaryLocale } = $('#tenant-config').elements;
  if (!localeEn.checked && !localeFr.checked) {
    const previous = primaryLocale.value === 'fr-CA' ? localeFr : localeEn;
    previous.checked = true;
  }
  primaryLocale.options[0].disabled = !localeEn.checked;
  primaryLocale.options[1].disabled = !localeFr.checked;
  if (primaryLocale.selectedOptions[0]?.disabled) primaryLocale.value = localeEn.checked ? 'en-CA' : 'fr-CA';
}
$('#tenant-config').addEventListener('input', (event) => {
  if (['localeEn', 'localeFr'].includes(event.target.name)) updateBrandLocaleOptions();
  updateTenantPreview();
});
$('#brand-logo-file').addEventListener('change', (event) => {
  const input = event.currentTarget;
  const file = input.files[0];
  if (!file) return;
  if (file.size > 48 * 1024 || !['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
    input.value = '';
    $('#tenant-config-status').textContent = t('brandLogoInvalid');
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    if (typeof reader.result !== 'string') {
      $('#tenant-config-status').textContent = t('brandLogoInvalid');
      return;
    }
    $('#tenant-config').elements.brandLogo.value = reader.result;
    updateTenantPreview();
  };
  reader.onerror = () => { $('#tenant-config-status').textContent = t('brandLogoInvalid'); };
  reader.readAsDataURL(file);
});
$('#remove-brand-logo').addEventListener('click', () => {
  $('#tenant-config').elements.brandLogo.value = '';
  $('#brand-logo-file').value = '';
  updateTenantPreview();
});
$('#brand-favicon-file').addEventListener('change', (event) => {
  const input = event.currentTarget;
  const file = input.files[0];
  if (!file) return;
  if (file.size > 16 * 1024 || !['image/png', 'image/webp'].includes(file.type)) {
    input.value = '';
    $('#tenant-config-status').textContent = t('brandFaviconInvalid');
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    if (typeof reader.result !== 'string') {
      $('#tenant-config-status').textContent = t('brandFaviconInvalid');
      return;
    }
    $('#tenant-config').elements.brandFavicon.value = reader.result;
    updateTenantPreview();
  };
  reader.onerror = () => { $('#tenant-config-status').textContent = t('brandFaviconInvalid'); };
  reader.readAsDataURL(file);
});
$('#remove-brand-favicon').addEventListener('click', () => {
  $('#tenant-config').elements.brandFavicon.value = '';
  $('#brand-favicon-file').value = '';
  updateTenantPreview();
});
async function requestTenantDraft() {
  const button = $('#load-config');
  if (button.disabled) return;
  button.disabled = true;
  $('#tenant-config-status').textContent = t('loading');
  try { await loadTenantDraft(); }
  catch (error) { $('#tenant-config-status').textContent = t(error.message); }
  finally { button.disabled = false; }
}
$('#load-config').addEventListener('click', requestTenantDraft);
$('#tenant-config').addEventListener('invalid', (event) => {
  const panel = event.target.closest('[data-admin-panel]');
  const firstInvalid = event.currentTarget.querySelector('input:invalid, textarea:invalid, select:invalid');
  if (panel?.hidden && event.target === firstInvalid) adminWorkspace.open(panel.id, false);
}, true);
$('#tenant-config').addEventListener('submit', async (event) => {
  event.preventDefault();
  const config = readTenantConfig();
  const button = $('#save-config');
  button.disabled = true;
  try {
    const result = await api('admin/config', { config, version: savedTenantVersion });
    savedTenantVersion = result.version;
    savedTenantDraftSignature = result.status === 'draft' ? JSON.stringify(config) : null;
    const message = result.status === 'draft' ? 'draftSaved' : 'configPublished';
    $('#tenant-config-status').textContent = `${t(message)} v${result.version}`;
  } catch (error) { $('#tenant-config-status').textContent = t(error.message); }
  finally {
    button.disabled = false;
    updateTenantPreview();
  }
});
$('#publish-config').addEventListener('click', async (event) => {
  event.currentTarget.disabled = true;
  try {
    const result = await api('admin/config/publish', { version: savedTenantVersion });
    savedTenantVersion = result.version;
    savedTenantDraftSignature = null;
    const published = await api('tenant', undefined, 'GET');
    applyTenant(published.config);
    $('#tenant-config-status').textContent = `${t('configPublished')} v${result.version}`;
  } catch (error) { $('#tenant-config-status').textContent = t(error.message); }
  finally { updateTenantPreview(); }
});

async function refreshStaffList() {
  staffMemberCache = await api('admin/staff', undefined, 'GET');
  renderStaffList();
}
function updateStaffRoleHelp() {
  const form = $('#staff-create');
  const role = form.elements.role.value;
  const helpKey = ({ operator_admin: 'roleAdminHelp', operator_content: 'roleContentHelp', operator_provider: 'roleProviderHelp', operator_support: 'roleSupportHelp' })[role];
  $('#staff-role-help').textContent = t(helpKey);
  displayStaffGrants($('#staff-create-grants'), role);
}
function displayStaffGrants(container, role) {
  const website = role === 'operator_content';
  const catalogue = website || role === 'operator_provider';
  const access = role === 'operator_support';
  container.hidden = !catalogue && !access;
  container.querySelector('[name="managePlayerAccess"]').closest('label').hidden = !access;
  container.querySelector('[name="publishCatalogue"]').closest('label').hidden = !catalogue;
  container.querySelector('[name="publishWebsite"]').closest('label').hidden = !website;
}
function staffGrants(container, role) {
  const website = role === 'operator_content';
  const catalogue = website || role === 'operator_provider';
  return {
    publishWebsite: website && container.querySelector('[name="publishWebsite"]').checked,
    publishCatalogue: catalogue && container.querySelector('[name="publishCatalogue"]').checked,
    managePlayerAccess: role === 'operator_support' && container.querySelector('[name="managePlayerAccess"]').checked
  };
}
function staffRoleLabel(role) {
  const copyKey = ({ operator_admin: 'roleAdmin', operator_content: 'roleContent', operator_provider: 'roleProvider', operator_support: 'roleSupport' })[role];
  return copyKey ? t(copyKey) : role;
}
function getFilteredStaffMembers() {
  const query = $('#staff-search').value.trim().toLocaleLowerCase(language ? 'fr-CA' : 'en-CA');
  const selectedRole = $('#staff-filter-role').value;
  const selectedStatus = $('#staff-filter-status').value;
  const selectedMfa = $('#staff-filter-mfa').value;
  const selectedActivity = $('#staff-filter-activity').value;
  const sort = $('#staff-sort').value;
  return staffMemberCache.filter((member) => (member.email.toLowerCase().includes(query) || member.username?.toLowerCase().includes(query)) && (selectedRole === 'all' || member.role === selectedRole) && (selectedStatus === 'all' || member.status === selectedStatus) && (selectedMfa === 'all' || Boolean(member.mfaEnabled) === (selectedMfa === 'enabled')) && (selectedActivity === 'all' || Boolean(member.lastActivityAt) === (selectedActivity === 'has'))).sort((a, b) => sort === 'email' ? a.email.localeCompare(b.email, language ? 'fr-CA' : 'en-CA') : sort === 'activity' ? (b.lastActivityAt || 0) - (a.lastActivityAt || 0) : sort === 'oldest' ? a.createdAt - b.createdAt : b.createdAt - a.createdAt);
}
function renderStaffList() {
  const filteredMembers = getFilteredStaffMembers();
  const number = (value) => new Intl.NumberFormat(language ? 'fr-CA' : 'en-CA').format(value);
  $('#staff-count').textContent = t('staffCount').replace('{shown}', number(filteredMembers.length)).replace('{total}', number(staffMemberCache.length));
  $('#staff-export').disabled = filteredMembers.length === 0;
  $('#staff-list').replaceChildren(...(filteredMembers.length ? filteredMembers : [null]).map((member) => {
    if (!member) return element('li', t('staffNoMatches'));
    const roleLabel = staffRoleLabel(member.role);
    const identity = member.username ? `${member.username} (${member.email})` : member.email;
    const item = element('li', `${identity} · ${roleLabel} · ${t(member.status)}`, 'staff-list-item');
    const dateLocale = language ? 'fr-CA' : 'en-CA';
    const addedDate = new Intl.DateTimeFormat(dateLocale, { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(member.createdAt));
    item.append(element('small', t('staffAddedOn').replace('{date}', addedDate), 'staff-created-at'));
    const activityDate = member.lastActivityAt ? new Intl.DateTimeFormat(dateLocale, { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }).format(new Date(member.lastActivityAt)) : null;
    item.append(element('small', activityDate ? t('staffLastActivity').replace('{date}', activityDate) : t('staffNoActivity'), 'staff-activity-at'));
    const mfaBadge = element('span', t(member.mfaEnabled ? 'staffMfaEnabled' : 'staffMfaDisabled'), `staff-mfa-badge ${member.mfaEnabled ? 'is-enabled' : 'is-disabled'}`);
    mfaBadge.setAttribute('aria-label', `${language ? 'État de la vérification en deux étapes' : 'Two-step verification status'}: ${t(member.mfaEnabled ? 'staffMfaEnabled' : 'staffMfaDisabled')}`);
    item.append(mfaBadge);
    if (member.status === 'active' && member.email !== currentStaffEmail) {
      const roleControl = element('label', t('staffChangeRole'), 'staff-role-control');
      const roleSelect = element('select');
      roleSelect.dataset.staffRole = 'true';
      for (const [value, copyKey] of [['operator_admin', 'roleAdmin'], ['operator_content', 'roleContent'], ['operator_provider', 'roleProvider'], ['operator_support', 'roleSupport']]) {
        const option = element('option', t(copyKey));
        option.value = value;
        option.selected = member.role === value;
        roleSelect.append(option);
      }
      roleControl.append(roleSelect);
      item.append(roleControl);
      const grants = element('div', '', 'staff-publishing-grants');
      for (const [name, labelKey] of [['publishWebsite', 'staffPublishWebsite'], ['publishCatalogue', 'staffPublishCatalogue'], ['managePlayerAccess', 'playerAccessGrant']]) {
        const label = element('label', '', 'admin-check');
        const checkbox = element('input');
        Object.assign(checkbox, { type: 'checkbox', name, checked: member.role !== 'operator_admin' && member[name] });
        checkbox.setAttribute('aria-label', `${t(labelKey)} · ${member.email}`);
        label.append(checkbox, element('span', t(labelKey)));
        grants.append(label);
      }
      displayStaffGrants(grants, member.role);
      item.append(grants);
      const saveRole = element('button', t('staffSaveRole'), 'ghost');
      saveRole.type = 'button';
      saveRole.dataset.updateRoleEmail = member.email;
      saveRole.disabled = true;
      const updateSave = () => {
        const role = roleSelect.value;
        displayStaffGrants(grants, role);
        const access = staffGrants(grants, role);
        saveRole.disabled = role === member.role &&
          (role === 'operator_admin' || (access.publishWebsite === member.publishWebsite && access.publishCatalogue === member.publishCatalogue && access.managePlayerAccess === member.managePlayerAccess));
      };
      roleSelect.addEventListener('change', updateSave);
      grants.addEventListener('change', updateSave);
      item.append(saveRole);
      const disable = element('button', t('staffDisable'), 'ghost');
      disable.type = 'button';
      disable.dataset.disableEmail = member.email;
      item.append(disable);
    } else if (member.status === 'disabled') {
      const enable = element('button', t('staffReenable'), 'ghost');
      enable.type = 'button';
      enable.dataset.enableEmail = member.email;
      enable.dataset.enableRole = member.role;
      item.append(enable);
    }
    return item;
  }));
}
async function refreshStaffAudit() {
  await loadStaffAuditPage(true);
}
async function loadStaffAuditPage(reset = false) {
  if (staffAuditLoading) return;
  staffAuditLoading = true;
  $('#staff-audit-load-more').disabled = true;
  const cursor = reset ? null : staffAuditNextCursor;
  try {
    const page = await api(`admin/audit${cursor ? `?before=${encodeURIComponent(cursor)}` : ''}`, undefined, 'GET');
    staffAuditCache = reset ? page.events : [...staffAuditCache, ...page.events];
    staffAuditNextCursor = page.nextCursor;
    renderStaffAudit();
  } finally {
    staffAuditLoading = false;
    $('#staff-audit-load-more').hidden = !staffAuditNextCursor;
    $('#staff-audit-load-more').disabled = false;
  }
}
async function loadAllStaffAuditEvents() {
  const events = [];
  let cursor = null;
  while (true) {
    const page = await api(`admin/audit${cursor ? `?before=${encodeURIComponent(cursor)}` : ''}`, undefined, 'GET');
    events.push(...page.events);
    if (page.nextCursor === null) break;
    if (page.nextCursor === cursor) throw new Error('unavailable');
    cursor = page.nextCursor;
  }
  return events;
}
function renderStaffAudit() {
  const entries = getFilteredStaffAuditEntries();
  const locale = language ? 'fr-CA' : 'en-CA';
  const number = (value) => new Intl.NumberFormat(locale).format(value);
  $('#staff-audit-summary').textContent = t('staffAuditSummary').replace('{shown}', number(entries.length)).replace('{loaded}', number(staffAuditCache.length));
  $('#staff-audit-export').disabled = staffAuditCache.length === 0 && !staffAuditNextCursor;
  $('#staff-audit tbody').replaceChildren(...(entries.length ? entries : [null]).map((entry) => {
    const row = element('tr');
    if (!entry) {
      const cell = element('td', t('staffAuditNoMatches'));
      cell.colSpan = 5;
      const hasFilters = $('#staff-audit-search').value.trim() || $('#staff-audit-filter').value !== 'all' || $('#staff-audit-from').value || $('#staff-audit-to').value;
      if (hasFilters) {
        const clearFilters = element('button', t('staffAuditClearFilters'), 'ghost');
        clearFilters.type = 'button';
        clearFilters.addEventListener('click', () => {
          $('#staff-audit-search').value = '';
          $('#staff-audit-filter').value = 'all';
          $('#staff-audit-from').value = '';
          $('#staff-audit-to').value = '';
          renderStaffAudit();
        });
        cell.append(document.createElement('br'), clearFilters);
      }
      row.append(cell);
      return row;
    }
    const record = element('td', entry.target);
    const info = entry.details;
    if (info?.recordId || info?.fields?.length) {
      const details = element('details', '', 'staff-audit-details');
      details.append(element('summary', t('auditDetails')));
      const list = element('dl');
      const labels = {
        enabledSections: 'brandLobbySections', enabledLocales: 'brandLanguages', primaryLocale: 'brandDefaultLanguage',
        displayMarket: 'brandDisplayMarket', reportingTimeZone: 'brandReportingZone',
        publishWebsite: 'staffPublishWebsite', publishCatalogue: 'staffPublishCatalogue', status: 'auditTransition'
      };
      const status = (value) => copy[value] ? t(value) : value;
      const rows = [
        ['auditRecord', info.recordId], ['auditRevision', info.revision],
        ['auditFields', info.fields?.map((field) => copy[labels[field] || field] ? t(labels[field] || field) : field).join(', ')],
        ['auditTransition', [info.previousStatus, info.status].filter(Boolean).map(status).join(' → ')],
        ['staffRole', [info.previousRole, info.role].filter(Boolean).map(staffRoleLabel).join(' → ')],
        ['auditReason', info.reason]
      ];
      for (const [key, value] of rows) {
        if (value) list.append(element('dt', t(key)), element('dd', String(value)));
      }
      details.append(list);
      record.append(details);
    }
    row.append(element('td', new Date(entry.createdAt).toLocaleString(locale, { timeZone: 'UTC' })),
      element('td', entry.actor), element('td', auditActionLabel(entry.action)), record, element('td', entry.correlationId || ''));
    return row;
  }));
}
function getFilteredStaffAuditEntries(source = staffAuditCache) {
  const locale = language ? 'fr-CA' : 'en-CA';
  const query = $('#staff-audit-search').value.trim().toLocaleLowerCase(locale).normalize('NFD').replace(/\p{Diacritic}/gu, '');
  const category = $('#staff-audit-filter').value;
  const from = $('#staff-audit-from').value;
  const to = $('#staff-audit-to').value;
  const invalidRange = Boolean(from && to && from > to);
  $('#staff-audit-range-error').hidden = !invalidRange;
  $('#staff-audit-range-error').textContent = invalidRange ? t('staffAuditRangeInvalid') : '';
  if (invalidRange) return [];
  const categoryFor = (action) => /^(discovery_|campaign_(?!spend))/.test(action)?'discovery':/^(partner_|placement_|poll_|referral_|experiment_|campaign_spend)/.test(action)?'growth':action.startsWith('demo_credit_')?'credits':action.startsWith('staff_mfa_') ? 'mfa' : /^(tenant_config_|website_content_)/.test(action) ? 'casino' : action.startsWith('support_') ? 'support' : /^(provider_|catalog_|coming_soon_)/.test(action) ? 'providers' : ['staff_login', 'staff_logout', 'staff_password_changed'].includes(action) ? 'auth' : action.startsWith('staff_') ? 'staff' : 'other';
  return source.filter((entry) => {
    const searchable = `${entry.actor} ${entry.action} ${auditActionLabel(entry.action)} ${entry.target} ${entry.details?.recordId || ''} ${entry.details?.revision || ''} ${entry.correlationId || ''}`.toLocaleLowerCase(locale).normalize('NFD').replace(/\p{Diacritic}/gu, '');
    const eventDate = new Date(entry.createdAt).toISOString().slice(0, 10);
    return searchable.includes(query) && (category === 'all' || categoryFor(entry.action) === category) && (!from || eventDate >= from) && (!to || eventDate <= to);
  });
}
function supportPlayerIdentity(ticket) {
  return ticket.displayName ? `${ticket.displayName} (${ticket.email})` : ticket.email;
}
function renderStaffCase(article,ticket,supportInboxTeam,status) {
  const playerIdentity=supportPlayerIdentity(ticket);
  if (ticket.isComplaint) article.append(element('strong', t('supportComplaintBadge'), 'complaint-badge'));
  if (!ticket.isComplaint && ticket.category === 'responsible_play') {
    const locale = language ? 'fr-CA' : 'en-CA';
    const now = Date.now();
    const context = element('aside', '', 'support-safety-context');
    context.append(element('strong', t('supportPlayerProtectionContext')));
    if (ticket.playerExcludedAt) context.append(element('p', t('supportPlayerExcluded')));
    if (ticket.accountBreak && ticket.accountBreak.endsAt > now) {
      const dates = element('div');
      showBreakPeriod(dates, ticket.accountBreak, t, locale);
      context.append(dates);
    } else if (!ticket.playerExcludedAt) context.append(element('p', t('supportPlayerNoActiveRestriction')));
    article.append(context);
  }
  article.append(action(t('supportPlayerFile'),()=>{adminWorkspace.open('coming-soon-saves');void playerAccessUi.open(ticket.playerId);},'ghost'));
  if(ticket.reference)article.append(action(ticket.reference,()=>{adminWorkspace.open('coming-soon-saves');void playerAccessUi.open(ticket.playerId, ticket.reference);},'ghost'));
  article.append(element('p', `${t('supportAssignedTo')}: ${ticket.assignedEmail || t('supportUnassigned')}`));
  article.append(element('h4', t('supportThread')));
  for (const message of supportThreadEntries(ticket)) {
    const author = message.authorType === 'staff' ? message.author || t('supportStaffAuthor') : playerIdentity;
    article.append(supportMessageElement(author, message.message, message.createdAt, message.authorType === 'staff' ? 'from-staff' : 'from-player'));
  }
  const assignmentForm = element('form');
  const assignmentLabel = element('label', t('supportAssignedTo'));
  const assignment = element('select');
  assignment.name = 'staffId';
  const unassigned = element('option', t('supportUnassigned'));
  unassigned.value = '';
  unassigned.selected = !ticket.assignedTo;
  assignment.append(unassigned);
  if (ticket.assignedTo && !supportInboxTeam.some((member) => member.id === ticket.assignedTo)) {
    const inactiveOwner = element('option', `${ticket.assignedEmail || ticket.assignedTo} · ${t('disabled')}`);
    inactiveOwner.value = 'inactive';
    inactiveOwner.selected = true;
    assignment.append(inactiveOwner);
  }
  for (const member of supportInboxTeam) {
    const option = element('option', member.email);
    option.value = String(member.id);
    option.selected = ticket.assignedTo === member.id;
    assignment.append(option);
  }
  assignmentLabel.append(assignment);
  const assignButton = element('button', t('supportAssign'), 'ghost');
  assignButton.disabled = assignment.value === 'inactive';
  assignment.addEventListener('change', () => { assignButton.disabled = assignment.value === 'inactive'; });
  assignmentForm.append(assignmentLabel, assignButton);
  assignmentForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    assignButton.disabled = true;
    try {
      const staffId = assignment.value && assignment.value !== 'inactive' ? Number(assignment.value) : null;
      await api('admin/support/assign', { ticketId: ticket.id, expectedUpdatedAt: ticket.updatedAt, staffId });
      if (await supportQueue.refresh()) status.textContent = t('supportAssignmentSaved');
    } catch (error) {
      if (error.message === 'supportConflict') {
        if (await supportQueue.refresh()) status.textContent = t('supportConflict');
      } else status.textContent = t(error.message);
    } finally {
      assignButton.disabled = false;
    }
  });
  article.append(assignmentForm);
  const notes = ticket.notes || [];
  const notesPanel = element('details');
  notesPanel.append(element('summary', `${t('supportInternalNotes')} · ${notes.length}`));
  if (notes.length) {
    for (const note of notes) {
      const noteEntry = element('div', '', 'support-note');
      noteEntry.append(element('small', `${note.author} · ${new Date(note.createdAt).toLocaleString(language ? 'fr-CA' : 'en-CA')}`), element('p', note.note));
      notesPanel.append(noteEntry);
    }
  } else notesPanel.append(element('p', t('supportNoNotes')));
  const noteForm = element('form');
  const noteLabel = element('label', t('supportInternalNotes'));
  const noteText = element('textarea');
  Object.assign(noteText, { name: 'note', required: true, maxLength: 2000, rows: 2, placeholder: t('supportNotePlaceholder') });
  noteLabel.append(noteText);
  const noteSubmit = element('button', t('supportAddNote'), 'ghost');
  noteForm.append(noteLabel, noteSubmit);
  noteForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    noteSubmit.disabled = true;
    try {
      const data = Object.fromEntries(new FormData(noteForm));
      await api('admin/support/note', { ticketId: ticket.id, expectedUpdatedAt: ticket.updatedAt, ...data });
      noteText.value = '';
      if (await supportQueue.refresh()) status.textContent = t('supportNoteSaved');
    } catch (error) {
      if (error.message === 'supportConflict') {
        if (await supportQueue.refresh()) status.textContent = t('supportConflict');
      } else status.textContent = t(error.message);
    } finally {
      noteSubmit.disabled = false;
    }
  });
  notesPanel.append(noteForm);
  article.append(notesPanel);
  const form = element('form');
  const replyLabel = element('label', t('supportReplyLabel'));
  const reply = element('textarea');
  Object.assign(reply, { name: 'reply', required: true, maxLength: 3000, rows: 3, placeholder: t('supportReplyPlaceholder') });
  replyLabel.append(reply);
  const stateLabel = element('label', t('supportStatusLabel'));
  const state = element('select');
  state.name = 'status';
  for (const value of ['answered', 'closed']) {
    const option = element('option', t(supportStatusCopy[value]));
    option.value = value;
    option.selected = ticket.status === value;
    state.append(option);
  }
  stateLabel.append(state);
  const priorityLabel = element('label', t('supportPriority'));
  const priority = element('select');
  priority.name = 'priority';
  for (const value of Object.keys(supportPriorityCopy)) {
    const option = element('option', t(supportPriorityCopy[value]));
    option.value = value;
    option.selected = ticket.priority === value;
    priority.append(option);
  }
  priorityLabel.append(priority);
  const submit = element('button', t('supportReply'));
  form.append(replyLabel, stateLabel, priorityLabel, submit);
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    submit.disabled = true;
    try {
      const data = Object.fromEntries(new FormData(form));
      await api('admin/support/reply', { ticketId: ticket.id, expectedUpdatedAt: ticket.updatedAt, ...data });
      reply.value = '';
      if (await supportQueue.refresh()) status.textContent = t('supportSaved');
    } catch (error) {
      if (error.message === 'supportConflict') {
        if (await supportQueue.refresh()) status.textContent = t('supportConflict');
      } else status.textContent = t(error.message);
    } finally {
      submit.disabled = false;
    }
  });
  article.append(form);
  if (ticket.status !== 'closed') {
    const closeWithoutReply = action(t('supportCloseNoReply'), async () => {
      if (!window.confirm(t('supportConfirmClose'))) return;
      closeWithoutReply.disabled = true;
      try {
        await api('admin/support/reply', { ticketId: ticket.id, expectedUpdatedAt: ticket.updatedAt, status: 'closed', priority: priority.value });
        if (await supportQueue.refresh()) status.textContent = t('supportClosedNoReply');
      } catch (error) {
        if (error.message === 'supportConflict') {
          if (await supportQueue.refresh()) status.textContent = t('supportConflict');
        } else status.textContent = t(error.message);
      } finally {
        closeWithoutReply.disabled = false;
      }
    }, 'ghost');
    article.append(closeWithoutReply);
  }
}

let overviewRequest = 0;
function resetOverview(message) {
  ++overviewRequest;
  latestOverview = null;
  titlePage = 0;
  $('#overview-title-search').value = '';
  $('#overview-export').disabled = true;
  reportUi.loading();
  $('#activity-total').textContent = '—';
  $('#activity-empty').hidden = true;
  $('#activity-axis').replaceChildren();
  $('#overview-activity-chart').replaceChildren();
  $('#overview-activity-chart').removeAttribute('aria-label');
  $('#overview-activity-summary').textContent = '';
  $('#overview-activity-values').replaceChildren();
  $('#overview .admin-metrics').hidden = true;
  $('#overview-round-report').hidden = true;
  $('#overview-status').textContent = t(message);
  return overviewRequest;
}
async function refreshOperatorOverview() {
  const request = resetOverview('loading');
  try {
    const result = await api('admin/overview?' + reportUi.params(), undefined, 'GET');
    if (request !== overviewRequest) return;
    latestOverview = result;
    followupUi.update(result.publicationFollowup);
    $('#overview-export').disabled = false;
    renderOperatorOverview(result);
  } catch (error) {
    if (request === overviewRequest) {
      followupUi.update(null);
      $('#overview-status').textContent = t(error.message);
    }
  }
}
function renderOperatorOverview(overview) {
  reportUi.render(overview);
  $('#overview .admin-metrics').hidden = false;
  $('#overview-round-report').hidden = false;
  const locale = language ? 'fr-CA' : 'en-CA';
  const number = new Intl.NumberFormat(locale);
  for (const id of ['overview-rounds', 'overview-active-players', 'overview-wagered']) {
    const label = $(`#${id}`).previousElementSibling;
    const copyKey = id === 'overview-rounds' ? 'overviewRounds' : id === 'overview-active-players' ? 'overviewActivePlayers' : 'overviewWagered';
    label.textContent = t(copyKey).replace('{days}', String(overview.periodDays));
  }
  $('#overview-players').textContent = number.format(overview.playerAccounts);
  $('#overview-verified').textContent = number.format(overview.verifiedAccounts);
  $('#overview-rounds').textContent = number.format(overview.demoRoundsInPeriod);
  $('#overview-active-players').textContent = number.format(overview.activeDemoPlayersInPeriod);
  $('#overview-wagered').textContent = money(overview.simulatedWagersCentsInPeriod);
  renderOverviewActivity(overview);
  renderOverviewGameActivity(overview);
  $('#overview-tickets').textContent = number.format(overview.openSupportTickets);
  $('#overview-catalog').textContent = number.format(overview.enabledCatalogListings);
  $('#overview-coming-soon').textContent = number.format(overview.publishedComingSoon);
  $('#overview-coming-soon-saves').textContent = number.format(overview.firstComingSoonSaves);
  const catalogReady = overview.enabledCatalogListings > 0;
  $('#overview-catalog-readiness').textContent = t(catalogReady ? 'overviewCatalogReady' : 'overviewCatalogEmpty');
  const catalogLink = $('#catalog-readiness-link');
  catalogLink.href = catalogReady ? '#catalog-management' : '#catalog-import';
  catalogLink.textContent = t(catalogReady ? 'goToCatalogManagement' : 'goToCatalogSetup');
  const brandingStatus = overview.configNeedsPublish ? 'overviewBrandingPending' : 'overviewBrandingReady';
  $('#overview-branding-readiness').textContent = t(brandingStatus).replace('{version}', number.format(overview.publishedConfigVersion));
  $('#overview-mfa-readiness').textContent = t(currentStaffMfaEnabled ? 'overviewMfaEnabled' : 'overviewMfaDisabled');
  $('#overview-status').textContent = t('overviewUpdated').replace('{time}', new Date(overview.generatedAt).toLocaleTimeString(locale, { timeZone: overview.reportingTimeZone }));
}
function renderOverviewActivity(overview) {
  const locale = language ? 'fr-CA' : 'en-CA';
  const number = new Intl.NumberFormat(locale);
  const data = overview.demoRoundsByDay || [];
  const total = data.reduce((sum, item) => sum + item.rounds, 0);
  const peak = data.reduce((best, item) => item.rounds > best.rounds ? item : best, { day: '', rounds: 0 });
  const peakDate = peak.day ? new Date(`${peak.day}T00:00:00Z`).toLocaleDateString(locale, { timeZone: 'UTC', dateStyle: 'medium' }) : '—';
  const summary = !total ? t('reportNoRounds') : t('overviewActivitySummary').replace('{total}', number.format(total)).replace('{days}', number.format(overview.periodDays)).replace('{date}', peakDate).replace('{rounds}', number.format(peak.rounds));
  const chart = $('#overview-activity-chart');
  $('#activity-total').textContent = number.format(total);
  $('#activity-empty').hidden = total !== 0;
  const dayLabel = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', timeZone: 'UTC' });
  const dates = [...new Set([data[0]?.day, data[Math.floor((data.length - 1) / 2)]?.day, data.at(-1)?.day].filter(Boolean))];
  $('#activity-axis').replaceChildren(...dates.map(day => element('span', dayLabel.format(new Date(day + 'T12:00:00Z')))));
  chart.style.setProperty('--bar-count', Math.max(1,data.length));
  chart.setAttribute('aria-label', `${t('overviewActivityChart')}. ${summary}`);
  const maxRounds = Math.max(0, ...data.map(({ rounds }) => rounds));
  chart.replaceChildren(...data.map(({ day, rounds }) => {
    const column = element('span', '', 'overview-activity-column');
    const bar = element('span', '', 'overview-activity-bar');
    bar.style.height = maxRounds ? `${Math.max(rounds ? 2 : 0, (rounds / maxRounds) * 100)}%` : '0%';
    column.title = `${day}: ${number.format(rounds)}`;
    column.setAttribute('aria-hidden', 'true');
    column.append(bar);
    return column;
  }));
  $('#overview-activity-summary').textContent = summary;
  $('#overview-activity-values').replaceChildren(...data.map(({ day, rounds }) => {
    const date = new Date(`${day}T00:00:00Z`).toLocaleDateString(locale, { timeZone: 'UTC', dateStyle: 'medium' });
    return element('li', t('overviewActivityDay').replace('{date}', date).replace('{rounds}', number.format(rounds)));
  }));
}
let titlePage = 0;
if (new URLSearchParams(location.search).get('report') === 'rounds') $('#overview-round-report').open = true;
function renderOverviewGameActivity(overview) {
  const locale = language ? 'fr-CA' : 'en-CA';
  const number = new Intl.NumberFormat(locale);
  const share = new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 1 });
  const query = normalizeCatalogueText($('#overview-title-search').value);
  const titles = overview.demoRoundsByTitle.filter(({ game, preview }) => {
    const names = [demoTitle(game, preview, 'fr-CA'), demoTitle(game, preview, 'en-CA'), preview?.slug || game];
    return normalizeCatalogueText(names.join(' ')).includes(query);
  });
  const pageCount = Math.ceil(titles.length / 8);
  titlePage = Math.max(0, Math.min(titlePage, pageCount - 1));
  const permitted = ['operator_admin', 'operator_support'].includes(currentStaffRole);
  const rows = titles.slice(titlePage * 8, (titlePage + 1) * 8).map(title => {
    const row = element('tr'), header = element('th');
    header.scope = 'row';
    const name = demoTitle(title.game, title.preview, locale);
    if (permitted && title.rounds) {
      const button = action(name, () => reportUi.openRounds(title.source, button), 'report-record-link');
      button.setAttribute('aria-controls', 'report-records');
      button.setAttribute('aria-expanded', 'false');
      header.append(button);
    } else header.textContent = name;
    row.append(header, element('td', number.format(title.rounds)),
      element('td', share.format(overview.demoRoundsInPeriod ? title.rounds / overview.demoRoundsInPeriod : 0)),
      element('td', number.format(title.active_players)), element('td', money(title.wagered_cents)));
    return row;
  });
  $('#overview-game-table tbody').replaceChildren(...rows);
  $('#overview-title-empty').hidden = Boolean(titles.length);
  $('#overview-title-pages').hidden = pageCount <= 1;
  $('#overview-title-page').textContent = (titlePage + 1) + ' / ' + pageCount;
  $('#overview-title-prev').disabled = titlePage === 0;
  $('#overview-title-next').disabled = titlePage + 1 >= pageCount;
}
$('#overview-title-search').addEventListener('input', () => {
  titlePage = 0;
  if (latestOverview) renderOverviewGameActivity(latestOverview);
});
for (const [id, step] of [['overview-title-prev', -1], ['overview-title-next', 1]]) {
  $('#' + id).addEventListener('click', () => {
    titlePage += step;
    if (latestOverview) renderOverviewGameActivity(latestOverview);
  });
}
function exportOperatorOverview() {
  if (!latestOverview) return;
  const overview = latestOverview;
  const rows = [
    [t('reportBrand'), overview.brands.find((brand) => brand.id === overview.brandId)?.name || overview.brandId, overview.brandId],
    [t('overviewPeriodLabel'), overview.from + ' / ' + overview.to, overview.reportingTimeZone],
    [t('reportSnapshot'), new Date(overview.generatedAt).toISOString(), 'UTC'],
    [t('reportSource'), t(overview.scope === 'test' ? 'reportTest' : 'reportSite'), ''],
    [t('reportSignups'), overview.totals.signups, ''], [t('reportActive'), overview.totals.active, ''],
    [t('reportSaves'), overview.totals.saves, ''], [t('reportPublished'), overview.totals.published, t('reportSnapshot')],
    [t('overviewPlayers'), overview.playerAccounts, ''], [t('overviewVerified'), overview.verifiedAccounts, ''],
    [t('overviewActivePlayers').replace('{days}', overview.periodDays), overview.activeDemoPlayersInPeriod, ''],
    [t('overviewRounds').replace('{days}', overview.periodDays), overview.demoRoundsInPeriod, ''],
    [t('overviewWagered').replace('{days}', overview.periodDays), (overview.simulatedWagersCentsInPeriod / 100).toFixed(2), 'CAD'],
    [t('overviewTickets'), overview.openSupportTickets, ''], [t('overviewCatalog'), overview.enabledCatalogListings, ''],
  ];
  if (overview.undatedVerified) rows.push([t('reportUndated'), overview.undatedVerified, '']);
  if (overview.scope === 'site' && overview.playerAccounts) rows.push([t('reportTrackingSince'), new Date(overview.startedAt).toISOString(), 'UTC']);
  rows.push([t('overviewActivityChart'), '', overview.reportingTimeZone]);
  rows.push(...overview.demoRoundsByDay.map(({ day, rounds }) => [day, rounds, language ? 'parties' : 'rounds']));
  rows.push([t('overviewGameBreakdown'), '', '']);
  for (const title of overview.demoRoundsByTitle) {
    const name = demoTitle(title.game, title.preview, language ? 'fr-CA' : 'en-CA');
    rows.push([name + ' · ' + t('overviewGameRounds'), title.rounds, language ? 'parties' : 'rounds']);
    rows.push([name + ' · ' + t('overviewGameShare'), overview.demoRoundsInPeriod ? ((title.rounds / overview.demoRoundsInPeriod) * 100).toFixed(1) : '0.0', '%']);
    rows.push([name + ' · ' + t('overviewGameActivePlayers'), title.active_players, language ? 'joueurs' : 'players']);
    rows.push([name + ' · ' + t('overviewGameWagered'), (title.wagered_cents / 100).toFixed(2), language ? 'CAD fictifs' : 'simulated CAD']);
  }
  const headers = language ? ['Mesure', 'Valeur', 'Unité / remarque'] : ['Metric', 'Value', 'Unit / note'];
  const csv = '\uFEFF' + [headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n');
  const blobUrl = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = element('a', t('overviewExport'));
  link.href = blobUrl;
  link.download = `casino-${overview.brandId}-${overview.scope}-${overview.from}-${overview.to}.csv`;
  document.body.append(link);
  link.click();
  setTimeout(() => { URL.revokeObjectURL(blobUrl); link.remove(); }, 60_000);
  $('#overview-status').textContent = t('overviewExportReady');
}
$('#overview-refresh').addEventListener('click', () => {
  refreshOperatorOverview().catch((error) => { $('#overview-status').textContent = t(error.message); });
});
$('#overview-export').addEventListener('click', exportOperatorOverview);

function showStaffSession(session, focus = false) {
  currentStaffEmail = session.email;
  if (currentStaffId && (currentStaffId!==session.id || currentStaffRole!==session.role)){supportQueue.clear();providerCatalogUi.clear();operatorUi.clear();pilotUi.clear();shelfEditor.clear();partnerUi.clear();reviewUi.clear();}
  currentStaffId = session.id;
  currentStaffRole = session.role;
  currentStaffPermissions = {...session.permissions,testCredits:Boolean(session.testCredits)};
  currentStaffMfaEnabled = Boolean(session.mfaEnabled);
  currentMfaSetupUri = undefined;
  $('#mfa-secret').hidden = true;
  $('#mfa-copy-setup').hidden = true;
  $('#mfa-status').textContent = '';
  $('#staff-login').hidden = true;
  $('#admin-tools').hidden = false;
  $('#admin-language-slot').append($('#language'));
  $('#admin-lobby-slot').append($('#admin-view-lobby'));
  const names=session.email.split('@')[0].split(/[._+\s-]+/).filter(Boolean);
  $('#admin-avatar').textContent=(names.length>1?names[0][0]+names.at(-1)[0]:names[0]?.slice(0,2)||'').toUpperCase();
  $('#staff-identity').textContent = `${session.email} · ${staffRoleLabel(session.role)}`;
  $('#staff-brand').textContent = session.brandName;
  $('#publish-config').hidden = !currentStaffPermissions.publishWebsite;
  $('#publish-config-help').hidden = currentStaffPermissions.publishWebsite;
  $('#coming-soon-publish-help').hidden = currentStaffPermissions.publishCatalogue;
  playerAccessUi.clear();
  comingSoonUi.setStaffAccess(session.role, currentStaffPermissions.publishCatalogue);
  $('#mfa-setup').hidden = session.mfaEnabled;
  $('#mfa-verify').hidden = false;
  $('#mfa-verify').querySelector('button[type=submit]').hidden = session.mfaEnabled;
  $('#mfa-disable').hidden = !session.mfaEnabled;
  adminWorkspace.setRole(session.role, currentStaffPermissions, focus);
}
$('#staff-login-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const submit = form.querySelector('button[type=submit]');
  const { identifier, password, code } = Object.fromEntries(new FormData(form));
  submit.disabled = true;
  submit.textContent = t('staffSigningIn');
  form.setAttribute('aria-busy', 'true');
  $('#staff-login-status').textContent = '';
  try {
    const session = await api('admin/login', { identifier, password, code });
    showStaffSession(session, true);
    form.reset();
    $('#staff-login-status').textContent = '';
  } catch (error) { $('#staff-login-status').textContent = t(error.message); }
  finally {
    submit.disabled = false;
    submit.textContent = t('staffSignIn');
    form.removeAttribute('aria-busy');
  }
});
document.querySelector('[data-staff-password-toggle]').addEventListener('click', (event) => {
  togglePassword($('#staff-login-password'), event.currentTarget);
});
$('#staff-password-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const { currentPassword, newPassword, confirmPassword } = Object.fromEntries(new FormData(form));
  const button = form.querySelector('button[type=submit]');
  if (newPassword !== confirmPassword) {
    $('#staff-password-status').textContent = t('passwordMismatch');
    return;
  }
  button.disabled = true;
  try {
    await api('admin/password', { currentPassword, newPassword });
    form.reset();
    $('#staff-password-status').textContent = t('staffPasswordChanged');
  } catch (error) {
    $('#staff-password-status').textContent = t(error.message);
  } finally {
    button.disabled = false;
  }
});
$('#staff-logout').addEventListener('click', async (event) => {
  const button = event.currentTarget;
  button.disabled = true;
  try {
    await api('admin/logout', {});
    location.reload();
  } catch (error) {
    $('#admin-session-status').textContent = t(error.message);
    button.disabled = false;
  }
});
$('#staff-search').addEventListener('input', renderStaffList);
$('#staff-filter-role').addEventListener('change', renderStaffList);
$('#staff-filter-status').addEventListener('change', renderStaffList);
$('#staff-filter-mfa').addEventListener('change', renderStaffList);
$('#staff-filter-activity').addEventListener('change', renderStaffList);
$('#staff-sort').addEventListener('change', renderStaffList);
$('#staff-create select[name="role"]').addEventListener('change', updateStaffRoleHelp);
$('#staff-create').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const { email, username, password, role, reason } = Object.fromEntries(new FormData(form));
  const access = staffGrants($('#staff-create-grants'), role);
  const button = form.querySelector('button[type=submit]');
  button.disabled = true;
  try {
    await api('admin/staff', { email, ...(username.trim() && { username: username.trim() }), password, role, reason, ...access });
    form.reset();
    updateStaffRoleHelp();
    $('#staff-status').textContent = t('staffAdded');
    await refreshStaffList();
  } catch (error) { $('#staff-status').textContent = t(error.message); }
  finally { button.disabled = false; }
});
function requestStaffReason(message) {
  const reason = window.prompt(`${message}\n\n${t('staffReason')}`)?.trim();
  if (reason === '' || reason?.length > 240) $('#staff-status').textContent = t(reason ? 'invalid' : 'staffReasonRequired');
  return reason && reason.length <= 240 ? reason : null;
}
$('#staff-list').addEventListener('click', async (event) => {
  const roleEmail = event.target.dataset.updateRoleEmail;
  if (roleEmail) {
    const row = event.target.closest('li');
    const role = row.querySelector('[data-staff-role]').value;
    const currentMember = staffMemberCache.find((member) => member.email === roleEmail);
    if (!currentMember) return;
    const access = staffGrants(row, role);
    const message = role === currentMember.role ? roleEmail : t('staffConfirmRoleChange').replace('{email}', roleEmail)
      .replace('{oldRole}', staffRoleLabel(currentMember.role)).replace('{newRole}', staffRoleLabel(role));
    const reason = requestStaffReason(message);
    if (!reason) return;
    event.target.disabled = true;
    try {
      await api('admin/staff/role', { email: roleEmail, role, reason, ...access });
      $('#staff-status').textContent = t('staffRoleUpdated');
      await refreshStaffList();
    } catch (error) { $('#staff-status').textContent = t(error.message); }
    finally { event.target.disabled = false; }
    return;
  }
  const enableEmail = event.target.dataset.enableEmail;
  if (enableEmail) {
    const role = event.target.dataset.enableRole;
    const reason = requestStaffReason(t('staffConfirmReenable').replace('{email}', enableEmail).replace('{role}', staffRoleLabel(role)));
    if (!reason) return;
    try {
      await api('admin/staff', { email: enableEmail, role, reason });
      $('#staff-status').textContent = t('staffReenabled');
      await refreshStaffList();
    } catch (error) { $('#staff-status').textContent = t(error.message); }
    return;
  }
  const email = event.target.dataset.disableEmail;
  if (!email) return;
  const reason = requestStaffReason(t('staffConfirmDisable'));
  if (!reason) return;
  try {
    await api('admin/staff/disable', { email, reason });
    $('#staff-status').textContent = t('staffDisabled');
    await refreshStaffList();
  } catch (error) { $('#staff-status').textContent = t(error.message); }
});
$('#staff-export').addEventListener('click', () => {
  const members = getFilteredStaffMembers();
  if (!members.length) return;
  const headers = language
    ? ['Courriel', 'Rôle', 'Code du rôle', 'État du compte', 'Vérification en deux étapes', 'Créé le (UTC)', 'Dernière activité enregistrée (UTC)']
    : ['Email', 'Role', 'Role code', 'Account status', 'Two-step verification', 'Created at (UTC)', 'Last recorded activity (UTC)'];
  const roleLabels = { operator_admin: t('roleAdmin'), operator_content: t('roleContent'), operator_provider: t('roleProvider'), operator_support: t('roleSupport') };
  const rows = members.map((member) => [member.email, roleLabels[member.role] || member.role, member.role, t(member.status), t(member.mfaEnabled ? 'staffMfaEnabled' : 'staffMfaDisabled'), new Date(member.createdAt).toISOString(), member.lastActivityAt ? new Date(member.lastActivityAt).toISOString() : '']);
  const csv = '\uFEFF' + [headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n');
  const blobUrl = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = element('a', t('staffExport'));
  link.href = blobUrl;
  link.download = `northplay-staff-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.append(link);
  link.click();
  setTimeout(() => { URL.revokeObjectURL(blobUrl); link.remove(); }, 60_000);
  $('#staff-status').textContent = t('staffExportReady');
});
$('#staff-audit-search').addEventListener('input', renderStaffAudit);
$('#staff-audit-filter').addEventListener('change', renderStaffAudit);
$('#staff-audit-from').addEventListener('change', renderStaffAudit);
$('#staff-audit-to').addEventListener('change', renderStaffAudit);
$('#staff-audit-refresh').addEventListener('click', async () => {
  try { await refreshStaffAudit(); }
  catch (error) { $('#staff-status').textContent = t(error.message); }
});
$('#staff-audit-load-more').addEventListener('click', async () => {
  try { await loadStaffAuditPage(); }
  catch (error) { $('#staff-status').textContent = t(error.message); }
});
$('#staff-audit-export').addEventListener('click', async (event) => {
  const button = event.currentTarget;
  if (!$('#staff-audit-range-error').hidden) return;
  button.disabled = true;
  $('#staff-status').textContent = t('staffAuditExporting');
  try {
    const entries = getFilteredStaffAuditEntries(await loadAllStaffAuditEvents());
    if (!entries.length) {
      $('#staff-status').textContent = t('staffAuditNoMatches');
      return;
    }
    const headers = language
      ? ['Horodatage', 'Acteur', 'Action', 'Code de l’action', 'Cible', 'ID de corrélation']
      : ['Timestamp', 'Actor', 'Action', 'Action code', 'Target', 'Correlation ID'];
    const rows = entries.map((entry) => [new Date(entry.createdAt).toISOString(), entry.actor, auditActionLabel(entry.action), entry.action, entry.target, entry.correlationId || '']);
    const csv = '\uFEFF' + [headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n');
    const blobUrl = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = element('a', t('staffAuditExport'));
    link.href = blobUrl;
    link.download = `northplay-staff-audit-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.append(link);
    link.click();
    setTimeout(() => { URL.revokeObjectURL(blobUrl); link.remove(); }, 60_000);
    $('#staff-status').textContent = t('staffAuditExportReady');
  } catch (error) {
    $('#staff-status').textContent = t(error.message);
  } finally {
    button.disabled = staffAuditCache.length === 0 && !staffAuditNextCursor;
  }
});
$('#mfa-setup').addEventListener('click', async () => {
  try {
    const setup = await api('admin/mfa/setup', {});
    currentMfaSetupUri = setup.otpauth;
    $('#mfa-secret').hidden = false;
    $('#mfa-secret').textContent = `${setup.secret}\n${setup.otpauth}`;
    $('#mfa-copy-setup').hidden = false;
  } catch (error) { $('#mfa-status').textContent = t(error.message); }
});
$('#mfa-copy-setup').addEventListener('click', async () => {
  try {
    if (!currentMfaSetupUri || !navigator.clipboard?.writeText) throw new Error('clipboard');
    await navigator.clipboard.writeText(currentMfaSetupUri);
    $('#mfa-status').textContent = t('mfaSetupCopied');
  } catch {
    $('#mfa-status').textContent = t('mfaCopyFailed');
  }
});
$('#mfa-verify').addEventListener('submit', async (event) => {
  event.preventDefault();
  const code = event.currentTarget.elements.code.value;
  try {
    await api('admin/mfa/enable', { code });
    $('#mfa-status').textContent = t('mfaEnabled');
    $('#mfa-setup').hidden = true;
    $('#mfa-secret').hidden = true;
    $('#mfa-copy-setup').hidden = true;
    currentMfaSetupUri = undefined;
    $('#mfa-verify').querySelector('button[type=submit]').hidden = true;
    $('#mfa-disable').hidden = false;
    currentStaffMfaEnabled = true;
  } catch (error) { $('#mfa-status').textContent = t(error.message); }
});
$('#mfa-disable').addEventListener('click', async () => {
  if (!window.confirm(t('mfaConfirmDisable'))) return;
  const code = $('#mfa-verify').elements.code.value;
  try {
    await api('admin/mfa/disable', { code });
    $('#mfa-status').textContent = t('mfaDisabled');
    $('#mfa-setup').hidden = false;
    $('#mfa-verify').querySelector('button[type=submit]').hidden = false;
    $('#mfa-disable').hidden = true;
    $('#mfa-copy-setup').hidden = true;
    $('#mfa-secret').hidden = true;
    currentMfaSetupUri = undefined;
    currentStaffMfaEnabled = false;
  } catch (error) { $('#mfa-status').textContent = t(error.message); }
});

async function refreshEdition() {
  const request = ++editionRequest;
  editionStatus = 'loading';
  try {
    await comingSoonUi.loadLobby();
    if (request === editionRequest) editionStatus = 'ready';
  } catch {
    if (request === editionRequest) editionStatus = 'error';
  } finally {
    if (request === editionRequest) {
      renderCatalog();
    }
  }
}

document.body.classList.toggle('admin-route', isAdminPage);
document.body.classList.toggle('player-home', currentRoute === '/');
$('#admin-view-lobby').hidden = !isAdminPage;
$('#lobby').hidden = isAdminPage || comingSoonUi.isDetail || publicWebsite.isHelp;
$('#site-public-help').hidden = !publicWebsite.isHelp;
$('#admin').hidden = !isAdminPage;
$('#coming-soon-detail').hidden = !comingSoonUi.isDetail;
if (initialBrand) applyTenant(initialBrand);
render();
if (isAdminPage) {
  try { showStaffSession(await api('admin/session', undefined, 'GET')); }
  catch { $('#staff-login').hidden = false; $('#admin-tools').hidden = true; }
}
if (!initialBrand) {
  try { applyTenant((await api('tenant', undefined, 'GET')).config); }
  catch { /* The shared defaults also work offline. */ }
}
if (!isAdminPage) {
  void publicWebsite.load();
  if (currentRoute === '/') publicShelf.start();
  if (!publicWebsite.isHelp) {
    void refreshEdition();
    void api('games', undefined, 'GET').then(items => {
      providerGames = items;
      providersStatus = 'ready';
    }).catch(() => { providersStatus = 'error'; }).finally(renderCatalog);
  }
  try {
    player = await api('account', undefined, 'GET');
    if (player) {
      const favoritesSynced = await adoptAccountFavorites(player);
      if (!favoritesSynced) $('#favorites-status').textContent = t('favoriteSaveFailed');
    }
    playerSessionStartedAt = player?.sessionStartedAt;
    if (player?.preferredLocale && !['en','fr'].includes(new URLSearchParams(location.search).get('lang'))) {
      language = publicLanguage(player.preferredLocale);
      if (publicLocales.includes(player.preferredLocale)) localStorage.setItem('northplay-language', language ? 'fr' : 'en');
    }
  } catch {
    // The public catalogue also works without an account.
  } finally {
    accountPending = false;
    document.body.removeAttribute('data-member-pending');
    render();
  }
  window.setInterval(updateSessionReminder, 60_000);
  updateSessionReminder();
  if (resetToken) openPanel('passwordReset');
  else if (verifyToken) openPanel('emailVerification');
  else if (emailChangeToken) openPanel('emailChange');
  else if(document.body.dataset.lobbyBrand==='habibi' && ['signup','signin','return','cancelled','expired','unverified'].includes(catalogLocation.get('access'))) {
    await resumePlayerEntry(catalogLocation.get('access'));
  }
  else if (headerFinder && new URLSearchParams(location.search).get('support') === '1') {
    const url = new URL(location.href);
    url.searchParams.delete('support');
    history.replaceState(history.state, '', url);
    enterPlayerSupport();
  }
  else if(currentRoute==='/' && (new URLSearchParams(location.search).get('partner')==='1' || new URLSearchParams(location.search).get('inbox')==='1' || new URLSearchParams(location.search).has('listInvite') || /^[1-9]\d{0,14}$/.test(new URLSearchParams(location.search).get('quest')||''))){
    if(!player)afterSignIn='discovery';
    openPanel(player?'discovery':'signin');
  }
}
