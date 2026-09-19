package pe.edu.pucp.paqrap.util;

import pe.edu.pucp.paqrap.config.ConstantesPaqrap;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Convierte los instantes con formato {@code ##d##h##m} de los archivos de
 * datos a minutos transcurridos desde el inicio del mes, mediante la formula
 * {@code (dia - 1) * 1440 + hora * 60 + minuto} (STD 4.7.2). Ningun otro
 * punto del sistema debe reimplementar esta conversion.
 */
public final class ConversorInstante {

    private static final Pattern PATRON_INSTANTE = Pattern.compile("(\\d{2})d(\\d{2})h(\\d{2})m");

    private ConversorInstante() {
    }

    public static int aMinutoSimulacion(String instante) {
        Matcher matcher = PATRON_INSTANTE.matcher(instante);
        if (!matcher.matches()) {
            throw new IllegalArgumentException("Formato de instante invalido: " + instante);
        }
        int dia = Integer.parseInt(matcher.group(1));
        int hora = Integer.parseInt(matcher.group(2));
        int minuto = Integer.parseInt(matcher.group(3));
        return (dia - 1) * ConstantesPaqrap.MINUTOS_POR_DIA + hora * ConstantesPaqrap.MINUTOS_POR_HORA + minuto;
    }
}
