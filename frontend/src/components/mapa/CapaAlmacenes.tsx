import { memo } from "react";
import { aCoordenadaPantalla } from "../../utils/coordenadas";
import { useSemaforoAlmacen } from "../../hooks/useSemaforoAlmacen";
import Badge from "../comunes/Badge";

interface AlmacenMapa {
  id: number;
  posX: number;
  posY: number;
  stockActual: number;
  stockMaximo: number;
  umbralAmbarPorcentaje: number;
  umbralRojoPorcentaje: number;
}

interface CapaAlmacenesProps {
  almacenes: AlmacenMapa[];
}

const MarcadorAlmacen = ({ almacen }: { almacen: AlmacenMapa }) => {
  const posicion = aCoordenadaPantalla(almacen.posX, almacen.posY);
  const semaforo = useSemaforoAlmacen(almacen.stockActual, almacen.stockMaximo, almacen);

  return (
    <div
      style={{
        position: "absolute",
        left: `${posicion.left}%`,
        top: `${posicion.top}%`,
        transform: "translate(-50%, -50%)",
      }}
    >
      <Badge texto={`${almacen.stockActual}/${almacen.stockMaximo}`} colorFondo={semaforo.colorCss} />
    </div>
  );
};

/**
 * Dibuja los almacenes sobre el mapa con su semaforo de stock. El color
 * nunca es el unico portador de informacion: siempre se acompaña de la
 * cifra de stock (STD 5.6).
 */
const CapaAlmacenes = ({ almacenes }: CapaAlmacenesProps) => (
  <>
    {almacenes.map((almacen) => (
      <MarcadorAlmacen key={almacen.id} almacen={almacen} />
    ))}
  </>
);

export default memo(CapaAlmacenes);
