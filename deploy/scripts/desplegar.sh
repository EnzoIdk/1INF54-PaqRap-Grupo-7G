#!/usr/bin/env bash
# Despliega (o actualiza) PaqRap en la VM a partir de la rama indicada.
#
#   bash deploy/scripts/desplegar.sh            # rama main
#   bash deploy/scripts/desplegar.sh <rama>     # otra rama
#   bash deploy/scripts/desplegar.sh <commit>   # volver a una version anterior
#
# Los datos de PostgreSQL viven en el volumen `pgdata` y sobreviven a cada
# despliegue; Flyway aplica al arrancar las migraciones nuevas que haya.
set -euo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$RAIZ"

REF="${1:-main}"
COMPOSE=(docker compose -f deploy/docker-compose.prod.yml)

if [[ ! -f deploy/.env ]]; then
  echo "Falta deploy/.env. Creelo con: cp deploy/.env.example deploy/.env" >&2
  exit 1
fi

echo "==> Codigo: $REF"
git fetch --tags origin
git checkout "$REF"
# Si REF es una rama, avanza hasta su ultima version; si es un commit o una
# etiqueta, se queda exactamente ahi. --ff-only evita mezclas silenciosas.
if git show-ref --verify --quiet "refs/remotes/origin/$REF"; then
  git merge --ff-only "origin/$REF"
fi
echo "    $(git log -1 --format='%h %s')"

# Respaldo previo: una migracion nueva se aplica al arrancar el backend.
if "${COMPOSE[@]}" ps --status running --services 2>/dev/null | grep -qx db; then
  echo "==> Respaldo previo de la base de datos"
  bash deploy/scripts/respaldar-bd.sh
fi

# Se construye de a una imagen: compilar backend y frontend a la vez puede
# agotar los 2 GB de RAM de la VM.
echo "==> Construyendo imagenes"
"${COMPOSE[@]}" build backend
"${COMPOSE[@]}" build web

echo "==> Levantando servicios (espera a que el backend este sano)"
if ! "${COMPOSE[@]}" up -d --remove-orphans --wait --wait-timeout 240; then
  echo "Los servicios no quedaron sanos. Ultimos registros del backend:" >&2
  "${COMPOSE[@]}" logs --tail 60 backend >&2
  echo "Para volver a la version anterior: bash deploy/scripts/desplegar.sh <commit-anterior>" >&2
  exit 1
fi

# Libera las imagenes que quedaron sin uso tras reconstruir.
docker image prune -f >/dev/null

"${COMPOSE[@]}" ps
echo
echo "Despliegue completo."
