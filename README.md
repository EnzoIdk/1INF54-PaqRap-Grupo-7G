# 1INF54-PaqRap-Grupo-7G

Desarrollo de software para envío de paquetes logísticos para el curso de Proyecto de Diseño y Desarrollo de Software ciclo 2026-2.

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Backend / planificador | Java 21 + Spring Boot 3 |
| Base de datos | PostgreSQL 16 |
| Frontend / visualizador | TypeScript + React 18 (Vite) |
| Empaquetado | Docker / Docker Compose |

Las convenciones de nomenclatura, estructura de paquetes, manejo de errores, versionamiento y demás reglas de codificación se definen en el documento **STD - Estándares de Programación** del equipo.

## Estructura del repositorio

```
1INF54-PaqRap-Grupo-7G/
├── backend/            # Componente planificador (Java 21 + Spring Boot 3)
├── frontend/           # Componente visualizador (TypeScript + React + Vite)
├── docker-compose.yml  # Orquestación local (PostgreSQL, backend, frontend)
├── deploy/             # Despliegue en la máquina virtual (Docker Compose + Caddy)
└── CHANGELOG.md
```

## Cómo levantar el entorno local

### Base de datos (PostgreSQL vía Docker)

```bash
docker compose up -d db
```

### Backend

```bash
cd backend
./mvnw spring-boot:run
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```


## Experimentación numérica desde la interfaz

Los dos algoritmos metaheurísticos del caso —**I-ACO** y **AGA-ES-TW**— se ejecutan
desde el visualizador y su resultado se reproduce sobre el mapa.

### Levantar el entorno sin PostgreSQL

La experimentación numérica no necesita base de datos: lee los archivos del cliente
de `backend/src/main/resources/datos` y resuelve el turno en memoria. El perfil
`local` arranca el backend con una base H2 en memoria y Flyway desactivado.

```bash
cd backend && mvn spring-boot:run -Dspring-boot.run.profiles=local
```

```bash
cd frontend && npm install && npm run dev
```

El visualizador queda en <http://localhost:5173> y el backend en
<http://localhost:8080>. El perfil por defecto (PostgreSQL + Flyway) no cambia:
para usarlo, `docker compose up -d db` y `mvn spring-boot:run`.

### Flujo de uso

1. **Consola de Simulación** — elija el mes de ventas, el día, la hora de inicio
   del turno, la ventana de pedidos, el tamaño de la flota, la semilla y el
   algoritmo. Puede inyectar averías para observar la reasignación de carga.
2. **Centro de Control** — el plan se reproduce sobre el mapa: las unidades se
   desplazan por la retícula siguiendo la ruta que el algoritmo encontró, el
   trazo ya recorrido queda en gris y los pedidos cambian de estado al ser
   entregados. El reloj dual muestra el tiempo simulado y el real; la velocidad
   va de 1x a 240x y la línea de tiempo permite adelantar o retroceder.
3. **Gestión de Pedidos** — los pedidos del turno con su unidad, su cuenta
   regresiva y su estado en el instante que se reproduce.
4. **Analytics** — la comparación numérica de los dos algoritmos sobre el mismo
   turno: costo operativo, distancia, pedidos atendidos, entregas fuera de plazo,
   unidades movilizadas, tiempo de cómputo y fitness.
5. **Configuración** — los parámetros vigentes del planificador, la flota y los
   almacenes, tal como los expone el backend.

### API

| Método | Recurso | Descripción |
|---|---|---|
| `GET` | `/api/experimentacion/datos` | Conjuntos de datos del cliente disponibles |
| `GET` | `/api/experimentacion/parametros` | Parámetros vigentes del planificador, la flota y los almacenes |
| `POST` | `/api/experimentacion/ejecutar` | Resuelve un turno con el I-ACO, el AGA-ES-TW o ambos |

```bash
curl -X POST http://localhost:8080/api/experimentacion/ejecutar \
  -H "Content-Type: application/json" \
  -d '{"archivoVentas":"ventas.202602.txt","dia":3,"horaInicio":0,"ventanaHoras":24,"maximoPedidos":120,"algoritmo":"AMBOS"}'
```

## Despliegue

La aplicación se publica en la máquina virtual del grupo con Docker Compose y un proxy
inverso (Caddy) que es el único servicio expuesto, en los puertos 80 y 443. PostgreSQL
conserva sus datos en un volumen y cada actualización se aplica con un solo comando:

```bash
bash deploy/scripts/desplegar.sh
```

La guía completa —preparación de la VM, HTTPS, respaldos, migraciones y qué tener en
cuenta con 2 GB de RAM— está en [`deploy/README.md`](deploy/README.md).

## Archivos de datos del cliente

`backend/src/main/resources/datos` contiene los tres juegos de datos, que los
lectores de `carga` reconocen por el nombre del archivo:

| Patrón | Registro | Contenido |
|---|---|---|
| `ventas.aaaamm.txt` | `##d##h##m:posX,posY,cIdCliente,qq,hl` | Pedidos del mes |
| `bloqueo.aamm.txt` | `##d##h##m-##d##h##m:x1,y1,x2,y2,...` | Calles cerradas y su periodo de vigencia |
| `mant.preventivo.MM.MM.txt` | `aaaammdd:TTNN` | Plan bimensual de mantenimiento preventivo |

La prueba `LectoresDatosIT` recorre los 73 archivos y exige que no se rechace
ningún registro.

```bash
cd backend && mvn test
```
