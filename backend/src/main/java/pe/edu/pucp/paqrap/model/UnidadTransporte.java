package pe.edu.pucp.paqrap.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;
import pe.edu.pucp.paqrap.enums.EstadoUnidad;
import pe.edu.pucp.paqrap.enums.TipoAveria;
import pe.edu.pucp.paqrap.enums.TipoUnidad;

/**
 * Unidad de transporte de la flota heterogenea (auto, moto o bicicleta),
 * identificada por un codigo con formato TTNN (STD 2.2, 4.7.1).
 *
 * <p>Los campos marcados como transitorios describen la situacion de la
 * unidad dentro de una ejecucion del planificador (donde esta y desde que
 * minuto vuelve a estar disponible). No se persisten: el estado duradero de
 * la unidad es su codigo, su tipo y su {@link EstadoUnidad}.</p>
 */
@Entity
@Table(name = "unidad_transporte")
public class UnidadTransporte {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "unidad_transporte_id")
    private Long id;

    @Column(name = "codigo", nullable = false, unique = true, length = 4)
    private String codigo;

    @Enumerated(EnumType.STRING)
    @Column(name = "tipo_unidad", nullable = false, length = 20)
    private TipoUnidad tipoUnidad;

    @Enumerated(EnumType.STRING)
    @Column(name = "estado", nullable = false, length = 20)
    private EstadoUnidad estado = EstadoUnidad.DISPONIBLE;

    @Transient
    private Nodo ubicacion;

    @Transient
    private int minutoDisponibleDesde;

    @Transient
    private TipoAveria averiaActiva;

    protected UnidadTransporte() {
    }

    public UnidadTransporte(String codigo, TipoUnidad tipoUnidad) {
        this.codigo = codigo;
        this.tipoUnidad = tipoUnidad;
    }

    public UnidadTransporte(String codigo, TipoUnidad tipoUnidad, Nodo ubicacion) {
        this(codigo, tipoUnidad);
        this.ubicacion = ubicacion;
    }

    /** Una unidad averiada o en mantenimiento no admite ninguna asignacion. */
    public boolean estaOperativa(int minutoSimulacion) {
        return minutoSimulacion >= minutoDisponibleDesde;
    }

    /** El plan de mantenimiento preventivo inmoviliza la unidad todo ese dia. */
    public void programarMantenimiento(int minutoFinDelDia) {
        this.minutoDisponibleDesde = minutoFinDelDia;
        this.estado = EstadoUnidad.EN_MANTENIMIENTO;
    }

    /**
     * Registra una averia. El tipo determina el minuto en que la unidad
     * vuelve a estar operativa (STD 4.4.3).
     */
    public void registrarAveria(TipoAveria tipo, int minutoDisponibleDesde) {
        this.averiaActiva = tipo;
        this.minutoDisponibleDesde = minutoDisponibleDesde;
        this.estado = EstadoUnidad.AVERIADA;
    }

    public Long getId() {
        return id;
    }

    public String getCodigo() {
        return codigo;
    }

    public TipoUnidad getTipoUnidad() {
        return tipoUnidad;
    }

    public EstadoUnidad getEstado() {
        return estado;
    }

    public void setEstado(EstadoUnidad estado) {
        this.estado = estado;
    }

    public Nodo getUbicacion() {
        return ubicacion;
    }

    public void setUbicacion(Nodo ubicacion) {
        this.ubicacion = ubicacion;
    }

    public int getMinutoDisponibleDesde() {
        return minutoDisponibleDesde;
    }

    public TipoAveria getAveriaActiva() {
        return averiaActiva;
    }
}
