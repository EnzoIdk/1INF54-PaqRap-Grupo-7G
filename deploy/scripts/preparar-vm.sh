#!/usr/bin/env bash
# Preparacion unica de la VM (Ubuntu 24.04 LTS). Instala solo lo necesario:
# Docker Engine con el plugin de Compose y git. Ademas crea un swap de 2 GB
# (la VM tiene 2 GB de RAM y la compilacion de Maven/Vite los puede agotar) y
# deja el firewall del sistema abierto unicamente en 22, 80 y 443.
#
#   bash deploy/scripts/preparar-vm.sh
#
# Es idempotente: puede repetirse sin efectos adversos.
set -euo pipefail

if [[ $EUID -eq 0 ]]; then
  echo "Ejecutelo con su usuario normal (usa sudo cuando hace falta)." >&2
  exit 1
fi

echo "==> Paquetes base"
sudo apt-get update -y
sudo apt-get install -y ca-certificates curl git

if ! command -v docker >/dev/null 2>&1; then
  echo "==> Docker Engine (repositorio oficial)"
  sudo install -m 0755 -d /etc/apt/keyrings
  sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  sudo chmod a+r /etc/apt/keyrings/docker.asc
  # shellcheck disable=SC1091
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
    | sudo tee /etc/apt/sources.list.d/docker.list >/dev/null
  sudo apt-get update -y
  sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
else
  echo "==> Docker ya esta instalado: $(docker --version)"
fi

# Docker arranca con el sistema; junto con `restart: unless-stopped` en el
# compose, la aplicacion vuelve sola tras un reinicio de la VM.
sudo systemctl enable --now docker

if ! id -nG "$USER" | grep -qw docker; then
  echo "==> Agregando a $USER al grupo docker (requiere volver a abrir la sesion SSH)"
  sudo usermod -aG docker "$USER"
fi

if [[ -z "$(swapon --show --noheadings)" ]]; then
  echo "==> Swap de 2 GB"
  sudo fallocate -l 2G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab >/dev/null
else
  echo "==> Ya hay swap configurado"
fi

# Nota: los puertos que publica Docker se saltan las reglas de ufw (Docker
# escribe directamente en iptables). Por eso el compose de produccion solo
# publica 80 y 443; ufw protege el resto de servicios del sistema.
if command -v ufw >/dev/null 2>&1; then
  echo "==> Firewall (ufw): solo 22, 80 y 443"
  sudo ufw allow 22/tcp
  sudo ufw allow 80/tcp
  sudo ufw allow 443/tcp
  sudo ufw --force enable
fi

echo
echo "Listo. Cierre la sesion SSH y vuelva a entrar para usar docker sin sudo."
