
/*
 * SST DIGITAL - PAUSAS ACTIVAS
 *
 * Spring Boot + Spring Security + MediaPipe Pose
 *
 * 10 ejercicios
 * 27 fases
 * 600 segundos programados
 *
 * IMPORTANTE:
 * csrf.js debe cargarse antes de pausa-activa.js.
 * La validación visual actual es orientativa.
 * El servidor todavía no certifica los ejercicios mediante IA.
 */

// ======================================================
// 1. RUTINA DE EJERCICIOS
// ======================================================

const rutina = [
    {
        titulo: "1. Cuello: Relajación lateral y frontal",
        fases: [
            {
                instruccion: "Inclina la cabeza suavemente hacia la DERECHA intentando tocar el hombro con la oreja. Sostén.",
                tiempo: 15,
                imagen: "/img/cuello1.jpeg"
            },
            {
                instruccion: "Inclina la cabeza suavemente hacia la IZQUIERDA intentando tocar el hombro con la oreja. Sostén.",
                tiempo: 15,
                imagen: "/img/cuello1.jpeg"
            },
            {
                instruccion: "Lleva la barbilla al PECHO por 15 segundos.",
                tiempo: 15,
                imagen: "/img/cuello2.jpeg"
            },
            {
                instruccion: "Mira ligeramente hacia ARRIBA durante 15 segundos, sin forzar el cuello.",
                tiempo: 15,
                imagen: "/img/cuello2.jpeg"
            }
        ],
        imagen: "/img/cuello2.jpeg"
    },
    {
        titulo: "2. Hombros: Círculos liberadores",
        fases: [
            {
                instruccion: "Con los brazos sueltos, haz círculos amplios con los hombros hacia ATRÁS.",
                tiempo: 30,
                imagen: "/img/hombros1.jpeg"
            },
            {
                instruccion: "Cambia la dirección y haz círculos con los hombros hacia ADELANTE.",
                tiempo: 30,
                imagen: "/img/hombros2.png"
            }
        ],
        imagen: "/img/hombros2.jpeg"
    },
    {
        titulo: "3. Hombros y Brazos: Estiramiento de tríceps",
        fases: [
            {
                instruccion: "Pasa el brazo DERECHO por arriba y el IZQUIERDO por abajo, intentando acercar tus manos en la espalda sin forzar.",
                tiempo: 30,
                imagen: "/img/estiramiento.jpeg"
            },
            {
                instruccion: "Pasa el brazo IZQUIERDO por arriba y el DERECHO por abajo, intentando acercar tus manos en la espalda sin forzar.",
                tiempo: 30,
                imagen: "/img/estiramiento.jpeg"
            }
        ],
        imagen: "/img/estiramiento.jpeg"
    },
    {
        titulo: "4. Espalda Alta: Estiramiento frontal",
        fases: [
            {
                instruccion: "Entrelaza las manos al frente, palmas hacia afuera, y empuja hacia adelante suavemente.",
                tiempo: 30,
                imagen: "/img/espalda.jpeg"
            }
        ],
        imagen: "/img/espalda.jpeg"
    },
    {
        titulo: "5. Muñecas y Antebrazos: Flexión y extensión",
        fases: [
            {
                instruccion: "Brazo DERECHO extendido: lleva suavemente los dedos hacia ABAJO con ayuda de la mano izquierda.",
                tiempo: 15,
                imagen: "/img/brazoderecho1.png"
            },
            {
                instruccion: "Brazo DERECHO extendido: apunta los dedos hacia ARRIBA y acércalos suavemente hacia ti.",
                tiempo: 15,
                imagen: "/img/brazoderecho2.jpeg"
            },
            {
                instruccion: "Brazo IZQUIERDO extendido: lleva suavemente los dedos hacia ABAJO con ayuda de la mano derecha.",
                tiempo: 15,
                imagen: "/img/brazoizquierdo1.png"
            },
            {
                instruccion: "Brazo IZQUIERDO extendido: apunta los dedos hacia ARRIBA y acércalos suavemente hacia ti.",
                tiempo: 15,
                imagen: "/img/brazoizquierdo2.jpeg"
            }
        ],
        imagen: "/img/brazoizquierdo2.png"
    },
    {
        titulo: "6. Tronco: Giro espinal",
        fases: [
            {
                instruccion: "Sentado, gira suavemente el torso hacia la DERECHA y apoya las manos en el respaldo de la silla.",
                tiempo: 30,
                imagen: "/img/tronco1.jpeg"
            },
            {
                instruccion: "Sentado, gira suavemente el torso hacia la IZQUIERDA y apoya las manos en el respaldo de la silla.",
                tiempo: 30,
                imagen: "/img/tronco2.jpeg"
            }
        ],
        imagen: "/img/tronco2.jpeg"
    },
    {
        titulo: "7. Espalda Baja: Estiramiento lateral",
        fases: [
            {
                instruccion: "Levanta el brazo DERECHO por encima de la cabeza y flexiona suavemente el tronco hacia la izquierda.",
                tiempo: 30,
                imagen: "/img/lateral1.jpeg"
            },
            {
                instruccion: "Levanta el brazo IZQUIERDO por encima de la cabeza y flexiona suavemente el tronco hacia la derecha.",
                tiempo: 30,
                imagen: "/img/lateral2.jpeg"
            }
        ],
        imagen: "/img/lateral2.jpeg"
    },
    {
        titulo: "8. Piernas: Estiramiento de Cuádriceps",
        fases: [
            {
                instruccion: "De pie, con apoyo estable, dobla la rodilla DERECHA llevando el talón hacia el glúteo sin forzar.",
                tiempo: 30,
                imagen: "/img/cuadricep1.jpeg"
            },
            {
                instruccion: "De pie, con apoyo estable, dobla la rodilla IZQUIERDA llevando el talón hacia el glúteo sin forzar.",
                tiempo: 30,
                imagen: "/img/cuadricep2.jpeg"
            }
        ],
        imagen: "/img/cuadricep2.jpeg"
    },
    {
        titulo: "9. Pantorrillas y Tobillos: Elevaciones y rotaciones",
        fases: [
            {
                instruccion: "Con apoyo estable, elévate lentamente sobre las puntas de los pies y vuelve a bajar.",
                tiempo: 30,
                imagen: "/img/pantorrillas.jpeg"
            },
            {
                instruccion: "Levanta el pie DERECHO y realiza giros suaves del tobillo hacia la DERECHA.",
                tiempo: 15,
                imagen: "/img/tobillos1.jpeg"
            },
            {
                instruccion: "Con el pie DERECHO levantado, realiza giros suaves del tobillo hacia la IZQUIERDA.",
                tiempo: 15,
                imagen: "/img/tobillos1.jpeg"
            },
            {
                instruccion: "Levanta el pie IZQUIERDO y realiza giros suaves del tobillo hacia la DERECHA.",
                tiempo: 15,
                imagen: "/img/tobillos2.jpeg"
            },
            {
                instruccion: "Con el pie IZQUIERDO levantado, realiza giros suaves del tobillo hacia la IZQUIERDA.",
                tiempo: 15,
                imagen: "/img/tobillos2.jpeg"
            }
        ],
        imagen: "/img/tobillos2.jpeg"
    },
    {
        titulo: "10. Ojos y Mente: Relajación profunda",
        fases: [
            {
                instruccion: "Cubre suavemente los ojos con las palmas de las manos, sin ejercer presión.",
                tiempo: 20,
                imagen: "/img/ojos.jpeg"
            },
            {
                instruccion: "Masajea suavemente las sienes con movimientos circulares.",
                tiempo: 20,
                imagen: "/img/ojos.jpeg"
            },
            {
                instruccion: "Baja las manos, relaja los hombros y respira profundamente.",
                tiempo: 20,
                imagen: "/img/relax.jpeg"
            }
        ],
        imagen: "/img/relax.jpeg"
    }
];

// ======================================================
// 2. VARIABLES DE ESTADO
// ======================================================

let indiceEjercicioActual = 0;
let indiceFaseActual = 0;
let tiempoRestanteFase = 0;

let ejercicioActivo = false;
let estaPausado = false;
let tiempoUltimoFrame = Date.now();

let actividadRegistradaEnServidor = false;
let operacionServidorEnCurso = false;
let rutinaTerminada = false;

let ultimaPosicionNariz = { x: 0, y: 0 };
let ultimaPosicionPie = { x: 0, y: 0 };

const HISTORIAL_MAX = 45;

let historialHombros = [];
let historialCodosY = [];

// ======================================================
// 3. REFERENCIAS AL HTML
// ======================================================

const video = document.getElementById("videoElement");
const canvasElement = document.getElementById("output_canvas");
const canvasCtx = canvasElement.getContext("2d");

const aiStatus = document.getElementById("aiStatus");
const timerDisplay = document.getElementById("timer");

const btnStart = document.getElementById("btnStart");
const btnNext = document.getElementById("btnNext");
const btnPausar = document.getElementById("btnPausar");
const btnCancelar = document.getElementById("btnCancelar");

const exerciseTitle = document.getElementById("exerciseTitle");
const exerciseDesc = document.getElementById("exerciseDesc");
const exerciseImage = document.getElementById("exerciseImage");

// ======================================================
// 4. MEDIAPIPE POSE
// ======================================================

const pose = new Pose({
    locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
});

pose.setOptions({
    modelComplexity: 1,
    smoothLandmarks: true,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
});

pose.onResults(evaluarPosturaYDibujar);

const camera = new Camera(video, {
    onFrame: async () => {
        await pose.send({ image: video });
    },
    width: 640,
    height: 480
});

// ======================================================
// 5. EVALUACIÓN DE POSTURA
// ======================================================

function evaluarPosturaYDibujar(results) {

    if (video.videoWidth > 0 &&
        canvasElement.width !== video.videoWidth) {

        canvasElement.width = video.videoWidth;
        canvasElement.height = video.videoHeight;
    }

    canvasCtx.save();
    canvasCtx.clearRect(
        0,
        0,
        canvasElement.width,
        canvasElement.height
    );

    canvasCtx.translate(canvasElement.width, 0);
    canvasCtx.scale(-1, 1);

    if (!ejercicioActivo) {
        canvasCtx.restore();
        return;
    }

    if (!results.poseLandmarks) {

        if (!estaPausado) {
            aiStatus.className =
                "badge bg-danger text-white fs-5 p-2 shadow-sm";

            aiStatus.textContent =
                "No se detecta una postura visible en la cámara.";
        }

        canvasCtx.restore();
        return;
    }

    drawConnectors(
        canvasCtx,
        results.poseLandmarks,
        POSE_CONNECTIONS,
        {
            color: "#00FF00",
            lineWidth: 4
        }
    );

    drawLandmarks(
        canvasCtx,
        results.poseLandmarks,
        {
            color: "#FF0000",
            lineWidth: 2,
            radius: 3
        }
    );

    canvasCtx.restore();

    if (estaPausado) {
        return;
    }

    actualizarHistoriales(results.poseLandmarks);

    const posturaCorrecta =
        validarMovimientoEspecifico(results.poseLandmarks);

    const ahora = Date.now();

    if (ahora - tiempoUltimoFrame >= 1000) {

        tiempoUltimoFrame = ahora;

        if (posturaCorrecta) {

            aiStatus.className =
                "badge bg-success text-white fs-5 p-2 shadow-sm";

            aiStatus.textContent =
                "Postura detectada. Mantén el movimiento.";

            tiempoRestanteFase--;

            timerDisplay.innerText =
                tiempoRestanteFase + "s";

            if (tiempoRestanteFase <= 0) {
                avanzarFaseOEjercicio();
            }

        } else {

            aiStatus.className =
                "badge bg-warning text-dark fs-5 p-2 shadow-sm";

            aiStatus.textContent =
                "No se pudo confirmar la postura. Temporizador pausado.";
        }
    }
}

// ======================================================
// 6. HISTORIAL DE MOVIMIENTOS
// ======================================================

function actualizarHistoriales(puntos) {

    const hombroIzquierdo = puntos[11];
    const hombroDerecho = puntos[12];

    const codoIzquierdo = puntos[13];
    const codoDerecho = puntos[14];

    historialHombros.push({
        yIzq: hombroIzquierdo.y,
        yDer: hombroDerecho.y,
        ts: Date.now()
    });

    if (historialHombros.length > HISTORIAL_MAX) {
        historialHombros.shift();
    }

    historialCodosY.push({
        yIzq: codoIzquierdo.y,
        yDer: codoDerecho.y,
        ts: Date.now()
    });

    if (historialCodosY.length > HISTORIAL_MAX) {
        historialCodosY.shift();
    }
}

// ======================================================
// 7. VALIDACIÓN ORIENTATIVA POR EJERCICIO
// ======================================================

function validarMovimientoEspecifico(puntos) {

    const nariz = puntos[0];

    const orejaIzquierda = puntos[7];
    const orejaDerecha = puntos[8];

    const hombroIzquierdo = puntos[11];
    const hombroDerecho = puntos[12];

    const codoIzquierdo = puntos[13];
    const codoDerecho = puntos[14];

    const munecaIzquierda = puntos[15];
    const munecaDerecha = puntos[16];

    const rodillaDerecha = puntos[26];
    const rodillaIzquierda = puntos[25];

    const tobilloDerecho = puntos[28];
    const tobilloIzquierdo = puntos[27];

    const pieIzquierdo = puntos[31] || tobilloIzquierdo;
    const pieDerecho = puntos[32] || tobilloDerecho;

    const hombroCentroX =
        (hombroIzquierdo.x + hombroDerecho.x) / 2;

    const hombroCentroY =
        (hombroIzquierdo.y + hombroDerecho.y) / 2;

    // 1. CUELLO
    if (indiceEjercicioActual === 0) {

        if (indiceFaseActual === 0) {
            return orejaDerecha.y >
                orejaIzquierda.y + 0.06;
        }

        if (indiceFaseActual === 1) {
            return orejaIzquierda.y >
                orejaDerecha.y + 0.06;
        }

        if (indiceFaseActual === 2) {
            return nariz.y >
                hombroCentroY - 0.10;
        }

        if (indiceFaseActual === 3) {
            return nariz.y <
                hombroCentroY - 0.30;
        }
    }

    // 2. HOMBROS
    else if (indiceEjercicioActual === 1) {

        if (historialHombros.length < 20) {
            return false;
        }

        const yPromedio = historialHombros.map(
            h => (h.yIzq + h.yDer) / 2
        );

        const rangoY =
            Math.max(...yPromedio) -
            Math.min(...yPromedio);

        if (rangoY < 0.012) {
            return false;
        }

        const PASO = 5;
        const UMBRAL_DELTA = 0.008;

        let inversiones = 0;
        let direccionAnterior = 0;

        for (
            let i = PASO;
            i < yPromedio.length;
            i += PASO
        ) {

            const delta =
                yPromedio[i] - yPromedio[i - PASO];

            if (Math.abs(delta) < UMBRAL_DELTA) {
                continue;
            }

            const direccionActual =
                delta > 0 ? 1 : -1;

            if (
                direccionAnterior !== 0 &&
                direccionActual !== direccionAnterior
            ) {
                inversiones++;
            }

            direccionAnterior = direccionActual;
        }

        return inversiones >= 2;
    }

    // 3. TRÍCEPS
    else if (indiceEjercicioActual === 2) {

        if (indiceFaseActual === 0) {

            const codoDerAlto =
                codoDerecho.y <
                hombroDerecho.y + 0.1;

            const munecaIzqBaja =
                munecaIzquierda.y >
                hombroIzquierdo.y;

            const munecaIzqHaciaCentro =
                Math.abs(
                    munecaIzquierda.x - hombroCentroX
                ) < 0.25;

            return codoDerAlto &&
                munecaIzqBaja &&
                munecaIzqHaciaCentro;
        }

        if (indiceFaseActual === 1) {

            const codoIzqAlto =
                codoIzquierdo.y <
                hombroIzquierdo.y + 0.1;

            const munecaDerBaja =
                munecaDerecha.y >
                hombroDerecho.y;

            const munecaDerHaciaCentro =
                Math.abs(
                    munecaDerecha.x - hombroCentroX
                ) < 0.25;

            return codoIzqAlto &&
                munecaDerBaja &&
                munecaDerHaciaCentro;
        }
    }

    // 4. ESPALDA ALTA
    else if (indiceEjercicioActual === 3) {

        const manosAlFrenteX =
            Math.abs(
                munecaIzquierda.x - munecaDerecha.x
            ) < 0.20;

        const manosAlturaHombros =
            munecaIzquierda.y <
            hombroIzquierdo.y + 0.15 &&
            munecaIzquierda.y >
            hombroIzquierdo.y - 0.25 &&
            munecaDerecha.y <
            hombroDerecho.y + 0.15 &&
            munecaDerecha.y >
            hombroDerecho.y - 0.25;

        const distHombros =
            Math.abs(
                hombroIzquierdo.x - hombroDerecho.x
            );

        const hombrosCurvados =
            distHombros < 0.35;

        return manosAlFrenteX &&
            manosAlturaHombros &&
            hombrosCurvados;
    }

    // 5. MUÑECAS
    else if (indiceEjercicioActual === 4) {

        const dedoDerecho =
            puntos[20] || munecaDerecha;

        const dedoIzquierdo =
            puntos[19] || munecaIzquierda;

        if (
            indiceFaseActual === 0 ||
            indiceFaseActual === 1
        ) {

            const brazoLevantado =
                Math.abs(
                    munecaDerecha.y - hombroDerecho.y
                ) < 0.25;

            const manosJuntas =
                Math.abs(
                    munecaIzquierda.x - munecaDerecha.x
                ) < 0.25;

            if (indiceFaseActual === 0) {
                return brazoLevantado &&
                    manosJuntas &&
                    dedoDerecho.y > munecaDerecha.y;
            }

            return brazoLevantado &&
                manosJuntas &&
                dedoDerecho.y < munecaDerecha.y;
        }

        if (
            indiceFaseActual === 2 ||
            indiceFaseActual === 3
        ) {

            const brazoLevantado =
                Math.abs(
                    munecaIzquierda.y - hombroIzquierdo.y
                ) < 0.25;

            const manosJuntas =
                Math.abs(
                    munecaDerecha.x - munecaIzquierda.x
                ) < 0.25;

            if (indiceFaseActual === 2) {
                return brazoLevantado &&
                    manosJuntas &&
                    dedoIzquierdo.y > munecaIzquierda.y;
            }

            return brazoLevantado &&
                manosJuntas &&
                dedoIzquierdo.y < munecaIzquierda.y;
        }
    }

    // 6. GIRO DE TRONCO
    else if (indiceEjercicioActual === 5) {

        const distHombros =
            Math.abs(
                hombroIzquierdo.x - hombroDerecho.x
            );

        const hombrosGirados =
            distHombros < 0.30;

        if (indiceFaseActual === 0) {

            const mirandoDerecha =
                nariz.x > hombroCentroX + 0.05;

            const manoIzqEnHombroDer =
                Math.abs(
                    munecaIzquierda.x - hombroDerecho.x
                ) < 0.25 &&
                Math.abs(
                    munecaIzquierda.y - hombroDerecho.y
                ) < 0.25;

            return (
                hombrosGirados || mirandoDerecha
            ) && manoIzqEnHombroDer;
        }

        if (indiceFaseActual === 1) {

            const mirandoIzquierda =
                nariz.x < hombroCentroX - 0.05;

            const manoDerEnHombroIzq =
                Math.abs(
                    munecaDerecha.x - hombroIzquierdo.x
                ) < 0.25 &&
                Math.abs(
                    munecaDerecha.y - hombroIzquierdo.y
                ) < 0.25;

            return (
                hombrosGirados || mirandoIzquierda
            ) && manoDerEnHombroIzq;
        }
    }

    // 7. ESTIRAMIENTO LATERAL
    else if (indiceEjercicioActual === 6) {

        if (indiceFaseActual === 0) {

            const brazoDerArriba =
                munecaDerecha.y <
                hombroDerecho.y - 0.15;

            const troncoInclinaIzq =
                hombroIzquierdo.y >
                hombroDerecho.y + 0.06;

            return brazoDerArriba &&
                troncoInclinaIzq;
        }

        if (indiceFaseActual === 1) {

            const brazoIzqArriba =
                munecaIzquierda.y <
                hombroIzquierdo.y - 0.15;

            const troncoInclinaDer =
                hombroDerecho.y >
                hombroIzquierdo.y + 0.06;

            return brazoIzqArriba &&
                troncoInclinaDer;
        }
    }

    // 8. CUÁDRICEPS
    else if (indiceEjercicioActual === 7) {

        if (indiceFaseActual === 0) {

            if (
                !rodillaDerecha ||
                !tobilloDerecho ||
                rodillaDerecha.visibility <= 0.5 ||
                tobilloDerecho.visibility <= 0.5
            ) {
                return false;
            }

            return tobilloDerecho.y <
                rodillaDerecha.y - 0.10;
        }

        if (indiceFaseActual === 1) {

            if (
                !rodillaIzquierda ||
                !tobilloIzquierdo ||
                rodillaIzquierda.visibility <= 0.5 ||
                tobilloIzquierdo.visibility <= 0.5
            ) {
                return false;
            }

            return tobilloIzquierdo.y <
                rodillaIzquierda.y - 0.10;
        }
    }

    // 9. PANTORRILLAS Y TOBILLOS
    else if (indiceEjercicioActual === 8) {

        if (indiceFaseActual === 0) {

            if (historialCodosY.length < 8) {
                return false;
            }

            const posiciones =
                historialHombros
                    .slice(-10)
                    .map(h => h.yIzq);

            const rangoY =
                Math.max(...posiciones) -
                Math.min(...posiciones);

            return rangoY > 0.015;
        }

        if (
            indiceFaseActual === 1 ||
            indiceFaseActual === 2
        ) {

            if (
                !tobilloDerecho ||
                tobilloDerecho.visibility <= 0.4
            ) {
                return false;
            }

            const pieElevado =
                tobilloDerecho.y <
                tobilloIzquierdo.y - 0.03;

            const movimiento =
                Math.abs(
                    pieDerecho.x - ultimaPosicionPie.x
                ) +
                Math.abs(
                    pieDerecho.y - ultimaPosicionPie.y
                );

            ultimaPosicionPie = {
                x: pieDerecho.x,
                y: pieDerecho.y
            };

            return pieElevado &&
                movimiento > 0.002;
        }

        if (
            indiceFaseActual === 3 ||
            indiceFaseActual === 4
        ) {

            if (
                !tobilloIzquierdo ||
                tobilloIzquierdo.visibility <= 0.4
            ) {
                return false;
            }

            const pieElevado =
                tobilloIzquierdo.y <
                tobilloDerecho.y - 0.03;

            const movimiento =
                Math.abs(
                    pieIzquierdo.x - ultimaPosicionPie.x
                ) +
                Math.abs(
                    pieIzquierdo.y - ultimaPosicionPie.y
                );

            ultimaPosicionPie = {
                x: pieIzquierdo.x,
                y: pieIzquierdo.y
            };

            return pieElevado &&
                movimiento > 0.002;
        }
    }

    // 10. OJOS Y RELAJACIÓN
    else if (indiceEjercicioActual === 9) {

        if (indiceFaseActual === 0) {

            return Math.abs(
                    munecaDerecha.y - nariz.y
                ) < 0.15 &&
                Math.abs(
                    munecaIzquierda.y - nariz.y
                ) < 0.15 &&
                Math.abs(
                    munecaDerecha.x - munecaIzquierda.x
                ) < 0.20;
        }

        if (indiceFaseActual === 1) {

            const manosAlturaOrejas =
                Math.abs(
                    munecaDerecha.y - orejaDerecha.y
                ) < 0.15 &&
                Math.abs(
                    munecaIzquierda.y - orejaIzquierda.y
                ) < 0.15;

            const manosSeparadas =
                Math.abs(
                    munecaDerecha.x - munecaIzquierda.x
                ) > 0.25;

            return manosAlturaOrejas &&
                manosSeparadas;
        }

        if (indiceFaseActual === 2) {

            const movimiento =
                Math.abs(
                    nariz.x - ultimaPosicionNariz.x
                ) +
                Math.abs(
                    nariz.y - ultimaPosicionNariz.y
                );

            ultimaPosicionNariz = {
                x: nariz.x,
                y: nariz.y
            };

            return munecaDerecha.y >
                hombroDerecho.y + 0.1 &&
                munecaIzquierda.y >
                hombroIzquierdo.y + 0.1 &&
                movimiento < 0.010;
        }
    }

    // No aceptar movimientos arbitrarios como correctos.
    return false;
}

// ======================================================
// 8. COMUNICACIÓN SEGURA CON SPRING BOOT
// ======================================================

async function enviarPostActividad(ruta) {

    if (typeof window.fetchConCsrf !== "function") {
        throw new Error(
            "No se cargó csrf.js. Revisa el orden de los scripts."
        );
    }

    const respuesta = await window.fetchConCsrf(
        ruta,
        { method: "POST" }
    );

    const destino = new URL(
        respuesta.url,
        window.location.href
    );

    if (
        respuesta.redirected &&
        destino.pathname.endsWith("/login")
    ) {
        throw new Error(
            "Tu sesión expiró. Inicia sesión nuevamente."
        );
    }

    if (!respuesta.ok) {

        if (
            respuesta.status === 401 ||
            respuesta.status === 403
        ) {
            throw new Error(
                "Operación no autorizada. Verifica la sesión y el token CSRF."
            );
        }

        if (respuesta.status === 409) {
            throw new Error(
                "El servidor rechazó el cambio de estado o el tiempo mínimo de la pausa."
            );
        }

        throw new Error(
            `Error del servidor: HTTP ${respuesta.status}`
        );
    }

    return respuesta;
}

function destinoPanel() {

    const btnVolver =
        document.getElementById("btnVolver");

    return btnVolver?.href ||
        "/actividades/empleado";
}

async function mostrarErrorOperacion(titulo, error) {

    console.error(titulo, error);

    await Swal.fire({
        title: titulo,
        text: error?.message ||
            "No se pudo confirmar la operación.",
        icon: "error",
        confirmButtonText: "Entendido"
    });
}

// ======================================================
// 9. AVANZAR FASES
// ======================================================

function avanzarFaseOEjercicio() {

    const ejercicio =
        rutina[indiceEjercicioActual];

    indiceFaseActual++;

    if (indiceFaseActual < ejercicio.fases.length) {

        const nuevaFase =
            ejercicio.fases[indiceFaseActual];

        tiempoRestanteFase =
            nuevaFase.tiempo;

        exerciseDesc.innerText =
            nuevaFase.instruccion;

        exerciseImage.src =
            nuevaFase.imagen || ejercicio.imagen;

        return;
    }

    finalizarEjercicio();
}

// ======================================================
// 10. INICIAR TEMPORIZADOR
// ======================================================

async function iniciarTemporizador() {

    if (
        operacionServidorEnCurso ||
        ejercicioActivo ||
        rutinaTerminada
    ) {
        return;
    }

    btnStart.disabled = true;

    // Registrar la pausa antes de activar los ejercicios.
    if (!actividadRegistradaEnServidor) {

        operacionServidorEnCurso = true;

        aiStatus.className =
            "badge bg-info text-dark fs-5 p-2 shadow-sm";

        aiStatus.textContent =
            "Registrando inicio de pausa...";

        try {

            await enviarPostActividad(
                "/actividades/iniciar-pausa"
            );

            actividadRegistradaEnServidor = true;

        } catch (error) {

            btnStart.disabled = false;

            await mostrarErrorOperacion(
                "No se pudo iniciar la pausa",
                error
            );

            return;

        } finally {

            operacionServidorEnCurso = false;
        }
    }

    const ejercicio =
        rutina[indiceEjercicioActual];

    const fase =
        ejercicio.fases[indiceFaseActual];

    exerciseTitle.innerText =
        ejercicio.titulo;

    exerciseDesc.innerText =
        fase.instruccion;

    exerciseImage.src =
        fase.imagen || ejercicio.imagen;

    tiempoRestanteFase =
        fase.tiempo;

    timerDisplay.innerText =
        tiempoRestanteFase + "s";

    ejercicioActivo = true;
    estaPausado = false;

    tiempoUltimoFrame = Date.now();

    btnPausar.disabled = false;
    btnCancelar.disabled = false;

    aiStatus.className =
        "badge bg-info text-dark fs-5 p-2 shadow-sm";

    aiStatus.textContent =
        "Evaluando postura...";
}

// ======================================================
// 11. FINALIZAR UN EJERCICIO
// ======================================================

function finalizarEjercicio() {

    ejercicioActivo = false;

    timerDisplay.innerText = "¡Listo!";

    exerciseDesc.innerText =
        "¡Excelente trabajo! Prepárate para el siguiente.";

    btnNext.disabled = false;
    btnPausar.disabled = true;
    btnCancelar.disabled = true;

    aiStatus.className =
        "badge bg-info text-dark fs-5 p-2 shadow-sm";

    aiStatus.textContent =
        "Ejercicio terminado. Descansa un momento.";
}

// ======================================================
// 12. SIGUIENTE EJERCICIO
// ======================================================

function siguienteEjercicio() {

    if (
        operacionServidorEnCurso ||
        !actividadRegistradaEnServidor ||
        rutinaTerminada ||
        ejercicioActivo ||
        btnNext.disabled
    ) {
        return;
    }

    // Si terminó el décimo ejercicio, finalizar en backend.
    if (indiceEjercicioActual === rutina.length - 1) {

        finalizarRutinaEnServidor();
        return;
    }

    indiceEjercicioActual++;
    indiceFaseActual = 0;

    const ejercicio =
        rutina[indiceEjercicioActual];

    const primeraFase =
        ejercicio.fases[0];

    exerciseTitle.innerText =
        ejercicio.titulo;

    exerciseDesc.innerText =
        primeraFase.instruccion;

    exerciseImage.src =
        primeraFase.imagen || ejercicio.imagen;

    tiempoRestanteFase =
        primeraFase.tiempo;

    timerDisplay.innerText =
        tiempoRestanteFase + "s";

    const porcentaje =
        ((indiceEjercicioActual + 1) /
            rutina.length) * 100;

    document.getElementById(
        "rutinaProgress"
    ).style.width = porcentaje + "%";

    btnStart.disabled = false;
    btnNext.disabled = true;
}

// ======================================================
// 13. FINALIZAR RUTINA EN SPRING BOOT
// ======================================================

async function finalizarRutinaEnServidor() {

    if (
        operacionServidorEnCurso ||
        !actividadRegistradaEnServidor ||
        rutinaTerminada
    ) {
        return;
    }

    operacionServidorEnCurso = true;
    btnNext.disabled = true;

    try {

        await enviarPostActividad(
            "/actividades/finalizar-pausa"
        );

        actividadRegistradaEnServidor = false;
        rutinaTerminada = true;

        await Swal.fire({
            title: "Pausa registrada",
            text: "La rutina se registró como completada. La validación por IA todavía no está certificada por el servidor.",
            icon: "success",
            confirmButtonText: "Volver al panel"
        });

        window.location.assign(destinoPanel());

    } catch (error) {

        btnNext.disabled = false;

        await mostrarErrorOperacion(
            "No se pudo finalizar la pausa",
            error
        );

    } finally {

        operacionServidorEnCurso = false;
    }
}

// ======================================================
// 14. PAUSAR Y REANUDAR
// ======================================================

function pausarEjercicio() {

    if (
        !ejercicioActivo ||
        operacionServidorEnCurso
    ) {
        return;
    }

    estaPausado = true;

    Swal.fire({
        title: "Pausa temporal",
        text: "Los ejercicios están pausados.",
        icon: "info",
        confirmButtonText: "Reanudar",
        allowOutsideClick: false
    }).then(resultado => {

        if (resultado.isConfirmed) {

            estaPausado = false;
            tiempoUltimoFrame = Date.now();

            aiStatus.textContent =
                "Reanudando ejercicios...";
        }
    });
}

// ======================================================
// 15. ABANDONAR LA PAUSA
// ======================================================

async function procesarCancelacionYSalida(
    urlDestino = null,
    formulario = null
) {

    if (operacionServidorEnCurso) {

        await Swal.fire({
            title: "Operación en curso",
            text: "Primero debe terminar la solicitud al servidor.",
            icon: "info"
        });

        return;
    }

    // Si no hay actividad iniciada, salir normalmente.
    if (!actividadRegistradaEnServidor) {

        if (formulario) {
            formulario.submit();
        } else if (urlDestino) {
            window.location.assign(urlDestino);
        }

        return;
    }

    const estabaPausado = estaPausado;
    estaPausado = true;

    const resultado = await Swal.fire({
        title: "¿Abandonar la pausa activa?",
        text: "Si sales ahora, la actividad se registrará como CANCELADA.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Sí, salir",
        showCancelButton: true,
        cancelButtonText: "Continuar ejercicio",
        allowOutsideClick: false
    });

    if (!resultado.isConfirmed) {

        estaPausado = estabaPausado;
        tiempoUltimoFrame = Date.now();

        return;
    }

    operacionServidorEnCurso = true;

    try {

        await enviarPostActividad(
            "/actividades/cancelar-pausa"
        );

        actividadRegistradaEnServidor = false;

        if (formulario) {

            formulario.submit();

        } else {

            window.location.assign(
                urlDestino || destinoPanel()
            );
        }

    } catch (error) {

        await mostrarErrorOperacion(
            "No se pudo cancelar la pausa",
            error
        );

        estaPausado = estabaPausado;
        tiempoUltimoFrame = Date.now();

    } finally {

        operacionServidorEnCurso = false;
    }
}

// ======================================================
// 16. CANCELAR COMO INCOMPLETA
// ======================================================

async function cancelarEjercicio() {

    if (
        operacionServidorEnCurso ||
        !actividadRegistradaEnServidor
    ) {
        return;
    }

    const estabaPausado = estaPausado;
    estaPausado = true;

    const resultado = await Swal.fire({
        title: "¿Cancelar la rutina?",
        text: "La actividad se registrará como INCOMPLETA.",
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "Sí, cancelar",
        cancelButtonText: "Continuar"
    });

    if (!resultado.isConfirmed) {

        estaPausado = estabaPausado;
        tiempoUltimoFrame = Date.now();

        return;
    }

    operacionServidorEnCurso = true;

    try {

        await enviarPostActividad(
            "/actividades/boton-cancelar"
        );

        actividadRegistradaEnServidor = false;

        window.location.assign(destinoPanel());

    } catch (error) {

        await mostrarErrorOperacion(
            "No se pudo registrar la pausa incompleta",
            error
        );

        estaPausado = estabaPausado;
        tiempoUltimoFrame = Date.now();

    } finally {

        operacionServidorEnCurso = false;
    }
}

// ======================================================
// 17. INICIAR CÁMARA Y CONTROLAR NAVEGACIÓN
// ======================================================

document.addEventListener("DOMContentLoaded", () => {

    camera.start()
        .then(() => {

            const camStatus =
                document.getElementById("cameraStatus");

            if (camStatus) {
                camStatus.style.display = "none";
            }

        })
        .catch(error => {

            console.error(
                "Error al iniciar la cámara:",
                error
            );

            const camStatus =
                document.getElementById("cameraStatus");

            if (camStatus) {
                camStatus.textContent =
                    "No se pudo iniciar la cámara. Revisa los permisos.";
            }
        });

    const btnVolver =
        document.getElementById("btnVolver");

    const formLogout =
        document.getElementById("formLogout");

    if (btnVolver) {

        btnVolver.addEventListener("click", evento => {

            if (
                actividadRegistradaEnServidor ||
                operacionServidorEnCurso
            ) {

                evento.preventDefault();

                procesarCancelacionYSalida(
                    btnVolver.href
                );
            }
        });
    }

    if (formLogout) {

        formLogout.addEventListener("submit", evento => {

            if (
                actividadRegistradaEnServidor ||
                operacionServidorEnCurso
            ) {

                evento.preventDefault();

                procesarCancelacionYSalida(
                    null,
                    formLogout
                );
            }
        });
    }
});
