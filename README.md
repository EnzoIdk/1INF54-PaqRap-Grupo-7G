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
├── deploy/             # Despliegue en servidor (Docker Compose + Caddy)
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

1. **Consola de Simulación** — cuatro escenarios: **Día a día** (el turno vigente
   con la hora real de Lima; el reloj sigue la hora real y al cambiar de turno se
   planifica solo el siguiente), **1 día**, **5 días** y **hasta el colapso**. Se
   elige mes, día, turno (07:00, 15:00 o 23:00), flota, semilla y algoritmo; se
   inyectan averías y se registran pedidos propios, uno a uno o desde un archivo
   con el formato de ventas, todos con validación de campos obligatorios.
2. **Centro de Control** — el plan se reproduce sobre el mapa: las unidades se
   desplazan por la retícula siguiendo la ruta que el algoritmo encontró, el
   trazo ya recorrido queda en gris y los pedidos cambian de estado al ser
   entregados. El reloj dual muestra el tiempo simulado y el real; la velocidad
   va de 1x a 240x (o tiempo real) y la línea de tiempo permite adelantar o
   retroceder. Los chips de la flota filtran autos, motos y bicicletas también en
   el mapa; los pedidos reasignados por avería se resaltan; un aviso informa cada
   entrega completada; la unidad seleccionada permite descargar su itinerario.
3. **Gestión de Pedidos** — los pedidos con su unidad, su cuenta regresiva y su
   estado; filtros por cliente, plazo y estado, y exportación a CSV.
4. **Analytics** — la comparación de los dos algoritmos y, por cada uno, la tasa de
   cumplimiento (a tiempo, fuera de plazo, sin atender, reasignados), el gráfico de
   tiempo real de entrega frente al plazo, el análisis de costos (total, por km, por
   pedido y por tipo de unidad), indicadores de eficiencia, uso de los almacenes,
   cuellos de botella y horas de refrigerio. Exporta resultados a Excel (CSV),
   el historial de incidencias y los refrigerios.
5. **Configuración** — los parámetros vigentes. Un ADMIN cambia en caliente
   velocidades, capacidades, costos, flota por defecto, umbrales del semáforo y
   ubicación de los almacenes; un USUARIO solo los consulta.

La planificación respeta además la hora de alimentación de cada conductor: una
hora completa, al menos una hora después del cambio de turno y una hora antes del
siguiente, sin retrasar ninguna entrega que cumplía su plazo.

### API

| Método | Recurso | Descripción |
|---|---|---|
| `GET` | `/api/experimentacion/datos` | Conjuntos de datos del cliente disponibles |
| `GET` | `/api/experimentacion/parametros` | Parámetros vigentes del planificador, la flota y los almacenes |
| `POST` | `/api/experimentacion/ejecutar` | Resuelve un turno con el I-ACO, el AGA-ES-TW o ambos |
| `POST` | `/api/experimentacion/ejecutar-5d` | Simulación de 5 días (15 turnos) |
| `POST` | `/api/experimentacion/ejecutar-colapso` | Simulación continua hasta el colapso logístico |
| `PUT` | `/api/admin/parametros` | (ADMIN) Cambia en caliente flota y almacenes |
| `POST` | `/api/admin/parametros/restablecer` | (ADMIN) Vuelve a los valores de `application.yml` |

Las tres ejecuciones aceptan `pedidosAdicionales`: pedidos registrados por el usuario
(`clienteId`, `posX`, `posY`, `cantidadProducto`, `plazoHoras`, `dia`, `hora`, `minuto`).
Toda la API, salvo `/api/auth/**`, exige sesión iniciada.

```bash
curl -X POST http://localhost:8080/api/experimentacion/ejecutar \
  -H "Content-Type: application/json" \
  -d '{"archivoVentas":"ventas.202602.txt","dia":3,"horaInicio":0,"ventanaHoras":24,"maximoPedidos":120,"algoritmo":"AMBOS"}'
```

## Despliegue

La aplicación se publica en un servidor Linux (la VM de la PUCP o una instancia EC2 de AWS
Academy) con Docker Compose y un proxy inverso (Caddy) que es el único servicio expuesto, en
los puertos 80 y 443. PostgreSQL conserva sus datos en un volumen y cada actualización se
aplica con un solo comando:

```bash
bash deploy/scripts/desplegar.sh
```

La guía completa —preparación del servidor en AWS o en la VM de la PUCP, HTTPS, respaldos,
migraciones y qué tener en cuenta con 2 GB de RAM— está en [`deploy/README.md`](deploy/README.md).

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
