package pe.edu.pucp.paqrap.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import pe.edu.pucp.paqrap.enums.EstadoPedido;
import pe.edu.pucp.paqrap.model.Pedido;

import java.util.List;

public interface PedidoRepository extends JpaRepository<Pedido, Long> {

    List<Pedido> findByEstado(EstadoPedido estado);
}
