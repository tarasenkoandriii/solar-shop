#!/bin/sh
set -e

# Логіка застосування схеми БД + seed винесена в спільний скрипт
# scripts/db-bootstrap.js — використовується і тут (Docker), і в
# apps/api/package.json "vercel-build" (Vercel) — щоб дві версії цієї
# логіки не розходились одна з одною (саме так сталось раніше, коли ця
# логіка була вписана напряму в entrypoint.sh без Vercel-версії).
node /repo/scripts/db-bootstrap.js

echo "[entrypoint] Стартую NestJS..."
exec node apps/api/dist/main.js
