package com.sst.sst.repository;

import com.sst.sst.model.Actividad;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface ActividadRepository extends JpaRepository<Actividad, Long> {

    List<Actividad> findByFechaBetween(LocalDateTime inicio, LocalDateTime fin);

    List<Actividad> findByUsuarioIdAndFechaBetween(Long usuarioId, LocalDateTime inicio, LocalDateTime fin);
}
