# CHANGELOG

Registro de las versiones entregadas del proyecto PaqRap, conforme a la sección 6.4 del estándar de programación (STD).

## [Unreleased]

### Security
- Límite de intentos en el inicio de sesión: 5 fallos por usuario o 20 por IP en 15 minutos
  bloquean el acceso 15 minutos (`429` con `Retry-After`); antes del bloqueo el mensaje dice
  cuántos intentos quedan. Configurable en `paqrap.seguridad.login`.
- Política de contraseña segura al crear el administrador inicial y cada cuenta: 12 a 72
  caracteres con minúscula, mayúscula, número y símbolo, sin el nombre de usuario, sin
  palabras comunes y sin 4 caracteres iguales seguidos. El frontend muestra las reglas y un
  medidor mientras se escribe.
- La sesión expira tras 30 minutos sin uso; la cookie es `HttpOnly` y `SameSite=Lax`.
- Pruebas: `PoliticaContrasenaTest`, `LimitadorIntentosLoginTest` y `SeguridadLoginIT`
  (MockMvc sobre la cadena de filtros real).

### Added
- Mapa a pantalla completa: zoom con la rueda, botones +/− y doble clic; arrastre para
  desplazarse; ajuste al mapa completo y centrado en la unidad seleccionada. Los paneles de
  monitoreo empiezan contraídos en un riel con contadores (rúbrica E01), la barra lateral
  se contrae a iconos y el botón "Pantalla completa" deja solo el Centro de Control.
- Íconos propios de auto, moto y bicicleta que apuntan hacia donde avanza la unidad
  (derecha, izquierda, arriba o abajo), con tamaños distintos por tipo.
- El mapa se aleja hasta 50 % y queda siempre pegado a los bordes izquierdo y superior;
  muestra el título de los dos ejes. Los almacenes (40 y 34 px) son claramente más grandes
  que los vehículos (19, 17 y 15 px). Cuando varias unidades coinciden en un punto, una
  insignia «+N» lo indica y al pasar el cursor una ficha las lista todas (con un resumen por
  situación si son muchas); cada fila selecciona esa unidad.
- Los indicadores globales y los avisos de entregas van apilados bajo Filtros y Leyenda,
  fuera del área del mapa cuando hay espacio, y la leyenda se despliega completa, sin barras
  de desplazamiento. Con zoom, el mapa se arrastra en cualquier dirección.
- Semáforo + vacío de ocupación en cada unidad (anillo de color; discontinuo si va vacía) y
  en los almacenes; filtros del mapa por tipo y por nivel, compartidos con el panel de flota;
  indicadores globales de ocupación de la flota y del stock de almacenes (G01-G04).
- Averías con color e insignia por tipo, visibles solo mientras duran según su tipo (D10-D13).
- Selección bidireccional mapa-panel de unidades y almacenes (F01, F05). El panel de flota
  ordena por ocupación, busca por código y muestra los envíos y productos de cada unidad; el
  de almacenes muestra envíos en camino, por salir en 4 h y entregados en las últimas 4 h.
- Reloj con los cuatro tiempos: fecha y hora simuladas, tiempo simulado transcurrido, fecha
  y hora actuales de Lima y tiempo real transcurrido.
- Reporte de la última planificación estable al terminar el periodo, al llegar al colapso o
  al cerrar la operación día a día (G08-G10), con impresión y exportación.
- Simulaciones compartidas (C05, C06, G06): cada plan queda disponible para que otros
  navegadores lo abran desde la Consola y lo reproduzcan con su propio reloj y filtros, sin
  volver a ejecutar el planificador. `LimitadorPlanificador` acota las corridas simultáneas
  (una por núcleo) y responde `503` si la espera se alarga.
- Analytics: resumen ejecutivo con hallazgos priorizados (crítico, atención, en orden) y una
  recomendación para cada uno; evolución por día o por franja de 2 h y distribución del
  margen con que llegan las entregas.
- Pruebas de carga y estrés (`pruebas/rendimiento/prueba_carga.py`) y sus resultados en
  `docs/pruebas-rendimiento.md`; diagramas de consumo por bloques y de varios navegadores en
  `docs/arquitectura-simulacion.md` (A22, A23).

### Fixed
- `/api/auth/me` sin sesión responde 401 en vez de 500.
- Los errores con estado explícito (usuario repetido, contraseña débil, sin sesión) llegan
  con su mensaje en lugar de un cuerpo vacío.
- El panel de flota distingue una entrega en curso ("descargando") de una por llegar.

### Fixed (anteriores)
- Ninguna entrega ocurre antes de que su pedido se registre (RF-04). Antes cada turno
  salía a su hora de inicio con todos los pedidos de la ventana y llegaba a clientes cuyo
  pedido aún no existía. Ahora la unidad sale del almacén cuando ya existen todos los
  pedidos de su ruta, y un pedido posterior solo se agrega si las paradas ya aceptadas
  siguen en plazo. La regla vive en `RelojRuta` (`planificador.comun`) y la usan por igual
  el I-ACO, el AGA-ES-TW, la función objetivo y el ensamblado del plan, de modo que la
  comparación entre los dos algoritmos se mantiene.
- En las simulaciones de 5 días y hasta el colapso, una unidad ya no sale con una ruta
  nueva antes de volver al almacén de la anterior (`UnidadTransporte.ocuparHasta`).
- `ConstructorRutas` acumula el reloj en minutos exactos, como la función objetivo, y solo
  redondea lo que muestra. Antes los redondeos sumados podían correr una entrega un minuto
  más allá del plazo que el algoritmo había evaluado como cumplido; así colapsaba el
  AGA-ES-TW el 12/06/2026 en la simulación hasta el colapso.
- Hora de alimentación: si la unidad espera en el almacén el registro de sus pedidos, el
  conductor come durante la espera sin retrasar entregas; y la ventana (RF-27) se evalúa en
  el turno en que cae la pausa, porque en una ruta que cruza el cambio de turno el conductor
  siguiente toma la unidad en ese punto (Q&A 12).
- Ubicación de los almacenes según la respuesta "CAMBIO" del Q&A: central (27,14),
  Nor-Oeste (12,38) y Este (57,27).

### Added
- Modo oscuro en todo el visualizador: botón sol/luna en la barra lateral y en las
  pantallas de acceso; respeta la preferencia del sistema operativo la primera vez y
  recuerda la elección. Todos los colores salen de los tokens de `tokens.css` (el tema
  oscuro los redefine bajo `[data-tema="oscuro"]`), con contraste de al menos 4.5:1 en
  textos y estados.
- Reinicio de datos antes de un nuevo escenario (RF-50): la Consola de Simulación descarta
  el plan, el reloj, las averías inyectadas y los pedidos registrados, previa confirmación.
- Validación del formulario de averías en los tres escenarios (RF-64): el código de unidad
  debe tener la forma TTNN (TA01, TM03, TB10) y la hora estar entre 0 y 23; si no, se
  indica el error junto al campo y no se permite agregar la avería.
- Uso desde tabletas y celulares (RF-36): bajo 860 px la barra lateral pasa a una barra
  superior compacta que conserva la sesión, el tema y el cierre de sesión, y los
  encabezados envuelven sus acciones en lugar de desbordar.
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
