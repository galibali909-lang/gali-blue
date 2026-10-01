# Base MySQL / MariaDB

`schema.sql` est genere depuis Prisma et contient seulement la structure de la base.
Ne pas l'executer sur une base contenant deja ces tables.

## Installation recommandee

Configurer DATABASE_URL vers une base vide, puis executer depuis la racine du projet :

```sh
npx prisma migrate deploy
npm run db:seed
```

Sur Railway, le script de demarrage execute ces commandes automatiquement.
Le seed contient les reglages et la carte de demonstration, mais aucun compte ni reservation.

## Import SQL manuel alternatif

Selectionner une base vide dans votre client MySQL et importer `schema.sql`.
Configurer DATABASE_URL vers cette meme base, puis marquer la migration initiale appliquee :

```sh
npx prisma migrate resolve --applied 20261001195406_init
npm run db:seed
```

Ne pas combiner l'import SQL et `migrate deploy` sans cette etape de suivi.
Le premier administrateur est cree separement par `scripts/create-admin.ts` ; aucun hash
de mot de passe n'est exporte dans ce fichier.

## Regenerer le schema

```sh
npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script --output database/schema.sql
```

Ce fichier n'est pas une sauvegarde des donnees. Sauvegarder separement MySQL et storage/uploads.