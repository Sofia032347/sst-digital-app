
package com.sst.sst.repository;

import com.sst.sst.model.RegistroAcceso;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface RegistroAccesoRepository
        extends JpaRepository<RegistroAcceso, Long> {

    boolean existsByUsuarioId(Long usuarioId);

    @Query("""
                SELECT DISTINCT r.usuario.id
                FROM RegistroAcceso r
                WHERE r.fecha >= :inicio
                  AND r.fecha < :fin
            """)
    List<Long> buscarUsuariosConAcceso(
            @Param("inicio") LocalDateTime inicio,
            @Param("fin") LocalDateTime fin
    );
}
