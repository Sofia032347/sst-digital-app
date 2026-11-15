package com.sst.sst.repository;

import com.sst.sst.model.Actividad;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface ActividadRepository extends JpaRepository<Actividad, Long> {

    // Consultar actividades entre dos fechas
    List<Actividad> findByFechaBetween(
            LocalDateTime inicio,
            LocalDateTime fin
    );

    // Consultar actividades de un empleado entre dos fechas
    List<Actividad> findByUsuarioIdAndFechaBetween(
            Long usuarioId,
            LocalDateTime inicio,
            LocalDateTime fin
    );

    // Verificar si un empleado tiene actividades registradas
    boolean existsByUsuarioId(Long usuarioId);

}
