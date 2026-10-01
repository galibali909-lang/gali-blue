# Deploiement Railway

Le depot GitHub contient uniquement le code, le schema et les contenus de demonstration.
Le fichier github, les tokens, .env, les comptes locaux et les reservations ne sont pas publies.

## Configuration

1. Creer un projet Railway et ajouter un service MySQL.
2. Ajouter un service depuis le depot GitHub prive et autoriser Railway a lire ce depot.
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
| ADMIN_EMAIL | Votre adresse pour le premier administrateur |
| ADMIN_PASSWORD | Un mot de passe unique de 16 a 72 caracteres |

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
Si un administrateur actif existe deja, ADMIN_PASSWORD ne le reinitialise pas.
Apres la premiere connexion reussie, retirer ADMIN_PASSWORD des variables Railway.

- Connexion : `https://VOTRE-DOMAINE/connexion`
- Dashboard : `https://VOTRE-DOMAINE/dashboard`

Le compte local `admin@gali-blue.local` / `admin` n'est pas cree ni copie sur Railway.
Les mots de passe courts sont refuses par l'API en production.

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