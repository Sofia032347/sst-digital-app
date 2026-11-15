
package com.sst.sst.service;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class PausaProgresoService {

    private final JdbcTemplate jdbc;

    // 10 ejercicios, 27 fases y 600 segundos.
    private static final int[][] DURACIONES = {
            {15, 15, 15, 15},
            {30, 30},
            {30, 30},
            {30},
            {15, 15, 15, 15},
            {30, 30},
            {30, 30},
            {30, 30},
            {30, 15, 15, 15, 15},
            {20, 20, 20}
    };

    public static final int TOTAL_SEGUNDOS = 600;

    public PausaProgresoService(
            JdbcTemplate jdbc
    ) {
        this.jdbc = jdbc;
    }

    public record Progreso(
            int indiceEjercicio,
            int indiceFase,
            int tiempoRestante,
            int segundosTranscurridos
    ) {}

    // ======================================
    // VALIDAR PROGRESO
    // ======================================

    public void validar(Progreso p) {

        if (p == null) {
            throw new IllegalArgumentException(
                    "El progreso es obligatorio"
            );
        }

        int ejercicio = p.indiceEjercicio();

        if (
                ejercicio < 0 ||
                        ejercicio >= DURACIONES.length
        ) {
            throw new IllegalArgumentException(
                    "Índice de ejercicio inválido"
            );
        }

        int[] fases = DURACIONES[ejercicio];

        int fase = p.indiceFase();

        if (
                fase < 0 ||
                        fase >= fases.length
        ) {
            throw new IllegalArgumentException(
                    "Índice de fase inválido"
            );
        }

        int duracion = fases[fase];

        if (
                p.tiempoRestante() < 0 ||
                        p.tiempoRestante() > duracion
        ) {
            throw new IllegalArgumentException(
                    "Tiempo restante inválido"
            );
        }

        int segundosAnteriores = 0;

        // Sumar ejercicios anteriores.
        for (int e = 0; e < ejercicio; e++) {
            for (int segundos : DURACIONES[e]) {
                segundosAnteriores += segundos;
            }
        }

        // Sumar fases anteriores.
        for (int f = 0; f < fase; f++) {
            segundosAnteriores += fases[f];
        }

        // Sumar segundos realizados
        // dentro de la fase actual.
        int segundosCalculados =
                segundosAnteriores +
                        duracion -
                        p.tiempoRestante();

        if (
                segundosCalculados !=
                        p.segundosTranscurridos()
        ) {
            throw new IllegalArgumentException(
                    "Los segundos no coinciden con la fase"
            );
        }

        if (
                segundosCalculados < 0 ||
                        segundosCalculados > TOTAL_SEGUNDOS
        ) {
            throw new IllegalArgumentException(
                    "Progreso fuera de rango"
            );
        }

        // 100 % significa última fase
        // del último ejercicio terminada.
        if (segundosCalculados == TOTAL_SEGUNDOS) {

            boolean ultimaFase =
                    ejercicio == 9 &&
                            fase == 2 &&
                            p.tiempoRestante() == 0;

            if (!ultimaFase) {
                throw new IllegalArgumentException(
                        "La rutina no terminó en su última fase"
                );
            }
        }
    }

    // ======================================
    // CREAR PROGRESO INICIAL
    // ======================================

    @Transactional
    public void crear(Long actividadId) {

        if (actividadId == null) {
            throw new IllegalArgumentException(
                    "ID de actividad obligatorio"
            );
        }

        jdbc.update(
                """
                INSERT INTO pausa_progreso (
                    actividad_id,
                    indice_ejercicio,
                    indice_fase,
                    tiempo_restante,
                    segundos_transcurridos
                )
                VALUES (?, 0, 0, 15, 0)
                """,
                actividadId
        );
    }

    // ======================================
    // CONSULTAR PROGRESO
    // ======================================

    public Progreso leer(Long actividadId) {

        List<Progreso> resultados = jdbc.query(
                """
                SELECT
                    indice_ejercicio,
                    indice_fase,
                    tiempo_restante,
                    segundos_transcurridos
                FROM pausa_progreso
                WHERE actividad_id = ?
                """,
                (rs, fila) -> new Progreso(
                        rs.getInt("indice_ejercicio"),
                        rs.getInt("indice_fase"),
                        rs.getInt("tiempo_restante"),
                        rs.getInt("segundos_transcurridos")
                ),
                actividadId
        );

        return resultados.isEmpty()
                ? null
                : resultados.get(0);
    }

    // ======================================
    // GUARDAR PROGRESO
    // ======================================

    @Transactional
    public void guardar(
            Long actividadId,
            Progreso nuevo
    ) {

        validar(nuevo);

        Progreso anterior = leer(actividadId);

        if (anterior == null) {
            throw new IllegalArgumentException(
                    "No existe progreso para esta actividad"
            );
        }

        // Impedir que una petición antigua
        // reduzca los segundos ya guardados.
        if (
                nuevo.segundosTranscurridos() <
                        anterior.segundosTranscurridos()
        ) {
            throw new IllegalArgumentException(
                    "No se puede retroceder el progreso"
            );
        }

        int actualizados = jdbc.update(
                """
                UPDATE pausa_progreso
                SET
                    indice_ejercicio = ?,
                    indice_fase = ?,
                    tiempo_restante = ?,
                    segundos_transcurridos = ?
                WHERE actividad_id = ?
                  AND segundos_transcurridos <= ?
                """,
                nuevo.indiceEjercicio(),
                nuevo.indiceFase(),
                nuevo.tiempoRestante(),
                nuevo.segundosTranscurridos(),
                actividadId,
                nuevo.segundosTranscurridos()
        );

        if (actualizados != 1) {
            throw new IllegalArgumentException(
                    "El progreso cambió durante el guardado"
            );
        }
    }
}
