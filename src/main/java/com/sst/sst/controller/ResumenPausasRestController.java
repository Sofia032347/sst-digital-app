package com.sst.sst.controller;

import com.sst.sst.model.Actividad;
import com.sst.sst.model.Usuario;

import com.sst.sst.repository.ActividadRepository;
import com.sst.sst.repository.UsuarioRepository;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;

import java.util.Comparator;
import java.util.List;

@RestController
@RequestMapping("/api/empleado")
public class ResumenPausasRestController {

    private final ActividadRepository actividades;
    private final UsuarioRepository usuarios;

    public ResumenPausasRestController(
            ActividadRepository actividades,
            UsuarioRepository usuarios
    ) {
        this.actividades = actividades;
        this.usuarios = usuarios;
    }

    // ==========================================
    // DATOS QUE RECIBIRÁ ANGULAR
    // ==========================================

    public record ActividadResumen(
            Long id,
            LocalDateTime fecha,
            String estado,
            Integer duracionSegundos
    ) {}

    // ==========================================
    // EMPLEADO AUTENTICADO
    // ==========================================

    private Usuario empleadoAutenticado(
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

        return usuarios
                .findByEmail(
                        authentication.getName()
                )
                .orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.UNAUTHORIZED,
                                "Usuario no encontrado"
                        )
                );
    }

    // ==========================================
    // CONSULTAR HISTORIAL POR FECHAS
    // ==========================================

    @GetMapping("/actividades")
    @Transactional(readOnly = true)
    public List<ActividadResumen> obtenerActividades(
            @RequestParam("desde")
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate desde,

            @RequestParam("hasta")
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate hasta,

            Authentication authentication
    ) {

        if (
                desde.isAfter(hasta) ||
                        ChronoUnit.DAYS.between(
                                desde,
                                hasta
                        ) > 62
        ) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Rango de fechas inválido"
            );
        }

        Usuario empleado =
                empleadoAutenticado(
                        authentication
                );

        LocalDateTime inicio =
                desde.atStartOfDay();

        LocalDateTime fin =
                hasta.atTime(
                        LocalTime.MAX
                );

        // Consultar exclusivamente las
        // actividades del empleado autenticado.
        //
        // No se recibe usuarioId desde Angular.

        List<Actividad> registros =
                actividades
                        .findByUsuarioIdAndFechaBetween(
                                empleado.getId(),
                                inicio,
                                fin
                        );

        return registros.stream()
                .filter(a ->
                        a.getFecha() != null
                )
                .map(a ->
                        new ActividadResumen(
                                a.getId(),
                                a.getFecha(),
                                a.getEstado(),
                                a.getDuracionSegundos()
                        )
                )
                .sorted(
                        Comparator.comparing(
                                ActividadResumen::fecha
                        ).reversed()
                )
                .toList();
    }
}