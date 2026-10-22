# CHANGELOG

Registro de las versiones entregadas del proyecto PaqRap, conforme a la sección 6.4 del estándar de programación (STD).

## [Unreleased]

### Fixed
- Ubicación de los almacenes según la respuesta "CAMBIO" del Q&A: central (27,14),
  Nor-Oeste (12,38) y Este (57,27).

### Added
- Escenario **Día a día** en tiempo real (RF-44): turno vigente según la hora de Lima,
  reloj sincronizado con la hora real y planificación automática del turno siguiente.
- Pedidos registrados por el usuario, uno a uno o desde un archivo con el formato de
  ventas (RF-01, RF-54), con validación de campos obligatorios en el visualizador y en el
  backend (RF-64); los plazos se restringen a 36 h o 4/8/12/18 h (RF-02, RF-03).
- Parámetros de flota y almacenes modificables en caliente por un ADMIN: velocidades,
  capacidades, costos, flota por defecto, umbrales del semáforo y ubicaciones (RF-39,
  RF-56, RF-60, RF-61; Q&A 6, 15 y 16), en `/api/admin/parametros`.
- Hora de alimentación del conductor programada en cada ruta (RF-26, RF-27) sin dejar
  fuera de plazo ninguna entrega; turnos de 5D y colapso limitados a 07:00, 15:00 y 23:00
  (RF-25).
- Marca de pedidos reasignados por avería, resaltados en el mapa y contados en los reportes
  (RF-43, RF-68).
- Reportes en Analytics: tasa de cumplimiento, tiempo real de entrega frente al plazo
  (RF-73), costos por km, por pedido y por tipo de unidad (RF-65), indicadores de
  eficiencia (RF-75), uso de almacenes (RF-71), cuellos de botella (RF-72) y refrigerios
  (RF-74).
- Exportaciones: resultados a Excel/CSV (RF-69), historial de incidencias (RF-67),
  refrigerios, lista de pedidos e itinerario de una unidad en texto (RF-58).
- Filtros de pedidos por plazo y estado (RF-10), filtro por tipo de unidad aplicado al mapa
  (RF-59) y avisos de entregas completadas (RF-09).
- Errores de validación de la API devueltos como 400 con el detalle de cada campo.
- Integración con el retorno de las unidades al almacén (PR #3): la hora de alimentación
  se programa contando el tramo de retorno (se come estacionado en el almacén o antes de
  volver, sin retrasar entregas) y el itinerario y la exportación muestran el almacén de
  retorno.

### Changed
- Centro de Control: la leyenda pasa a un botón desplegable sobre el mapa y los paneles de
  la derecha se organizan en alertas plegables y pestañas Pedidos · Flota · Almacenes, para
  que ninguno quede sin espacio.
- `vite.config.ts` acepta `PAQRAP_BACKEND` para apuntar el proxy a otro backend (por
  defecto `http://localhost:8080`).
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
