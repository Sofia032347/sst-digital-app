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

    // --- DASHBOARD RRHH ---
    @GetMapping("/rrhh")
    public String mostrarDashboard(@RequestParam(required = false) String filtro, Model model, HttpSession session) {
        if (session.getAttribute("usuarioLogueado") == null) return "redirect:/login";

        LocalDateTime ahora = LocalDateTime.now();
        LocalDateTime inicioHoy = ahora.with(LocalTime.MIN);
        LocalDateTime inicioTabla;
        String filtroReal = (filtro != null) ? filtro : "dia";

        if ("semana".equals(filtroReal)) {
            inicioTabla = ahora.minusWeeks(1);
        } else if ("mes".equals(filtroReal)) {
            inicioTabla = ahora.minusMonths(1);
        } else {
            inicioTabla = inicioHoy;
        }

        List<Actividad> actividadesTabla = actividadRepository.findByFechaBetween(inicioTabla, ahora);
        List<Actividad> actividadesEstrictamenteHoy = actividadRepository.findByFechaBetween(inicioHoy, ahora);

        // Aquí se calculan los pendientes incluyendo a RRHH
        List<Usuario> pendientes = obtenerPendientesHoy(actividadesEstrictamenteHoy);

        model.addAttribute("listaActividades", actividadesTabla);
        model.addAttribute("empleadosPendientes", pendientes);
        model.addAttribute("filtroActual", filtroReal);

        return "rrhh/rrhh";
    }

    // --- REPORTES ---
    @GetMapping("/reportes")
    public String verReportes(@RequestParam(value = "periodo", defaultValue = "HOY") String periodo, Model model) {
        LocalDateTime fechaInicio;
        LocalDateTime fechaFin;
        LocalDate hoy = LocalDate.now();

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

        List<Actividad> actividadesBD = actividadRepository.findByFechaBetween(fechaInicio, fechaFin);
        List<Map<String, Object>> datosReporte = new ArrayList<>();

        if ("HOY".equals(periodo)) {
            for (Actividad act : actividadesBD) {
                Map<String, Object> fila = new HashMap<>();
                fila.put("nombre", act.getUsuario().getNombre());
                fila.put("rol", act.getUsuario().getRol().getNombre());
                fila.put("tiempoTotal", act.getDuracionSegundos() != null ? act.getDuracionSegundos() : 0);
                fila.put("cantidadPausas", 1);
                fila.put("estado", act.getEstado());
                datosReporte.add(fila);
            }
        } else {
            Map<Usuario, List<Actividad>> agrupadoPorUsuario = actividadesBD.stream()
                    .collect(Collectors.groupingBy(Actividad::getUsuario));

            for (Map.Entry<Usuario, List<Actividad>> entrada : agrupadoPorUsuario.entrySet()) {
                Usuario usuario = entrada.getKey();
                List<Actividad> pausasDelUsuario = entrada.getValue();
                int sumaTiempo = pausasDelUsuario.stream()
                        .mapToInt(act -> act.getDuracionSegundos() != null ? act.getDuracionSegundos() : 0)
                        .sum();

                Map<String, Object> fila = new HashMap<>();
                fila.put("nombre", usuario.getNombre());
                fila.put("rol", usuario.getRol().getNombre());
                fila.put("tiempoTotal", sumaTiempo);
                fila.put("cantidadPausas", pausasDelUsuario.size());
                fila.put("estado", "N/A");
                datosReporte.add(fila);
            }
        }

        model.addAttribute("datosReporte", datosReporte);
        model.addAttribute("periodo", periodo);

        return "rrhh/rrhh";
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
        model.addAttribute("pausaRealizadaHoy", actividadesHoy.stream().anyMatch(a -> "COMPLETADA".equals(a.getEstado())));

        return "empleado/empleado";
    }

    // --- ENDPOINT DE ESTADO PARA BLOQUEO DE BOTÓN ---
    @GetMapping("/estado-boton")
    @ResponseBody
    public Map<String, Object> verificarEstadoBoton(HttpSession session) {
        Usuario logueado = (Usuario) session.getAttribute("usuarioLogueado");
        Map<String, Object> respuesta = new HashMap<>();

        if (logueado == null) return respuesta;

        LocalDateTime inicioHoy = LocalDate.now().atStartOfDay();
        LocalDateTime finHoy = LocalDate.now().atTime(LocalTime.MAX);
        LocalDateTime horaLogin = (LocalDateTime) session.getAttribute("horaInicioSesion");

        long minutosTranscurridos = 0;
        if (horaLogin != null) {
            minutosTranscurridos = java.time.Duration.between(horaLogin, LocalDateTime.now()).toMinutes();
        }

        List<Actividad> actividadesHoy = actividadRepository.findByUsuarioIdAndFechaBetween(
                logueado.getId(), inicioHoy, finHoy);

        boolean yaCompleto = actividadesHoy.stream().anyMatch(a -> "COMPLETADA".equals(a.getEstado()));
        boolean tieneIncompleta = actividadesHoy.stream().anyMatch(a -> "INCOMPLETA".equals(a.getEstado()));

        String estado;
        if (yaCompleto) {
            estado = "BLOQUEADO_COMPLETO";
        } else if (tieneIncompleta) {
            estado = "REANUDAR";
        } else if (minutosTranscurridos >= 5) {
            estado = "DISPONIBLE";
        } else {
            estado = "ESPERANDO";
            respuesta.put("faltan", 5 - minutosTranscurridos);
        }

        respuesta.put("estado", estado);
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

    // --- DESCARGAR REPORTE CSV ---
    @GetMapping("/descargar")
    public void descargarCSV(HttpServletResponse response, HttpSession session) throws IOException {
        if (session.getAttribute("usuarioLogueado") == null) {
            response.sendRedirect("/login");
            return;
        }

        response.setContentType("text/csv");
        response.setHeader("Content-Disposition", "attachment; filename=reporte_pausas.csv");

        List<Actividad> todas = actividadRepository.findAll();
        StringBuilder sb = new StringBuilder();
        sb.append("ID,Empleado,Departamento,Fecha,Duracion(Seg),Ejercicios,ValidadoIA,Estado\n");

        for (Actividad a : todas) {
            sb.append(a.getId()).append(",")
                    .append(a.getUsuario().getNombre()).append(",")
                    .append(a.getUsuario().getDepartamento()).append(",")
                    .append(a.getFecha()).append(",")
                    .append(a.getDuracionSegundos() != null ? a.getDuracionSegundos() : 0).append(",")
                    .append(a.getEjerciciosCompletados() != null ? a.getEjerciciosCompletados() : 0).append(",")
                    .append(a.getValidadoIA() != null ? a.getValidadoIA() : false).append(",")
                    .append(a.getEstado() != null ? a.getEstado() : "DESCONOCIDO").append("\n");
        }

        response.getWriter().write(sb.toString());
    }

    // --- VISTA PAUSA ACTIVA ---
    @GetMapping("/pausa-activa")
    public String mostrarPausaActiva(HttpSession session, Model model) {
        Usuario logueado = (Usuario) session.getAttribute("usuarioLogueado");
        if (logueado == null) return "redirect:/login";

        model.addAttribute("empleado", logueado);
        return "pausa-activa";
    }

    // --- INICIAR PAUSA ---
    @PostMapping("/iniciar-pausa")
    @ResponseBody
    public ResponseEntity<Long> iniciarPausa(HttpSession session) {
        Usuario logueado = (Usuario) session.getAttribute("usuarioLogueado");
        if (logueado == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        Actividad nuevaActividad = new Actividad();
        nuevaActividad.setUsuario(logueado);
        nuevaActividad.setDuracionSegundos(0);
        nuevaActividad.setEjerciciosCompletados(0);
        nuevaActividad.setValidadoIA(false);
        nuevaActividad.setEstado(Actividad.ESTADO_EN_PROCESO);

        Actividad guardada = actividadRepository.save(nuevaActividad);
        session.setAttribute("idActividadActual", guardada.getId());

        return ResponseEntity.ok(guardada.getId());
    }

    // --- FINALIZAR PAUSA (COMPLETADA) ---
    @GetMapping("/finalizar-pausa")
    public String finalizarPausa(HttpSession session) {
        Usuario logueado = (Usuario) session.getAttribute("usuarioLogueado");
        if (logueado == null) return "redirect:/login";

        Long idActividad = (Long) session.getAttribute("idActividadActual");

        if (idActividad != null) {
            Actividad actividadExistente = actividadRepository.findById(idActividad).orElse(null);
            if (actividadExistente != null) {
                actividadExistente.setDuracionSegundos(600);
                actividadExistente.setEjerciciosCompletados(10);
                actividadExistente.setValidadoIA(true);
                actividadExistente.setEstado(Actividad.ESTADO_COMPLETADA);
                actividadRepository.save(actividadExistente);
            }
            session.removeAttribute("idActividadActual");
        }

        return "RRHH".equals(logueado.getRol().getNombre()) ? "redirect:/actividades/rrhh" : "redirect:/actividades/empleado";
    }

    // --- CANCELAR PAUSA (BOTÓN CANCELAR - INCOMPLETA) ---
    @PostMapping("/boton-cancelar")
    @ResponseBody
    public ResponseEntity<String> botonCancelarPausa(HttpSession session) {
        Long idActividad = (Long) session.getAttribute("idActividadActual");

        if (idActividad != null) {
            Actividad actividad = actividadRepository.findById(idActividad).orElse(null);
            if (actividad != null) {
                actividad.setEstado(Actividad.ESTADO_INCOMPLETA);
                if (actividad.getFecha() != null) {
                    long segundos = java.time.Duration.between(actividad.getFecha(), java.time.LocalDateTime.now()).getSeconds();
                    actividad.setDuracionSegundos((int) segundos);
                }
                actividadRepository.save(actividad);
            }
            session.removeAttribute("idActividadActual");
            return ResponseEntity.ok("Registrada como INCOMPLETA");
        }
        return ResponseEntity.badRequest().build();
    }

    // --- SALIDA FORZADA (LOGOUT/VOLVER - CANCELADA) ---
    @PostMapping("/cancelar-pausa")
    @ResponseBody
    public ResponseEntity<String> cancelarPausaForzada(HttpSession session) {
        Long idActividad = (Long) session.getAttribute("idActividadActual");
        if (idActividad != null) {
            Actividad actividad = actividadRepository.findById(idActividad).orElse(null);
            if (actividad != null) {
                actividad.setEstado(Actividad.ESTADO_CANCELADA);
                actividadRepository.save(actividad);
            }
            session.removeAttribute("idActividadActual");
        }
        return ResponseEntity.ok("Registrada como CANCELADA");
    }

    // --- API PENDIENTES (CORREGIDA: INCLUYE RRHH) ---
    @GetMapping("/api/pendientes-hoy")
    @ResponseBody
    public List<Map<String, String>> obtenerPendientesApi() {
        LocalDateTime inicioHoy = LocalDate.now().atStartOfDay();
        LocalDateTime finHoy = LocalDate.now().atTime(LocalTime.MAX);

        List<Long> yaHicieronPausa = actividadRepository.findByFechaBetween(inicioHoy, finHoy).stream()
                .filter(a -> "COMPLETADA".equals(a.getEstado()) || "EN_PROCESO".equals(a.getEstado()))
                .map(a -> a.getUsuario().getId())
                .collect(Collectors.toList());

        return usuarioRepository.findAll().stream()
                .filter(u -> "EMPLEADO".equals(u.getRol().getNombre()) || "RRHH".equals(u.getRol().getNombre()))
                .filter(u -> !yaHicieronPausa.contains(u.getId()))
                .map(u -> {
                    Map<String, String> data = new HashMap<>();
                    data.put("nombre", u.getNombre());
                    data.put("departamento", u.getDepartamento());
                    return data;
                }).collect(Collectors.toList());
    }
}