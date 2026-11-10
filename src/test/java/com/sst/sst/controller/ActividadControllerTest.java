
package com.sst.sst.controller;

import com.sst.sst.model.Actividad;
import com.sst.sst.model.Usuario;
import com.sst.sst.repository.ActividadRepository;
import com.sst.sst.repository.UsuarioRepository;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;

import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import org.springframework.ui.ExtendedModelMap;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ActividadControllerTest {

    private static final String CORREO =
            "empleado@prueba.local";

    @Mock
    private ActividadRepository actividadRepository;

    @Mock
    private UsuarioRepository usuarioRepository;

    @InjectMocks
    private ActividadController controller;

    // ------------------------------------------
    // MÉTODOS DE APOYO PARA LAS PRUEBAS
    // ------------------------------------------

    private Usuario crearUsuario(Long id, String email) {

        Usuario usuario = new Usuario();

        usuario.setId(id);
        usuario.setEmail(email);

        return usuario;
    }

    private Authentication crearAutenticacion(
            String email,
            String rol) {

        return new UsernamePasswordAuthenticationToken(
                email,
                null,
                List.of(
                        new SimpleGrantedAuthority("ROLE_" + rol)
                )
        );
    }

    private Actividad crearActividad(
            Long id,
            Usuario usuario,
            String estado,
            int minutosDesdeInicio) {

        Actividad actividad = new Actividad();

        actividad.setId(id);
        actividad.setUsuario(usuario);
        actividad.setEstado(estado);

        actividad.setFecha(
                LocalDateTime.now()
                        .minusMinutes(minutosDesdeInicio)
        );

        actividad.setDuracionSegundos(0);
        actividad.setEjerciciosCompletados(0);
        actividad.setValidadoIA(false);

        return actividad;
    }

    private void prepararActividad(
            Usuario usuario,
            Actividad actividad) {

        when(usuarioRepository.findByEmail(CORREO))
                .thenReturn(Optional.of(usuario));

        when(actividadRepository.findById(10L))
                .thenReturn(Optional.of(actividad));
    }

    // ------------------------------------------
    // PRUEBA 1: FINALIZAR CORRECTAMENTE
    // ------------------------------------------

    @Test
    void debeFinalizarPausaDespuesDeDiezMinutos() {

        Usuario usuario = crearUsuario(1L, CORREO);

        Actividad actividad = crearActividad(
                10L,
                usuario,
                Actividad.ESTADO_EN_PROCESO,
                11
        );

        prepararActividad(usuario, actividad);

        MockHttpSession session = new MockHttpSession();
        session.setAttribute("idActividadActual", 10L);

        ResponseEntity<String> respuesta =
                controller.finalizarPausa(
                        session,
                        crearAutenticacion(CORREO, "EMPLEADO")
                );

        assertEquals(
                HttpStatus.OK,
                respuesta.getStatusCode()
        );

        assertEquals(
                Actividad.ESTADO_COMPLETADA,
                actividad.getEstado()
        );

        assertTrue(
                actividad.getDuracionSegundos() >= 600
        );

        // No afirmar que la IA verificó los ejercicios.
        assertEquals(
                Boolean.FALSE,
                actividad.getValidadoIA()
        );

        assertEquals(
                0,
                actividad.getEjerciciosCompletados()
        );

        assertNull(
                session.getAttribute("idActividadActual")
        );

        verify(actividadRepository).save(actividad);
    }

    // ------------------------------------------
    // PRUEBA 2: NO FINALIZAR ANTES DE 10 MINUTOS
    // ------------------------------------------

    @Test
    void debeRechazarFinalizacionPrematura() {

        Usuario usuario = crearUsuario(1L, CORREO);

        Actividad actividad = crearActividad(
                10L,
                usuario,
                Actividad.ESTADO_EN_PROCESO,
                1
        );

        prepararActividad(usuario, actividad);

        MockHttpSession session = new MockHttpSession();
        session.setAttribute("idActividadActual", 10L);

        ResponseStatusException error =
                assertThrows(
                        ResponseStatusException.class,
                        () -> controller.finalizarPausa(
                                session,
                                crearAutenticacion(CORREO, "EMPLEADO")
                        )
                );

        assertEquals(
                HttpStatus.CONFLICT,
                error.getStatusCode()
        );

        verify(actividadRepository, never())
                .save(any(Actividad.class));
    }

    // ------------------------------------------
    // PRUEBA 3: IMPEDIR FINALIZAR PAUSAS AJENAS
    // ------------------------------------------

    @Test
    void debeRechazarActividadDeOtroUsuario() {

        Usuario usuarioAutenticado =
                crearUsuario(1L, CORREO);

        Usuario otroUsuario =
                crearUsuario(2L, "otro@prueba.local");

        Actividad actividad = crearActividad(
                10L,
                otroUsuario,
                Actividad.ESTADO_EN_PROCESO,
                11
        );

        when(usuarioRepository.findByEmail(CORREO))
                .thenReturn(Optional.of(usuarioAutenticado));

        when(actividadRepository.findById(10L))
                .thenReturn(Optional.of(actividad));

        MockHttpSession session = new MockHttpSession();
        session.setAttribute("idActividadActual", 10L);

        ResponseStatusException error =
                assertThrows(
                        ResponseStatusException.class,
                        () -> controller.finalizarPausa(
                                session,
                                crearAutenticacion(CORREO, "EMPLEADO")
                        )
                );

        assertEquals(
                HttpStatus.FORBIDDEN,
                error.getStatusCode()
        );

        verify(actividadRepository, never())
                .save(any(Actividad.class));
    }

    // ------------------------------------------
    // PRUEBA 4: NO FINALIZAR UNA ACTIVIDAD CANCELADA
    // ------------------------------------------

    @Test
    void debeRechazarActividadCancelada() {

        Usuario usuario = crearUsuario(1L, CORREO);

        Actividad actividad = crearActividad(
                10L,
                usuario,
                Actividad.ESTADO_CANCELADA,
                11
        );

        prepararActividad(usuario, actividad);

        MockHttpSession session = new MockHttpSession();
        session.setAttribute("idActividadActual", 10L);

        ResponseStatusException error =
                assertThrows(
                        ResponseStatusException.class,
                        () -> controller.finalizarPausa(
                                session,
                                crearAutenticacion(CORREO, "EMPLEADO")
                        )
                );

        assertEquals(
                HttpStatus.CONFLICT,
                error.getStatusCode()
        );

        verify(actividadRepository, never())
                .save(any(Actividad.class));
    }

    // ------------------------------------------
    // PRUEBA 5: MARCAR COMO INCOMPLETA
    // ------------------------------------------

    @Test
    void debeCancelarPausaComoIncompleta() {

        Usuario usuario = crearUsuario(1L, CORREO);

        Actividad actividad = crearActividad(
                10L,
                usuario,
                Actividad.ESTADO_EN_PROCESO,
                3
        );

        prepararActividad(usuario, actividad);

        MockHttpSession session = new MockHttpSession();
        session.setAttribute("idActividadActual", 10L);

        ResponseEntity<String> respuesta =
                controller.botonCancelarPausa(
                        session,
                        crearAutenticacion(CORREO, "EMPLEADO")
                );

        assertEquals(
                HttpStatus.OK,
                respuesta.getStatusCode()
        );

        assertEquals(
                Actividad.ESTADO_INCOMPLETA,
                actividad.getEstado()
        );

        assertTrue(
                actividad.getDuracionSegundos() >= 180
        );

        assertNull(
                session.getAttribute("idActividadActual")
        );

        verify(actividadRepository).save(actividad);
    }

    // ------------------------------------------
    // PRUEBA 6: MARCAR COMO CANCELADA
    // ------------------------------------------

    @Test
    void debeRegistrarAbandonoComoCancelada() {

        Usuario usuario = crearUsuario(1L, CORREO);

        Actividad actividad = crearActividad(
                10L,
                usuario,
                Actividad.ESTADO_EN_PROCESO,
                2
        );

        prepararActividad(usuario, actividad);

        MockHttpSession session = new MockHttpSession();
        session.setAttribute("idActividadActual", 10L);

        ResponseEntity<String> respuesta =
                controller.cancelarPausaForzada(
                        session,
                        crearAutenticacion(CORREO, "EMPLEADO")
                );

        assertEquals(
                HttpStatus.OK,
                respuesta.getStatusCode()
        );

        assertEquals(
                Actividad.ESTADO_CANCELADA,
                actividad.getEstado()
        );

        assertNull(
                session.getAttribute("idActividadActual")
        );

        verify(actividadRepository).save(actividad);
    }

    // ------------------------------------------
    // PRUEBA 7: BLOQUEAR ACCESO A RRHH
    // ------------------------------------------

    @Test
    void debeDenegarDashboardRRHHaEmpleado() {

        Usuario usuario = crearUsuario(1L, CORREO);

        when(usuarioRepository.findByEmail(CORREO))
                .thenReturn(Optional.of(usuario));

        ResponseStatusException error =
                assertThrows(
                        ResponseStatusException.class,
                        () -> controller.mostrarDashboard(
                                "dia",
                                null,
                                new ExtendedModelMap(),
                                new MockHttpSession(),
                                crearAutenticacion(CORREO, "EMPLEADO")
                        )
                );

        assertEquals(
                HttpStatus.FORBIDDEN,
                error.getStatusCode()
        );
    }

    // ------------------------------------------
    // PRUEBA 8: BLOQUEAR QUINTA PAUSA DIARIA
    // ------------------------------------------

    @Test
    void debeImpedirSuperarObjetivoDiario() {

        Usuario usuario = crearUsuario(1L, CORREO);

        when(usuarioRepository.findByEmail(CORREO))
                .thenReturn(Optional.of(usuario));

        List<Actividad> completadas = new java.util.ArrayList<>();

        for (int i = 0; i < 4; i++) {
            completadas.add(
                    crearActividad(
                            (long) (i + 1),
                            usuario,
                            Actividad.ESTADO_COMPLETADA,
                            20
                    )
            );
        }

        when(
                actividadRepository.findByUsuarioIdAndFechaBetween(
                        eq(1L),
                        any(LocalDateTime.class),
                        any(LocalDateTime.class)
                )
        ).thenReturn(completadas);

        ResponseStatusException error =
                assertThrows(
                        ResponseStatusException.class,
                        () -> controller.iniciarPausa(
                                new MockHttpSession(),
                                crearAutenticacion(CORREO, "EMPLEADO")
                        )
                );

        assertEquals(
                HttpStatus.CONFLICT,
                error.getStatusCode()
        );

        verify(actividadRepository, never())
                .save(any(Actividad.class));
    }
}
