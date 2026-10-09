#!/usr/bin/env bash
# Copia de seguridad de PostgreSQL en un .sql.gz con fecha. Conserva los de los
# ultimos 14 dias.
#
#   bash deploy/scripts/respaldar-bd.sh
#
# Para automatizarlo (todos los dias a las 03:00) con `crontab -e`:
#   0 3 * * * bash /ruta/al/repo/deploy/scripts/respaldar-bd.sh >> $HOME/respaldos-paqrap/cron.log 2>&1
#
# Para restaurar:
#   gunzip -c ARCHIVO.sql.gz | docker compose -f deploy/docker-compose.prod.yml exec -T db sh -c 'psql -U "$POSTGRES_USER" "$POSTGRES_DB"'
set -euo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$RAIZ"

DESTINO="${DIR_RESPALDOS:-$HOME/respaldos-paqrap}"
DIAS_RETENCION=14
ARCHIVO="$DESTINO/paqrap_$(date +%F_%H%M%S).sql.gz"

mkdir -p "$DESTINO"

if ! docker compose -f deploy/docker-compose.prod.yml exec -T db \
      sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' | gzip > "$ARCHIVO"; then
  rm -f "$ARCHIVO"
  echo "Fallo el respaldo de la base de datos." >&2
  exit 1
fi

find "$DESTINO" -name 'paqrap_*.sql.gz' -mtime +"$DIAS_RETENCION" -delete
echo "Respaldo creado: $ARCHIVO ($(du -h "$ARCHIVO" | cut -f1))"
