package com.sst.sst.model;

import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "actividades")
public class Actividad {

    // ==========================================
    // ESTADOS DE LA PAUSA ACTIVA
    // ==========================================

    public static final String ESTADO_EN_PROCESO =
            "EN_PROCESO";

    public static final String ESTADO_INCOMPLETA =
            "INCOMPLETA";

    public static final String ESTADO_COMPLETADA =
            "COMPLETADA";

    public static final String ESTADO_CANCELADA =
            "CANCELADA";

    // ==========================================
    // IDENTIFICADOR
    // ==========================================

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // ==========================================
    // EMPLEADO PROPIETARIO
    // ==========================================

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(
            name = "usuario_id",
            nullable = false
    )
    private Usuario usuario;

    // ==========================================
    // INFORMACIÓN ORIGINAL DE LA ACTIVIDAD
    // ==========================================

    @Column(name = "fecha")
    private LocalDateTime fecha;

    @Column(name = "duracion_segundos")
    private Integer duracionSegundos;

    @Column(name = "ejercicios_completados")
    private Integer ejerciciosCompletados;

    @Column(name = "validadoia")
    private Boolean validadoIA;

    @Column(
            name = "estado",
            nullable = false,
            length = 20
    )
    private String estado;

    // ==========================================
    // PROGRESO DE LOS EJERCICIOS
    // ==========================================

    // Posición del ejercicio dentro de la rutina.
    // Comienza desde 0.
    @Column(name = "indice_ejercicio")
    private Integer indiceEjercicio;

    // Posición de la fase dentro del ejercicio.
    // Comienza desde 0.
    @Column(name = "indice_fase")
    private Integer indiceFase;

    // Segundos restantes de la fase actual.
    @Column(name = "tiempo_restante")
    private Integer tiempoRestante;

    // Tiempo efectivo realizado en la rutina.
    // No equivale necesariamente al tiempo de reloj.
    @Column(name = "segundos_transcurridos")
    private Integer segundosTranscurridos;

    // ==========================================
    // CONTROL DE ACTIVIDAD
    // ==========================================

    // Fecha en que el backend recibió la última
    // actualización del progreso de esta rutina.
    //
    // Más adelante permitirá detectar pausas
    // abandonadas sin dejarlas permanentemente
    // en estado EN_PROCESO.

    @Column(name = "ultima_actualizacion")
    private LocalDateTime ultimaActualizacion;

    // ==========================================
    // VALORES INICIALES
    // ==========================================

    @PrePersist
    public void prePersist() {

        if (this.fecha == null) {
            this.fecha = LocalDateTime.now();
        }

        if (this.estado == null) {
            this.estado = ESTADO_EN_PROCESO;
        }

        if (this.duracionSegundos == null) {
            this.duracionSegundos = 0;
        }

        if (this.ejerciciosCompletados == null) {
            this.ejerciciosCompletados = 0;
        }

        if (this.validadoIA == null) {
            this.validadoIA = false;
        }

        if (this.indiceEjercicio == null) {
            this.indiceEjercicio = 0;
        }

        if (this.indiceFase == null) {
            this.indiceFase = 0;
        }

        if (this.tiempoRestante == null) {
            this.tiempoRestante = 0;
        }

        if (this.segundosTranscurridos == null) {
            this.segundosTranscurridos = 0;
        }

        this.ultimaActualizacion =
                LocalDateTime.now();
    }

    // ==========================================
    // ACTUALIZAR FECHA DE MODIFICACIÓN
    // ==========================================

    @PreUpdate
    public void preUpdate() {

        this.ultimaActualizacion =
                LocalDateTime.now();
    }

    // ==========================================
    // CONSTRUCTOR VACÍO PARA JPA
    // ==========================================

    public Actividad() {
    }

    // ==========================================
    // CONSTRUCTOR ORIGINAL
    // ==========================================

    public Actividad(
            Usuario usuario,
            Integer duracionSegundos,
            Integer ejerciciosCompletados,
            Boolean validadoIA,
            String estado
    ) {

        this.usuario = usuario;
        this.duracionSegundos = duracionSegundos;
        this.ejerciciosCompletados =
                ejerciciosCompletados;
        this.validadoIA = validadoIA;
        this.estado = estado;
    }

    // ==========================================
    // IDENTIFICADOR
    // ==========================================

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    // ==========================================
    // USUARIO
    // ==========================================

    public Usuario getUsuario() {
        return usuario;
    }

    public void setUsuario(Usuario usuario) {
        this.usuario = usuario;
    }

    // ==========================================
    // FECHA
    // ==========================================

    public LocalDateTime getFecha() {
        return fecha;
    }

    public void setFecha(
            LocalDateTime fecha
    ) {
        this.fecha = fecha;
    }

    // ==========================================
    // DURACIÓN
    // ==========================================

    public Integer getDuracionSegundos() {
        return duracionSegundos;
    }

    public void setDuracionSegundos(
            Integer duracionSegundos
    ) {
        this.duracionSegundos =
                duracionSegundos;
    }

    // ==========================================
    // EJERCICIOS COMPLETADOS
    // ==========================================

    public Integer getEjerciciosCompletados() {
        return ejerciciosCompletados;
    }

    public void setEjerciciosCompletados(
            Integer ejerciciosCompletados
    ) {
        this.ejerciciosCompletados =
                ejerciciosCompletados;
    }

    // ==========================================
    // VALIDACIÓN POR IA
    // ==========================================

    public Boolean getValidadoIA() {
        return validadoIA;
    }

    public void setValidadoIA(
            Boolean validadoIA
    ) {
        this.validadoIA = validadoIA;
    }

    // ==========================================
    // ESTADO
    // ==========================================

    public String getEstado() {
        return estado;
    }

    public void setEstado(
            String estado
    ) {
        this.estado = estado;
    }

    // ==========================================
    // ÍNDICE DEL EJERCICIO
    // ==========================================

    public Integer getIndiceEjercicio() {
        return indiceEjercicio;
    }

    public void setIndiceEjercicio(
            Integer indiceEjercicio
    ) {
        this.indiceEjercicio = indiceEjercicio;
    }

    // ==========================================
    // ÍNDICE DE LA FASE
    // ==========================================

    public Integer getIndiceFase() {
        return indiceFase;
    }

    public void setIndiceFase(
            Integer indiceFase
    ) {
        this.indiceFase = indiceFase;
    }

    // ==========================================
    // TIEMPO RESTANTE
    // ==========================================

    public Integer getTiempoRestante() {
        return tiempoRestante;
    }

    public void setTiempoRestante(
            Integer tiempoRestante
    ) {
        this.tiempoRestante = tiempoRestante;
    }

    // ==========================================
    // SEGUNDOS TRANSCURRIDOS
    // ==========================================

    public Integer getSegundosTranscurridos() {
        return segundosTranscurridos;
    }

    public void setSegundosTranscurridos(
            Integer segundosTranscurridos
    ) {
        this.segundosTranscurridos =
                segundosTranscurridos;
    }

    // ==========================================
    // ÚLTIMA ACTUALIZACIÓN
    // ==========================================

    public LocalDateTime getUltimaActualizacion() {
        return ultimaActualizacion;
    }

    public void setUltimaActualizacion(
            LocalDateTime ultimaActualizacion
    ) {
        this.ultimaActualizacion =
                ultimaActualizacion;
    }
}