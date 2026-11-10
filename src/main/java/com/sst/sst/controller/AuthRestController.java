package com.sst.sst.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthRestController {

    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>> obtenerUsuarioActual(
            Authentication authentication) {

        // Verificar que exista un usuario autenticado.
        if (authentication == null
                || !authentication.isAuthenticated()
                || "anonymousUser".equals(authentication.getPrincipal())) {

            return ResponseEntity.status(401).build();
        }

        // Obtener el correo desde Spring Security.
        String email = authentication.getName();

        // Comprobar sus permisos.
        boolean esRRHH = authentication.getAuthorities()
                .contains(
                        new SimpleGrantedAuthority("ROLE_RRHH")
                );

        boolean esEmpleado = authentication.getAuthorities()
                .contains(
                        new SimpleGrantedAuthority("ROLE_EMPLEADO")
                );

        String rol;

        if (esRRHH) {
            rol = "RRHH";
        } else if (esEmpleado) {
            rol = "EMPLEADO";
        } else {
            return ResponseEntity.status(403).build();
        }

        // Construir la respuesta segura para Angular.
        Map<String, Object> respuesta = new HashMap<>();

        respuesta.put("autenticado", true);
        respuesta.put("email", email);
        respuesta.put("rol", rol);

        return ResponseEntity.ok(respuesta);
    }
}
