# Pruebas de rendimiento: accesos simultáneos, visualizadores y estrés de pedidos

Responden a la observación de laboratorio: «probar de manera simultánea varios
accesos al simulador» y «pruebas de estrés, para saber cuántos pedidos más o
menos se pueden tener». Las pruebas de seguridad del login están en
[arquitectura-simulacion.md](arquitectura-simulacion.md#3-seguridad-del-acceso).

## Cómo se ejecutan

El script `pruebas/rendimiento/prueba_carga.py` solo usa la librería estándar de
Python. Cada navegador simulado tiene su propia sesión (cookies + token CSRF),
como un navegador real. Las credenciales van por variables de entorno:

```bash
PAQRAP_USUARIO=... PAQRAP_CLAVE=... python -I pruebas/rendimiento/prueba_carga.py --url http://localhost:8080 --escenario todos --salida resultados.json
```

| Escenario | Qué mide |
|---|---|
| `login` | Intentos fallidos hasta el bloqueo y la API sin sesión. |
| `concurrencia` | 1, 4, 8, 16 y 32 navegadores planifican un turno a la vez. |
| `visualizadores` | Un navegador planifica 5 días y 1 a 20 navegadores abren ese plan a la vez. |
| `estres` | Un navegador sube los pedidos de 1 día (hasta los del archivo) y el máximo por turno en 5 días. |
| `adicionales` | 5 días con 400 pedidos por turno más N pedidos registrados extra (sintéticos). |

**Entorno de referencia:** backend local (`perfil local`, H2) en un Intel Core
i7-12650H (16 hilos), 16 GB de RAM y Java 21; archivo `ventas.202610.txt` desde el
día 3 a las 07:00; fecha 31/10/2026. El servidor de producción (2 vCPU) admite 2
corridas simultáneas del planificador, así que allí los tiempos con muchos
navegadores crecen en proporción; ver la sección final.

## 1. Seguridad del login

| Intento | HTTP | Mensaje |
|---:|---:|---|
| 1 | 401 | Usuario o contraseña incorrectos. Te quedan 4 intentos antes del bloqueo temporal. |
| 2 | 401 | … Te quedan 3 intentos … |
| 3 | 401 | … Te quedan 2 intentos … |
| 4 | 401 | … Te queda 1 intento … |
| 5 | 429 | Demasiados intentos fallidos. Por seguridad, el acceso queda bloqueado 15 minutos. |
| 6-7 | 429 | Igual, aunque se envíe la contraseña correcta (verificado en `SeguridadLoginIT`). |

La API sin sesión responde 401 y una contraseña débil al crear una cuenta, 400 con
las reglas que faltan.

## 2. Accesos simultáneos al planificador

Cada navegador inicia sesión por su cuenta y todos envían la planificación en el
mismo instante (barrera de hilos).

Turno de 8 h, 60 pedidos, I-ACO:

| Navegadores | OK | 503 | Errores | p50 (s) | Máx (s) |
|---:|---:|---:|---:|---:|---:|
| 1 | 1 | 0 | 0 | 0.9 | 0.9 |
| 2 | 2 | 0 | 0 | 0.6 | 0.6 |
| 4 | 4 | 0 | 0 | 0.7 | 0.7 |
| 8 | 8 | 0 | 0 | 1.1 | 1.1 |

Turno de 8 h, 150 pedidos, ambos algoritmos (I-ACO + AGA-ES-TW):

| Navegadores | OK | 503 | Errores | p50 (s) | Máx (s) | Tiempo total (s) |
|---:|---:|---:|---:|---:|---:|---:|
| 1 | 1 | 0 | 0 | 5.0 | 5.0 | 5.0 |
| 4 | 4 | 0 | 0 | 4.8 | 4.8 | 4.8 |
| 8 | 8 | 0 | 0 | 9.8 | 9.8 | 9.8 |
| 16 | 16 | 0 | 0 | 19.6 | 19.7 | 19.7 |
| 32 | 32 | 0 | 0 | 22.0 | 22.4 | 22.4 |

Todas las corridas terminan sin errores. Hasta 4 navegadores el tiempo no cambia;
a partir de 8 crece porque las corridas comparten los núcleos. Con 32 navegadores
`LimitadorPlanificador` resuelve 16 a la vez y el resto espera su turno (en orden
de llegada), por eso el tiempo total no se duplica respecto de 16.

## 3. Varios visualizadores sobre un único planificador (5 días) — G06

Un navegador planifica 5 días (1030 pedidos, ambos algoritmos, 3.8 s, plan de 0.5 MB)
y luego N navegadores abren ese mismo plan desde la lista de simulaciones
compartidas, todos a la vez:

| Visualizadores | OK | p50 (s) | p95 (s) | Máx (s) |
|---:|---:|---:|---:|---:|
| 1 | 1 | 0.02 | 0.02 | 0.02 |
| 5 | 5 | 0.02 | 0.03 | 0.03 |
| 10 | 10 | 0.05 | 0.05 | 0.05 |
| 20 | 20 | 0.07 | 0.08 | 0.09 |

Abrir un plan compartido no ejecuta el planificador: 20 visualizadores lo reciben
en menos de 0.1 s cada uno y luego lo reproducen de forma independiente.

## 4. Estrés: cuántos pedidos se pueden planificar

### 4.1 Pedidos del archivo (ambos algoritmos)

| Simulación | Pedidos | Algoritmo | Atendidos | Sin atender | Fuera de plazo | Cómputo (s) | Respuesta (s) |
|---|---:|---|---:|---:|---:|---:|---:|
| 1 día (24 h) | 50 | I-ACO | 49 | 1 | 0 | 0.4 | 3.7 |
| 1 día (24 h) | 50 | AGA-ES-TW | 49 | 1 | 0 | 3.2 | 3.7 |
| 1 día (24 h) | 100 | I-ACO | 78 | 22 | 0 | 1.0 | 6.1 |
| 1 día (24 h) | 100 | AGA-ES-TW | 79 | 21 | 0 | 5.0 | 6.1 |
| 1 día (24 h) | 206 (todos los del día) | I-ACO | 102 | 104 | 0 | 3.0 | 9.7 |
| 1 día (24 h) | 206 (todos los del día) | AGA-ES-TW | 100 | 106 | 1 | 6.6 | 9.7 |
| 5 días, máx. 20/turno | 1030 | I-ACO | 255 | 775 | 0 | 1.4 | 16.7 |
| 5 días, máx. 40/turno | 1030 | I-ACO | 567 | 463 | 0 | 3.7 | 36.4 |
| 5 días, máx. 80/turno | 1030 | I-ACO | 989 | 41 | 0 | 11.0 | 73.0 |
| 5 días, máx. 80/turno | 1030 | AGA-ES-TW | 978 | 52 | 0 | 61.9 | 73.0 |
| 5 días, máx. 200/turno | 1030 | I-ACO | 995 | 35 | 0 | 9.6 | 43.0 |
| 5 días, máx. 200/turno | 1030 | AGA-ES-TW | 984 | 46 | 0 | 33.3 | 43.0 |

- El archivo de octubre trae unos 206 pedidos por día; los 5 días suman 1030.
- En 5 días, desde 80 pedidos por turno se atiende el 96–97 % de los pedidos, sin
  entregas fuera de plazo, en 43 a 73 s con los dos algoritmos. Con un tope menor
  por turno los pedidos se acumulan y vencen.
- El I-ACO es entre 3 y 6 veces más rápido que el AGA-ES-TW con resultados
  equivalentes.
- Un solo turno de 24 h deja la mitad sin atender porque ese modo resuelve toda la
  ventana como un bloque; la simulación de 5 días, que replanifica cada 8 h, atiende
  casi todos.

### 4.2 Pedidos registrados extra sobre el archivo (5 días, I-ACO)

Pedidos sintéticos (posición, cantidad de 1 a 10 y plazo de 4 a 36 h al azar, semilla
fija) repartidos en los 5 días, con el tope de 400 pedidos por turno:

| Pedidos extra | Pedidos del plan | Atendidos | Sin atender | Fuera de plazo | Respuesta (s) |
|---:|---:|---:|---:|---:|---:|
| 0 | 1030 | 995 (97 %) | 35 | 0 | 11.6 |
| 1000 | 1987 | 1397 (70 %) | 590 | 0 | 61.5 |
| 2000 | 2918 | 1547 (53 %) | 1371 | 0 | 93.6 |
| 4000 | 4812 | 1665 (35 %) | 3147 | 0 | 55.2 |
| 6000 | 6691 | 1663 (25 %) | 5028 | 0 | 37.2 |

(Los pedidos extra que caen antes de las 07:00 del primer día quedan fuera de la
ventana; por eso «pedidos del plan» es algo menor que archivo + extra.)

- El sistema **nunca entrega fuera de plazo**: cuando no alcanza, deja pedidos sin
  atender (y los reporta como riesgo de colapso) en lugar de llegar tarde.
- Con la flota por defecto (37 unidades) el techo es de unos **1650 pedidos atendidos
  en 5 días (≈ 330 por día)**. Por encima de unos 1100 pedidos en 5 días (≈ 220 por
  día) el nivel de servicio baja del 97 %.
- El tiempo de respuesta llega a su máximo (≈ 94 s) hacia 2900 pedidos y luego baja,
  porque muchos pedidos vencen antes de entrar a un turno y el planificador ya no los
  considera.
- Todas las corridas responden sin errores ni falta de memoria con hasta 6700 pedidos.

## 5. Capacidad estimada en el servidor de producción (2 vCPU)

- **Planificador:** 2 corridas simultáneas (una por núcleo). Si llegan más, esperan su
  turno hasta 120 s y luego reciben `503` con un mensaje para reintentar.
- **Visualizadores:** abrir y reproducir un plan compartido no usa el planificador, así
  que decenas de navegadores pueden seguir la misma simulación 5D a la vez.
- **Pedidos:** con la flota por defecto, unos 1000-1100 pedidos en 5 días se atienden al 97 % y el techo está en ≈ 1650 atendidos; más allá hace falta ampliar la flota (parámetros en caliente del ADMIN). En 2 vCPU cada corrida tardará más que en esta máquina de 16 hilos; para tener la cifra exacta del servidor, repita el escenario `estres` contra él.
