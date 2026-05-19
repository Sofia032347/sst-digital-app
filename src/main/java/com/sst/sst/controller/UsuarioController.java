package com.sst.sst.controller;

import com.sst.sst.model.Usuario;
import com.sst.sst.repository.UsuarioRepository;
import com.sst.sst.repository.RolRepository;
import jakarta.servlet.http.HttpSession; // <-- IMPORTANTE: Importación de la sesión
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Controller
@RequestMapping("/usuarios")
public class UsuarioController {

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private RolRepository rolRepository;

    @GetMapping
    public String listarUsuarios(Model model, HttpSession session) {
        // --- SEGURIDAD ---
        if (session.getAttribute("usuarioLogueado") == null) return "redirect:/login";

        model.addAttribute("listaUsuarios", usuarioRepository.findAll());
        model.addAttribute("nuevoUsuario", new Usuario());
        model.addAttribute("listaRoles", rolRepository.findAll());

        model.addAttribute("usuarioAEditar", new Usuario());

        return "rrhh/usuarios/usuario";
    }

    @PostMapping("/guardar")
    public String guardarUsuario(@ModelAttribute("nuevoUsuario") Usuario usuario, HttpSession session) {
        // --- SEGURIDAD ---
        if (session.getAttribute("usuarioLogueado") == null) return "redirect:/login";

        usuarioRepository.save(usuario);
        return "redirect:/usuarios";
    }

    @GetMapping("/eliminar/{id}")
    public String eliminarUsuario(@PathVariable("id") Long id, HttpSession session) {
        // --- SEGURIDAD ---
        if (session.getAttribute("usuarioLogueado") == null) return "redirect:/login";

        usuarioRepository.deleteById(id);
        return "redirect:/usuarios";
    }

    @GetMapping("/editar/{id}")
    public String mostrarFormularioDeEditar(@PathVariable("id") Long id, Model model, HttpSession session) {
        // --- SEGURIDAD ---
        if (session.getAttribute("usuarioLogueado") == null) return "redirect:/login";

        // 1. Buscamos al usuario real
        Usuario usuario = usuarioRepository.findById(id).orElse(null);

        // 2. Lo pasamos al modelo para que el formulario lo muestre lleno
        model.addAttribute("usuarioAEditar", usuario);
        model.addAttribute("listaRoles", rolRepository.findAll());

        // CORREGIDO: Eliminé la línea que sobreescribía al usuario con uno vacío (new Usuario())

        // CORREGIDO: Se quitó el "/" del inicio
        return "rrhh/usuarios/editar-usuario";
    }

    @PostMapping("/actualizar/{id}")
    public String actualizarUsuario(@PathVariable("id") Long id, @ModelAttribute("usuarioAEditar") Usuario usuarioModificado, HttpSession session) {
        // --- SEGURIDAD ---
        if (session.getAttribute("usuarioLogueado") == null) return "redirect:/login";

        Usuario usuarioExistente = usuarioRepository.findById(id).orElse(null);

        if (usuarioExistente != null) {
            usuarioExistente.setNombre(usuarioModificado.getNombre());
            usuarioExistente.setEmail(usuarioModificado.getEmail());
            usuarioExistente.setDepartamento(usuarioModificado.getDepartamento());
            usuarioExistente.setRol(usuarioModificado.getRol());

            if (usuarioModificado.getPassword() != null && !usuarioModificado.getPassword().trim().isEmpty()) {
                usuarioExistente.setPassword(usuarioModificado.getPassword());
            }

            usuarioRepository.save(usuarioExistente);
        }

        return "redirect:/usuarios";
    }
}