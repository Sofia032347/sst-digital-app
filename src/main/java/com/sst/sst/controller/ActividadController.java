package com.sst.sst.controller;

import com.sst.sst.model.Actividad;
import com.sst.sst.model.Usuario;
import com.sst.sst.repository.ActividadRepository;
import com.sst.sst.repository.UsuarioRepository;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;


import java.io.IOException;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Controller
@RequestMapping("/actividades")
public class ActividadController {

    @Autowired
    private ActividadRepository actividadRepository;

    @Autowired
    private UsuarioRepository usuarioRepository;

    @GetMapping("/rrhh")
    public String mostrarDashboard(@RequestParam(required = false) String filtro, Model model, HttpSession session) {
        // 1. Seguridad
        if (session.getAttribute("usuarioLogueado") == null) return "redirect:/login";

        // 2. Definir los tiempos base
        LocalDateTime ahora = LocalDateTime.now();
        LocalDateTime inicioHoy = ahora.with(LocalTime.MIN);

        // 3. Resolver el filtro para la TABLA
        LocalDateTime inicioTabla;
        String filtroReal = (filtro != null) ? filtro : "dia";

        if ("semana".equals(filtroReal)) {
            inicioTabla = ahora.minusWeeks(1);
        } else if ("mes".equals(filtroReal)) {
            inicioTabla = ahora.minusMonths(1);
        } else {
            inicioTabla = inicioHoy; // Por defecto: Hoy
        }

        // Buscar actividades para la TABLA usando el filtro
        List<Actividad> actividadesTabla = actividadRepository.findByFechaBetween(inicioTabla, ahora);

        // 4. LÓGICA DE ALERTAS: Siempre debe buscar usando "inicioHoy", sin importar el filtro de la tabla
        List<Actividad> actividadesEstrictamenteHoy = actividadRepository.findByFechaBetween(inicioHoy, ahora);
        List<Usuario> pendientes = obtenerPendientesHoy(actividadesEstrictamenteHoy);

        // 5. Enviar a la vista
        model.addAttribute("listaActividades", actividadesTabla);
        model.addAttribute("empleadosPendientes", pendientes);
        model.addAttribute("filtroActual", filtroReal);

        return "rrhh/rrhh";
    }

    @GetMapping("/reportes")
    public String verReportes(@RequestParam(value = "periodo", defaultValue = "HOY") String periodo, Model model) {

        LocalDateTime fechaInicio;
        LocalDateTime fechaFin;
        LocalDate hoy = LocalDate.now();

        // 1. Determinar fechas
        switch (periodo.toUpperCase()) {
            case "SEMANA":
                fechaInicio = hoy.with(DayOfWeek.MONDAY).atStartOfDay();
                fechaFin = hoy.with(DayOfWeek.SUNDAY).atTime(LocalTime.MAX);
                break;
            case "MES":
                fechaInicio = hoy.with(TemporalAdjusters.firstDayOfMonth()).atStartOfDay();
                fechaFin = hoy.with(TemporalAdjusters.lastDayOfMonth()).atTime(LocalTime.MAX);
                break;
            case "HOY":
            default:
                fechaInicio = hoy.atStartOfDay();
                fechaFin = hoy.atTime(LocalTime.MAX);
                periodo = "HOY";
                break;
        }

        // 2. Traer actividades del repositorio filtradas por fecha
        List<Actividad> actividadesBD = actividadRepository.findByFechaBetween(fechaInicio, fechaFin);
        List<Map<String, Object>> datosReporte = new ArrayList<>();

        if ("HOY".equals(periodo)) {
            // Reporte Diario: Una fila por cada vez que alguien hizo la pausa
            for (Actividad act : actividadesBD) {
                Map<String, Object> fila = new HashMap<>();
                fila.put("nombre", act.getUsuario().getNombre());

                // Asume que tienes getRol() y getNombre() en la entidad Rol. Ajusta si tu estructura de Rol es diferente.
                fila.put("rol", act.getUsuario().getRol().getNombre());

                // Usamos el nombre real de tu clase
                fila.put("tiempoTotal", act.getDuracionSegundos() != null ? act.getDuracionSegundos() : 0);
                fila.put("cantidadPausas", 1);
                fila.put("estado", act.getEstado()); // Útil para ver si la dejó INCOMPLETA hoy

                datosReporte.add(fila);
            }
        } else {
            // Reporte Semana/Mes: Agrupar por empleado y sumar
            Map<Usuario, List<Actividad>> agrupadoPorUsuario = actividadesBD.stream()
                    .collect(Collectors.groupingBy(Actividad::getUsuario));

            for (Map.Entry<Usuario, List<Actividad>> entrada : agrupadoPorUsuario.entrySet()) {
                Usuario usuario = entrada.getKey();
                List<Actividad> pausasDelUsuario = entrada.getValue();

                // Evitamos NullPointerExceptions en caso de que duracionSegundos sea null
                int sumaTiempo = pausasDelUsuario.stream()
                        .mapToInt(act -> act.getDuracionSegundos() != null ? act.getDuracionSegundos() : 0)
                        .sum();

                Map<String, Object> fila = new HashMap<>();
                fila.put("nombre", usuario.getNombre());
                fila.put("rol", usuario.getRol().getNombre());
                fila.put("tiempoTotal", sumaTiempo);
                fila.put("cantidadPausas", pausasDelUsuario.size());
                fila.put("estado", "N/A"); // En consolidado semanal no aplica un solo estado

                datosReporte.add(fila);
            }
        }

        model.addAttribute("datosReporte", datosReporte);
        model.addAttribute("periodo", periodo);

        return "rrhh/rrhh"; // Ajusta a tu vista
    }

    // NEW METHOD: Employee Dashboard
    @GetMapping("/empleado")
    public String
    Dashboard(HttpSession session, Model model) {
        Usuario logueado = (Usuario) session.getAttribute("usuarioLogueado");
        if (logueado == null) {
            return "redirect:/login";
        }

        // Get today's activities for this employee
        LocalDateTime inicio = LocalDateTime.now().with(LocalTime.MIN);
        List<Actividad> actividadesHoy = actividadRepository.findByUsuarioIdAndFechaBetween(
                logueado.getId(), inicio, LocalDateTime.now());

        model.addAttribute("empleado", logueado);
        model.addAttribute("actividadesHoy", actividadesHoy);
        model.addAttribute("totalActividades", actividadesHoy.size());
        model.addAttribute("pausaRealizadaHoy", !actividadesHoy.isEmpty());

        return "empleado/empleado";
    }

    private List<Usuario> obtenerPendientesHoy(List<Actividad> actividadesDeHoy) {
        // Sacamos IDs de los que ya cumplieron
        List<Long> completadosIds = actividadesDeHoy.stream()
                .map(a -> a.getUsuario().getId())
                .collect(Collectors.toList());

        // Retornamos los empleados que NO están en esa lista
        return usuarioRepository.findAll().stream()
                .filter(u -> u.getRol().getNombre().equals("EMPLEADO"))
                .filter(u -> !completadosIds.contains(u.getId()))
                .collect(Collectors.toList());
    }

    // --- DESCARGAR REPORTE CSV ---
    @GetMapping("/descargar")
    public void descargarCSV(HttpServletResponse response, HttpSession session) throws IOException {
        // Security check
        if (session.getAttribute("usuarioLogueado") == null) {
            response.sendRedirect("/login");
            return;
        }

        response.setContentType("text/csv");
        response.setHeader("Content-Disposition", "attachment; filename=reporte_pausas.csv");

        List<Actividad> todas = actividadRepository.findAll();

        StringBuilder sb = new StringBuilder();
        // 1. AGREGAMOS "Estado" AL FINAL DE LA CABECERA
        sb.append("ID,Empleado,Departamento,Fecha,Duracion(Seg),Ejercicios,ValidadoIA,Estado\n");

        for (Actividad a : todas) {
            sb.append(a.getId()).append(",")
                    .append(a.getUsuario().getNombre()).append(",")
                    .append(a.getUsuario().getDepartamento()).append(",")
                    .append(a.getFecha()).append(",")
                    .append(a.getDuracionSegundos() != null ? a.getDuracionSegundos() : 0).append(",")
                    .append(a.getEjerciciosCompletados() != null ? a.getEjerciciosCompletados() : 0).append(",")
                    .append(a.getValidadoIA() != null ? a.getValidadoIA() : false).append(",")
                    // 2. AGREGAMOS EL ESTADO AQUÍ
                    .append(a.getEstado() != null ? a.getEstado() : "DESCONOCIDO").append("\n");
        }

        response.getWriter().write(sb.toString());
    }

    @GetMapping("/pausa-activa")
    public String mostrarPausaActiva(HttpSession session, Model model) {
        Usuario logueado = (Usuario) session.getAttribute("usuarioLogueado");
        if (logueado == null) {
            return "redirect:/login";
        }

        model.addAttribute("empleado", logueado);
        return "pausa-activa";
    }


    // 1. ENDPOINT PARA INICIAR (Apenas el empleado da clic al botón de comenzar)
    @PostMapping("/iniciar-pausa")
    @ResponseBody
    public ResponseEntity<Long> iniciarPausa(HttpSession session) {
        Usuario logueado = (Usuario) session.getAttribute("usuarioLogueado");
        if (logueado == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        Actividad nuevaActividad = new Actividad();
        nuevaActividad.setUsuario(logueado);
        nuevaActividad.setDuracionSegundos(0);
        nuevaActividad.setEjerciciosCompletados(0);
        nuevaActividad.setValidadoIA(false);

        // NOTA: No seteamos ni Fecha ni Estado porque tu @PrePersist
        // se encarga de poner la fecha de hoy y "EN_PROCESO" automáticamente. ¡Genial!

        Actividad guardada = actividadRepository.save(nuevaActividad);

        // Guardamos el ID en la sesión para poder actualizar este mismo registro más adelante
        session.setAttribute("idActividadActual", guardada.getId());

        return ResponseEntity.ok(guardada.getId());
    }

    // 2. ENDPOINT PARA COMPLETAR (Tu método modificado)
    @GetMapping("/finalizar-pausa")
    public String finalizarPausa(HttpSession session) {
        Usuario logueado = (Usuario) session.getAttribute("usuarioLogueado");
        if (logueado == null) {
            return "redirect:/login";
        }

        // Recuperamos el ID de la actividad que abrimos al inicio
        Long idActividad = (Long) session.getAttribute("idActividadActual");

        if (idActividad != null) {
            Actividad actividadExistente = actividadRepository.findById(idActividad).orElse(null);

            if (actividadExistente != null) {
                actividadExistente.setDuracionSegundos(600); // 10 minutos (los 10 ejercicios ajustados)
                actividadExistente.setEjerciciosCompletados(10);
                actividadExistente.setValidadoIA(true);
                actividadExistente.setEstado(Actividad.ESTADO_COMPLETADA); // <-- Usamos tu constante "COMPLETADA"

                actividadRepository.save(actividadExistente);
            }
            session.removeAttribute("idActividadActual"); // Limpiamos la sesión
        }

        if ("RRHH".equals(logueado.getRol().getNombre())) {
            return "redirect:/actividades/rrhh";
        } else {
            return "redirect:/actividades/empleado";
        }
    }

    // 3. ENDPOINT PARA CANCELAR / DEJAR INCOMPLETA
    @PostMapping("/cancelar-pausa")
    @ResponseBody
    public ResponseEntity<String> cancelarPausa(@RequestParam("ejercicios") int ejerciciosCompletados, HttpSession session) {
        Long idActividad = (Long) session.getAttribute("idActividadActual");

        if (idActividad != null) {
            Actividad actividad = actividadRepository.findById(idActividad).orElse(null);
            if (actividad != null) {
                actividad.setEstado(Actividad.ESTADO_INCOMPLETA); // <-- Usamos tu constante "INCOMPLETA"
                actividad.setEjerciciosCompletados(ejerciciosCompletados);
                // Calculamos un estimado del tiempo (ej. 1 minuto por ejercicio realizado)
                actividad.setDuracionSegundos(ejerciciosCompletados * 60);
                actividad.setValidadoIA(ejerciciosCompletados > 0); // O true si quieres validar que al menos hizo algo

                actividadRepository.save(actividad);
            }
            session.removeAttribute("idActividadActual");
            return ResponseEntity.ok("Progreso incompleto guardado con éxito");
        }
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("No hay una pausa activa para cancelar");
    }
}