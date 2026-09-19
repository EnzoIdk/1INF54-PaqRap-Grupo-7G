import Tabla from "../comunes/Tabla";
import Badge from "../comunes/Badge";
import type { UnidadTransporteEstado } from "../../types/EstadoUnidad";

const COLOR_ESTADO: Record<UnidadTransporteEstado["estado"], string> = {
  DISPONIBLE: "var(--color-semaforo-verde)",
  EN_RUTA: "var(--color-primario)",
  EN_PAUSA: "var(--color-semaforo-ambar)",
  EN_MANTENIMIENTO: "var(--color-texto-tenue)",
  AVERIADA: "var(--color-semaforo-rojo)",
};

interface PanelFlotaProps {
  unidades: UnidadTransporteEstado[];
}

/** Tabla de estado de la flota de unidades de transporte. */
const PanelFlota = ({ unidades }: PanelFlotaProps) => (
  <section>
    <h2>Flota</h2>
    <Tabla
      obtenerLlave={(unidad) => unidad.codigo}
      filas={unidades}
      columnas={[
        { encabezado: "Codigo", renderizar: (unidad) => unidad.codigo },
        { encabezado: "Tipo", renderizar: (unidad) => unidad.tipoUnidad },
        {
          encabezado: "Estado",
          renderizar: (unidad) => <Badge texto={unidad.estado} colorFondo={COLOR_ESTADO[unidad.estado]} />,
        },
      ]}
    />
  </section>
);

export default PanelFlota;
