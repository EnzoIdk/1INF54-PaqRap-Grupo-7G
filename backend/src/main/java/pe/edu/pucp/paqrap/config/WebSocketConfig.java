package pe.edu.pucp.paqrap.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

/**
 * Habilita STOMP sobre WebSocket para el flujo de eventos de la simulacion
 * hacia el visualizador (STD 4.2). Los canales siguen el patron
 * {@code /topic/{escenario}/{recurso}}, por ejemplo
 * {@code /topic/simulacion5d/unidades}.
 */
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        registry.enableSimpleBroker("/topic");
        registry.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws-paqrap").setAllowedOriginPatterns("*").withSockJS();
    }
}
