package com.sst.sst.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "actividades")
public class Actividad {

    // Constantes para controlar los estados de la pausa activa de forma segura
    public static final String ESTADO_EN_PROCESO = "EN_PROCESO";
    public static final String ESTADO_INCOMPLETA = "INCOMPLETA";
    public static final String ESTADO_COMPLETADA = "COMPLETADA";
    public static final String ESTADO_CANCELADA = "CANCELADA";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;

    private LocalDateTime fecha;
    private Integer duracionSegundos;
    private Integer ejerciciosCompletados;
    private Boolean validadoIA;

    @Column(name = "estado", nullable = false, length = 20)
    private String estado;

    @PrePersist
    public void prePersist() {
        this.fecha = LocalDateTime.now();

        if (this.estado == null) {
            this.estado = ESTADO_EN_PROCESO;
        }
    }

    // Constructor vacío exigido por JPA
    public Actividad() {}

    // NUEVO: Constructor con parámetros para facilitar el guardado en los controladores
    public Actividad(Usuario usuario, Integer duracionSegundos, Integer ejerciciosCompletados, Boolean validadoIA, String estado) {
        this.usuario = usuario;
        this.duracionSegundos = duracionSegundos;
        this.ejerciciosCompletados = ejerciciosCompletados;
        this.validadoIA = validadoIA;
        this.estado = estado;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Usuario getUsuario() { return usuario; }
    public void setUsuario(Usuario usuario) { this.usuario = usuario; }

    public LocalDateTime getFecha() { return fecha; }
    public void setFecha(LocalDateTime fecha) { this.fecha = fecha; }

    public Integer getDuracionSegundos() { return duracionSegundos; }
    public void setDuracionSegundos(Integer duracionSegundos) { this.duracionSegundos = duracionSegundos; }

    public Integer getEjerciciosCompletados() { return ejerciciosCompletados; }
    public void setEjerciciosCompletados(Integer ejerciciosCompletados) { this.ejerciciosCompletados = ejerciciosCompletados; }

    public Boolean getValidadoIA() { return validadoIA; }
    public void setValidadoIA(Boolean validadoIA) { this.validadoIA = validadoIA; }

    public String getEstado() { return estado; }
    public void setEstado(String estado) { this.estado = estado; }
}