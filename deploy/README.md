# Despliegue en la máquina virtual del grupo

Guía para publicar PaqRap en la VM asignada (Ubuntu 24.04 LTS, 2 vCPU, 2 GB de RAM,
puertos 22/80/443) y mantenerlo actualizado.

## Arquitectura

```
Internet ──► :80 / :443 ──► [ web: Caddy ] ──┬─ /api/*        ──► [ backend: Spring Boot :8080 ] ──► [ db: PostgreSQL ]
                                             ├─ /ws-paqrap*   ──► [ backend ]
                                             └─ cualquier otra ruta ► visualizador React (archivos estáticos)
```

- **Un solo punto de entrada.** Solo el contenedor `web` publica puertos (80 y 443).
  `backend` y `db` solo existen en la red interna de Docker; nadie fuera de la VM puede
  conectarse a ellos. Tampoco se exponen `/actuator` ni otras rutas internas.
- **Mismo origen.** El navegador habla siempre con el mismo dominio (`/api`, `/ws-paqrap`),
  así que no hace falta CORS y el frontend no necesita conocer ninguna URL del backend.
- **Persistencia.** Los datos de PostgreSQL están en el volumen Docker `pgdata`. Sobrevive a
  reconstruir imágenes, a `docker compose down` y a reiniciar la VM.

| Archivo | Para qué sirve |
|---|---|
| `docker-compose.prod.yml` | Define `db`, `backend` y `web`, con topes de memoria para los 2 GB de la VM |
| `Caddyfile` | Proxy inverso, caché, compresión y (opcionalmente) HTTPS automático |
| `.env.example` | Plantilla de la configuración secreta (`deploy/.env`, que no se versiona) |
| `scripts/preparar-vm.sh` | Instalación única: Docker, git, swap y firewall |
| `scripts/desplegar.sh` | Despliega o actualiza desde git (también sirve para volver atrás) |
| `scripts/respaldar-bd.sh` | Copia de seguridad de PostgreSQL con rotación a 14 días |
| `../backend/src/main/resources/application-prod.yml` | Perfil `prod` de Spring Boot |
| `../frontend/Dockerfile.prod` | Compila el visualizador y lo sirve con Caddy |

## Probar el despliegue en su PC (opcional, recomendado)

El mismo compose funciona en Docker Desktop y sirve para comprobar un cambio antes de subirlo
a la VM. Necesita los puertos 80 y 443 libres.

```bash
cp deploy/.env.example deploy/.env       # y poner cualquier POSTGRES_PASSWORD de prueba
docker compose -f deploy/docker-compose.prod.yml up -d --build --wait
# abrir http://localhost
docker compose -f deploy/docker-compose.prod.yml down -v    # aquí SÍ conviene -v: borra los datos de prueba
```

## Primer despliegue

### 0. Acceso

La VM puede estar accesible solo desde la red de la PUCP o con la VPN activa. Si el SSH
no responde, conéctese primero a la VPN.

```bash
ssh 1inf54.983.7g@1inf54-983-7g.inf.pucp.edu.pe
```

Cambie la contraseña que le entregaron (`passwd`) y cargue su llave pública
(`ssh-copy-id`) para no depender de ella. **Nunca** suba la contraseña de la VM al repositorio.

### 1. Preparar la VM (una sola vez)

```bash
git clone https://github.com/EnzoIdk/1INF54-PaqRap-Grupo-7G.git
cd 1INF54-PaqRap-Grupo-7G
bash deploy/scripts/preparar-vm.sh
exit                       # cerrar y volver a entrar para activar el grupo docker
```

> Si el repositorio es privado, `git clone` pedirá credenciales. Use un *deploy key* de
> solo lectura (Settings ▸ Deploy keys en GitHub) en lugar de una contraseña personal.

### 2. Configuración secreta

```bash
cd 1INF54-PaqRap-Grupo-7G
cp deploy/.env.example deploy/.env
chmod 600 deploy/.env
nano deploy/.env           # completar POSTGRES_PASSWORD (openssl rand -hex 20)
```

### 3. Desplegar

```bash
bash deploy/scripts/desplegar.sh
```

La primera vez descarga imágenes y compila backend y frontend: tarda varios minutos.
Al terminar, la aplicación responde en **http://1inf54-983-7g.inf.pucp.edu.pe** (y en
`http://200.16.7.164`).

Comprobaciones rápidas:

```bash
curl -I http://localhost/                          # 200, el visualizador
curl -s http://localhost/api/experimentacion/datos | head -c 200
docker compose -f deploy/docker-compose.prod.yml ps
```

### 4. HTTPS (recomendado antes de la evaluación)

Con el DNS ya apuntando a la VM y el puerto 80 alcanzable desde Internet, edite
`deploy/.env`:

```
SITE_ADDRESS=1inf54-983-7g.inf.pucp.edu.pe
```

y aplique:

```bash
docker compose -f deploy/docker-compose.prod.yml up -d web
docker compose -f deploy/docker-compose.prod.yml logs -f web   # ver la emisión del certificado
```

Caddy obtiene y renueva solo el certificado de Let's Encrypt y redirige HTTP a HTTPS. Los
certificados quedan en el volumen `caddy-data`.

Si la emisión falla (suele ser porque Let's Encrypt no alcanza el puerto 80 desde Internet,
por ejemplo si la PUCP lo restringe a la red interna), vuelva a `SITE_ADDRESS=:80` y repita
el `up -d web`; el sitio sigue funcionando por HTTP mientras tanto. Consulte con el
laboratorio si el puerto 80 está abierto hacia fuera.

## Actualizar (cada vez que haya cambios)

Desde su máquina: `git push` a `main`. En la VM:

```bash
cd ~/1INF54-PaqRap-Grupo-7G
bash deploy/scripts/desplegar.sh
```

El script trae el código, hace un respaldo de la base de datos, reconstruye las imágenes,
reinicia solo lo que cambió y espera a que el backend esté sano. La base de datos no se
toca, salvo que el cambio incluya una migración nueva de Flyway (ver más abajo).

**Volver a una versión anterior:**

```bash
bash deploy/scripts/desplegar.sh <hash-del-commit-anterior>
```

## Datos y migraciones

- **El esquema lo gobierna Flyway.** Para cambiar tablas, cree un archivo nuevo
  `V2__descripcion.sql`, `V3__...` en `backend/src/main/resources/db/migration/`. Se aplica
  solo al arrancar el backend. **No edite `V1` ni migraciones ya desplegadas**: Flyway
  detecta el cambio y el backend se niega a iniciar.
- **Los archivos del cliente** (`ventas.*`, `bloqueo.*`, `mant.*`) viajan dentro del jar. Si
  los actualiza, basta con `desplegar.sh`.
- **Respaldos.** El script de despliegue ya respalda antes de actualizar. Para automatizarlo
  cada noche: `crontab -e` y añadir
  `0 3 * * * bash $HOME/1INF54-PaqRap-Grupo-7G/deploy/scripts/respaldar-bd.sh >> $HOME/respaldos-paqrap/cron.log 2>&1`.
  Descargue de vez en cuando una copia a su máquina (`scp`): un respaldo en la misma VM no
  protege contra perder la VM.
- **Restaurar:**
  ```bash
  gunzip -c ~/respaldos-paqrap/ARCHIVO.sql.gz | \
    docker compose -f deploy/docker-compose.prod.yml exec -T db sh -c 'psql -U "$POSTGRES_USER" "$POSTGRES_DB"'
  ```
- **Peligro:** `docker compose down -v` (y `docker volume rm`) **borra la base de datos**. No lo use.

## Iniciar, detener y operar

Todos los comandos se ejecutan desde la raíz del repositorio (`~/1INF54-PaqRap-Grupo-7G` en la VM).

| Acción | Comando |
|---|---|
| **Iniciar** (o actualizar) todo | `bash deploy/scripts/desplegar.sh` |
| Iniciar sin reconstruir ni actualizar código | `docker compose -f deploy/docker-compose.prod.yml up -d` |
| **Detener** (los datos se conservan) | `docker compose -f deploy/docker-compose.prod.yml stop` |
| Detener y quitar contenedores (los datos se conservan) | `docker compose -f deploy/docker-compose.prod.yml down` |
| Reiniciar un servicio | `docker compose -f deploy/docker-compose.prod.yml restart backend` |
| Estado | `docker compose -f deploy/docker-compose.prod.yml ps` |
| Registros en vivo | `docker compose -f deploy/docker-compose.prod.yml logs -f backend` (también `web`, `db`) |
| Consumo de CPU y memoria | `docker stats --no-stream` y `free -h` |

> **Nunca** use `down -v`: el `-v` borra el volumen `pgdata` y con él toda la base de datos.

Para escribir menos: `alias dc='docker compose -f deploy/docker-compose.prod.yml'` y luego `dc ps`, `dc stop`, etc.

Los servicios tienen `restart: unless-stopped` y Docker arranca con el sistema: si la VM se
reinicia, la aplicación vuelve sola.

## Qué tener en cuenta

- **Memoria (2 GB).** Topes: PostgreSQL 320 MB, backend 900 MB (heap ≈ 630 MB), Caddy 128 MB.
  La compilación es lo más pesado, por eso `desplegar.sh` construye una imagen a la vez y
  `preparar-vm.sh` crea 2 GB de swap. Si el backend se queda sin memoria, se reinicia solo
  (`ExitOnOutOfMemoryError`) y queda registrado en `dc logs backend`.
- **CPU.** Cada corrida de experimentación ocupa un núcleo durante varios segundos. Con 2 vCPU,
  si varios evaluadores ejecutan a la vez, las respuestas se vuelven lentas pero no se cae.
  El backend limita las peticiones simultáneas (`server.tomcat.threads.max`).
- **WebSocket sin uso por ahora.** `useEventosFlota` (STOMP) aún no lo invoca ningún
  componente. Cuando se use, ojo: el endpoint `/ws-paqrap` está registrado con SockJS y
  rechaza WebSocket crudo en esa ruta (400, con o sin proxy); el cliente debería conectarse a
  `/ws-paqrap/websocket` o usar SockJS. El proxy ya reenvía correctamente ambas rutas.
- **Es público.** Cualquiera que conozca la URL puede abrir la aplicación y lanzar
  experimentos; hoy no hay autenticación. Es lo pedido para la evaluación, pero no ingrese
  datos sensibles. Si más adelante se requiere acceso restringido, se puede añadir
  `basic_auth` en el `Caddyfile` sin tocar la aplicación.
- **Credenciales.** `deploy/.env` vive solo en la VM. La contraseña de PostgreSQL no es la de
  la VM. Use llaves SSH y desactive la contraseña cuando todos las tengan.
- **Docker y el firewall.** Los puertos publicados por Docker se saltan `ufw`. Por eso el
  compose de producción solo publica 80 y 443. No agregue `ports:` a `db` ni a `backend`.
- **Salida a Internet.** La VM necesita alcanzar Docker Hub, Maven Central, el registro de npm
  y `download.docker.com` durante el primer despliegue. Si la red de la PUCP los bloquea, hay
  que pedir una excepción o construir las imágenes en otra máquina y subirlas.
- **Disco.** Las imágenes viejas se limpian con cada despliegue y los registros rotan
  (3 × 10 MB por servicio). Revise `df -h` de vez en cuando.
- **Evolución posible.** Cuando el equipo lo necesite, un flujo de GitHub Actions puede
  construir las imágenes, publicarlas en GHCR y ejecutar `desplegar.sh` por SSH al hacer
  `push` a `main`; no se incluye ahora porque requiere guardar la llave SSH como secreto del
  repositorio y que la VM sea alcanzable desde GitHub.

## Problemas frecuentes

| Síntoma | Causa probable |
|---|---|
| `desplegar.sh` falla con `Defina POSTGRES_PASSWORD` | Falta completar `deploy/.env` |
| El backend reinicia en bucle y el log dice `Migration checksum mismatch` | Se editó una migración ya aplicada; restaure el archivo o cree una `V2` |
| `password authentication failed` tras cambiar `POSTGRES_PASSWORD` | El volumen conserva la contraseña original; use `ALTER USER` dentro de la base |
| `permission denied` al usar `docker` | Falta cerrar y volver a abrir la sesión SSH después de `preparar-vm.sh` |
| El sitio abre por HTTP pero no por HTTPS | Let's Encrypt no alcanzó el puerto 80; revise `dc logs web` |
| `bash\r: No such file` al ejecutar un script | Quedó con finales de línea CRLF; `.gitattributes` lo evita en git, pero si copia el archivo a mano use `dos2unix` |
