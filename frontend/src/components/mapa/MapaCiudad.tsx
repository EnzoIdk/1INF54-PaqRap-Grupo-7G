import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Crosshair, MapPinned, Maximize2, Minus, Plus } from "lucide-react";
import type { AlmacenDto, BloqueoDto, RutaDto } from "../../types/Experimentacion";
import type { EstadoPedidoEnMapa, PosicionUnidad } from "../../hooks/usePosicionesFlota";
import { useTamanoContenedor } from "../../hooks/useTamanoContenedor";
import { crearEscalaMapa, type EscalaMapa } from "../../utils/coordenadas";
import type { AveriaVigente } from "../../utils/averias";
import CapaAlmacenes from "./CapaAlmacenes";
import CapaBloqueos from "./CapaBloqueos";
import CapaPedidos from "./CapaPedidos";
import CapaReticula from "./CapaReticula";
import CapaRutas from "./CapaRutas";
import CapaUnidades from "./CapaUnidades";
import SugerenciaUnidades from "./SugerenciaUnidades";
import "./MapaCiudad.css";

interface MapaCiudadProps {
  almacenes: AlmacenDto[];
  bloqueos: BloqueoDto[];
  rutas: RutaDto[];
  unidades: PosicionUnidad[];
  pedidos: EstadoPedidoEnMapa[];
  averias: AveriaVigente[];
  unidadesEnMantenimiento: string[];
  unidadEnfocada: string | null;
  onEnfocar: (codigoUnidad: string | null) => void;
  almacenEnfocado?: string | null;
  onSeleccionarAlmacen?: (codigoAlmacen: string | null) => void;
  minutoActual: number;
  umbralAmbarPorcentaje: number;
  umbralRojoPorcentaje: number;
  /** Elementos flotantes sobre el mapa (leyenda, indicadores, avisos). */
  children?: ReactNode;
}

interface Vista {
  zoom: number;
  dx: number;
  dy: number;
}

interface Sugerencia {
  codigos: string[];
  x: number;
  y: number;
}

const VISTA_INICIAL: Vista = { zoom: 1, dx: 0, dy: 0 };
const ZOOM_MINIMO = 0.5;
const ZOOM_MAXIMO = 8;
const PASO_BOTON = 1.5;
/** Márgenes del lienzo: a la izquierda y abajo van los números y el título de cada eje. */
const MARGEN = { izquierdo: 52, inferior: 42, superior: 12, derecho: 14 };

/**
 * Mapa de la ciudad (STD 2.6.3) con zoom continuo y desplazamiento
 * (rúbrica C08): rueda del ratón centrada en el cursor, arrastre para
 * moverse, doble clic para acercar y botones +, − y «Ajustar».
 *
 * El zoom no escala píxeles: recalcula la escala de coordenadas, de modo que
 * líneas, iconos y textos conservan su tamaño y su nitidez. El mapa queda
 * siempre pegado a los bordes izquierdo y superior: al alejarse (hasta 50 %)
 * se encoge hacia esa esquina y al acercarse no se despega de ella.
 */
const MapaCiudad = ({
  almacenes,
  bloqueos,
  rutas,
  unidades,
  pedidos,
  averias,
  unidadesEnMantenimiento,
  unidadEnfocada,
  onEnfocar,
  almacenEnfocado = null,
  onSeleccionarAlmacen,
  minutoActual,
  umbralAmbarPorcentaje,
  umbralRojoPorcentaje,
  children,
}: MapaCiudadProps) => {
  const [referencia, tamano] = useTamanoContenedor<HTMLDivElement>();
  const [vista, setVista] = useState<Vista>(VISTA_INICIAL);
  const vistaRef = useRef(vista);
  vistaRef.current = vista;
  const animacionRef = useRef<number | null>(null);
  const arrastreRef = useRef<{ x: number; y: number; dx: number; dy: number; movido: boolean } | null>(null);
  /** El último gesto fue un arrastre: el clic que lo cierra no selecciona nada. */
  const huboArrastreRef = useRef(false);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [sugerencia, setSugerencia] = useState<Sugerencia | null>(null);
  const ocultarRef = useRef<number | null>(null);

  const base = useMemo(
    () => crearEscalaMapa(tamano.ancho, tamano.alto, MARGEN.izquierdo, MARGEN.inferior, MARGEN.superior, MARGEN.derecho),
    [tamano.ancho, tamano.alto],
  );
  const escala = useMemo(() => aplicarVista(base, vista), [base, vista]);
  const umbrales = useMemo(
    () => ({ umbralAmbarPorcentaje, umbralRojoPorcentaje }),
    [umbralAmbarPorcentaje, umbralRojoPorcentaje],
  );

  const acotar = useCallback(
    (propuesta: Vista): Vista => {
      const zoom = Math.min(ZOOM_MAXIMO, Math.max(ZOOM_MINIMO, propuesta.zoom));
      // El borde izquierdo y el superior del mapa nunca se despegan de su sitio...
      const maximoX = base.margenIzquierdo * (1 - zoom);
      const maximoY = base.margenSuperior * (1 - zoom);
      // ...y al acercarse se puede desplazar hasta ver su borde derecho o inferior: donde
      // quedan a ese zoom en el contenedor, o al menos donde estaban a tamaño completo
      // (así el paneo lateral funciona aunque el mapa ampliado aún no llene el ancho).
      const derecha = base.margenIzquierdo + base.anchoUtil;
      const abajo = base.margenSuperior + base.altoUtil;
      const minimoX = Math.min(maximoX, tamano.ancho - MARGEN.derecho - derecha * zoom, derecha * (1 - zoom));
      const minimoY = Math.min(maximoY, tamano.alto - MARGEN.inferior - abajo * zoom, abajo * (1 - zoom));
      return {
        zoom,
        dx: Math.min(maximoX, Math.max(minimoX, propuesta.dx)),
        dy: Math.min(maximoY, Math.max(minimoY, propuesta.dy)),
      };
    },
    [base, tamano.ancho, tamano.alto],
  );

  const cancelarOcultar = useCallback(() => {
    if (ocultarRef.current !== null) {
      window.clearTimeout(ocultarRef.current);
      ocultarRef.current = null;
    }
  }, []);
  // Breve espera antes de ocultar la ficha: da tiempo a llevar el cursor hasta ella.
  const programarOcultar = useCallback(() => {
    cancelarOcultar();
    ocultarRef.current = window.setTimeout(() => setSugerencia(null), 200);
  }, [cancelarOcultar]);
  const sobrevolar = useCallback(
    (codigos: string[], x: number, y: number) => {
      cancelarOcultar();
      if (!arrastreRef.current?.movido) {
        setSugerencia({ codigos, x, y });
      }
    },
    [cancelarOcultar],
  );

  /** Acerca o aleja manteniendo fijo el punto (px, py) de la pantalla. */
  const zoomEnPunto = useCallback((actual: Vista, nuevoZoom: number, px: number, py: number): Vista => {
    const zoom = Math.min(ZOOM_MAXIMO, Math.max(ZOOM_MINIMO, nuevoZoom));
    const relacion = zoom / actual.zoom;
    return { zoom, dx: px - (px - actual.dx) * relacion, dy: py - (py - actual.dy) * relacion };
  }, []);

  /** Transición suave de 220 ms hacia una vista destino (botones y centrado). */
  const animarHacia = useCallback(
    (destino: Vista) => {
      if (animacionRef.current !== null) {
        cancelAnimationFrame(animacionRef.current);
      }
      const origen = vistaRef.current;
      const final = acotar(destino);
      const inicio = performance.now();
      const paso = (ahora: number) => {
        const t = Math.min(1, (ahora - inicio) / 220);
        const suave = 1 - (1 - t) ** 3;
        setVista({
          zoom: origen.zoom + (final.zoom - origen.zoom) * suave,
          dx: origen.dx + (final.dx - origen.dx) * suave,
          dy: origen.dy + (final.dy - origen.dy) * suave,
        });
        animacionRef.current = t < 1 ? requestAnimationFrame(paso) : null;
      };
      animacionRef.current = requestAnimationFrame(paso);
    },
    [acotar],
  );

  // La rueda se escucha sin "passive" para poder evitar el desplazamiento de la página.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) {
      return;
    }
    const alGirar = (evento: WheelEvent) => {
      evento.preventDefault();
      setSugerencia(null);
      const caja = svg.getBoundingClientRect();
      const factor = Math.exp(-evento.deltaY * 0.0015);
      setVista((actual) =>
        acotar(zoomEnPunto(actual, actual.zoom * factor, evento.clientX - caja.left, evento.clientY - caja.top)),
      );
    };
    svg.addEventListener("wheel", alGirar, { passive: false });
    return () => svg.removeEventListener("wheel", alGirar);
  }, [acotar, zoomEnPunto, tamano.ancho, tamano.alto]);

  useEffect(() => () => {
    if (animacionRef.current !== null) {
      cancelAnimationFrame(animacionRef.current);
    }
    if (ocultarRef.current !== null) {
      window.clearTimeout(ocultarRef.current);
    }
  }, []);

  const centro = { x: tamano.ancho / 2, y: tamano.alto / 2 };
  const unidadSeleccionada = unidades.find((unidad) => unidad.codigoUnidad === unidadEnfocada);

  const centrarEn = (posX: number, posY: number) => {
    const zoom = Math.max(vistaRef.current.zoom, 2.5);
    animarHacia({
      zoom,
      dx: centro.x - base.aX(posX) * zoom,
      dy: centro.y - base.aY(posY) * zoom,
    });
  };

  const listo = tamano.ancho > 0 && tamano.alto > 0;

  return (
    <div className={`mapa tarjeta ${vista.zoom > 1.01 ? "mapa--ampliado" : ""}`} ref={referencia}>
      {!listo ? null : (
        <svg
          ref={svgRef}
          className="mapa__lienzo"
          width={tamano.ancho}
          height={tamano.alto}
          role="img"
          aria-label="Mapa de la ciudad con las rutas de la flota"
          onPointerDown={(evento) => {
            if (evento.button !== 0) {
              return;
            }
            huboArrastreRef.current = false;
            arrastreRef.current = {
              x: evento.clientX,
              y: evento.clientY,
              dx: vistaRef.current.dx,
              dy: vistaRef.current.dy,
              movido: false,
            };
          }}
          onPointerMove={(evento) => {
            const arrastre = arrastreRef.current;
            if (!arrastre) {
              return;
            }
            const desplazadoX = evento.clientX - arrastre.x;
            const desplazadoY = evento.clientY - arrastre.y;
            if (!arrastre.movido && Math.hypot(desplazadoX, desplazadoY) < 4) {
              return;
            }
            if (!arrastre.movido) {
              arrastre.movido = true;
              huboArrastreRef.current = true;
              setSugerencia(null);
              evento.currentTarget.setPointerCapture(evento.pointerId);
            }
            setVista((actual) =>
              acotar({ zoom: actual.zoom, dx: arrastre.dx + desplazadoX, dy: arrastre.dy + desplazadoY }),
            );
          }}
          onPointerUp={(evento) => {
            const arrastre = arrastreRef.current;
            arrastreRef.current = null;
            if (arrastre?.movido) {
              evento.currentTarget.releasePointerCapture(evento.pointerId);
            }
          }}
          onClickCapture={(evento) => {
            // Tras arrastrar, el clic que sigue no debe seleccionar ni deseleccionar nada.
            if (huboArrastreRef.current) {
              evento.stopPropagation();
              huboArrastreRef.current = false;
            }
          }}
          onClick={(evento) => {
            if (evento.target === evento.currentTarget || (evento.target as Element).classList?.contains("mapa__fondo")) {
              onEnfocar(null);
              onSeleccionarAlmacen?.(null);
            }
          }}
          onDoubleClick={(evento) => {
            const caja = evento.currentTarget.getBoundingClientRect();
            animarHacia(
              zoomEnPunto(vistaRef.current, vistaRef.current.zoom * 2, evento.clientX - caja.left, evento.clientY - caja.top),
            );
          }}
        >
          <CapaReticula escala={escala} />
          <CapaBloqueos bloqueos={bloqueos} escala={escala} minutoActual={minutoActual} />
          <CapaRutas
            rutas={rutas}
            posiciones={unidades}
            escala={escala}
            unidadEnfocada={unidadEnfocada}
            minutoActual={minutoActual}
          />
          <CapaPedidos pedidos={pedidos} escala={escala} unidadEnfocada={unidadEnfocada} />
          <CapaAlmacenes
            almacenes={almacenes}
            escala={escala}
            umbralAmbarPorcentaje={umbralAmbarPorcentaje}
            umbralRojoPorcentaje={umbralRojoPorcentaje}
            almacenEnfocado={almacenEnfocado}
            onSeleccionar={onSeleccionarAlmacen}
          />
          <CapaUnidades
            unidades={unidades}
            escala={escala}
            averias={averias}
            unidadesEnMantenimiento={unidadesEnMantenimiento}
            unidadEnfocada={unidadEnfocada}
            onEnfocar={onEnfocar}
            umbrales={umbrales}
            onSobrevolar={sobrevolar}
            onDejarDeSobrevolar={programarOcultar}
          />
        </svg>
      )}

      {listo && sugerencia && (
        <SugerenciaUnidades
          unidades={sugerencia.codigos
            .map((codigo) => unidades.find((unidad) => unidad.codigoUnidad === codigo))
            .filter((unidad): unidad is PosicionUnidad => unidad !== undefined)}
          averias={averias}
          unidadesEnMantenimiento={unidadesEnMantenimiento}
          umbrales={umbrales}
          x={sugerencia.x}
          y={sugerencia.y}
          anchoMapa={tamano.ancho}
          altoMapa={tamano.alto}
          onEnfocar={(codigo) => {
            setSugerencia(null);
            onEnfocar(codigo);
          }}
          onEntrar={cancelarOcultar}
          onSalir={programarOcultar}
        />
      )}

      {listo && (
        <div className="mapa__zoom" role="group" aria-label="Zoom del mapa">
          <button
            type="button"
            title="Acercar (o rueda del ratón)"
            aria-label="Acercar"
            onClick={() => animarHacia(zoomEnPunto(vistaRef.current, vistaRef.current.zoom * PASO_BOTON, centro.x, centro.y))}
          >
            <Plus size={16} />
          </button>
          <span className="mapa__zoom-valor cifra">{Math.round(vista.zoom * 100)} %</span>
          <button
            type="button"
            title="Alejar"
            aria-label="Alejar"
            onClick={() => animarHacia(zoomEnPunto(vistaRef.current, vistaRef.current.zoom / PASO_BOTON, centro.x, centro.y))}
          >
            <Minus size={16} />
          </button>
          <button
            type="button"
            title="Ajustar el mapa completo"
            aria-label="Ajustar el mapa completo"
            disabled={vista.zoom === 1 && vista.dx === 0 && vista.dy === 0}
            onClick={() => animarHacia(VISTA_INICIAL)}
          >
            <Maximize2 size={15} />
          </button>
          {unidadSeleccionada && (
            <button
              type="button"
              title={`Centrar en ${unidadSeleccionada.codigoUnidad}`}
              aria-label={`Centrar en ${unidadSeleccionada.codigoUnidad}`}
              onClick={() => centrarEn(unidadSeleccionada.x, unidadSeleccionada.y)}
            >
              <Crosshair size={15} />
            </button>
          )}
        </div>
      )}

      {children}

      {rutas.length === 0 && listo && (
        <div className="mapa__vacio">
          <MapPinned size={30} aria-hidden />
          <span className="estado-vacio__titulo">Todavía no hay un plan que mostrar</span>
          <span>Ejecute la experimentación numérica desde la Consola de Simulación.</span>
        </div>
      )}
    </div>
  );
};

/** Escala resultante de aplicar el zoom y el desplazamiento a la escala base. */
function aplicarVista(base: EscalaMapa, vista: Vista): EscalaMapa {
  if (vista.zoom === 1 && vista.dx === 0 && vista.dy === 0) {
    return base;
  }
  return {
    factor: base.factor * vista.zoom,
    margenIzquierdo: vista.dx + base.margenIzquierdo * vista.zoom,
    margenSuperior: vista.dy + base.margenSuperior * vista.zoom,
    anchoUtil: base.anchoUtil * vista.zoom,
    altoUtil: base.altoUtil * vista.zoom,
    aX: (posX: number) => vista.dx + base.aX(posX) * vista.zoom,
    aY: (posY: number) => vista.dy + base.aY(posY) * vista.zoom,
  };
}

export default MapaCiudad;
