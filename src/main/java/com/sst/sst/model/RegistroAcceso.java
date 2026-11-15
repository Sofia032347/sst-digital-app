
package com.sst.sst.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(
        name = "registro_accesos",
        indexes = {
                @Index(
                        name = "idx_acceso_fecha",
                        columnList = "fecha"
                ),
                @Index(
                        name = "idx_acceso_usuario_fecha",
                        columnList = "usuario_id, fecha"
                )
        }
)
public class RegistroAcceso {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;

    @Column(nullable = false)
    private LocalDateTime fecha;

    public RegistroAcceso() {
    }

    public RegistroAcceso(
            Usuario usuario,
            LocalDateTime fecha
    ) {
        this.usuario = usuario;
        this.fecha = fecha;
    }

    public Long getId() {
        return id;
    }

    public Usuario getUsuario() {
        return usuario;
    }

    public void setUsuario(Usuario usuario) {
        this.usuario = usuario;
    }

    public LocalDateTime getFecha() {
        return fecha;
    }

    public void setFecha(LocalDateTime fecha) {
        this.fecha = fecha;
    }
}
