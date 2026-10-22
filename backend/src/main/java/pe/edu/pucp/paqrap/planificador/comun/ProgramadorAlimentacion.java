package pe.edu.pucp.paqrap.planificador.comun;

import org.springframework.stereotype.Component;
import pe.edu.pucp.paqrap.config.ConstantesPaqrap;
import pe.edu.pucp.paqrap.model.ParadaRuta;

import java.util.List;

/**
 * Ubica la hora de alimentacion del conductor dentro de su turno (RF-26,
 * RF-27): una hora completa que empieza al menos una hora despues del cambio
 * de turno y termina al menos una hora antes del siguiente (07:00, 15:00 y
 * 23:00, RF-25).
 *
 * <p>Se decide despues de que el algoritmo eligio la ruta, para no alterar
 * su decision. La pausa se toma, en este orden de preferencia: al terminar
 * la ruta si eso cae dentro de la ventana; en el primer minuto de la ventana
 * si la ruta termina antes; en el almacen, mientras la unidad espera el
 * registro de sus pedidos; o entre dos entregas, eligiendo el ultimo punto
 * de la ventana que no deja fuera de plazo ninguna entrega que lo cumplia.
 * Si ninguna opcion respeta la ventana sin perjudicar una entrega, la pausa
 * se toma al final de la ruta y se informa como fuera de ventana.</p>
 */
@Component
public class ProgramadorAlimentacion {

    /** Indice de parada que representa "antes de la primera entrega", en el almacen. */
    public static final int EN_EL_ALMACEN = -1;

    /**
     * @param despuesDeParada indice de la parada tras la cual se come; {@link #EN_EL_ALMACEN} antes de salir
     * @param minutoInicio minuto de simulacion en que empieza la pausa
     * @param dentroDeVentana si respeta la hora de margen respecto de los cambios de turno
     * @param desplazaParadas si las entregas posteriores se retrasan una hora
     */
    public record Programacion(int despuesDeParada, int minutoInicio, boolean dentroDeVentana, boolean desplazaParadas) {

        public int minutoFin() {
            return minutoInicio + ConstantesPaqrap.MINUTOS_PAUSA_ALIMENTACION;
        }
    }

    /** Devuelve la pausa programada, o {@code null} si la unidad no tiene entregas. */
    public Programacion programar(List<ParadaRuta> paradas, int minutoSalidaAlmacen) {
        return programar(paradas, minutoSalidaAlmacen, 0);
    }

    /**
     * @param minutosRetorno duracion del tramo de vuelta al almacen tras la ultima
     *                       entrega: la ruta termina al llegar a el, y alli puede
     *                       tomarse la pausa con la unidad estacionada
     */
    public Programacion programar(List<ParadaRuta> paradas, int minutoSalidaAlmacen, int minutosRetorno) {
        return programar(paradas, minutoSalidaAlmacen, minutosRetorno, minutoSalidaAlmacen);
    }

    /**
     * @param minutoDisponible minuto desde el que la unidad espera en el almacen.
     *                         Si sale despues, porque espera el registro de sus
     *                         pedidos (RF-04), el conductor puede comer durante
     *                         esa espera sin retrasar ninguna entrega.
     */
    public Programacion programar(List<ParadaRuta> paradas, int minutoSalidaAlmacen, int minutosRetorno,
                                  int minutoDisponible) {
        if (paradas.isEmpty()) {
            return null;
        }
        int ultima = paradas.size() - 1;
        int finRuta = paradas.get(ultima).getMinutoSalida() + Math.max(0, minutosRetorno);

        if (enVentana(finRuta)) {
            return new Programacion(ultima, finRuta, true, false);
        }
        int aperturaTrasLaRuta = primerMinutoEnVentana(finRuta);
        if (aperturaTrasLaRuta < inicioDelTurno(finRuta) + ConstantesPaqrap.MINUTOS_DURACION_TURNO) {
            // La ruta termina antes de que abra la ventana de su turno: se come al abrirse.
            return new Programacion(ultima, aperturaTrasLaRuta, true, false);
        }
        int enLaEspera = primerMinutoEnVentana(minutoDisponible);
        if (enLaEspera + ConstantesPaqrap.MINUTOS_PAUSA_ALIMENTACION <= minutoSalidaAlmacen) {
            return new Programacion(EN_EL_ALMACEN, enLaEspera, true, false);
        }
        // Pausar despues de la ultima entrega solo retrasa el retorno al almacen,
        // de modo que ninguna entrega se ve afectada.
        for (int k = ultima; k >= EN_EL_ALMACEN; k--) {
            int minutoPausa = k == EN_EL_ALMACEN ? minutoSalidaAlmacen : paradas.get(k).getMinutoSalida();
            if (enVentana(minutoPausa) && noPerjudicaEntregas(paradas, k)) {
                return new Programacion(k, minutoPausa, true, true);
            }
        }
        return new Programacion(ultima, finRuta, false, false);
    }

    /**
     * La pausa respeta la ventana del turno en que cae: si la ruta cruza un
     * cambio de turno, el conductor siguiente toma la unidad en ese punto
     * (Q&A 12) y come dentro de su propia ventana.
     */
    static boolean enVentana(int minutoInicioPausa) {
        int inicioTurno = inicioDelTurno(minutoInicioPausa);
        return minutoInicioPausa >= inicioTurno + ConstantesPaqrap.MINUTOS_POR_HORA
                && minutoInicioPausa <= ultimoInicioDeVentana(inicioTurno);
    }

    /** Primer minuto, desde el dado, en que puede empezar una pausa dentro de ventana. */
    private static int primerMinutoEnVentana(int desde) {
        int inicioTurno = inicioDelTurno(desde);
        if (desde < inicioTurno + ConstantesPaqrap.MINUTOS_POR_HORA) {
            return inicioTurno + ConstantesPaqrap.MINUTOS_POR_HORA;
        }
        if (desde <= ultimoInicioDeVentana(inicioTurno)) {
            return desde;
        }
        return inicioTurno + ConstantesPaqrap.MINUTOS_DURACION_TURNO + ConstantesPaqrap.MINUTOS_POR_HORA;
    }

    /** La pausa debe terminar al menos una hora antes del siguiente cambio de turno. */
    private static int ultimoInicioDeVentana(int inicioTurno) {
        return inicioTurno + ConstantesPaqrap.MINUTOS_DURACION_TURNO
                - ConstantesPaqrap.MINUTOS_POR_HORA - ConstantesPaqrap.MINUTOS_PAUSA_ALIMENTACION;
    }

    private static boolean noPerjudicaEntregas(List<ParadaRuta> paradas, int despuesDe) {
        for (int j = despuesDe + 1; j < paradas.size(); j++) {
            ParadaRuta parada = paradas.get(j);
            if (parada.cumplePlazo() && parada.getMinutoLlegada() + ConstantesPaqrap.MINUTOS_PAUSA_ALIMENTACION
                    > parada.getPedido().getMinutoLimiteEntrega()) {
                return false;
            }
        }
        return true;
    }

    /** Ultimo cambio de turno (07:00, 15:00 o 23:00) anterior o igual al minuto dado. */
    public static int inicioDelTurno(int minutoSimulacion) {
        int minutoDelDia = Math.floorMod(minutoSimulacion, ConstantesPaqrap.MINUTOS_POR_DIA);
        int inicioDelDia = minutoSimulacion - minutoDelDia;
        int elegido = Integer.MIN_VALUE;
        for (int hora : ConstantesPaqrap.HORAS_CAMBIO_TURNO) {
            int minutoCambio = hora * ConstantesPaqrap.MINUTOS_POR_HORA;
            if (minutoCambio <= minutoDelDia) {
                elegido = inicioDelDia + minutoCambio;
            }
        }
        if (elegido == Integer.MIN_VALUE) {
            // Antes de las 07:00: el turno empezo a las 23:00 del dia anterior.
            int ultimoCambio = ConstantesPaqrap.HORAS_CAMBIO_TURNO[ConstantesPaqrap.HORAS_CAMBIO_TURNO.length - 1];
            elegido = inicioDelDia - ConstantesPaqrap.MINUTOS_POR_DIA + ultimoCambio * ConstantesPaqrap.MINUTOS_POR_HORA;
        }
        return elegido;
    }
}
