#!/usr/bin/env bash
set -euo pipefail

# First boot on a fresh disk: create the schema and seed the demo shop.
# Later boots only start the server, so approvals and history survive.
if [[ "${DATABASE_URL:-}" == file:* ]]; then
  DB_PATH="${DATABASE_URL#file:}"
  if [ ! -f "$DB_PATH" ]; then
    echo "First boot: creating and seeding $DB_PATH"
    npx prisma db push --schema=../prisma/schema.prisma
    npx tsx ../prisma/seed.ts
  fi
fi

exec node dist/index.js
