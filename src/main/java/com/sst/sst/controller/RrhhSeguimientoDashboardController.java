package com.sst.sst.controller;

import com.sst.sst.model.Actividad;
import com.sst.sst.model.Usuario;
import com.sst.sst.repository.ActividadRepository;
import com.sst.sst.repository.RegistroAccesoRepository;
import com.sst.sst.repository.UsuarioRepository;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.*;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;

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

    @GetMapping("/seguimiento-dashboard")
    @Transactional(readOnly = true)
    public ResumenSeguimiento obtenerSeguimiento() {

        LocalDate hoy = LocalDate.now();

        LocalDateTime inicio = hoy.atStartOfDay();
        LocalDateTime fin = hoy.plusDays(1).atStartOfDay();

        // 1. SOLO EMPLEADOS

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

        // 2. ACCESOS DE HOY

        Set<Long> usuariosConAcceso = new HashSet<>(
                registroAccesoRepository.buscarUsuariosConAcceso(
                        inicio,
                        fin
                )
        );

        // 3. ACTIVIDADES DEL DÍA

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

        // 4. CONTADORES

        int iniciaronSesion = 0;
        int noIniciaronSesion = 0;
        int sinPausasCompletadas = 0;

        long pausasCompletadas = 0;
        long pausasIncompletas = 0;
        long pausasEnProgreso = 0;
        long pausasCanceladas = 0;

        List<AvisoPersonal> avisos =
                new ArrayList<>();

        // 5. UNA TARJETA POR EMPLEADO

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

            // NO INICIÓ SESIÓN

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

            // SÍ INICIÓ SESIÓN

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

            // CLASIFICAR LOS ESTADOS

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

            // PAUSAS NO INICIADAS

            int noIniciadas =
                    META_DIARIA - cuatroPausas.size();

            // Las no iniciadas se suman a las
            // incompletas para la meta diaria.
            int incompletas =
                    noIniciadas + incompletasRegistradas;

            // CONTADORES GENERALES

            pausasCompletadas += completadas;
            pausasIncompletas += incompletas;
            pausasEnProgreso += enProgreso;
            pausasCanceladas += canceladas;

            if (completadas == 0) {
                sinPausasCompletadas++;
            }

            // MENSAJE DE LA TARJETA

            boolean metaCumplida =
                    completadas == META_DIARIA;

            String mensaje = metaCumplida
                    ? "Meta diaria cumplida: " +
                    "4 de 4 pausas completadas."
                    : "Resumen de las 4 pausas " +
                    "programadas para hoy.";

            // SOLO UN AVISO POR EMPLEADO
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

        // 6. RESPUESTA PARA ANGULAR

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

    // DTO DEL DASHBOARD

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
    ) {
    }

    // DTO DEL AVISO INDIVIDUAL

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
    ) {
    }

    // HISTORIAL REAL DE ACTIVIDADES

    @GetMapping("/registros-pausas")
    @Transactional(readOnly = true)
    public List<RegistroPausa> obtenerRegistrosPausas() {

        return actividadRepository.findAll()
                .stream()

                // Mostrar solamente actividades
                // pertenecientes a empleados.
                .filter(actividad -> {

                    Usuario usuario = actividad.getUsuario();

                    return usuario != null
                            && usuario.getRol() != null
                            && "EMPLEADO".equalsIgnoreCase(
                            usuario.getRol().getNombre()
                    );
                })

                // Más recientes primero.
                .sorted(
                        Comparator.comparing(
                                Actividad::getFecha,
                                Comparator.nullsFirst(
                                        Comparator.naturalOrder()
                                )
                        ).reversed()
                )

                .map(actividad -> {

                    Usuario usuario = actividad.getUsuario();

                    int segundos = actividad
                            .getSegundosTranscurridos() == null
                            ? 0
                            : Math.max(
                            0,
                            actividad.getSegundosTranscurridos()
                    );

                    return new RegistroPausa(
                            actividad.getId(),

                            usuario.getNombre() == null
                                    ? "Empleado"
                                    : usuario.getNombre(),

                            usuario.getEmail() == null
                                    ? ""
                                    : usuario.getEmail(),

                            actividad.getFecha() == null
                                    ? ""
                                    : actividad.getFecha().toString(),

                            actividad.getEstado(),

                            segundos
                    );
                })

                .toList();
    }

    // DTO DEL REGISTRO INDIVIDUAL

    public record RegistroPausa(
            Long id,
            String empleado,
            String email,
            String fecha,
            String estado,
            int segundosRealizados
    ) {
    }


    // ==========================================
    // SEGUIMIENTO CONSOLIDADO DE RRHH
    // ==========================================

    @GetMapping("/seguimiento-consolidado")
    @Transactional(readOnly = true)
    public SeguimientoConsolidado obtenerConsolidado(
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate fecha
    ) {
        LocalDate hoy = LocalDate.now();

        LocalDate fechaCorte = fecha == null
                ? hoy
                : fecha.isAfter(hoy) ? hoy : fecha;

        LocalDate inicioMes =
                fechaCorte.withDayOfMonth(1);

        // Incluir EMPLEADO y RRHH.
        List<Usuario> usuarios = usuarioRepository.findAll()
                .stream()
                .filter(u -> u.getRol() != null)
                .filter(u -> {
                    String rol = u.getRol().getNombre();
                    return "EMPLEADO".equalsIgnoreCase(rol)
                            || "RRHH".equalsIgnoreCase(rol);
                })
                .sorted(Comparator.comparing(
                        Usuario::getNombre,
                        Comparator.nullsLast(
                                String.CASE_INSENSITIVE_ORDER
                        )
                ))
                .toList();

        // Una consulta para todo el período mensual.
        List<Actividad> actividades =
                actividadRepository.findByFechaBetween(
                        inicioMes.atStartOfDay(),
                        fechaCorte.atTime(
                                java.time.LocalTime.MAX
                        )
                );

        Map<Long, List<Actividad>> porUsuario =
                new HashMap<>();

        for (Actividad actividad : actividades) {
            if (actividad.getUsuario() == null) {
                continue;
            }

            Long usuarioId =
                    actividad.getUsuario().getId();

            porUsuario
                    .computeIfAbsent(
                            usuarioId,
                            id -> new ArrayList<>()
                    )
                    .add(actividad);
        }

        List<ResumenUsuarioPausas> diario =
                new ArrayList<>();

        List<ResumenUsuarioPausas> mensual =
                new ArrayList<>();

        for (Usuario usuario : usuarios) {
            List<Actividad> propias =
                    porUsuario.getOrDefault(
                            usuario.getId(),
                            List.of()
                    );

            diario.add(
                    calcularResumen(
                            usuario,
                            propias,
                            fechaCorte,
                            fechaCorte
                    )
            );

            mensual.add(
                    calcularResumen(
                            usuario,
                            propias,
                            inicioMes,
                            fechaCorte
                    )
            );
        }

        return new SeguimientoConsolidado(
                fechaCorte.toString(),
                inicioMes.toString(),
                META_DIARIA,
                diario,
                mensual
        );
    }

    // ==========================================
    // CÁLCULO POR USUARIO Y PERÍODO
    // ==========================================

    private ResumenUsuarioPausas calcularResumen(
            Usuario usuario,
            List<Actividad> actividades,
            LocalDate inicio,
            LocalDate fin
    ) {
        Map<LocalDate, List<Actividad>> porDia =
                new HashMap<>();

        for (Actividad actividad : actividades) {
            if (actividad.getFecha() == null) {
                continue;
            }

            LocalDate dia =
                    actividad.getFecha().toLocalDate();

            if (dia.isBefore(inicio) ||
                    dia.isAfter(fin)) {
                continue;
            }

            porDia.computeIfAbsent(
                    dia,
                    d -> new ArrayList<>()
            ).add(actividad);
        }

        int completadas = 0;
        int incompletas = 0;
        int canceladas = 0;
        int enProceso = 0;
        int noIniciadas = 0;
        int completadasParaMeta = 0;

        long dias = ChronoUnit.DAYS.between(
                inicio,
                fin
        ) + 1;

        int esperadas =
                Math.toIntExact(dias * META_DIARIA);

        // Se evalúan también los días sin registros.
        for (LocalDate dia = inicio;
             !dia.isAfter(fin);
             dia = dia.plusDays(1)) {

            List<Actividad> delDia =
                    porDia.getOrDefault(
                            dia,
                            List.of()
                    );

            int completadasDia = 0;

            for (Actividad actividad : delDia) {
                String estado = actividad.getEstado();

                if (Actividad.ESTADO_COMPLETADA
                        .equals(estado)) {
                    completadas++;
                    completadasDia++;

                } else if (Actividad.ESTADO_INCOMPLETA
                        .equals(estado)) {
                    incompletas++;

                } else if (Actividad.ESTADO_CANCELADA
                        .equals(estado)) {
                    canceladas++;

                } else if (Actividad.ESTADO_EN_PROCESO
                        .equals(estado)) {
                    enProceso++;
                }
            }

            // Máximo cuatro completadas
            // contabilizadas para la meta diaria.
            completadasParaMeta += Math.min(
                    META_DIARIA,
                    completadasDia
            );

            // Las no iniciadas son calculadas,
            // no son actividades almacenadas.
            noIniciadas += Math.max(
                    0,
                    META_DIARIA - delDia.size()
            );
        }

        double cumplimiento = esperadas == 0
                ? 0
                : Math.round(
                completadasParaMeta * 10000.0
                        / esperadas
        ) / 100.0;

        return new ResumenUsuarioPausas(
                usuario.getId(),
                usuario.getNombre(),
                usuario.getEmail(),
                usuario.getRol().getNombre(),
                esperadas,
                completadas,
                incompletas,
                canceladas,
                enProceso,
                noIniciadas,
                completadasParaMeta,
                cumplimiento
        );
    }

    // RESPUESTA GENERAL

    public record SeguimientoConsolidado(
            String fechaCorte,
            String inicioMes,
            int metaDiaria,
            List<ResumenUsuarioPausas> diario,
            List<ResumenUsuarioPausas> mensual
    ) {
    }

    // UNA FILA POR USUARIO

    public record ResumenUsuarioPausas(
            Long usuarioId,
            String nombre,
            String email,
            String rol,
            int esperadas,
            int completadas,
            int incompletas,
            int canceladas,
            int enProceso,
            int noIniciadas,
            int completadasParaMeta,
            double cumplimiento
    ) {
    }


    // =====================================================
    // SEGUIMIENTO POR RANGO DE FECHAS
    // =====================================================

    @GetMapping("/seguimiento-rango")
    @Transactional(readOnly = true)
    public SeguimientoRango obtenerSeguimientoRango(

            @RequestParam
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate inicio,

            @RequestParam
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate fin
    ) {

        LocalDate hoy = LocalDate.now();

        // Validar el rango.
        if (inicio.isAfter(fin)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "La fecha inicial no puede ser posterior a la final."
            );
        }

        if (fin.isAfter(hoy)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "No se permiten fechas futuras."
            );
        }

        long cantidadDias =
                ChronoUnit.DAYS.between(inicio, fin) + 1;

        // Limitar consultas demasiado grandes.
        if (cantidadDias > 366) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "El rango máximo permitido es de 366 días."
            );
        }

        // EMPLEADO y RRHH participan en los informes.
        List<Usuario> usuarios = usuarioRepository
                .findAll()
                .stream()
                .filter(usuario -> usuario.getRol() != null)
                .filter(usuario -> {
                    String rol = usuario.getRol().getNombre();

                    return "EMPLEADO".equalsIgnoreCase(rol)
                            || "RRHH".equalsIgnoreCase(rol);
                })
                .sorted(
                        Comparator.comparing(
                                Usuario::getNombre,
                                Comparator.nullsLast(
                                        String.CASE_INSENSITIVE_ORDER
                                )
                        )
                )
                .toList();

        // Consultar una sola vez las actividades
        // correspondientes al rango.
        List<Actividad> actividades =
                actividadRepository.findByFechaBetween(
                        inicio.atStartOfDay(),
                        fin.atTime(java.time.LocalTime.MAX)
                );

        // Agrupar actividades por usuario y por fecha.
        Map<Long, Map<LocalDate, List<Actividad>>> agrupadas =
                new HashMap<>();

        for (Actividad actividad : actividades) {

            if (
                    actividad.getUsuario() == null ||
                            actividad.getFecha() == null
            ) {
                continue;
            }

            Long usuarioId = actividad.getUsuario().getId();

            LocalDate fechaActividad =
                    actividad.getFecha().toLocalDate();

            agrupadas
                    .computeIfAbsent(
                            usuarioId,
                            id -> new HashMap<>()
                    )
                    .computeIfAbsent(
                            fechaActividad,
                            dia -> new ArrayList<>()
                    )
                    .add(actividad);
        }

        List<ResumenUsuarioRango> resultados =
                new ArrayList<>();

        // Totales generales del período.
        int totalEsperadas = 0;
        int totalCompletadas = 0;
        int totalIncompletas = 0;
        int totalCanceladas = 0;
        int totalEnProceso = 0;
        int totalNoIniciadas = 0;
        int totalCompletadasParaMeta = 0;

        for (Usuario usuario : usuarios) {

            Map<LocalDate, List<Actividad>> actividadesUsuario =
                    agrupadas.getOrDefault(
                            usuario.getId(),
                            Map.of()
                    );

            List<DetalleDiaRango> detalleDiario =
                    new ArrayList<>();

            int esperadas = 0;
            int completadas = 0;
            int incompletas = 0;
            int canceladas = 0;
            int enProceso = 0;
            int noIniciadas = 0;
            int completadasParaMeta = 0;

            // Recorrer todos los días del rango,
            // incluso aquellos sin actividades.
            for (
                    LocalDate dia = inicio;
                    !dia.isAfter(fin);
                    dia = dia.plusDays(1)
            ) {

                List<Actividad> actividadesDia =
                        actividadesUsuario.getOrDefault(
                                dia,
                                List.of()
                        );

                int completadasDia = 0;
                int incompletasDia = 0;
                int canceladasDia = 0;
                int enProcesoDia = 0;

                for (Actividad actividad : actividadesDia) {

                    String estado = actividad.getEstado();

                    if (Actividad.ESTADO_COMPLETADA.equals(estado)) {

                        completadasDia++;

                    } else if (
                            Actividad.ESTADO_INCOMPLETA.equals(estado)
                    ) {

                        incompletasDia++;

                    } else if (
                            Actividad.ESTADO_CANCELADA.equals(estado)
                    ) {

                        canceladasDia++;

                    } else if (
                            Actividad.ESTADO_EN_PROCESO.equals(estado)
                    ) {

                        enProcesoDia++;
                    }
                }

                // Máximo cuatro completadas válidas
                // para el porcentaje de cada día.
                int completadasMetaDia = Math.min(
                        META_DIARIA,
                        completadasDia
                );

                // Cupos sin intentos registrados.
                int noIniciadasDia = Math.max(
                        0,
                        META_DIARIA - actividadesDia.size()
                );

                double porcentajeDia =
                        Math.round(
                                completadasMetaDia * 10000.0
                                        / META_DIARIA
                        ) / 100.0;

                detalleDiario.add(
                        new DetalleDiaRango(
                                dia.toString(),
                                META_DIARIA,
                                completadasDia,
                                incompletasDia,
                                canceladasDia,
                                enProcesoDia,
                                noIniciadasDia,
                                completadasMetaDia,
                                porcentajeDia
                        )
                );

                esperadas += META_DIARIA;
                completadas += completadasDia;
                incompletas += incompletasDia;
                canceladas += canceladasDia;
                enProceso += enProcesoDia;
                noIniciadas += noIniciadasDia;
                completadasParaMeta += completadasMetaDia;
            }

            double cumplimiento = esperadas == 0
                    ? 0
                    : Math.round(
                    completadasParaMeta * 10000.0
                            / esperadas
            ) / 100.0;

            resultados.add(
                    new ResumenUsuarioRango(
                            usuario.getId(),
                            usuario.getNombre(),
                            usuario.getEmail(),
                            usuario.getRol().getNombre(),
                            esperadas,
                            completadas,
                            incompletas,
                            canceladas,
                            enProceso,
                            noIniciadas,
                            completadasParaMeta,
                            cumplimiento,
                            detalleDiario
                    )
            );

            totalEsperadas += esperadas;
            totalCompletadas += completadas;
            totalIncompletas += incompletas;
            totalCanceladas += canceladas;
            totalEnProceso += enProceso;
            totalNoIniciadas += noIniciadas;
            totalCompletadasParaMeta += completadasParaMeta;
        }

        double cumplimientoGeneral = totalEsperadas == 0
                ? 0
                : Math.round(
                totalCompletadasParaMeta * 10000.0
                        / totalEsperadas
        ) / 100.0;

        ResumenGeneralRango general =
                new ResumenGeneralRango(
                        usuarios.size(),
                        totalEsperadas,
                        totalCompletadas,
                        totalIncompletas,
                        totalCanceladas,
                        totalEnProceso,
                        totalNoIniciadas,
                        totalCompletadasParaMeta,
                        cumplimientoGeneral
                );

        return new SeguimientoRango(
                inicio.toString(),
                fin.toString(),
                META_DIARIA,
                general,
                resultados
        );
    }

    // =====================================================
    // DTO: RESPUESTA DEL RANGO
    // =====================================================

    public record SeguimientoRango(
            String inicio,
            String fin,
            int metaDiaria,
            ResumenGeneralRango general,
            List<ResumenUsuarioRango> usuarios
    ) {
    }

    // =====================================================
    // DTO: RESUMEN GENERAL
    // =====================================================

    public record ResumenGeneralRango(
            int totalUsuarios,
            int esperadas,
            int completadas,
            int incompletas,
            int canceladas,
            int enProceso,
            int noIniciadas,
            int completadasParaMeta,
            double cumplimiento
    ) {
    }

    // =====================================================
    // DTO: RESUMEN INDIVIDUAL
    // =====================================================

    public record ResumenUsuarioRango(
            Long usuarioId,
            String nombre,
            String email,
            String rol,
            int esperadas,
            int completadas,
            int incompletas,
            int canceladas,
            int enProceso,
            int noIniciadas,
            int completadasParaMeta,
            double cumplimiento,
            List<DetalleDiaRango> detalleDiario
    ) {
    }

    // =====================================================
    // DTO: ACTIVIDAD DIARIA DE UNA PERSONA
    // =====================================================

    public record DetalleDiaRango(
            String fecha,
            int esperadas,
            int completadas,
            int incompletas,
            int canceladas,
            int enProceso,
            int noIniciadas,
            int completadasParaMeta,
            double cumplimiento
    ) {
    }

    // =====================================================
    // EXPORTACIÓN EXCEL - INFORME GENERAL POR RANGO
    // =====================================================

    @GetMapping("/seguimiento-rango/excel")
    @Transactional(readOnly = true)
    public ResponseEntity<byte[]> descargarExcelGeneral(
            @RequestParam("inicio")
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate inicio,

            @RequestParam("fin")
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate fin
    ) {
        SeguimientoRango datos = obtenerSeguimientoRango(inicio, fin);

        try (XSSFWorkbook libro = new XSSFWorkbook()) {

            CellStyle encabezado = crearEstiloEncabezado(libro);
            CellStyle porcentaje = crearEstiloPorcentaje(libro);

            // HOJA 1: RESUMEN POR USUARIO
            Sheet resumen = libro.createSheet("Resumen general");

            String[] columnasResumen = {
                    "Usuario ID",
                    "Nombre",
                    "Correo",
                    "Rol",
                    "Pausas esperadas",
                    "Completadas",
                    "Incompletas",
                    "Canceladas",
                    "En proceso",
                    "No iniciadas",
                    "Completadas para meta",
                    "Cumplimiento"
            };

            agregarEncabezados(resumen, columnasResumen, encabezado);

            int filaActual = 1;

            for (ResumenUsuarioRango usuario : datos.usuarios()) {

                Row fila = resumen.createRow(filaActual++);

                ponerNumero(fila, 0, usuario.usuarioId());
                ponerTexto(fila, 1, usuario.nombre());
                ponerTexto(fila, 2, usuario.email());
                ponerTexto(fila, 3, usuario.rol());
                ponerNumero(fila, 4, usuario.esperadas());
                ponerNumero(fila, 5, usuario.completadas());
                ponerNumero(fila, 6, usuario.incompletas());
                ponerNumero(fila, 7, usuario.canceladas());
                ponerNumero(fila, 8, usuario.enProceso());
                ponerNumero(fila, 9, usuario.noIniciadas());
                ponerNumero(fila, 10, usuario.completadasParaMeta());
                ponerPorcentaje(
                        fila, 11, usuario.cumplimiento(), porcentaje
                );
            }

            // Fila de totales generales.
            ResumenGeneralRango general = datos.general();

            Row totales = resumen.createRow(filaActual++);

            ponerTexto(totales, 1, "TOTAL GENERAL");
            ponerNumero(totales, 4, general.esperadas());
            ponerNumero(totales, 5, general.completadas());
            ponerNumero(totales, 6, general.incompletas());
            ponerNumero(totales, 7, general.canceladas());
            ponerNumero(totales, 8, general.enProceso());
            ponerNumero(totales, 9, general.noIniciadas());
            ponerNumero(totales, 10, general.completadasParaMeta());
            ponerPorcentaje(
                    totales, 11, general.cumplimiento(), porcentaje
            );

            ajustarColumnas(resumen, columnasResumen.length);

            // HOJA 2: DESGLOSE DE TODOS LOS DÍAS
            Sheet detalle = libro.createSheet("Detalle diario");

            String[] columnasDetalle = {
                    "Fecha",
                    "Usuario ID",
                    "Nombre",
                    "Correo",
                    "Rol",
                    "Pausas esperadas",
                    "Completadas",
                    "Incompletas",
                    "Canceladas",
                    "En proceso",
                    "No iniciadas",
                    "Completadas para meta",
                    "Cumplimiento"
            };

            agregarEncabezados(detalle, columnasDetalle, encabezado);

            int filaDetalle = 1;

            for (ResumenUsuarioRango usuario : datos.usuarios()) {

                for (DetalleDiaRango dia : usuario.detalleDiario()) {

                    Row fila = detalle.createRow(filaDetalle++);

                    ponerTexto(fila, 0, dia.fecha());
                    ponerNumero(fila, 1, usuario.usuarioId());
                    ponerTexto(fila, 2, usuario.nombre());
                    ponerTexto(fila, 3, usuario.email());
                    ponerTexto(fila, 4, usuario.rol());
                    ponerNumero(fila, 5, dia.esperadas());
                    ponerNumero(fila, 6, dia.completadas());
                    ponerNumero(fila, 7, dia.incompletas());
                    ponerNumero(fila, 8, dia.canceladas());
                    ponerNumero(fila, 9, dia.enProceso());
                    ponerNumero(fila, 10, dia.noIniciadas());
                    ponerNumero(fila, 11, dia.completadasParaMeta());
                    ponerPorcentaje(
                            fila, 12, dia.cumplimiento(), porcentaje
                    );
                }
            }

            ajustarColumnas(detalle, columnasDetalle.length);

            String nombreArchivo =
                    "seguimiento_general_" + inicio + "_" + fin + ".xlsx";

            return construirRespuestaExcel(libro, nombreArchivo);

        } catch (IOException e) {
            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "No se pudo generar el informe Excel general.",
                    e
            );
        }
    }


    // =====================================================
    // EXPORTACIÓN EXCEL - INFORME INDIVIDUAL
    // FUNCIONA PARA UN DÍA O UN RANGO COMPLETO
    // =====================================================

    @GetMapping("/seguimiento-rango/excel-individual")
    @Transactional(readOnly = true)
    public ResponseEntity<byte[]> descargarExcelIndividual(
            @RequestParam("usuarioId") Long usuarioId,

            @RequestParam("inicio")
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate inicio,

            @RequestParam("fin")
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate fin
    ) {

        SeguimientoRango datos = obtenerSeguimientoRango(inicio, fin);

        ResumenUsuarioRango usuario = datos.usuarios()
                .stream()
                .filter(u -> u.usuarioId().equals(usuarioId))
                .findFirst()
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "No se encontró el usuario solicitado."
                ));

        try (XSSFWorkbook libro = new XSSFWorkbook()) {

            CellStyle encabezado = crearEstiloEncabezado(libro);
            CellStyle porcentaje = crearEstiloPorcentaje(libro);

            // HOJA 1: RESUMEN INDIVIDUAL
            Sheet resumen = libro.createSheet("Resumen individual");

            String[] columnasResumen = {
                    "Usuario ID",
                    "Nombre",
                    "Correo",
                    "Rol",
                    "Fecha inicial",
                    "Fecha final",
                    "Pausas esperadas",
                    "Completadas",
                    "Incompletas",
                    "Canceladas",
                    "En proceso",
                    "No iniciadas",
                    "Completadas para meta",
                    "Cumplimiento"
            };

            agregarEncabezados(resumen, columnasResumen, encabezado);

            Row filaResumen = resumen.createRow(1);

            ponerNumero(filaResumen, 0, usuario.usuarioId());
            ponerTexto(filaResumen, 1, usuario.nombre());
            ponerTexto(filaResumen, 2, usuario.email());
            ponerTexto(filaResumen, 3, usuario.rol());
            ponerTexto(filaResumen, 4, inicio.toString());
            ponerTexto(filaResumen, 5, fin.toString());
            ponerNumero(filaResumen, 6, usuario.esperadas());
            ponerNumero(filaResumen, 7, usuario.completadas());
            ponerNumero(filaResumen, 8, usuario.incompletas());
            ponerNumero(filaResumen, 9, usuario.canceladas());
            ponerNumero(filaResumen, 10, usuario.enProceso());
            ponerNumero(filaResumen, 11, usuario.noIniciadas());
            ponerNumero(
                    filaResumen, 12, usuario.completadasParaMeta()
            );
            ponerPorcentaje(
                    filaResumen, 13, usuario.cumplimiento(), porcentaje
            );

            ajustarColumnas(resumen, columnasResumen.length);

            // HOJA 2: DESGLOSE DEL PERÍODO
            Sheet detalle = libro.createSheet("Detalle por fecha");

            String[] columnasDetalle = {
                    "Fecha",
                    "Pausas esperadas",
                    "Completadas",
                    "Incompletas",
                    "Canceladas",
                    "En proceso",
                    "No iniciadas",
                    "Completadas para meta",
                    "Cumplimiento"
            };

            agregarEncabezados(detalle, columnasDetalle, encabezado);

            int filaActual = 1;

            for (DetalleDiaRango dia : usuario.detalleDiario()) {

                Row fila = detalle.createRow(filaActual++);

                ponerTexto(fila, 0, dia.fecha());
                ponerNumero(fila, 1, dia.esperadas());
                ponerNumero(fila, 2, dia.completadas());
                ponerNumero(fila, 3, dia.incompletas());
                ponerNumero(fila, 4, dia.canceladas());
                ponerNumero(fila, 5, dia.enProceso());
                ponerNumero(fila, 6, dia.noIniciadas());
                ponerNumero(fila, 7, dia.completadasParaMeta());
                ponerPorcentaje(
                        fila, 8, dia.cumplimiento(), porcentaje
                );
            }

            ajustarColumnas(detalle, columnasDetalle.length);

            String nombreArchivo =
                    "seguimiento_usuario_" + usuarioId +
                            "_" + inicio + "_" + fin + ".xlsx";

            return construirRespuestaExcel(libro, nombreArchivo);

        } catch (IOException e) {
            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "No se pudo generar el informe Excel individual.",
                    e
            );
        }
    }


    // =====================================================
    // MÉTODOS AUXILIARES PARA CONSTRUIR EL EXCEL
    // =====================================================

    private CellStyle crearEstiloEncabezado(Workbook libro) {

        CellStyle estilo = libro.createCellStyle();

        estilo.setFillForegroundColor(
                IndexedColors.DARK_BLUE.getIndex()
        );

        estilo.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        estilo.setAlignment(HorizontalAlignment.CENTER);

        Font fuente = libro.createFont();

        fuente.setBold(true);
        fuente.setColor(IndexedColors.WHITE.getIndex());

        estilo.setFont(fuente);

        return estilo;
    }

    private CellStyle crearEstiloPorcentaje(Workbook libro) {

        CellStyle estilo = libro.createCellStyle();

        DataFormat formato = libro.createDataFormat();

        estilo.setDataFormat(formato.getFormat("0.00%"));

        return estilo;
    }

    private void agregarEncabezados(
            Sheet hoja,
            String[] columnas,
            CellStyle estilo
    ) {

        Row fila = hoja.createRow(0);

        for (int i = 0; i < columnas.length; i++) {

            Cell celda = fila.createCell(i);

            celda.setCellValue(columnas[i]);
            celda.setCellStyle(estilo);
        }

        hoja.createFreezePane(0, 1);
    }

    private void ponerTexto(
            Row fila,
            int columna,
            String valor
    ) {

        fila.createCell(columna)
                .setCellValue(valor == null ? "" : valor);
    }

    private void ponerNumero(
            Row fila,
            int columna,
            Number valor
    ) {

        fila.createCell(columna)
                .setCellValue(
                        valor == null ? 0 : valor.doubleValue()
                );
    }

    private void ponerPorcentaje(
            Row fila,
            int columna,
            double valor,
            CellStyle estilo
    ) {

        Cell celda = fila.createCell(columna);

        // Los DTO manejan porcentajes entre 0 y 100.
        // Excel necesita valores entre 0 y 1.
        celda.setCellValue(valor / 100.0);
        celda.setCellStyle(estilo);
    }

    private void ajustarColumnas(
            Sheet hoja,
            int cantidadColumnas
    ) {

        for (int i = 0; i < cantidadColumnas; i++) {

            hoja.autoSizeColumn(i);

            // Evitar columnas excesivamente anchas.
            int ancho = hoja.getColumnWidth(i);

            hoja.setColumnWidth(
                    i,
                    Math.min(ancho + 700, 12000)
            );
        }

        // Filtro en los encabezados.
        if (hoja.getLastRowNum() >= 1) {
            hoja.setAutoFilter(
                    new org.apache.poi.ss.util.CellRangeAddress(
                            0,
                            hoja.getLastRowNum(),
                            0,
                            cantidadColumnas - 1
                    )
            );
        }
    }

    private ResponseEntity<byte[]> construirRespuestaExcel(
            XSSFWorkbook libro,
            String nombreArchivo
    ) throws IOException {

        ByteArrayOutputStream salida =
                new ByteArrayOutputStream();

        libro.write(salida);

        byte[] contenido = salida.toByteArray();

        HttpHeaders cabeceras = new HttpHeaders();

        cabeceras.setContentDisposition(
                ContentDisposition.attachment()
                        .filename(nombreArchivo)
                        .build()
        );

        cabeceras.setContentType(
                MediaType.parseMediaType(
                        "application/vnd.openxmlformats-" +
                                "officedocument.spreadsheetml.sheet"
                )
        );

        cabeceras.setContentLength(contenido.length);

        return new ResponseEntity<>(
                contenido,
                cabeceras,
                HttpStatus.OK
        );
    }

}
