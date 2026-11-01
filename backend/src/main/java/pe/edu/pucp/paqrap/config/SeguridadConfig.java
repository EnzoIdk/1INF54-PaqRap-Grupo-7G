package pe.edu.pucp.paqrap.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.ProviderManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.security.web.csrf.CsrfTokenRequestAttributeHandler;
import pe.edu.pucp.paqrap.dto.UsuarioResponse;
import pe.edu.pucp.paqrap.model.Usuario;
import pe.edu.pucp.paqrap.repository.UsuarioRepository;
import pe.edu.pucp.paqrap.service.LimitadorIntentosLogin;

import java.io.IOException;
import java.util.Map;

@Configuration
@EnableWebSecurity
public class SeguridadConfig {

    private static final String RUTA_LOGIN = "/api/auth/login";

    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    AuthenticationManager authenticationManager(UserDetailsService userDetailsService,
                                                 PasswordEncoder passwordEncoder) {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider();
        provider.setUserDetailsService(userDetailsService);
        provider.setPasswordEncoder(passwordEncoder);
        return new ProviderManager(provider);
    }

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http,
                                            ObjectMapper objectMapper,
                                            UsuarioRepository usuarioRepository,
                                            LimitadorIntentosLogin limitador) throws Exception {
        CookieCsrfTokenRepository csrfRepository = CookieCsrfTokenRepository.withHttpOnlyFalse();
        CsrfTokenRequestAttributeHandler csrfHandler = new CsrfTokenRequestAttributeHandler();
        csrfHandler.setCsrfRequestAttributeName(null);

        http
                .csrf(csrf -> csrf
                        .csrfTokenRepository(csrfRepository)
                        .csrfTokenRequestHandler(csrfHandler))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/api/auth/**", "/actuator/health").permitAll()
                        .requestMatchers("/api/admin/**").hasRole("ADMIN")
                        .requestMatchers("/api/**", "/ws-paqrap/**").authenticated()
                        .anyRequest().permitAll())
                // Limite de intentos (fuerza bruta): un usuario o IP bloqueados no llegan a probar la clave.
                .addFilterBefore(new FiltroIntentosLogin(limitador, objectMapper, RUTA_LOGIN),
                        UsernamePasswordAuthenticationFilter.class)
                .formLogin(form -> form
                        .loginProcessingUrl(RUTA_LOGIN)
                        .usernameParameter("username")
                        .passwordParameter("password")
                        .successHandler((request, response, authentication) -> {
                            limitador.registrarExito(authentication.getName());
                            Usuario usuario = usuarioRepository.findByUsername(authentication.getName())
                                    .orElseThrow();
                            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                            response.setCharacterEncoding("UTF-8");
                            objectMapper.writeValue(response.getWriter(), UsuarioResponse.desde(usuario));
                        })
                        .failureHandler((request, response, exception) -> {
                            int restantes = limitador.registrarFallo(
                                    request.getParameter("username"), request.getRemoteAddr());
                            if (restantes == 0) {
                                FiltroIntentosLogin.responderBloqueo(objectMapper, response, limitador.getBloqueo());
                                return;
                            }
                            escribirError(objectMapper, response, HttpStatus.UNAUTHORIZED,
                                    "Usuario o contraseña incorrectos. "
                                            + (restantes == 1 ? "Te queda 1 intento" : "Te quedan " + restantes + " intentos")
                                            + " antes del bloqueo temporal.");
                        }))
                .logout(logout -> logout
                        .logoutUrl("/api/auth/logout")
                        .invalidateHttpSession(true)
                        .clearAuthentication(true)
                        .deleteCookies("JSESSIONID", "XSRF-TOKEN")
                        .logoutSuccessHandler((request, response, authentication) -> {
                            response.setStatus(HttpStatus.NO_CONTENT.value());
                        }))
                .sessionManagement(session -> session
                        .sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED)
                        .sessionFixation(fixation -> fixation.changeSessionId()))
                .exceptionHandling(exceptions -> exceptions
                        .authenticationEntryPoint((request, response, exception) ->
                                escribirError(objectMapper, response, HttpStatus.UNAUTHORIZED,
                                        "Inicia sesión para continuar"))
                        .accessDeniedHandler((request, response, exception) ->
                                escribirError(objectMapper, response, HttpStatus.FORBIDDEN,
                                        "No tienes permisos para realizar esta acción")));

        return http.build();
    }

    private static void escribirError(ObjectMapper mapper, HttpServletResponse response,
                                      HttpStatus status, String mensaje) throws IOException {
        response.setStatus(status.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        mapper.writeValue(response.getWriter(), Map.of("message", mensaje));
    }
}
