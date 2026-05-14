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

    // LISTAR TODOS LOS USUARIOS (Y enviar el formulario vacío para crear uno nuevo)
    @GetMapping
    public String listarUsuarios(Model model) {
        List<Usuario> lista = usuarioRepository.findAll();
        model.addAttribute("listaUsuarios", lista);

        model.addAttribute("nuevoUsuario", new Usuario());

        model.addAttribute("listaRoles", rolRepository.findAll());

        return "gestion-usuarios"; // Esto buscará el archivo gestion-usuarios.html
    }

    // CREAR UN NUEVO USUARIO
    @PostMapping("/guardar")
    public String guardarUsuario(@ModelAttribute("nuevoUsuario") Usuario usuario) {
        // Guarda el usuario en la BD
        usuarioRepository.save(usuario);

        // Redirige de nuevo a la lista para que se vea el nuevo empleado creado
        return "redirect:/usuarios";
    }
}