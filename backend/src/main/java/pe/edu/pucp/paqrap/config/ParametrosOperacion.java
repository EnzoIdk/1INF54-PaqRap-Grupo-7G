package pe.edu.pucp.paqrap.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import pe.edu.pucp.paqrap.exception.ParametrosInvalidosException;

/**
 * Valores vigentes de la flota y de los almacenes, modificables "en caliente"
 * sin reiniciar el backend (Q&A 6 y 15: la velocidad se cambia por tipo de
 * unidad mientras el software esta funcionando; RF-39, RF-60, RF-61).
 *
 * <p>Arranca con lo declarado en {@code application.yml}. Un cambio aplica a
 * la siguiente ejecucion del planificador: una corrida en curso conserva los
 * valores con los que empezo cada turno. Los cambios viven en memoria; al
 * reiniciar el backend se vuelve a {@code application.yml}.</p>
 */
@Component
public class ParametrosOperacion {

    private static final Logger log = LoggerFactory.getLogger(ParametrosOperacion.class);

    private final ParametrosFlota flotaInicial;
    private final ParametrosAlmacen almacenInicial;
    private volatile ParametrosFlota flota;
    private volatile ParametrosAlmacen almacen;

    public ParametrosOperacion(ParametrosFlota flota, ParametrosAlmacen almacen) {
        this.flotaInicial = flota;
        this.almacenInicial = almacen;
        this.flota = flota;
        this.almacen = almacen;
    }

    public ParametrosFlota flota() {
        return flota;
    }

    public ParametrosAlmacen almacen() {
        return almacen;
    }

    public synchronized void actualizar(ParametrosFlota nuevaFlota, ParametrosAlmacen nuevoAlmacen) {
        if (nuevaFlota == null || nuevoAlmacen == null) {
            throw new ParametrosInvalidosException("Debe enviar los parametros de la flota y de los almacenes");
        }
        validarFlota(nuevaFlota);
        validarAlmacen(nuevoAlmacen);
        this.flota = nuevaFlota;
        this.almacen = nuevoAlmacen;
        log.info("Parametros actualizados en caliente: {} / {}", nuevaFlota, nuevoAlmacen);
    }

    public synchronized void restablecer() {
        this.flota = flotaInicial;
        this.almacen = almacenInicial;
        log.info("Parametros restablecidos a los valores de application.yml");
    }

    private static void validarFlota(ParametrosFlota f) {
        enRango("velocidad del auto", f.velocidadKmhAuto(), 1, 120);
        enRango("velocidad de la moto", f.velocidadKmhMoto(), 1, 120);
        enRango("velocidad de la bicicleta", f.velocidadKmhBicicleta(), 1, 60);
        enRango("capacidad del auto", f.capacidadAuto(), 1, 200);
        enRango("capacidad de la moto", f.capacidadMoto(), 1, 200);
        enRango("capacidad de la bicicleta", f.capacidadBicicleta(), 1, 200);
        enRango("costo por km del auto", f.costoKmAuto(), 0.01, 1000);
        enRango("costo por km de la moto", f.costoKmMoto(), 0.01, 1000);
        enRango("costo por km de la bicicleta", f.costoKmBicicleta(), 0.01, 1000);
        enRango("cantidad de autos", f.cantidadAutos(), 0, 60);
        enRango("cantidad de motos", f.cantidadMotos(), 0, 60);
        enRango("cantidad de bicicletas", f.cantidadBicicletas(), 0, 60);
        if (f.cantidadAutos() + f.cantidadMotos() + f.cantidadBicicletas() == 0) {
            throw new ParametrosInvalidosException("La flota debe tener al menos una unidad");
        }
    }

    private static void validarAlmacen(ParametrosAlmacen a) {
        enRango("stock maximo", a.stockMaximo(), 1, 100_000);
        enRango("stock minimo", a.stockMinimo(), 0, a.stockMaximo() - 1);
        enRango("umbral ambar", a.umbralAmbarPorcentaje(), 0.01, 0.98);
        enRango("umbral rojo", a.umbralRojoPorcentaje(), 0.02, 0.99);
        if (a.umbralAmbarPorcentaje() >= a.umbralRojoPorcentaje()) {
            throw new ParametrosInvalidosException("El umbral ambar debe ser menor que el umbral rojo");
        }
        enRango("X del almacen central", a.centralX(), 0, ConstantesPaqrap.ANCHO_RETICULA_KM);
        enRango("Y del almacen central", a.centralY(), 0, ConstantesPaqrap.ALTO_RETICULA_KM);
        enRango("X del almacen Nor-Oeste", a.noroesteX(), 0, ConstantesPaqrap.ANCHO_RETICULA_KM);
        enRango("Y del almacen Nor-Oeste", a.noroesteY(), 0, ConstantesPaqrap.ALTO_RETICULA_KM);
        enRango("X del almacen Este", a.esteX(), 0, ConstantesPaqrap.ANCHO_RETICULA_KM);
        enRango("Y del almacen Este", a.esteY(), 0, ConstantesPaqrap.ALTO_RETICULA_KM);
    }

    private static void enRango(String campo, double valor, double minimo, double maximo) {
        if (Double.isNaN(valor) || valor < minimo || valor > maximo) {
            throw new ParametrosInvalidosException(String.format(
                    "El valor de %s debe estar entre %s y %s", campo, formatear(minimo), formatear(maximo)));
        }
    }

    private static String formatear(double valor) {
        return valor == Math.rint(valor) ? String.valueOf((long) valor) : String.valueOf(valor);
    }
}
