# Deploiement Railway

Le depot GitHub contient le code, le schema, les contenus de demonstration et le hash
bcrypt de l'acces initial de recette. Aucun mot de passe en clair n'y figure.
Le fichier github, les tokens, .env, les comptes locaux et les reservations ne sont pas publies.

## Configuration

1. Creer un projet Railway et ajouter un service MySQL.
2. Ajouter un service depuis le depot GitHub et autoriser Railway a lire ce depot.
3. Garder la racine du depot comme Root Directory : le dossier gali-blue est deja la racine du depot. Railway detecte le Dockerfile.
4. Generer un domaine dans Settings > Networking. Ajouter les variables ci-dessous avant le premier demarrage reussi.
5. Ajouter un volume au service web monte sur `/app/storage`. Les photos et videos importees seront dans `/app/storage/uploads`.
6. Choisir `/api/health` comme Healthcheck Path, avec un delai de 300 secondes. Conserver une seule instance avec ce stockage local.
7. Deployer. Ne pas definir de Start Command : le Dockerfile lance le script de demarrage. Next utilise automatiquement le PORT fourni par Railway et ecoute sur 0.0.0.0.

| Variable | Valeur |
| --- | --- |
| DATABASE_URL | `${{MySQL.MYSQL_URL}}` (adapter MySQL si le service a un autre nom) |
| APP_ORIGIN | L'URL HTTPS exacte du site, sans slash final |
| SESSION_SECRET | Une valeur aleatoire privee d'au moins 32 caracteres |
| LOCAL_SETUP_ENABLED | `false` |
| ADMIN_EMAIL | Facultatif : remplace l'identifiant initial `admin@gali-blue.test` |
| ADMIN_PASSWORD | Facultatif : remplace le mot de passe initial par une valeur unique de 16 a 72 caracteres |

Renseigner les secrets directement dans les variables privees Railway, jamais dans GitHub.
Exemple de generation de SESSION_SECRET dans un terminal prive :

```sh
node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"
```

Un exemple sans secret est disponible dans `deployment/railway.env.example`.
L'acces a la base peut rester prive ; aucun proxy MySQL public n'est necessaire.

## Premier demarrage

Le conteneur execute successivement les migrations Prisma existantes, le seed de
demonstration et la creation du premier administrateur, puis lance Next.js.
Les executions suivantes ne changent pas les reglages ou mots de passe existants.
Le seed remplit uniquement les collections de demonstration vides.
Si un compte de connexion existe deja, meme desactive, aucun compte initial n'est ajoute
et aucun mot de passe n'est reinitialise. Une desactivation ne reactive donc pas l'acces initial.

Sans ADMIN_EMAIL ni ADMIN_PASSWORD, le premier demarrage d'une base sans compte cree
`admin@gali-blue.test` avec le mot de passe aleatoire remis au proprietaire du projet.
Le conteneur ne dispose que de son hash bcrypt dans `deployment/bootstrap-admin.json`.
Pour utiliser cet acces, supprimer les anciennes variables ADMIN_EMAIL/ADMIN_PASSWORD
de demonstration (notamment les valeurs REPLACE_...), puis redeployer.

Changer ce mot de passe dans Personnel > modifier l'administrateur apres la premiere
connexion, avant toute utilisation reelle. Les redeploiements conservent le nouveau hash.
Pour un acces personnalise des le premier demarrage, fournir vos propres variables
ADMIN_EMAIL et ADMIN_PASSWORD. Retirer ADMIN_PASSWORD des variables une fois le compte cree.

- Connexion : `https://VOTRE-DOMAINE/connexion`
- Dashboard : `https://VOTRE-DOMAINE/dashboard`

Le compte local `admin@gali-blue.local` / `admin` n'est pas cree ni copie sur Railway.
Les mots de passe courts sont refuses par l'API en production.
L'acces initial Railway est reserve a la recette. Le mot de passe en clair n'est pas
recuperable depuis GitHub et n'est jamais affiche dans les logs du serveur.

## Base de donnees

Le schema SQL se trouve dans `database/schema.sql`. Il ne contient aucune donnee
personnelle, aucun compte et aucun secret. Sur Railway, ne pas l'importer manuellement :
`prisma migrate deploy` applique les migrations avec leur historique.
Pour une installation SQL manuelle, lire `database/README.md`.

## Limites avant publication

Les images et menus sont des exemples, pas les photos ou tarifs reels de GALI BLUE.
CMI reste desactive. Remplacer les textes legaux et coordonnees, configurer les sauvegardes
MySQL et du volume, et finaliser les mesures de production listees dans le README principal.
Ce guide prepare le deploiement ; il ne cree pas de projet ni d'abonnement Railway.