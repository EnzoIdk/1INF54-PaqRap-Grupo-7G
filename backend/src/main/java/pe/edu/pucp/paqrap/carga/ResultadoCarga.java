package pe.edu.pucp.paqrap.carga;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * Resumen de una operacion de carga de archivo: cantidad de registros
 * leidos, aceptados y rechazados, junto con el detalle de los rechazos
 * (STD 4.7.2). Se muestra en el visualizador antes de iniciar una
 * simulacion.
 */
public class ResultadoCarga {

    private int registrosLeidos;
    private int registrosAceptados;
    private final List<String> detalleRechazos = new ArrayList<>();

    public void registrarAceptado() {
        registrosLeidos++;
        registrosAceptados++;
    }

    public void registrarRechazado(String motivo) {
        registrosLeidos++;
        detalleRechazos.add(motivo);
    }

    public int getRegistrosLeidos() {
        return registrosLeidos;
    }

    public int getRegistrosAceptados() {
        return registrosAceptados;
    }

    public int getRegistrosRechazados() {
        return detalleRechazos.size();
    }

    public List<String> getDetalleRechazos() {
        return Collections.unmodifiableList(detalleRechazos);
    }
}
