#!/bin/sh
set -e

echo "▶ Running Prisma schema sync..."
cd /app/backend
npx prisma db push --skip-generate

echo "▶ Starting Express backend on :5000..."
node src/index.js &

echo "▶ Starting nginx on :80..."
nginx -g "daemon off;"
