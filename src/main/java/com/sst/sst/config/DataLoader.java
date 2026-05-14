package com.sst.sst.config;

import com.sst.sst.model.Rol;
import com.sst.sst.model.Usuario;
import com.sst.sst.repository.RolRepository;
import com.sst.sst.repository.UsuarioRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
public class DataLoader implements CommandLineRunner {

    @Autowired
    private RolRepository rolRepository;
    
    @Autowired
    private UsuarioRepository usuarioRepository;
    
    @Override
    public void run(String... args) throws Exception {
        // Create roles if they don't exist
        if (rolRepository.count() == 0) {
            Rol empleadoRol = new Rol();
            empleadoRol.setNombre("EMPLEADO");
            rolRepository.save(empleadoRol);
            
            Rol rrhhRol = new Rol();
            rrhhRol.setNombre("RRHH");
            rolRepository.save(rrhhRol);
            
            // Create test users
            Usuario empleado = new Usuario();
            empleado.setNombre("Juan Perez");
            empleado.setEmail("empleado@test.com");
            empleado.setPassword("1234");
            empleado.setDepartamento("Ventas");
            empleado.setRol(empleadoRol);
            usuarioRepository.save(empleado);
            
            Usuario rrhh = new Usuario();
            rrhh.setNombre("Maria Gomez");
            rrhh.setEmail("rrhh@test.com");
            rrhh.setPassword("1234");
            rrhh.setDepartamento("RRHH");
            rrhh.setRol(rrhhRol);
            usuarioRepository.save(rrhh);
            
            System.out.println("✅ Test users created:");
            System.out.println("   Empleado: empleado@test.com / 1234");
            System.out.println("   RRHH: rrhh@test.com / 1234");
        }
    }
}