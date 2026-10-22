import { useMemo } from "react";
import type { EjecucionDto, EscenarioDto } from "../../types/Experimentacion";
import { COLOR_TIPO_UNIDAD, ETIQUETA_TIPO_UNIDAD } from "../../utils/constants";
import { formatearKm, formatearSoles } from "../../utils/formatters";
import {
  calcularCuellosDeBotella,
  calcularIndicadores,
  type IndicadoresEjecucion,
  type ResumenPlazo,
} from "../../utils/reportes";
import "./ReportesDesempeno.css";

interface ReportesDesempenoProps {
  escenario: EscenarioDto;
  ejecuciones: EjecucionDto[];
}

const COLORES_PLAZO: Record<number, string> = {
  4: "var(--color-semaforo-rojo)",
  8: "var(--color-semaforo-ambar)",
  12: "var(--color-tipo-moto)",
  18: "var(--color-tipo-auto)",
  36: "var(--color-semaforo-verde)",
};

/**
 * Reportes gráficos de desempeño de una ejecución, válidos para los tres
 * escenarios (RF-49): cumplimiento contra reasignación (RF-68), tiempo real
 * de entrega contra plazo (RF-73), costos (RF-65), indicadores de eficiencia
 * (RF-75), ocupación de almacenes (RF-71), cuellos de botella (RF-72) y
 * horas de alimentación (RF-74).
 */
const ReportesDesempeno = ({ escenario, ejecuciones }: ReportesDesempenoProps) => {
  const indicadores = useMemo(
    () => ejecuciones.map((ejecucion) => ({ ejecucion, datos: calcularIndicadores(ejecucion) })),
    [ejecuciones],
  );
  const diasEscenario = Math.max(1, Math.ceil((escenario.minutoFin - escenario.minutoInicio) / 1440));

  return (
    <>
      {indicadores.map(({ ejecucion, datos }) => (
        <section className="tarjeta" key={`reportes-${ejecucion.algoritmo}`}>
          <header className="tarjeta__encabezado">
            <div>
              <h2 className="tarjeta__titulo">Desempeño de {ejecucion.algoritmo}</h2>
              <p className="tarjeta__contexto">
                Cumplimiento, plazos, costos y eficiencia de las rutas trazadas y cumplidas
              </p>
            </div>
          </header>
          <div className="tarjeta__cuerpo reportes">
            <Cumplimiento datos={datos} />
            <PlazosReales porPlazo={datos.porPlazo} anticipadas={datos.entregasAnticipadas} />
            <Costos datos={datos} />
            <Kpis datos={datos} />
            <Almacenes
              datos={datos}
              escenario={escenario}
              diasEscenario={diasEscenario}
            />
            {(ejecucion.pedidosSinAtender.length > 0 || ejecucion.colapsoOcurrido) && (
              <CuellosBotella ejecucion={ejecucion} />
            )}
          </div>
        </section>
      ))}
    </>
  );
};

/* ---------------------------------------------------------------- RF-68 */
const Cumplimiento = ({ datos }: { datos: IndicadoresEjecucion }) => {
  const total = datos.aTiempo + datos.fueraDePlazo + datos.sinAtender;
  const tramo = (valor: number) => `${total > 0 ? (valor / total) * 100 : 0}%`;
  return (
    <div className="reportes__bloque">
      <h3 className="rotulo">Tasa de cumplimiento</h3>
      <p className="reportes__cifra-grande cifra">{(datos.tasaCumplimiento * 100).toFixed(1)} %</p>
      <div className="reportes__barra-apilada" role="img" aria-label="Pedidos a tiempo, fuera de plazo y sin atender">
        <span style={{ width: tramo(datos.aTiempo), background: "var(--color-semaforo-verde)" }} />
        <span style={{ width: tramo(datos.fueraDePlazo), background: "var(--color-semaforo-ambar)" }} />
        <span style={{ width: tramo(datos.sinAtender), background: "var(--color-semaforo-rojo)" }} />
      </div>
      <ul className="reportes__leyenda">
        <li><i style={{ background: "var(--color-semaforo-verde)" }} /> A tiempo: {datos.aTiempo}</li>
        <li><i style={{ background: "var(--color-semaforo-ambar)" }} /> Fuera de plazo: {datos.fueraDePlazo}</li>
        <li><i style={{ background: "var(--color-semaforo-rojo)" }} /> Sin atender: {datos.sinAtender}</li>
        <li><i style={{ background: "var(--color-estado-reasignado)" }} /> Reasignados por avería: {datos.reasignados}</li>
      </ul>
    </div>
  );
};

/* ---------------------------------------------------------------- RF-73 */
const PlazosReales = ({ porPlazo, anticipadas }: { porPlazo: ResumenPlazo[]; anticipadas: number }) => {
  const ancho = 420;
  const alto = 200;
  const margen = { izquierda: 34, derecha: 8, arriba: 10, abajo: 28 };
  const escalaMaxima = Math.max(36, ...porPlazo.map((resumen) => resumen.maximoHoras)) * 1.05;
  const aY = (horas: number) => margen.arriba + (alto - margen.arriba - margen.abajo) * (1 - horas / escalaMaxima);
  const anchoGrupo = (ancho - margen.izquierda - margen.derecha) / porPlazo.length;
  const marcas = [0, 12, 24, 36].filter((marca) => marca <= escalaMaxima);

  return (
    <div className="reportes__bloque reportes__bloque--ancho">
      <h3 className="rotulo">Tiempo real de entrega frente al plazo máximo</h3>
      <svg viewBox={`0 0 ${ancho} ${alto}`} className="reportes__grafico" role="img"
        aria-label="Horas promedio y máximas de entrega por plazo comprometido">
        {marcas.map((marca) => (
          <g key={marca}>
            <line x1={margen.izquierda} x2={ancho - margen.derecha} y1={aY(marca)} y2={aY(marca)} className="reportes__rejilla" />
            <text x={margen.izquierda - 6} y={aY(marca) + 3} textAnchor="end" className="reportes__eje">{marca} h</text>
          </g>
        ))}
        {porPlazo.map((resumen, indice) => {
          const x0 = margen.izquierda + indice * anchoGrupo;
          const centro = x0 + anchoGrupo / 2;
          const anchoBarra = anchoGrupo * 0.42;
          return (
            <g key={resumen.plazoHoras}>
              <line x1={x0 + 4} x2={x0 + anchoGrupo - 4} y1={aY(resumen.plazoHoras)} y2={aY(resumen.plazoHoras)}
                className="reportes__limite" />
              {resumen.entregas > 0 && (
                <>
                  <rect x={centro - anchoBarra / 2} width={anchoBarra} y={aY(resumen.promedioHoras)}
                    height={Math.max(1, aY(0) - aY(resumen.promedioHoras))} rx={3}
                    fill={COLORES_PLAZO[resumen.plazoHoras]} opacity={0.85}>
                    <title>{`Plazo ${resumen.plazoHoras} h: promedio ${resumen.promedioHoras.toFixed(1)} h, máximo ${resumen.maximoHoras.toFixed(1)} h, ${resumen.entregas} entregas`}</title>
                  </rect>
                  <line x1={centro} x2={centro} y1={aY(resumen.maximoHoras)} y2={aY(resumen.promedioHoras)} className="reportes__bigote" />
                  <line x1={centro - 6} x2={centro + 6} y1={aY(resumen.maximoHoras)} y2={aY(resumen.maximoHoras)} className="reportes__bigote" />
                </>
              )}
              <text x={centro} y={alto - 12} textAnchor="middle" className="reportes__eje">{resumen.plazoHoras} h</text>
              <text x={centro} y={alto - 1} textAnchor="middle" className="reportes__eje reportes__eje--tenue">
                {resumen.entregas} ent.
              </text>
            </g>
          );
        })}
      </svg>
      <p className="texto-tenue reportes__nota">
        Barra: horas promedio desde el registro hasta la llegada · bigote: máximo · línea discontinua: plazo comprometido
      </p>
      {anticipadas > 0 && (
        <p className="plazo--critica reportes__nota">
          {anticipadas} entrega(s) quedaron planificadas antes de que su pedido se registrara (cuentan como 0 h): el
          turno sale a su hora de inicio con todos los pedidos de la ventana.
        </p>
      )}
    </div>
  );
};

/* ---------------------------------------------------------------- RF-65 */
const Costos = ({ datos }: { datos: IndicadoresEjecucion }) => {
  const maximo = Math.max(1, ...datos.porTipo.map((tipo) => tipo.costo));
  return (
    <div className="reportes__bloque">
      <h3 className="rotulo">Análisis de costos</h3>
      <dl className="reportes__datos">
        <div><dt>Costo total</dt><dd className="cifra">{formatearSoles(datos.costoTotal)}</dd></div>
        <div><dt>Costo por km</dt><dd className="cifra">{formatearSoles(datos.costoPorKm)}</dd></div>
        <div><dt>Costo por pedido</dt><dd className="cifra">{formatearSoles(datos.costoPorPedido)}</dd></div>
      </dl>
      <ul className="reportes__barras">
        {datos.porTipo.map((tipo) => (
          <li key={tipo.tipo}>
            <span>{ETIQUETA_TIPO_UNIDAD[tipo.tipo]}</span>
            <span className="reportes__pista">
              <span style={{ width: `${(tipo.costo / maximo) * 100}%`, background: COLOR_TIPO_UNIDAD[tipo.tipo] }} />
            </span>
            <span className="cifra">{formatearSoles(tipo.costo)} · {formatearKm(tipo.km)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

/* ---------------------------------------------------------------- RF-75 */
const Kpis = ({ datos }: { datos: IndicadoresEjecucion }) => (
  <div className="reportes__bloque">
    <h3 className="rotulo">Indicadores de eficiencia de rutas</h3>
    <dl className="reportes__datos">
      <div><dt>Km por pedido</dt><dd className="cifra">{datos.kmPorPedido.toFixed(2)}</dd></div>
      <div><dt>Paquetes por km</dt><dd className="cifra">{datos.paquetesPorKm.toFixed(2)}</dd></div>
      <div><dt>Uso de la capacidad</dt><dd className="cifra">{(datos.utilizacionCapacidad * 100).toFixed(1)} %</dd></div>
      <div><dt>Entregas por unidad</dt><dd className="cifra">{datos.entregasPorUnidad.toFixed(1)}</dd></div>
      <div><dt>Holgura promedio</dt><dd className="cifra">{datos.holguraPromedioHoras.toFixed(1)} h</dd></div>
      <div>
        <dt>Refrigerios en ventana</dt>
        <dd className="cifra">{datos.refrigerios.enVentana}/{datos.refrigerios.total}</dd>
      </div>
    </dl>
  </div>
);

/* ---------------------------------------------------------------- RF-71 */
const Almacenes = ({
  datos,
  escenario,
  diasEscenario,
}: {
  datos: IndicadoresEjecucion;
  escenario: EscenarioDto;
  diasEscenario: number;
}) => (
  <div className="reportes__bloque">
    <h3 className="rotulo">Utilización de los almacenes</h3>
    <ul className="reportes__barras">
      {escenario.almacenes.map((almacen) => {
        const uso = datos.porAlmacen.find((candidato) => candidato.codigo === almacen.codigo);
        const despachado = uso?.despachado ?? 0;
        const capacidad = almacen.stockMaximo * diasEscenario;
        const porcentaje = almacen.tipo === "CENTRAL" ? null : capacidad > 0 ? despachado / capacidad : 0;
        return (
          <li key={almacen.codigo}>
            <span>{almacen.codigo.replace("ALM-", "")}</span>
            <span className="reportes__pista">
              <span
                style={{
                  width: `${porcentaje === null ? 100 : Math.min(100, porcentaje * 100)}%`,
                  background: porcentaje === null ? "var(--color-gris-suave)" : "var(--color-tipo-auto)",
                }}
              />
            </span>
            <span className="cifra">
              {despachado} u · {uso?.rutas ?? 0} rutas
              {porcentaje === null ? " · inventario infinito" : ` · ${(porcentaje * 100).toFixed(1)} %`}
            </span>
          </li>
        );
      })}
    </ul>
    <p className="texto-tenue reportes__nota">
      Porcentaje sobre {diasEscenario} recarga(s) diaria(s) de cada almacén intermedio
    </p>
  </div>
);

/* ---------------------------------------------------------------- RF-72 */
const CuellosBotella = ({ ejecucion }: { ejecucion: EjecucionDto }) => {
  const cuellos = calcularCuellosDeBotella(ejecucion);
  const maximoPlazo = Math.max(1, ...cuellos.sinAtenderPorPlazo.map((item) => item.cantidad));
  return (
    <div className="reportes__bloque reportes__bloque--ancho">
      <h3 className="rotulo">Cuellos de botella</h3>
      <p className="texto-tenue reportes__nota">
        {ejecucion.pedidosSinAtender.length} pedido(s) sin unidad factible · {cuellos.unidadesUsadas} de{" "}
        {cuellos.unidadesDisponibles} unidades usadas
      </p>
      <div className="reportes__columnas">
        <ul className="reportes__barras">
          {cuellos.sinAtenderPorPlazo.map((item) => (
            <li key={item.plazoHoras}>
              <span>Plazo {item.plazoHoras} h</span>
              <span className="reportes__pista">
                <span style={{ width: `${(item.cantidad / maximoPlazo) * 100}%`, background: COLORES_PLAZO[item.plazoHoras] }} />
              </span>
              <span className="cifra">{item.cantidad}</span>
            </li>
          ))}
        </ul>
        <div>
          <span className="rotulo">Por zona de la ciudad</span>
          <ul className="reportes__lista">
            {cuellos.sinAtenderPorZona.map((item) => (
              <li key={item.zona}><span>{item.zona}</span><strong className="cifra">{item.cantidad}</strong></li>
            ))}
          </ul>
          <span className="rotulo">Por turno de llegada</span>
          <ul className="reportes__lista">
            {cuellos.sinAtenderPorFranja.map((item) => (
              <li key={item.franja}><span>{item.franja}</span><strong className="cifra">{item.cantidad}</strong></li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ReportesDesempeno;
