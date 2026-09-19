package pe.edu.pucp.paqrap.controller;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pe.edu.pucp.paqrap.dto.PedidoDto;
import pe.edu.pucp.paqrap.dto.RegistrarPedidoRequest;
import pe.edu.pucp.paqrap.model.Pedido;
import pe.edu.pucp.paqrap.service.PedidoService;
import pe.edu.pucp.paqrap.simulacion.RelojVirtual;

import java.util.List;

/**
 * Recibe las solicitudes del visualizador relacionadas con pedidos. No
 * contiene logica de negocio; delega en {@link PedidoService} (STD 4.3).
 */
@RestController
@RequestMapping("/api/pedidos")
public class PedidoController {

    private final PedidoService pedidoService;
    private final RelojVirtual relojVirtual;

    public PedidoController(PedidoService pedidoService, RelojVirtual relojVirtual) {
        this.pedidoService = pedidoService;
        this.relojVirtual = relojVirtual;
    }

    @PostMapping
    public ResponseEntity<PedidoDto> registrarPedido(@Valid @RequestBody RegistrarPedidoRequest request) {
        Pedido pedido = pedidoService.registrarPedido(request, relojVirtual.getMinutoSimulacionActual());
        return ResponseEntity.status(HttpStatus.CREATED).body(aDto(pedido));
    }

    @GetMapping("/pendientes")
    public List<PedidoDto> obtenerPedidosPendientes() {
        return pedidoService.obtenerPedidosPendientes().stream().map(this::aDto).toList();
    }

    private PedidoDto aDto(Pedido pedido) {
        return new PedidoDto(
                pedido.getId(),
                pedido.getClienteId(),
                pedido.getUbicacion().getX(),
                pedido.getUbicacion().getY(),
                pedido.getCantidadProducto(),
                pedido.getPlazoHoras(),
                pedido.getMinutoSimulacion(),
                pedido.getEstado());
    }
}
