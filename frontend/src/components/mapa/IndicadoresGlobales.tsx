import { memo, type ReactNode } from "react";
import { Truck, Warehouse } from "lucide-react";
import type { PosicionUnidad } from "../../hooks/usePosicionesFlota";
import type { AlmacenDto } from "../../types/Experimentacion";
import { calcularSemaforoAlmacen } from "../../hooks/useSemaforoAlmacen";
import { COLOR_NIVEL, ETIQUETA_NIVEL, nivelPorFraccion, type UmbralesSemaforo } from "../../utils/semaforo";
import "./IndicadoresGlobales.css";

interface IndicadoresGlobalesProps {
  unidades: PosicionUnidad[];
  almacenes: AlmacenDto[];
  umbrales: UmbralesSemaforo;
}

/**
 * Indicadores globales sobre el mapa (rúbrica G01-G04): la ocupación de toda
 * la flota (paquetes a bordo / capacidad total) y la disponibilidad de los
 * almacenes intermedios en conjunto, cada una con su semáforo + vacío.
 */
const IndicadoresGlobales = ({ unidades, almacenes, umbrales }: IndicadoresGlobalesProps) => {
  const aBordo = unidades.reduce((total, unidad) => total + unidad.cargaRestante, 0);
  const capacidad = unidades.reduce((total, unidad) => total + unidad.capacidad, 0);
  const ocupacionFlota = capacidad > 0 ? aBordo / capacidad : 0;
  const nivelFlota = nivelPorFraccion(aBordo, ocupacionFlota, umbrales);
  const enRuta = unidades.filter((unidad) => !unidad.enAlmacen && !unidad.finalizada).length;

  const intermedios = almacenes.filter((almacen) => almacen.tipo !== "CENTRAL");
  const stock = intermedios.reduce((total, almacen) => total + almacen.stockActual, 0);
  const maximo = intermedios.reduce((total, almacen) => total + almacen.stockMaximo, 0);
  const semaforoAlmacenes = calcularSemaforoAlmacen(stock, maximo, umbrales);

  return (
    <div className="indicadores-globales" aria-label="Indicadores globales">
      <Indicador
        icono={<Truck size={14} aria-hidden />}
        rotulo="Ocupación de la flota"
        valor={`${Math.round(ocupacionFlota * 100)} %`}
        detalle={`${aBordo}/${capacidad} paq. · ${enRuta}/${unidades.length} en ruta`}
        color={COLOR_NIVEL[nivelFlota]}
        nivel={ETIQUETA_NIVEL[nivelFlota]}
        fraccion={ocupacionFlota}
      />
      <Indicador
        icono={<Warehouse size={14} aria-hidden />}
        rotulo="Stock de almacenes"
        valor={`${Math.round(semaforoAlmacenes.porcentajeDisponible * 100)} %`}
        detalle={`${stock}/${maximo} u disponibles`}
        color={semaforoAlmacenes.colorCss}
        nivel={ETIQUETA_NIVEL[semaforoAlmacenes.color]}
        fraccion={semaforoAlmacenes.porcentajeDisponible}
      />
    </div>
  );
};

interface IndicadorProps {
  icono: ReactNode;
  rotulo: string;
  valor: string;
  detalle: string;
  color: string;
  nivel: string;
  fraccion: number;
}

const Indicador = ({ icono, rotulo, valor, detalle, color, nivel, fraccion }: IndicadorProps) => (
  <div className="indicadores-globales__item" title={`${rotulo}: ${valor} · semáforo ${nivel.toLowerCase()} · ${detalle}`}>
    <span className="indicadores-globales__cabecera">
      {icono}
      {rotulo}
    </span>
    <span className="indicadores-globales__valor">
      <span className="indicadores-globales__punto" style={{ backgroundColor: color }} />
      <strong className="cifra">{valor}</strong>
      <span className="indicadores-globales__nivel" style={{ color }}>
        {nivel}
      </span>
    </span>
    <span className="indicadores-globales__barra">
      <span style={{ width: `${Math.min(100, fraccion * 100)}%`, backgroundColor: color }} />
    </span>
    <span className="indicadores-globales__detalle cifra">{detalle}</span>
  </div>
);

export default memo(IndicadoresGlobales);
