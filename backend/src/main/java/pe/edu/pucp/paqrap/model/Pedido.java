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
import pe.edu.pucp.paqrap.config.ConstantesPaqrap;
import pe.edu.pucp.paqrap.enums.EstadoPedido;

import java.time.LocalDateTime;

/**
 * Pedido del producto "P" registrado por un cliente (STD 2.2). Es el unico
 * termino admitido para este concepto; no se usan "Envio", "Orden" ni
 * "Solicitud" como sinonimos.
 */
@Entity
@Table(name = "pedido")
public class Pedido {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "pedido_id")
    private Long id;

    @Column(name = "cliente_id", nullable = false, length = 10)
    private String clienteId;

    @Embedded
    @AttributeOverrides({
            @AttributeOverride(name = "x", column = @Column(name = "pos_x")),
            @AttributeOverride(name = "y", column = @Column(name = "pos_y"))
    })
    private Nodo ubicacion;

    @Column(name = "cantidad_producto", nullable = false)
    private int cantidadProducto;

    @Column(name = "plazo_horas", nullable = false)
    private int plazoHoras;

    @Column(name = "minuto_simulacion", nullable = false)
    private int minutoSimulacion;

    @Enumerated(EnumType.STRING)
    @Column(name = "estado", nullable = false, length = 20)
    private EstadoPedido estado = EstadoPedido.PENDIENTE;

    @Column(name = "registrado_en", nullable = false)
    private LocalDateTime registradoEn;

    /**
     * Codigo correlativo P-#### que identifica al pedido dentro de una
     * ejecucion de la experimentacion numerica, donde los pedidos se leen de
     * un archivo de ventas y no llegan a persistirse. No forma parte del
     * esquema de la base de datos.
     */
    @Transient
    private String codigo;

    protected Pedido() {
    }

    public Pedido(String clienteId, Nodo ubicacion, int cantidadProducto, int plazoHoras, int minutoSimulacion) {
        this.clienteId = clienteId;
        this.ubicacion = ubicacion;
        this.cantidadProducto = cantidadProducto;
        this.plazoHoras = plazoHoras;
        this.minutoSimulacion = minutoSimulacion;
        this.registradoEn = LocalDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public String getClienteId() {
        return clienteId;
    }

    public Nodo getUbicacion() {
        return ubicacion;
    }

    public int getCantidadProducto() {
        return cantidadProducto;
    }

    public int getPlazoHoras() {
        return plazoHoras;
    }

    public int getMinutoSimulacion() {
        return minutoSimulacion;
    }

    public EstadoPedido getEstado() {
        return estado;
    }

    public void setEstado(EstadoPedido estado) {
        this.estado = estado;
    }

    public LocalDateTime getRegistradoEn() {
        return registradoEn;
    }

    public String getCodigo() {
        return codigo;
    }

    public void setCodigo(String codigo) {
        this.codigo = codigo;
    }

    /**
     * Minuto de simulacion en que vence el plazo comprometido. La hora de
     * entrega al destinatario no se contabiliza dentro de este plazo, por lo
     * que el limite se compara contra la hora de llegada al cliente.
     */
    public int getMinutoLimiteEntrega() {
        return minutoSimulacion + plazoHoras * ConstantesPaqrap.MINUTOS_POR_HORA;
    }
}
