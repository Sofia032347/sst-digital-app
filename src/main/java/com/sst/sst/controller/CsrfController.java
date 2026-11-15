package com.sst.sst.controller;

import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
public class CsrfController {

    // Entrega el token CSRF de la sesión actual.
    // Spring Security lo genera y valida.
    // No se desactiva ninguna protección.

    @GetMapping("/actividades/csrf")
    public Map<String, String> obtenerTokenCsrf(
            CsrfToken csrfToken
    ) {
        return Map.of(
                "headerName", csrfToken.getHeaderName(),
                "token", csrfToken.getToken()
        );
    }
}
