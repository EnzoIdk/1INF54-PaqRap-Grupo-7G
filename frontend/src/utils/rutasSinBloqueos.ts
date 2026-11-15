import type {
  AlmacenDto,
  AveriaSolicitada,
  BloqueoDto,
  EjecucionDto,
  NodoMapa,
  ParadaDto,
  PedidoPendienteDto,
  RutaDto,
  TipoUnidad,
  UnidadDto,
} from "../types/Experimentacion";
import { minutoFinDeAveria } from "./averias";
import { ALTO_MAPA_KM, ANCHO_MAPA_KM } from "./constants";

const ANCHO_NODOS = ANCHO_MAPA_KM + 1;
const ALTO_NODOS = ALTO_MAPA_KM + 1;
const TOTAL_NODOS = ANCHO_NODOS * ALTO_NODOS;
const DX = [1, -1, 0, 0];
const DY = [0, 0, 1, -1];
const MINUTOS_ENTREGA_CLIENTE = 60;

/**
 * Clave simétrica de un tramo unitario entre dos nodos contiguos (xa, ya) y (xb, yb).
 * Idéntica a Grafo.claveTramo en el backend.
 */
function claveTramo(xa: number, ya: number, xb: number, yb: number): number {
  const primero = (xa << 8) | ya;
  const segundo = (xb << 8) | yb;
  return primero <= segundo ? (primero << 16) | segundo : (segundo << 16) | primero;
}

/**
 * Descompone los vértices de un bloqueo en su polilínea ortogonal sobre la retícula
 * (primero horizontal y luego vertical entre cada par de vértices), igual que Grafo.java.
 */
export function expandirNodosOrtogonales(nodos: NodoMapa[]): NodoMapa[] {
  if (nodos.length <= 1) {
    return nodos;
  }
  const resultado: NodoMapa[] = [[nodos[0][0], nodos[0][1]]];
  for (let i = 0; i < nodos.length - 1; i++) {
    let [x, y] = nodos[i];
    const [hastaX, hastaY] = nodos[i + 1];
    while (x !== hastaX) {
      x += hastaX > x ? 1 : -1;
      resultado.push([x, y]);
    }
    while (y !== hastaY) {
      y += hastaY > y ? 1 : -1;
      resultado.push([x, y]);
    }
  }
  return resultado;
}

interface RedBloqueada {
  tramosBloqueados: Set<number>;
  nodosBloqueados: Uint8Array;
}

function construirRedBloqueada(bloqueos: BloqueoDto[]): RedBloqueada {
  const tramosBloqueados = new Set<number>();
  const nodosBloqueados = new Uint8Array(TOTAL_NODOS);

  const marcarNodo = (x: number, y: number) => {
    if (x >= 0 && x < ANCHO_NODOS && y >= 0 && y < ALTO_NODOS) {
      nodosBloqueados[y * ANCHO_NODOS + x] = 1;
    }
  };

  for (const bloqueo of bloqueos) {
    const nodos = bloqueo.nodos;
    for (let i = 0; i < nodos.length - 1; i++) {
      let [x, y] = nodos[i];
      const [hastaX, hastaY] = nodos[i + 1];
      marcarNodo(x, y);
      while (x !== hastaX) {
        const sigX = x + (hastaX > x ? 1 : -1);
        tramosBloqueados.add(claveTramo(x, y, sigX, y));
        x = sigX;
        marcarNodo(x, y);
      }
      while (y !== hastaY) {
        const sigY = y + (hastaY > y ? 1 : -1);
        tramosBloqueados.add(claveTramo(x, y, x, sigY));
        y = sigY;
        marcarNodo(x, y);
      }
    }
  }

  return { tramosBloqueados, nodosBloqueados };
}

function esNodoBloqueado(red: RedBloqueada, x: number, y: number): boolean {
  return (
    x >= 0 &&
    x < ANCHO_NODOS &&
    y >= 0 &&
    y < ALTO_NODOS &&
    red.nodosBloqueados[y * ANCHO_NODOS + x] === 1
  );
}

function buscarCaminoOptimoReticula(
  origen: NodoMapa,
  destino: NodoMapa,
  red: RedBloqueada,
): NodoMapa[] {
  const [ox, oy] = origen;
  const [dx, dy] = destino;
  if (ox === dx && oy === dy) {
    return [[ox, oy]];
  }
  if (
    ox < 0 ||
    ox >= ANCHO_NODOS ||
    oy < 0 ||
    oy >= ALTO_NODOS ||
    dx < 0 ||
    dx >= ANCHO_NODOS ||
    dy < 0 ||
    dy >= ALTO_NODOS
  ) {
    return expandirNodosOrtogonales([origen, destino]);
  }

  const idxOrigen = oy * ANCHO_NODOS + ox;
  const idxDestino = dy * ANCHO_NODOS + dx;

  const dist = new Int32Array(TOTAL_NODOS).fill(-1);
  const giros = new Int32Array(TOTAL_NODOS).fill(0x3fffffff);
  const padre = new Int32Array(TOTAL_NODOS).fill(-1);
  const dirLlegada = new Int8Array(TOTAL_NODOS).fill(-1);
  const cola = new Int32Array(TOTAL_NODOS);

  dist[idxOrigen] = 0;
  giros[idxOrigen] = 0;
  cola[0] = idxOrigen;
  let cabeza = 0;
  let fin = 1;

  while (cabeza < fin) {
    const u = cola[cabeza++];
    if (dist[idxDestino] !== -1 && dist[u] >= dist[idxDestino]) {
      break;
    }
    const ux = u % ANCHO_NODOS;
    const uy = Math.floor(u / ANCHO_NODOS);

    for (let d = 0; d < 4; d++) {
      const nx = ux + DX[d];
      const ny = uy + DY[d];
      if (nx < 0 || nx >= ANCHO_NODOS || ny < 0 || ny >= ALTO_NODOS) {
        continue;
      }
      const v = ny * ANCHO_NODOS + nx;
      if (red.tramosBloqueados.has(claveTramo(ux, uy, nx, ny))) {
        continue;
      }
      if (v !== idxDestino && red.nodosBloqueados[v] === 1) {
        continue;
      }

      const nuevaDist = dist[u] + 1;
      const nuevosGiros = giros[u] + (dirLlegada[u] !== -1 && dirLlegada[u] !== d ? 1 : 0);

      if (dist[v] === -1) {
        dist[v] = nuevaDist;
        giros[v] = nuevosGiros;
        padre[v] = u;
        dirLlegada[v] = d;
        cola[fin++] = v;
      } else if (dist[v] === nuevaDist && nuevosGiros < giros[v]) {
        giros[v] = nuevosGiros;
        padre[v] = u;
        dirLlegada[v] = d;
      }
    }
  }

  if (dist[idxDestino] !== -1) {
    return reconstruirCamino(idxOrigen, idxDestino, padre);
  }

  // Respaldo de mínima penalidad si el nodo origen o destino está completamente rodeado
  const costo = new Float64Array(TOTAL_NODOS).fill(Number.POSITIVE_INFINITY);
  const visitado = new Uint8Array(TOTAL_NODOS);
  padre.fill(-1);
  costo[idxOrigen] = 0;

  for (let iter = 0; iter < TOTAL_NODOS; iter++) {
    let u = -1;
    let mejor = Number.POSITIVE_INFINITY;
    for (let i = 0; i < TOTAL_NODOS; i++) {
      if (!visitado[i] && costo[i] < mejor) {
        mejor = costo[i];
        u = i;
      }
    }
    if (u === -1 || u === idxDestino) {
      break;
    }
    visitado[u] = 1;
    const ux = u % ANCHO_NODOS;
    const uy = Math.floor(u / ANCHO_NODOS);
    for (let d = 0; d < 4; d++) {
      const nx = ux + DX[d];
      const ny = uy + DY[d];
      if (nx < 0 || nx >= ANCHO_NODOS || ny < 0 || ny >= ALTO_NODOS) {
        continue;
      }
      const v = ny * ANCHO_NODOS + nx;
      if (visitado[v]) {
        continue;
      }
      const aristaBloq = red.tramosBloqueados.has(claveTramo(ux, uy, nx, ny));
      const nodoBloq = v !== idxDestino && red.nodosBloqueados[v] === 1;
      const peso = 1 + (aristaBloq ? 100000 : nodoBloq ? 10000 : 0);
      if (costo[u] + peso < costo[v]) {
        costo[v] = costo[u] + peso;
        padre[v] = u;
      }
    }
  }

  if (padre[idxDestino] !== -1) {
    return reconstruirCamino(idxOrigen, idxDestino, padre);
  }
  return expandirNodosOrtogonales([origen, destino]);
}

function reconstruirCamino(idxOrigen: number, idxDestino: number, padre: Int32Array): NodoMapa[] {
  const invertido: NodoMapa[] = [];
  let actual = idxDestino;
  while (actual !== -1) {
    invertido.push([actual % ANCHO_NODOS, Math.floor(actual / ANCHO_NODOS)]);
    if (actual === idxOrigen) {
      break;
    }
    actual = padre[actual];
  }
  invertido.reverse();
  return invertido;
}

function tramoTieneBloqueo(
  recorrido: NodoMapa[],
  inicioIdx: number,
  finIdx: number,
  red: RedBloqueada,
): boolean {
  for (let i = inicioIdx; i < finIdx; i++) {
    const [xa, ya] = recorrido[i];
    const [xb, yb] = recorrido[i + 1];
    if (red.tramosBloqueados.has(claveTramo(xa, ya, xb, yb))) {
      return true;
    }
    if (i > inicioIdx && esNodoBloqueado(red, xa, ya)) {
      return true;
    }
    if (i + 1 < finIdx && esNodoBloqueado(red, xb, yb)) {
      return true;
    }
  }
  return false;
}

function velocidadPorTipo(tipo: TipoUnidad): number {
  switch (tipo) {
    case "AUTO":
      return 40;
    case "MOTO":
      return 25;
    case "BICICLETA":
      return 12;
  }
}

function costoKmPorTipo(tipo: TipoUnidad): number {
  switch (tipo) {
    case "AUTO":
      return 8;
    case "MOTO":
      return 6;
    case "BICICLETA":
      return 3;
  }
}

function corregirRutaConBloqueos(ruta: RutaDto, bloqueos: BloqueoDto[]): RutaDto {
  const { recorrido, minutosPorNodo } = ruta;
  if (recorrido.length < 2 || recorrido.length !== minutosPorNodo.length) {
    return ruta;
  }

  // Bloqueos vigentes durante la ventana operativa y de visualización de la ruta
  const ventanaInicio = ruta.minutoSalida - 180;
  const ventanaFin = ruta.minutoFin + 60;
  const bloqueosRuta = bloqueos.filter(
    (b) => b.inicioMinuto < ventanaFin && b.finMinuto > ventanaInicio,
  );
  if (bloqueosRuta.length === 0) {
    return ruta;
  }

  const red = construirRedBloqueada(bloqueosRuta);
  if (red.tramosBloqueados.size === 0) {
    return ruta;
  }

  if (!tramoTieneBloqueo(recorrido, 0, recorrido.length - 1, red)) {
    return ruta;
  }

  const nuevoRecorrido: NodoMapa[] = [[recorrido[0][0], recorrido[0][1]]];
  const nuevosMinutos: number[] = [minutosPorNodo[0]];

  let cursor = 0;
  const ultimoIndice = recorrido.length - 1;

  while (cursor < ultimoIndice) {
    const [ax, ay] = recorrido[cursor];
    const [bx, by] = recorrido[cursor + 1];

    // Paso estacionario (entrega en parada o pausa de alimentación)
    if (ax === bx && ay === by) {
      nuevoRecorrido.push([bx, by]);
      nuevosMinutos.push(minutosPorNodo[cursor + 1]);
      cursor++;
      continue;
    }

    // Encontrar el final del tramo continuo de desplazamiento (hasta la próxima detención o fin de ruta)
    let finTramo = cursor + 1;
    while (finTramo < ultimoIndice) {
      const [cx, cy] = recorrido[finTramo];
      const [nx, ny] = recorrido[finTramo + 1];
      if (cx === nx && cy === ny) {
        break;
      }
      finTramo++;
    }

    if (!tramoTieneBloqueo(recorrido, cursor, finTramo, red)) {
      for (let k = cursor + 1; k <= finTramo; k++) {
        nuevoRecorrido.push([recorrido[k][0], recorrido[k][1]]);
        nuevosMinutos.push(minutosPorNodo[k]);
      }
    } else {
      const origen = recorrido[cursor];
      const destino = recorrido[finTramo];
      const minSalida = minutosPorNodo[cursor];
      const minLlegada = minutosPorNodo[finTramo];
      const duracion = minLlegada - minSalida;

      const caminoLimpio = buscarCaminoOptimoReticula(origen, destino, red);
      const pasos = caminoLimpio.length - 1;
      if (pasos <= 0) {
        nuevoRecorrido.push([destino[0], destino[1]]);
        nuevosMinutos.push(minLlegada);
      } else {
        for (let i = 1; i < pasos; i++) {
          nuevoRecorrido.push(caminoLimpio[i]);
          nuevosMinutos.push(Math.round(minSalida + (duracion * i) / pasos));
        }
        nuevoRecorrido.push([destino[0], destino[1]]);
        nuevosMinutos.push(minLlegada);
      }
    }

    cursor = finTramo;
  }

  return {
    ...ruta,
    recorrido: nuevoRecorrido,
    minutosPorNodo: nuevosMinutos,
  };
}

/**
 * Garantiza que ningún tramo del recorrido de las rutas cruce ni recorra un
 * bloqueo activo, desviando ortogonalmente sobre la retícula cualquier tramo
 * obstruido.
 */
export function evitarBloqueosEnEjecucion(
  ejecucion: EjecucionDto | null,
  bloqueos: BloqueoDto[],
): EjecucionDto | null {
  if (!ejecucion || bloqueos.length === 0 || ejecucion.rutas.length === 0) {
    return ejecucion;
  }

  let cambio = false;
  const rutasCorregidas = ejecucion.rutas.map((ruta) => {
    const corregida = corregirRutaConBloqueos(ruta, bloqueos);
    if (corregida !== ruta) {
      cambio = true;
    }
    return corregida;
  });

  if (!cambio) {
    return ejecucion;
  }

  return {
    ...ejecucion,
    rutas: rutasCorregidas,
  };
}

export interface OpcionesReplanificacionTiempoReal {
  bloqueosBase: BloqueoDto[];
  bloqueosTiempoReal: BloqueoDto[];
  averiasTiempoReal: AveriaSolicitada[];
  flota: UnidadDto[];
  almacenes: AlmacenDto[];
  unidadesEnMantenimiento: string[];
}

/**
 * Adapta una ruta frente a bloqueos registrados en tiempo real de manera causal:
 * - Ningún nodo ni entrega ocurrida en el pasado (t <= bloqueo.inicioMinuto) se modifica.
 * - Si una unidad se encuentra en tránsito en t = bloqueo.inicioMinuto y su tramo
 *   restante cruza el bloqueo, se desvía a partir de su posición actual en t >= bloqueo.inicioMinuto,
 *   desplazando únicamente los tiempos de llegada/salida posteriores según el desvío.
 */
function adaptarRutaPorBloqueosTiempoReal(
  ruta: RutaDto,
  bloqueosBase: BloqueoDto[],
  bloqueosTiempoReal: BloqueoDto[],
  mapaFlota: Map<string, UnidadDto>,
): RutaDto {
  const { recorrido, minutosPorNodo } = ruta;
  if (
    recorrido.length < 2 ||
    recorrido.length !== minutosPorNodo.length ||
    bloqueosTiempoReal.length === 0
  ) {
    return ruta;
  }

  const infoUnidad = mapaFlota.get(ruta.codigoUnidad);
  const velocidadKmh = infoUnidad?.velocidadKmh ?? velocidadPorTipo(ruta.tipoUnidad);
  const costoKm = infoUnidad?.costoKm ?? costoKmPorTipo(ruta.tipoUnidad);
  const minutosPorKm = 60 / Math.max(1, velocidadKmh);

  const nuevoRecorrido: NodoMapa[] = [[recorrido[0][0], recorrido[0][1]]];
  const nuevosMinutos: number[] = [minutosPorNodo[0]];
  // Mapa del desfase acumulado en minutos para cada índice original del recorrido
  const desfasePorIndice = new Int32Array(recorrido.length);

  let deltaMinutos = 0;
  let deltaKmTotal = 0;
  let huboCambio = false;

  let cursor = 0;
  const ultimoIndice = recorrido.length - 1;

  while (cursor < ultimoIndice) {
    const [ax, ay] = recorrido[cursor];
    const [bx, by] = recorrido[cursor + 1];

    // Paso estacionario (entrega al cliente o pausa de alimentación)
    if (ax === bx && ay === by) {
      nuevoRecorrido.push([bx, by]);
      nuevosMinutos.push(minutosPorNodo[cursor + 1] + deltaMinutos);
      desfasePorIndice[cursor + 1] = deltaMinutos;
      cursor++;
      continue;
    }

    // Encontrar el final del tramo continuo de desplazamiento
    let finTramo = cursor + 1;
    while (finTramo < ultimoIndice) {
      const [cx, cy] = recorrido[finTramo];
      const [nx, ny] = recorrido[finTramo + 1];
      if (cx === nx && cy === ny) {
        break;
      }
      finTramo++;
    }

    const minInicioActual = minutosPorNodo[cursor] + deltaMinutos;
    const minFinActual = minutosPorNodo[finTramo] + deltaMinutos;

    // Determinar si algún bloqueo en tiempo real vigente durante este tramo lo obstruye
    // a partir del instante en que dicho bloqueo se inicia (nunca antes de b.inicioMinuto).
    let idxCorte = -1;
    const bloqueosRelevantes: BloqueoDto[] = [];

    for (const b of bloqueosTiempoReal) {
      if (b.inicioMinuto >= minFinActual || b.finMinuto <= minInicioActual) {
        continue;
      }
      // Primer nodo del tramo cuyo tiempo es >= b.inicioMinuto
      let idxReaccion = cursor;
      while (
        idxReaccion < finTramo &&
        minutosPorNodo[idxReaccion] + deltaMinutos < b.inicioMinuto
      ) {
        idxReaccion++;
      }
      if (idxReaccion >= finTramo) {
        continue;
      }
      const redIndividual = construirRedBloqueada([b]);
      if (tramoTieneBloqueo(recorrido, idxReaccion, finTramo, redIndividual)) {
        bloqueosRelevantes.push(b);
        if (idxCorte === -1 || idxReaccion < idxCorte) {
          idxCorte = idxReaccion;
        }
      }
    }

    if (idxCorte === -1) {
      for (let k = cursor + 1; k <= finTramo; k++) {
        nuevoRecorrido.push([recorrido[k][0], recorrido[k][1]]);
        nuevosMinutos.push(minutosPorNodo[k] + deltaMinutos);
        desfasePorIndice[k] = deltaMinutos;
      }
    } else {
      huboCambio = true;
      // 1. Conservar intacta la parte del tramo ya recorrida hasta idxCorte (t <= inicio del bloqueo)
      for (let k = cursor + 1; k <= idxCorte; k++) {
        nuevoRecorrido.push([recorrido[k][0], recorrido[k][1]]);
        nuevosMinutos.push(minutosPorNodo[k] + deltaMinutos);
        desfasePorIndice[k] = deltaMinutos;
      }

      // 2. Desviar desde recorrido[idxCorte] hasta recorrido[finTramo] evitando todos los bloqueos activos
      const minCorte = minutosPorNodo[idxCorte] + deltaMinutos;
      const todosActivos = [
        ...bloqueosBase.filter((b) => b.inicioMinuto < minFinActual + 120 && b.finMinuto > minCorte),
        ...bloqueosTiempoReal.filter(
          (b) => b.inicioMinuto <= minFinActual + 120 && b.finMinuto > minCorte,
        ),
        ...bloqueosRelevantes,
      ];
      const redActiva = construirRedBloqueada(todosActivos);

      const origenDesvio = recorrido[idxCorte];
      const destinoTramo = recorrido[finTramo];
      const caminoLimpio = buscarCaminoOptimoReticula(origenDesvio, destinoTramo, redActiva);

      const pasosOriginales = finTramo - idxCorte;
      const pasosNuevos = caminoLimpio.length - 1;
      const duracionOriginalRestante = minutosPorNodo[finTramo] - minutosPorNodo[idxCorte];

      const nuevaDuracion =
        pasosNuevos <= 0
          ? 0
          : pasosNuevos === pasosOriginales
            ? duracionOriginalRestante
            : Math.max(1, Math.round(pasosNuevos * minutosPorKm));

      const deltaTramo = nuevaDuracion - duracionOriginalRestante;
      deltaMinutos += deltaTramo;
      deltaKmTotal += Math.max(0, pasosNuevos) - pasosOriginales;

      if (pasosNuevos <= 0) {
        nuevoRecorrido.push([destinoTramo[0], destinoTramo[1]]);
        nuevosMinutos.push(minCorte);
      } else {
        for (let i = 1; i < pasosNuevos; i++) {
          nuevoRecorrido.push(caminoLimpio[i]);
          nuevosMinutos.push(Math.round(minCorte + (nuevaDuracion * i) / pasosNuevos));
        }
        nuevoRecorrido.push([destinoTramo[0], destinoTramo[1]]);
        nuevosMinutos.push(minCorte + nuevaDuracion);
      }

      for (let k = idxCorte + 1; k <= finTramo; k++) {
        desfasePorIndice[k] = deltaMinutos;
      }
    }

    cursor = finTramo;
  }

  if (!huboCambio) {
    return ruta;
  }

  // Actualizar tiempos de paradas futuras si hubo desfase por desvío
  const nuevasParadas: ParadaDto[] = ruta.paradas.map((parada) => {
    // Buscar el nodo original de llegada a la parada
    let idxParada = -1;
    for (let i = 0; i < recorrido.length; i++) {
      if (
        recorrido[i][0] === parada.posX &&
        recorrido[i][1] === parada.posY &&
        Math.abs(minutosPorNodo[i] - parada.minutoLlegada) <= 2
      ) {
        idxParada = i;
        break;
      }
    }
    const desfase = idxParada !== -1 ? desfasePorIndice[idxParada] : 0;
    if (desfase === 0) {
      return parada;
    }
    const nuevoMinutoLlegada = parada.minutoLlegada + desfase;
    const nuevoMinutoSalida = parada.minutoSalida + desfase;
    return {
      ...parada,
      minutoLlegada: nuevoMinutoLlegada,
      minutoSalida: nuevoMinutoSalida,
      cumplePlazo: nuevoMinutoLlegada <= parada.minutoLimite,
      holguraMinutos: parada.minutoLimite - nuevoMinutoLlegada,
    };
  });

  const nuevaDistanciaKm = Math.max(0, Number((ruta.distanciaKm + deltaKmTotal).toFixed(2)));
  const nuevoCostoSoles = Math.max(0, Number((nuevaDistanciaKm * costoKm).toFixed(2)));
  const nuevoMinutoFin = nuevosMinutos[nuevosMinutos.length - 1];
  const nuevoMinutoInicioRetorno =
    ruta.minutoInicioRetorno !== undefined
      ? ruta.minutoInicioRetorno + deltaMinutos
      : nuevoMinutoFin;

  return {
    ...ruta,
    recorrido: nuevoRecorrido,
    minutosPorNodo: nuevosMinutos,
    paradas: nuevasParadas,
    distanciaKm: nuevaDistanciaKm,
    costoSoles: nuevoCostoSoles,
    minutoInicioRetorno: nuevoMinutoInicioRetorno,
    minutoFin: nuevoMinutoFin,
  };
}

/**
 * Trunca una ruta en curso en el minuto exacto T en que sufre una avería:
 * conserva el recorrido y las paradas alcanzadas hasta T y deja a la unidad
 * detenida en su coordenada exacta en T.
 */
function truncarRutaEnAveria(
  ruta: RutaDto,
  minutoAveria: number,
  costoKm: number,
): { rutaTruncada: RutaDto; paradasHuerfanas: ParadaDto[] } {
  const paradasCompletadas = ruta.paradas.filter((p) => p.minutoLlegada <= minutoAveria);
  const paradasHuerfanas = ruta.paradas.filter((p) => p.minutoLlegada > minutoAveria);

  const { recorrido, minutosPorNodo } = ruta;
  const nuevoRecorrido: NodoMapa[] = [];
  const nuevosMinutos: number[] = [];

  let distanciaRecorrida = 0;
  for (let i = 0; i < recorrido.length; i++) {
    if (minutosPorNodo[i] <= minutoAveria) {
      if (nuevoRecorrido.length > 0) {
        const [px, py] = nuevoRecorrido[nuevoRecorrido.length - 1];
        distanciaRecorrida += Math.abs(recorrido[i][0] - px) + Math.abs(recorrido[i][1] - py);
      }
      nuevoRecorrido.push([recorrido[i][0], recorrido[i][1]]);
      nuevosMinutos.push(minutosPorNodo[i]);
    } else {
      if (i > 0 && nuevosMinutos[nuevosMinutos.length - 1] < minutoAveria) {
        const [xDesde, yDesde] = recorrido[i - 1];
        const [xHasta, yHasta] = recorrido[i];
        const minDesde = minutosPorNodo[i - 1];
        const minHasta = minutosPorNodo[i];
        const duracion = minHasta - minDesde;
        const avance = duracion > 0 ? (minutoAveria - minDesde) / duracion : 0;
        const xActual = Math.round(xDesde + (xHasta - xDesde) * avance);
        const yActual = Math.round(yDesde + (yHasta - yDesde) * avance);
        distanciaRecorrida += Math.abs(xActual - xDesde) + Math.abs(yActual - yDesde);
        nuevoRecorrido.push([xActual, yActual]);
        nuevosMinutos.push(minutoAveria);
      }
      break;
    }
  }

  if (nuevoRecorrido.length === 0 && recorrido.length > 0) {
    nuevoRecorrido.push([recorrido[0][0], recorrido[0][1]]);
    nuevosMinutos.push(minutoAveria);
  }

  const cargaCompletada = paradasCompletadas.reduce((acc, p) => acc + p.cantidadProducto, 0);
  const distKm = Number(distanciaRecorrida.toFixed(2));

  return {
    rutaTruncada: {
      ...ruta,
      cargaTotal: cargaCompletada,
      distanciaKm: distKm,
      costoSoles: Number((distKm * costoKm).toFixed(2)),
      minutoInicioRetorno: minutoAveria,
      minutoFin: minutoAveria,
      recorrido: nuevoRecorrido,
      minutosPorNodo: nuevosMinutos,
      paradas: paradasCompletadas,
      truncadaPorAveria: true,
    },
    paradasHuerfanas,
  };
}

function seleccionarAlmacenMasCercano(
  posicion: NodoMapa,
  almacenes: AlmacenDto[],
): { codigo: string; ubicacion: NodoMapa } {
  if (almacenes.length === 0) {
    return { codigo: "AC", ubicacion: [12, 8] };
  }
  const conStock = almacenes.filter((a) => a.tipo === "CENTRAL" || a.stockActual > 0);
  const candidatos = conStock.length > 0 ? conStock : almacenes;
  let mejor = candidatos[0];
  let menorDist = Math.abs(posicion[0] - mejor.posX) + Math.abs(posicion[1] - mejor.posY);
  for (let i = 1; i < candidatos.length; i++) {
    const c = candidatos[i];
    const d = Math.abs(posicion[0] - c.posX) + Math.abs(posicion[1] - c.posY);
    if (d < menorDist) {
      menorDist = d;
      mejor = c;
    }
  }
  return { codigo: mejor.codigo, ubicacion: [mejor.posX, mejor.posY] };
}

function construirRutaRescate(
  unidad: UnidadDto,
  codigoAlmacenOrigen: string,
  ubicacionOrigen: NodoMapa,
  paradasLote: ParadaDto[],
  minutoDisponible: number,
  almacenes: AlmacenDto[],
  redBloqueada: RedBloqueada,
): RutaDto {
  const maxRegistro = paradasLote.reduce((m, p) => Math.max(m, p.minutoRegistro), 0);
  const minutoSalida = Math.max(minutoDisponible, maxRegistro);

  const recorrido: NodoMapa[] = [[ubicacionOrigen[0], ubicacionOrigen[1]]];
  const minutosPorNodo: number[] = [minutoSalida];
  const paradasConstruidas: ParadaDto[] = [];

  let posicionActual: NodoMapa = [ubicacionOrigen[0], ubicacionOrigen[1]];
  let reloj = minutoSalida;
  let distanciaTotalKm = 0;

  for (const parada of paradasLote) {
    const destino: NodoMapa = [parada.posX, parada.posY];
    const camino = buscarCaminoOptimoReticula(posicionActual, destino, redBloqueada);
    const pasos = Math.max(0, camino.length - 1);
    const minutosViaje = (pasos / Math.max(1, unidad.velocidadKmh)) * 60;
    const llegadaExacta = reloj + minutosViaje;
    const minutoLlegada = Math.round(llegadaExacta);
    const minutoSalidaParada = minutoLlegada + MINUTOS_ENTREGA_CLIENTE;

    if (pasos === 0) {
      recorrido.push([destino[0], destino[1]]);
      minutosPorNodo.push(minutoLlegada);
    } else {
      for (let i = 1; i < pasos; i++) {
        recorrido.push(camino[i]);
        minutosPorNodo.push(Math.round(reloj + (minutosViaje * i) / pasos));
      }
      recorrido.push([destino[0], destino[1]]);
      minutosPorNodo.push(minutoLlegada);
    }

    // Nodo repetido durante la entrega al destinatario
    recorrido.push([destino[0], destino[1]]);
    minutosPorNodo.push(minutoSalidaParada);

    paradasConstruidas.push({
      ...parada,
      minutoLlegada,
      minutoSalida: minutoSalidaParada,
      cumplePlazo: minutoLlegada <= parada.minutoLimite,
      holguraMinutos: parada.minutoLimite - minutoLlegada,
      reasignado: true,
    });

    distanciaTotalKm += pasos;
    reloj = llegadaExacta + MINUTOS_ENTREGA_CLIENTE;
    posicionActual = destino;
  }

  const retorno = seleccionarAlmacenMasCercano(posicionActual, almacenes);
  const minutoInicioRetorno = Math.round(reloj);
  const caminoRetorno = buscarCaminoOptimoReticula(posicionActual, retorno.ubicacion, redBloqueada);
  const pasosRetorno = Math.max(0, caminoRetorno.length - 1);
  const minutosViajeRetorno = (pasosRetorno / Math.max(1, unidad.velocidadKmh)) * 60;
  const llegadaAlmacenExacta = reloj + minutosViajeRetorno;
  const minutoFin = Math.round(llegadaAlmacenExacta);

  if (pasosRetorno === 0) {
    recorrido.push([retorno.ubicacion[0], retorno.ubicacion[1]]);
    minutosPorNodo.push(minutoFin);
  } else {
    for (let i = 1; i < pasosRetorno; i++) {
      recorrido.push(caminoRetorno[i]);
      minutosPorNodo.push(Math.round(reloj + (minutosViajeRetorno * i) / pasosRetorno));
    }
    recorrido.push([retorno.ubicacion[0], retorno.ubicacion[1]]);
    minutosPorNodo.push(minutoFin);
  }

  distanciaTotalKm += pasosRetorno;
  const cargaTotal = paradasConstruidas.reduce((acc, p) => acc + p.cantidadProducto, 0);
  const costoSoles = Number((distanciaTotalKm * unidad.costoKm).toFixed(2));

  return {
    codigoUnidad: unidad.codigo,
    tipoUnidad: unidad.tipoUnidad,
    almacenOrigen: codigoAlmacenOrigen,
    almacenDestino: retorno.codigo,
    cargaTotal,
    capacidad: unidad.capacidad,
    distanciaKm: Number(distanciaTotalKm.toFixed(2)),
    costoSoles,
    minutoSalida,
    minutoInicioRetorno,
    minutoFin,
    recorrido,
    minutosPorNodo,
    paradas: paradasConstruidas,
  };
}

/**
 * Replanifica causalmente la ejecución en "Operación en tiempo real":
 * 1. Respeta de forma inmutable todo lo ocurrido antes del minuto de cada incidencia
 *    (ninguna unidad en almacén puede salir en un minuto pasado ni teletransportarse).
 * 2. Ante bloqueos en tiempo real, las unidades en ruta conservan su recorrido pasado
 *    y desvían su trayectoria restante desde su posición en el minuto del bloqueo.
 * 3. Ante averías en tiempo real, la unidad averiada se detiene en su coordenada exacta
 *    en el minuto de la avería conservando sus entregas ya realizadas, y sus pedidos
 *    pendientes se reasignan a unidades operativas saliendo a partir del minuto de la avería.
 */
export function replanificarEjecucionEnTiempoReal(
  ejecucionBase: EjecucionDto | null,
  opciones: OpcionesReplanificacionTiempoReal,
): EjecucionDto | null {
  if (!ejecucionBase) {
    return null;
  }

  const {
    bloqueosBase,
    bloqueosTiempoReal,
    averiasTiempoReal,
    flota,
    almacenes,
    unidadesEnMantenimiento,
  } = opciones;

  // 1. Asegurar que el plan base respete los bloqueos preexistentes del archivo mensual
  const baseSinBloqueos = evitarBloqueosEnEjecucion(ejecucionBase, bloqueosBase) ?? ejecucionBase;
  if (bloqueosTiempoReal.length === 0 && averiasTiempoReal.length === 0) {
    return baseSinBloqueos;
  }

  const mapaFlota = new Map<string, UnidadDto>();
  for (const u of flota) {
    mapaFlota.set(u.codigo, u);
  }

  let rutasActuales: RutaDto[] = [...baseSinBloqueos.rutas];
  const pedidosSinAtender: PedidoPendienteDto[] = [...baseSinBloqueos.pedidosSinAtender];
  const riesgosDeColapso: string[] = [...baseSinBloqueos.riesgosDeColapso];

  // 2. Aplicar bloqueos en tiempo real de manera causal sobre las rutas actuales
  if (bloqueosTiempoReal.length > 0) {
    rutasActuales = rutasActuales.map((ruta) =>
      adaptarRutaPorBloqueosTiempoReal(ruta, bloqueosBase, bloqueosTiempoReal, mapaFlota),
    );
  }

  // 3. Procesar averías en tiempo real en orden cronológico (t = averia.minutoSimulacion)
  if (averiasTiempoReal.length > 0) {
    const averiasOrdenadas = [...averiasTiempoReal].sort(
      (a, b) => a.minutoSimulacion - b.minutoSimulacion,
    );

    for (const averia of averiasOrdenadas) {
      const tAveria = averia.minutoSimulacion;
      const finAveria = minutoFinDeAveria(averia.tipo, tAveria);
      const infoAveriada = mapaFlota.get(averia.codigoUnidad);
      const costoKmAveriada =
        infoAveriada?.costoKm ??
        costoKmPorTipo(infoAveriada?.tipoUnidad ?? "AUTO");

      const nuevasRutas: RutaDto[] = [];
      const paradasHuerfanas: ParadaDto[] = [];

      for (const ruta of rutasActuales) {
        if (ruta.codigoUnidad !== averia.codigoUnidad) {
          nuevasRutas.push(ruta);
          continue;
        }
        // Ruta que ya había concluido antes o en el instante de la avería: inmutable
        if (ruta.minutoFin <= tAveria || ruta.minutoSalida >= finAveria) {
          nuevasRutas.push(ruta);
          continue;
        }
        // Ruta en tránsito en el instante de la avería: se detiene en tAveria
        if (ruta.minutoSalida < tAveria && ruta.minutoFin > tAveria) {
          const { rutaTruncada, paradasHuerfanas: pendientes } = truncarRutaEnAveria(
            ruta,
            tAveria,
            costoKmAveriada,
          );
          nuevasRutas.push(rutaTruncada);
          paradasHuerfanas.push(...pendientes);
          continue;
        }
        // Ruta que aún no había salido del almacén (ruta.minutoSalida >= tAveria): se cancela y reasigna
        paradasHuerfanas.push(...ruta.paradas);
      }

      rutasActuales = nuevasRutas;

      if (paradasHuerfanas.length > 0) {
        paradasHuerfanas.sort((a, b) => a.minutoLimite - b.minutoLimite);

        // Unidades inmovilizadas en tAveria
        const averiadasEnT = new Set(
          averiasOrdenadas
            .filter(
              (a) =>
                a.minutoSimulacion <= tAveria &&
                tAveria < minutoFinDeAveria(a.tipo, a.minutoSimulacion),
            )
            .map((a) => a.codigoUnidad),
        );
        const enMantenimientoSet = new Set(unidadesEnMantenimiento);

        const unidadesOperativas = flota.filter(
          (u) => !averiadasEnT.has(u.codigo) && !enMantenimientoSet.has(u.codigo),
        );

        const bloqueosActivosEnRescate = [
          ...bloqueosBase.filter((b) => b.finMinuto > tAveria),
          ...bloqueosTiempoReal.filter(
            (b) => b.inicioMinuto <= tAveria && b.finMinuto > tAveria,
          ),
        ];
        const bloqueosPosterioresARescate = bloqueosTiempoReal.filter(
          (b) => b.inicioMinuto > tAveria,
        );
        const redRescate = construirRedBloqueada(bloqueosActivosEnRescate);

        const pendientesPorReasignar = [...paradasHuerfanas];

        while (pendientesPorReasignar.length > 0) {
          const primeraParada = pendientesPorReasignar[0];

          // Evaluar disponibilidad de cada unidad operativa a partir de tAveria (nunca antes de tAveria)
          let mejorCandidata: {
            unidad: UnidadDto;
            minutoDisponible: number;
            codigoAlmacen: string;
            ubicacionAlmacen: NodoMapa;
            puntajeLlegada: number;
          } | null = null;

          for (const unidad of unidadesOperativas) {
            if (unidad.capacidad < primeraParada.cantidadProducto) {
              continue;
            }
            const rutasDeUnidad = rutasActuales
              .filter((r) => r.codigoUnidad === unidad.codigo)
              .sort((a, b) => a.minutoSalida - b.minutoSalida);

            let minutoDisponible = tAveria;
            let codigoAlmacen = "AC";
            let ubicacionAlmacen: NodoMapa = [unidad.posX, unidad.posY];

            if (rutasDeUnidad.length > 0) {
              const ultima = rutasDeUnidad[rutasDeUnidad.length - 1];
              if (ultima.truncadaPorAveria) {
                continue;
              }
              if (ultima.minutoFin > tAveria) {
                minutoDisponible = ultima.minutoFin;
              }
              codigoAlmacen = ultima.almacenDestino ?? ultima.almacenOrigen;
              const ultNodo = ultima.recorrido[ultima.recorrido.length - 1];
              if (ultNodo) {
                ubicacionAlmacen = [ultNodo[0], ultNodo[1]];
              }
            }

            const dist =
              Math.abs(ubicacionAlmacen[0] - primeraParada.posX) +
              Math.abs(ubicacionAlmacen[1] - primeraParada.posY);
            const puntajeLlegada =
              minutoDisponible + (dist / Math.max(1, unidad.velocidadKmh)) * 60;

            if (
              !mejorCandidata ||
              minutoDisponible < mejorCandidata.minutoDisponible ||
              (minutoDisponible === mejorCandidata.minutoDisponible &&
                puntajeLlegada < mejorCandidata.puntajeLlegada)
            ) {
              mejorCandidata = {
                unidad,
                minutoDisponible,
                codigoAlmacen,
                ubicacionAlmacen,
                puntajeLlegada,
              };
            }
          }

          if (!mejorCandidata) {
            const sinAtender = pendientesPorReasignar.shift()!;
            pedidosSinAtender.push({
              codigoPedido: sinAtender.codigoPedido,
              clienteId: sinAtender.clienteId,
              posX: sinAtender.posX,
              posY: sinAtender.posY,
              cantidadProducto: sinAtender.cantidadProducto,
              plazoHoras: sinAtender.plazoHoras,
              minutoRegistro: sinAtender.minutoRegistro,
              minutoLimite: sinAtender.minutoLimite,
            });
            riesgosDeColapso.push(
              `Pedido ${sinAtender.codigoPedido} de la unidad averiada ${averia.codigoUnidad} sin unidad disponible en t=${tAveria}.`,
            );
            continue;
          }

          // Agrupar paradas huérfanas que caben en la capacidad de la unidad de rescate
          const lote: ParadaDto[] = [];
          let cargaAcumulada = 0;
          let idx = 0;
          while (idx < pendientesPorReasignar.length) {
            const candidata = pendientesPorReasignar[idx];
            if (cargaAcumulada + candidata.cantidadProducto <= mejorCandidata.unidad.capacidad) {
              lote.push(candidata);
              cargaAcumulada += candidata.cantidadProducto;
              pendientesPorReasignar.splice(idx, 1);
            } else {
              idx++;
            }
          }

          const rutaRescateBase = construirRutaRescate(
            mejorCandidata.unidad,
            mejorCandidata.codigoAlmacen,
            mejorCandidata.ubicacionAlmacen,
            lote,
            mejorCandidata.minutoDisponible,
            almacenes,
            redRescate,
          );
          const rutaRescate =
            bloqueosPosterioresARescate.length > 0
              ? adaptarRutaPorBloqueosTiempoReal(
                  rutaRescateBase,
                  bloqueosBase,
                  bloqueosPosterioresARescate,
                  mapaFlota,
                )
              : rutaRescateBase;
          rutasActuales.push(rutaRescate);
        }
      }
    }
  }

  // 4. Recalcular métricas operativas de la ejecución adaptada
  let pedidosAtendidos = 0;
  let entregasFueraDePlazo = 0;
  let distanciaTotalKm = 0;
  let costoOperativoTotal = 0;
  const unidadesActivas = new Set<string>();

  for (const r of rutasActuales) {
    pedidosAtendidos += r.paradas.length;
    for (const p of r.paradas) {
      if (!p.cumplePlazo) {
        entregasFueraDePlazo++;
      }
    }
    distanciaTotalKm += r.distanciaKm;
    costoOperativoTotal += r.costoSoles;
    if (r.paradas.length > 0 || r.truncadaPorAveria) {
      unidadesActivas.add(r.codigoUnidad);
    }
  }

  const pedidosVencidos = pedidosSinAtender.filter((p) => !p.fueraDeHorizonte).length;
  const pedidosEnEspera = pedidosSinAtender.filter((p) => Boolean(p.fueraDeHorizonte)).length;

  return {
    ...baseSinBloqueos,
    rutas: rutasActuales,
    pedidosSinAtender,
    riesgosDeColapso,
    metricas: {
      ...baseSinBloqueos.metricas,
      pedidosAtendidos,
      pedidosSinAtender: pedidosSinAtender.length,
      pedidosVencidos,
      pedidosEnEspera,
      entregasFueraDePlazo,
      unidadesEnRuta: unidadesActivas.size,
      distanciaTotalKm: Number(distanciaTotalKm.toFixed(2)),
      costoOperativoTotal: Number(costoOperativoTotal.toFixed(2)),
    },
  };
}
