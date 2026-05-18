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

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne // Muchas actividades pertenecen a un solo Usuario
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;

    private LocalDateTime fecha; // Para reportes por día/semana/mes
    private Integer duracionSegundos; // Cuánto tiempo duró la pausa
    private Integer ejerciciosCompletados; // Cantidad de ejercicios hechos
    private Boolean validadoIA; // Si MediaPipe confirmó los movimientos

    @Column(name = "estado", nullable = false, length = 20)
    private String estado; // EN_PROCESO, INCOMPLETA, COMPLETADA

    @PrePersist
    public void prePersist() {
        this.fecha = LocalDateTime.now(); // Se asigna la fecha actual automáticamente

        // Por defecto, cuando se crea el registro en la BD, inicia "EN_PROCESO"
        if (this.estado == null) {
            this.estado = ESTADO_EN_PROCESO;
        }
    }

    public Actividad() {}

    // --- GETTERS Y SETTERS ---

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

    public LocalDateTime getFecha() {
        return fecha;
    }

    public void setFecha(LocalDateTime fecha) {
        this.fecha = fecha;
    }

    public Integer getDuracionSegundos() {
        return duracionSegundos;
    }

    public void setDuracionSegundos(Integer duracionSegundos) {
        this.duracionSegundos = duracionSegundos;
    }

    public Integer getEjerciciosCompletados() {
        return ejerciciosCompletados;
    }

    public void setEjerciciosCompletados(Integer ejerciciosCompletados) {
        this.ejerciciosCompletados = ejerciciosCompletados;
    }

    public Boolean getValidadoIA() {
        return validadoIA;
    }

    public void setValidadoIA(Boolean validadoIA) {
        this.validadoIA = validadoIA;
    }

    public String getEstado() {
        return estado;
    }

    public void setEstado(String estado) {
        this.estado = estado;
    }
}