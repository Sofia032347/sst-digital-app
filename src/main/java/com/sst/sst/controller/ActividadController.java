package com.sst.sst.controller;

import com.sst.sst.model.Actividad;
import com.sst.sst.model.Usuario;
import com.sst.sst.repository.ActividadRepository;
import com.sst.sst.repository.UsuarioRepository;
import com.sst.sst.service.NotificacionService;
import com.sst.sst.service.RecordatorioPausaService;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Controller;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.time.temporal.TemporalAdjusters;
import java.util.*;
import java.util.stream.Collectors;

@Controller
@RequestMapping("/actividades")
public class ActividadController {

    @Autowired
    private ActividadRepository actividadRepository;

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private RecordatorioPausaService recordatorioPausaService;

    @Autowired
    private NotificacionService notificacionService;

    private static final int OBJETIVO_DIARIO = 4;
    private static final int DURACION_MINIMA_RUTINA_SEGUNDOS = 600;
    private static final String SESION_INICIO_TRAMO = "inicioTramoActividadActual";

    // --- DASHBOARD RRHH ---
    @GetMapping("/rrhh")
    public String mostrarDashboard(
            @RequestParam(required = false) String filtro,
            @RequestParam(value = "fechaRef", required = false) String fechaRef,
            Model model,
            HttpSession session,
            Authentication authentication) {

        requerirRRHH(authentication);

        LocalDate fechaReferencia = (fechaRef != null && !fechaRef.isEmpty())
                ? LocalDate.parse(fechaRef)
                : LocalDate.now();

        LocalDateTime inicioTabla;
        LocalDateTime finTabla;
        String filtroReal = (filtro != null) ? filtro : "dia";

        if ("semana".equals(filtroReal)) {
            inicioTabla = fechaReferencia.with(DayOfWeek.MONDAY).atStartOfDay();
            finTabla = fechaReferencia.with(DayOfWeek.SUNDAY).atTime(LocalTime.MAX);
        } else if ("mes".equals(filtroReal)) {
            inicioTabla = fechaReferencia.with(TemporalAdjusters.firstDayOfMonth()).atStartOfDay();
            finTabla = fechaReferencia.with(TemporalAdjusters.lastDayOfMonth()).atTime(LocalTime.MAX);
        } else {
            inicioTabla = fechaReferencia.atStartOfDay();
            finTabla = fechaReferencia.atTime(LocalTime.MAX);
        }

        List<Actividad> actividadesBD = actividadRepository.findByFechaBetween(inicioTabla, finTabla);

        // --- LÓGICA DE AGRUPACIÓN PARA LA TABLA ---
        List<Map<String, Object>> datosAgrupados = new ArrayList<>();

        // Agrupamos por Usuario y por Fecha (sin hora)
        Map<Usuario, Map<LocalDate, List<Actividad>>> agrupado = actividadesBD.stream()
                .collect(Collectors.groupingBy(
                        Actividad::getUsuario,
                        Collectors.groupingBy(a -> a.getFecha().toLocalDate())
                ));

        for (var entryUsuario : agrupado.entrySet()) {
            Usuario u = entryUsuario.getKey();
            for (var entryDia : entryUsuario.getValue().entrySet()) {
                LocalDate fecha = entryDia.getKey();
                List<Actividad> acts = entryDia.getValue();

                // Rango de horas
                LocalTime minH = acts.stream().map(a -> a.getFecha().toLocalTime()).min(LocalTime::compareTo).get();
                LocalTime maxH = acts.stream().map(a -> a.getFecha().toLocalTime()).max(LocalTime::compareTo).get();

                // Suma de tiempo y conteo
                int sumaTiempo = acts.stream().filter(a -> "COMPLETADA".equals(a.getEstado()))
                        .mapToInt(a -> a.getDuracionSegundos() != null ? a.getDuracionSegundos() : 0).sum();
                long completadas = acts.stream().filter(a -> "COMPLETADA".equals(a.getEstado())).count();

                Map<String, Object> fila = new HashMap<>();
                fila.put("nombre", u.getNombre());
                fila.put("departamento", u.getDepartamento());
                fila.put("fechaDia", fecha.format(DateTimeFormatter.ofPattern("dd/MM/yyyy")));
                fila.put("rangoHoras", minH.format(DateTimeFormatter.ofPattern("HH:mm")) + " - " + maxH.format(DateTimeFormatter.ofPattern("HH:mm")));
                fila.put("tiempoTotal", sumaTiempo);
                fila.put("cantidadPausas", (int) completadas);
                fila.put("estadoDia", (completadas >= 4) ? "COMPLETO" : "INCOMPLETO");
                datosAgrupados.add(fila);
            }
        }

        // Ordenar por fecha descendente
        datosAgrupados.sort(Comparator.comparing(
                a -> LocalDate.parse(a.get("fechaDia").toString(), DateTimeFormatter.ofPattern("dd/MM/yyyy")),
                Comparator.reverseOrder()));

        // Alertas de hoy real
        List<Usuario> pendientes = obtenerPendientesHoy(actividadRepository.findByFechaBetween(LocalDate.now().atStartOfDay(), LocalDate.now().atTime(LocalTime.MAX)));

        model.addAttribute("listaActividades", datosAgrupados); // Enviamos la lista agrupada
        model.addAttribute("empleadosPendientes", pendientes);
        model.addAttribute("filtroActual", filtroReal);
        model.addAttribute("fechaRef", fechaReferencia);
        model.addAttribute("periodo", filtroReal.toUpperCase());

        return "rrhh/rrhh";
    }

    // --- REPORTES ---
    @GetMapping("/reportes")
    public String verReportes(
            @RequestParam(value = "periodo", defaultValue = "HOY") String periodo,
            @RequestParam(value = "fechaRef", required = false) String fechaRef,
            Model model,
            Authentication authentication) {

        requerirRRHH(authentication);

        LocalDate fechaReferencia = (fechaRef != null && !fechaRef.isEmpty())
                ? LocalDate.parse(fechaRef)
                : LocalDate.now();

        LocalDateTime fechaInicio;
        LocalDateTime fechaFin;

        switch (periodo.toUpperCase()) {
            case "DIA":
                fechaInicio = fechaReferencia.atStartOfDay();
                fechaFin = fechaReferencia.atTime(LocalTime.MAX);
                break;
            case "SEMANA":
                fechaInicio = fechaReferencia.with(DayOfWeek.MONDAY).atStartOfDay();
                fechaFin = fechaReferencia.with(DayOfWeek.SUNDAY).atTime(LocalTime.MAX);
                break;
            case "MES":
                fechaInicio = fechaReferencia.with(TemporalAdjusters.firstDayOfMonth()).atStartOfDay();
                fechaFin = fechaReferencia.with(TemporalAdjusters.lastDayOfMonth()).atTime(LocalTime.MAX);
                break;
            case "HOY":
            default:
                fechaInicio = LocalDate.now().atStartOfDay();
                fechaFin = LocalDate.now().atTime(LocalTime.MAX);
                periodo = "HOY";
                break;
        }

        List<Actividad> actividadesBD = actividadRepository.findByFechaBetween(fechaInicio, fechaFin);
        List<Map<String, Object>> datosReporte = new ArrayList<>();

        if ("HOY".equals(periodo) || "DIA".equals(periodo)) {
            // Detalle individual (como lo tenías)
            for (Actividad act : actividadesBD) {
                Map<String, Object> fila = new HashMap<>();
                fila.put("nombre", act.getUsuario().getNombre());
                fila.put("departamento", act.getUsuario().getDepartamento());
                fila.put("fechaHora", act.getFecha().format(DateTimeFormatter.ofPattern("HH:mm")));
                fila.put("tiempoTotal", act.getDuracionSegundos());
                fila.put("estado", act.getEstado());
                datosReporte.add(fila);
            }
        } else {
            // AGRUPACIÓN POR DÍA (Para SEMANA y MES)
            Map<Usuario, Map<LocalDate, List<Actividad>>> agrupado = actividadesBD.stream()
                    .collect(Collectors.groupingBy(
                            Actividad::getUsuario,
                            Collectors.groupingBy(a -> a.getFecha().toLocalDate())
                    ));

            for (var entryUsuario : agrupado.entrySet()) {
                Usuario u = entryUsuario.getKey();
                for (var entryDia : entryUsuario.getValue().entrySet()) {
                    LocalDate fecha = entryDia.getKey();
                    List<Actividad> acts = entryDia.getValue();

                    // 1. Calcular Rango de Horas (ej: 08:00 - 16:00)
                    LocalTime minHora = acts.stream().map(a -> a.getFecha().toLocalTime()).min(LocalTime::compareTo).get();
                    LocalTime maxHora = acts.stream().map(a -> a.getFecha().toLocalTime()).max(LocalTime::compareTo).get();
                    String rangoHoras = minHora.format(DateTimeFormatter.ofPattern("HH:mm")) + " - " +
                            maxHora.format(DateTimeFormatter.ofPattern("HH:mm"));

                    // 2. Sumar tiempo y contar completadas
                    int sumaTiempo = acts.stream()
                            .filter(a -> "COMPLETADA".equals(a.getEstado()))
                            .mapToInt(a -> a.getDuracionSegundos() != null ? a.getDuracionSegundos() : 0).sum();

                    long completadas = acts.stream().filter(a -> "COMPLETADA".equals(a.getEstado())).count();

                    Map<String, Object> fila = new HashMap<>();
                    fila.put("nombre", u.getNombre());
                    fila.put("departamento", u.getDepartamento());
                    fila.put("fechaDia", fecha.format(DateTimeFormatter.ofPattern("dd/MM/yyyy")));
                    fila.put("rangoHoras", rangoHoras);
                    fila.put("tiempoTotal", sumaTiempo);
                    fila.put("cantidadPausas", (int) completadas);
                    fila.put("estado", (completadas >= 4) ? "COMPLETO" : "INCOMPLETO");
                    datosReporte.add(fila);
                }
            }
            // Ordenar por fecha para que sea legible
            datosReporte.sort(Comparator.comparing(
                    a -> LocalDate.parse(a.get("fechaDia").toString(), DateTimeFormatter.ofPattern("dd/MM/yyyy")),
                    Comparator.reverseOrder()));
        }

        model.addAttribute("datosReporte", datosReporte);
        model.addAttribute("periodo", periodo);
        model.addAttribute("fechaRef", fechaReferencia);
        model.addAttribute("rangoFechas", fechaInicio.toLocalDate().format(DateTimeFormatter.ofPattern("dd/MM")) + " - " + fechaFin.toLocalDate().format(DateTimeFormatter.ofPattern("dd/MM")));

        return "rrhh/reportes";
    }

    // --- DASHBOARD EMPLEADO ---
    @GetMapping("/empleado")
    public String mostrarDashboardEmpleado(HttpSession session, Model model) {
        Usuario logueado = (Usuario) session.getAttribute("usuarioLogueado");
        if (logueado == null) return "redirect:/login";

        LocalDateTime inicio = LocalDate.now().atStartOfDay();
        LocalDateTime fin = LocalDate.now().atTime(LocalTime.MAX);

        List<Actividad> actividadesHoy = actividadRepository.findByUsuarioIdAndFechaBetween(
                logueado.getId(), inicio, fin);

        model.addAttribute("empleado", logueado);
        model.addAttribute("actividadesHoy", actividadesHoy);
        model.addAttribute("pausaRealizadaHoy", actividadesHoy.stream()
                .filter(a -> Actividad.ESTADO_COMPLETADA.equals(a.getEstado()))
                .count() >= OBJETIVO_DIARIO);

        return "empleado/empleado";
    }

    // --- ESTADO REAL DE LAS PAUSAS Y RECORDATORIOS ---
    @GetMapping("/estado-boton")
    @ResponseBody
    public Map<String, Object> verificarEstadoBoton(
            HttpSession session,
            Authentication authentication) {

        Usuario usuario = requerirUsuario(authentication);
        LocalDateTime horaLogin =
                (LocalDateTime) session.getAttribute("horaInicioSesion");

        RecordatorioPausaService.EstadoPausa estado =
                recordatorioPausaService.sincronizar(usuario, horaLogin);

        Map<String, Object> respuesta = new HashMap<>();
        respuesta.put("estado", estado.estado());
        respuesta.put("faltan", estado.faltan());
        respuesta.put("proximaPausa", estado.proximaPausa());
        respuesta.put("notificacionId", estado.notificacionId());
        return respuesta;
    }

    // --- LÓGICA DE PENDIENTES (CORREGIDA: INCLUYE RRHH) ---
    private List<Usuario> obtenerPendientesHoy(List<Actividad> actividadesDeHoy) {
        List<Long> completadosIds = actividadesDeHoy.stream()
                .filter(a -> "COMPLETADA".equals(a.getEstado()))
                .map(a -> a.getUsuario().getId())
                .collect(Collectors.toList());

        return usuarioRepository.findAll().stream()
                .filter(u -> "EMPLEADO".equals(u.getRol().getNombre()) || "RRHH".equals(u.getRol().getNombre()))
                .filter(u -> !completadosIds.contains(u.getId()))
                .collect(Collectors.toList());
    }

    // --- DESCARGAR REPORTE AGRUPADO (CSV PROFESIONAL) ---
    @GetMapping("/descargar")
    public void descargarCSV(HttpServletResponse response, Authentication authentication) throws IOException {
        requerirRRHH(authentication);

        // Configuración de respuesta para CSV
        response.setContentType("text/csv; charset=UTF-8");
        response.setHeader("Content-Disposition", "attachment; filename=reporte_pausas_agrupado.csv");

        // 1. Obtener todas las actividades y agruparlas (Igual que en el Dashboard)
        List<Actividad> actividadesBD = actividadRepository.findAll();

        Map<Usuario, Map<LocalDate, List<Actividad>>> agrupado = actividadesBD.stream()
                .collect(Collectors.groupingBy(
                        Actividad::getUsuario,
                        Collectors.groupingBy(a -> a.getFecha().toLocalDate())
                ));

        StringBuilder sb = new StringBuilder();
        // Escribir BOM para que Excel reconozca tildes y caracteres especiales
        sb.append('\ufeff');
        // Encabezados profesionales
        sb.append("Empleado,Departamento,Fecha,Jornada (Rango),Tiempo Total (Seg),Cumplimiento,Estado\n");

        // 2. Procesar los datos agrupados
        for (var entryUsuario : agrupado.entrySet()) {
            Usuario u = entryUsuario.getKey();
            for (var entryDia : entryUsuario.getValue().entrySet()) {
                LocalDate fecha = entryDia.getKey();
                List<Actividad> acts = entryDia.getValue();

                // Calcular Rango
                LocalTime minH = acts.stream().map(a -> a.getFecha().toLocalTime()).min(LocalTime::compareTo).get();
                LocalTime maxH = acts.stream().map(a -> a.getFecha().toLocalTime()).max(LocalTime::compareTo).get();
                String rango = minH.format(DateTimeFormatter.ofPattern("HH:mm")) + " - " + maxH.format(DateTimeFormatter.ofPattern("HH:mm"));

                // Calcular Cumplimiento
                int sumaTiempo = acts.stream().filter(a -> "COMPLETADA".equals(a.getEstado()))
                        .mapToInt(a -> a.getDuracionSegundos() != null ? a.getDuracionSegundos() : 0).sum();
                long completadas = acts.stream().filter(a -> "COMPLETADA".equals(a.getEstado())).count();
                String estado = (completadas >= 4) ? "COMPLETO" : "INCOMPLETO";

                // Escribir fila
                sb.append(u.getNombre()).append(",")
                        .append(u.getDepartamento()).append(",")
                        .append(fecha.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"))).append(",")
                        .append(rango).append(",")
                        .append(sumaTiempo).append(",")
                        .append(completadas).append(" / 4,")
                        .append(estado).append("\n");
            }
        }

        response.getWriter().write(sb.toString());
    }

    // --- VISTA PAUSA ACTIVA ---
    @GetMapping("/pausa-activa")
    public String mostrarPausaActiva(Authentication authentication, Model model) {
        Usuario logueado = requerirUsuario(authentication);
        model.addAttribute("empleado", logueado);
        return "pausa-activa";
    }

    // --- INICIAR PAUSA ---
    @PostMapping("/iniciar-pausa")
    @ResponseBody
    @Transactional
    public ResponseEntity<Long> iniciarPausa(HttpSession session, Authentication authentication) {
        Usuario logueado = requerirUsuario(authentication);
        LocalDate hoy = LocalDate.now();

        // Una segunda llamada desde la misma sesión reutiliza su actividad.
        Object actual = session.getAttribute("idActividadActual");
        if (actual instanceof Long idActual) {
            Optional<Actividad> existente = actividadRepository.findById(idActual);
            if (existente.isPresent()) {
                validarPropietario(existente.get(), logueado);
                if (Actividad.ESTADO_EN_PROCESO.equals(existente.get().getEstado())) {
                    if (!(session.getAttribute(SESION_INICIO_TRAMO) instanceof LocalDateTime)) {
                        session.setAttribute(SESION_INICIO_TRAMO, LocalDateTime.now());
                    }
                    return ResponseEntity.ok(idActual);
                }
            }
            session.removeAttribute("idActividadActual");
            session.removeAttribute(SESION_INICIO_TRAMO);
        }

        List<Actividad> actividadesHoy = actividadRepository.findByUsuarioIdAndFechaBetween(
                logueado.getId(), hoy.atStartOfDay(), hoy.atTime(LocalTime.MAX));

        long completadasHoy = actividadesHoy.stream()
                .filter(a -> Actividad.ESTADO_COMPLETADA.equals(a.getEstado()))
                .count();
        if (completadasHoy >= OBJETIVO_DIARIO) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Ya alcanzaste el objetivo diario de pausas activas");
        }

        if (actividadesHoy.size() >= OBJETIVO_DIARIO) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Ya registraste las 4 pausas permitidas hoy. " +
                            "Puedes continuar las pausas incompletas pendientes."
            );
        }

        Actividad nuevaActividad = new Actividad();
        nuevaActividad.setUsuario(logueado);
        nuevaActividad.setDuracionSegundos(0);
        nuevaActividad.setSegundosTranscurridos(0);
        nuevaActividad.setEjerciciosCompletados(0);
        nuevaActividad.setValidadoIA(false);
        nuevaActividad.setEstado(Actividad.ESTADO_EN_PROCESO);

        Actividad guardada = actividadRepository.save(nuevaActividad);
        session.setAttribute("idActividadActual", guardada.getId());
        session.setAttribute(SESION_INICIO_TRAMO, LocalDateTime.now());
        return ResponseEntity.ok(guardada.getId());
    }

    // --- FINALIZAR PAUSA ---
    @PostMapping("/finalizar-pausa")
    @ResponseBody
    @Transactional
    public ResponseEntity<String> finalizarPausa(HttpSession session, Authentication authentication) {
        Actividad actividad = obtenerActividadActualAutorizada(session, authentication);
        comprobarEnProceso(actividad);

        // Duración acumulada: tramos anteriores + tramo iniciado/reanudado.
        // No se contabiliza el intervalo que estuvo guardada como INCOMPLETA.
        int segundos = calcularSegundosTranscurridos(actividad, session);
        if (segundos < DURACION_MINIMA_RUTINA_SEGUNDOS) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "La rutina aún no cumple el tiempo mínimo de 10 minutos");
        }

        actividad.setDuracionSegundos(segundos);
        actividad.setSegundosTranscurridos(segundos);
        // No declarar validación por IA sin comprobación real del servidor.
        actividad.setValidadoIA(false);
        actividad.setEstado(Actividad.ESTADO_COMPLETADA);
        Actividad guardada = actividadRepository.save(actividad);
        notificacionService.registrarPausaCompletada(guardada.getUsuario(), guardada);
        limpiarSesionPausa(session);

        return ResponseEntity.ok("Pausa registrada como COMPLETADA (sin validación IA)");
    }

    // --- BOTÓN CANCELAR: REGISTRAR INCOMPLETA ---
    @PostMapping("/boton-cancelar")
    @ResponseBody
    @Transactional
    public ResponseEntity<String> botonCancelarPausa(HttpSession session, Authentication authentication) {
        Actividad actividad = obtenerActividadActualAutorizada(session, authentication);
        comprobarEnProceso(actividad);

        int segundos = calcularSegundosTranscurridos(actividad, session);
        actividad.setDuracionSegundos(segundos);
        actividad.setSegundosTranscurridos(segundos);
        actividad.setEstado(Actividad.ESTADO_INCOMPLETA);
        actividadRepository.save(actividad);
        limpiarSesionPausa(session);
        return ResponseEntity.ok("Registrada como INCOMPLETA");
    }

    // --- SALIDA FORZADA: REGISTRAR CANCELADA ---
    @PostMapping("/cancelar-pausa")
    @ResponseBody
    @Transactional
    public ResponseEntity<String> cancelarPausaForzada(HttpSession session, Authentication authentication) {
        Actividad actividad = obtenerActividadActualAutorizada(session, authentication);
        comprobarEnProceso(actividad);

        int segundos = calcularSegundosTranscurridos(actividad, session);
        actividad.setDuracionSegundos(segundos);
        actividad.setSegundosTranscurridos(segundos);
        actividad.setEstado(Actividad.ESTADO_CANCELADA);
        actividadRepository.save(actividad);
        limpiarSesionPausa(session);
        return ResponseEntity.ok("Registrada como CANCELADA");
    }


    // ==========================================
    // CONSULTAR PAUSA INCOMPLETA
    // ==========================================

    @GetMapping("/pausa-pendiente")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> obtenerPausaPendiente(
            Authentication authentication
    ) {
        Usuario usuario = requerirUsuario(authentication);

        Actividad pendiente =
                buscarUltimaPausaIncompleta(usuario.getId());

        Map<String, Object> respuesta = new HashMap<>();

        if (pendiente == null) {
            respuesta.put("existe", false);
            respuesta.put("tienePausaPendiente", false);
            return ResponseEntity.ok(respuesta);
        }

        respuesta.put("existe", true);
        respuesta.put("tienePausaPendiente", true);
        respuesta.put("id", pendiente.getId());
        respuesta.put("estado", pendiente.getEstado());

        respuesta.put(
                "indiceEjercicio",
                valorOZero(pendiente.getIndiceEjercicio())
        );

        respuesta.put(
                "indiceFase",
                valorOZero(pendiente.getIndiceFase())
        );

        respuesta.put(
                "tiempoRestante",
                valorOZero(pendiente.getTiempoRestante())
        );

        respuesta.put(
                "segundosTranscurridos",
                valorOZero(pendiente.getSegundosTranscurridos())
        );

        respuesta.put(
                "ejerciciosCompletados",
                valorOZero(pendiente.getEjerciciosCompletados())
        );

        return ResponseEntity.ok(respuesta);
    }

    // ==========================================
    // GUARDAR PAUSA COMO INCOMPLETA
    // ==========================================

    @PostMapping("/guardar-pausa-incompleta")
    @ResponseBody
    @Transactional
    public ResponseEntity<Map<String, Object>> guardarPausaIncompleta(
            HttpSession session,
            Authentication authentication,
            @RequestBody(required = false)
            Map<String, Object> progreso
    ) {
        Actividad actividad =
                obtenerActividadActualAutorizada(
                        session,
                        authentication
                );

        comprobarEnProceso(actividad);

        // Guardar el tiempo efectivo acumulado.
        // No se sumará el tiempo que el empleado
        // permanezca fuera de la rutina.

        int segundosCalculados =
                calcularSegundosTranscurridos(actividad, session);

        int segundosGuardados =
                leerEntero(
                        progreso,
                        "segundosTranscurridos",
                        segundosCalculados
                );

        int segundos =
                Math.max(
                        0,
                        Math.min(
                                segundosCalculados,
                                segundosGuardados
                        )
                );

        actividad.setDuracionSegundos(segundos);
        actividad.setSegundosTranscurridos(segundos);

        actividad.setIndiceEjercicio(
                leerEntero(
                        progreso,
                        "indiceEjercicio",
                        valorOZero(actividad.getIndiceEjercicio())
                )
        );

        actividad.setIndiceFase(
                leerEntero(
                        progreso,
                        "indiceFase",
                        valorOZero(actividad.getIndiceFase())
                )
        );

        actividad.setTiempoRestante(
                leerEntero(
                        progreso,
                        "tiempoRestante",
                        valorOZero(actividad.getTiempoRestante())
                )
        );

        actividad.setEjerciciosCompletados(
                leerEntero(
                        progreso,
                        "ejerciciosCompletados",
                        valorOZero(
                                actividad.getEjerciciosCompletados()
                        )
                )
        );

        actividad.setEstado(
                Actividad.ESTADO_INCOMPLETA
        );

        Actividad guardada =
                actividadRepository.save(actividad);

        limpiarSesionPausa(session);

        Map<String, Object> respuesta = new HashMap<>();

        respuesta.put("id", guardada.getId());
        respuesta.put("estado", guardada.getEstado());
        respuesta.put(
                "mensaje",
                "Pausa guardada como INCOMPLETA"
        );

        return ResponseEntity.ok(respuesta);
    }

    // ==========================================
    // REANUDAR PAUSA INCOMPLETA
    // ==========================================

    @PostMapping("/reanudar-pausa")
    @ResponseBody
    @Transactional
    public ResponseEntity<Map<String, Object>> reanudarPausa(
            HttpSession session,
            Authentication authentication,
            @RequestBody(required = false)
            Map<String, Object> datos
    ) {
        Usuario usuario = requerirUsuario(authentication);


        Actividad pendiente;

        if (datos != null && datos.containsKey("id")) {
            Long idSolicitado = leerLong(datos.get("id"));

            if (idSolicitado == null) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "ID de pausa inválido"
                );
            }

            pendiente = actividadRepository.findById(idSolicitado)
                    .orElseThrow(() -> new ResponseStatusException(
                            HttpStatus.NOT_FOUND,
                            "Pausa no encontrada"
                    ));

            validarPropietario(pendiente, usuario);

            if (!Actividad.ESTADO_INCOMPLETA.equals(
                    pendiente.getEstado())) {
                throw new ResponseStatusException(
                        HttpStatus.CONFLICT,
                        "La pausa no está incompleta"
                );
            }
        } else {
            pendiente = buscarUltimaPausaIncompleta(usuario.getId());
        }

        if (pendiente == null) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "No tienes una pausa incompleta para reanudar"
            );
        }

        // La pausa pendiente debe ser de hoy.
        // No reabrir actividades de días anteriores.

        if (
                pendiente.getFecha() == null ||
                        !pendiente.getFecha()
                                .toLocalDate()
                                .equals(LocalDate.now())
        ) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Solo puedes reanudar pausas del día actual"
            );
        }

        // Si el frontend envía un ID, verificar que
        // coincida con la actividad pendiente real.

        if (
                datos != null &&
                        datos.containsKey("id")
        ) {
            Long idSolicitado =
                    leerLong(datos.get("id"));

            if (
                    idSolicitado == null ||
                            !idSolicitado.equals(pendiente.getId())
            ) {
                throw new ResponseStatusException(
                        HttpStatus.CONFLICT,
                        "La pausa solicitada no coincide con la pendiente"
                );
            }
        }

        // Evitar reanudar mientras otra actividad
        // del mismo usuario sigue EN_PROCESO.

        LocalDate hoy = LocalDate.now();

        boolean otraEnProceso =
                actividadRepository
                        .findByUsuarioIdAndFechaBetween(
                                usuario.getId(),
                                hoy.atStartOfDay(),
                                hoy.atTime(LocalTime.MAX)
                        )
                        .stream()
                        .anyMatch(a ->
                                !a.getId().equals(pendiente.getId())
                                        &&
                                        Actividad.ESTADO_EN_PROCESO
                                                .equals(a.getEstado())
                        );

        if (otraEnProceso) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Ya existe otra pausa en proceso"
            );
        }

        // Se conserva el progreso registrado.
        // El tiempo transcurrido desde el guardado
        // no se agrega a la duración de ejercicios.

        pendiente.setEstado(
                Actividad.ESTADO_EN_PROCESO
        );

        Actividad guardada =
                actividadRepository.saveAndFlush(pendiente);

        session.setAttribute(
                "idActividadActual",
                guardada.getId()
        );
        // Una reanudación inicia un tramo NUEVO, sin contar la pausa guardada.
        session.setAttribute(SESION_INICIO_TRAMO, LocalDateTime.now());

        Map<String, Object> respuesta = new HashMap<>();

        respuesta.put("id", guardada.getId());
        respuesta.put("estado", guardada.getEstado());

        respuesta.put(
                "indiceEjercicio",
                valorOZero(guardada.getIndiceEjercicio())
        );

        respuesta.put(
                "indiceFase",
                valorOZero(guardada.getIndiceFase())
        );

        respuesta.put(
                "tiempoRestante",
                valorOZero(guardada.getTiempoRestante())
        );

        respuesta.put(
                "segundosTranscurridos",
                valorOZero(guardada.getSegundosTranscurridos())
        );

        respuesta.put(
                "ejerciciosCompletados",
                valorOZero(guardada.getEjerciciosCompletados())
        );

        respuesta.put(
                "mensaje",
                "Pausa reanudada correctamente"
        );

        return ResponseEntity.ok(respuesta);
    }

    // ==========================================
    // BUSCAR ÚLTIMA PAUSA INCOMPLETA DE HOY
    // ==========================================

    private Actividad buscarUltimaPausaIncompleta(
            Long usuarioId
    ) {
        LocalDate hoy = LocalDate.now();

        return actividadRepository
                .findByUsuarioIdAndFechaBetween(
                        usuarioId,
                        hoy.atStartOfDay(),
                        hoy.atTime(LocalTime.MAX)
                )
                .stream()
                .filter(a ->
                        Actividad.ESTADO_INCOMPLETA
                                .equals(a.getEstado())
                )
                .max(
                        Comparator.comparing(
                                Actividad::getFecha
                        )
                )
                .orElse(null);
    }

    // ==========================================
    // UTILIDADES PARA RECIBIR DATOS DE ANGULAR
    // ==========================================

    private int valorOZero(Integer valor) {
        return valor == null ? 0 : Math.max(0, valor);
    }

    private int leerEntero(
            Map<String, Object> datos,
            String campo,
            int valorPorDefecto
    ) {
        if (
                datos == null ||
                        !datos.containsKey(campo) ||
                        datos.get(campo) == null
        ) {
            return Math.max(0, valorPorDefecto);
        }

        Object valor = datos.get(campo);

        try {
            int resultado =
                    Integer.parseInt(valor.toString());

            if (resultado < 0) {
                throw new NumberFormatException();
            }

            return resultado;

        } catch (NumberFormatException ex) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "El campo " + campo +
                            " debe ser un entero no negativo"
            );
        }
    }

    private Long leerLong(Object valor) {
        if (valor == null) {
            return null;
        }

        try {
            return Long.parseLong(valor.toString());
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    // --- MÉTODOS DE SEGURIDAD REUTILIZADOS POR LOS ENDPOINTS ---
    private Usuario requerirUsuario(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Inicia sesión");
        }
        return usuarioRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED, "La cuenta autenticada ya no existe"));
    }

    private void requerirRRHH(Authentication authentication) {
        requerirUsuario(authentication);
        boolean esRRHH = authentication.getAuthorities().stream()
                .anyMatch(a -> "ROLE_RRHH".equals(a.getAuthority()));
        if (!esRRHH) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Solo RRHH puede consultar esta información");
        }
    }

    private Actividad obtenerActividadActualAutorizada(
            HttpSession session, Authentication authentication) {
        Usuario usuario = requerirUsuario(authentication);
        Object identificador = session.getAttribute("idActividadActual");
        if (!(identificador instanceof Long idActividad)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "No hay una pausa activa iniciada en esta sesión");
        }

        Actividad actividad = actividadRepository.findById(idActividad)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "La actividad no existe"));
        validarPropietario(actividad, usuario);
        return actividad;
    }

    private void validarPropietario(Actividad actividad, Usuario usuario) {
        if (actividad.getUsuario() == null ||
                !usuario.getId().equals(actividad.getUsuario().getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Esta actividad pertenece a otro usuario");
        }
    }

    private void comprobarEnProceso(Actividad actividad) {
        if (!Actividad.ESTADO_EN_PROCESO.equals(actividad.getEstado())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "La actividad ya no está en proceso");
        }
    }

    // ==========================================
    // TIEMPO ACUMULADO POR TRAMOS
    // ==========================================
    private int calcularSegundosTranscurridos(Actividad actividad, HttpSession session) {
        int acumulados = valorOZero(actividad.getSegundosTranscurridos());
        LocalDateTime inicioTramo = null;
        Object atributo = session.getAttribute(SESION_INICIO_TRAMO);
        if (atributo instanceof LocalDateTime fechaInicio) {
            inicioTramo = fechaInicio;
        }

        // Compatibilidad: ante una sesión antigua sin marcador, no sumar
        // arbitrariamente todo el tiempo desde que se creó la actividad.
        if (inicioTramo == null) {
            inicioTramo = actividad.getUltimaActualizacion();
        }
        if (inicioTramo == null) {
            inicioTramo = LocalDateTime.now();
        }

        long tramo = Math.max(0L, Duration.between(inicioTramo, LocalDateTime.now()).getSeconds());
        return (int) Math.min(Integer.MAX_VALUE, (long) acumulados + tramo);
    }

    private void limpiarSesionPausa(HttpSession session) {
        session.removeAttribute("idActividadActual");
        session.removeAttribute(SESION_INICIO_TRAMO);
    }

    // --- API PENDIENTES ---
    @GetMapping("/api/pendientes-hoy")
    @ResponseBody
    public List<Map<String, String>> obtenerPendientesApi(Authentication authentication) {
        requerirRRHH(authentication);
        LocalDateTime ahora = LocalDateTime.now();
        LocalDateTime inicioHoy = LocalDate.now().atStartOfDay();

        return usuarioRepository.findAll().stream()
                .filter(u -> "EMPLEADO".equals(u.getRol().getNombre()) || "RRHH".equals(u.getRol().getNombre()))
                .filter(u -> {
                    List<Actividad> actividadesHoy = actividadRepository.findByUsuarioIdAndFechaBetween(
                            u.getId(), inicioHoy, ahora);

                    if (actividadesHoy.isEmpty()) return true;

                    // Si hay una en proceso, no interrumpir
                    if (actividadesHoy.stream().anyMatch(a -> "EN_PROCESO".equals(a.getEstado()))) return false;

                    // Buscamos la última completada
                    Actividad ultima = actividadesHoy.stream()
                            .filter(a -> "COMPLETADA".equals(a.getEstado()))
                            .max(Comparator.comparing(Actividad::getFecha))
                            .orElse(null);

                    if (ultima == null) return true;

                    // --- LOGICA DE SIMULACIÓN PARA DEMO ---
                    // En lugar de 120 minutos, usamos 5 minutos para la muestra presencial
                    long minutosDesdeUltima = java.time.Duration.between(ultima.getFecha(), ahora).toMinutes();

                    return minutosDesdeUltima >= 5;
                })
                .map(u -> {
                    Map<String, String> data = new HashMap<>();
                    data.put("nombre", u.getNombre());
                    return data;
                }).collect(Collectors.toList());
    }

    @GetMapping("/pausas-incompletas")
    @ResponseBody
    public ResponseEntity<List<Map<String, Object>>> listarPausasIncompletas(
            Authentication authentication) {

        Usuario usuario = requerirUsuario(authentication);
        LocalDate hoy = LocalDate.now();

        List<Map<String, Object>> resultado =
                actividadRepository
                        .findByUsuarioIdAndFechaBetween(
                                usuario.getId(),
                                hoy.atStartOfDay(),
                                hoy.atTime(LocalTime.MAX)
                        )
                        .stream()
                        .filter(a ->
                                Actividad.ESTADO_INCOMPLETA.equals(a.getEstado())
                        )
                        .sorted(Comparator.comparing(
                                Actividad::getFecha
                        ).reversed())
                        .map(a -> {
                            Map<String, Object> pausa = new HashMap<>();
                            pausa.put("id", a.getId());
                            pausa.put("fecha", a.getFecha());
                            pausa.put("estado", a.getEstado());
                            pausa.put("indiceEjercicio",
                                    valorOZero(a.getIndiceEjercicio()));
                            pausa.put("indiceFase",
                                    valorOZero(a.getIndiceFase()));
                            pausa.put("tiempoRestante",
                                    valorOZero(a.getTiempoRestante()));
                            pausa.put("segundosTranscurridos",
                                    valorOZero(a.getSegundosTranscurridos()));
                            return pausa;
                        })
                        .toList();

        return ResponseEntity.ok(resultado);
    }
}
