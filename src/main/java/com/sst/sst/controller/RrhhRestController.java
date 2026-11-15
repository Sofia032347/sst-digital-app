
package com.sst.sst.controller;

import com.sst.sst.model.Actividad;
import com.sst.sst.model.Rol;
import com.sst.sst.model.Usuario;

import com.sst.sst.repository.ActividadRepository;
import com.sst.sst.repository.RegistroAccesoRepository;
import com.sst.sst.repository.RolRepository;
import com.sst.sst.repository.UsuarioRepository;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;

@RestController
@RequestMapping("/api/rrhh")
public class RrhhRestController {

    private final UsuarioRepository usuarioRepository;
    private final RolRepository rolRepository;
    private final ActividadRepository actividadRepository;
    private final RegistroAccesoRepository registroAccesoRepository;
    private final PasswordEncoder passwordEncoder;

    @PersistenceContext
    private EntityManager entityManager;

    public RrhhRestController(
            UsuarioRepository usuarioRepository,
            RolRepository rolRepository,
            ActividadRepository actividadRepository,
            RegistroAccesoRepository registroAccesoRepository,
            PasswordEncoder passwordEncoder
    ) {
        this.usuarioRepository = usuarioRepository;
        this.rolRepository = rolRepository;
        this.actividadRepository = actividadRepository;
        this.registroAccesoRepository = registroAccesoRepository;
        this.passwordEncoder = passwordEncoder;
    }

    // =========================================
    // DTO: EMPLEADO SIN CONTRASEÑA
    // =========================================

    public record EmpleadoDto(
            Long id,
            String nombre,
            String email,
            String departamento,
            String rol
    ) {}

    public record GuardarEmpleadoDto(
            String nombre,
            String email,
            String departamento,
            String rol,
            String password
    ) {}

    public record ResumenRrhhDto(
            long totalEmpleados,
            long pausasCompletadas,
            long pausasIncompletas,
            long pausasCanceladas,
            long pausasEnProceso
    ) {}

    public record ActividadDto(
            Long id,
            Long usuarioId,
            String empleado,
            String email,
            LocalDateTime fecha,
            String estado,
            int segundosRealizados,
            int porcentaje
    ) {}

    // =========================================
    // SEGURIDAD: SOLO RRHH
    // =========================================

    private void exigirRrhh(
            Authentication authentication
    ) {

        if (
                authentication == null ||
                        !authentication.isAuthenticated() ||
                        "anonymousUser".equals(
                                authentication.getPrincipal()
                        )
        ) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Debes iniciar sesión"
            );
        }

        boolean permitido = authentication
                .getAuthorities()
                .contains(
                        new SimpleGrantedAuthority(
                                "ROLE_RRHH"
                        )
                );

        if (!permitido) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Acceso exclusivo de Recursos Humanos"
            );
        }
    }

    // =========================================
    // VALIDACIONES
    // =========================================

    private String textoObligatorio(
            String valor,
            String campo,
            int maximo
    ) {

        if (
                valor == null ||
                        valor.trim().isEmpty()
        ) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    campo + " es obligatorio"
            );
        }

        String texto = valor.trim();

        if (texto.length() > maximo) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    campo + " supera el límite permitido"
            );
        }

        return texto;
    }

    private String validarEmail(String email) {

        String limpio = textoObligatorio(
                email,
                "El correo",
                254
        ).toLowerCase(Locale.ROOT);

        if (
                !limpio.matches(
                        "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$"
                )
        ) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Correo electrónico inválido"
            );
        }

        return limpio;
    }

    private Rol buscarRol(String nombreRol) {

        String nombre = textoObligatorio(
                nombreRol,
                "El rol",
                30
        ).toUpperCase(Locale.ROOT);

        if (
                !nombre.equals("EMPLEADO") &&
                        !nombre.equals("RRHH")
        ) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Rol no permitido"
            );
        }

        return rolRepository.findByNombre(nombre)
                .orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.CONFLICT,
                                "El rol no existe en la base de datos"
                        )
                );
    }

    // =========================================
    // CONVERTIR USUARIO A DTO
    // =========================================

    private EmpleadoDto convertirEmpleado(
            Usuario usuario
    ) {

        return new EmpleadoDto(
                usuario.getId(),
                usuario.getNombre(),
                usuario.getEmail(),
                usuario.getDepartamento(),
                usuario.getRol() == null
                        ? ""
                        : usuario.getRol().getNombre()
        );
    }

    // =========================================
    // CONVERTIR ACTIVIDAD A DTO
    // =========================================

    private ActividadDto convertirActividad(
            Actividad actividad
    ) {

        Usuario usuario = actividad.getUsuario();

        int segundos = Math.max(
                0,
                actividad.getDuracionSegundos() == null
                        ? 0
                        : actividad.getDuracionSegundos()
        );

        int porcentaje = (int) Math.min(
                100,
                segundos * 100L / 600
        );

        return new ActividadDto(
                actividad.getId(),
                usuario == null
                        ? null
                        : usuario.getId(),
                usuario == null
                        ? ""
                        : usuario.getNombre(),
                usuario == null
                        ? ""
                        : usuario.getEmail(),
                actividad.getFecha(),
                actividad.getEstado(),
                segundos,
                porcentaje
        );
    }

    // =========================================
    // GET /api/rrhh/resumen
    // =========================================

    @GetMapping("/resumen")
    public ResponseEntity<ResumenRrhhDto> resumen(
            Authentication authentication
    ) {

        exigirRrhh(authentication);

        LocalDate hoy = LocalDate.now();

        List<Actividad> actividades =
                actividadRepository.findByFechaBetween(
                        hoy.atStartOfDay(),
                        hoy.atTime(LocalTime.MAX)
                );

        long completadas = actividades.stream()
                .filter(a ->
                        Actividad.ESTADO_COMPLETADA.equals(
                                a.getEstado()
                        )
                )
                .count();

        long incompletas = actividades.stream()
                .filter(a ->
                        Actividad.ESTADO_INCOMPLETA.equals(
                                a.getEstado()
                        )
                )
                .count();

        long canceladas = actividades.stream()
                .filter(a ->
                        Actividad.ESTADO_CANCELADA.equals(
                                a.getEstado()
                        )
                )
                .count();

        long enProceso = actividades.stream()
                .filter(a ->
                        Actividad.ESTADO_EN_PROCESO.equals(
                                a.getEstado()
                        )
                )
                .count();

        return ResponseEntity.ok(
                new ResumenRrhhDto(
                        usuarioRepository.count(),
                        completadas,
                        incompletas,
                        canceladas,
                        enProceso
                )
        );
    }

    // =========================================
    // GET /api/rrhh/empleados
    // =========================================

    @GetMapping("/empleados")
    public ResponseEntity<List<EmpleadoDto>>
    listarEmpleados(
            Authentication authentication
    ) {

        exigirRrhh(authentication);

        List<EmpleadoDto> empleados =
                usuarioRepository.findAll()
                        .stream()
                        .sorted(
                                Comparator.comparing(
                                        Usuario::getNombre,
                                        Comparator.nullsLast(
                                                String.CASE_INSENSITIVE_ORDER
                                        )
                                )
                        )
                        .map(this::convertirEmpleado)
                        .toList();

        return ResponseEntity.ok(empleados);
    }

    // =========================================
    // GET /api/rrhh/empleados/{id}
    // =========================================

    @GetMapping("/empleados/{id}")
    public ResponseEntity<EmpleadoDto> obtenerEmpleado(
            @PathVariable Long id,
            Authentication authentication
    ) {

        exigirRrhh(authentication);

        Usuario usuario = usuarioRepository
                .findById(id)
                .orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "Empleado no encontrado"
                        )
                );

        return ResponseEntity.ok(
                convertirEmpleado(usuario)
        );
    }

    // =========================================
    // POST /api/rrhh/empleados
    // CREAR USUARIO
    // =========================================

    @PostMapping("/empleados")
    @Transactional
    public ResponseEntity<EmpleadoDto> crearEmpleado(
            @RequestBody GuardarEmpleadoDto datos,
            Authentication authentication
    ) {

        exigirRrhh(authentication);

        String nombre = textoObligatorio(
                datos.nombre(),
                "El nombre",
                150
        );

        String email = validarEmail(datos.email());

        String departamento = textoObligatorio(
                datos.departamento(),
                "El departamento",
                100
        );

        String password = textoObligatorio(
                datos.password(),
                "La contraseña",
                200
        );

        if (password.length() < 8) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "La contraseña debe tener mínimo 8 caracteres"
            );
        }

        if (
                usuarioRepository.findByEmail(email)
                        .isPresent()
        ) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Ya existe un usuario con ese correo"
            );
        }

        Rol rol = buscarRol(datos.rol());

        Usuario usuario = new Usuario();

        usuario.setNombre(nombre);
        usuario.setEmail(email);
        usuario.setDepartamento(departamento);
        usuario.setRol(rol);

        // Guardar contraseña cifrada.
        usuario.setPassword(
                passwordEncoder.encode(password)
        );

        Usuario creado =
                usuarioRepository.save(usuario);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(convertirEmpleado(creado));
    }

    // =========================================
    // PUT /api/rrhh/empleados/{id}
    // ACTUALIZAR USUARIO
    // =========================================

    @PutMapping("/empleados/{id}")
    @Transactional
    public ResponseEntity<EmpleadoDto> editarEmpleado(
            @PathVariable Long id,
            @RequestBody GuardarEmpleadoDto datos,
            Authentication authentication
    ) {

        exigirRrhh(authentication);

        Usuario usuario = usuarioRepository
                .findById(id)
                .orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "Empleado no encontrado"
                        )
                );

        String nombre = textoObligatorio(
                datos.nombre(),
                "El nombre",
                150
        );

        String email = validarEmail(datos.email());

        String departamento = textoObligatorio(
                datos.departamento(),
                "El departamento",
                100
        );

        usuarioRepository.findByEmail(email)
                .ifPresent(existente -> {
                    if (!existente.getId().equals(id)) {
                        throw new ResponseStatusException(
                                HttpStatus.CONFLICT,
                                "El correo ya pertenece a otro usuario"
                        );
                    }
                });

        Rol rol = buscarRol(datos.rol());

        // No permitir quitarse el propio rol RRHH.
        if (
                usuario.getEmail().equalsIgnoreCase(
                        authentication.getName()
                ) &&
                        !"RRHH".equals(rol.getNombre())
        ) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "No puedes quitarte tu propio rol de RRHH"
            );
        }

        usuario.setNombre(nombre);
        usuario.setEmail(email);
        usuario.setDepartamento(departamento);
        usuario.setRol(rol);

        // Contraseña opcional al editar.
        if (
                datos.password() != null &&
                        !datos.password().isBlank()
        ) {

            if (datos.password().length() < 8) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "La nueva contraseña debe tener mínimo 8 caracteres"
                );
            }

            usuario.setPassword(
                    passwordEncoder.encode(
                            datos.password()
                    )
            );
        }

        Usuario actualizado =
                usuarioRepository.save(usuario);

        return ResponseEntity.ok(
                convertirEmpleado(actualizado)
        );
    }

    // =========================================
    // DELETE /api/rrhh/empleados/{id}
    // ELIMINAR SOLO SI NO TIENE HISTORIAL
    // =========================================

    @DeleteMapping("/empleados/{id}")
    @Transactional
    public ResponseEntity<Void> eliminarEmpleado(
            @PathVariable Long id,
            Authentication authentication
    ) {

        exigirRrhh(authentication);

        Usuario usuario = usuarioRepository
                .findById(id)
                .orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "Usuario no encontrado"
                        )
                );

        // No permitir borrar la propia cuenta.
        if (
                usuario.getEmail() != null &&
                        usuario.getEmail().equalsIgnoreCase(
                                authentication.getName()
                        )
        ) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "No puedes eliminar tu propia cuenta"
            );
        }

        // Proteger la última cuenta RRHH.
        boolean esRrhh =
                usuario.getRol() != null &&
                        "RRHH".equalsIgnoreCase(
                                usuario.getRol().getNombre()
                        );

        if (esRrhh) {

            long cantidadRrhh =
                    usuarioRepository.findAll()
                            .stream()
                            .filter(u ->
                                    u.getRol() != null &&
                                            "RRHH".equalsIgnoreCase(
                                                    u.getRol().getNombre()
                                            )
                            )
                            .count();

            if (cantidadRrhh <= 1) {
                throw new ResponseStatusException(
                        HttpStatus.CONFLICT,
                        "No puedes eliminar la última cuenta de RRHH"
                );
            }
        }

        // Proteger historial de pausas.
        if (
                actividadRepository.existsByUsuarioId(id)
        ) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "El usuario tiene historial de pausas. " +
                            "No se puede eliminar."
            );
        }

        // Proteger registros de acceso.
        if (
                registroAccesoRepository
                        .existsByUsuarioId(id)
        ) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "El usuario tiene registros de acceso. " +
                            "No se puede eliminar."
            );
        }

        // Eliminar usuario.
        try {

            usuarioRepository.delete(usuario);

            // Comprobar restricciones de claves
            // foráneas antes de responder.
            entityManager.flush();

        } catch (DataIntegrityViolationException ex) {

            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "El usuario tiene otros registros relacionados. " +
                            "No se puede eliminar.",
                    ex
            );
        }

        return ResponseEntity.noContent().build();
    }

    // =========================================
    // GET /api/rrhh/actividades
    // =========================================

    @GetMapping("/actividades")
    public ResponseEntity<List<ActividadDto>>
    listarActividades(
            @RequestParam(required = false)
            LocalDate desde,

            @RequestParam(required = false)
            LocalDate hasta,

            @RequestParam(required = false)
            Long usuarioId,

            Authentication authentication
    ) {

        exigirRrhh(authentication);

        LocalDate fin =
                hasta == null
                        ? LocalDate.now()
                        : hasta;

        LocalDate inicio =
                desde == null
                        ? fin.minusDays(29)
                        : desde;

        if (inicio.isAfter(fin)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "La fecha inicial supera la final"
            );
        }

        if (inicio.plusDays(92).isBefore(fin)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Consulta máximo 93 días por solicitud"
            );
        }

        LocalDateTime inicioFecha =
                inicio.atStartOfDay();

        LocalDateTime finFecha =
                fin.atTime(LocalTime.MAX);

        List<Actividad> actividades =
                usuarioId == null
                        ? actividadRepository
                        .findByFechaBetween(
                                inicioFecha,
                                finFecha
                        )
                        : actividadRepository
                        .findByUsuarioIdAndFechaBetween(
                                usuarioId,
                                inicioFecha,
                                finFecha
                        );

        List<ActividadDto> respuesta =
                actividades.stream()
                        .sorted(
                                Comparator.comparing(
                                        Actividad::getFecha,
                                        Comparator.nullsLast(
                                                Comparator.reverseOrder()
                                        )
                                )
                        )
                        .map(this::convertirActividad)
                        .toList();

        return ResponseEntity.ok(respuesta);
    }
}
