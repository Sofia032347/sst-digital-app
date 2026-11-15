
package com.sst.sst.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "notificaciones", indexes = {
        @Index(
                name = "idx_notificacion_usuario",
                columnList = "usuario_id"
        ),
        @Index(
                name = "idx_notificacion_proximo_aviso",
                columnList = "proximo_aviso"
        )
})
public class Notificacion {

    public static final String TIPO_RECORDATORIO =
            "RECORDATORIO";

    public static final String TIPO_PAUSA_COMPLETADA =
            "PAUSA_COMPLETADA";

    public static final String TIPO_INFORMATIVA =
            "INFORMATIVA";

    public static final String TIPO_RECORDATORIO_POSPUESTO =
            "RECORDATORIO_POSPUESTO";

    public static final String TIPO_RECORDATORIO_REACTIVADO =
            "RECORDATORIO_REACTIVADO";

    public static final String ESTADO_PENDIENTE =
            "PENDIENTE";

    public static final String ESTADO_POSPUESTA =
            "POSPUESTA";

    public static final String ESTADO_ATENDIDA =
            "ATENDIDA";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;

    @Column(nullable = false, length = 40)
    private String tipo;

    @Column(nullable = false, length = 150)
    private String titulo;

    @Column(nullable = false, length = 500)
    private String mensaje;

    @Column(nullable = false, length = 30)
    private String estado = ESTADO_PENDIENTE;

    @Column(nullable = false)
    private Boolean leida = false;

    @Column(name = "fecha_creacion", nullable = false)
    private LocalDateTime fechaCreacion;

    @Column(name = "fecha_programada")
    private LocalDateTime fechaProgramada;

    @Column(name = "proximo_aviso")
    private LocalDateTime proximoAviso;

    @Column(name = "fecha_atencion")
    private LocalDateTime fechaAtencion;

    @Column(nullable = false)
    private Integer vecesPospuesta = 0;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "actividad_id")
    private Actividad actividad;

    public Notificacion() {
    }

    public Notificacion(
            Usuario usuario,
            String tipo,
            String titulo,
            String mensaje,
            LocalDateTime fechaProgramada
    ) {
        this.usuario = usuario;
        this.tipo = tipo;
        this.titulo = titulo;
        this.mensaje = mensaje;
        this.fechaProgramada = fechaProgramada;
        this.proximoAviso = fechaProgramada;
        this.estado = ESTADO_PENDIENTE;
        this.leida = false;
        this.vecesPospuesta = 0;
    }

    @PrePersist
    public void prePersist() {
        if (fechaCreacion == null) {
            fechaCreacion = LocalDateTime.now();
        }

        if (estado == null) {
            estado = ESTADO_PENDIENTE;
        }

        if (leida == null) {
            leida = false;
        }

        if (vecesPospuesta == null) {
            vecesPospuesta = 0;
        }
    }

    public void posponerHasta(
            LocalDateTime nuevaFecha
    ) {
        if (
                nuevaFecha == null ||
                        !nuevaFecha.isAfter(LocalDateTime.now())
        ) {
            throw new IllegalArgumentException(
                    "La nueva fecha debe ser futura"
            );
        }

        this.estado = ESTADO_POSPUESTA;
        this.proximoAviso = nuevaFecha;
        this.vecesPospuesta++;
    }

    public void marcarAtendida() {
        this.estado = ESTADO_ATENDIDA;
        this.fechaAtencion = LocalDateTime.now();
        this.proximoAviso = null;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Usuario getUsuario() { return usuario; }
    public void setUsuario(Usuario usuario) {
        this.usuario = usuario;
    }

    public String getTipo() { return tipo; }
    public void setTipo(String tipo) { this.tipo = tipo; }

    public String getTitulo() { return titulo; }
    public void setTitulo(String titulo) {
        this.titulo = titulo;
    }

    public String getMensaje() { return mensaje; }
    public void setMensaje(String mensaje) {
        this.mensaje = mensaje;
    }

    public String getEstado() { return estado; }
    public void setEstado(String estado) {
        this.estado = estado;
    }

    public Boolean getLeida() { return leida; }
    public void setLeida(Boolean leida) {
        this.leida = leida;
    }

    public LocalDateTime getFechaCreacion() {
        return fechaCreacion;
    }
    public void setFechaCreacion(LocalDateTime fecha) {
        this.fechaCreacion = fecha;
    }

    public LocalDateTime getFechaProgramada() {
        return fechaProgramada;
    }
    public void setFechaProgramada(LocalDateTime fecha) {
        this.fechaProgramada = fecha;
    }

    public LocalDateTime getProximoAviso() {
        return proximoAviso;
    }
    public void setProximoAviso(LocalDateTime fecha) {
        this.proximoAviso = fecha;
    }

    public LocalDateTime getFechaAtencion() {
        return fechaAtencion;
    }
    public void setFechaAtencion(LocalDateTime fecha) {
        this.fechaAtencion = fecha;
    }

    public Integer getVecesPospuesta() {
        return vecesPospuesta;
    }
    public void setVecesPospuesta(Integer veces) {
        this.vecesPospuesta = veces;
    }

    public Actividad getActividad() { return actividad; }
    public void setActividad(Actividad actividad) {
        this.actividad = actividad;
    }
}