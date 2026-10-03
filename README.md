# GALI BLUE

Version locale du site du restaurant-bar a Casablanca. Next.js 16, React 19,
TypeScript, MySQL/MariaDB, Prisma, Motion, Radix UI, React DayPicker et Lucide. Palette blanc / #01258F.

Deploiement Railway : [guide et variables](deployment/RAILWAY.md).
Base de donnees : [schema SQL](database/schema.sql) et [instructions](database/README.md).
Le Dockerfile initialise les migrations et lance l'application sur le PORT fourni par Railway.

## Demarrage local

Node.js 24 et MySQL/MariaDB doivent fonctionner. Depuis ce dossier :

```powershell
npm.cmd install
npm.cmd run dev -- --hostname 127.0.0.1
```

- Vitrine : http://localhost:3000
- Reservation : http://localhost:3000/reserver
- Premier compte et connexion : http://localhost:3000/connexion
- Dashboard : http://localhost:3000/dashboard

Le premier administrateur choisit lui-meme son mot de passe sur la page de connexion.
Il n'existe aucun mot de passe par defaut. L'initialisation est limitee au mode local,
avec LOCAL_SETUP_ENABLED=true et aucun compte existant. Les tests suppriment leurs
comptes temporaires et ne creent pas de compte permanent.

Pour le compte de test local demande, executer `npm.cmd run admin:local`.
Identifiant : `admin@gali-blue.local`, mot de passe : `admin`.
Ce script refuse les bases distantes et la production. Le compte est conserve uniquement
dans la base locale ; ni le compte ni son hash ne sont exportes sur GitHub ou Railway.
Sur Railway, une base sans compte de connexion recoit un administrateur initial de recette
`admin@gali-blue.test`, avec un mot de passe aleatoire remis separement au proprietaire.
Seul son hash bcrypt est versionne. Changer ce mot de passe apres la premiere connexion.
ADMIN_EMAIL et ADMIN_PASSWORD (16 caracteres minimum) permettent de choisir un autre
acces initial. Aucun compte existant n'est reinitialise. La connexion refuse les mots de passe courts en production.

La base dediee `gali_blue` a ete initialisee sur MariaDB 10.4, port 3306.
Le compte MySQL root sans mot de passe est strictement une configuration locale.
Les secrets sont dans .env, ignore par Git. Ne jamais les partager.

Pour une autre machine, renseigner .env a partir de .env.example, puis executer :

```powershell
npm.cmd run db:init
npm.cmd run db:migrate
npm.cmd run db:seed
```

Si le port change, adapter aussi APP_ORIGIN dans .env et redemarrer le serveur.
L'origine doit correspondre exactement a celle du navigateur (localhost ou 127.0.0.1).

## Fonctionnalites disponibles

- Entree photographique visible dans le HTML initial avant l'hydratation, image prechargee puis apparition du nom et sortie en rideau apres environ 2,8 secondes. Passer ou Echap donnent un acces immediat ; aucune entree bloquante sans JavaScript ou en mode mouvements reduits.
- Typographie Bodoni Moda / DM Sans, boutons arrondis, survols discrets, parallaxe legere et compositions editoriales adaptees au mobile.
- Scene photographique L'heure bleue : un a trois evenements, rideau bleu, mouvement lent et onglets au clavier. Arret automatique hors ecran, au survol/focus et en arriere-plan ; pas de lecture automatique en mouvements reduits. Photos issues des evenements, sans bouton de pause.
- Menu La maison et selecteur de convives Radix UI accessibles au clavier. Aucun lien personnel sur la vitrine ; connexion obligatoire pour le dashboard.
- Calendrier de reservation francais React DayPicker dans un panneau Radix, avec dates passees et dates au-dela de la limite desactivees.
- Carte filtree par categorie, galerie plein ecran, evenements publies et informations legales.
- Reservation en deux etapes, disponibilite reelle par table/service, consentement et reference unique.
- Paiement au restaurant, suivi telephonique, validation provisoire, arrivee, depart, absence et annulation.
- Controle transactionnel des conflits de tables ; regroupement uniquement entre tables compatibles du meme espace.
- Dashboard avec filtres, suivi des appels, affectation de tables et de personnel, encaissement sur place et historique.
- Gestion des tables, places, espaces, groupes de tables, services, fermetures globales et delai de grace.
- Fiches personnel, roles, activation, mot de passe facultatif, planning sous forme de note et affectation par reservation.
- Carte, evenements, mediatheque image/video, brouillons, apercu prive et publication des textes.
- Logo partage administrable (en-tete, pied de page, introduction, reservation, connexion et dashboard), avec variante claire facultative et nom de remplacement.
- Signature Developpe par Gripo et coeur bleu ; menu mobile du dashboard avec fermeture, Echap et gestion du focus.
- Reglage du pourcentage de reduction exclusivement pour le paiement en ligne.
- Sessions chiffrees, cookies HttpOnly, controle d'origine, autorisations serveur, validation Zod, limitation des tentatives.
- Dates de Casablanca avec la meme base IANA embarquee cote navigateur et serveur.

## Cycle de reservation

Paiement sur place : CALL_PENDING -> PROVISIONAL -> ARRIVED -> COMPLETED.
La validation en PROVISIONAL enregistre la confirmation telephonique et affecte les tables.
CALL_PENDING ne bloque pas de table. Une reservation provisoire, reservee ou en cours
occupe les tables pendant son intervalle ; le depart ajoute le temps de preparation.
CANCELLED libere la capacite. NO_SHOW n'est autorise qu'apres le delai de grace.
Les dates, places et durees sont verifiees cote serveur, pas seulement dans le formulaire.

Statuts de reservation, de paiement et d'appel sont independants. Un encaissement
sur place ne peut etre enregistre que par ADMIN, MANAGER ou CASHIER, apres l'arrivee,
et jamais deux fois. Une annulation payee demande un traitement de remboursement distinct.

## CMI : volontairement desactive

Cette version n'encaisse PAS de paiement CMI, reel ou simule. Le bouton d'activation
est verrouille dans le dashboard et le serveur refuse les reservations ONLINE.
La route /api/cmi retourne 503. Les champs financiers et statuts futurs sont prepares,
mais l'adaptateur de paiement n'est pas implemente.

Avant activation : obtenir le contrat et la documentation officiels, definir le montant
(acompte ou formule), implementer la page hebergee, la signature des notifications,
l'idempotence, l'expiration des blocages, le rapprochement des paiements tardifs,
les remboursements et tester dans l'environnement du prestataire.
Ne pas remplacer simplement cmiReady par true : le parcours ONLINE reste a developper.
Aucun lien de paiement differe n'est prevu : le client paiera pendant sa reservation.

## Medias et demonstration

Les images initiales proviennent d'Unsplash. Elles illustrent une maquette et ne representent
pas GALI BLUE. La carte, les prix et la salle sont des exemples. Remplacer ces contenus,
les coordonnees et les conditions avant toute publication.

L'espace **L'heure bleue** conserve son animation photographique et se trouve juste apres
le bandeau des trois phrases sur l'accueil. Il est desormais consacre aux evenements.
Il affiche les trois premiers evenements publies a venir, tries par **Ordre d'affichage**
(petit numero en premier), puis date et identifiant. Cet ordre est modifiable dans le
dashboard **Evenements**. Les brouillons et evenements passes ne s'affichent pas ;
sans evenement admissible, l'espace est masque. Un seul evenement n'affiche pas d'onglets.
Le rideau bleu, le mouvement photographique et le defilement de 6,5 secondes sont conserves,
sans 3D. La lecture s'arrete hors ecran, au survol, au focus, dans un onglet masque et avec
les mouvements reduits. Un evenement unique garde le mouvement photo, sans bouton de pause.
L'ancien bloc evenements separe est supprime.

La **presentation de la cheffe** vient ensuite, puis la carte. Dans **Contenus du site**,
modifier le nom, le surtitre, le titre, la presentation, le petit mot, la photo et sa legende,
ainsi que le titre de l'espace evenements. Enregistrer le brouillon, consulter l'apercu,
puis publier. **Salma Benali** et son petit mot sont un exemple fictif, pas l'identite
de la personne photographiee ni une biographie reelle. La photo montre une cuisiniere
au travail et porte une legende d'illustration. Remplacer nom, photo et texte avant
publication des informations reelles du restaurant.
La migration `20261003160000_chef_presentation` remplace uniquement les anciens textes
de demonstration, y compris dans un brouillon, sans ecraser les textes personnalises
ni modifier les images existantes.
La migration suivante `20261003170000_chef_identity` ajoute le nom d'exemple et remplace
uniquement l'ancienne photo et les textes de demonstration encore presents.

Le bandeau avant **L'heure bleue** fait defiler les trois phrases en continu avec des
verres bleus animes. Les champs **Bandeau : phrase 1/2/3** dans **Contenus du site**
acceptent jusqu'a 160 caracteres chacun. Aucun bouton de pause n'est affiche ;
les mouvements reduits affichent les trois phrases sans animation ni copie supplementaire.

Trois **evenements d'exemple** sont publies aux positions 0, 1 et 2 avec des photos
generiques. Leur titre et description indiquent leur caractere fictif. Les dates
a +14/+21/+28 jours et 21:30 sont indicatives, pas des annonces confirmees.
La migration `20261003190000_publish_event_examples` publie les trois fiches existantes
et place l'ancien Blue Sessions en position 3, sans le supprimer. Les identifiants
historiques des fiches sont conserves. Aucune photo d'Oussamabk ou issue d'Instagram
n'est conservee. Les trois images et la photo de la
cheffe sont aussi disponibles dans la mediatheque, hors galerie publique. Les seeds
suivants ne remplacent pas les modifications de ces fiches.

Sources des photos d'illustration (Unsplash) :
- Cheffe : https://images.unsplash.com/photo-1594394206930-67339d922f8e
- Scene live : https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f
- Concert : https://images.unsplash.com/photo-1514525253161-7a46d19cd819
- Microphone : https://images.unsplash.com/photo-1516280440614-37939bbacd81

La migration `20261003145000_event_position` ajoute l'ordre aux evenements existants.
Le seed ajoute une seule fois **Blue Sessions**, exemple fictif publie, 14 jours apres
sa premiere creation a 21:30 (Casablanca). Il ne remplace ni sa date, ni sa publication,
ni les modifications du dashboard aux executions suivantes. Remplacer cet exemple
par un evenement reel avant ouverture au public. Le demarrage Railway applique la
migration et le seed automatiquement.

Les medias importes sont dans storage/uploads, hors du code
et des deploiements. JPEG/PNG/WebP : 8 Mo ; MP4 : 30 Mo. SVG et HTML refuses.
La route de lecture prend en charge les plages d'octets pour les videos.
Sauvegarder la base ET ce dossier. L'hebergement doit proposer un volume persistant
ou remplacer ce stockage par un service objet avant mise en production.

## Verification

Pour modifier le logo : importer une image JPEG, PNG ou WebP dans **Photos & videos**,
puis choisir **Logo principal** dans **Contenus du site**. Le **Logo clair** est facultatif
pour l'introduction photographique. Enregistrer le brouillon, consulter l'apercu et publier.
Le logo du dashboard reste dans l'administration ; **Voir le site** ouvre la vitrine.
Choisir **Aucun fichier** pour revenir au nom et a la signature. Aucune migration SQL requise.

```powershell
npm.cmd run check
npm.cmd run test:ui
npm.cmd run test:design
npm.cmd run test:navigation
npm.cmd run test:responsive
npm.cmd run test:experience
npm.cmd run test:events
```

`check` valide Prisma, les regles metier, la concurrence MySQL, ESLint, TypeScript
et le build de production. Les tests MySQL utilisent la salle de demonstration
et des demandes temporaires a une date future. Ne pas executer ces tests sur une base de production.

`test:ui` requiert le serveur local et Microsoft Edge. Il teste ordinateur/mobile,
carte, galerie, reservation, connexion, validation provisoire, reglages, brouillons,
protection d'origine et acces anonyme. Captures dans storage/checks. Utiliser uniquement
une base locale de test ; le test restaure les reglages qu'il modifie.

`test:design` requiert egalement le serveur local et Microsoft Edge. Il verifie
l'entree automatique, Passer/Echap, le defilement, les menus au clavier et sur mobile,
le mode mouvements reduits, cinq formats d'ecran et l'absence de liens personnels.
Il ne modifie pas la base. Captures de l'entree et du nouveau design dans storage/checks.

`test:navigation` cible les liens publics sur ordinateur/mobile : carte en haut,
ancres, logos, historique, galerie, filtres et repetition de l'entree uniquement au clic-logo.
Il releve les erreurs du navigateur sans creer de reservation ni modifier la base.
Les liens vers une nouvelle page repartent en haut ; les ancres rejoignent leur section.
Precedent/Suivant conservent la restauration du navigateur. L'introduction joue au premier
chargement direct de l'accueil sans ancre et lors d'un clic sur un logo public. Les autres
liens et les ancres ne la rejouent pas. Le logo du dashboard reste dans le dashboard.
Le mode mouvements reduits conserve un acces immediat, meme au clic-logo.

`test:experience` verifie le logo de connexion, les evenements de L'heure bleue en cinq formats,
la lecture et la reprise automatiques, le clavier, le chargement des images, l'absence de
chevauchement et le mode mouvements reduits. Il ne modifie pas la base.

`test:events` cible les cas 0/1/2/3+ evenements, le tri MySQL, le filtre publie/a venir,
l'ordre enregistre depuis le dashboard, les autorisations, les onglets, les details,
les textes longs, cinq formats, les mouvements reduits et l'edition de la cheffe
(nom, petit mot, brouillon, apercu, publication, photo), ainsi que la boucle continue
du bandeau, l'absence de boutons pause, ses icones et ses trois phrases editables. Il refuse une base distante
ou la production, masque temporairement les evenements existants, puis restaure leur
publication et les contenus, puis supprime ses donnees temporaires. Executer sans autre
test modifiant la base.

`test:responsive` parcourt les cinq pages publiques et les dix vues du dashboard en
320, 390, 768, 844 (paysage), 1024 et 1440 pixels. Il verifie les formulaires, le logo,
l'import au clavier, le brouillon, la publication et la validation serveur. Il refuse
les bases distantes et la production, puis restaure les contenus et supprime ses fichiers
et comptes temporaires. Les tableaux larges defilent dans leur propre conteneur.

L'override deepmerge-ts >=8 corrige une alerte transitive de Prisma CLI. Le schema,
les tests et le build doivent etre revalides lors d'une mise a jour de Prisma.

## Avant mise en production

Cette premiere version locale n'est pas un logiciel de caisse certifie ni un systeme RH.
Le planning du personnel est une note, pas un module de paie/pointage.
Les fermetures sont globales ; les indisponibilites temporaires par table et la modification
de date/convives d'une reservation existante restent a ajouter. Les arrivees sans reservation
immediate devront disposer d'un parcours dedie. L'historique affiche les 500 derniers dossiers.

- Finaliser CMI et les conditions commerciales ; aucune promesse de paiement avant cela.
- Mettre en place MFA, recuperation de compte et politique de mots de passe du personnel.
- Utiliser HTTPS, un compte SQL a privileges limites, des secrets propres a la production et des sauvegardes restaurees en test.
- Ajouter une politique CSP avec nonces, supprimer unsafe-eval en production et configurer un proxy avec limites de requetes.
- Automatiser les taches d'expiration, la retention des donnees, les notifications et la supervision.
- Verifier la loi 09-08/CNDP, les transferts de donnees, les textes legaux et les droits des medias.
- Adapter le chargement/pagination des dossiers au volume reel et completer les tests d'accessibilite.
- Desactiver LOCAL_SETUP_ENABLED, conserver l'administration privee et lever le noindex seulement apres recette.
