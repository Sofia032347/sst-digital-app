package com.sst.sst.service;

import com.sst.sst.model.Actividad;
import com.sst.sst.model.Notificacion;
import com.sst.sst.model.Usuario;
import com.sst.sst.repository.ActividadRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

import java.util.Comparator;
import java.util.List;
import java.util.Optional;

@Service
public class RecordatorioPausaService {

    // ============================================
    // CONFIGURACIÓN ACTUAL DE SST DIGITAL
    // ============================================

    // Se conservan los cinco minutos de la
    // simulación actual.
    //
    // Más adelante podremos configurar este
    // intervalo para cada organización.

    private static final int MINUTOS_ENTRE_PAUSAS = 5;

    private static final int META_DIARIA = 4;

    private final ActividadRepository actividadRepository;

    private final NotificacionService notificacionService;

    public RecordatorioPausaService(
            ActividadRepository actividadRepository,
            NotificacionService notificacionService
    ) {
        this.actividadRepository = actividadRepository;
        this.notificacionService = notificacionService;
    }

    // ============================================
    // RESULTADO PARA LOS CONTROLADORES
    // ============================================

    public record EstadoPausa(
            String estado,
            long faltan,
            LocalDateTime proximaPausa,
            Long notificacionId
    ) {
    }

    // ============================================
    // SINCRONIZAR EL ESTADO DE LAS PAUSAS
    // ============================================

    @Transactional
    public EstadoPausa sincronizar(
            Usuario usuario,
            LocalDateTime horaInicioSesion
    ) {

        if (usuario == null || usuario.getId() == null) {
            throw new IllegalArgumentException(
                    "Se requiere un usuario válido"
            );
        }

        LocalDateTime ahora = LocalDateTime.now();

        LocalDate hoy = ahora.toLocalDate();

        // ========================================
        // CONSULTAR ACTIVIDADES DEL DÍA
        // ========================================

        List<Actividad> actividadesHoy =
                actividadRepository
                        .findByUsuarioIdAndFechaBetween(
                                usuario.getId(),
                                hoy.atStartOfDay(),
                                hoy.atTime(LocalTime.MAX)
                        );

        long completadas = actividadesHoy.stream()
                .filter(actividad ->
                        Actividad.ESTADO_COMPLETADA.equals(
                                actividad.getEstado()
                        )
                )
                .count();

        // ========================================
        // OBJETIVO DIARIO ALCANZADO
        // ========================================

        if (completadas >= META_DIARIA) {

            return new EstadoPausa(
                    "BLOQUEADO_COMPLETO",
                    0,
                    null,
                    null
            );
        }

        // ========================================
        // NO INTERRUMPIR UNA ACTIVIDAD EN CURSO
        // ========================================

        boolean enProceso = actividadesHoy.stream()
                .anyMatch(actividad ->
                        Actividad.ESTADO_EN_PROCESO.equals(
                                actividad.getEstado()
                        )
                );

        if (enProceso) {

            return new EstadoPausa(
                    "EN_PROCESO",
                    0,
                    null,
                    null
            );
        }

        // ========================================
        // COMPROBAR ACTIVIDADES INCOMPLETAS
        // ========================================

        boolean tieneIncompleta = actividadesHoy.stream()
                .anyMatch(actividad ->
                        Actividad.ESTADO_INCOMPLETA.equals(
                                actividad.getEstado()
                        )
                );

        if (tieneIncompleta) {

            return new EstadoPausa(
                    "REANUDAR",
                    0,
                    null,
                    null
            );
        }

        // ========================================
        // DETERMINAR EL ÚLTIMO CICLO COMPLETADO
        // ========================================

        Optional<Actividad> ultimaCompletada =
                actividadesHoy.stream()
                        .filter(actividad ->
                                Actividad.ESTADO_COMPLETADA.equals(
                                        actividad.getEstado()
                                )
                        )
                        .max(
                                Comparator.comparing(
                                        Actividad::getFecha
                                )
                        );

        LocalDateTime proximaPausa;

        if (ultimaCompletada.isPresent()) {

            Actividad ultima = ultimaCompletada.get();

            // La fecha de Actividad representa
            // el inicio de la rutina.
            //
            // Sumamos su duración para aproximar
            // el momento de finalización.

            int duracion = ultima.getDuracionSegundos() != null
                    ? Math.max(
                    0,
                    ultima.getDuracionSegundos()
            )
                    : 0;

            LocalDateTime finUltimaPausa =
                    ultima.getFecha().plusSeconds(duracion);

            proximaPausa = finUltimaPausa.plusMinutes(
                    MINUTOS_ENTRE_PAUSAS
            );

        } else {

            // Primer recordatorio del ciclo:
            // cinco minutos después de iniciar sesión.

            if (horaInicioSesion == null) {

                return new EstadoPausa(
                        "ESPERANDO",
                        MINUTOS_ENTRE_PAUSAS,
                        null,
                        null
                );
            }

            proximaPausa = horaInicioSesion.plusMinutes(
                    MINUTOS_ENTRE_PAUSAS
            );
        }

        // ========================================
        // COMPROBAR SI YA CORRESPONDE LA PAUSA
        // ========================================

        if (ahora.isBefore(proximaPausa)) {

            long segundosRestantes =
                    Duration.between(
                            ahora,
                            proximaPausa
                    ).getSeconds();

            // Redondear hacia arriba para no
            // mostrar cero minutos antes de tiempo.

            long minutosRestantes =
                    (segundosRestantes + 59) / 60;

            return new EstadoPausa(
                    "ESPERANDO",
                    minutosRestantes,
                    proximaPausa,
                    null
            );
        }

        // ========================================
        // EVITAR DUPLICADOS DEL MISMO CICLO
        // ========================================

        // Consultamos el historial completo,
        // incluyendo notificaciones atendidas.
        //
        // Esto evita recrear la notificación
        // durante cada consulta del mismo ciclo.

        List<Notificacion> historial =
                notificacionService.obtenerHistorial(
                        usuario.getId()
                );

        Optional<Notificacion> existente =
                historial.stream()
                        .filter(notificacion ->
                                Notificacion.TIPO_RECORDATORIO.equals(
                                        notificacion.getTipo()
                                )
                        )
                        .filter(notificacion ->
                                proximaPausa.equals(
                                        notificacion.getFechaProgramada()
                                )
                        )
                        .findFirst();

        if (existente.isPresent()) {

            Notificacion notificacion =
                    existente.get();

            return new EstadoPausa(
                    "DISPONIBLE",
                    0,
                    proximaPausa,
                    notificacion.getId()
            );
        }

        // ========================================
        // CREAR RECORDATORIO
        // ========================================

        Notificacion notificacion =
                notificacionService.crearRecordatorio(
                        usuario,
                        proximaPausa
                );

        return new EstadoPausa(
                "DISPONIBLE",
                0,
                proximaPausa,
                notificacion.getId()
        );
    }
}