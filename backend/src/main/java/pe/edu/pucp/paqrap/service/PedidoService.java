package pe.edu.pucp.paqrap.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import pe.edu.pucp.paqrap.config.ConstantesPaqrap;
import pe.edu.pucp.paqrap.dto.RegistrarPedidoRequest;
import pe.edu.pucp.paqrap.enums.EstadoPedido;
import pe.edu.pucp.paqrap.exception.PedidoInvalidoException;
import pe.edu.pucp.paqrap.model.Nodo;
import pe.edu.pucp.paqrap.model.Pedido;
import pe.edu.pucp.paqrap.repository.PedidoRepository;

import java.util.Arrays;
import java.util.List;

/**
 * Reglas de negocio para el registro y consulta de pedidos (STD 4.3).
 */
@Service
public class PedidoService {

    private static final Logger log = LoggerFactory.getLogger(PedidoService.class);

    private final PedidoRepository pedidoRepository;

    public PedidoService(PedidoRepository pedidoRepository) {
        this.pedidoRepository = pedidoRepository;
    }

    public Pedido registrarPedido(RegistrarPedidoRequest request, int minutoSimulacion) {
        validarPlazoHoras(request.plazoHoras());

        Pedido pedido = new Pedido(
                request.clienteId(),
                new Nodo(request.posX(), request.posY()),
                request.cantidadProducto(),
                request.plazoHoras(),
                minutoSimulacion);

        Pedido pedidoGuardado = pedidoRepository.save(pedido);
        log.info("Pedido {} registrado para el cliente {}", pedidoGuardado.getId(), pedidoGuardado.getClienteId());
        return pedidoGuardado;
    }

    public List<Pedido> obtenerPedidosPendientes() {
        return pedidoRepository.findByEstado(EstadoPedido.PENDIENTE);
    }

    private void validarPlazoHoras(int plazoHoras) {
        boolean esValido = Arrays.stream(ConstantesPaqrap.PLAZOS_HORAS_VALIDOS)
                .anyMatch(plazo -> plazo == plazoHoras);
        if (!esValido) {
            throw new PedidoInvalidoException("El plazo de " + plazoHoras + " horas no esta permitido");
        }
    }
}
