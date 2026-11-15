
package com.sst.sst.service;

import com.sst.sst.model.Actividad;
import com.sst.sst.model.Notificacion;
import com.sst.sst.model.Usuario;
import com.sst.sst.repository.NotificacionRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.List;

@Service
public class NotificacionService {

    private static final int MINUTOS_POSPOSICION = 5;

    private static final List<String> ESTADOS_ACTIVOS =
            List.of(
                    Notificacion.ESTADO_PENDIENTE,
                    Notificacion.ESTADO_POSPUESTA
            );

    private final NotificacionRepository repositorio;

    private final EntityManager entityManager;

    public NotificacionService(
            NotificacionRepository repositorio,
            EntityManager entityManager
    ) {
        this.repositorio = repositorio;
        this.entityManager = entityManager;
    }

    // ==========================================
    // HISTORIAL DE NOTIFICACIONES
    // ==========================================

    @Transactional(readOnly = true)
    public List<Notificacion> obtenerHistorial(
            Long usuarioId
    ) {

        return repositorio
                .findByUsuarioIdOrderByFechaCreacionDesc(
                        usuarioId
                )
                .stream()

                // No mostrar eventos antiguos de
                // reactivación que duplicaban
                // las notificaciones de la campana.

                .filter(n ->
                        !Notificacion
                                .TIPO_RECORDATORIO_REACTIVADO
                                .equals(n.getTipo())
                )

                // IMPORTANTE:
                //
                // Ahora se incluyen los recordatorios
                // originales, aunque tengan
                // vecesPospuesta = 0.
                //
                // Así aparece la primera notificación
                // cuando vence el temporizador.

                .toList();
    }

    // ==========================================
    // OBTENER RECORDATORIO ACTIVO
    // ==========================================

    @Transactional(readOnly = true)
    public Notificacion obtenerRecordatorioActivo(
            Long usuarioId,
            LocalDate dia
    ) {

        return repositorio
                .findByUsuarioIdAndEstadoInOrderByFechaCreacionDesc(
                        usuarioId,
                        ESTADOS_ACTIVOS
                )
                .stream()

                .filter(n ->
                        Notificacion.TIPO_RECORDATORIO
                                .equals(n.getTipo())
                )

                .filter(n ->
                        n.getFechaProgramada() != null
                )

                .filter(n ->
                        n.getFechaProgramada()
                                .toLocalDate()
                                .equals(dia)
                )

                .min(
                        Comparator

                                // Un recordatorio pospuesto
                                // tiene prioridad frente
                                // a uno pendiente antiguo.

                                .comparingInt(
                                        (Notificacion n) ->
                                                Notificacion
                                                        .ESTADO_POSPUESTA
                                                        .equals(n.getEstado())
                                                        ? 0
                                                        : 1
                                )

                                // Conservar el ID original.
                                .thenComparing(
                                        Notificacion::getId
                                )
                )

                .orElse(null);
    }

    // ==========================================
    // NOTIFICACIONES PENDIENTES
    // ==========================================

    @Transactional(readOnly = true)
    public List<Notificacion> obtenerPendientes(
            Long usuarioId
    ) {

        Notificacion activa =
                obtenerRecordatorioActivo(
                        usuarioId,
                        LocalDate.now()
                );

        if (activa == null) {
            return List.of();
        }

        return List.of(activa);
    }

    // ==========================================
    // CONTAR RECORDATORIOS PENDIENTES
    // ==========================================

    @Transactional(readOnly = true)
    public long contarPendientes(
            Long usuarioId
    ) {

        return obtenerPendientes(
                usuarioId
        ).size();
    }

    // ==========================================
    // CONTAR NOTIFICACIONES SIN LEER
    // ==========================================

    @Transactional(readOnly = true)
    public long contarSinLeer(
            Long usuarioId
    ) {

        return obtenerHistorial(usuarioId)
                .stream()

                .filter(n ->
                        !Boolean.TRUE.equals(
                                n.getLeida()
                        )
                )

                .count();
    }

    // ==========================================
    // RECORDATORIOS QUE YA VENCIERON
    // ==========================================

    @Transactional(readOnly = true)
    public List<Notificacion> obtenerRecordatoriosVencidos(
            Long usuarioId
    ) {

        Notificacion actual =
                obtenerRecordatorioActivo(
                        usuarioId,
                        LocalDate.now()
                );

        if (actual == null) {
            return List.of();
        }

        LocalDateTime hora =
                actual.getProximoAviso() != null
                        ? actual.getProximoAviso()
                        : actual.getFechaProgramada();

        if (
                hora != null &&
                        !hora.isAfter(LocalDateTime.now())
        ) {
            return List.of(actual);
        }

        return List.of();
    }

    // ==========================================
    // CREAR RECORDATORIO
    // ==========================================

    @Transactional
    public Notificacion crearRecordatorio(
            Usuario usuario,
            LocalDateTime fechaProgramada
    ) {

        if (
                usuario == null ||
                        usuario.getId() == null ||
                        fechaProgramada == null
        ) {

            throw new IllegalArgumentException(
                    "Usuario y fecha son obligatorios"
            );
        }

        // Bloquear el mismo usuario utilizado
        // por la sincronización y el aplazamiento.
        //
        // Esto evita crear varios recordatorios
        // ante peticiones concurrentes.

        Usuario bloqueado =
                entityManager.find(
                        Usuario.class,
                        usuario.getId(),
                        LockModeType.PESSIMISTIC_WRITE
                );

        if (bloqueado == null) {

            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Usuario no encontrado"
            );
        }

        // ======================================
        // REUTILIZAR EL RECORDATORIO VIGENTE
        // ======================================

        Notificacion vigente =
                obtenerRecordatorioActivo(
                        usuario.getId(),
                        fechaProgramada.toLocalDate()
                );

        if (vigente != null) {
            return vigente;
        }

        // ======================================
        // EVITAR DUPLICADOS POR FECHA
        // ======================================

        for (
                Notificacion existente :
                repositorio
                        .findByUsuarioIdOrderByFechaCreacionDesc(
                                usuario.getId()
                        )
        ) {

            if (
                    Notificacion.TIPO_RECORDATORIO
                            .equals(existente.getTipo())

                            && existente.getFechaProgramada()
                            != null

                            && existente.getFechaProgramada()
                            .truncatedTo(
                                    ChronoUnit.SECONDS
                            )
                            .equals(
                                    fechaProgramada.truncatedTo(
                                            ChronoUnit.SECONDS
                                    )
                            )
            ) {

                return existente;
            }
        }

        // ======================================
        // CREAR EL PRIMER RECORDATORIO
        // ======================================

        return repositorio.save(
                new Notificacion(
                        bloqueado,

                        Notificacion.TIPO_RECORDATORIO,

                        "Es momento de realizar una pausa activa",

                        "Tienes una pausa activa pendiente. " +
                                "Puedes iniciarla o posponer 5 minutos.",

                        fechaProgramada
                )
        );
    }

    // ==========================================
    // POSPONER CINCO MINUTOS
    // ==========================================

    @Transactional
    public Notificacion posponerRecordatorio(
            Long notificacionId,
            Long usuarioId,
            int minutos
    ) {

        // La duración de aplazamiento se
        // mantiene en cinco minutos.
        //
        // No depende de lo enviado por Angular.

        entityManager.find(
                Usuario.class,
                usuarioId,
                LockModeType.PESSIMISTIC_WRITE
        );

        Notificacion n =
                buscarNotificacionPropia(
                        notificacionId,
                        usuarioId
                );

        entityManager.lock(
                n,
                LockModeType.PESSIMISTIC_WRITE
        );

        // ======================================
        // VERIFICAR QUE SIGA VIGENTE
        // ======================================

        Notificacion vigente =
                obtenerRecordatorioActivo(
                        usuarioId,
                        LocalDate.now()
                );

        if (
                vigente == null ||
                        !vigente.getId().equals(n.getId()) ||
                        !Notificacion.TIPO_RECORDATORIO
                                .equals(n.getTipo()) ||
                        !ESTADOS_ACTIVOS.contains(n.getEstado())
        ) {

            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Este ya no es el recordatorio vigente"
            );
        }

        // ======================================
        // GUARDAR EL APLAZAMIENTO
        // ======================================

        LocalDateTime proxima =
                LocalDateTime.now()
                        .plusMinutes(
                                MINUTOS_POSPOSICION
                        );

        n.posponerHasta(proxima);

        // La acción de posponer queda registrada.
        n.setLeida(true);

        Notificacion guardada =
                repositorio.save(n);

        // ======================================
        // REGISTRAR EVENTO EN EL HISTORIAL
        // ======================================

        Notificacion evento =
                new Notificacion(
                        n.getUsuario(),

                        Notificacion
                                .TIPO_RECORDATORIO_POSPUESTO,

                        "Recordatorio pospuesto",

                        "Aplazaste tu pausa 5 minutos. " +
                                "Próximo aviso: " +
                                proxima.toLocalTime()
                                        .withNano(0),

                        proxima
                );

        evento.marcarAtendida();

        // El evento queda en el historial,
        // sin aumentar el contador sin leer.
        evento.setLeida(true);

        repositorio.save(evento);

        return guardada;
    }

    // ==========================================
    // REACTIVACIÓN DE RECORDATORIOS
    // ==========================================

    @Transactional
    public void registrarReactivacion(
            Notificacion original
    ) {

        // Se conserva este método por
        // compatibilidad con el código existente.
        //
        // No crear otra notificación cada vez
        // que Angular consulta /sincronizar.
    }

    // ==========================================
    // MARCAR NOTIFICACIÓN COMO LEÍDA
    // ==========================================

    @Transactional
    public Notificacion marcarComoLeida(
            Long notificacionId,
            Long usuarioId
    ) {

        Notificacion n =
                buscarNotificacionPropia(
                        notificacionId,
                        usuarioId
                );

        n.setLeida(true);

        return repositorio.save(n);
    }

    // ==========================================
    // MARCAR TODAS COMO LEÍDAS
    // ==========================================

    @Transactional
    public void marcarTodasComoLeidas(
            Long usuarioId
    ) {

        for (
                Notificacion n :
                repositorio
                        .findByUsuarioIdOrderByFechaCreacionDesc(
                                usuarioId
                        )
        ) {

            if (
                    !Boolean.TRUE.equals(
                            n.getLeida()
                    )
            ) {

                n.setLeida(true);

                repositorio.save(n);
            }
        }
    }

    // ==========================================
    // REGISTRAR PAUSA COMPLETADA
    // ==========================================

    @Transactional
    public Notificacion registrarPausaCompletada(
            Usuario usuario,
            Actividad actividad
    ) {

        if (
                usuario == null ||
                        usuario.getId() == null ||
                        actividad == null ||
                        actividad.getId() == null ||
                        actividad.getUsuario() == null
        ) {

            throw new IllegalArgumentException(
                    "Usuario o actividad inválidos"
            );
        }

        if (
                !usuario.getId().equals(
                        actividad.getUsuario().getId()
                )
        ) {

            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "La actividad pertenece a otro usuario"
            );
        }

        if (
                !Actividad.ESTADO_COMPLETADA
                        .equals(actividad.getEstado())
        ) {

            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "La actividad no está completada"
            );
        }

        // ======================================
        // EVITAR NOTIFICACIONES DUPLICADAS
        // ======================================

        for (
                Notificacion existente :
                repositorio
                        .findByUsuarioIdAndActividadIdOrderByFechaCreacionDesc(
                                usuario.getId(),
                                actividad.getId()
                        )
        ) {

            if (
                    Notificacion.TIPO_PAUSA_COMPLETADA
                            .equals(existente.getTipo())
            ) {

                return existente;
            }
        }

        // ======================================
        // CERRAR RECORDATORIOS ANTERIORES
        // ======================================

        LocalDate hoy =
                LocalDate.now();

        for (
                Notificacion n :
                repositorio
                        .findByUsuarioIdAndEstadoInOrderByFechaCreacionDesc(
                                usuario.getId(),
                                ESTADOS_ACTIVOS
                        )
        ) {

            if (
                    Notificacion.TIPO_RECORDATORIO
                            .equals(n.getTipo())

                            && n.getFechaProgramada()
                            != null

                            && n.getFechaProgramada()
                            .toLocalDate()
                            .equals(hoy)
            ) {

                n.marcarAtendida();

                n.setActividad(actividad);

                repositorio.save(n);
            }
        }

        // ======================================
        // CREAR NOTIFICACIÓN DE FINALIZACIÓN
        // ======================================

        Notificacion evento =
                new Notificacion(
                        usuario,

                        Notificacion.TIPO_PAUSA_COMPLETADA,

                        "Pausa activa completada",

                        "Finalizaste correctamente tu pausa activa.",

                        LocalDateTime.now()
                );

        evento.setActividad(actividad);

        evento.marcarAtendida();

        return repositorio.save(evento);
    }

    // ==========================================
    // BUSCAR NOTIFICACIÓN DEL USUARIO
    // ==========================================

    @Transactional(readOnly = true)
    public Notificacion buscarNotificacionPropia(
            Long notificacionId,
            Long usuarioId
    ) {

        return repositorio
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
