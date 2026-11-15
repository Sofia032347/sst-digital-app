
package com.sst.sst.controller;

import com.sst.sst.model.Actividad;
import com.sst.sst.model.Usuario;

import com.sst.sst.repository.ActividadRepository;
import com.sst.sst.repository.RegistroAccesoRepository;
import com.sst.sst.repository.UsuarioRepository;

import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/api/rrhh")
public class RrhhSeguimientoDashboardController {

    private static final int META_DIARIA = 4;

    private final UsuarioRepository usuarioRepository;
    private final ActividadRepository actividadRepository;
    private final RegistroAccesoRepository registroAccesoRepository;

    public RrhhSeguimientoDashboardController(
            UsuarioRepository usuarioRepository,
            ActividadRepository actividadRepository,
            RegistroAccesoRepository registroAccesoRepository
    ) {
        this.usuarioRepository = usuarioRepository;
        this.actividadRepository = actividadRepository;
        this.registroAccesoRepository = registroAccesoRepository;
    }

    // ============================================
    // GET /api/rrhh/seguimiento-dashboard
    // ============================================

    @GetMapping("/seguimiento-dashboard")
    @Transactional(readOnly = true)
    public ResumenSeguimiento obtenerSeguimiento() {

        LocalDate hoy = LocalDate.now();

        LocalDateTime inicio = hoy.atStartOfDay();
        LocalDateTime fin = hoy.plusDays(1).atStartOfDay();

        // ========================================
        // 1. SOLO EMPLEADOS
        // ========================================

        List<Usuario> empleados = usuarioRepository
                .findAll()
                .stream()
                .filter(usuario ->
                        usuario.getRol() != null &&
                                "EMPLEADO".equalsIgnoreCase(
                                        usuario.getRol().getNombre()
                                )
                )
                .sorted(
                        Comparator.comparing(
                                Usuario::getNombre,
                                Comparator.nullsLast(
                                        String.CASE_INSENSITIVE_ORDER
                                )
                        )
                )
                .toList();

        Set<Long> idsEmpleados = new HashSet<>();

        for (Usuario empleado : empleados) {
            idsEmpleados.add(empleado.getId());
        }

        // ========================================
        // 2. ACCESOS DE HOY
        // ========================================

        Set<Long> usuariosConAcceso = new HashSet<>(
                registroAccesoRepository.buscarUsuariosConAcceso(
                        inicio,
                        fin
                )
        );

        // ========================================
        // 3. ACTIVIDADES DEL DÍA
        // ========================================

        Map<Long, List<Actividad>> actividadesPorEmpleado =
                new HashMap<>();

        List<Actividad> actividadesHoy =
                actividadRepository.findByFechaBetween(
                        inicio,
                        fin.minusNanos(1)
                );

        for (Actividad actividad : actividadesHoy) {

            if (actividad.getUsuario() == null) {
                continue;
            }

            Long usuarioId =
                    actividad.getUsuario().getId();

            if (!idsEmpleados.contains(usuarioId)) {
                continue;
            }

            actividadesPorEmpleado
                    .computeIfAbsent(
                            usuarioId,
                            id -> new ArrayList<>()
                    )
                    .add(actividad);
        }

        // ========================================
        // 4. CONTADORES
        // ========================================

        int iniciaronSesion = 0;
        int noIniciaronSesion = 0;
        int sinPausasCompletadas = 0;

        long pausasCompletadas = 0;
        long pausasIncompletas = 0;
        long pausasEnProgreso = 0;
        long pausasCanceladas = 0;

        List<AvisoPersonal> avisos =
                new ArrayList<>();

        // ========================================
        // 5. UNA TARJETA POR EMPLEADO
        // ========================================

        for (Usuario empleado : empleados) {

            Long usuarioId = empleado.getId();

            String nombre =
                    empleado.getNombre() == null
                            ? "Empleado"
                            : empleado.getNombre();

            String departamento =
                    empleado.getDepartamento() == null
                            ? "Sin departamento"
                            : empleado.getDepartamento();

            boolean inicioSesionHoy =
                    usuariosConAcceso.contains(usuarioId);

            // ====================================
            // NO INICIÓ SESIÓN
            // SOLO MOSTRAR SIN ACCESO
            // ====================================

            if (!inicioSesionHoy) {

                noIniciaronSesion++;

                avisos.add(
                        new AvisoPersonal(
                                usuarioId,
                                nombre,
                                departamento,
                                "SIN_ACCESO",
                                "No ha iniciado sesión hoy.",
                                false,
                                META_DIARIA,
                                0,
                                0,
                                0
                        )
                );

                continue;
            }

            // ====================================
            // SÍ INICIÓ SESIÓN
            // ====================================

            iniciaronSesion++;

            List<Actividad> delDia =
                    new ArrayList<>(
                            actividadesPorEmpleado.getOrDefault(
                                    usuarioId,
                                    List.of()
                            )
                    );

            // Ordenar por fecha e ID:
            // actividades más recientes primero.

            delDia.sort(
                    Comparator
                            .comparing(
                                    Actividad::getFecha,
                                    Comparator.nullsFirst(
                                            Comparator.naturalOrder()
                                    )
                            )
                            .thenComparing(
                                    Actividad::getId,
                                    Comparator.nullsFirst(
                                            Comparator.naturalOrder()
                                    )
                            )
                            .reversed()
            );

            // Hasta que exista un número de pausa
            // por actividad, usamos los últimos
            // cuatro registros del día.
            int cantidad = Math.min(
                    META_DIARIA,
                    delDia.size()
            );

            List<Actividad> cuatroPausas =
                    delDia.subList(
                            0,
                            cantidad
                    );

            int completadas = 0;
            int incompletasRegistradas = 0;
            int enProgreso = 0;
            int canceladas = 0;

            // ====================================
            // CLASIFICAR LOS ESTADOS
            // ====================================

            for (Actividad actividad : cuatroPausas) {

                String estado = actividad.getEstado();

                if (
                        Actividad.ESTADO_COMPLETADA.equals(
                                estado
                        )
                ) {

                    completadas++;

                } else if (
                        Actividad.ESTADO_CANCELADA.equals(
                                estado
                        )
                ) {

                    canceladas++;

                } else if (
                        Actividad.ESTADO_EN_PROCESO.equals(
                                estado
                        )
                ) {

                    enProgreso++;

                } else {

                    incompletasRegistradas++;
                }
            }

            // ====================================
            // PAUSAS NO INICIADAS
            // ====================================

            int noIniciadas =
                    META_DIARIA - cuatroPausas.size();

            // Las no iniciadas se suman a las
            // incompletas para la meta diaria.
            int incompletas =
                    noIniciadas + incompletasRegistradas;

            // ====================================
            // CONTADORES GENERALES
            // ====================================

            pausasCompletadas += completadas;
            pausasIncompletas += incompletas;
            pausasEnProgreso += enProgreso;
            pausasCanceladas += canceladas;

            if (completadas == 0) {
                sinPausasCompletadas++;
            }

            // ====================================
            // MENSAJE DE LA TARJETA
            // ====================================

            boolean metaCumplida =
                    completadas == META_DIARIA;

            String mensaje = metaCumplida
                    ? "Meta diaria cumplida: " +
                    "4 de 4 pausas completadas."
                    : "Resumen de las 4 pausas " +
                    "programadas para hoy.";

            // ====================================
            // SOLO UN AVISO POR EMPLEADO
            // CORRECCIÓN DEL ERROR ANTERIOR
            // ====================================

            avisos.add(
                    new AvisoPersonal(
                            usuarioId,
                            nombre,
                            departamento,
                            metaCumplida
                                    ? "META_CUMPLIDA"
                                    : "RESUMEN",
                            mensaje,
                            true,
                            incompletas,
                            enProgreso,
                            completadas,
                            canceladas
                    )
            );
        }

        // ========================================
        // 6. RESPUESTA PARA ANGULAR
        // ========================================

        return new ResumenSeguimiento(
                hoy.toString(),
                empleados.size(),
                iniciaronSesion,
                noIniciaronSesion,
                sinPausasCompletadas,
                pausasCompletadas,
                pausasIncompletas,
                pausasEnProgreso,
                pausasCanceladas,
                avisos
        );
    }

    // ============================================
    // DTO DEL DASHBOARD
    // ============================================

    public record ResumenSeguimiento(
            String fecha,
            int totalEmpleados,
            int iniciaronSesionHoy,
            int noIniciaronSesionHoy,
            int sinPausasCompletadasHoy,
            long pausasCompletadasHoy,
            long pausasIncompletasHoy,
            long pausasEnProgresoHoy,
            long pausasCanceladasHoy,
            List<AvisoPersonal> avisos
    ) {}

    // ============================================
    // DTO DEL AVISO INDIVIDUAL
    // ============================================

    public record AvisoPersonal(
            Long usuarioId,
            String nombre,
            String departamento,
            String tipo,
            String mensaje,
            boolean inicioSesionHoy,
            int incompletas,
            int enProgreso,
            int completadas,
            int canceladas
    ) {}
}
