import { useMemo } from "react";
import { MapPinned } from "lucide-react";
import type { AlmacenDto, BloqueoDto, RutaDto } from "../../types/Experimentacion";
import type { EstadoPedidoEnMapa, PosicionUnidad } from "../../hooks/usePosicionesFlota";
import { useTamanoContenedor } from "../../hooks/useTamanoContenedor";
import { crearEscalaMapa } from "../../utils/coordenadas";
import CapaAlmacenes from "./CapaAlmacenes";
import CapaBloqueos from "./CapaBloqueos";
import CapaPedidos from "./CapaPedidos";
import CapaReticula from "./CapaReticula";
import CapaRutas from "./CapaRutas";
import CapaUnidades from "./CapaUnidades";
import "./MapaCiudad.css";

interface MapaCiudadProps {
  almacenes: AlmacenDto[];
  bloqueos: BloqueoDto[];
  rutas: RutaDto[];
  unidades: PosicionUnidad[];
  pedidos: EstadoPedidoEnMapa[];
  unidadesAveriadas: string[];
  unidadesEnMantenimiento: string[];
  unidadEnfocada: string | null;
  onEnfocar: (codigoUnidad: string | null) => void;
  minutoActual: number;
  umbralAmbarPorcentaje: number;
  umbralRojoPorcentaje: number;
}

/**
 * Mapa bidimensional de la ciudad: la retícula de 70 x 50 km con el origen
 * (0,0) en la esquina inferior izquierda, sobre la que se plasma el
 * movimiento de la flota (STD 2.6.3).
 *
 * <p>Compone las capas en el orden en que deben superponerse: primero la
 * retícula, despues los bloqueos y las rutas, y por ultimo los pedidos, los
 * almacenes y las unidades, que son los elementos con los que el supervisor
 * interactua.</p>
 */
const MapaCiudad = ({
  almacenes,
  bloqueos,
  rutas,
  unidades,
  pedidos,
  unidadesAveriadas,
  unidadesEnMantenimiento,
  unidadEnfocada,
  onEnfocar,
  minutoActual,
  umbralAmbarPorcentaje,
  umbralRojoPorcentaje,
}: MapaCiudadProps) => {
  const [referencia, tamano] = useTamanoContenedor<HTMLDivElement>();
  const escala = useMemo(() => crearEscalaMapa(tamano.ancho, tamano.alto), [tamano.ancho, tamano.alto]);

  const listo = tamano.ancho > 0 && tamano.alto > 0;

  return (
    <div className="mapa tarjeta" ref={referencia}>
      {!listo ? null : (
        <svg
          className="mapa__lienzo"
          width={tamano.ancho}
          height={tamano.alto}
          role="img"
          aria-label="Mapa de la ciudad con las rutas de la flota"
          onClick={(evento) => {
            if (evento.target === evento.currentTarget) {
              onEnfocar(null);
            }
          }}
        >
          <CapaReticula escala={escala} />
          <CapaBloqueos bloqueos={bloqueos} escala={escala} minutoActual={minutoActual} />
          <CapaRutas rutas={rutas} posiciones={unidades} escala={escala} unidadEnfocada={unidadEnfocada} />
          <CapaPedidos pedidos={pedidos} escala={escala} unidadEnfocada={unidadEnfocada} />
          <CapaAlmacenes
            almacenes={almacenes}
            escala={escala}
            umbralAmbarPorcentaje={umbralAmbarPorcentaje}
            umbralRojoPorcentaje={umbralRojoPorcentaje}
          />
          <CapaUnidades
            unidades={unidades}
            escala={escala}
            unidadesAveriadas={unidadesAveriadas}
            unidadesEnMantenimiento={unidadesEnMantenimiento}
            unidadEnfocada={unidadEnfocada}
            onEnfocar={onEnfocar}
            minutoActual={minutoActual}
          />
        </svg>
      )}

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

export default MapaCiudad;
