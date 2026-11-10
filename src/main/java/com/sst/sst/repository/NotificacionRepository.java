
package com.sst.sst.repository;

import com.sst.sst.model.Notificacion;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface NotificacionRepository
        extends JpaRepository<Notificacion, Long> {

    // ==========================================
    // 1. HISTORIAL DEL USUARIO
    // ==========================================

    // Devuelve las notificaciones del usuario
    // ordenadas de la más reciente a la más antigua.
    List<Notificacion> findByUsuarioIdOrderByFechaCreacionDesc(
            Long usuarioId
    );

    // ==========================================
    // 2. CONSULTAR UNA NOTIFICACIÓN PROPIA
    // ==========================================

    // Evita consultar notificaciones de otro usuario
    // mediante un ID que no le pertenece.
    Optional<Notificacion> findByIdAndUsuarioId(
            Long id,
            Long usuarioId
    );

    // ==========================================
    // 3. NOTIFICACIONES PENDIENTES
    // ==========================================

    // Incluye tanto recordatorios pendientes
    // como recordatorios que fueron pospuestos.
    List<Notificacion> findByUsuarioIdAndEstadoInOrderByFechaCreacionDesc(
            Long usuarioId,
            List<String> estados
    );

    // ==========================================
    // 4. RECORDATORIOS QUE YA DEBEN MOSTRARSE
    // ==========================================

    @Query("""
            SELECT n
            FROM Notificacion n
            WHERE n.usuario.id = :usuarioId
              AND n.estado IN :estados
              AND n.proximoAviso IS NOT NULL
              AND n.proximoAviso <= :ahora
            ORDER BY n.proximoAviso ASC
            """)
    List<Notificacion> buscarRecordatoriosVencidos(
            @Param("usuarioId") Long usuarioId,
            @Param("estados") List<String> estados,
            @Param("ahora") LocalDateTime ahora
    );

    // ==========================================
    // 5. CONTADOR DE NOTIFICACIONES PENDIENTES
    // ==========================================

    long countByUsuarioIdAndEstadoIn(
            Long usuarioId,
            List<String> estados
    );

    // ==========================================
    // 6. NOTIFICACIONES DE UNA ACTIVIDAD
    // ==========================================

    // Permite relacionar recordatorios y avisos
    // con una pausa activa registrada.
    List<Notificacion> findByUsuarioIdAndActividadIdOrderByFechaCreacionDesc(
            Long usuarioId,
            Long actividadId
    );
}
