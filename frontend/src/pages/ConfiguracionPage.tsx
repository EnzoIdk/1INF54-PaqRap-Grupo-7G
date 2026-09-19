import Encabezado from "../components/layout/Encabezado";
import SemaforoStock from "../components/paneles/SemaforoStock";
import { useExperimentacion } from "../hooks/useExperimentacion";
import "./ConfiguracionPage.css";

/** Descripcion de cada parametro, para que la pantalla explique y no solo liste. */
const DESCRIPCIONES: Record<string, string> = {
  algoritmoActivo: "Algoritmo que resuelve el planificador por defecto",
  semillaAleatoria: "Semilla única de la que deriva toda la aleatoriedad",
  pesoFeromona: "I-ACO · influencia del rastro de feromona (alfa)",
  pesoHeuristicaCosto: "I-ACO · influencia del costo del tramo (beta)",
  pesoUrgencia: "I-ACO · importancia del plazo comprometido (gamma)",
  tasaEvaporacion: "I-ACO · evaporación de la feromona por iteración (rho)",
  recompensaGlobal: "I-ACO · refuerzo depositado sobre las rutas económicas (Q)",
  feromonaInicial: "I-ACO · valor basal de la matriz de feromonas (tau0)",
  numIteraciones: "I-ACO · iteraciones de la colonia por ejecución",
  numHormigas: "I-ACO · agentes que construyen una solución por iteración",
  tamanoPoblacion: "AGA-ES-TW · individuos por generación",
  numGeneraciones: "AGA-ES-TW · generaciones por ejecución",
  tamanoTorneo: "AGA-ES-TW · individuos que compiten en cada selección",
  porcentajeElitismo: "AGA-ES-TW · fracción que pasa intacta a la siguiente generación",
  probCruceBase: "AGA-ES-TW · probabilidad de cruce antes del ajuste adaptativo",
  probMutacionBase: "AGA-ES-TW · probabilidad de mutación antes del ajuste adaptativo",
  penalidadPlazo: "Castigo por incumplir el plazo comprometido",
  penalidadCapacidad: "Castigo por exceder la capacidad de la unidad",

  velocidadKmhAuto: "Velocidad promedio del auto, en km/h",
  velocidadKmhMoto: "Velocidad promedio de la moto, en km/h",
  velocidadKmhBicicleta: "Velocidad promedio de la bicicleta, en km/h",
  capacidadAuto: "Paquetes del producto P que transporta un auto",
  capacidadMoto: "Paquetes del producto P que transporta una moto",
  capacidadBicicleta: "Paquetes del producto P que transporta una bicicleta",
  costoKmAuto: "Costo por kilómetro recorrido de un auto, en soles",
  costoKmMoto: "Costo por kilómetro recorrido de una moto, en soles",
  costoKmBicicleta: "Costo por kilómetro recorrido de una bicicleta, en soles",
  cantidadAutos: "Autos de la flota; fijo durante una ejecución",
  cantidadMotos: "Motos de la flota; fijo durante una ejecución",
  cantidadBicicletas: "Bicicletas de la flota; fijo durante una ejecución",

  stockMaximo: "Capacidad máxima de un almacén intermedio",
  stockMinimo: "Stock por debajo del cual el almacén no despacha",
  umbralAmbarPorcentaje: "Fracción despachada a partir de la cual el semáforo pasa a ámbar",
  umbralRojoPorcentaje: "Fracción despachada a partir de la cual el semáforo pasa a rojo",
  centralX: "Coordenada X del almacén central",
  centralY: "Coordenada Y del almacén central",
  noroesteX: "Coordenada X del almacén intermedio Nor-Oeste",
  noroesteY: "Coordenada Y del almacén intermedio Nor-Oeste",
  esteX: "Coordenada X del almacén intermedio Este",
  esteY: "Coordenada Y del almacén intermedio Este",
};

/**
 * Parametros vigentes del planificador, de la flota y de los almacenes. El
 * visualizador los obtiene del backend y nunca los declara por su cuenta
 * (STD 2.3, 5.6); se modifican en {@code application.yml}.
 */
const ConfiguracionPage = () => {
  const { parametrosVigentes, umbrales } = useExperimentacion();

  if (!parametrosVigentes) {
    return (
      <div className="configuracion">
        <Encabezado titulo="Configuración" contexto="Parámetros vigentes del sistema" />
        <div className="estado-vacio">
          <span className="estado-vacio__titulo">Consultando los parámetros al backend…</span>
          <span>Si el mensaje persiste, verifique que el backend esté ejecutándose en el puerto 8080.</span>
        </div>
      </div>
    );
  }

  const secciones = [
    { titulo: "Planificador", contexto: "paqrap.planificador", valores: parametrosVigentes.planificador },
    { titulo: "Flota", contexto: "paqrap.flota", valores: parametrosVigentes.flota },
    { titulo: "Almacenes", contexto: "paqrap.almacen", valores: parametrosVigentes.almacen },
  ];

  return (
    <div className="configuracion">
      <Encabezado
        titulo="Configuración"
        contexto="Valores vigentes en application.yml · se leen del backend, nunca se declaran en el visualizador"
      />

      <div className="configuracion__cuerpo desplazable">
        <section className="tarjeta">
          <header className="tarjeta__encabezado">
            <div>
              <h2 className="tarjeta__titulo">Semáforo de los almacenes intermedios</h2>
              <p className="tarjeta__contexto">
                Verde con holgura, ámbar con un tercio despachado y rojo con dos tercios. Los rangos son
                configurables (STD 2.2)
              </p>
            </div>
          </header>
          <div className="tarjeta__cuerpo configuracion__semaforos">
            {[1000, 600, 250].map((stock) => (
              <div key={stock}>
                <span className="rotulo">Ejemplo con {stock} u</span>
                <SemaforoStock
                  stockActual={stock}
                  stockMaximo={Number(parametrosVigentes.almacen.stockMaximo ?? 1000)}
                  umbralAmbarPorcentaje={umbrales.umbralAmbarPorcentaje}
                  umbralRojoPorcentaje={umbrales.umbralRojoPorcentaje}
                />
              </div>
            ))}
          </div>
        </section>

        {secciones.map((seccion) => (
          <section className="tarjeta" key={seccion.titulo}>
            <header className="tarjeta__encabezado">
              <div>
                <h2 className="tarjeta__titulo">{seccion.titulo}</h2>
                <p className="tarjeta__contexto cifra">{seccion.contexto}</p>
              </div>
            </header>
            <ul className="configuracion__lista">
              {Object.entries(seccion.valores).map(([clave, valor]) => (
                <li key={clave}>
                  <span className="configuracion__clave cifra">{clave}</span>
                  <span className="configuracion__descripcion">{DESCRIPCIONES[clave] ?? "—"}</span>
                  <span className="configuracion__valor cifra">{String(valor)}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
};

export default ConfiguracionPage;
