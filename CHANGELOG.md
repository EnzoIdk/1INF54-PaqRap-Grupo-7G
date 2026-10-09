# CHANGELOG

Registro de las versiones entregadas del proyecto PaqRap, conforme a la sección 6.4 del estándar de programación (STD).

## [Unreleased]

### Added
- Despliegue en servidor (`deploy/`), válido para la VM de la PUCP y para una instancia EC2 de
  AWS Academy: Docker Compose de producción con
  PostgreSQL persistente, backend con perfil `prod` y proxy inverso Caddy como único punto
  de entrada (80/443, HTTPS opcional con Let's Encrypt), scripts de preparación de la VM,
  despliegue/rollback y respaldo de la base de datos, e imagen de producción del
  visualizador (`frontend/Dockerfile.prod`).
- `spring-boot-starter-actuator` (solo `/actuator/health`) para el healthcheck del backend.
- `.dockerignore` en backend y frontend, y `.gitattributes` para conservar finales de línea LF
  en scripts y Dockerfiles.
- Estructura inicial de carpetas del backend (Spring Boot 3 / Java 21) y del frontend (React + TypeScript + Vite).
- Interfaz `Planificador` y esqueleto de los paquetes `planificador.iaco` y `planificador.agaestw`.
- Configuracion base de Docker Compose para PostgreSQL 16.
- Implementacion completa de los dos algoritmos metaheuristicos sobre el modelo del
  proyecto: `PlanificadorIACO` (Improved Ant Colony Optimization) y
  `PlanificadorAgaEsTw` (Adaptive Genetic Algorithm with Elastic Strategy and Time
  Windows), portados desde los prototipos autonomos de la experimentacion numerica.
- Paquete `planificador.comun` con lo que ambos algoritmos comparten: `Grafo`,
  `ContextoPlanificacion`, `AsignacionUnidad`, `ConstructorRutas`, `EnsambladorPlan`,
  `SelectorAlmacenDespacho`, `EvaluadorCosto` y `RestriccionesPlanificacion`.
- Paquete `experimentacion` que carga un turno de los archivos del cliente con los
  lectores de `carga` y lo resuelve con uno o los dos algoritmos, y su API en
  `/api/experimentacion`.
- El plan viaja al visualizador con el recorrido fechado nodo a nodo, de modo que el
  mapa puede reproducir el movimiento de la flota en tiempo simulado.
- Visualizador construido sobre el documento "STD - Estandares de Interfaz Grafica de
  Usuario": navside, encabezado con reloj dual y controles, mapa de la reticula,
  paneles de seguimiento de pedidos, alertas, flota y almacenes, y las pantallas de
  Consola de Simulacion, Gestion de Pedidos, Analytics y Configuracion.
- Inyeccion de averias desde la Consola de Simulacion, para observar la reasignacion
  de la carga critica de una unidad que queda fuera de servicio.
- Perfil `local` (H2 en memoria, Flyway desactivado) para ejecutar la experimentacion
  numerica y el visualizador sin PostgreSQL.

### Changed
- `application.yml` toma los valores del caso: capacidades de 24, 8 y 4 paquetes,
  velocidades de 40, 25 y 12 km/h, costos de S/ 8,00, S/ 6,00 y S/ 3,00 por kilometro
  y una flota de 10 autos, 15 motos y 12 bicicletas. Antes declaraba valores de
  ejemplo que no correspondian al enunciado.
- `EvaluadorCosto.calcularCostoOperativo` devuelve el costo operativo en soles. Antes
  dividia la distancia entre la velocidad, que es una duracion y no un costo.
- `Grafo` bloquea *tramos* de 1 km y no nodos sueltos: cada lado del poligono abierto
  de un bloqueo se descompone en los tramos que lo componen. Antes un bloqueo cuyos
  vertices distaban varios kilometros no coincidia con ningun tramo recorrido.
- `Ruta` y `PlanRutas` llevan las paradas con sus instantes, el recorrido fechado y
  los indicadores que compara la experimentacion numerica.
- `ParametrosFlota`, `ParametrosAlmacen` y `ParametrosPlanificador` incorporan el
  costo por kilometro, el tamano de la flota, las ubicaciones de los almacenes y los
  parametros de las dos metaheuristicas.
- Surefire ejecuta tambien las clases `*IT`, que hasta ahora se compilaban pero no
  corrian en `mvn test`.

### Fixed
- `LectoresDatosIT` comprueba que los 73 archivos del cliente se leen sin rechazar
  ningun registro, en lugar de limitarse a imprimir un resumen.
