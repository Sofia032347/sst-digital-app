package com.sst.sst.config;

import com.sst.sst.model.Usuario;
import com.sst.sst.repository.UsuarioRepository;
import com.sst.sst.service.UsuarioDetailsService;

import jakarta.servlet.http.HttpSession;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;

import java.time.LocalDateTime;

@Configuration
public class SecurityConfig {

    private final UsuarioRepository usuarioRepository;

    public SecurityConfig(UsuarioRepository usuarioRepository) {
        this.usuarioRepository = usuarioRepository;
    }

    // ============================================
    // AUTENTICACIÓN CON BASE DE DATOS Y BCRYPT
    // ============================================

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

    // ============================================
    // CONFIGURACIÓN DE SEGURIDAD HTTP
    // ============================================

    @Bean
    public SecurityFilterChain securityFilterChain(
            HttpSecurity http,
            AuthenticationProvider authenticationProvider
    ) throws Exception {

        http
                .authenticationProvider(authenticationProvider)

                .authorizeHttpRequests(auth -> auth

                        // ====================================
                        // 1. PÁGINAS Y RECURSOS PÚBLICOS
                        // ====================================

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

                        // ====================================
                        // 2. FUNCIONES EXCLUSIVAS DE RRHH
                        // ====================================

                        .requestMatchers(
                                "/usuarios/**",
                                "/actividades/rrhh",
                                "/actividades/reportes",
                                "/actividades/descargar",
                                "/actividades/api/pendientes-hoy"
                        ).hasRole("RRHH")

                        // ====================================
                        // 3. IDENTIDAD DE SESIÓN PARA ANGULAR
                        // ====================================

                        .requestMatchers(
                                "/api/auth/me"
                        ).authenticated()

                        // ====================================
                        // 4. ESTADÍSTICAS PARA ANGULAR
                        // ====================================

                        .requestMatchers(
                                "/api/empleado/**"
                        ).hasAnyRole("EMPLEADO", "RRHH")

                        // ====================================
                        // 5. NOTIFICACIONES DE SST DIGITAL
                        // ====================================
                        //
                        // Permite:
                        //
                        // GET  /api/notificaciones
                        // GET  /api/notificaciones/pendientes
                        // GET  /api/notificaciones/contador
                        // GET  /api/notificaciones/vencidas
                        //
                        // POST /api/notificaciones/{id}/posponer
                        //
                        // Cada usuario solo consulta sus
                        // propias notificaciones.
                        // La validación de propiedad se
                        // realiza en el servicio REST.
                        //
                        // CSRF permanece habilitado.

                        .requestMatchers(
                                "/api/notificaciones/**"
                        ).hasAnyRole("EMPLEADO", "RRHH")

                        // ====================================
                        // 6. BLOQUEAR LAS DEMÁS API
                        // ====================================

                        .requestMatchers(
                                "/api/**"
                        ).denyAll()

                        // ====================================
                        // 7. OTRAS PÁGINAS REQUIEREN LOGIN
                        // ====================================

                        .anyRequest().authenticated()
                )

                // ============================================
                // LOGIN
                // ============================================

                .formLogin(form -> form

                        .loginPage("/login")
                        .loginProcessingUrl("/login")

                        .usernameParameter("email")
                        .passwordParameter("password")

                        .failureUrl("/login?error")

                        .successHandler(
                                (request, response, authentication) -> {

                                    Usuario usuario = usuarioRepository
                                            .findByEmail(
                                                    authentication.getName()
                                            )
                                            .orElseThrow(() ->
                                                    new IllegalStateException(
                                                            "Usuario autenticado no encontrado"
                                                    )
                                            );

                                    // ====================================
                                    // COMPATIBILIDAD CON THYMELEAF
                                    // ====================================

                                    Usuario usuarioSesion = new Usuario();

                                    usuarioSesion.setId(
                                            usuario.getId()
                                    );

                                    usuarioSesion.setNombre(
                                            usuario.getNombre()
                                    );

                                    usuarioSesion.setEmail(
                                            usuario.getEmail()
                                    );

                                    usuarioSesion.setDepartamento(
                                            usuario.getDepartamento()
                                    );

                                    usuarioSesion.setRol(
                                            usuario.getRol()
                                    );

                                    // Nunca guardar la contraseña
                                    // dentro del objeto de sesión.

                                    HttpSession session =
                                            request.getSession(true);

                                    session.setAttribute(
                                            "usuarioLogueado",
                                            usuarioSesion
                                    );

                                    session.setAttribute(
                                            "horaInicioSesion",
                                            LocalDateTime.now()
                                    );

                                    // ====================================
                                    // REDIRECCIÓN SEGÚN EL ROL
                                    // ====================================

                                    boolean esRRHH =
                                            authentication.getAuthorities()
                                                    .stream()
                                                    .anyMatch(a ->
                                                            "ROLE_RRHH".equals(
                                                                    a.getAuthority()
                                                            )
                                                    );

                                    String destino = esRRHH
                                            ? "/actividades/rrhh"
                                            : "/actividades/empleado";

                                    response.sendRedirect(
                                            request.getContextPath() + destino
                                    );
                                }
                        )

                        .permitAll()
                )

                // ============================================
                // CIERRE DE SESIÓN
                // ============================================

                .logout(logout -> logout

                        .logoutUrl("/logout")

                        .logoutSuccessUrl("/index")

                        .invalidateHttpSession(true)

                        .deleteCookies("JSESSIONID")

                        .permitAll()
                )

                // ============================================
                // PROTECCIÓN CONTRA FIJACIÓN DE SESIÓN
                // ============================================

                .sessionManagement(session -> session

                        .sessionFixation(fixation ->
                                fixation.changeSessionId()
                        )
                );

        // ============================================
        // CSRF CONTINÚA ACTIVADO
        // ============================================

        return http.build();
    }
}