package com.sst.sst.controller;

import com.sst.sst.model.Usuario;
import com.sst.sst.repository.UsuarioRepository;
import com.sst.sst.repository.RolRepository;
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
    public String listarUsuarios(Model model) {
        model.addAttribute("listaUsuarios", usuarioRepository.findAll());
        model.addAttribute("nuevoUsuario", new Usuario());
        model.addAttribute("listaRoles", rolRepository.findAll());

        // Aquí SÍ va el usuario vacío para que no falle la vista principal
        model.addAttribute("usuarioAEditar", new Usuario());

        // CORREGIDO: Se quitó el "/" del inicio
        return "rrhh/usuarios/usuario";
    }

    @PostMapping("/guardar")
    public String guardarUsuario(@ModelAttribute("nuevoUsuario") Usuario usuario) {
        usuarioRepository.save(usuario);
        return "redirect:/usuarios";
    }

    @GetMapping("/eliminar/{id}")
    public String eliminarUsuario(@PathVariable("id") Long id) {
        usuarioRepository.deleteById(id);
        return "redirect:/usuarios";
    }

    @GetMapping("/editar/{id}")
    public String mostrarFormularioDeEditar(@PathVariable("id") Long id, Model model) {
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
    public String actualizarUsuario(@PathVariable("id") Long id, @ModelAttribute("usuarioAEditar") Usuario usuarioModificado) {

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