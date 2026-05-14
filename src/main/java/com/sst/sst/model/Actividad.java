package com.sst.sst.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "actividades")
public class Actividad {
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

    @PrePersist
    public void prePersist() {
        this.fecha = LocalDateTime.now(); // Se asigna la fecha actual automáticamente
    }

    public Actividad() {}

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
}
