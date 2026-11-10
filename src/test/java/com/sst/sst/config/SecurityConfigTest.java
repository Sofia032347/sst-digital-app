
package com.sst.sst.config;

import com.sst.sst.repository.UsuarioRepository;
import com.sst.sst.service.UsuarioDetailsService;

import org.junit.jupiter.api.Test;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.SpringBootConfiguration;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;

import org.springframework.context.annotation.Import;
import org.springframework.http.ResponseEntity;

import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.redirectedUrl;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.redirectedUrlPattern;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(
        controllers = SecurityConfigTest.TestEndpoints.class
)
@ContextConfiguration(
        classes = SecurityConfigTest.TestApplication.class
)
@Import({
        SecurityConfig.class,
        PasswordConfig.class,
        UsuarioDetailsService.class,
        SecurityConfigTest.TestEndpoints.class
})
class SecurityConfigTest {

    @Autowired
    private MockMvc mockMvc;

    // No se utiliza el repositorio real de MySQL.
    @MockitoBean
    private UsuarioRepository usuarioRepository;

    // ==========================================
    // CONFIGURACIÓN EXCLUSIVA DE PRUEBAS
    // ==========================================

    @SpringBootConfiguration
    static class TestApplication {
        // Evita utilizar la configuración principal
        // de SST Digital y cargar repositorios JPA.
    }

    // ==========================================
    // CONTROLADOR SIMULADO
    // ==========================================

    @RestController
    static class TestEndpoints {

        @GetMapping("/actividades/empleado")
        public ResponseEntity<String> empleado() {
            return ResponseEntity.ok("Panel empleado");
        }

        @GetMapping("/actividades/rrhh")
        public ResponseEntity<String> rrhh() {
            return ResponseEntity.ok("Panel RRHH");
        }

        @GetMapping("/actividades/estado-boton")
        public ResponseEntity<String> estadoBoton() {
            return ResponseEntity.ok("Disponible");
        }

        @PostMapping("/actividades/iniciar-pausa")
        public ResponseEntity<String> iniciarPausa() {
            return ResponseEntity.ok("Pausa iniciada");
        }

        @GetMapping("/api/empleado/resumen")
        public ResponseEntity<String> resumenEmpleado() {
            return ResponseEntity.ok("Resumen");
        }
    }

    // ==========================================
    // PRUEBA 1: SIN AUTENTICACIÓN
    // ==========================================

    @Test
    void debeRedirigirAlLoginSiNoEstaAutenticado()
            throws Exception {

        mockMvc.perform(
                        get("/actividades/empleado")
                )
                .andExpect(status().is3xxRedirection())
                .andExpect(
                        redirectedUrlPattern("**/login")
                );
    }

    // ==========================================
    // PRUEBA 2: EMPLEADO NO ACCEDE A RRHH
    // ==========================================

    @Test
    void debeBloquearDashboardRRHHParaEmpleado()
            throws Exception {

        mockMvc.perform(
                        get("/actividades/rrhh")
                                .with(
                                        user("empleado@sst.com")
                                                .roles("EMPLEADO")
                                )
                )
                .andExpect(status().isForbidden());
    }

    // ==========================================
    // PRUEBA 3: RRHH SÍ ACCEDE A SU PANEL
    // ==========================================

    @Test
    void debePermitirDashboardRRHHAUsuarioRRHH()
            throws Exception {

        mockMvc.perform(
                        get("/actividades/rrhh")
                                .with(
                                        user("rrhh@sst.com")
                                                .roles("RRHH")
                                )
                )
                .andExpect(status().isOk());
    }

    // ==========================================
    // PRUEBA 4: CONSULTA AUTORIZADA
    // ==========================================

    @Test
    void debePermitirConsultarEstadoBotonAEmpleado()
            throws Exception {

        mockMvc.perform(
                        get("/actividades/estado-boton")
                                .with(
                                        user("empleado@sst.com")
                                                .roles("EMPLEADO")
                                )
                )
                .andExpect(status().isOk());
    }

    // ==========================================
    // PRUEBA 5: POST SIN CSRF
    // ==========================================

    @Test
    void debeRechazarInicioDePausaSinCsrf()
            throws Exception {

        mockMvc.perform(
                        post("/actividades/iniciar-pausa")
                                .with(
                                        user("empleado@sst.com")
                                                .roles("EMPLEADO")
                                )
                )
                .andExpect(status().isForbidden());
    }

    // ==========================================
    // PRUEBA 6: POST CON CSRF
    // ==========================================

    @Test
    void debePermitirInicioDePausaConCsrf()
            throws Exception {

        mockMvc.perform(
                        post("/actividades/iniciar-pausa")
                                .with(
                                        user("empleado@sst.com")
                                                .roles("EMPLEADO")
                                )
                                .with(csrf())
                )
                .andExpect(status().isOk());
    }

    // ==========================================
    // PRUEBA 7: LOGOUT SIN CSRF
    // ==========================================

    @Test
    void debeRechazarLogoutSinCsrf()
            throws Exception {

        mockMvc.perform(
                        post("/logout")
                                .with(
                                        user("empleado@sst.com")
                                                .roles("EMPLEADO")
                                )
                )
                .andExpect(status().isForbidden());
    }

    // ==========================================
    // PRUEBA 8: LOGOUT CON CSRF
    // ==========================================

    @Test
    void debePermitirLogoutConCsrf()
            throws Exception {

        mockMvc.perform(
                        post("/logout")
                                .with(
                                        user("empleado@sst.com")
                                                .roles("EMPLEADO")
                                )
                                .with(csrf())
                )
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/index"));
    }

    // ==========================================
    // PRUEBA 9: API ANGULAR BLOQUEADA
    // ==========================================

    @Test
    void debeBloquearApiAngularTodaviaNoHabilitada()
            throws Exception {

        mockMvc.perform(
                        get("/api/empleado/resumen")
                                .with(
                                        user("empleado@sst.com")
                                                .roles("EMPLEADO")
                                )
                )
                .andExpect(status().isForbidden());
    }
}
