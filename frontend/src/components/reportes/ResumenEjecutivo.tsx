import { useMemo, useState } from "react";
import { CircleAlert, CircleCheck, Lightbulb, TriangleAlert } from "lucide-react";
import Tabs from "../comunes/Tabs";
import type { EjecucionDto, EscenarioDto } from "../../types/Experimentacion";
import { formatearKm, formatearSoles } from "../../utils/formatters";
import {
  distribucionHolgura,
  evolucionOperacion,
  generarHallazgos,
  type GravedadHallazgo,
  type TramoOperacion,
} from "../../utils/hallazgos";
import "./ReportesDesempeno.css";
import "./ResumenEjecutivo.css";

interface ResumenEjecutivoProps {
  escenario: EscenarioDto;
  ejecuciones: EjecucionDto[];
}

const ICONO: Record<GravedadHallazgo, typeof CircleCheck> = {
  critico: CircleAlert,
  atencion: TriangleAlert,
  bien: CircleCheck,
};

const ROTULO: Record<GravedadHallazgo, string> = {
  critico: "Crítico",
  atencion: "Atención",
  bien: "En orden",
};

/**
 * Resumen ejecutivo del Analytics: qué dicen los indicadores (hallazgos con
 * gravedad y recomendación), cómo evolucionó la operación en el tiempo y con
 * cuánto margen llegaron las entregas.
 */
const ResumenEjecutivo = ({ escenario, ejecuciones }: ResumenEjecutivoProps) => {
  const [algoritmo, setAlgoritmo] = useState(ejecuciones[0]?.algoritmo ?? "");
  const ejecucion = ejecuciones.find((candidata) => candidata.algoritmo === algoritmo) ?? ejecuciones[0];

  const hallazgos = useMemo(() => (ejecucion ? generarHallazgos(ejecucion) : []), [ejecucion]);
  const tramos = useMemo(
    () => (ejecucion ? evolucionOperacion(ejecucion, escenario.minutoInicio, escenario.minutoFin) : []),
    [ejecucion, escenario.minutoInicio, escenario.minutoFin],
  );
  const holgura = useMemo(() => (ejecucion ? distribucionHolgura(ejecucion) : []), [ejecucion]);

  if (!ejecucion) {
    return null;
  }
  const criticos = hallazgos.filter((hallazgo) => hallazgo.gravedad === "critico").length;
  const atencion = hallazgos.filter((hallazgo) => hallazgo.gravedad === "atencion").length;
  const variosDias = escenario.minutoFin - escenario.minutoInicio > 1440;

  return (
    <section className="tarjeta resumen-ejecutivo">
      <header className="tarjeta__encabezado">
        <div>
          <h2 className="tarjeta__titulo">
            <Lightbulb size={16} aria-hidden /> Resumen ejecutivo
          </h2>
          <p className="tarjeta__contexto">
            {criticos > 0
              ? `${criticos} punto(s) crítico(s) y ${atencion} por vigilar en el plan de ${ejecucion.algoritmo}.`
              : atencion > 0
                ? `Sin puntos críticos; ${atencion} aspecto(s) por vigilar en el plan de ${ejecucion.algoritmo}.`
                : `El plan de ${ejecucion.algoritmo} no muestra problemas.`}
          </p>
        </div>
        {ejecuciones.length > 1 && (
          <Tabs
            opciones={ejecuciones.map((candidata) => ({ id: candidata.algoritmo, etiqueta: candidata.algoritmo }))}
            activa={ejecucion.algoritmo}
            onCambiar={setAlgoritmo}
          />
        )}
      </header>

      <div className="tarjeta__cuerpo resumen-ejecutivo__cuerpo">
        <ul className="resumen-ejecutivo__hallazgos">
          {hallazgos.map((hallazgo) => {
            const Icono = ICONO[hallazgo.gravedad];
            return (
              <li key={hallazgo.id} className={`hallazgo hallazgo--${hallazgo.gravedad}`}>
                <Icono size={17} aria-hidden className="hallazgo__icono" />
                <div>
                  <span className="hallazgo__gravedad">{ROTULO[hallazgo.gravedad]}</span>
                  <strong className="hallazgo__titulo">{hallazgo.titulo}</strong>
                  <p className="hallazgo__detalle">{hallazgo.detalle}</p>
                  {hallazgo.recomendacion && <p className="hallazgo__recomendacion">→ {hallazgo.recomendacion}</p>}
                </div>
              </li>
            );
          })}
        </ul>

        <div className="resumen-ejecutivo__graficos">
          <Evolucion tramos={tramos} variosDias={variosDias} />
          <Holgura franjas={holgura} />
        </div>
      </div>
    </section>
  );
};

const Evolucion = ({ tramos, variosDias }: { tramos: TramoOperacion[]; variosDias: boolean }) => {
  const ancho = 520;
  const alto = 190;
  const margen = { izquierda: 30, derecha: 8, arriba: 10, abajo: 26 };
  const maximo = Math.max(1, ...tramos.map((tramo) => tramo.entregas + tramo.sinAtender));
  const anchoTramo = (ancho - margen.izquierda - margen.derecha) / Math.max(1, tramos.length);
  const aY = (valor: number) => margen.arriba + (alto - margen.arriba - margen.abajo) * (1 - valor / maximo);
  const altura = (valor: number) => aY(0) - aY(valor);
  const marcas = [0, Math.round(maximo / 2), maximo];
  const totalCosto = tramos.reduce((total, tramo) => total + tramo.costo, 0);
  const totalKm = tramos.reduce((total, tramo) => total + tramo.km, 0);

  return (
    <div className="resumen-ejecutivo__bloque">
      <h3 className="rotulo">{variosDias ? "Evolución por día" : "Evolución por franja de 2 horas"}</h3>
      <svg viewBox={`0 0 ${ancho} ${alto}`} className="resumen-ejecutivo__grafico" role="img"
        aria-label="Entregas a tiempo, fuera de plazo y pedidos sin atender en el tiempo">
        {marcas.map((marca) => (
          <g key={marca}>
            <line x1={margen.izquierda} x2={ancho - margen.derecha} y1={aY(marca)} y2={aY(marca)} className="reportes__rejilla" />
            <text x={margen.izquierda - 5} y={aY(marca) + 3} textAnchor="end" className="reportes__eje">{marca}</text>
          </g>
        ))}
        {tramos.map((tramo, indice) => {
          const x = margen.izquierda + indice * anchoTramo + anchoTramo * 0.18;
          const anchoBarra = anchoTramo * 0.64;
          let base = 0;
          const segmentos = [
            { valor: tramo.aTiempo, color: "var(--color-semaforo-verde)" },
            { valor: tramo.fueraDePlazo, color: "var(--color-semaforo-ambar)" },
            { valor: tramo.sinAtender, color: "var(--color-semaforo-rojo)" },
          ];
          return (
            <g key={tramo.etiqueta + indice}>
              <title>
                {`${tramo.etiqueta}: ${tramo.aTiempo} a tiempo, ${tramo.fueraDePlazo} fuera de plazo, ${tramo.sinAtender} sin atender · ` +
                  `${tramo.rutas} rutas, ${formatearKm(tramo.km)}, ${formatearSoles(tramo.costo)}`}
              </title>
              {segmentos.map((segmento, posicion) => {
                if (segmento.valor <= 0) {
                  return null;
                }
                const y = aY(base + segmento.valor);
                base += segmento.valor;
                return (
                  <rect key={posicion} x={x} y={y} width={anchoBarra} height={Math.max(1, altura(segmento.valor))}
                    fill={segmento.color} rx={2} />
                );
              })}
              {(tramos.length <= 16 || indice % Math.ceil(tramos.length / 16) === 0) && (
                <text x={x + anchoBarra / 2} y={alto - 10} textAnchor="middle" className="reportes__eje">
                  {tramo.etiqueta}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <ul className="reportes__leyenda">
        <li><i style={{ background: "var(--color-semaforo-verde)" }} /> A tiempo</li>
        <li><i style={{ background: "var(--color-semaforo-ambar)" }} /> Fuera de plazo</li>
        <li><i style={{ background: "var(--color-semaforo-rojo)" }} /> Sin atender (por hora de registro)</li>
      </ul>
      <p className="texto-tenue reportes__nota">
        Costo de las rutas que salen en el periodo: {formatearSoles(totalCosto)} · {formatearKm(totalKm)}. Pase el cursor
        por cada barra para ver rutas, kilómetros y costo del tramo.
      </p>
    </div>
  );
};

const Holgura = ({ franjas }: { franjas: { etiqueta: string; cantidad: number; color: string }[] }) => {
  const total = franjas.reduce((suma, franja) => suma + franja.cantidad, 0);
  const maximo = Math.max(1, ...franjas.map((franja) => franja.cantidad));
  return (
    <div className="resumen-ejecutivo__bloque">
      <h3 className="rotulo">Margen con que llegan las entregas</h3>
      <ul className="resumen-ejecutivo__holgura">
        {franjas.map((franja) => (
          <li key={franja.etiqueta}>
            <span>{franja.etiqueta}</span>
            <span className="resumen-ejecutivo__pista">
              <span style={{ width: `${(franja.cantidad / maximo) * 100}%`, backgroundColor: franja.color }} />
            </span>
            <span className="cifra">
              {franja.cantidad}
              <small> ({total > 0 ? Math.round((franja.cantidad / total) * 100) : 0} %)</small>
            </span>
          </li>
        ))}
      </ul>
      <p className="texto-tenue reportes__nota">
        Tiempo entre la llegada y el límite del plazo. Mientras más entregas queden a la izquierda, más frágil es el plan
        ante una avería o un bloqueo.
      </p>
    </div>
  );
};

export default ResumenEjecutivo;
