package pe.edu.pucp.paqrap.config;

import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import pe.edu.pucp.paqrap.model.EstadoInicial;
import pe.edu.pucp.paqrap.repository.EstadoInicialRepository;

@Configuration
public class InicializadorAuth {

    @Bean
    @Profile("local")
    ApplicationRunner inicializarEstadoAuth(EstadoInicialRepository repository) {
        return args -> repository.findById(1)
                .orElseGet(() -> repository.save(new EstadoInicial(1, false)));
    }
}
