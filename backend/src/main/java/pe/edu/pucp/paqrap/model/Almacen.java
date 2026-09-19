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

    protected Almacen() {
    }

    public Almacen(TipoAlmacen tipoAlmacen, Nodo ubicacion, int stockActual) {
        this.tipoAlmacen = tipoAlmacen;
        this.ubicacion = ubicacion;
        this.stockActual = stockActual;
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
}
