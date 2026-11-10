package com.sst.sst.controller;

import com.sst.sst.model.Usuario;
import com.sst.sst.repository.UsuarioRepository;
import com.sst.sst.repository.RolRepository;

import jakarta.servlet.http.HttpSession;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@Controller
@RequestMapping("/usuarios")
public class UsuarioController {

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private RolRepository rolRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    // NUEVO: verificar si el usuario pertenece a RRHH
    private boolean esRRHH(HttpSession session) {

        Usuario usuario =
                (Usuario) session.getAttribute("usuarioLogueado");

        return usuario != null
                && usuario.getRol() != null
                && "RRHH".equals(usuario.getRol().getNombre());
    }

    // LISTAR USUARIOS
    @GetMapping
    public String listarUsuarios(Model model, HttpSession session) {

        if (session.getAttribute("usuarioLogueado") == null) {
            return "redirect:/login";
        }

        if (!esRRHH(session)) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Acceso exclusivo para RRHH"
            );
        }

        model.addAttribute("listaUsuarios", usuarioRepository.findAll());
        model.addAttribute("nuevoUsuario", new Usuario());
        model.addAttribute("listaRoles", rolRepository.findAll());
        model.addAttribute("usuarioAEditar", new Usuario());

        return "rrhh/usuarios/usuario";
    }

    // GUARDAR USUARIO
    @PostMapping("/guardar")
    public String guardarUsuario(
            @ModelAttribute("nuevoUsuario") Usuario usuario,
            HttpSession session) {

        if (session.getAttribute("usuarioLogueado") == null) {
            return "redirect:/login";
        }

        if (!esRRHH(session)) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Acceso exclusivo para RRHH"
            );
        }

        // Cifrar la contraseña mediante BCrypt
        usuario.setPassword(
                passwordEncoder.encode(usuario.getPassword())
        );

        usuarioRepository.save(usuario);

        return "redirect:/usuarios";
    }

    // ELIMINAR USUARIO
    // NOTA: en el siguiente paso cambiaremos GET por POST.
    @GetMapping("/eliminar/{id}")
    public String eliminarUsuario(
            @PathVariable("id") Long id,
            HttpSession session) {

        if (session.getAttribute("usuarioLogueado") == null) {
            return "redirect:/login";
        }

        if (!esRRHH(session)) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Acceso exclusivo para RRHH"
            );
        }

        usuarioRepository.deleteById(id);

        return "redirect:/usuarios";
    }

    // MOSTRAR FORMULARIO DE EDICION
    @GetMapping("/editar/{id}")
    public String mostrarFormularioDeEditar(
            @PathVariable("id") Long id,
            Model model,
            HttpSession session) {

        if (session.getAttribute("usuarioLogueado") == null) {
            return "redirect:/login";
        }

        if (!esRRHH(session)) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Acceso exclusivo para RRHH"
            );
        }

        Usuario usuario =
                usuarioRepository.findById(id).orElse(null);

        model.addAttribute("usuarioAEditar", usuario);
        model.addAttribute("listaRoles", rolRepository.findAll());

        return "rrhh/usuarios/editar-usuario";
    }

    // ACTUALIZAR USUARIO
    @PostMapping("/actualizar/{id}")
    public String actualizarUsuario(
            @PathVariable("id") Long id,
            @ModelAttribute("usuarioAEditar") Usuario usuarioModificado,
            HttpSession session) {

        if (session.getAttribute("usuarioLogueado") == null) {
            return "redirect:/login";
        }

        if (!esRRHH(session)) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Acceso exclusivo para RRHH"
            );
        }

        Usuario usuarioExistente =
                usuarioRepository.findById(id).orElse(null);

        if (usuarioExistente != null) {

            usuarioExistente.setNombre(
                    usuarioModificado.getNombre()
            );

            usuarioExistente.setEmail(
                    usuarioModificado.getEmail()
            );

            usuarioExistente.setDepartamento(
                    usuarioModificado.getDepartamento()
            );

            usuarioExistente.setRol(
                    usuarioModificado.getRol()
            );

            // Solo modificar la contraseña si se ingresó una nueva
            if (usuarioModificado.getPassword() != null
                    && !usuarioModificado.getPassword().trim().isEmpty()) {

                usuarioExistente.setPassword(
                        passwordEncoder.encode(
                                usuarioModificado.getPassword()
                        )
                );
            }

            usuarioRepository.save(usuarioExistente);
        }

        return "redirect:/usuarios";
    }
}
