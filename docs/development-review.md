# Revue de développement de Casino Habibi

Mise à jour du 23 novembre 2026. Le cahier comprend 88 tickets et 28 modules. Les quatre derniers critères du socle ont été exercés sur une instance isolée. Les 24 tickets du socle passent leur scénario en démo.

[Ouvrir les 88 tickets, leurs critères, les fichiers de preuve et les écarts](development-backlog.csv) · [Ouvrir les 174 références et leurs types de preuve](source-traceability.csv)

« Validé en démo » indique un scénario exercé avec des comptes et ressources de test. « Partiel » indique un parcours dont certains critères restent ouverts. « Non livré » désigne une fonction restant à réaliser. La colonne Classification du CSV conserve le périmètre initial de chaque ticket.

## Prise en main

Dans **Administration → Espace opérateur**, ouvrir **Produits → Casino en direct**. Activer le produit, ouvrir **Atlas Studio** et activer son connecteur fictif. Une simulation de panne conserve son motif et sa version. Une fois la connexion disponible, lancer la démo et ouvrir sa chronologie. Cedar permet de vérifier le cas d’un fournisseur sans relecture.

Dans **Catalogue de jeux → Import du catalogue**, préparer et synchroniser le catalogue fictif. Les fiches actives sont proposées par Atlas. Dans **Espace opérateur → Sélections planifiées**, créer la sélection, régler le fuseau et les dates, épingler ou masquer des fiches, vérifier l’aperçu et publier. Le site lit `GET /api/v1/lobby`. Les clients de test autorisés lisent `GET /api/partner/v1/lobby?environment=sandbox` avec une clé de la marque.

Dans **Catalogue de services**, rechercher « traduction », choisir les langues et l’agent, puis envoyer la demande. **Mes commandes** conserve les échanges, un fichier `.txt` facultatif, les devis en TST, la livraison et la clôture. Le demandeur et l’agent désigné ont accès au dossier.

Dans **Scénarios financiers**, un administrateur peut démarrer V05, V06 ou V07 et avancer étape par étape. Chaque essai a son propre compte fictif, ses reçus, ses lignes de journal et ses clôtures. Les soldes sont calculés en centièmes de TST. Les démos fournisseur, les comptes joueurs, les crédits de test historiques et ces comptes fictifs utilisent des registres distincts.

Dans **Vérifications et caisse → Dossiers fictifs**, créer un dossier pour le marché Nord ou Sud. Ajouter les spécimens demandés, soumettre la vérification et enregistrer la décision. L’onglet **Risques** permet d’attribuer une enquête ou de bloquer un retrait. Une politique peut exiger un deuxième réviseur pour lever le blocage.

Dans **Caisse de test**, choisir le dossier, le montant et le moyen admissible. Un retour du navigateur laisse le dépôt en attente. Une confirmation crédite le portefeuille. Un retrait réservé peut être transmis puis rester en attente jusqu’à la réponse définitive du simulateur. **Politiques et moyens de paiement** permet de modifier les règles du marché et les moyens fictifs.

## Couverture par module

| Module | Fonction | Validés en démo | Partiels | Non livrés |
| --- | --- | ---: | ---: | ---: |
| D01 | Marques, équipe et audit | 2 | 1 | 0 |
| D02 | Comptes et soutien joueur | 3 | 0 | 0 |
| D03 | Produits et activation | 2 | 1 | 0 |
| D04 | Mise en service et reprise | 2 | 1 | 0 |
| D05 | Éditeur et traductions | 2 | 0 | 1 |
| D06 | Catalogue fournisseur | 2 | 2 | 0 |
| D07 | Sélections du hall | 1 | 2 | 0 |
| D08 | Découverte et favoris | 3 | 1 | 0 |
| D09 | Segments et communications | 2 | 0 | 1 |
| D10 | Affiliation | 2 | 0 | 1 |
| D11 | Offres et bonus | 1 | 1 | 1 |
| D12 | Fidélité et récompenses | 2 | 3 | 0 |
| D13 | Rapports et indicateurs | 3 | 1 | 0 |
| D14 | Vérification d’identité | 3 | 0 | 0 |
| D15 | Risque et enquêtes | 3 | 0 | 0 |
| D16 | Jeu responsable | 2 | 1 | 0 |
| D17 | Portefeuille et journal | 1 | 1 | 1 |
| D18 | Caisse et retraits | 3 | 0 | 0 |
| D19 | Lancements et événements de jeu | 1 | 2 | 0 |
| D20 | Manches et relectures | 1 | 2 | 0 |
| D21 | Rapprochement et clôture | 0 | 3 | 0 |
| D22 | Services aux opérateurs | 3 | 0 | 0 |
| D23 | Paris sportifs | 0 | 1 | 2 |
| D24 | Caisse crypto | 0 | 0 | 3 |
| D25 | Canal Telegram | 0 | 2 | 1 |
| D26 | Jeux à prix | 0 | 1 | 2 |
| D27 | API partenaires | 0 | 2 | 1 |
| D28 | Crédits de test | 2 | 0 | 0 |
| **Total** | **88 tickets** | 46 | 28 | 14 |

## Couverture par phase

| Phase | Tickets | Validés en démo | Partiels | Non livrés |
| --- | ---: | ---: | ---: | ---: |
| P0 | 2 | 2 | 0 | 0 |
| P1 | 10 | 10 | 0 | 0 |
| P2 | 8 | 8 | 0 | 0 |
| P3 | 4 | 4 | 0 | 0 |
| P4A | 1 | 1 | 0 | 0 |
| P4B | 1 | 1 | 0 | 0 |
| P1X | 2 | 2 | 0 | 0 |
| E1 | 23 | 12 | 10 | 1 |
| E2 | 22 | 5 | 12 | 5 |
| E3 | 15 | 1 | 6 | 8 |

## Parcours d’acceptation

Les tests d’intégration utilisent le serveur Node, les droits HTTP ordinaires et une base SQLite isolée. Les scénarios V04–V08 utilisent des fournisseurs et montants fictifs. Les intitulés des tests de référence figurent dans `test/sandbox.test.js`.

| Parcours | Observations et périmètre |
| --- | --- |
| V01 · Publication | Neon Orchard passe du brouillon au sixième emplacement, puis le total public revient à cinq. Deux sessions ajoutent le même favori. Le reçu et la publication restent consultables après archivage. |
| V02 · Quête et pause | Les tests de quête, de dernier article cosmétique et de suppression à l’envoi couvrent les critères dans des essais complémentaires. |
| V03 · Acquisition | Les tests de liens, codes, qualifications uniques et exports reprennent la même cohorte à date fixe et contrôlent le périmètre du partenaire. |
| V04 · Fournisseur et hall | Deux imports gardent les mêmes identités. Le test épingle une fiche en deuxième position, en exclut une autre et compare les réponses aux bornes et par marché. Un titre retiré ne peut plus ouvrir de session. Le lecteur partenaire a un test de rotation distinct. |
| V05 · Dépôt à clôture | Dépôt de 100,00 TST, mise de 10,00, gain de 6,00 et retrait de 20,00. Solde de 76,00, caisse nette de 80,00, GGR de 4,00. Quatre lignes externes rapprochées après double import. Chaque écriture a deux lignes équilibrées. |
| V06 · Limite concurrente | Deux requêtes indépendantes de 8,00 TST se disputent une limite de 10,00. Une seule est acceptée. Une nouvelle mise est refusée pendant la pause. Le gain tardif règle la manche acceptée une fois. |
| V07 · Retrait incertain | La réservation de 20,00 TST reste en place durant le délai dépassé. Une confirmation capture le montant. Le relevé reçu après clôture résout l’écart. Les deux versions de clôture restent consultables. La caisse par dossier vérifie également le refus définitif et la libération de la réserve. |
| V08 · Services | La branche exercée est la traduction. Deux devis sont conservés. Seule la dernière version peut être acceptée. La réémission renvoie la même référence de facture fictive. Les autres verticales E3 sont recensées séparément. |

## Décisions qui conditionnent la suite

| Décision du dossier | État de développement |
| --- | --- |
| Q01 · Marque pilote, marché et modèle | Le site existant reste une démonstration. Le marché d’une sélection éditoriale ne configure aucune autorisation financière. |
| Q02 · Fournisseurs et contrats | Atlas et Cedar sont locaux. Les procédures des fournisseurs, identifiants de test et fichiers de règlement restent à choisir pour l’intégration externe. |
| Q03 · Autorité du portefeuille | Le pilote fonctionne en TST, à deux décimales. Contrats de change, pouvoirs de paiement et politique de correction restent ouverts. |
| Q04 · Vérification et protection | Pauses et limite concurrente sont couvertes en démo. Les marchés fictifs disposent de politiques versionnées, de contrôles de retrait et d’une levée à deux réviseurs en option. Le choix des règles réelles, du prestataire et de la durée de conservation reste ouvert. |
| Q05 · Conditions commerciales | Récompenses cosmétiques actuelles et devis de service fictifs disponibles. Conditions d’un bonus financé et commissions restent ouvertes. |
| Q06 · Classement du hall | La sélection utilise la priorité décroissante, des dates à fin exclusive et un ordre stable. Le libellé anglais sert de repli dans cette nouvelle sélection. L’éditeur de site conserve ses propres locales. |
| Q07 · Libellés de fournisseurs | Les 24 entrées « Label only » du registre source demandent une validation avant de leur attribuer un comportement propriétaire. |
| Q08 · Verticales optionnelles | Le devis de service sert de branche de démonstration. Paris sportifs, crypto, Telegram et jeux à prix attendent le choix du produit. |
| Q09 · Preuves et responsabilités | Chaque ticket garde son identifiant, son critère et ses fichiers associés. Les responsables suggérés du cahier restent à confirmer par le projet. |

Le rapprochement initial A01–A13 et B01–B12 couvre les 25 modules antérieurs. Le registre des références contient des captures, descriptions, documents produit et déclarations promotionnelles. Chaque entrée conserve sa qualification d’origine.
