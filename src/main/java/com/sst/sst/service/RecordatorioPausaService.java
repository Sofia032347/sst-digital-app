package com.sst.sst.service;

import com.sst.sst.model.Actividad;
import com.sst.sst.model.Notificacion;
import com.sst.sst.model.Usuario;

import com.sst.sst.repository.ActividadRepository;
import com.sst.sst.repository.NotificacionRepository;

import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;

import java.util.Comparator;
import java.util.List;
import java.util.Optional;

@Service
public class RecordatorioPausaService {

    private static final int META_DIARIA = 4;
    private static final int MINUTOS_ENTRE_PAUSAS = 5;

    private static final List<String> ESTADOS_ACTIVOS =
            List.of(
                    Notificacion.ESTADO_PENDIENTE,
                    Notificacion.ESTADO_POSPUESTA
            );

    private final ActividadRepository actividades;
    private final NotificacionRepository notificacionesRepository;
    private final NotificacionService notificaciones;
    private final EntityManager entityManager;

    public RecordatorioPausaService(
            ActividadRepository actividades,
            NotificacionRepository notificacionesRepository,
            NotificacionService notificaciones,
            EntityManager entityManager
    ) {
        this.actividades = actividades;
        this.notificacionesRepository =
                notificacionesRepository;
        this.notificaciones = notificaciones;
        this.entityManager = entityManager;
    }

    public record EstadoPausa(
            String estado,
            int faltan,
            LocalDateTime proximaPausa,
            Long notificacionId
    ) {}

    // ==========================================
    // CALCULAR SEGUNDOS RESTANTES
    // ==========================================

    private int segundosRestantes(
            LocalDateTime proxima,
            LocalDateTime ahora
    ) {

        long segundos =
                Duration.between(
                        ahora,
                        proxima
                ).getSeconds();

        return (int) Math.max(
                0,
                Math.min(
                        Integer.MAX_VALUE,
                        segundos
                )
        );
    }

    // ==========================================
    // IDENTIFICAR UNA ACTIVIDAD FINALIZADA
    // ==========================================

    private boolean estaFinalizada(
            Actividad actividad
    ) {

        String estado = actividad.getEstado();

        return (
                Actividad.ESTADO_COMPLETADA.equals(estado)
                        || Actividad.ESTADO_INCOMPLETA.equals(estado)
                        || Actividad.ESTADO_CANCELADA.equals(estado)
        );
    }

    // ==========================================
    // CALCULAR HORA DE FINALIZACIÓN
    // ==========================================

    private LocalDateTime fechaFin(
            Actividad actividad
    ) {

        if (actividad.getFecha() == null) {
            return null;
        }

        Integer duracion =
                actividad.getDuracionSegundos();

        long segundos = duracion == null
                ? 0
                : Math.max(0, duracion);

        // En el modelo actual, fecha corresponde
        // al inicio de la actividad y se guarda
        // la duración en segundos.
        return actividad.getFecha()
                .plusSeconds(segundos);
    }

    // ==========================================
    // ÚLTIMA RUTINA FINALIZADA
    // ==========================================

    private Optional<Actividad> ultimaFinalizada(
            List<Actividad> actividadesHoy
    ) {

        return actividadesHoy
                .stream()
                .filter(this::estaFinalizada)
                .filter(a ->
                        fechaFin(a) != null
                )
                .max(
                        Comparator.comparing(
                                this::fechaFin
                        )
                );
    }

    // ==========================================
    // CERRAR EL RECORDATORIO ANTERIOR
    // ==========================================

    private void cerrarRecordatoriosDeActividad(
            Long usuarioId,
            Actividad actividad
    ) {

        LocalDateTime fin =
                fechaFin(actividad);

        if (fin == null) {
            return;
        }

        List<Notificacion> activos =
                notificacionesRepository
                        .findByUsuarioIdAndEstadoInOrderByFechaCreacionDesc(
                                usuarioId,
                                ESTADOS_ACTIVOS
                        );

        for (Notificacion recordatorio : activos) {

            if (
                    !Notificacion.TIPO_RECORDATORIO
                            .equals(
                                    recordatorio.getTipo()
                            )
            ) {
                continue;
            }

            if (
                    recordatorio.getFechaProgramada() == null
            ) {
                continue;
            }

            // Cerrar únicamente los recordatorios
            // que pertenecen a un ciclo anterior
            // a la finalización de la actividad.
            //
            // Esto incluye los pospuestos cuando
            // el empleado decidió iniciar
            // anticipadamente.

            if (
                    recordatorio.getFechaProgramada()
                            .isAfter(fin)
            ) {
                continue;
            }

            recordatorio.marcarAtendida();
            recordatorio.setActividad(actividad);

            notificacionesRepository.save(
                    recordatorio
            );
        }
    }

    // ==========================================
    // SINCRONIZACIÓN PRINCIPAL
    // ==========================================

    @Transactional
    public EstadoPausa sincronizar(
            Usuario usuario,
            LocalDateTime horaInicioSesion
    ) {

        if (
                usuario == null ||
                        usuario.getId() == null
        ) {

            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "No hay un usuario autenticado"
            );
        }

        Usuario bloqueado =
                entityManager.find(
                        Usuario.class,
                        usuario.getId(),
                        LockModeType.PESSIMISTIC_WRITE
                );

        if (bloqueado == null) {

            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Empleado no encontrado"
            );
        }

        LocalDateTime ahora =
                LocalDateTime.now();

        LocalDate hoy =
                ahora.toLocalDate();

        List<Actividad> actividadesHoy =
                actividades
                        .findByUsuarioIdAndFechaBetween(
                                usuario.getId(),
                                hoy.atStartOfDay(),
                                hoy.atTime(
                                        LocalTime.MAX
                                )
                        );

        // ======================================
        // 1. SI LA PAUSA ESTÁ EN PROCESO,
        //    DETENER EL TEMPORIZADOR
        // ======================================

        boolean enProceso =
                actividadesHoy
                        .stream()
                        .anyMatch(a ->
                                Actividad.ESTADO_EN_PROCESO
                                        .equals(
                                                a.getEstado()
                                        )
                        );

        if (enProceso) {

            // No hay cuenta regresiva.
            // No se programa otra pausa.
            // No aparece otro SweetAlert.

            return new EstadoPausa(
                    "EN_PROCESO",
                    0,
                    null,
                    null
            );
        }

        // ======================================
        // 2. BUSCAR LA ÚLTIMA PAUSA QUE TERMINÓ
        //    O FUE CANCELADA
        // ======================================

        Optional<Actividad> ultima =
                ultimaFinalizada(
                        actividadesHoy
                );

        LocalDateTime ultimaFinalizacion =
                ultima.map(this::fechaFin)
                        .orElse(null);

        // ======================================
        // 3. CERRAR EL RECORDATORIO ANTERIOR
        //    DESPUÉS DE TERMINAR O CANCELAR
        // ======================================

        if (ultima.isPresent()) {

            cerrarRecordatoriosDeActividad(
                    usuario.getId(),
                    ultima.get()
            );
        }

        // ======================================
        // 4. COMPROBAR META DIARIA
        // ======================================

        long completadasHoy =
                actividadesHoy
                        .stream()
                        .filter(a ->
                                Actividad.ESTADO_COMPLETADA
                                        .equals(
                                                a.getEstado()
                                        )
                        )
                        .count();

        if (completadasHoy >= META_DIARIA) {

            return new EstadoPausa(
                    "BLOQUEADO_COMPLETO",
                    0,
                    null,
                    null
            );
        }

        // ======================================
        // 5. SI EXISTE UN RECORDATORIO ACTIVO,
        //    REUTILIZARLO
        // ======================================

        Notificacion vigente =
                notificaciones
                        .obtenerRecordatorioActivo(
                                usuario.getId(),
                                hoy
                        );

        if (vigente != null) {

            LocalDateTime proxima =
                    vigente.getProximoAviso() != null
                            ? vigente.getProximoAviso()
                            : vigente.getFechaProgramada();

            if (proxima == null) {
                proxima = ahora;
            }

            // Pospuesto y todavía faltan minutos.
            if (proxima.isAfter(ahora)) {

                return new EstadoPausa(
                        "ESPERANDO",
                        segundosRestantes(
                                proxima,
                                ahora
                        ),
                        proxima,
                        vigente.getId()
                );
            }

            // Vencimiento real del mismo ID.
            return new EstadoPausa(
                    "DISPONIBLE",
                    0,
                    proxima,
                    vigente.getId()
            );
        }

        // ======================================
        // 6. DETERMINAR DESDE CUÁNDO CONTAR
        // ======================================

        LocalDateTime referencia =
                horaInicioSesion != null
                        ? horaInicioSesion
                        : ahora;

        if (referencia.toLocalDate().isBefore(hoy)) {

            referencia =
                    hoy.atStartOfDay();
        }

        // Después de finalizar o cancelar,
        // la nueva cuenta se inicia desde
        // el final REAL de esa actividad.

        if (
                ultimaFinalizacion != null &&
                        ultimaFinalizacion.isAfter(
                                referencia
                        )
        ) {
            referencia = ultimaFinalizacion;
        }

        // ======================================
        // 7. PROGRAMAR SIGUIENTE PAUSA
        // ======================================

        LocalDateTime proximaPausa =
                referencia
                        .plusMinutes(
                                MINUTOS_ENTRE_PAUSAS
                        )
                        .truncatedTo(
                                ChronoUnit.SECONDS
                        );

        // ======================================
        // 8. TODAVÍA NO HA VENCIDO
        // ======================================

        if (proximaPausa.isAfter(ahora)) {

            // Solo cuenta el tiempo.
            // No guardar una notificación todavía.

            return new EstadoPausa(
                    "ESPERANDO",
                    segundosRestantes(
                            proximaPausa,
                            ahora
                    ),
                    proximaPausa,
                    null
            );
        }

        // ======================================
        // 9. VENCIMIENTO: CREAR PRIMER AVISO
        // ======================================

        Notificacion primera =
                notificaciones.crearRecordatorio(
                        bloqueado,
                        proximaPausa
                );

        LocalDateTime aviso =
                primera.getProximoAviso() != null
                        ? primera.getProximoAviso()
                        : primera.getFechaProgramada();

        if (
                aviso != null &&
                        aviso.isAfter(ahora)
        ) {

            return new EstadoPausa(
                    "ESPERANDO",
                    segundosRestantes(
                            aviso,
                            ahora
                    ),
                    aviso,
                    primera.getId()
            );
        }

        return new EstadoPausa(
                "DISPONIBLE",
                0,
                aviso,
                primera.getId()
        );
    }
}