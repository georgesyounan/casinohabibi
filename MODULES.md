# Modules de Casino Habibi

Le catalogue de démonstration compte 13 modules techniques et 12 modules d’interface. Dans l’administration, le menu principal ouvre une rubrique et les onglets affichent un seul outil à la fois. Les liens directs conservent la rubrique après connexion. Les possibilités de modification dépendent du rôle et de la marque.

## Modules techniques

| Module | Fonction | Où la vérifier |
| --- | --- | --- |
| A01 | Marque, rôles, droits de publication et journal des changements | Équipe et accès, Journal d’audit |
| A02 | Compte joueur, vérification du courriel, récupération, suspension et pauses chronométrées | Mon compte, Joueurs |
| A03 | Révisions du catalogue et du contenu, publication et archivage | Catalogue de jeux, Contenu du site |
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
| B03 | Fiche publique, recherche et filtres du catalogue | Catalogue → fiche |
| B04 | Pages d’aide, bannières, traductions, métadonnées et plan du site | Contenu du site |
| B05 | Offres gratuites, conditions, dates locales et réclamation groupée | Découverte et récompenses → Récompenses |
| B06 | Éditeur de quêtes, étapes et progression sur plusieurs appareils | Quêtes et récompenses |
| B07 | Badges, thèmes et cadres à équiper | Découverte et récompenses → Mon profil |
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
