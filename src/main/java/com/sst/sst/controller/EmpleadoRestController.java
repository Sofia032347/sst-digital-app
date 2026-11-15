
package com.sst.sst.controller;

import com.sst.sst.model.Actividad;
import com.sst.sst.model.Usuario;

import com.sst.sst.repository.ActividadRepository;
import com.sst.sst.repository.UsuarioRepository;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

@RestController
@RequestMapping("/api/empleado")
public class EmpleadoRestController {

    // ============================================
    // META DIARIA DE SST DIGITAL
    // ============================================

    private static final int META_DIARIA = 4;

    private final ActividadRepository actividadRepository;
    private final UsuarioRepository usuarioRepository;

    public EmpleadoRestController(
            ActividadRepository actividadRepository,
            UsuarioRepository usuarioRepository
    ) {
        this.actividadRepository = actividadRepository;
        this.usuarioRepository = usuarioRepository;
    }

    // ============================================
    // GET /api/empleado/resumen
    //
    // Funciona para EMPLEADO y RRHH.
    // Cada usuario consulta únicamente
    // sus propias actividades.
    // ============================================

    @GetMapping("/resumen")
    public ResponseEntity<ResumenEmpleado> obtenerResumen(
            Authentication authentication
    ) {

        // ========================================
        // 1. VERIFICAR AUTENTICACIÓN
        // ========================================

        if (
                authentication == null ||
                        !authentication.isAuthenticated() ||
                        "anonymousUser".equals(
                                authentication.getPrincipal()
                        )
        ) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Debe iniciar sesión"
            );
        }

        // ========================================
        // 2. OBTENER USUARIO AUTENTICADO
        // ========================================

        String email = authentication.getName();

        Usuario usuario = usuarioRepository
                .findByEmail(email)
                .orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "Usuario no encontrado"
                        )
                );

        // ========================================
        // 3. CONSULTAR ACTIVIDADES DEL DÍA
        // ========================================

        LocalDate hoy = LocalDate.now();

        LocalDateTime inicioDia =
                hoy.atStartOfDay();

        LocalDateTime finDia =
                hoy.atTime(LocalTime.MAX);

        List<Actividad> actividadesHoy =
                actividadRepository
                        .findByUsuarioIdAndFechaBetween(
                                usuario.getId(),
                                inicioDia,
                                finDia
                        );

        // ========================================
        // 4. PAUSAS COMPLETADAS
        // ========================================

        long completadasHoy = actividadesHoy
                .stream()
                .filter(actividad ->
                        Actividad.ESTADO_COMPLETADA.equals(
                                actividad.getEstado()
                        )
                )
                .count();

        // ========================================
        // 5. PAUSAS EN PROCESO
        //
        // Se encuentran ejecutándose.
        // ========================================

        long enProcesoHoy = actividadesHoy
                .stream()
                .filter(actividad ->
                        Actividad.ESTADO_EN_PROCESO.equals(
                                actividad.getEstado()
                        )
                )
                .count();

        // ========================================
        // 6. PAUSAS INCOMPLETAS
        //
        // Incluye:
        // - INCOMPLETA: aplazada
        // - EN_PROCESO: iniciada, sin finalizar
        //
        // EN_PROCESO está incluido dentro
        // de INCOMPLETAS para las estadísticas.
        // ========================================

        long incompletasHoy = actividadesHoy
                .stream()
                .filter(actividad ->
                        Actividad.ESTADO_INCOMPLETA.equals(
                                actividad.getEstado()
                        ) ||
                                Actividad.ESTADO_EN_PROCESO.equals(
                                        actividad.getEstado()
                                )
                )
                .count();

        // ========================================
        // 7. PAUSAS CANCELADAS
        // ========================================

        long canceladasHoy = actividadesHoy
                .stream()
                .filter(actividad ->
                        Actividad.ESTADO_CANCELADA.equals(
                                actividad.getEstado()
                        )
                )
                .count();

        // ========================================
        // 8. META DIARIA
        // ========================================

        int pendientesHoy = (int) Math.max(
                0,
                META_DIARIA - completadasHoy
        );

        int porcentajeCumplimiento =
                (int) Math.min(
                        100,
                        (completadasHoy * 100) / META_DIARIA
                );

        // ========================================
        // 9. CONSTRUIR RESPUESTA
        // ========================================

        ResumenEmpleado resumen =
                new ResumenEmpleado(
                        usuario.getNombre(),
                        usuario.getEmail(),
                        META_DIARIA,
                        completadasHoy,
                        pendientesHoy,
                        porcentajeCumplimiento,
                        incompletasHoy,
                        canceladasHoy,
                        enProcesoHoy
                );

        return ResponseEntity.ok(resumen);
    }

    // ============================================
    // RESPUESTA JSON PARA ANGULAR
    // ============================================

    public record ResumenEmpleado(
            String nombre,
            String email,
            int metaDiaria,
            long completadasHoy,
            int pendientesHoy,
            int porcentajeCumplimiento,
            long incompletasHoy,
            long canceladasHoy,
            long enProcesoHoy
    ) {
    }
}
