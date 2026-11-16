package com.sst.sst.controller;

import com.sst.sst.model.Usuario;
import com.sst.sst.repository.UsuarioRepository;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;


@RestController
@RequestMapping({
        "/api/empleado/perfil",
        "/api/rrhh/perfil"
})
public class PerfilController {

    private final UsuarioRepository usuarios;
    private final PasswordEncoder passwordEncoder;

    public PerfilController(
            UsuarioRepository usuarios,
            PasswordEncoder passwordEncoder
    ) {
        this.usuarios = usuarios;
        this.passwordEncoder = passwordEncoder;
    }

    // Datos que Angular puede recibir.
    // Nunca incluimos la contraseña.
    public record PerfilRespuesta(
            Long id,
            String nombre,
            String email,
            String departamento,
            String rol
    ) {
    }

    public record DepartamentoSolicitud(
            String departamento
    ) {
    }

    public record PasswordSolicitud(
            String passwordActual,
            String passwordNueva,
            String confirmarPassword
    ) {
    }

    private Usuario usuarioActual(HttpSession session) {

        Usuario sesion = (Usuario)
                session.getAttribute("usuarioLogueado");

        if (sesion == null || sesion.getId() == null) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Debes iniciar sesión"
            );
        }

        // Consultar siempre la versión actual de la BD.
        return usuarios.findById(sesion.getId())
                .orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "Usuario no encontrado"
                        )
                );
    }

    private PerfilRespuesta respuesta(Usuario usuario) {

        String rol = usuario.getRol() != null
                ? usuario.getRol().getNombre()
                : null;

        return new PerfilRespuesta(
                usuario.getId(),
                usuario.getNombre(),
                usuario.getEmail(),
                usuario.getDepartamento(),
                rol
        );
    }

    // ======================================
    // CONSULTAR MI PERFIL
    // ======================================

    @GetMapping
    @Transactional(readOnly = true)
    public PerfilRespuesta obtenerPerfil(
            HttpSession session
    ) {
        return respuesta(usuarioActual(session));
    }

    // ======================================
    // ACTUALIZAR MI DEPARTAMENTO
    // ======================================

    @PutMapping("/departamento")
    @Transactional
    public PerfilRespuesta actualizarDepartamento(
            @RequestBody DepartamentoSolicitud datos,
            HttpSession session
    ) {

        if (datos == null ||
                datos.departamento() == null ||
                datos.departamento().isBlank() ||
                datos.departamento().trim().length() > 100) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Ingresa un departamento válido (máximo 100 caracteres)"
            );
        }

        Usuario usuario = usuarioActual(session);

        usuario.setDepartamento(
                datos.departamento().trim()
        );

        usuarios.save(usuario);

        return respuesta(usuario);
    }

    // ======================================
    // CAMBIAR MI CONTRASEÑA
    // ======================================

    @PutMapping("/password")
    @Transactional
    public void cambiarPassword(
            @RequestBody PasswordSolicitud datos,
            HttpSession session
    ) {

        if (datos == null ||
                datos.passwordActual() == null ||
                datos.passwordNueva() == null ||
                datos.confirmarPassword() == null) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Completa todos los campos"
            );
        }

        Usuario usuario = usuarioActual(session);

        if (!passwordEncoder.matches(
                datos.passwordActual(),
                usuario.getPassword()
        )) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "La contraseña actual es incorrecta"
            );
        }

        if (datos.passwordNueva().length() < 8) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "La nueva contraseña debe tener al menos 8 caracteres"
            );
        }

        if (!datos.passwordNueva().equals(
                datos.confirmarPassword()
        )) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Las contraseñas nuevas no coinciden"
            );
        }

        if (passwordEncoder.matches(
                datos.passwordNueva(),
                usuario.getPassword()
        )) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "La nueva contraseña debe ser diferente a la actual"
            );
        }

        usuario.setPassword(
                passwordEncoder.encode(
                        datos.passwordNueva()
                )
        );

        usuarios.save(usuario);
    }
}