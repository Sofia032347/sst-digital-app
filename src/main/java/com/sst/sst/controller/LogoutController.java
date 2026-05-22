package com.sst.sst.controller;

import jakarta.servlet.http.HttpSession;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class LogoutController {

    @GetMapping("/logout")
    public String cerrarSesion(HttpSession session) {
        session.invalidate();

        return "redirect:/";
    }
}