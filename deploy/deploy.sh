#!/bin/bash
set -euo pipefail
cd /var/www/guildmasters
docker compose pull app
docker compose up -d
docker compose run --rm app npx prisma migrate deploy
docker image prune -f
