import { games } from './catalog.js';

const copy = {
  lobby: ['Casino lobby', 'Hall du casino'], admin: ['Administration', 'Administration'],
  primaryNav: ['Main navigation', 'Navigation principale'], footerNav: ['Footer links', 'Liens de pied de page'],
  playSafely: ['Play safely', 'Jouer de façon responsable'],
  signin: ['Sign in', 'Se connecter'], signup: ['Create an account', 'Créer un compte'],
  account: ['My account', 'Mon compte'], logout: ['Sign out', 'Se déconnecter'],
  sandbox: ['Play-money casino', 'Casino en argent fictif'],
  headline: ['Your seat at the table.', 'Votre place à la table.'],
  intro: ['Explore the Northplay lobby and try your luck with a simulated CAD balance.', 'Explorez le hall Northplay et tentez votre chance avec un solde fictif en dollars canadiens.'],
  browse: ['Explore games', 'Explorer les jeux'], games: ['Casino games', 'Jeux de casino'],
  infoLabel: ['Key information', 'À savoir'], cadDisplay: ['CAD currency display', 'Affichage en dollars canadiens'],
  twoLanguages: ['English and Canadian French', 'Anglais et français canadien'], simulatedOnly: ['Simulated play only', 'Jeu simulé seulement'],
  lobbyEyebrow: ['The Northplay library', 'La ludothèque Northplay'],
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
  breakTitle: ['Take a pause', 'Faites une pause'], breakText: ['Pause demo play for 15 minutes from your account.', 'Mettez le jeu de démonstration en pause pendant 15 minutes depuis votre compte.'],
  limitTitle: ['Set a demo limit', 'Fixez une limite fictive'], limitText: ['Choose a daily cap for simulated wagers. The limit can only be lowered.', 'Choisissez une limite quotidienne de mises fictives. Vous pouvez seulement la réduire.'],
  excludeTitle: ['Exclude your account', 'Excluez votre compte'], excludeText: ['Self-exclusion blocks future sign-ins to this demo account and cannot be undone here.', 'L’autoexclusion bloque les prochaines connexions à ce compte de démonstration et ne peut pas être annulée ici.'],
  helpEyebrow: ['Good to know', 'À retenir'], faqTitle: ['Frequently asked questions', 'Questions fréquentes'],
  faqBalanceQuestion: ['Can I withdraw my demo balance?', 'Puis-je retirer mon solde de démonstration?'],
  faqBalanceAnswer: ['No. The balance is simulated, has no cash value, and cannot be deposited or withdrawn.', 'Non. Le solde est fictif, n’a aucune valeur monétaire et ne peut être ni déposé ni retiré.'],
  faqGamesQuestion: ['Can I play games from external providers?', 'Puis-je jouer aux jeux de fournisseurs externes?'],
  faqGamesAnswer: ['Not in this demo. It includes four built-in simulated games you can play. Imported provider listings are for catalog preview only; no external games are connected or launched.', 'Pas dans cette version de démonstration. Elle comprend quatre jeux simulés intégrés auxquels vous pouvez jouer. Les fiches importées servent uniquement à prévisualiser le catalogue; aucun jeu externe n’est connecté ni lancé.'],
  faqSafetyQuestion: ['What account controls are available?', 'Quels contrôles sont offerts dans le compte?'],
  faqSafetyAnswer: ['You can set a daily limit for simulated wagers, pause demo play for 15 minutes, or self-exclude the account. These controls apply to this prototype account only.', 'Vous pouvez fixer une limite quotidienne de mises fictives, mettre le jeu en pause pendant 15 minutes ou exclure le compte. Ces contrôles s’appliquent uniquement au compte de ce prototype.'],
  all: ['All games', 'Tous les jeux'], slots: ['Slots', 'Machines à sous'], table: ['Table games', 'Jeux de table'], live: ['Live games', 'Jeux avec croupier en direct'], favorites: ['Favorites', 'Favoris'],
  addFavorite: ['Add {game} to favorites', 'Ajouter {game} aux favoris'], removeFavorite: ['Remove {game} from favorites', 'Retirer {game} des favoris'], noFavoriteGames: ['You have not saved any games yet.', 'Vous n’avez pas encore enregistré de jeux.'],
  disclaimer: ['Simulated funds only. No cash value.', 'Fonds fictifs uniquement. Aucune valeur monétaire.'],
  email: ['Email address', 'Adresse courriel'], password: ['Password (10 characters minimum)', 'Mot de passe (au moins 10 caractères)'],
  passwordReset: ['Forgot your password?', 'Mot de passe oublié?'], passwordResetTitle: ['Reset your password', 'Réinitialiser votre mot de passe'], passwordResetHelp: ['Enter your account email. If it matches an account, we will send reset instructions.', 'Saisissez le courriel de votre compte. Si une correspondance existe, nous enverrons les instructions de réinitialisation.'], passwordResetRequested: ['If an account matches that address, reset instructions have been sent.', 'Si une correspondance existe, les instructions de réinitialisation ont été envoyées.'], passwordResetSend: ['Send reset instructions', 'Envoyer les instructions'], passwordResetInvalid: ['This reset link is invalid or expired. Request a new one.', 'Ce lien de réinitialisation est invalide ou expiré. Demandez-en un nouveau.'], passwordResetComplete: ['Password reset. Sign in with your new password.', 'Mot de passe réinitialisé. Connectez-vous avec votre nouveau mot de passe.'], passwordResetSave: ['Set new password', 'Enregistrer le nouveau mot de passe'],
  emailVerification: ['Verify your email', 'Confirmer votre courriel'], emailVerificationHelp: ['Check your email for a verification link. It expires after 24 hours.', 'Consultez votre courriel pour ouvrir le lien de confirmation. Il expire après 24 heures.'], emailVerificationRequired: ['Verify your email before signing in. You can request another link below.', 'Confirmez votre courriel avant de vous connecter. Vous pouvez demander un nouveau lien ci-dessous.'], emailVerificationRequested: ['If this address has an unverified account, a verification link has been sent.', 'Si cette adresse correspond à un compte non confirmé, un lien de confirmation a été envoyé.'], emailVerificationSend: ['Resend verification email', 'Renvoyer le courriel de confirmation'], emailVerificationInvalid: ['This verification link is invalid or expired. Request a new one.', 'Ce lien de confirmation est invalide ou expiré. Demandez-en un nouveau.'], emailVerified: ['Email verified. You can now sign in.', 'Courriel confirmé. Vous pouvez maintenant vous connecter.'], emailVerificationSubmit: ['Verify email address', 'Confirmer le courriel'],
  passwordChangeTitle: ['Change password', 'Changer le mot de passe'], currentPassword: ['Current password', 'Mot de passe actuel'], newPassword: ['New password (10 characters minimum)', 'Nouveau mot de passe (au moins 10 caractères)'], confirmPassword: ['Confirm new password', 'Confirmer le nouveau mot de passe'], passwordMismatch: ['The new passwords do not match.', 'Les nouveaux mots de passe ne correspondent pas.'], passwordChanged: ['Password updated. Other sessions have been signed out.', 'Mot de passe modifié. Les autres sessions ont été fermées.'],
  balanceLabel: ['Simulated balance', 'Solde fictif'], history: ['Recent activity', 'Activité récente'],
  dailyLimitProgress: ['Today’s demo wagers (UTC): {used} of {limit} · {remaining} remaining', 'Mises fictives aujourd’hui (UTC) : {used} sur {limit} · {remaining} restantes'], dailyLimitProgressLabel: ['Daily simulated wager limit progress', 'Progression vers la limite quotidienne de mises fictives'],
  preferredLanguage: ['Preferred language', 'Langue de préférence'], englishLanguage: ['English', 'anglais'], frenchLanguage: ['French', 'français'],
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
  brandName: ['Casino name', 'Nom du casino'], accentColor: ['Accent colour', 'Couleur d’accent'],
  supportEmail: ['Support email', 'Courriel du soutien'], supportContact: ['Contact support', 'Contacter le soutien'],
  supportTitle: ['Support centre', 'Centre de soutien'], supportIntro: ['Send a message to the casino support team and check replies here.', 'Écrivez à l’équipe de soutien du casino et consultez les réponses ici.'],
  supportCategory: ['What can we help with?', 'Quel est le sujet de votre demande?'],
  supportMessage: ['Message (10 to 3,000 characters)', 'Message (de 10 à 3 000 caractères)'], supportSend: ['Send support request', 'Envoyer la demande'], supportSent: ['Your request was sent to casino support.', 'Votre demande a été envoyée au soutien du casino.'],
  supportThread: ['Conversation', 'Conversation'], supportPlayerAuthor: ['You', 'Vous'], supportStaffAuthor: ['Casino support', 'Soutien du casino'], supportFollowup: ['Reply to this request (up to 3,000 characters)', 'Répondez à cette demande (3 000 caractères maximum)'], supportFollowupSend: ['Send reply', 'Envoyer la réponse'], supportFollowupSent: ['Your reply was sent. The request is open again.', 'Votre réponse a été envoyée. La demande est rouverte.'],
  supportTickets: ['Your requests', 'Vos demandes'], supportNoTickets: ['You have no support requests yet.', 'Vous n’avez pas encore de demandes de soutien.'], supportReply: ['Reply', 'Répondre'], supportReplyLabel: ['Response', 'Réponse'], supportReplyPlaceholder: ['Write a reply for the player', 'Rédigez une réponse au joueur'], supportRateLimited: ['You have sent several requests recently. Please try again later.', 'Vous avez envoyé plusieurs demandes récemment. Veuillez réessayer plus tard.'],
  supportNewReplies: ['New support replies ({count})', 'Réponses de soutien non lues ({count})'], supportUnreadLabel: ['You have {count} unread support replies.', 'Vous avez {count} réponses de soutien non lues.'],
  supportInbox: ['Support inbox', 'Boîte de soutien'], supportInboxHelp: ['Review requests and formal complaints, then reply in English or French.', 'Consultez les demandes et les plaintes officielles, puis répondez en anglais ou en français.'], supportRefresh: ['Refresh inbox', 'Actualiser la boîte'], supportNoInbox: ['There are no support requests.', 'Il n’y a aucune demande de soutien.'], supportSaved: ['Support reply saved.', 'La réponse de soutien a été enregistrée.'],
  supportCloseNoReply: ['Close without reply', 'Fermer sans répondre'], supportConfirmClose: ['Close this request without sending a reply?', 'Fermer cette demande sans envoyer de réponse?'], supportClosedNoReply: ['Request closed without sending a reply.', 'La demande a été fermée sans réponse.'],
  supportInternalNotes: ['Internal staff notes', 'Notes internes du personnel'], supportNoNotes: ['No internal notes yet.', 'Aucune note interne pour le moment.'], supportNotePlaceholder: ['Add information for other support staff (up to 2,000 characters)', 'Ajoutez une information pour l’équipe de soutien (2 000 caractères maximum)'], supportAddNote: ['Add internal note', 'Ajouter une note interne'], supportNoteSaved: ['Internal note added.', 'La note interne a été ajoutée.'],
  supportAssignedTo: ['Assigned to', 'Attribuée à'], supportUnassigned: ['Unassigned', 'Non attribuée'], supportAssign: ['Assign ticket', 'Attribuer la demande'], supportAssignmentSaved: ['Ticket assignment saved.', 'L’attribution de la demande a été enregistrée.'],
  supportAssigneeFilter: ['Assignment', 'Attribution'], supportAssigneeAll: ['All tickets', 'Toutes les demandes'], supportAssigneeMine: ['Assigned to me', 'Les miennes'],
  supportStatusOpen: ['Open', 'Ouverte'], supportStatusAnswered: ['Answered', 'Répondue'], supportStatusClosed: ['Closed', 'Fermée'], supportCategoryAccount: ['Account', 'Compte'], supportCategoryGame: ['Game listing', 'Jeu'], supportCategoryResponsible: ['Safer play', 'Jeu responsable'], supportCategoryOther: ['Other', 'Autre'], supportCategoryComplaint: ['Complaint', 'Plainte'], supportComplaintBadge: ['Formal complaint', 'Plainte officielle'], supportComplaintFilter: ['Case type', 'Type de dossier'], supportComplaintAll: ['All cases', 'Tous les dossiers'], supportComplaintOnly: ['Complaints only', 'Plaintes seulement'], supportNonComplaints: ['Other requests', 'Autres demandes'],
  supportStatusLabel: ['Ticket status', 'État de la demande'],
  supportPriority: ['Priority', 'Priorité'], supportPriorityAll: ['All priorities', 'Toutes les priorités'], supportPriorityLow: ['Low', 'Faible'], supportPriorityNormal: ['Normal', 'Normale'], supportPriorityHigh: ['High', 'Élevée'], supportPriorityUrgent: ['Urgent', 'Urgente'],
  supportSearch: ['Search email or ticket text', 'Rechercher un courriel ou le texte de la demande'], supportFilter: ['Filter by status', 'Filtrer par état'], supportFilterAll: ['All statuses', 'Tous les états'], supportNoMatches: ['No tickets match these filters.', 'Aucune demande ne correspond à ces filtres.'], supportQueueSummary: ['Showing {loaded} of {total} · Open: {open} · Answered: {answered} · Closed: {closed}', 'Affichées : {loaded} sur {total} · Ouvertes : {open} · Répondues : {answered} · Fermées : {closed}'], supportLoadMore: ['Load more requests', 'Charger plus de demandes'], supportLoadingMore: ['Loading…', 'Chargement…'],
  loadConfig: ['Load draft', 'Charger le brouillon'],
  saveDraft: ['Save draft', 'Enregistrer le brouillon'], publishConfig: ['Publish version', 'Publier la version'],
  draftSaved: ['Draft saved.', 'Brouillon enregistré.'], configPublished: ['Configuration published.', 'Configuration publiée.'],
  staffLogin: ['Staff sign in', 'Connexion du personnel'],
  staffLoginHelp: ['Use your individual casino staff account.', 'Utilisez votre compte personnel du casino.'],
  staffEmail: ['Staff email', 'Courriel du membre du personnel'], staffPassword: ['Password', 'Mot de passe'],
  showPassword: ['Show password', 'Afficher le mot de passe'], hidePassword: ['Hide password', 'Masquer le mot de passe'],
  staffSignIn: ['Sign in', 'Se connecter'], staffSigningIn: ['Signing in…', 'Connexion…'], staffSignOut: ['Sign out', 'Se déconnecter'],
  staffManagement: ['Staff access', 'Accès du personnel'], temporaryPassword: ['Initial password for a new account (12 characters minimum); leave blank for an existing account', 'Mot de passe initial pour un nouveau compte (au moins 12 caractères); laissez vide pour un compte existant'],
  staffRole: ['Role', 'Rôle'], staffCreate: ['Add staff member', 'Ajouter un membre du personnel'], staffDisable: ['Disable', 'Désactiver'],
  roleAdmin: ['Operator admin', 'Administrateur du casino'], roleContent: ['Content', 'Contenu'], roleProvider: ['Providers', 'Fournisseurs'], roleSupport: ['Support', 'Soutien'],
  active: ['active', 'actif'], disabled: ['disabled', 'désactivé'],
  staffAdded: ['Staff account added.', 'Compte du personnel ajouté.'], staffDisabled: ['Staff account disabled.', 'Compte du personnel désactivé.'],
  staffAudit: ['View staff activity', 'Voir l’activité du personnel'],
  mfaTitle: ['Two-step verification', 'Vérification en deux étapes'],
  mfaHelp: ['Add this account to an authenticator app with the secret below, then enter its six-digit code to enable two-step verification.', 'Ajoutez ce compte à une application d’authentification avec le secret ci-dessous, puis saisissez le code à six chiffres pour activer la vérification en deux étapes.'],
  mfaSetup: ['Set up authenticator', 'Configurer l’authentificateur'], mfaCode: ['Authenticator code', 'Code de l’authentificateur'],
  mfaLoginHint: ['Leave blank unless two-step verification is already enabled for this account.', 'Laissez ce champ vide si la vérification en deux étapes n’est pas déjà activée pour ce compte.'],
  mfaEnable: ['Enable two-step verification', 'Activer la vérification en deux étapes'], mfaDisable: ['Disable two-step verification', 'Désactiver la vérification en deux étapes'],
  mfaEnabled: ['Two-step verification enabled.', 'Vérification en deux étapes activée.'], mfaDisabled: ['Two-step verification disabled.', 'Vérification en deux étapes désactivée.'],
  staffCredentials: ['Email, password, or authenticator code is incorrect.', 'Le courriel, le mot de passe ou le code est incorrect.'],
  staffAuth: ['Please sign in again.', 'Veuillez vous reconnecter.'], staffForbidden: ['Your account does not have permission for this action.', 'Votre compte n’a pas la permission d’effectuer cette action.'],
  staffLifecycle: ['This staff account cannot be changed in its current state.', 'Ce compte du personnel ne peut pas être modifié dans son état actuel.'],
  staffExists: ['This staff member already has access to this casino.', 'Cette personne a déjà accès à ce casino.'],
  staffMfaInvalid: ['The authenticator code is invalid or expired.', 'Le code de l’authentificateur est invalide ou expiré.'],
  catalogEmptyTitle: ['The lobby is getting ready', 'Le hall se prépare'],
  catalogEmpty: ['Games will appear here after an approved provider is connected and its catalog is synced.', 'Les jeux apparaîtront ici après la connexion d’un fournisseur approuvé et la synchronisation de son catalogue.'],
  noFavoriteGamesTitle: ['No favorites yet', 'Aucun favori pour le moment'],
  searchGames: ['Search games or providers', 'Rechercher un jeu ou un fournisseur'],
  catalogNoMatchesTitle: ['No matching games', 'Aucun jeu correspondant'],
  catalogNoMatches: ['Try another search or choose a different category.', 'Essayez une autre recherche ou choisissez une autre catégorie.'],
  catalogListing: ['Imported catalog listing · preview only', 'Fiche de catalogue importée · aperçu seulement'],
  demoGameLabel: ['Playable demo game', 'Jeu de démonstration jouable'],
  playNow: ['Play demo', 'Jouer à la démo'],
  catalogSync: ['Catalog data', 'Données du catalogue'],
  catalogSyncHelp: ['Paste catalog JSON or load a JSON file. Sync replaces the provider’s full listing set, disabling entries omitted from the file. It does not connect to a provider or launch games.', 'Collez le catalogue JSON ou chargez un fichier JSON. La synchronisation remplace l’ensemble des fiches du fournisseur et désactive celles qui manquent au fichier. Elle ne connecte pas de fournisseur et ne lance aucun jeu.'],
  sampleCatalogHelp: ['Use local sample data to try the operator workflow. It saves a clearly marked placeholder key and bilingual sample listings; no provider is contacted and the listings cannot be played.', 'Utilisez des données fictives locales pour essayer les outils de gestion. Un code fictif clairement indiqué et des fiches bilingues seront enregistrés; aucun fournisseur n’est contacté et les jeux ne sont pas accessibles.'],
  loadSampleCatalog: ['Prepare sample catalog', 'Préparer le catalogue fictif'], sampleProviderReady: ['Local sample provider saved with a placeholder key. No external provider was contacted.', 'Fournisseur fictif local enregistré avec un code provisoire. Aucun fournisseur externe n’a été contacté.'], sampleCatalogPrepared: ['Sample catalog is ready. Review the preview, then sync it to show the preview-only listings in the lobby.', 'Le catalogue fictif est prêt. Vérifiez l’aperçu, puis synchronisez-le pour afficher les fiches non jouables dans le hall.'],
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
  safety: ['Play controls', 'Contrôles de jeu'], pause: ['Take a 15 minute break', 'Faire une pause de 15 minutes'],
  exclude: ['Self-exclude this account', 'M’autoexclure de ce compte'],
  paused: ['Play is paused for 15 minutes.', 'Le jeu est suspendu pendant 15 minutes.'],
  excluded: ['This account is self-excluded and cannot sign in or play.', 'Ce compte est autoexclu et ne peut pas ouvrir une session ni jouer.'],
  confirmExclude: ['Self-exclusion will sign you out and prevent this account from signing in again. Continue?', 'L’autoexclusion fermera votre session et empêchera ce compte de se reconnecter. Continuer?'],
  dailyLimitLabel: ['Daily demo wager limit', 'Limite quotidienne de mises fictives'],
  saveLimit: ['Save limit', 'Enregistrer la limite'],
  dailyLimit: ['You have reached your daily demo wager limit.', 'Vous avez atteint votre limite quotidienne de mises fictives.'],
  pauseActive: ['Play is paused until', 'Le jeu est suspendu jusqu’à'],
  sessionReminder: ['You have been playing this demo for {minutes} minutes. Consider taking a break.', 'Vous jouez à cette démo depuis {minutes} minutes. Pensez à faire une pause.'], sessionReminderAcknowledge: ['Acknowledge', 'Compris'],
  coolingOff: ['Take a cooling-off period', 'Suspendre temporairement le jeu'], coolingOffHelp: ['Choose 1, 7, or 30 days without demo play. An active period can be extended but not shortened.', 'Choisissez une suspension du jeu de démonstration de 1, 7 ou 30 jours. Vous pouvez prolonger une période active, mais pas la raccourcir.'], coolingOffOne: ['1 day', '1 jour'], coolingOffSeven: ['7 days', '7 jours'], coolingOffThirty: ['30 days', '30 jours'], coolingOffConfirm: ['Start or extend this cooling-off period? It cannot be shortened after it begins.', 'Commencer ou prolonger cette suspension temporaire? Elle ne pourra pas être raccourcie une fois commencée.'], coolingOffSet: ['Demo play is paused until', 'Le jeu de démonstration est suspendu jusqu’au'], coolingOffActive: ['Your cooling-off period is active until', 'La suspension temporaire du jeu est en vigueur jusqu’au'],
  coolingOffTitle: ['Cooling-off period', 'Suspension temporaire du jeu'],
  coolingOffBlocked: ['Demo play is unavailable during your cooling-off period.', 'Le jeu de démonstration est indisponible pendant la suspension temporaire.'],
  unavailable: ['The service is temporarily unavailable.', 'Le service est temporairement indisponible.']
};

const $ = (selector) => document.querySelector(selector);
let language = localStorage.getItem('northplay-language') === 'fr' ? 1 : 0;
const resetToken = new URLSearchParams(location.search).get('reset');
const verifyToken = new URLSearchParams(location.search).get('verify');
const emailChangeToken = new URLSearchParams(location.search).get('email-change');
let pendingVerificationEmail;
let pendingVerificationUrl;
if (new URLSearchParams(location.search).get('lang') === 'fr') {
  language = 1;
  localStorage.setItem('northplay-language', 'fr');
}
let player;
let playerSessionStartedAt;
let displayedReminderHour;
let displayedReminderLanguage;
let filter = 'all';
let searchQuery = '';
let favorites;
try {
  const saved = JSON.parse(localStorage.getItem('northplay-favorites') || '[]');
  favorites = new Set(Array.isArray(saved) ? saved.filter((key) => typeof key === 'string').slice(0, 1000) : []);
} catch {
  favorites = new Set();
}
let screen = 'signin';
let selectedGame = games.find(({ id }) => id === sessionStorage.getItem('northplay-pending-game'));
let result;
let dialogError;
const t = (key) => (copy[key] || copy.unavailable)[language];
const money = (cents) => new Intl.NumberFormat(language ? 'fr-CA' : 'en-CA', { style: 'currency', currency: 'CAD' }).format(cents / 100);
const gameName = (game) => game.name[language];
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

function updateSessionReminder() {
  const banner = $('#session-reminder');
  if (!banner) return;
  if (!player || !playerSessionStartedAt || location.pathname === '/admin') {
    banner.hidden = true;
    displayedReminderHour = undefined;
    displayedReminderLanguage = undefined;
    return;
  }
  const hours = Math.floor((Date.now() - playerSessionStartedAt) / 3600000);
  if (hours < 1) {
    banner.hidden = true;
    displayedReminderHour = undefined;
    displayedReminderLanguage = undefined;
    return;
  }
  const key = `northplay-session-reminder:${playerSessionStartedAt}`;
  const acknowledgedHour = Number(localStorage.getItem(key) || 0);
  if (hours <= acknowledgedHour) {
    banner.hidden = true;
    displayedReminderHour = undefined;
    displayedReminderLanguage = undefined;
    return;
  }
  if (displayedReminderHour === hours && displayedReminderLanguage === language && !banner.hidden) return;
  const message = element('p', t('sessionReminder').replace('{minutes}', new Intl.NumberFormat(language ? 'fr-CA' : 'en-CA').format(hours * 60)));
  const acknowledge = element('button', t('sessionReminderAcknowledge'), 'ghost');
  acknowledge.type = 'button';
  acknowledge.addEventListener('click', () => {
    localStorage.setItem(key, String(hours));
    displayedReminderHour = undefined;
    displayedReminderLanguage = undefined;
    updateSessionReminder();
  });
  banner.replaceChildren(message, acknowledge);
  banner.hidden = false;
  displayedReminderHour = hours;
  displayedReminderLanguage = language;
}

async function api(path, data, method = 'POST') {
  const headers = {};
  const options = { method, headers };
  if (data !== undefined) {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(data);
  }
  const response = await fetch('/api/' + path, options);
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error);
  return payload;
}

function applyTenant(config) {
  document.title = `${config.brandName} Casino`;
  document.documentElement.style.setProperty('--green', config.accentColor);
  document.querySelector('meta[name="theme-color"]').content = config.accentColor;
  for (const brand of document.querySelectorAll('.brand')) {
    const mark = element('span', '✧');
    mark.setAttribute('aria-hidden', 'true');
    brand.replaceChildren(mark, document.createTextNode(` ${config.brandName.toUpperCase()}`));
  }
  const supportLink = $('#support-link');
  if (typeof config.supportEmail === 'string' && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(config.supportEmail)) {
    supportLink.href = `mailto:${config.supportEmail}`;
    supportLink.hidden = false;
  } else {
    supportLink.removeAttribute('href');
    supportLink.hidden = true;
  }
}

function updateAccount() {
  $('#account').textContent = player ? money(player.balance) : t('signin');
  const unreadSupport = player?.supportReplies || 0;
  $('#account').setAttribute('aria-label', player ? t('account') + ' · ' + money(player.balance) + (unreadSupport ? ' · ' + t('supportUnreadLabel').replace('{count}', new Intl.NumberFormat(language ? 'fr-CA' : 'en-CA').format(unreadSupport)) : '') : t('signin'));
  $('#account').classList.toggle('has-support-reply', Boolean(unreadSupport));
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
  item.append(element('small', `${author} · ${new Date(createdAt).toLocaleString(language ? 'fr-CA' : 'en-CA')}`));
  item.append(element('p', message));
  return item;
}

function historyEntryElement(entry) {
  const game = games.find(({ id }) => id === entry.game);
  if (!entry.game) return element('li', `${t('starter')} · +${money(entry.amount)}`);
  const date = entry.createdAt ? ` · ${new Date(entry.createdAt).toLocaleString(language ? 'fr-CA' : 'en-CA')}` : '';
  const change = `${entry.amount > 0 ? '+' : ''}${money(entry.amount)}`;
  const summary = describeOutcome(entry.game, entry.outcome);
  const outcome = summary ? ` · ${t('roundResult')}: ${summary}` : '';
  return element('li', `${game ? gameName(game) : entry.game}${date} · ${t('wager')}: ${money(entry.wager)} · ${t('balanceChange')}: ${change}${outcome}`);
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

async function openSupportCenter() {
  try {
    player.supportTickets = await api('support', undefined, 'GET');
    player.supportReplies = 0;
    updateAccount();
    openPanel('support');
  } catch (error) {
    dialogError = error.message;
    $('#status').textContent = t(dialogError);
  }
}

function renderDialog() {
  const panel = $('#panel');
  panel.replaceChildren();
  $('#status').textContent = dialogError ? t(dialogError) : '';
  const title = element('h2', screen === 'play' ? gameName(selectedGame) : screen === 'support' ? t('supportTitle') : screen === 'passwordReset' ? t('passwordResetTitle') : screen === 'emailVerification' ? t('emailVerification') : screen === 'emailChange' ? t('emailChangeTitle') : t(screen));
  title.id = 'dialog-title';
  panel.append(title);
  if (screen === 'signin' || screen === 'signup') {
    const signup = screen === 'signup';
    panel.append(submitForm([
      field('email', 'email', t('email'), 'email'),
      field('password', 'password', t('password'), signup ? 'new-password' : 'current-password')
    ], t(screen), async (data) => {
      const auth = await api(signup ? 'signup' : 'login', { ...data, ...(signup ? { locale: language ? 'fr-CA' : 'en-CA' } : {}) });
      if (auth.verificationRequired) {
        pendingVerificationEmail = data.email;
        pendingVerificationUrl = auth.verifyUrl;
        openPanel('emailVerification');
        return;
      }
      player = auth;
      playerSessionStartedAt = auth.sessionStartedAt;
      sessionStorage.removeItem('northplay-pending-game');
      language = auth.preferredLocale === 'fr-CA' ? 1 : 0;
      localStorage.setItem('northplay-language', language ? 'fr' : 'en');
      render();
      openPanel(selectedGame ? 'play' : 'account');
    }), action(t(signup ? 'signin' : 'signup'), () => openPanel(signup ? 'signin' : 'signup'), 'ghost'));
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
          panel.append(link);
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
    return;
  }
  if (screen === 'emailChange') {
    if (emailChangeToken) {
      panel.append(element('p', t('emailChangeConfirmHelp')));
      panel.append(submitForm([], t('emailChangeConfirm'), async () => {
        await api('account/email-change/complete', { token: emailChangeToken });
        history.replaceState(null, '', location.pathname);
        player = null;
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
          panel.append(link);
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
          panel.append(link);
        }
      }));
    }
    panel.append(action(t('signin'), () => { history.replaceState(null, '', location.pathname); openPanel('signin'); }, 'ghost'));
    return;
  }
  panel.append(element('p', t('balanceLabel') + ' · ' + money(player.balance)));
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
    if (player.safety?.excluded || player.safety?.coolingOffUntil > Date.now() || player.safety?.pausedUntil > Date.now()) {
      const coolingOffActive = player.safety?.coolingOffUntil > Date.now();
      panel.append(element('p', player.safety.excluded ? t('excluded') : coolingOffActive ? t('coolingOffActive') + ' ' + new Date(player.safety.coolingOffUntil).toLocaleString(language ? 'fr-CA' : 'en-CA') : t('pauseActive') + ' ' + new Date(player.safety.pausedUntil).toLocaleTimeString(language ? 'fr-CA' : 'en-CA')));
      return;
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
      panel.append(element('p', result.amount > 0 ? t('won') + ' · +' + money(result.amount) : result.amount === 0 ? t('push') : t('lost') + ' · ' + money(result.amount), 'round-result'));
      const outcomeSummary = describeOutcome(selectedGame.id, result.outcome);
      if (outcomeSummary) {
        const resultClass = ['gold', 'aurora'].includes(selectedGame.id) ? 'reel-result' : selectedGame.id === 'blackjack' ? 'hand-result' : 'round-detail';
        panel.append(element('p', outcomeSummary, resultClass));
      }
    }
    let pending;
    const fields = colorSelect ? [label, colorSelect.parentElement] : [label];
    panel.append(submitForm(fields, t('play'), async ({ wager, choice }) => {
      if (!pending || pending.wager !== Number(wager) || pending.choice !== choice) {
        const bytes = crypto.getRandomValues(new Uint8Array(18));
        const requestId = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
        pending = { game: selectedGame.id, wager: Number(wager), requestId, ...(choice ? { choice } : {}) };
      }
      player = await api('play', pending);
      result = { amount: player.amount, outcome: player.outcome };
      dialogError = undefined;
      updateAccount();
      renderDialog();
    }, t('roundInProgress')), action(t('history'), () => openPanel('account'), 'ghost'));
    return;
  }
  if (screen === 'support') {
    panel.append(element('p', t('supportIntro')));
    const categoryLabel = element('label', t('supportCategory'));
    const category = element('select');
    category.name = 'category';
    for (const [value, key] of Object.entries(supportCategoryCopy)) {
      const option = element('option', t(key));
      option.value = value;
      category.append(option);
    }
    categoryLabel.append(category);
    const messageLabel = element('label', t('supportMessage'));
    const message = element('textarea');
    Object.assign(message, { name: 'message', required: true, minLength: 10, maxLength: 3000, rows: 5 });
    messageLabel.append(message);
    panel.append(submitForm([categoryLabel, messageLabel], t('supportSend'), async ({ category: ticketCategory, message: ticketMessage }) => {
      await api('support', { category: ticketCategory, message: ticketMessage });
      player.supportTickets = await api('support', undefined, 'GET');
      dialogError = undefined;
      renderDialog();
      $('#status').textContent = t('supportSent');
    }));
    panel.append(action(t('account'), () => openPanel('account'), 'ghost'), element('h3', t('supportTickets')));
    const tickets = player.supportTickets || [];
    if (!tickets.length) panel.append(element('p', t('supportNoTickets')));
    for (const ticket of tickets) {
      const article = element('article', '', 'support-ticket');
      article.append(element('strong', `${t(supportCategoryCopy[ticket.isComplaint ? 'complaint' : ticket.category])} · ${t(supportStatusCopy[ticket.status])}`));
      article.append(element('small', new Date(ticket.createdAt).toLocaleString(language ? 'fr-CA' : 'en-CA')));
      article.append(element('h3', t('supportThread')));
      article.append(supportMessageElement(t('supportPlayerAuthor'), ticket.message, ticket.createdAt, 'from-player'));
      for (const message of ticket.messages || []) {
        const author = message.authorType === 'staff' ? t('supportStaffAuthor') : t('supportPlayerAuthor');
        article.append(supportMessageElement(author, message.message, message.createdAt, message.authorType === 'staff' ? 'from-staff' : 'from-player'));
      }
      const followupLabel = element('label', t('supportFollowup'));
      const followup = element('textarea');
      Object.assign(followup, { name: 'message', required: true, maxLength: 3000, rows: 3 });
      followupLabel.append(followup);
      article.append(submitForm([followupLabel], t('supportFollowupSend'), async ({ message }) => {
        await api('support/reply', { ticketId: ticket.id, message });
        player.supportTickets = await api('support', undefined, 'GET');
        player.supportReplies = 0;
        updateAccount();
        renderDialog();
        $('#status').textContent = t('supportFollowupSent');
      }));
      panel.append(article);
    }
    return;
  }
  panel.append(element('p', player.email), action(t('changeEmail'), () => openPanel('emailChange'), 'ghost'), element('p', `${t('preferredLanguage')} · ${t(language ? 'frenchLanguage' : 'englishLanguage')}`));
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
    playerSessionStartedAt = undefined;
    selectedGame = undefined;
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
        ? ['Date (UTC)', 'Activité', 'Résultat de la partie', 'Mise (CAD)', 'Variation du solde (CAD)', 'Devise']
        : ['Date (UTC)', 'Activity', 'Round result', 'Wager (CAD)', 'Balance change (CAD)', 'Currency'];
      const rows = data.activity.map((entry) => {
        const game = games.find(({ id }) => id === entry.game);
        return [
          entry.createdAt ? new Date(entry.createdAt).toISOString() : '',
          (game ? gameName(game) : entry.game) || (language ? 'Crédit de départ' : 'Starting credit'),
          describeOutcome(entry.game, entry.outcome),
          (entry.wager / 100).toFixed(2),
          (entry.amount / 100).toFixed(2),
          'CAD'
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
  panel.append(element('h3', t('coolingOffTitle')),
    element('p', t('coolingOffHelp')));
  if (player.safety.coolingOffUntil > Date.now()) {
    panel.append(element('p', t('coolingOffActive') + ' ' + new Date(player.safety.coolingOffUntil).toLocaleString(language ? 'fr-CA' : 'en-CA')));
  }
  const coolingOffForm = element('form');
  const coolingOffLabel = element('label', t('coolingOffTitle'));
  const coolingOffSelect = element('select');
  coolingOffSelect.name = 'days';
  for (const [days, key] of [[1, 'coolingOffOne'], [7, 'coolingOffSeven'], [30, 'coolingOffThirty']]) {
    const option = element('option', t(key));
    option.value = String(days);
    coolingOffSelect.append(option);
  }
  coolingOffLabel.append(coolingOffSelect);
  const coolingOffButton = element('button', t('coolingOff'));
  coolingOffForm.append(coolingOffLabel, coolingOffButton);
  coolingOffForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!window.confirm(t('coolingOffConfirm'))) return;
    coolingOffButton.disabled = true;
    try {
      player = await api('safety/cooling-off', { days: Number(coolingOffSelect.value) });
      const until = new Date(player.safety.coolingOffUntil).toLocaleString(language ? 'fr-CA' : 'en-CA');
      openPanel('account');
      $('#status').textContent = `${t('coolingOffSet')} ${until}`;
    } catch (error) {
      dialogError = error.message;
      $('#status').textContent = t(dialogError);
    } finally {
      coolingOffButton.disabled = false;
    }
  });
  panel.append(coolingOffForm);
  const supportReplies = player.supportReplies || 0;
  const supportLabel = supportReplies ? t('supportNewReplies').replace('{count}', new Intl.NumberFormat(language ? 'fr-CA' : 'en-CA').format(supportReplies)) : t('supportTitle');
  panel.append(action(supportLabel, openSupportCenter, 'ghost'), element('h3', t('safety')),
    action(t('pause'), async () => {
      player.safety = await api('safety/pause', {});
      openPanel('account');
    }, 'ghost'),
    action(t('exclude'), async () => {
      if (!window.confirm(t('confirmExclude'))) return;
      await api('safety/exclude', {});
      player = null;
      playerSessionStartedAt = undefined;
      updateAccount();
      updateSessionReminder();
      $('#dialog').close();
    }, 'ghost'));
}

function openPanel(next) {
  screen = next;
  dialogError = undefined;
  renderDialog();
  if (!$('#dialog').open) $('#dialog').showModal();
}

function renderCatalog() {
  const catalog = $('#catalog');
  catalog.replaceChildren();
  const createArt = (icon, theme) => {
    const art = element('span', '', `art ${theme}`);
    art.setAttribute('aria-hidden', 'true');
    art.append(element('span', icon, 'art-icon'));
    return art;
  };
  const addFavoriteButton = (art, key, name) => {
    const isFavorite = favorites.has(key);
    const button = action(isFavorite ? '★' : '☆', () => {
      if (favorites.has(key)) favorites.delete(key);
      else favorites.add(key);
      try { localStorage.setItem('northplay-favorites', JSON.stringify([...favorites])); } catch {}
      renderCatalog();
    }, 'favorite-toggle');
    button.setAttribute('aria-pressed', String(isFavorite));
    button.setAttribute('aria-label', t(isFavorite ? 'removeFavorite' : 'addFavorite').replace('{game}', name));
    art.append(button);
  };
  const normalizedQuery = searchQuery.trim().toLocaleLowerCase(language ? 'fr-CA' : 'en-CA').normalize('NFD').replace(/\p{Diacritic}/gu, '');
  const matchesQuery = (values) => {
    if (!normalizedQuery) return true;
    const searchable = values.filter(Boolean).join(' ').toLocaleLowerCase(language ? 'fr-CA' : 'en-CA').normalize('NFD').replace(/\p{Diacritic}/gu, '');
    return searchable.includes(normalizedQuery);
  };
  const demoGames = games.filter((game) => {
    const key = `demo:${game.id}`;
    if (filter === 'favorites' && !favorites.has(key)) return false;
    if (filter !== 'all' && filter !== 'favorites' && filter !== game.type) return false;
    return matchesQuery([...game.name, 'Northplay Demo']);
  });
  const visibleGames = providerGames.filter((game) => {
    const key = `provider:${game.provider}:${game.externalId}`;
    if (filter === 'favorites' && !favorites.has(key)) return false;
    if (filter !== 'all' && filter !== 'favorites' && filter !== game.category) return false;
    return matchesQuery([game.titleEn, game.titleFr, game.provider]);
  });
  const hasListings = demoGames.length + visibleGames.length > 0;
  $('#catalog-controls').hidden = !games.length && !providerGames.length;
  $('#catalog-empty').hidden = hasListings;
  const noFavorites = filter === 'favorites' && favorites.size === 0;
  $('[data-copy="catalogEmptyTitle"]').textContent = noFavorites ? t('noFavoriteGamesTitle') : (games.length || providerGames.length) ? t('catalogNoMatchesTitle') : t('catalogEmptyTitle');
  $('[data-copy="catalogEmpty"]').textContent = noFavorites ? t('noFavoriteGames') : (games.length || providerGames.length) ? t('catalogNoMatches') : t('catalogEmpty');
  for (const game of demoGames) {
    const card = element('article', '', 'card demo-card');
    const art = createArt(game.icon, game.id);
    addFavoriteButton(art, `demo:${game.id}`, gameName(game));
    const info = element('span', '', 'card-info');
    info.append(element('small', t('demoGameLabel'), 'catalog-label'), element('strong', gameName(game)), element('small', `${t(game.type)} · Northplay Demo`));
    const play = action(t('playNow'), () => {
      selectedGame = game;
      sessionStorage.setItem('northplay-pending-game', game.id);
      result = undefined;
      openPanel(player ? 'play' : 'signin');
    }, 'ghost demo-play');
    info.append(play);
    card.append(art, info);
    catalog.append(card);
  }
  for (const game of visibleGames) {
    const artClass = game.category === 'slots' ? 'gold' : game.category === 'live' ? 'aurora' : 'blackjack';
    const icon = game.category === 'slots' ? '✦' : game.category === 'live' ? '◉' : '♠';
    const card = element('article', '', 'card provider-card');
    const art = createArt(icon, artClass);
    addFavoriteButton(art, `provider:${game.provider}:${game.externalId}`, language ? game.titleFr : game.titleEn);
    const info = element('span', '', 'card-info');
    info.append(element('small', t('catalogListing'), 'catalog-label'), element('strong', language ? game.titleFr : game.titleEn), element('small', `${t(game.category)} · ${game.provider}`));
    card.append(art, info);
    catalog.append(card);
  }
}

let providerStatus;
let currentStaffEmail;
let currentStaffId;
let providerGames = [];
let catalogReview;
let supportInboxEntries;
let supportInboxTeam = [];
let supportInboxCursor = null;
let supportInboxPageCount = 0;
let supportInboxTotal = 0;
let supportInboxCounts = { open: 0, answered: 0, closed: 0 };
let supportInboxHasMore = false;
function render() {
  document.documentElement.lang = language ? 'fr-CA' : 'en-CA';
  for (const node of document.querySelectorAll('[data-copy]')) node.textContent = t(node.dataset.copy);
  for (const node of document.querySelectorAll('[data-copy][aria-label]')) node.setAttribute('aria-label', t(node.dataset.copy));
  $('header nav').setAttribute('aria-label', t('primaryNav'));
  $('footer nav').setAttribute('aria-label', t('footerNav'));
  $('.welcome-rail').setAttribute('aria-label', t('infoLabel'));
  $('#language').textContent = language ? 'EN' : 'FR';
  $('#language').setAttribute('aria-label', language ? 'Switch to English' : 'Passer au français');
  $('#close').setAttribute('aria-label', t('close'));
  $('#provider-status').textContent = providerStatus ? t(providerStatus) : '';
  updateAccount();
  renderCatalog();
  updateCatalogPreview();
  if (supportInboxEntries) renderSupportInbox();
  if ($('#dialog').open) renderDialog();
  updateSessionReminder();
}

$('#language').addEventListener('click', async () => {
  const previousLanguage = language;
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
});
$('#account').addEventListener('click', () => {
  selectedGame = undefined;
  sessionStorage.removeItem('northplay-pending-game');
  openPanel(player ? 'account' : 'signin');
});
$('#safety-controls').addEventListener('click', () => openPanel(player ? 'account' : 'signin'));
$('#close').addEventListener('click', () => {
  if (!player) {
    selectedGame = undefined;
    sessionStorage.removeItem('northplay-pending-game');
  }
  $('#dialog').close();
});
$('#dialog').setAttribute('aria-labelledby', 'dialog-title');
$('#filters').addEventListener('click', (event) => {
  if (!event.target.dataset.filter) return;
  filter = event.target.dataset.filter;
  for (const button of $('#filters').children) button.setAttribute('aria-pressed', button === event.target);
  renderCatalog();
});
$('#game-search').addEventListener('input', (event) => {
  searchQuery = event.currentTarget.value;
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


function parseCatalogInput(raw) {
  if (new TextEncoder().encode(raw).length > 256 * 1024) throw new Error('invalid');
  const imported = JSON.parse(raw);
  if (!Array.isArray(imported) || imported.length < 1 || imported.length > 500) throw new Error('invalid');
  const ids = new Set();
  for (const game of imported) {
    if (!game || typeof game.externalId !== 'string' || !/^[\w.-]{1,128}$/.test(game.externalId) || ids.has(game.externalId) ||
        typeof game.titleEn !== 'string' || !game.titleEn.trim() || game.titleEn.length > 120 ||
        typeof game.titleFr !== 'string' || !game.titleFr.trim() || game.titleFr.length > 120 ||
        !['slots', 'table', 'live'].includes(game.category)) throw new Error('invalid');
    ids.add(game.externalId);
  }
  return imported;
}

function updateCatalogPreview() {
  const form = $('#catalog-sync');
  const raw = form.elements.games.value;
  const button = form.querySelector('button[type=submit]');
  const reviewButton = $('#catalog-review');
  try {
    const imported = parseCatalogInput(raw);
    const name = form.elements.name.value.trim();
    const signature = JSON.stringify({ name, games: imported });
    reviewButton.disabled = !name;
    if (catalogReview?.signature === signature) {
      const count = (value) => new Intl.NumberFormat(language ? 'fr-CA' : 'en-CA').format(value);
      const result = catalogReview.result;
      const hasChanges = result.added + result.updated + result.removed > 0;
      let message = hasChanges
        ? t('catalogDiff').replace('{added}', count(result.added)).replace('{updated}', count(result.updated)).replace('{unchanged}', count(result.unchanged)).replace('{removed}', count(result.removed))
        : t('catalogNoChanges').replace('{count}', count(result.unchanged));
      if (hasChanges && result.removed) message += ` ${t('catalogRemovedWarning')}`;
      $('#catalog-preview').textContent = message;
      button.disabled = !hasChanges;
    } else {
      catalogReview = undefined;
      $('#catalog-preview').textContent = t('catalogNeedReview').replace('{count}', new Intl.NumberFormat(language ? 'fr-CA' : 'en-CA').format(imported.length));
      button.disabled = true;
    }
  } catch {
    catalogReview = undefined;
    $('#catalog-preview').textContent = raw.trim() ? t('invalid') : '';
    button.disabled = true;
    reviewButton.disabled = true;
  }
}

$('#catalog-review').addEventListener('click', async () => {
  const form = $('#catalog-sync');
  const reviewButton = $('#catalog-review');
  const syncButton = form.querySelector('button[type=submit]');
  const name = form.elements.name.value.trim();
  $('#catalog-status').textContent = '';
  let imported;
  try {
    imported = parseCatalogInput(form.elements.games.value);
  } catch {
    updateCatalogPreview();
    return;
  }
  const signature = JSON.stringify({ name, games: imported });
  reviewButton.disabled = true;
  syncButton.disabled = true;
  $('#catalog-preview').textContent = t('loading');
  try {
    const result = await api('providers/catalog/preview', { name, games: imported });
    if (signature !== JSON.stringify({ name: form.elements.name.value.trim(), games: parseCatalogInput(form.elements.games.value) })) {
      updateCatalogPreview();
      return;
    }
    catalogReview = { signature, result };
    updateCatalogPreview();
  } catch (error) {
    $('#catalog-status').textContent = t(error.message);
  } finally {
    updateCatalogPreview();
  }
});

$('#load-sample-catalog').addEventListener('click', async () => {
  const button = $('#load-sample-catalog');
  const name = 'Northplay Demo Sample';
  const sampleKey = 'LOCAL-ONLY-NO-PROVIDER-CONNECTION';
  const sampleGames = [
    { externalId: 'northplay-sample-slots', titleEn: 'Northern Lights', titleFr: 'Aurores boréales', category: 'slots' },
    { externalId: 'northplay-sample-blackjack', titleEn: 'Maple Blackjack', titleFr: 'Blackjack à l’érable', category: 'table' },
    { externalId: 'northplay-sample-roulette', titleEn: 'Roulette Studio', titleFr: 'Studio de roulette', category: 'live' },
    { externalId: 'northplay-sample-aurora', titleEn: 'Aurora Spins', titleFr: 'Tours boréaux', category: 'slots' }
  ];
  const form = $('#catalog-sync');
  const providerForm = $('#provider');
  const signature = JSON.stringify({ name, games: sampleGames });
  form.elements.name.value = name;
  form.elements.games.value = JSON.stringify(sampleGames, null, 2);
  providerForm.elements.name.value = name;
  catalogReview = undefined;
  updateCatalogPreview();
  $('#catalog-status').textContent = '';
  $('#sample-catalog-status').textContent = t('loading');
  button.disabled = true;
  $('#catalog-review').disabled = true;
  try {
    await api('providers', { name, key: sampleKey });
    const preview = await api('providers/catalog/preview', { name, games: sampleGames });
    const currentSignature = JSON.stringify({ name: form.elements.name.value.trim(), games: parseCatalogInput(form.elements.games.value) });
    if (signature !== currentSignature) {
      updateCatalogPreview();
      return;
    }
    catalogReview = { signature, result: preview };
    const providers = await api('providers/list');
    $('#providers').replaceChildren(...providers.map((provider) => element('li', provider.name + ' · ••••••••')));
    providerStatus = 'sampleProviderReady';
    $('#provider-status').textContent = t(providerStatus);
    $('#sample-catalog-status').textContent = t('sampleCatalogPrepared');
  } catch (error) {
    $('#sample-catalog-status').textContent = t(error.message);
  } finally {
    button.disabled = false;
    updateCatalogPreview();
  }
});

function catalogEdited() {
  $('#catalog-status').textContent = '';
  updateCatalogPreview();
}
$('#catalog-sync').elements.name.addEventListener('input', catalogEdited);

$('#catalog-file').addEventListener('change', async (event) => {
  const file = event.currentTarget.files[0];
  if (!file) return;
  if (file.size > 256 * 1024) {
    catalogReview = undefined;
    $('#catalog-status').textContent = '';
    $('#catalog-preview').textContent = t('invalid');
    $('#catalog-sync').elements.games.value = '';
    $('#catalog-sync').querySelector('button[type=submit]').disabled = true;
    $('#catalog-review').disabled = true;
    event.currentTarget.value = '';
    return;
  }
  $('#catalog-sync').elements.games.value = await file.text();
  catalogEdited();
});
$('#catalog-sync').elements.games.addEventListener('input', catalogEdited);

$('#catalog-sync').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector('button[type=submit]');
  const { name, games: rawGames } = Object.fromEntries(new FormData(form));
  let imported;
  try {
    imported = parseCatalogInput(rawGames);
  } catch {
    updateCatalogPreview();
    return;
  }
  const signature = JSON.stringify({ name: name.trim(), games: imported });
  if (!catalogReview || catalogReview.signature !== signature) {
    updateCatalogPreview();
    return;
  }
  const expectedRevision = catalogReview.result.revision;
  button.disabled = true;
  try {
    const response = await api('providers/catalog', { name: name.trim(), games: imported, expectedRevision });
    providerGames = await api('games', undefined, 'GET');
    renderCatalog();
    $('#catalog-status').textContent = t('synced') + ' · ' + response.imported;
    catalogReview = undefined;
    updateCatalogPreview();
  } catch (error) {
    catalogReview = undefined;
    $('#catalog-preview').textContent = t(error.message);
  } finally {
    if (catalogReview) updateCatalogPreview();
  }
});

async function loadTenantDraft() {
  const form = $('#tenant-config');
  const draft = await api('admin/config', undefined, 'GET');
  form.elements.brandName.value = draft.config.brandName;
  form.elements.accentColor.value = draft.config.accentColor;
  form.elements.supportEmail.value = draft.config.supportEmail;
  $('#tenant-config-status').textContent = `v${draft.version}`;
}
$('#load-config').addEventListener('click', async () => {
  try { await loadTenantDraft(); }
  catch (error) { $('#tenant-config-status').textContent = t(error.message); }
});
$('#tenant-config').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const { brandName, accentColor, supportEmail } = Object.fromEntries(new FormData(form));
  try {
    const result = await api('admin/config', { config: { brandName: brandName.trim(), primaryLocale: 'en-CA', enabledLocales: ['en-CA', 'fr-CA'], accentColor, supportEmail: supportEmail.trim() } });
    $('#tenant-config-status').textContent = `${t('draftSaved')} v${result.version}`;
  } catch (error) { $('#tenant-config-status').textContent = t(error.message); }
});
$('#publish-config').addEventListener('click', async () => {
  try {
    const result = await api('admin/config/publish', {});
    const published = await api('tenant', undefined, 'GET');
    applyTenant(published.config);
    $('#tenant-config-status').textContent = `${t('configPublished')} v${result.version}`;
  } catch (error) { $('#tenant-config-status').textContent = t(error.message); }
});

async function refreshStaffList() {
  const members = await api('admin/staff', undefined, 'GET');
  $('#staff-list').replaceChildren(...members.map((member) => {
    const roleLabel = ({ operator_admin: t('roleAdmin'), operator_content: t('roleContent'), operator_provider: t('roleProvider'), operator_support: t('roleSupport') })[member.role] || member.role;
    const item = element('li', `${member.email} · ${roleLabel} · ${t(member.status)}`);
    if (member.status === 'active' && member.email !== currentStaffEmail) {
      const disable = element('button', t('staffDisable'), 'ghost');
      disable.type = 'button';
      disable.dataset.disableEmail = member.email;
      item.append(disable);
    }
    return item;
  }));
}
async function refreshStaffAudit() {
  const events = await api('admin/audit', undefined, 'GET');
  $('#staff-audit').replaceChildren(...events.map((entry) => element('li', `${entry.actor} · ${entry.action} · ${entry.target} · ${new Date(entry.createdAt).toLocaleString(language ? 'fr-CA' : 'en-CA')} · ${entry.correlationId || ''}`)));
}
function renderSupportInbox() {
  if (!supportInboxEntries) return;
  const container = $('#support-tickets');
  const status = $('#support-inbox-status');
  const summary = $('#support-summary');
  const query = $('#support-search').value.trim().toLocaleLowerCase(language ? 'fr-CA' : 'en-CA').normalize('NFD').replace(/\p{Diacritic}/gu, '');
  const selectedStatus = $('#support-filter').value;
  const selectedComplaint = $('#support-complaint-filter').value;
  const selectedPriority = $('#support-priority-filter').value;
  const selectedAssignee = $('#support-assignee-filter').value;
  const number = (value) => new Intl.NumberFormat(language ? 'fr-CA' : 'en-CA').format(value);
  summary.textContent = t('supportQueueSummary').replace('{loaded}', number(supportInboxEntries.length)).replace('{total}', number(supportInboxTotal)).replace('{open}', number(supportInboxCounts.open)).replace('{answered}', number(supportInboxCounts.answered)).replace('{closed}', number(supportInboxCounts.closed));
  const loadMore = $('#support-load-more');
  loadMore.hidden = !supportInboxHasMore;
  loadMore.disabled = false;
  loadMore.textContent = t('supportLoadMore');
  const priorityRank = { urgent: 0, high: 1, normal: 2, low: 3 };
  const statusRank = { open: 0, answered: 1, closed: 2 };
  const tickets = supportInboxEntries.slice().sort((a, b) => (priorityRank[a.priority] - priorityRank[b.priority]) || (statusRank[a.status] - statusRank[b.status]) || (b.updatedAt - a.updatedAt) || (b.id - a.id)).filter((ticket) => {
    if ((selectedStatus !== 'all' && ticket.status !== selectedStatus) || (selectedPriority !== 'all' && ticket.priority !== selectedPriority)) return false;
    if (selectedComplaint === 'complaints' && !ticket.isComplaint) return false;
    if (selectedComplaint === 'requests' && ticket.isComplaint) return false;
    if (selectedAssignee === 'mine' && ticket.assignedTo !== currentStaffId) return false;
    if (selectedAssignee === 'unassigned' && ticket.assignedTo) return false;
    const searchable = `${ticket.email} ${ticket.assignedEmail || ''} ${ticket.message} ${(ticket.messages || []).map((message) => message.message).join(' ')} ${(ticket.notes || []).map((note) => note.note).join(' ')}`.toLocaleLowerCase(language ? 'fr-CA' : 'en-CA').normalize('NFD').replace(/\p{Diacritic}/gu, '');
    return searchable.includes(query);
  });
  if (!tickets.length) {
    container.replaceChildren(element('p', supportInboxEntries.length ? t('supportNoMatches') : t('supportNoInbox')));
    return;
  }
  container.replaceChildren(...tickets.map((ticket) => {
    const article = element('article', '', 'support-ticket');
    article.append(element('h3', `#${ticket.id} · ${ticket.email}`));
    article.append(element('small', `${t(supportCategoryCopy[ticket.isComplaint ? 'complaint' : ticket.category])} · ${t(supportStatusCopy[ticket.status])} · ${t(supportPriorityCopy[ticket.priority])} · ${new Date(ticket.createdAt).toLocaleString(language ? 'fr-CA' : 'en-CA')}`));
    if (ticket.isComplaint) article.append(element('strong', t('supportComplaintBadge'), 'complaint-badge'));
    article.append(element('p', `${t('supportAssignedTo')}: ${ticket.assignedEmail || t('supportUnassigned')}`));
    article.append(element('h4', t('supportThread')));
    article.append(supportMessageElement(ticket.email, ticket.message, ticket.createdAt, 'from-player'));
    for (const message of ticket.messages || []) {
      const author = message.authorType === 'staff' ? message.author || t('supportStaffAuthor') : ticket.email;
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
        await api('admin/support/assign', { ticketId: ticket.id, staffId });
        if (await refreshSupportInbox()) status.textContent = t('supportAssignmentSaved');
      } catch (error) {
        status.textContent = t(error.message);
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
        await api('admin/support/note', { ticketId: ticket.id, ...data });
        if (await refreshSupportInbox()) status.textContent = t('supportNoteSaved');
      } catch (error) {
        status.textContent = t(error.message);
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
        await api('admin/support/reply', { ticketId: ticket.id, ...data });
        if (await refreshSupportInbox()) status.textContent = t('supportSaved');
      } catch (error) {
        status.textContent = t(error.message);
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
          await api('admin/support/reply', { ticketId: ticket.id, status: 'closed', priority: priority.value });
          if (await refreshSupportInbox()) status.textContent = t('supportClosedNoReply');
        } catch (error) {
          status.textContent = t(error.message);
        } finally {
          closeWithoutReply.disabled = false;
        }
      }, 'ghost');
      article.append(closeWithoutReply);
    }
    return article;
  }));
}

async function refreshSupportInbox(restart = false) {
  const status = $('#support-inbox-status');
  status.textContent = '';
  try {
    const targetPageCount = restart ? 1 : Math.max(supportInboxPageCount, 1);
    supportInboxTeam = await api('admin/support/team', undefined, 'GET');
    let cursor = null;
    let page;
    const loaded = [];
    let pagesLoaded = 0;
    while (pagesLoaded < targetPageCount) {
      const path = cursor === null ? 'admin/support' : `admin/support?beforeId=${cursor}`;
      page = await api(path, undefined, 'GET');
      loaded.push(...page.tickets);
      pagesLoaded += 1;
      cursor = page.nextCursor;
      if (cursor === null) break;
    }
    supportInboxEntries = loaded;
    supportInboxTotal = page.total;
    supportInboxCounts = page.counts;
    supportInboxCursor = cursor;
    supportInboxPageCount = pagesLoaded;
    supportInboxHasMore = cursor !== null;
    renderSupportInbox();
    return true;
  } catch (error) {
    status.textContent = t(error.message);
    return false;
  }
}

async function loadMoreSupportInbox() {
  const button = $('#support-load-more');
  if (!supportInboxHasMore || button.disabled) return;
  button.disabled = true;
  button.textContent = t('supportLoadingMore');
  $('#support-inbox-status').textContent = '';
  try {
    const path = supportInboxCursor === null ? 'admin/support' : `admin/support?beforeId=${supportInboxCursor}`;
    const page = await api(path, undefined, 'GET');
    const existingIds = new Set(supportInboxEntries.map((ticket) => ticket.id));
    supportInboxEntries.push(...page.tickets.filter((ticket) => !existingIds.has(ticket.id)));
    supportInboxTotal = page.total;
    supportInboxCounts = page.counts;
    supportInboxCursor = page.nextCursor;
    supportInboxPageCount += 1;
    supportInboxHasMore = page.nextCursor !== null;
    renderSupportInbox();
  } catch (error) {
    $('#support-inbox-status').textContent = t(error.message);
    button.disabled = false;
  }
}

$('#support-inbox-refresh').addEventListener('click', () => refreshSupportInbox(true));
$('#support-load-more').addEventListener('click', loadMoreSupportInbox);
$('#support-search').addEventListener('input', renderSupportInbox);
$('#support-filter').addEventListener('change', renderSupportInbox);
$('#support-complaint-filter').addEventListener('change', renderSupportInbox);
$('#support-priority-filter').addEventListener('change', renderSupportInbox);
$('#support-assignee-filter').addEventListener('change', renderSupportInbox);
function showStaffSession(session) {
  currentStaffEmail = session.email;
  currentStaffId = session.id;
  $('#staff-login').hidden = true;
  $('#admin-tools').hidden = false;
  $('#staff-identity').textContent = `${session.email} · ${session.role}`;
  for (const section of document.querySelectorAll('[data-roles]')) section.hidden = !section.dataset.roles.split(',').includes(session.role);
  $('#mfa-setup').hidden = session.mfaEnabled;
  $('#mfa-verify').hidden = false;
  $('#mfa-verify').querySelector('button[type=submit]').hidden = session.mfaEnabled;
  $('#mfa-disable').hidden = !session.mfaEnabled;
  if (session.role === 'operator_admin') refreshStaffList().catch((error) => { $('#staff-status').textContent = t(error.message); });
  if (session.role === 'operator_admin') refreshStaffAudit().catch(() => {});
  if (['operator_admin', 'operator_support'].includes(session.role)) refreshSupportInbox();
  if (['operator_admin', 'operator_content'].includes(session.role)) loadTenantDraft().catch(() => {});
}
$('#staff-login-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const submit = form.querySelector('button[type=submit]');
  const { email, password, code } = Object.fromEntries(new FormData(form));
  submit.disabled = true;
  submit.textContent = t('staffSigningIn');
  form.setAttribute('aria-busy', 'true');
  $('#staff-login-status').textContent = '';
  try {
    const session = await api('admin/login', { email, password, code });
    showStaffSession(session);
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
$('#staff-logout').addEventListener('click', async () => {
  await api('admin/logout', {});
  currentStaffEmail = undefined;
  currentStaffId = undefined;
  $('#admin-tools').hidden = true;
  $('#staff-login').hidden = false;
});
$('#staff-create').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const { email, password, role } = Object.fromEntries(new FormData(form));
  try {
    await api('admin/staff', { email, password, role });
    form.reset();
    $('#staff-status').textContent = t('staffAdded');
    await refreshStaffList();
  } catch (error) { $('#staff-status').textContent = t(error.message); }
});
$('#staff-list').addEventListener('click', async (event) => {
  const email = event.target.dataset.disableEmail;
  if (!email) return;
  try {
    await api('admin/staff/disable', { email });
    $('#staff-status').textContent = t('staffDisabled');
    await refreshStaffList();
  } catch (error) { $('#staff-status').textContent = t(error.message); }
});
$('#staff-audit-refresh').addEventListener('click', async () => {
  try { await refreshStaffAudit(); }
  catch (error) { $('#staff-status').textContent = t(error.message); }
});
$('#mfa-setup').addEventListener('click', async () => {
  try {
    const setup = await api('admin/mfa/setup', {});
    $('#mfa-secret').hidden = false;
    $('#mfa-secret').textContent = `${setup.secret}\n${setup.otpauth}`;
  } catch (error) { $('#mfa-status').textContent = t(error.message); }
});
$('#mfa-verify').addEventListener('submit', async (event) => {
  event.preventDefault();
  const code = event.currentTarget.elements.code.value;
  try {
    await api('admin/mfa/enable', { code });
    $('#mfa-status').textContent = t('mfaEnabled');
    $('#mfa-setup').hidden = true;
    $('#mfa-secret').hidden = true;
    $('#mfa-verify').querySelector('button[type=submit]').hidden = true;
    $('#mfa-disable').hidden = false;
  } catch (error) { $('#mfa-status').textContent = t(error.message); }
});
$('#mfa-disable').addEventListener('click', async () => {
  const code = $('#mfa-verify').elements.code.value;
  try {
    await api('admin/mfa/disable', { code });
    $('#mfa-status').textContent = t('mfaDisabled');
    $('#mfa-setup').hidden = false;
    $('#mfa-verify').querySelector('button[type=submit]').hidden = false;
    $('#mfa-disable').hidden = true;
  } catch (error) { $('#mfa-status').textContent = t(error.message); }
});

$('#lobby').hidden = location.pathname === '/admin';
$('#admin').hidden = !$('#lobby').hidden;
render();
if (location.pathname === '/admin') {
  try { showStaffSession(await api('admin/session', undefined, 'GET')); }
  catch { $('#staff-login').hidden = false; $('#admin-tools').hidden = true; }
}
try {
  const published = await api('tenant', undefined, 'GET');
  applyTenant(published.config);
} catch {
  // Use the shared default brand if tenant settings are unavailable.
}
try {
  providerGames = await api('games', undefined, 'GET');
  renderCatalog();
} catch {
  renderCatalog();
}
try {
  player = await api('account', undefined, 'GET');
  playerSessionStartedAt = player?.sessionStartedAt;
  if (player?.preferredLocale) {
    language = player.preferredLocale === 'fr-CA' ? 1 : 0;
    localStorage.setItem('northplay-language', language ? 'fr' : 'en');
  }
  updateAccount();
  render();
} catch {
  // The catalogue remains available when the account service is offline.
}
window.setInterval(updateSessionReminder, 60_000);
updateSessionReminder();
if (resetToken) openPanel('passwordReset');
else if (verifyToken) openPanel('emailVerification');
else if (emailChangeToken) openPanel('emailChange');
