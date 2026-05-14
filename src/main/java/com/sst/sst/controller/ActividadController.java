package com.sst.sst.controller;

import com.sst.sst.model.Actividad;
import com.sst.sst.model.Usuario;
import com.sst.sst.repository.ActividadRepository;
import com.sst.sst.repository.UsuarioRepository;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;


import java.io.IOException;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.stream.Collectors;

@Controller
@RequestMapping("/actividades")
public class ActividadController {

    @Autowired
    private ActividadRepository actividadRepository;

    @Autowired
    private UsuarioRepository usuarioRepository;

    @GetMapping("/dashboard")
    public String mostrarDashboard(@RequestParam(required = false) String filtro, Model model, HttpSession session) {
        // 1. Seguridad: Si no hay sesión, al login
        if (session.getAttribute("usuarioLogueado") == null) return "redirect:/login";

        // 2. Filtro de tiempo (Hoy por defecto)
        LocalDateTime inicio = LocalDateTime.now().with(LocalTime.MIN);
        if ("semana".equals(filtro)) inicio = LocalDateTime.now().minusWeeks(1);
        if ("mes".equals(filtro)) inicio = LocalDateTime.now().minusMonths(1);

        // 3. Obtener actividades para la tabla
        List<Actividad> actividades = actividadRepository.findByFechaBetween(inicio, LocalDateTime.now());
        model.addAttribute("listaActividades", actividades);

        // 4. LÓGICA DE ALERTAS: ¿Quién falta hoy?
        List<Usuario> pendientes = obtenerPendientesHoy(actividades);
        model.addAttribute("empleadosPendientes", pendientes);

        model.addAttribute("filtroActual", filtro != null ? filtro : "dia");

        return "rrhh/dashboard";
    }

    @GetMapping("/reporte")
    public String obtenerReporte(@RequestParam(value = "filtro", required = false) String filtro, Model model, HttpSession session) {
        // Security check
        if (session.getAttribute("usuarioLogueado") == null) return "redirect:/login";
        
        LocalDateTime fin = LocalDateTime.now();
        LocalDateTime inicio;
        if (filtro == null) filtro = "dia";

        switch (filtro.toLowerCase()) {
            case "semana": inicio = LocalDateTime.now().minusWeeks(1); break;
            case "mes": inicio = LocalDateTime.now().minusMonths(1); break;
            default: inicio = LocalDateTime.now().with(LocalTime.MIN); break;
        }

        List<Actividad> resultados = actividadRepository.findByFechaBetween(inicio, fin);

        // --- LÓGICA DE ALERTAS (Empleados que NO han hecho la pausa hoy) ---
        List<Usuario> todosLosEmpleados = usuarioRepository.findAll().stream()
                .filter(u -> u.getRol().getNombre().equals("EMPLEADO"))
                .collect(Collectors.toList());

        // Sacamos los IDs de los que sí cumplieron hoy
        List<Long> idsQueCumplieron = resultados.stream()
                .map(a -> a.getUsuario().getId())
                .collect(Collectors.toList());

        // Filtramos quiénes faltan
        List<Usuario> pendientes = todosLosEmpleados.stream()
                .filter(u -> !idsQueCumplieron.contains(u.getId()))
                .collect(Collectors.toList());

        model.addAttribute("listaActividades", resultados);
        model.addAttribute("empleadosPendientes", pendientes);
        model.addAttribute("filtroActual", filtro);

        return "rrhh/dashboard";
    }
    
    // NEW METHOD: Employee Dashboard
    @GetMapping("/empleado/dashboard")
    public String empleadoDashboard(HttpSession session, Model model) {
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
        
        return "empleado/dashboard";
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
    sb.append("ID,Empleado,Departamento,Fecha,Duracion(Seg),Ejercicios,ValidadoIA\n");

    // Fixed: changed from "toutes" to "todas"
    for (Actividad a : todas) {
        sb.append(a.getId()).append(",")
                .append(a.getUsuario().getNombre()).append(",")
                .append(a.getUsuario().getDepartamento()).append(",")
                .append(a.getFecha()).append(",")
                .append(a.getDuracionSegundos() != null ? a.getDuracionSegundos() : 0).append(",")
                .append(a.getEjerciciosCompletados() != null ? a.getEjerciciosCompletados() : 0).append(",")
                .append(a.getValidadoIA() != null ? a.getValidadoIA() : false).append("\n");
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
        return "empleado/pausa-activa";
    }
    

    @GetMapping("/finalizar-pausa")
    public String finalizarPausa(HttpSession session) {
        Usuario logueado = (Usuario) session.getAttribute("usuarioLogueado");
        if (logueado == null) {
            return "redirect:/login";
        }

        // Guardar la actividad
        Actividad nuevaActividad = new Actividad();
        nuevaActividad.setUsuario(logueado);
        nuevaActividad.setFecha(LocalDateTime.now());
        nuevaActividad.setDuracionSegundos(300); // 5 minutos
        nuevaActividad.setEjerciciosCompletados(10); // Todos los ejercicios
        nuevaActividad.setValidadoIA(true);
        actividadRepository.save(nuevaActividad);

        // Redirigir según el rol
        if ("RRHH".equals(logueado.getRol().getNombre())) {
            return "redirect:/actividades/dashboard";
        } else {
            return "redirect:/actividades/empleado/dashboard";
        }
    }
}