# Modules de Casino Habibi

Le catalogue de démonstration compte 13 modules techniques et 12 modules d’interface. Dans l’administration, le menu principal ouvre une rubrique et les onglets affichent un seul outil à la fois. Les liens directs conservent la rubrique après connexion. Les possibilités de modification dépendent du rôle et de la marque.

## Modules techniques

| Module | Fonction | Où la vérifier |
| --- | --- | --- |
| A01 | Marque, rôles, droits de publication et journal des changements | Équipe et accès, Journal d’audit |
| A02 | Compte joueur, vérification du courriel, récupération, suspension et pauses chronométrées | Mon compte, Joueurs |
| A03 | Révisions du catalogue et du contenu, publication et archivage. Aperçu par fiche et historique des imports fournisseurs | Catalogue de jeux, Contenu du site |
| A04 | Sélection de fiches vedettes et découverte distincte par visite | Hall, section À venir |
| A05 | Favoris synchronisés et historique daté des ajouts et retraits | Favoris, Joueurs |
| A06 | Inscription aux quêtes et progression selon les actions réelles | Découverte et récompenses → Quêtes |
| A07 | Attribution, réclamation, stock et reçus des articles cosmétiques | Récompenses, Mon profil |
| A08 | Préférences par sujet et canal, messagerie et suivi des envois | Préférences, Communications |
| A09 | Liens et codes de parrainage, attribution et examen des doublons | Acquisition → Partenaires ou Parrainages à vérifier |
| A10 | Dossiers de soutien, reçus liés et actions des opérateurs | Joueurs, Soutien, Journal d’audit |
| A11 | Rapports par période et marque, exports et rapprochement des reçus | Tableau de bord, Rapports de récompenses, Rapports d’acquisition |
| A12 | Isolation des environnements, sauvegarde SQLite et restauration vérifiée | Scripts de sauvegarde et de vérification, sondes de disponibilité |
| A13 | Registre de crédits entiers, octroi, débit et contrepassation avec reçu | Acquisition → Crédits de test dans l’environnement isolé |

## Modules d’interface

| Module | Fonction | Parcours |
| --- | --- | --- |
| B01 | Hall et compte bilingues adaptés au téléphone | Hall → Mon compte |
| B02 | Fiches à venir, sélection de découverte et favoris privés | Hall → À venir |
| B03 | Fiche publique, recherche par titre ou identifiant, filtres, fiches fournisseurs paginées et lien facultatif vers un jeu de démonstration | Catalogue → fiche |
| B04 | Pages d’aide, bannières, traductions, métadonnées et plan du site | Contenu du site |
| B05 | Offres gratuites, conditions, dates locales et réclamation groupée | Découverte et récompenses → Récompenses |
| B06 | Éditeur de quêtes, étapes et progression sur plusieurs appareils | Quêtes et récompenses |
| B07 | Collections de récompenses, progression, aperçu et équipement des badges, thèmes et cadres | Découverte et récompenses → Mon profil |
| B08 | Messagerie, préférences, campagnes planifiées et historique d’envoi | Communications, Messages |
| B09 | Portail partenaire, lien suivi, code et export de totaux anonymes | Découverte et récompenses → Portail partenaire, pour le compte associé |
| B10 | Publicités bilingues, versions approuvées, échéance, destination et dépenses | Acquisition → Publicités |
| B11 | Listes sur invitation, propositions modérées, sondages et résultats | Listes partagées, Acquisition → Sondages |
| B12 | Activation à 7 jours, retour à 30 jours, coûts et expériences avec groupe témoin | Acquisition → Rapports d’acquisition ou Expériences |

## Phases et essais

| Phase | Couverture | Vérification reproductible |
| --- | --- | --- |
| P0 | Configuration partagée, jeux d’essai, écrans vides et droits | Démarrage sur une base de test, accès selon le rôle et la marque |
| P1 | Catalogue, compte, contenu, administration, rapports et récupération | Publication puis archivage, favoris sur deux appareils et restauration isolée |
| P2 | Pauses, quêtes, récompenses et consentement | Même pause sur deux sessions, stock final unique, reçu et profil, vérification des préférences au moment de livrer |
| P3 | Parrainage, campagnes programmées, portail partenaire, publicités et rapports | Code prioritaire sur le lien, une qualification après deux favoris, six activations sur dix comptes admissibles |
| P4A | Collections privées sur invitation et votes | Acceptation puis révocation, retrait d’un membre, modération et modification d’un vote |
| P4B | Expériences d’acquisition | Affectation stable, groupe témoin, résultats identiques à période et date d’observation identiques |
| P1X | Crédits de démonstration en environnement de test | Octroi de 100, débit de 20, contrepassation, répétition du débit et refus d’un découvert concurrent |

Les tests automatisés se lancent avec `node --test` sous Node.js 24. Le site public attend la publication d’un contenu par un opérateur avant de présenter une publicité ou un sondage. Les communications commerciales exigent un consentement au sujet et au canal concernés. Les rapports d’acquisition conservent la date d’inscription d’un ancien compte lorsqu’elle peut être établie et affichent les données de test dans une portée dédiée.

Pour utiliser A13 dans une instance locale isolée, indiquer un `DATA_DIR` absolu dédié, donner le même chemin à `DEMO_CREDITS_TEST_DATA_DIR` et définir `ENABLE_TEST_CREDITS=1`. Le service doit écouter sur l’interface locale, utiliser une adresse publique locale ou vide et démarrer en développement ou en préproduction. La marque et le joueur doivent être désignés comme données de test. Seul un administrateur de la marque peut écrire dans ce registre. Chaque écriture conserve le motif, le numéro de demande et l’opérateur.

## Vérifications de bout en bout

Les onze parcours ci-dessous relient les 25 modules du catalogue. Les essais utilisent des comptes, du contenu et des messages d’essai. Les parcours dans le navigateur couvrent le français et l’anglais, sur téléphone et sur ordinateur.

| Parcours | Modules concernés | Résultat vérifié |
| --- | --- | --- |
| H01 · Marque et accès | A01, A02, A10, B01 | Deux sessions retrouvent le même compte. La marque, le rôle et le droit de publication déterminent les dossiers et les commandes accessibles. |
| H02 · Publication | A01, A03, A10, B03, B04 | Un éditeur prépare un brouillon, un opérateur autorisé le publie. Fiche, jeu de démonstration associé, guide, liens bilingues et plan du site suivent la version publiée. Une ancienne adresse renvoie à la nouvelle. |
| H03 · Hall et catalogue | A03, A04, B01, B02, B03 | Avec huit fiches admissibles, le hall en retient six distinctes et garde leur ordre au rechargement. Les filtres respectent la langue et la disponibilité. Le hall reste utilisable quand aucune fiche n’est publiée. |
| H04 · Favoris et activité | A05, A06, A10, B02, B03 | Un favori ajouté sur un appareil apparaît sur l’autre et dans le dossier joueur avec la même référence. Répéter l’action conserve la référence. Une fiche archivée quitte les favoris publics. |
| H05 · Administration et rapports | A01, A10, A11, A12 | Le compteur de publications concorde avec la liste détaillée. L’éditeur retrouve ses propres quêtes, publicités et sondages dans le journal. Les dossiers d’un collègue et ceux d’une autre marque gardent leur portée. Le rapport par titre distingue les fiches jouables des jeux de base. Une référence de partie relie son reçu, le dossier joueur et le soutien. L’export conserve les titres du rapport pour les mêmes filtres. |
| H06 · Quêtes et inventaire | A05, A06, A07, A10, A11, B05, B06, B07 | Les neuf modèles de quête donnent neuf reçus distincts sur deux sessions. Une nouvelle réclamation retrouve chaque reçu. Le guide français permet de revenir à sa quête. Le profil conserve la collection de la récompense obtenue et l’article équipé. Le soutien, le rapport et l’export joueur retrouvent le numéro du reçu. |
| H07 · Pauses, consentement et messages | A02, A06, A07, A08, B01, B08 | Une pause s’applique sur les deux appareils. La livraison revérifie le consentement et les heures silencieuses. Un désabonnement général retire les autorisations par sujet. Réactiver un seul sujet laisse les autres désactivés. |
| H08 · Acquisition | A08, A09, A11, B08, B09, B10, B12 | Le code saisi prime sur le lien de parrainage. Le premier favori qualifie une seule fois le joueur. La publicité et le message mènent à une destination publiée dans la langue choisie. Le partenaire retrouve les totaux agrégés dans son export. |
| H09 · Communauté | A02, A03, A05, A06, A10, B11 | Invitation, contribution, modération et révocation se répercutent sur les accès. Un nouveau vote remplace le précédent. Le résultat d’un sondage et la contribution à une liste font progresser la quête correspondante. |
| H10 · Expériences et cohortes | A09, A11, B10, B12 | L’affectation au groupe témoin ou exposé reste stable. Sur dix comptes d’essai arrivés à échéance, six sont activés. Les totaux et le détail concordent à date d’observation identique. |
| H11 · Crédits de test | A01, A02, A10, A11, A12, A13 | En environnement isolé, un octroi de 100, un débit de 20 puis sa contrepassation ramènent le solde à 100. Répéter le débit rend le reçu d’origine. Le registre refuse les écritures sur une instance publique. |

L’essai de restauration redémarre un second service depuis une sauvegarde vérifiée, puis reprend une quête après la lecture du guide. Il retrouve le reçu, le thème équipé, le dossier de soutien, l’envoi en messagerie, la liste partagée, le vote, le parrainage, le groupe expérimental et le registre de test. L’intégrité SQLite et les clés étrangères sont vérifiées après la reprise.
