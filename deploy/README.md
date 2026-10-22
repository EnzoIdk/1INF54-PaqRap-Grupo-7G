# Despliegue de PaqRap

Guía para publicar PaqRap en un servidor Linux y mantenerlo actualizado. El despliegue es el
mismo en cualquier servidor con Ubuntu 24.04 LTS, 2 vCPU y 2 GB de RAM (memoria y topes están
dimensionados para eso) y los puertos 22, 80 y 443 abiertos. Las secciones
[AWS Academy](#servidor-en-aws-academy-learner-lab-ec2) y
[VM de la PUCP](#vm-asignada-por-la-pucp) recogen lo propio de cada uno.

> Este repositorio es público: no escriba en él direcciones IP, contraseñas, llaves ni
> identificadores de cuentas. Los datos de acceso se comparten por otro medio.

## Arquitectura

```
Internet ──► :80 / :443 ──► [ web: Caddy ] ──┬─ /api/*        ──► [ backend: Spring Boot :8080 ] ──► [ db: PostgreSQL ]
                                             ├─ /ws-paqrap*   ──► [ backend ]
                                             └─ cualquier otra ruta ► visualizador React (archivos estáticos)
```

- **Un solo punto de entrada.** Solo el contenedor `web` publica puertos (80 y 443).
  `backend` y `db` solo existen en la red interna de Docker; nadie fuera del servidor puede
  conectarse a ellos. Tampoco se exponen `/actuator` ni otras rutas internas.
- **Mismo origen.** El navegador habla siempre con el mismo dominio (`/api`, `/ws-paqrap`),
  así que no hace falta CORS y **ninguna dirección IP está escrita en el código**: el
  frontend usa rutas relativas, Caddy llega al backend por el nombre `backend` y este a la
  base por el nombre `db`. Cambiar de servidor, o que cambie su IP, no exige tocar código.
- **Persistencia.** Los datos de PostgreSQL están en el volumen Docker `pgdata`. Sobrevive a
  reconstruir imágenes, a `docker compose down` y a reiniciar el servidor.

| Archivo | Para qué sirve |
|---|---|
| `docker-compose.prod.yml` | Define `db`, `backend` y `web`, con topes de memoria para 2 GB |
| `Caddyfile` | Proxy inverso, caché, compresión y (opcionalmente) HTTPS automático |
| `.env.example` | Plantilla de la configuración secreta (`deploy/.env`, que no se versiona) |
| `scripts/preparar-vm.sh` | Instalación única: Docker, git, swap y firewall |
| `scripts/desplegar.sh` | Despliega o actualiza desde git (también sirve para volver atrás) |
| `scripts/respaldar-bd.sh` | Copia de seguridad de PostgreSQL con rotación a 14 días |
| `../backend/src/main/resources/application-prod.yml` | Perfil `prod` de Spring Boot |
| `../frontend/Dockerfile.prod` | Compila el visualizador y lo sirve con Caddy |

## Probar el despliegue en su PC (opcional, recomendado)

El mismo compose funciona en Docker Desktop y sirve para comprobar un cambio antes de subirlo
a un servidor. Necesita los puertos 80 y 443 libres.

```bash
cp deploy/.env.example deploy/.env       # y poner cualquier POSTGRES_PASSWORD de prueba
docker compose -f deploy/docker-compose.prod.yml up -d --build --wait
# abrir http://localhost
docker compose -f deploy/docker-compose.prod.yml down -v    # aquí SÍ conviene -v: borra los datos de prueba
```

## Primer despliegue en un servidor

Los mismos pasos valen para cualquier servidor; solo cambia cómo se entra por SSH
(ver la sección de cada servidor).

### 1. Preparar el servidor (una sola vez)

```bash
git clone https://github.com/EnzoIdk/1INF54-PaqRap-Grupo-7G.git
cd 1INF54-PaqRap-Grupo-7G
bash deploy/scripts/preparar-vm.sh
exit                       # cerrar y volver a entrar para activar el grupo docker
```

El script instala Docker, crea 2 GB de swap y activa `ufw` con solo 22, 80 y 443 abiertos.

> Si el repositorio es privado, `git clone` pedirá credenciales. Use un *deploy key* de
> solo lectura (Settings ▸ Deploy keys en GitHub) en lugar de una contraseña personal.

### 2. Configuración secreta

```bash
cd 1INF54-PaqRap-Grupo-7G
cp deploy/.env.example deploy/.env
chmod 600 deploy/.env
sed -i "s/^POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=$(openssl rand -hex 20)/" deploy/.env
```

Esto escribe una contraseña aleatoria de PostgreSQL directamente en el archivo, sin que
aparezca en ningún otro lugar. Solo se aplica al crear el volumen por primera vez.

### 3. Desplegar

```bash
bash deploy/scripts/desplegar.sh 2>&1 | tee ~/despliegue.log
```

La primera vez descarga imágenes y compila backend y frontend: tarda varios minutos (unos 8
a 15 en 2 vCPU). Si la sesión SSH se corta, vuelva a ejecutarlo: es seguro repetirlo y
reutiliza lo ya construido. Termina con la tabla de servicios y `Despliegue completo.`

Comprobaciones rápidas, en el servidor:

```bash
curl -I http://localhost/                          # 200, el visualizador
curl -s http://localhost/api/auth/setup-status     # {"requiereConfiguracion":true} la primera vez
docker compose -f deploy/docker-compose.prod.yml ps
```

(Las rutas `/api/experimentacion/...` responden 401 sin sesión: la API exige iniciar sesión.)

> **Inmediatamente después del primer despliegue, cree el administrador.** Abra
> `http://<host-o-ip-publica>`: la primera visita muestra la pantalla de configuración inicial y
> quien la complete queda como ADMIN. Como el sitio es público, hágalo antes de compartir la
> URL. Después, desde **Usuarios**, cree cuentas con rol USUARIO para los evaluadores: pueden
> ejecutar y ver todo, pero no cambiar los parámetros de operación.

Y desde su navegador, `http://<host-o-ip-publica>`. Pruebe también recargar con F5 estando en
`/pedidos` o `/analytics`: no debe dar 404.

### 4. HTTPS (opcional)

Caddy solo puede activar HTTPS si el servidor tiene un **nombre de dominio** que resuelva a su
IP pública y el puerto 80 es alcanzable desde Internet (Let's Encrypt lo usa para validar).
Con solo la IP, el sitio funciona por HTTP. Con un nombre, edite `deploy/.env`:

```
SITE_ADDRESS=<nombre-de-dominio>
```

y aplique:

```bash
docker compose -f deploy/docker-compose.prod.yml up -d web
docker compose -f deploy/docker-compose.prod.yml logs -f web   # ver la emisión del certificado
```

Caddy obtiene y renueva solo el certificado y redirige HTTP a HTTPS; los certificados quedan en
el volumen `caddy-data`. Si la emisión falla, vuelva a `SITE_ADDRESS=:80` y repita el
`up -d web`: el sitio sigue funcionando por HTTP mientras tanto.

## Servidor en AWS Academy (Learner Lab, EC2)

### Reglas del Learner Lab que condicionan el despliegue

Según las guías de varios cursos (confirme en el *Readme* de su laboratorio, porque cada curso
puede configurarlo distinto):

- **Regiones:** solo `us-east-1` (N. Virginia) y `us-west-2` (Oregón).
- **Sesión de 4 horas.** Al terminar, las instancias EC2 se **detienen** (no se borran) y se
  reinician al iniciar el lab de nuevo; si no arrancan solas, se inician desde la consola de
  EC2 (*Instance state ▸ Start instance*). Volver a pulsar **Start Lab** antes de que el
  contador llegue a cero renueva las 4 horas.
  **Consecuencia: el sitio solo está público mientras haya una sesión activa en la cuenta que
  lo aloja.** Quien lo aloje debe iniciar el lab antes de una evaluación y renovarlo.
- **Presupuesto** (típicamente 50 USD): el saldo que muestra el lab se actualiza solo cada 8 a
  12 horas y no hay alarmas de costo. Superarlo deshabilita la cuenta y se pierden los recursos.
- **Cuenta individual:** el servidor pertenece a la cuenta de quien lo creó; solo esa persona
  puede encenderlo y apagarlo. Los demás acceden por HTTP y, si se les añade su llave, por SSH.

### Crear el servidor (EC2 ▸ Launch instance)

| Campo | Valor |
|---|---|
| Name | `paqrap-server` |
| AMI | **Ubuntu Server 24.04 LTS (HVM), SSD**, 64-bit (x86) |
| Instance type | **t3.small** (2 vCPU, 2 GB) |
| Key pair | `vockey` (la llave del lab; se descarga en *AWS Details ▸ Download PEM*) |
| Auto-assign public IP | Enable |
| Security group | SSH (22) desde *My IP*; HTTP (80) y HTTPS (443) desde Internet |
| Storage | **30 GiB gp3** (los 8 GiB por defecto no alcanzan para imágenes y compilación) |
| Termination protection | Enable |

Después, en **EC2 ▸ Elastic IPs ▸ Allocate Elastic IP address ▸ Associate**, asocie una IP
elástica a la instancia. Sin ella, la IP pública cambia cada vez que la instancia se detiene
e inicia.

Acceso por SSH (usuario `ubuntu`, no hay contraseña):

```bash
chmod 400 labsuser.pem                    # SSH rechaza llaves legibles por otros
ssh -i labsuser.pem ubuntu@<ip-elastica-o-dns-publico>
```

Para que un compañero entre sin compartir el `.pem`, agregue su llave pública a
`~/.ssh/authorized_keys` en el servidor. Luego siga el
[primer despliegue](#primer-despliegue-en-un-servidor).

### Comprobar que la IP elástica sigue asociada

Una IP elástica se queda asociada a la instancia al detenerla e iniciarla; solo se pierde si
alguien la desasocia, la libera o se termina la instancia. No se pudo confirmar que el
Learner Lab no haga algo distinto, así que compruébelo **después de cada reinicio del lab**:

1. **Consola ▸ EC2 ▸ Elastic IPs:** la fila debe mostrar un *ID de instancia asociada* (el de
   `paqrap-server`) y un *ID de asociación*. Si esas columnas están vacías, la IP está libre.
2. **Consola ▸ EC2 ▸ Instances:** en los detalles de la instancia, la *Dirección IPv4 pública*
   debe ser **la misma** que la IP elástica, y debe aparecer el campo *Direcciones IP elásticas*.
3. **Desde el propio servidor** (qué IP pública cree tener):
   ```bash
   TOKEN=$(curl -s -X PUT http://169.254.169.254/latest/api/token -H "X-aws-ec2-metadata-token-ttl-seconds: 60")
   curl -s -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data/public-ipv4; echo
   ```
4. **Desde fuera:** `curl -I http://<ip-elastica>/` debe responder 200.

Si la IP pública de la instancia es otra, la elástica quedó suelta: asóciela de nuevo
(*Elastic IPs ▸ seleccionar ▸ Actions ▸ Associate Elastic IP address*, elegir la instancia,
marcar *Allow reassociation*). Nada del código depende de la IP, así que no hay que redesplegar.

Mientras la IP elástica exista se cobra (≈ 0,005 USD/hora, esté asociada o no), y se
cobra el disco aunque la instancia esté detenida. Al terminar el curso, libere la IP y borre la
instancia y el disco.

### Costos aproximados

| Concepto | Costo mensual si estuviera encendido todo el mes |
|---|---|
| t3.small | ≈ 15 USD |
| IP pública / elástica | ≈ 3,7 USD (también apagada) |
| Disco gp3 de 30 GB | ≈ 2,4 USD (también apagado) |

Como la instancia está apagada entre sesiones, el gasto real es menor. Evite servicios que
consumen el presupuesto sin necesitarse aquí: NAT Gateway, balanceadores de carga y RDS.

### Prueba de reinicio

Tras el primer despliegue, termine el lab (**End Lab**), inícielo otra vez y compruebe: la
instancia está en ejecución, la IP pública sigue siendo la elástica, y
`docker ps` muestra los tres contenedores (`db`, `backend`, `web`) y el sitio responde. Los
contenedores vuelven solos (`restart: unless-stopped`; Docker arranca con el sistema) y
tardan 1 a 2 minutos.

## VM asignada por la PUCP

Servidor del curso (Ubuntu 24.04 LTS, 2 vCPU, 2 GB de RAM, puertos 22/80/443). Los datos de
acceso —nombre DNS, IP, usuario y contraseña— los entrega el curso y **no** van en este repositorio.

- Puede estar accesible solo desde la red de la PUCP o con la VPN activa. Si el SSH no
  responde, conéctese primero a la VPN.
- Acceso: `ssh <usuario>@<nombre-dns-de-la-vm>`. Cambie la contraseña entregada (`passwd`),
  cargue su llave pública (`ssh-copy-id`) y, cuando todos tengan llave, desactive el acceso por
  contraseña (`PasswordAuthentication no` en `/etc/ssh/sshd_config`, luego
  `sudo systemctl reload ssh`).
- Después se sigue el [primer despliegue](#primer-despliegue-en-un-servidor) sin cambios. Como
  la VM tiene un nombre DNS, aquí sí puede activarse el [HTTPS](#4-https-opcional) si el
  puerto 80 es alcanzable desde Internet; consulte con el laboratorio si la red lo restringe.
- La VM no tiene el límite de 4 horas del Learner Lab: si queda encendida de forma permanente,
  es el servidor adecuado para la evaluación; el de AWS sirve de respaldo y para pruebas.
- Cada servidor tiene su propio `deploy/.env` y su propia base de datos: no se comparten datos.
  Tras cada `git push`, ejecute `bash deploy/scripts/desplegar.sh` en cada servidor que quiera
  actualizar.

## Actualizar (cada vez que haya cambios)

Desde su máquina: `git push` a `main`. En el servidor:

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
  Descargue de vez en cuando una copia a su máquina (`scp`): un respaldo en el mismo servidor no
  protege contra perderlo.
- **Restaurar:**
  ```bash
  gunzip -c ~/respaldos-paqrap/ARCHIVO.sql.gz | \
    docker compose -f deploy/docker-compose.prod.yml exec -T db sh -c 'psql -U "$POSTGRES_USER" "$POSTGRES_DB"'
  ```
- **Peligro:** `docker compose down -v` (y `docker volume rm`) **borra la base de datos**. No lo use.

## Iniciar, detener y operar

Todos los comandos se ejecutan desde la raíz del repositorio (`~/1INF54-PaqRap-Grupo-7G` en el servidor).

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

Los servicios tienen `restart: unless-stopped` y Docker arranca con el sistema: si el servidor
se reinicia, la aplicación vuelve sola.

## Qué tener en cuenta

- **Memoria (2 GB).** Topes: PostgreSQL 320 MB, backend 900 MB (heap ≈ 630 MB), Caddy 128 MB.
  La compilación es lo más pesado, por eso `desplegar.sh` construye una imagen a la vez y
  `preparar-vm.sh` crea 2 GB de swap. Si el backend se queda sin memoria, se reinicia solo
  (`ExitOnOutOfMemoryError`) y queda registrado en `dc logs backend`.
- **CPU.** Cada corrida de experimentación ocupa un núcleo durante unos segundos. Con 2 vCPU,
  si varios evaluadores ejecutan a la vez, las respuestas se vuelven lentas pero no se cae.
  El backend limita las peticiones simultáneas (`server.tomcat.threads.max`).
- **WebSocket sin uso por ahora.** `useEventosFlota` (STOMP) aún no lo invoca ningún
  componente. Cuando se use, ojo: el endpoint `/ws-paqrap` está registrado con SockJS y
  rechaza WebSocket crudo en esa ruta (400, con o sin proxy); el cliente debería conectarse a
  `/ws-paqrap/websocket` o usar SockJS. El proxy ya reenvía correctamente ambas rutas.
- **Es público.** Cualquiera que conozca la URL puede abrir la aplicación y lanzar
  experimentos; hoy no hay autenticación. No ingrese datos sensibles. Si más adelante se
  requiere acceso restringido, se puede añadir `basic_auth` en el `Caddyfile` sin tocar la
  aplicación.
- **Credenciales.** `deploy/.env` vive solo en el servidor y no se versiona. La contraseña de
  PostgreSQL no es la de la VM ni la de ninguna cuenta. Use llaves SSH. La contraseña por
  defecto `paqrap` de `application.yml` y `docker-compose.yml` es solo de desarrollo local: el
  compose de producción la sustituye por la de `deploy/.env`.
- **Docker y el firewall.** Los puertos publicados por Docker se saltan `ufw`. Por eso el
  compose de producción solo publica 80 y 443. No agregue `ports:` a `db` ni a `backend`.
- **Salida a Internet.** El servidor necesita alcanzar Docker Hub, Maven Central, el registro
  de npm y `download.docker.com` durante el primer despliegue. Si su red los bloquea, hay que
  pedir una excepción o construir las imágenes en otra máquina y subirlas.
- **Disco.** Las imágenes viejas se limpian con cada despliegue y los registros rotan
  (3 × 10 MB por servicio). Revise `df -h` de vez en cuando.
- **Evolución posible.** Cuando el equipo lo necesite, un flujo de GitHub Actions puede
  construir las imágenes, publicarlas en GHCR y ejecutar `desplegar.sh` por SSH al hacer
  `push` a `main`; no se incluye ahora porque requiere guardar la llave SSH como secreto del
  repositorio y que el servidor sea alcanzable desde GitHub.

## Problemas frecuentes

| Síntoma | Causa probable |
|---|---|
| `desplegar.sh` falla con `Defina POSTGRES_PASSWORD` | Falta completar `deploy/.env` |
| El backend reinicia en bucle y el log dice `Migration checksum mismatch` | Se editó una migración ya aplicada; restaure el archivo o cree una `V2` |
| `password authentication failed` tras cambiar `POSTGRES_PASSWORD` | El volumen conserva la contraseña original; use `ALTER USER` dentro de la base |
| `permission denied` al usar `docker` | Falta cerrar y volver a abrir la sesión SSH después de `preparar-vm.sh` |
| `UNPROTECTED PRIVATE KEY FILE` al entrar por SSH | `chmod 400 <llave>.pem` (y en WSL, tenerla en el home de Linux, no en `/mnt/c`) |
| El sitio abre por HTTP pero no por HTTPS | Let's Encrypt no alcanzó el puerto 80; revise `dc logs web` |
| El sitio no abre desde fuera pero `curl localhost` sí | El Security Group (AWS) o el firewall de la red no deja pasar el puerto 80 |
| Tras reiniciar el lab de AWS la IP ya no es la de siempre | La IP elástica quedó desasociada; vuelva a asociarla (ver sección de AWS) |
| `bash\r: No such file` al ejecutar un script | Quedó con finales de línea CRLF; `.gitattributes` lo evita en git, pero si copia el archivo a mano use `dos2unix` |
