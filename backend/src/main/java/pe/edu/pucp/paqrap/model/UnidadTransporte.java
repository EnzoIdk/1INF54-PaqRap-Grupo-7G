package pe.edu.pucp.paqrap.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import pe.edu.pucp.paqrap.enums.EstadoUnidad;
import pe.edu.pucp.paqrap.enums.TipoUnidad;

/**
 * Unidad de transporte de la flota heterogenea (auto, moto o bicicleta),
 * identificada por un codigo con formato TTNN (STD 2.2, 4.7.1).
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

    protected UnidadTransporte() {
    }

    public UnidadTransporte(String codigo, TipoUnidad tipoUnidad) {
        this.codigo = codigo;
        this.tipoUnidad = tipoUnidad;
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
}
