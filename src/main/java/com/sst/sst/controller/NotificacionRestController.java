package com.sst.sst.controller;

import com.sst.sst.model.Notificacion;
import com.sst.sst.model.Usuario;
import com.sst.sst.repository.UsuarioRepository;
import com.sst.sst.service.NotificacionService;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import org.springframework.security.core.Authentication;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/notificaciones")
public class NotificacionRestController {

    private final NotificacionService notificacionService;
    private final UsuarioRepository usuarioRepository;

    public NotificacionRestController(
            NotificacionService notificacionService,
            UsuarioRepository usuarioRepository
    ) {
        this.notificacionService = notificacionService;
        this.usuarioRepository = usuarioRepository;
    }

    // ============================================
    // IDENTIFICAR AL USUARIO AUTENTICADO
    // ============================================

    private Usuario obtenerUsuario(
            Authentication authentication
    ) {

        if (authentication == null
                || !authentication.isAuthenticated()
                || "anonymousUser".equals(
                authentication.getPrincipal()
        )) {

            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Debes iniciar sesión"
            );
        }

        return usuarioRepository
                .findByEmail(authentication.getName())
                .orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.UNAUTHORIZED,
                                "Usuario autenticado no encontrado"
                        )
                );
    }

    // ============================================
    // CONVERTIR ENTIDAD A RESPUESTA SEGURA
    // ============================================

    private NotificacionRespuesta convertir(
            Notificacion notificacion
    ) {

        return new NotificacionRespuesta(
                notificacion.getId(),
                notificacion.getTipo(),
                notificacion.getTitulo(),
                notificacion.getMensaje(),
                notificacion.getEstado(),
                notificacion.getFechaCreacion(),
                notificacion.getFechaProgramada(),
                notificacion.getProximoAviso(),
                notificacion.getFechaAtencion(),
                notificacion.getVecesPospuesta()
        );
    }

    // ============================================
    // 1. HISTORIAL DE NOTIFICACIONES
    // GET /api/notificaciones
    // ============================================

    @GetMapping
    public ResponseEntity<List<NotificacionRespuesta>>
    obtenerHistorial(Authentication authentication) {

        Usuario usuario = obtenerUsuario(authentication);

        List<NotificacionRespuesta> historial =
                notificacionService
                        .obtenerHistorial(usuario.getId())
                        .stream()
                        .map(this::convertir)
                        .toList();

        return ResponseEntity.ok(historial);
    }

    // ============================================
    // 2. NOTIFICACIONES PENDIENTES
    // GET /api/notificaciones/pendientes
    // ============================================

    @GetMapping("/pendientes")
    public ResponseEntity<List<NotificacionRespuesta>>
    obtenerPendientes(Authentication authentication) {

        Usuario usuario = obtenerUsuario(authentication);

        List<NotificacionRespuesta> pendientes =
                notificacionService
                        .obtenerPendientes(usuario.getId())
                        .stream()
                        .map(this::convertir)
                        .toList();

        return ResponseEntity.ok(pendientes);
    }

    // ============================================
    // 3. CONTADOR PARA LA CAMPANA
    // GET /api/notificaciones/contador
    // ============================================

    @GetMapping("/contador")
    public ResponseEntity<ContadorRespuesta>
    obtenerContador(Authentication authentication) {

        Usuario usuario = obtenerUsuario(authentication);

        long cantidad =
                notificacionService.contarPendientes(
                        usuario.getId()
                );

        return ResponseEntity.ok(
                new ContadorRespuesta(cantidad)
        );
    }

    // ============================================
    // 4. RECORDATORIOS QUE DEBEN MOSTRARSE
    // GET /api/notificaciones/vencidas
    // ============================================

    @GetMapping("/vencidas")
    public ResponseEntity<List<NotificacionRespuesta>>
    obtenerVencidas(Authentication authentication) {

        Usuario usuario = obtenerUsuario(authentication);

        List<NotificacionRespuesta> vencidas =
                notificacionService
                        .obtenerRecordatoriosVencidos(
                                usuario.getId()
                        )
                        .stream()
                        .map(this::convertir)
                        .toList();

        return ResponseEntity.ok(vencidas);
    }

    // ============================================
    // 5. POSPONER UNA NOTIFICACIÓN
    // POST /api/notificaciones/{id}/posponer
    // ============================================

    @PostMapping("/{id}/posponer")
    public ResponseEntity<NotificacionRespuesta>
    posponerNotificacion(
            @PathVariable Long id,
            @RequestBody PosponerSolicitud solicitud,
            Authentication authentication
    ) {

        Usuario usuario = obtenerUsuario(authentication);

        if (solicitud == null
                || solicitud.minutos() == null) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Debes indicar los minutos"
            );
        }

        Notificacion actualizada =
                notificacionService.posponerRecordatorio(
                        id,
                        usuario.getId(),
                        solicitud.minutos()
                );

        return ResponseEntity.ok(
                convertir(actualizada)
        );
    }

    // ============================================
    // ESTRUCTURA JSON DE UNA NOTIFICACIÓN
    // ============================================

    public record NotificacionRespuesta(
            Long id,
            String tipo,
            String titulo,
            String mensaje,
            String estado,
            LocalDateTime fechaCreacion,
            LocalDateTime fechaProgramada,
            LocalDateTime proximoAviso,
            LocalDateTime fechaAtencion,
            Integer vecesPospuesta
    ) {
    }

    // ============================================
    // ESTRUCTURA JSON DEL CONTADOR
    // ============================================

    public record ContadorRespuesta(
            long pendientes
    ) {
    }

    // ============================================
    // SOLICITUD PARA POSPONER
    // ============================================

    public record PosponerSolicitud(
            Integer minutos
    ) {
    }
}
