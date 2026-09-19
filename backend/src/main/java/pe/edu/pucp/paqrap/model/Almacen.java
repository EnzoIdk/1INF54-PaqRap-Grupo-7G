package pe.edu.pucp.paqrap.model;

import jakarta.persistence.AttributeOverride;
import jakarta.persistence.AttributeOverrides;
import jakarta.persistence.Column;
import jakarta.persistence.Embedded;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;
import pe.edu.pucp.paqrap.enums.TipoAlmacen;

/**
 * Almacen central o intermedio de PaqRap (STD 2.2). El color del semaforo de
 * stock se calcula en el frontend a partir del stock actual y los umbrales
 * configurados en el backend (STD 5.6); esta clase no calcula el color.
 */
@Entity
@Table(name = "almacen")
public class Almacen {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "almacen_id")
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(name = "tipo_almacen", nullable = false, length = 20)
    private TipoAlmacen tipoAlmacen;

    @Embedded
    @AttributeOverrides({
            @AttributeOverride(name = "x", column = @Column(name = "pos_x")),
            @AttributeOverride(name = "y", column = @Column(name = "pos_y"))
    })
    private Nodo ubicacion;

    @Column(name = "stock_actual", nullable = false)
    private int stockActual;

    /**
     * Nombre con el que el visualizador identifica al almacen
     * (ALM-CENTRAL, ALM-NOROESTE, ALM-ESTE). No forma parte del esquema de
     * la base de datos.
     */
    @Transient
    private String codigo;

    protected Almacen() {
    }

    public Almacen(TipoAlmacen tipoAlmacen, Nodo ubicacion, int stockActual) {
        this.tipoAlmacen = tipoAlmacen;
        this.ubicacion = ubicacion;
        this.stockActual = stockActual;
    }

    public Almacen(String codigo, TipoAlmacen tipoAlmacen, Nodo ubicacion, int stockActual) {
        this(tipoAlmacen, ubicacion, stockActual);
        this.codigo = codigo;
    }

    public Long getId() {
        return id;
    }

    public TipoAlmacen getTipoAlmacen() {
        return tipoAlmacen;
    }

    public Nodo getUbicacion() {
        return ubicacion;
    }

    public int getStockActual() {
        return stockActual;
    }

    public void setStockActual(int stockActual) {
        this.stockActual = stockActual;
    }

    public String getCodigo() {
        return codigo;
    }

    public void setCodigo(String codigo) {
        this.codigo = codigo;
    }

    public boolean esCentral() {
        return tipoAlmacen == TipoAlmacen.CENTRAL;
    }
}
