package pe.edu.pucp.paqrap.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import pe.edu.pucp.paqrap.enums.TipoAlmacen;
import pe.edu.pucp.paqrap.model.Almacen;

import java.util.List;

public interface AlmacenRepository extends JpaRepository<Almacen, Long> {

    List<Almacen> findByTipoAlmacen(TipoAlmacen tipoAlmacen);
}
