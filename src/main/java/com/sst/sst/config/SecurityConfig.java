
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

import org.springframework.security.web.authentication.logout
        .HttpStatusReturningLogoutSuccessHandler;

import java.time.LocalDateTime;

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

    @Bean
    public SecurityFilterChain securityFilterChain(
            HttpSecurity http,
            AuthenticationProvider authenticationProvider
    ) throws Exception {

        http
                .authenticationProvider(authenticationProvider)

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

                        // El login necesita CSRF antes de autenticarse.
                        .requestMatchers(
                                "/api/auth/csrf"
                        ).permitAll()

                        // Vistas administrativas existentes
                        .requestMatchers(
                                "/usuarios/**",
                                "/actividades/rrhh",
                                "/actividades/reportes",
                                "/actividades/descargar",
                                "/actividades/api/pendientes-hoy"
                        ).hasRole("RRHH")

                        // Dashboard y API de RRHH
                        .requestMatchers(
                                "/api/rrhh/**"
                        ).hasRole("RRHH")

                        // Sesión para Angular
                        .requestMatchers(
                                "/api/auth/me"
                        ).authenticated()

                        // Resumen personal, también para RRHH
                        .requestMatchers(
                                "/api/empleado/**"
                        ).hasAnyRole("EMPLEADO", "RRHH")

                        // Notificaciones
                        .requestMatchers(
                                "/api/notificaciones/**"
                        ).hasAnyRole("EMPLEADO", "RRHH")

                        // Bloquear otras API
                        .requestMatchers(
                                "/api/**"
                        ).denyAll()

                        .anyRequest().authenticated()
                )

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

                            HttpSession session = request.getSession(true);

                            session.setAttribute(
                                    "usuarioLogueado",
                                    usuarioSesion
                            );

                            LocalDateTime ahora = LocalDateTime.now();

                            session.setAttribute(
                                    "horaInicioSesion",
                                    ahora
                            );

                            // ====================================
                            // NUEVO: REGISTRAR LOGIN EXITOSO
                            // ====================================

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

                .sessionManagement(session -> session
                        .sessionFixation(fixation ->
                                fixation.changeSessionId()
                        )
                );

        // Mantener la protección CSRF.
        return http.build();
    }
}
