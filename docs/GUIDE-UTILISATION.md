# GALI BLUE - Site et exploitation

Guide de recette locale. Casablanca ; heures Africa/Casablanca. Le plan et les
capacites sont indicatifs, a valider avec la salle reelle. Les photos, la cheffe,
la carte et les evenements sont des demonstrations, pas des annonces definitives.

## Acces personnels

Six comptes de recette sont crees une seule fois : developpeur ADMIN, MANAGER,
HOST (accueil), SERVICE, CASHIER (caisse), EDITOR (communication). Les emails
`.test` sont des identifiants de recette, pas des boites mail utilisables.
Le proprietaire recoit les mots de passe initiaux separement dans un fichier
prive hors du depot. Aucun mot de passe ne figure dans ce guide ou la presentation.

1. Ouvrir `/connexion`, saisir son acces personnel.
2. Au premier acces, `/compte` impose le renouvellement du mot de passe initial.
3. Saisir le mot de passe actuel puis deux fois un nouveau mot de passe de
   12 caracteres minimum, distinct de l'ancien (limite bcrypt : 72 octets).
4. Le dashboard devient accessible. Les autres sessions de ce compte sont invalidees.
5. Le bouton **Mon compte** permet les changements suivants ; se deconnecter sur
   un poste partage. Ne pas partager le compte developpeur avec l'equipe.

Un administrateur peut modifier les identifiants, roles, activation et mots de
passe dans **Personnel**. Un mot de passe reinitialise par l'administrateur impose
de nouveau le premier acces. Les modifications de personnel invalident les
anciennes sessions ; un compte desactive ne peut plus se connecter. Pas de
recuperation automatique par email ni de double authentification implementees.

Les comptes deja presents, notamment votre administrateur, sont conserves.
Un redeploiement ne remplace ni les mots de passe modifies ni les profils et ne
reactive pas les comptes desactives. Remplacer les identites de recette par celles
des personnes reelles avant exploitation et desactiver les comptes inutilises.

## Matrice Des Roles

| Fonction | ADMIN developpeur | MANAGER | HOST accueil | SERVICE | CASHIER caisse | EDITOR |
|---|---|---|---|---|---|---|
| Demandes et appels | Oui | Oui | Oui | Non | Non | Non |
| Confirmation, annulation, absence | Oui | Oui | Oui | Non | Non | Non |
| Affectation tables / personnel | Oui | Oui | Oui | Non | Non | Non |
| Arrivee et depart | Oui | Oui | Oui | Seulement ses dossiers affectes | Non | Non |
| Encaissement sur place | Oui | Oui | Non | Non | Oui | Non |
| Modifier la salle et les parametres | Oui | Oui | Non | Non | Non | Non |
| Fiches et planning personnel | Oui | Oui, hors ADMIN | Non | Non | Non | Non |
| Creer un acces, changer role/email/activation/mot de passe | Oui | Non | Non | Non | Non | Non |
| Carte, evenements, medias, brouillons, publication | Oui | Oui | Non | Non | Non | Oui |
| Audit global | Oui | Oui | Non | Non | Non | Non |
| Changer son mot de passe | Oui | Oui | Oui | Oui | Oui | Oui |

Le manager peut ajouter une fiche SERVICE sans compte de connexion et modifier
les informations professionnelles/planning des membres non ADMIN. Il ne peut
pas intervenir sur le profil du developpeur. Les protections existent dans les API,
pas seulement dans les menus. L'administrateur ne peut ni retirer son propre acces
ni retirer le dernier administrateur actif disposant d'un mot de passe.

Le SERVICE recoit uniquement ses reservations affectees. La caisse recoit seulement
les dossiers ARRIVED/COMPLETED, sans telephone, email ni notes client ; seuls les
audits d'encaissement lui sont transmis. EDITOR ne recoit aucune reservation,
table ou fiche personnel. Les brouillons ne sont pas transmis aux roles operationnels.

## Parcours Publics

- Accueil : entree photographique, logo, bandeau, evenements a venir, presentation
  de la cheffe, carte, galerie, contact et pages legales. Les logos publics rejouent
  l'entree ; celui du dashboard reste dans l'administration. Aucun lien personnel
  n'est visible sur le site public.
- Carte : parcourir les categories, consulter description, prix et allergenes.
- Galerie : ouvrir et fermer les images en plein ecran, naviguer au clavier/mobile.
- Evenements : seuls les fiches publiees et futures sont visibles, dans l'ordre
  configure ; au maximum trois dans L'heure bleue. Les exemples restent a remplacer.
- Reservation classique : date, convives et categorie Standard/VIP, puis service,
  coordonnees et consentement. Les tables compatibles seront affectees a l'appel.
- Plan 2D : date, convives, service et filtre Standard/VIP ; choisir une table verte
  ou bleue disponible, ouvrir le popup puis le formulaire pre-rempli. Une table
  occupee, trop petite ou inactive ne permet pas la reservation. Une liste complete
  constitue une alternative au plan defilant horizontalement sur mobile.

Le plan de demonstration comprend T01 a T37 et BAR : **38 unites, dont 9 VIP**.
BAR represente une reservation collective indicative du comptoir, pas dix sieges
independants. Les deux parcours sont actifs ; les reglages sont independants,
mais le serveur impose de conserver au moins un parcours. Capacites, regroupements,
classification VIP et emplacements doivent etre confirmes avec le restaurant.
Aucun supplement ni tarif VIP n'a ete invente.

## Cycle Par Appel

| Etape | Etat enregistre | Action / effet |
|---|---|---|
| Formulaire ou demande saisie par l'accueil | CALL_PENDING / TO_CALL | Reference unique ; aucune table bloquee ; aucun paiement |
| Appel sans reponse | CALL_PENDING / NO_ANSWER | Tentative et heure tracees ; prochain rappel avant le service |
| Client confirme par telephone | RESERVED / CONFIRMED | Recontrole atomique des places ; affectation et blocage des tables |
| Client annule | CANCELLED / CANCEL_REQUESTED | Dossier ferme ; capacite liberee |
| Clients presents | ARRIVED | Installation dans la fenetre autorisee, jusqu'a 60 min avant le service |
| Encaissement au restaurant | Paiement PAID, reservation inchangee | ADMIN/MANAGER/CASHIER ; apres arrivee, montant positif ; une seule fois |
| Clients partis | COMPLETED | Temps de preparation applique avant reutilisation de la table |
| Clients absents apres delai de grace | NO_SHOW | Dossier ferme et table liberee |

**Confirmer par telephone** realise la confirmation et l'affectation dans la meme
transaction. Plusieurs demandes en attente peuvent viser la derniere table : seule
la premiere confirmation compatible peut reussir. La disponibilite du formulaire
n'est pas une garantie tant que l'equipe n'a pas confirme.

Sur le plan, la table souhaitee doit etre exactement disponible a la confirmation ;
pas de substitution silencieuse. En classique, l'allocation reste dans la categorie
choisie ; les regroupements exigent meme espace et groupe compatible. Une
affectation manuelle ne transforme pas une demande Standard en VIP.

Le dossier montre la table souhaitee, la categorie, les tentatives, le dernier appel,
le prochain rappel, les affectations, le paiement et l'historique. La file des appels
trie les rappels et ne conserve que les demandes encore en attente. Les dossiers
terminaux ne sont pas reouverts. Une nouvelle date/categorie/table souhaitee
requiert une annulation et une nouvelle demande ; aucune fonction de report
automatique ou de notification SMS/email n'est implementee.

Les anciens statuts PROVISIONAL/PAYMENT_PENDING/EXPIRED restent lisibles pour les
donnees historiques ; ils ne constituent pas le nouveau parcours sur place.

## Administration Courante

1. **Salle & tables** : capacite, espace, groupe, actif, VIP, position sur image.
   Une table ayant un dossier futur affecte doit etre reaffectee avant reduction de
   capacite, changement de categorie/espace/groupe ou desactivation.
2. **Personnel** : profils, fonctions, planning sous forme de note, affectations,
   et pour ADMIN seulement comptes/roles/acces. Pas de planning horaire automatise.
3. **Carte** : produits, categories, prix en MAD, allergenes, ordre, visibilite, photo.
4. **Evenements** : date/heure, ordre, description, photo et publication.
5. **Photos & videos** : JPEG/PNG/WebP jusqu'a 8 Mo ; MP4 jusqu'a 30 Mo. Pas de SVG/HTML.
   Choisir les medias pour les contenus ; activer explicitement leur presence en galerie.
6. **Contenus du site** : textes, cheffe, bandeau, contact, logos ; enregistrer un
   brouillon, consulter l'apercu prive, puis publier. Le brouillon seul ne change pas le public.
7. **Parametres** : parcours, plan, convives max, services, jours fermes, duree,
   nettoyage et grace. Sauvegarder base et `storage/uploads` sur volume persistant.
8. **Historique** : audit global pour direction/developpeur, audit du dossier pour suivi.

## Paiement Et Limites

CMI reste **desactive**, sans encaissement reel ou simulation. Contrat, integration,
notifications signees, rapprochement et recette prestataire restent necessaires.
La reduction configuree concerne uniquement un futur paiement en ligne, jamais
le paiement au restaurant. La saisie d'encaissement est un suivi manuel, pas un terminal
bancaire. Une annulation deja payee necessite un traitement de remboursement distinct.

Pas de mails/SMS automatiques, recuperation de mot de passe, 2FA, report automatique
ni tarif VIP. Les controles ont ete realises localement ; ils ne certifient pas la
base ou le deploiement Railway en production. Les acces initiaux seront crees au
prochain demarrage de l'image deployee, pas par une connexion distante a la base.

## Recette Et Livrables

26 scenarios multi-clients verifient les deux parcours : donnees invalides, fermeture,
capacite, idempotence, categories, conflits, rappel, confirmation, arrivee, absence,
annulation, encaissement et nettoyage. La recette du plan couvre 38/9, cinq formats
(320/390/768/1024/1440), deux clients tactiles et les tables indisponibles.
39 controles d'acces couvrent les six roles, premier renouvellement mobile,
origines externes, sessions anciennes et comptes desactives. La recette generale
parcourt cinq pages publiques et dix vues dashboard sur six formats d'ecran.

- Presentation : `GALI-BLUE-presentation.pdf` et `GALI-BLUE-presentation.pptx`.
- Source et regeneration : `npm run docs:generate`, avec rapports dans `storage/checks`.
- Recettes : `npm test`, `npm run test:accounts`, `npm run test:floor`,
  `npm run test:ui`, `npm run test:responsive`. Les recettes avec base sont locales
  uniquement, sequentielles et nettoient leurs donnees temporaires.