
package com.sst.sst.service;

import com.sst.sst.model.Actividad;
import com.sst.sst.model.Notificacion;
import com.sst.sst.model.Usuario;
import com.sst.sst.repository.NotificacionRepository;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class NotificacionService {

    private final NotificacionRepository notificacionRepository;

    public NotificacionService(
            NotificacionRepository notificacionRepository
    ) {
        this.notificacionRepository = notificacionRepository;
    }

    // ============================================
    // ESTADOS QUE REQUIEREN ATENCIÓN
    // ============================================

    private static final List<String> ESTADOS_PENDIENTES =
            List.of(
                    Notificacion.ESTADO_PENDIENTE,
                    Notificacion.ESTADO_POSPUESTA
            );

    // ============================================
    // 1. CONSULTAR HISTORIAL DE NOTIFICACIONES
    // ============================================

    @Transactional(readOnly = true)
    public List<Notificacion> obtenerHistorial(
            Long usuarioId
    ) {
        return notificacionRepository
                .findByUsuarioIdOrderByFechaCreacionDesc(
                        usuarioId
                );
    }

    // ============================================
    // 2. CONSULTAR NOTIFICACIONES PENDIENTES
    // ============================================

    @Transactional(readOnly = true)
    public List<Notificacion> obtenerPendientes(
            Long usuarioId
    ) {
        return notificacionRepository
                .findByUsuarioIdAndEstadoInOrderByFechaCreacionDesc(
                        usuarioId,
                        ESTADOS_PENDIENTES
                );
    }

    // ============================================
    // 3. CONTAR NOTIFICACIONES PENDIENTES
    // ============================================

    @Transactional(readOnly = true)
    public long contarPendientes(
            Long usuarioId
    ) {
        return notificacionRepository
                .countByUsuarioIdAndEstadoIn(
                        usuarioId,
                        ESTADOS_PENDIENTES
                );
    }

    // ============================================
    // 4. OBTENER RECORDATORIOS CUYA HORA LLEGÓ
    // ============================================

    @Transactional(readOnly = true)
    public List<Notificacion> obtenerRecordatoriosVencidos(
            Long usuarioId
    ) {
        return notificacionRepository
                .buscarRecordatoriosVencidos(
                        usuarioId,
                        ESTADOS_PENDIENTES,
                        LocalDateTime.now()
                );
    }

    // ============================================
    // 5. CREAR RECORDATORIO DE PAUSA ACTIVA
    // ============================================

    @Transactional
    public Notificacion crearRecordatorio(
            Usuario usuario,
            LocalDateTime fechaProgramada
    ) {

        if (usuario == null || usuario.getId() == null) {
            throw new IllegalArgumentException(
                    "Se requiere un usuario válido"
            );
        }

        if (fechaProgramada == null) {
            throw new IllegalArgumentException(
                    "La fecha programada es obligatoria"
            );
        }

        // Evita duplicados del mismo recordatorio
        // pendiente para el mismo usuario y hora.
        List<Notificacion> pendientes =
                obtenerPendientes(usuario.getId());

        for (Notificacion existente : pendientes) {

            if (Notificacion.TIPO_RECORDATORIO.equals(
                    existente.getTipo()
            ) && fechaProgramada.equals(
                    existente.getFechaProgramada()
            )) {
                return existente;
            }
        }

        Notificacion nueva = new Notificacion(
                usuario,
                Notificacion.TIPO_RECORDATORIO,
                "Es momento de realizar una pausa activa",
                "Tienes una pausa activa pendiente. "
                        + "Puedes iniciarla o posponer el recordatorio.",
                fechaProgramada
        );

        return notificacionRepository.save(nueva);
    }

    // ============================================
    // 6. POSPONER RECORDATORIO
    // ============================================

    @Transactional
    public Notificacion posponerRecordatorio(
            Long notificacionId,
            Long usuarioId,
            int minutos
    ) {

        if (minutos < 1 || minutos > 60) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Solo se permite posponer entre 1 y 60 minutos"
            );
        }

        Notificacion notificacion =
                buscarNotificacionPropia(
                        notificacionId,
                        usuarioId
                );

        if (!Notificacion.TIPO_RECORDATORIO.equals(
                notificacion.getTipo()
        )) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Solo se pueden posponer recordatorios"
            );
        }

        if (!ESTADOS_PENDIENTES.contains(
                notificacion.getEstado()
        )) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "El recordatorio ya fue atendido"
            );
        }

        LocalDateTime nuevaFecha =
                LocalDateTime.now().plusMinutes(minutos);

        notificacion.posponerHasta(nuevaFecha);

        return notificacionRepository.save(notificacion);
    }

    // ============================================
    // 7. REGISTRAR UNA PAUSA COMPLETADA
    // ============================================

    @Transactional
    public Notificacion registrarPausaCompletada(
            Usuario usuario,
            Actividad actividad
    ) {

        if (usuario == null || usuario.getId() == null
                || actividad == null
                || actividad.getId() == null
                || actividad.getUsuario() == null) {

            throw new IllegalArgumentException(
                    "Usuario o actividad no válidos"
            );
        }

        if (!usuario.getId().equals(
                actividad.getUsuario().getId()
        )) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "La actividad no pertenece al usuario"
            );
        }

        if (!Actividad.ESTADO_COMPLETADA.equals(
                actividad.getEstado()
        )) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "La actividad todavía no está completada"
            );
        }

        // Evitar registrar dos veces el aviso
        // de finalización de la misma actividad.
        List<Notificacion> existentes =
                notificacionRepository
                        .findByUsuarioIdAndActividadIdOrderByFechaCreacionDesc(
                                usuario.getId(),
                                actividad.getId()
                        );

        for (Notificacion existente : existentes) {

            if (Notificacion.TIPO_PAUSA_COMPLETADA.equals(
                    existente.getTipo()
            )) {
                return existente;
            }
        }

        // Atender recordatorios asociados
        // a esta actividad, si existen.
        for (Notificacion existente : existentes) {

            if (Notificacion.TIPO_RECORDATORIO.equals(
                    existente.getTipo()
            ) && ESTADOS_PENDIENTES.contains(
                    existente.getEstado()
            )) {
                existente.marcarAtendida();
                notificacionRepository.save(existente);
            }
        }

        // Crear aviso informativo para la campana.
        Notificacion completada = new Notificacion(
                usuario,
                Notificacion.TIPO_PAUSA_COMPLETADA,
                "Pausa activa completada",
                "Has finalizado correctamente tu pausa activa.",
                LocalDateTime.now()
        );

        completada.setActividad(actividad);
        completada.marcarAtendida();

        return notificacionRepository.save(completada);
    }

    // ============================================
    // 8. CONSULTAR UNA NOTIFICACIÓN PROPIA
    // ============================================

    @Transactional(readOnly = true)
    public Notificacion buscarNotificacionPropia(
            Long notificacionId,
            Long usuarioId
    ) {
        return notificacionRepository
                .findByIdAndUsuarioId(
                        notificacionId,
                        usuarioId
                )
                .orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "Notificación no encontrada"
                        )
                );
    }
}
