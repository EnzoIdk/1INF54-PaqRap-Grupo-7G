package pe.edu.pucp.paqrap;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class PaqrapApplication {

    public static void main(String[] args) {
        SpringApplication.run(PaqrapApplication.class, args);
    }
}
