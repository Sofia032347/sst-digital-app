package com.sst.sst.controller;

import com.sst.sst.model.Usuario;

import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class LoginController {

    @GetMapping("/login")
    public String mostrarLogin(Model model) {

        Authentication authentication =
                SecurityContextHolder.getContext()
                        .getAuthentication();

        // Si ya inició sesión, enviarlo a su panel.
        if (authentication != null
                && authentication.isAuthenticated()
                && !(authentication instanceof AnonymousAuthenticationToken)) {

            boolean esRRHH = authentication.getAuthorities()
                    .stream()
                    .anyMatch(a ->
                            "ROLE_RRHH".equals(a.getAuthority())
                    );

            return esRRHH
                    ? "redirect:/actividades/rrhh"
                    : "redirect:/actividades/empleado";
        }

        model.addAttribute("usuario", new Usuario());

        return "login";
    }
}