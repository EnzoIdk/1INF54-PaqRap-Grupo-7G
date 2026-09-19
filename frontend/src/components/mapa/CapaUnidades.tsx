import { memo } from "react";
import { aCoordenadaPantalla } from "../../utils/coordenadas";
import type { UnidadTransporteEstado, TipoUnidad } from "../../types/EstadoUnidad";

const COLOR_POR_TIPO: Record<TipoUnidad, string> = {
  AUTO: "var(--color-tipo-auto)",
  MOTO: "var(--color-tipo-moto)",
  BICICLETA: "var(--color-tipo-bicicleta)",
};

const ICONO_POR_TIPO: Record<TipoUnidad, string> = {
  AUTO: "■",
  MOTO: "▲",
  BICICLETA: "●",
};

interface CapaUnidadesProps {
  unidades: UnidadTransporteEstado[];
}

/**
 * Dibuja las unidades de transporte sobre el mapa, distinguidas por forma,
 * icono y color segun su tipo, y rotuladas con su codigo TTNN (STD 5.6).
 */
const CapaUnidades = ({ unidades }: CapaUnidadesProps) => (
  <>
    {unidades.map((unidad) => {
      const posicion = aCoordenadaPantalla(unidad.posX, unidad.posY);
      return (
        <div
          key={unidad.codigo}
          title={`${unidad.codigo} - ${unidad.estado}`}
          style={{
            position: "absolute",
            left: `${posicion.left}%`,
            top: `${posicion.top}%`,
            color: COLOR_POR_TIPO[unidad.tipoUnidad],
            transform: "translate(-50%, -50%)",
            fontSize: 14,
            textAlign: "center",
          }}
        >
          <div>{ICONO_POR_TIPO[unidad.tipoUnidad]}</div>
          <div style={{ fontSize: 10 }}>{unidad.codigo}</div>
        </div>
      );
    })}
  </>
);

export default memo(CapaUnidades);
