package com.sst.sst.controller;

import com.sst.sst.model.Usuario;
import com.sst.sst.repository.UsuarioRepository;
import jakarta.servlet.http.HttpSession;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PostMapping;

import java.util.Optional;

@Controller
public class LoginController {

    private final UsuarioRepository repository;

    public LoginController(UsuarioRepository repository) {
        this.repository = repository;
    }

    @GetMapping("/login")
    public String mostrarLogin(Model model, HttpSession session) {
        Usuario logueado = (Usuario) session.getAttribute("usuarioLogueado");
        if (logueado != null) {
            return logueado.getRol().getNombre().equals("RRHH")
                    ? "redirect:/actividades/rrhh"
                    : "redirect:/actividades/empleado";
        }

        model.addAttribute("usuario", new Usuario());
        return "login";
    }

    @PostMapping("/login")
    public String validarLogin(@ModelAttribute Usuario usuario, Model model, HttpSession session) {

        Optional<Usuario> user =
                repository.findByEmailAndPassword(
                        usuario.getEmail(),
                        usuario.getPassword());

        if (user.isPresent()) {
            Usuario usuarioLogueado = user.get();

            session.setAttribute("usuarioLogueado", usuarioLogueado);

            if (session.getAttribute("horaInicioSesion") == null) {
                session.setAttribute("horaInicioSesion", java.time.LocalDateTime.now());
            }

            if (usuarioLogueado.getRol().getNombre().equals("RRHH")) {
                return "redirect:/actividades/rrhh";
            } else {
                return "redirect:/actividades/empleado";
            }

        } else {
            model.addAttribute("error", "Usuario o contraseña errados, intente de nuevo");
            return "login";
        }
    }
}