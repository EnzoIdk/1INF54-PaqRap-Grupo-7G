# Arquitectura de la simulación: bloques de tiempo, navegadores y seguridad

Este documento responde los puntos A22 y A23 de la rúbrica y resume cómo se
protegen el acceso y el planificador. Los diagramas usan Mermaid, que GitHub
muestra directamente.

## 1. Consumo de datos por bloques (Sc) dentro de cada bloque del planificador (Sa) — A22

El planificador no resuelve el periodo de una sola vez. Avanza por **bloques de
planificación (Sa)** de 8 horas, que coinciden con los turnos 07:00–15:00,
15:00–23:00 y 23:00–07:00. En cada Sa consume un **bloque de datos (Sc)**: lo
que llegó dentro de esa ventana más lo que quedó pendiente del bloque anterior.
Una simulación de 5 días son 15 bloques Sa; la de colapso repite bloques hasta
que algún pedido vence sin asignación.

Código: `ServicioExperimentacion.ejecutarCincoDias` y `ejecutarColapso`, un
ciclo `for (s = 0; s < numTurnos; s++)` por bloque.

```mermaid
flowchart LR
    subgraph Datos["Archivos del cliente (todo el mes)"]
        V["ventas.aaaamm.txt<br/>+ pedidos registrados"]
        B["bloqueo.aamm.txt"]
        M["mantenimiento"]
        A["averías inyectadas"]
    end

    subgraph Sc["Bloque de datos Sc del turno k  [inicio_k, fin_k)"]
        P1["Pedidos que llegan en la ventana"]
        P0["Pendientes del bloque k-1"]
        BL["Bloqueos que solapan la ventana"]
        AV["Averías dentro de la ventana"]
        FL["Flota del turno: mantenimiento del día,<br/>ubicación y hora libre heredadas"]
        ST["Stock de almacenes intermedios<br/>(recarga a las 23:59:59 al cambiar de día)"]
    end

    subgraph Sa["Bloque del planificador Sa (turno k, 8 h)"]
        F["1. Descarta los vencidos → no asignados"]
        O["2. Ordena por hora límite y toma<br/>hasta el máximo por turno"]
        PL["3. I-ACO / AGA-ES-TW<br/>planifican las rutas"]
        AC["4. Descuenta stock, mueve unidades,<br/>marca entregados"]
    end

    V --> P1
    B --> BL
    M --> FL
    A --> AV
    P1 --> F
    P0 --> F
    BL --> PL
    AV --> PL
    FL --> PL
    ST --> PL
    F --> O --> PL --> AC
    AC -- "pendientes que aún pueden cumplirse" --> P0n["Pendientes para Sc k+1"]
    AC -- "sin unidad factible antes de su plazo" --> R["Riesgo / colapso"]
```

Cronología de tres bloques consecutivos:

```mermaid
sequenceDiagram
    participant D as Datos del mes
    participant S as Bloque Sc
    participant P as Planificador (Sa)
    participant V as Plan acumulado
    Note over D,V: Turno 1 · 07:00–15:00
    D->>S: pedidos [07:00, 15:00), bloqueos y averías vigentes
    S->>P: pedidos ordenados por hora límite (máx. por turno)
    P->>V: rutas del turno 1
    P-->>S: pendientes que siguen siendo factibles
    Note over D,V: Turno 2 · 15:00–23:00
    D->>S: pedidos [15:00, 23:00) + pendientes del turno 1
    S->>P: unidades parten desde donde terminó el turno 1
    P->>V: rutas del turno 2
    Note over D,V: Turno 3 · 23:00–07:00 (cambio de día: recarga de stock)
    D->>S: pedidos [23:00, 07:00) + pendientes
    S->>P: mantenimiento del nuevo día
    P->>V: rutas del turno 3
```

El visualizador recibe el plan acumulado de todos los bloques con el recorrido
fechado nodo a nodo y lo reproduce a la velocidad que elija el usuario: no
vuelve a consultar al backend mientras avanza el reloj.

## 2. Varios navegadores durante la simulación del periodo — A23 / G06 / C05 / C06

Un solo planificador resuelve el periodo y cualquier cantidad de navegadores,
desde distintos dispositivos y en distintos momentos, abre ese mismo plan.
Cada navegador lo reproduce con **su propio reloj, velocidad, filtros, zoom y
selección**, que viven en el estado local del navegador (Zustand). Las
consultas de uno no afectan a los demás.

```mermaid
sequenceDiagram
    autonumber
    participant N1 as Navegador 1 (planifica)
    participant API as Backend Spring Boot
    participant L as LimitadorPlanificador
    participant R as RegistroSimulaciones
    participant N2 as Navegador 2 (otro dispositivo)
    participant N3 as Navegador 3 (llega más tarde)

    N1->>API: POST /api/experimentacion/ejecutar-5d
    API->>L: pide un cupo (máx. 1 corrida por núcleo)
    L-->>API: cupo concedido
    API->>API: planifica los 15 bloques Sa
    API->>R: guarda el plan (id = a1b2c3d4)
    API-->>N1: plan + cabecera X-Simulacion-Id
    N1->>N1: reproduce a 60× y filtra motos

    N2->>API: GET /api/simulaciones-compartidas
    API-->>N2: lista de planes recientes
    N2->>API: GET /api/simulaciones-compartidas/a1b2c3d4
    API-->>N2: el mismo plan, sin recalcular
    N2->>N2: reproduce a 10× y enfoca TA03

    N3->>API: GET /api/simulaciones-compartidas/a1b2c3d4
    API-->>N3: el mismo plan
    N3->>N3: salta al día 4 en la línea de tiempo
```

- **Planificar** pasa por `LimitadorPlanificador`: como máximo una corrida por
  núcleo a la vez (configurable con `paqrap.concurrencia.ejecuciones-simultaneas`).
  Las demás esperan su turno en orden de llegada y, si esperan más de
  `espera-maxima-segundos`, reciben `503` con un mensaje en vez de colgarse.
- **Visualizar** no ejecuta el planificador: abrir un plan compartido es una
  lectura en memoria, así que muchos visualizadores no compiten por la CPU.
- Las acciones que generan respuesta del sistema (inyectar una avería,
  registrar pedidos) se envían al planificar, por lo que producen una corrida
  nueva que también queda compartida.
- En la Consola, la tarjeta **Simulaciones compartidas** lista los planes y la
  carga del planificador (corridas en curso y en espera).

## 3. Seguridad del acceso

| Control | Implementación |
|---|---|
| Autenticación | Sesión de Spring Security (`/api/auth/login`), cookie `HttpOnly` y `SameSite=Lax`, expira a los 30 min sin uso. Toda la API exige sesión (401 sin ella); `/api/admin/**` exige rol ADMIN (403). |
| CSRF | Token en cookie `XSRF-TOKEN` que el frontend reenvía en la cabecera `X-XSRF-TOKEN` en cada `POST`/`PUT`/`PATCH`. |
| Límite de intentos | `LimitadorIntentosLogin`: 5 fallos por usuario o 20 por IP en 15 min bloquean el acceso 15 min (`429` + `Retry-After`). Antes del bloqueo se avisa cuántos intentos quedan. Los usuarios inexistentes cuentan igual, para no revelar cuáles existen. |
| Contraseña segura | `PoliticaContrasena`: 12 a 72 caracteres, minúscula, mayúscula, número y símbolo, sin 4 caracteres iguales seguidos, sin el nombre de usuario y sin palabras comunes. Se exige al crear el administrador inicial y cada cuenta; el frontend muestra las reglas mientras se escribe. |
| Almacenamiento | Contraseñas con BCrypt; nunca se devuelven ni se registran. |

Pruebas automáticas: `PoliticaContrasenaTest`, `LimitadorIntentosLoginTest`,
`SeguridadLoginIT` (MockMvc sobre la cadena de filtros real) y
`LimitadorPlanificadorTest` (accesos simultáneos). Las pruebas de carga están
en [pruebas-rendimiento.md](pruebas-rendimiento.md).
