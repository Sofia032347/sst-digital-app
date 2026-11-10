
package com.sst.sst.runner;

import com.sst.sst.model.Usuario;
import com.sst.sst.repository.UsuarioRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;

@Component
@ConditionalOnProperty(
        name = "sst.password-migration.enabled",
        havingValue = "true"
)
public class PasswordMigrationRunner implements CommandLineRunner {

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;

    public PasswordMigrationRunner(
            UsuarioRepository usuarioRepository,
            PasswordEncoder passwordEncoder) {

        this.usuarioRepository = usuarioRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    @Transactional
    public void run(String... args) {

        System.out.println("Iniciando revisión de contraseñas...");

        int migradas = 0;

        for (Usuario usuario : usuarioRepository.findAll()) {

            String passwordActual = usuario.getPassword();

            // Evitar procesar contraseñas vacías
            if (passwordActual == null || passwordActual.isBlank()) {
                continue;
            }

            // Si ya tiene formato BCrypt, no se vuelve a cifrar
            if (passwordActual.startsWith("$2a$")
                    || passwordActual.startsWith("$2b$")
                    || passwordActual.startsWith("$2y$")) {

                continue;
            }

            // Cifrar la contraseña que todavía está en texto plano
            usuario.setPassword(
                    passwordEncoder.encode(passwordActual)
            );

            usuarioRepository.save(usuario);
            migradas++;
        }

        System.out.println(
                "Migración terminada. Contraseñas migradas: " + migradas
        );
    }
}
