package com.sst.sst.config;

import com.sst.sst.model.RegistroAcceso;
import com.sst.sst.model.Usuario;
import com.sst.sst.repository.RegistroAccesoRepository;
import com.sst.sst.repository.UsuarioRepository;
import com.sst.sst.service.UsuarioDetailsService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.logout.HttpStatusReturningLogoutSuccessHandler;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Configuration
public class SecurityConfig {

    private final UsuarioRepository usuarioRepository;
    private final RegistroAccesoRepository registroAccesoRepository;

    public SecurityConfig(
            UsuarioRepository usuarioRepository,
            RegistroAccesoRepository registroAccesoRepository
    ) {
        this.usuarioRepository = usuarioRepository;
        this.registroAccesoRepository = registroAccesoRepository;
    }

    // ==========================================
    // CONFIGURACIÓN CORS PARA ANGULAR Y RENDER
    // ==========================================

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {

        CorsConfiguration configuration = new CorsConfiguration();

        List<String> origins = new ArrayList<>();

        // Desarrollo local de Angular
        origins.add("http://localhost:4200");

        // Frontend publicado en Render
        String frontendUrl = System.getenv("FRONTEND_URL");

        if (frontendUrl != null && !frontendUrl.isBlank()) {
            origins.add(frontendUrl.trim());
        }

        configuration.setAllowedOrigins(origins);

        configuration.setAllowedMethods(
                List.of(
                        "GET",
                        "POST",
                        "PUT",
                        "PATCH",
                        "DELETE",
                        "OPTIONS"
                )
        );

        configuration.setAllowedHeaders(
                List.of(
                        "Authorization",
                        "Content-Type",
                        "Accept",
                        "X-Requested-With",
                        "X-CSRF-TOKEN",
                        "X-XSRF-TOKEN"
                )
        );

        // Necesario para enviar y recibir cookies de sesión
        configuration.setAllowCredentials(true);

        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source =
                new UrlBasedCorsConfigurationSource();

        source.registerCorsConfiguration("/**", configuration);

        return source;
    }

    // ==========================================
    // PROVEEDOR DE AUTENTICACIÓN
    // ==========================================

    @Bean
    public AuthenticationProvider authenticationProvider(
            UsuarioDetailsService usuarioDetailsService,
            PasswordEncoder passwordEncoder
    ) {

        DaoAuthenticationProvider provider =
                new DaoAuthenticationProvider(usuarioDetailsService);

        provider.setPasswordEncoder(passwordEncoder);

        return provider;
    }

    // ==========================================
    // IDENTIFICAR PETICIONES DE ANGULAR
    // ==========================================

    private boolean esPeticionAngular(
            HttpServletRequest request
    ) {

        String accept = request.getHeader("Accept");
        String requestedWith = request.getHeader("X-Requested-With");

        return (
                accept != null &&
                        accept.contains("application/json")
        ) || "XMLHttpRequest".equalsIgnoreCase(requestedWith);
    }

    // ==========================================
    // CONFIGURACIÓN DE SEGURIDAD
    // ==========================================

    @Bean
    public SecurityFilterChain securityFilterChain(
            HttpSecurity http,
            AuthenticationProvider authenticationProvider
    ) throws Exception {

        http

                // Habilitar CORS para el frontend Angular
                .cors(cors ->
                        cors.configurationSource(corsConfigurationSource())
                )

                .authenticationProvider(authenticationProvider)

                // ==================================
                // AUTORIZACIÓN DE RUTAS
                // ==================================

                .authorizeHttpRequests(auth -> auth

                        // Recursos públicos
                        .requestMatchers(
                                "/",
                                "/index",
                                "/login",
                                "/error",
                                "/favicon.ico",
                                "/css/**",
                                "/js/**",
                                "/img/**",
                                "/images/**",
                                "/assets/**",
                                "/webjars/**"
                        ).permitAll()

                        // Token CSRF disponible antes del inicio de sesión
                        .requestMatchers(
                                "/api/auth/csrf",
                                "/actividades/csrf"
                        ).permitAll()

                        // Consultar el usuario que inició sesión
                        .requestMatchers(
                                "/api/auth/me"
                        ).authenticated()

                        // Vistas administrativas existentes
                        .requestMatchers(
                                "/usuarios/**",
                                "/actividades/rrhh",
                                "/actividades/reportes",
                                "/actividades/descargar",
                                "/actividades/api/pendientes-hoy"
                        ).hasRole("RRHH")

                        // Perfil personal de RRHH
                        .requestMatchers(
                                "/api/rrhh/perfil",
                                "/api/rrhh/perfil/**"
                        ).hasRole("RRHH")

                        // Perfil personal de EMPLEADO
                        .requestMatchers(
                                "/api/empleado/perfil",
                                "/api/empleado/perfil/**"
                        ).hasRole("EMPLEADO")

                        // Resto de funcionalidades de RRHH
                        .requestMatchers(
                                "/api/rrhh/**"
                        ).hasRole("RRHH")

                        // Resumen y temporizador personal compartidos
                        .requestMatchers(
                                "/api/empleado/**"
                        ).hasAnyRole("EMPLEADO", "RRHH")

                        // Notificaciones compartidas
                        .requestMatchers(
                                "/api/notificaciones/**"
                        ).hasAnyRole("EMPLEADO", "RRHH")

                        // Otras API no autorizadas
                        .requestMatchers(
                                "/api/**"
                        ).denyAll()

                        .anyRequest().authenticated()
                )

                // ==================================
                // INICIO DE SESIÓN
                // ==================================

                .formLogin(form -> form

                        .loginPage("/login")
                        .loginProcessingUrl("/login")

                        .usernameParameter("email")
                        .passwordParameter("password")

                        .successHandler((request, response, authentication) -> {

                            Usuario usuario = usuarioRepository
                                    .findByEmail(authentication.getName())
                                    .orElseThrow(() ->
                                            new IllegalStateException(
                                                    "Usuario autenticado no encontrado"
                                            )
                                    );

                            // Copia sin contraseña para compatibilidad
                            // con la aplicación Thymeleaf.
                            Usuario usuarioSesion = new Usuario();

                            usuarioSesion.setId(usuario.getId());
                            usuarioSesion.setNombre(usuario.getNombre());
                            usuarioSesion.setEmail(usuario.getEmail());
                            usuarioSesion.setDepartamento(
                                    usuario.getDepartamento()
                            );
                            usuarioSesion.setRol(usuario.getRol());

                            HttpSession session =
                                    request.getSession(true);

                            session.setAttribute(
                                    "usuarioLogueado",
                                    usuarioSesion
                            );

                            LocalDateTime ahora = LocalDateTime.now();

                            session.setAttribute(
                                    "horaInicioSesion",
                                    ahora
                            );

                            // Registrar login exitoso
                            registroAccesoRepository.save(
                                    new RegistroAcceso(usuario, ahora)
                            );

                            // Angular recibe confirmación sin HTML.
                            if (esPeticionAngular(request)) {

                                response.setStatus(
                                        HttpStatus.NO_CONTENT.value()
                                );

                                return;
                            }

                            // Conservar redirecciones de Thymeleaf.
                            boolean esRRHH = authentication
                                    .getAuthorities()
                                    .stream()
                                    .anyMatch(a ->
                                            "ROLE_RRHH".equals(a.getAuthority())
                                    );

                            String destino = esRRHH
                                    ? "/actividades/rrhh"
                                    : "/actividades/empleado";

                            response.sendRedirect(
                                    request.getContextPath() + destino
                            );
                        })

                        .failureHandler((request, response, exception) -> {

                            if (esPeticionAngular(request)) {

                                response.setStatus(
                                        HttpStatus.UNAUTHORIZED.value()
                                );

                                response.setContentType(
                                        "application/json;charset=UTF-8"
                                );

                                response.getWriter().write(
                                        "{\"mensaje\":\"Correo o contraseña incorrectos\"}"
                                );

                                return;
                            }

                            response.sendRedirect(
                                    request.getContextPath() + "/login?error"
                            );
                        })

                        .permitAll()
                )

                // ==================================
                // CIERRE DE SESIÓN
                // ==================================

                .logout(logout -> logout

                        .logoutUrl("/logout")

                        .logoutSuccessHandler(
                                new HttpStatusReturningLogoutSuccessHandler(
                                        HttpStatus.NO_CONTENT
                                )
                        )

                        .invalidateHttpSession(true)
                        .clearAuthentication(true)
                        .deleteCookies("JSESSIONID")
                        .permitAll()
                )

                // ==================================
                // ADMINISTRACIÓN DE SESIONES
                // ==================================

                .sessionManagement(session -> session

                        .sessionFixation(fixation ->
                                fixation.changeSessionId()
                        )
                );

        // Mantener la protección CSRF.
        return http.build();
    }
}