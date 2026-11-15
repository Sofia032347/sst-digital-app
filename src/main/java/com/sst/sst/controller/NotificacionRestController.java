package com.sst.sst.controller;

import com.sst.sst.model.Notificacion;
import com.sst.sst.model.Usuario;
import com.sst.sst.repository.UsuarioRepository;
import com.sst.sst.service.NotificacionService;
import com.sst.sst.service.RecordatorioPausaService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notificaciones")
public class NotificacionRestController {

    private final NotificacionService servicio;

    private final RecordatorioPausaService recordatorios;

    private final UsuarioRepository usuarios;

    public NotificacionRestController(
            NotificacionService servicio,
            RecordatorioPausaService recordatorios,
            UsuarioRepository usuarios
    ) {
        this.servicio = servicio;
        this.recordatorios = recordatorios;
        this.usuarios = usuarios;
    }

    // ==========================================
    // DTO SEGURO PARA ANGULAR
    // ==========================================

    // No enviamos entidades JPA completas.
    // Evitamos serializar proxies de Hibernate
    // relacionados con Usuario o Actividad.

    public record NotificacionDto(
            Long id,
            String tipo,
            String titulo,
            String mensaje,
            String estado,
            boolean leida,
            LocalDateTime fechaCreacion,
            LocalDateTime fechaProgramada,
            LocalDateTime proximoAviso,
            LocalDateTime fechaAtencion,
            int vecesPospuesta
    ) {
    }

    // ==========================================
    // CONVERTIR ENTIDAD A DTO
    // ==========================================

    private NotificacionDto convertir(
            Notificacion n
    ) {

        return new NotificacionDto(
                n.getId(),
                n.getTipo(),
                n.getTitulo(),
                n.getMensaje(),
                n.getEstado(),
                Boolean.TRUE.equals(n.getLeida()),
                n.getFechaCreacion(),
                n.getFechaProgramada(),
                n.getProximoAviso(),
                n.getFechaAtencion(),
                n.getVecesPospuesta()
        );
    }

    // ==========================================
    // USUARIO AUTENTICADO
    // ==========================================

    private Usuario usuario(
            Authentication authentication
    ) {

        if (
                authentication == null ||
                        !authentication.isAuthenticated()
        ) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Debes iniciar sesión"
            );
        }

        return usuarios.findByEmail(
                authentication.getName()
        ).orElseThrow(() ->
                new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED,
                        "No se encontró el usuario autenticado"
                )
        );
    }

    // ==========================================
    // HISTORIAL DE LA CAMPANA
    // ==========================================

    @GetMapping
    public List<NotificacionDto> historial(
            Authentication authentication
    ) {

        Long usuarioId =
                usuario(authentication).getId();

        return servicio.obtenerHistorial(usuarioId)
                .stream()
                .map(this::convertir)
                .toList();
    }

    // ==========================================
    // NOTIFICACIONES PENDIENTES
    // ==========================================

    @GetMapping("/pendientes")
    public List<NotificacionDto> pendientes(
            Authentication authentication
    ) {

        Long usuarioId =
                usuario(authentication).getId();

        return servicio.obtenerPendientes(usuarioId)
                .stream()
                .map(this::convertir)
                .toList();
    }

    // ==========================================
    // RECORDATORIOS VENCIDOS
    // ==========================================

    @GetMapping("/vencidas")
    public List<NotificacionDto> vencidas(
            Authentication authentication
    ) {

        Long usuarioId =
                usuario(authentication).getId();

        return servicio
                .obtenerRecordatoriosVencidos(usuarioId)
                .stream()
                .map(this::convertir)
                .toList();
    }

    // ==========================================
    // CONTADOR SIN LEER
    // ==========================================

    @GetMapping("/contador")
    public Map<String, Long> contador(
            Authentication authentication
    ) {

        long sinLeer = servicio.contarSinLeer(
                usuario(authentication).getId()
        );

        return Map.of(
                "pendientes",
                sinLeer
        );
    }

    // ==========================================
    // SINCRONIZAR TEMPORIZADOR GLOBAL
    // ==========================================

    @GetMapping("/sincronizar")
    public Map<String, Object> sincronizar(
            Authentication authentication,
            HttpSession session
    ) {

        Usuario empleado =
                usuario(authentication);

        LocalDateTime horaInicioSesion =
                (LocalDateTime) session.getAttribute(
                        "horaInicioSesion"
                );

        // Mantener el horario de inicio
        // que registró Spring Security.
        //
        // No reiniciar en cada petición.

        if (horaInicioSesion == null) {

            horaInicioSesion =
                    LocalDateTime.now();

            session.setAttribute(
                    "horaInicioSesion",
                    horaInicioSesion
            );
        }

        RecordatorioPausaService.EstadoPausa estado =
                recordatorios.sincronizar(
                        empleado,
                        horaInicioSesion
                );

        Map<String, Object> respuesta =
                new HashMap<>();

        respuesta.put(
                "estado",
                estado.estado()
        );

        respuesta.put(
                "faltan",
                estado.faltan()
        );

        respuesta.put(
                "proximaPausa",
                estado.proximaPausa()
        );

        respuesta.put(
                "notificacionId",
                estado.notificacionId()
        );

        // ======================================
        // MARCAS DE TIEMPO PARA ANGULAR
        // ======================================

        respuesta.put(
                "servidorAhoraEpochMs",
                System.currentTimeMillis()
        );

        Long proximaPausaEpochMs = null;

        if (estado.proximaPausa() != null) {

            proximaPausaEpochMs =
                    estado.proximaPausa()
                            .atZone(
                                    ZoneId.systemDefault()
                            )
                            .toInstant()
                            .toEpochMilli();
        }

        respuesta.put(
                "proximaPausaEpochMs",
                proximaPausaEpochMs
        );

        return respuesta;
    }

    // ==========================================
    // POSPONER CINCO MINUTOS
    // ==========================================

    public record SolicitudPosponer(
            Integer minutos
    ) {
    }

    @PostMapping("/{id}/posponer")
    public NotificacionDto posponer(
            @PathVariable Long id,
            @RequestBody(required = false)
            SolicitudPosponer solicitud,
            Authentication authentication
    ) {

        Notificacion guardada =
                servicio.posponerRecordatorio(
                        id,
                        usuario(authentication).getId(),
                        5
                );

        return convertir(guardada);
    }

    // ==========================================
    // MARCAR UNA COMO LEÍDA
    // ==========================================

    @PostMapping("/{id}/leer")
    public ResponseEntity<Void> leer(
            @PathVariable Long id,
            Authentication authentication
    ) {

        servicio.marcarComoLeida(
                id,
                usuario(authentication).getId()
        );

        return ResponseEntity
                .noContent()
                .build();
    }

    // ==========================================
    // MARCAR TODAS COMO LEÍDAS
    // ==========================================

    @PostMapping("/leer-todas")
    public ResponseEntity<Void> leerTodas(
            Authentication authentication
    ) {

        servicio.marcarTodasComoLeidas(
                usuario(authentication).getId()
        );

        return ResponseEntity
                .noContent()
                .build();
    }

    // ==========================================
    // TOKEN CSRF
    // ==========================================

    @GetMapping("/csrf")
    public Map<String, String> csrf(
            HttpServletRequest request
    ) {

        CsrfToken token =
                (CsrfToken) request.getAttribute(
                        CsrfToken.class.getName()
                );

        if (token == null) {

            token =
                    (CsrfToken) request.getAttribute(
                            "_csrf"
                    );
        }

        if (token == null) {

            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "No se encontró el token CSRF"
            );
        }

        return Map.of(
                "token",
                token.getToken(),
                "headerName",
                token.getHeaderName()
        );
    }
}