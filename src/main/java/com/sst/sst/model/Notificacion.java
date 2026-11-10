package com.sst.sst.model;

import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "notificaciones",
        indexes = {
                @Index(
                        name = "idx_notificacion_usuario",
                        columnList = "usuario_id"
                ),
                @Index(
                        name = "idx_notificacion_proximo_aviso",
                        columnList = "proximo_aviso"
                )
        }
)
public class Notificacion {

    // ==========================================
    // TIPOS DE NOTIFICACIONES
    // ==========================================

    public static final String TIPO_RECORDATORIO =
            "RECORDATORIO";

    public static final String TIPO_PAUSA_COMPLETADA =
            "PAUSA_COMPLETADA";

    public static final String TIPO_INFORMATIVA =
            "INFORMATIVA";

    // ==========================================
    // ESTADOS
    // ==========================================

    public static final String ESTADO_PENDIENTE =
            "PENDIENTE";

    public static final String ESTADO_POSPUESTA =
            "POSPUESTA";

    public static final String ESTADO_ATENDIDA =
            "ATENDIDA";

    // ==========================================
    // IDENTIFICADOR
    // ==========================================

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // ==========================================
    // USUARIO PROPIETARIO
    // ==========================================

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(
            name = "usuario_id",
            nullable = false
    )
    private Usuario usuario;

    // ==========================================
    // CONTENIDO DE LA NOTIFICACIÓN
    // ==========================================

    @Column(nullable = false, length = 40)
    private String tipo;

    @Column(nullable = false, length = 150)
    private String titulo;

    @Column(nullable = false, length = 500)
    private String mensaje;

    @Column(nullable = false, length = 30)
    private String estado = ESTADO_PENDIENTE;

    // ==========================================
    // FECHAS
    // ==========================================

    @Column(
            name = "fecha_creacion",
            nullable = false
    )
    private LocalDateTime fechaCreacion;

    @Column(name = "fecha_programada")
    private LocalDateTime fechaProgramada;

    @Column(name = "proximo_aviso")
    private LocalDateTime proximoAviso;

    @Column(name = "fecha_atencion")
    private LocalDateTime fechaAtencion;

    // ==========================================
    // CONTROL DE POSPOSICIONES
    // ==========================================

    @Column(nullable = false)
    private Integer vecesPospuesta = 0;

    // ==========================================
    // RELACIÓN OPCIONAL CON ACTIVIDAD
    // ==========================================

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "actividad_id")
    private Actividad actividad;

    // ==========================================
    // CONSTRUCTOR PARA JPA
    // ==========================================

    public Notificacion() {
    }

    // ==========================================
    // CONSTRUCTOR PRINCIPAL
    // ==========================================

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
        this.vecesPospuesta = 0;
    }

    // ==========================================
    // VALORES INICIALES
    // ==========================================

    @PrePersist
    public void prePersist() {

        if (fechaCreacion == null) {
            fechaCreacion = LocalDateTime.now();
        }

        if (estado == null) {
            estado = ESTADO_PENDIENTE;
        }

        if (vecesPospuesta == null) {
            vecesPospuesta = 0;
        }
    }

    // ==========================================
    // POSPONER RECORDATORIO
    // ==========================================

    public void posponerHasta(
            LocalDateTime nuevaFecha
    ) {
        if (nuevaFecha == null ||
                !nuevaFecha.isAfter(LocalDateTime.now())) {
            throw new IllegalArgumentException(
                    "La nueva fecha debe ser futura"
            );
        }

        this.estado = ESTADO_POSPUESTA;
        this.proximoAviso = nuevaFecha;
        this.vecesPospuesta++;
    }

    // ==========================================
    // MARCAR COMO ATENDIDA
    // ==========================================

    public void marcarAtendida() {
        this.estado = ESTADO_ATENDIDA;
        this.fechaAtencion = LocalDateTime.now();
        this.proximoAviso = null;
    }

    // ==========================================
    // GETTERS Y SETTERS
    // ==========================================

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Usuario getUsuario() {
        return usuario;
    }

    public void setUsuario(Usuario usuario) {
        this.usuario = usuario;
    }

    public String getTipo() {
        return tipo;
    }

    public void setTipo(String tipo) {
        this.tipo = tipo;
    }

    public String getTitulo() {
        return titulo;
    }

    public void setTitulo(String titulo) {
        this.titulo = titulo;
    }

    public String getMensaje() {
        return mensaje;
    }

    public void setMensaje(String mensaje) {
        this.mensaje = mensaje;
    }

    public String getEstado() {
        return estado;
    }

    public void setEstado(String estado) {
        this.estado = estado;
    }

    public LocalDateTime getFechaCreacion() {
        return fechaCreacion;
    }

    public void setFechaCreacion(
            LocalDateTime fechaCreacion
    ) {
        this.fechaCreacion = fechaCreacion;
    }

    public LocalDateTime getFechaProgramada() {
        return fechaProgramada;
    }

    public void setFechaProgramada(
            LocalDateTime fechaProgramada
    ) {
        this.fechaProgramada = fechaProgramada;
    }

    public LocalDateTime getProximoAviso() {
        return proximoAviso;
    }

    public void setProximoAviso(
            LocalDateTime proximoAviso
    ) {
        this.proximoAviso = proximoAviso;
    }

    public LocalDateTime getFechaAtencion() {
        return fechaAtencion;
    }

    public void setFechaAtencion(
            LocalDateTime fechaAtencion
    ) {
        this.fechaAtencion = fechaAtencion;
    }

    public Integer getVecesPospuesta() {
        return vecesPospuesta;
    }

    public void setVecesPospuesta(
            Integer vecesPospuesta
    ) {
        this.vecesPospuesta = vecesPospuesta;
    }

    public Actividad getActividad() {
        return actividad;
    }

    public void setActividad(Actividad actividad) {
        this.actividad = actividad;
    }
}
