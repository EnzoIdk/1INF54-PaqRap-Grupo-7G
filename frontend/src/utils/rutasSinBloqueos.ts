import type { BloqueoDto, EjecucionDto, NodoMapa, RutaDto } from "../types/Experimentacion";
import { ALTO_MAPA_KM, ANCHO_MAPA_KM } from "./constants";

const ANCHO_NODOS = ANCHO_MAPA_KM + 1;
const ALTO_NODOS = ALTO_MAPA_KM + 1;
const TOTAL_NODOS = ANCHO_NODOS * ALTO_NODOS;
const DX = [1, -1, 0, 0];
const DY = [0, 0, 1, -1];

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
