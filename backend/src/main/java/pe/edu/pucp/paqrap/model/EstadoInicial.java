package pe.edu.pucp.paqrap.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "auth_setup")
public class EstadoInicial {

    @Id
    private Integer id;

    @Column(nullable = false)
    private boolean completado;

    protected EstadoInicial() {
    }

    public EstadoInicial(Integer id, boolean completado) {
        this.id = id;
        this.completado = completado;
    }

    public boolean isCompletado() {
        return completado;
    }

    public void completar() {
        this.completado = true;
    }
}
