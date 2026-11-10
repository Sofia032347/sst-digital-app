package com.sst.sst.service;

import com.sst.sst.model.Usuario;
import com.sst.sst.repository.UsuarioRepository;

import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;

import org.springframework.stereotype.Service;

@Service
public class UsuarioDetailsService implements UserDetailsService {

    private final UsuarioRepository usuarioRepository;

    public UsuarioDetailsService(
            UsuarioRepository usuarioRepository) {

        this.usuarioRepository = usuarioRepository;
    }

    @Override
    public UserDetails loadUserByUsername(String email)
            throws UsernameNotFoundException {

        // 1. Consultar el usuario por correo
        Usuario usuario = usuarioRepository.findByEmail(email)
                .orElseThrow(() ->
                        new UsernameNotFoundException(
                                "Credenciales no válidas"
                        )
                );

        // 2. Verificar que tenga un rol asignado
        if (usuario.getRol() == null
                || usuario.getRol().getNombre() == null) {

            throw new UsernameNotFoundException(
                    "Usuario sin rol asignado"
            );
        }

        // 3. Entregar los datos a Spring Security
        return User.builder()
                .username(usuario.getEmail())
                .password(usuario.getPassword())
                .roles(usuario.getRol().getNombre())
                .build();
    }
}
