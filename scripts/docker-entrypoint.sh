#!/bin/sh
set -eu
mkdir -p /app/storage/uploads
chown node:node /app/storage /app/storage/uploads
exec gosu node node scripts/start-production.mjs