package pe.edu.pucp.paqrap.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Enlaza los parametros de {@code paqrap.planificador} declarados en
 * application.yml. Los nombres de los campos deben respetar exactamente la
 * nomenclatura fijada en STD 4.6.2 para mantener la trazabilidad con el
 * informe de seleccion de algoritmos.
 *
 * @param algoritmoActivo algoritmo que resuelve {@code SelectorPlanificador}: IACO o AGAESTW
 * @param semillaAleatoria semilla unica de la que deriva toda la aleatoriedad del planificador
 * @param pesoFeromona influencia del rastro de feromona en la transicion entre nodos (I-ACO)
 * @param pesoHeuristicaCosto influencia del costo operativo por kilometro de la unidad (I-ACO)
 * @param pesoUrgencia importancia del plazo comprometido del pedido (I-ACO)
 * @param tasaEvaporacion ritmo de evaporacion de la feromona por iteracion (I-ACO)
 * @param recompensaGlobal factor de refuerzo depositado sobre las rutas economicas (I-ACO)
 * @param feromonaInicial valor basal de la matriz de feromonas (I-ACO)
 * @param numIteraciones iteraciones de la colonia por ejecucion (I-ACO)
 * @param numHormigas agentes que construyen una solucion en cada iteracion (I-ACO)
 * @param tamanoPoblacion numero de individuos por generacion (AGA-ES-TW)
 * @param numGeneraciones cantidad maxima de generaciones por ejecucion (AGA-ES-TW)
 * @param tamanoTorneo individuos que compiten en cada seleccion por torneo (AGA-ES-TW)
 * @param porcentajeElitismo fraccion de individuos que pasa intacta a la siguiente generacion (AGA-ES-TW)
 * @param probCruceBase probabilidad de cruce antes del ajuste adaptativo (AGA-ES-TW)
 * @param probMutacionBase probabilidad de mutacion antes del ajuste adaptativo (AGA-ES-TW)
 * @param penalidadPlazo castigo aplicado al incumplir el plazo comprometido (AGA-ES-TW)
 * @param penalidadCapacidad castigo aplicado al exceder la capacidad de la unidad (AGA-ES-TW)
 */
@ConfigurationProperties(prefix = "paqrap.planificador")
public record ParametrosPlanificador(
        String algoritmoActivo,
        long semillaAleatoria,
        double pesoFeromona,
        double pesoHeuristicaCosto,
        double pesoUrgencia,
        double tasaEvaporacion,
        double recompensaGlobal,
        double feromonaInicial,
        int numIteraciones,
        int numHormigas,
        int tamanoPoblacion,
        int numGeneraciones,
        int tamanoTorneo,
        double porcentajeElitismo,
        double probCruceBase,
        double probMutacionBase,
        double penalidadPlazo,
        double penalidadCapacidad) {
}
