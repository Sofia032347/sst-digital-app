// --- 1. RUTINA DIVIDIDA EN FASES ---
const rutina = [
    {
        titulo: "1. Cuello: Relajación",
        fases: [
            { instruccion: "Inclina la cabeza hacia la DERECHA intentando tocar el hombro.", tiempo: 15 },
            { instruccion: "Inclina la cabeza hacia la IZQUIERDA intentando tocar el hombro.", tiempo: 15 },
            { instruccion: "Lleva la barbilla al PECHO.", tiempo: 15 },
            { instruccion: "Mira hacia el TECHO.", tiempo: 15 }
        ],
        imagen: "https://via.placeholder.com/300x200?text=Cuello"
    },
    {
        titulo: "2. Hombros: Círculos",
        fases: [
            { instruccion: "Haz círculos amplios con los hombros hacia ATRÁS.", tiempo: 30 },
            { instruccion: "Haz círculos amplios con los hombros hacia ADELANTE.", tiempo: 30 }
        ],
        imagen: "https://via.placeholder.com/300x200?text=Hombros"
    },
    {
        titulo: "3. Pecho y Brazos: Apertura",
        fases: [
            { instruccion: "Entrelaza manos tras la espalda, espalda recta, saca el pecho.", tiempo: 60 }
        ],
        imagen: "https://via.placeholder.com/300x200?text=Pecho"
    },
    {
        titulo: "4. Espalda Alta: Estiramiento",
        fases: [
            { instruccion: "Entrelaza manos al frente y empuja hacia adelante encorvando la espalda alta.", tiempo: 60 }
        ],
        imagen: "https://via.placeholder.com/300x200?text=Espalda+Alta"
    },
    {
        titulo: "5. Muñecas y Antebrazos",
        fases: [
            { instruccion: "Brazo DERECHO ESTIRADO al frente: Tira de los dedos hacia ABAJO con la mano izquierda.", tiempo: 20 },
            { instruccion: "Brazo DERECHO ESTIRADO al frente: Tira de los dedos hacia ARRIBA con la mano izquierda.", tiempo: 20 },
            { instruccion: "Brazo IZQUIERDO ESTIRADO al frente: Tira de los dedos hacia ABAJO con la mano derecha.", tiempo: 20 },
            { instruccion: "Brazo IZQUIERDO ESTIRADO al frente: Tira de los dedos hacia ARRIBA con la mano derecha.", tiempo: 20 }
        ],
        imagen: "https://via.placeholder.com/300x200?text=Mu%C3%B1ecas"
    },
    {
        titulo: "6. Tronco: Giro espinal",
        fases: [
            { instruccion: "Sentado, gira el torso a la DERECHA agarrando el respaldo.", tiempo: 30 },
            { instruccion: "Sentado, gira el torso a la IZQUIERDA agarrando el respaldo.", tiempo: 30 }
        ],
        imagen: "https://via.placeholder.com/300x200?text=Tronco"
    },
    {
        titulo: "7. Espalda Baja: Estiramiento",
        fases: [
            { instruccion: "Brazo derecho arriba, flexiona tronco a la IZQUIERDA suavemente.", tiempo: 30 },
            { instruccion: "Brazo izquierdo arriba, flexiona tronco a la DERECHA suavemente.", tiempo: 30 }
        ],
        imagen: "https://via.placeholder.com/300x200?text=Espalda+Baja"
    },
    {
        titulo: "8. Piernas: Cuádriceps",
        fases: [
            { instruccion: "De pie, lleva el talón DERECHO al glúteo. Mantén equilibrio.", tiempo: 40 },
            { instruccion: "De pie, lleva el talón IZQUIERDO al glúteo. Mantén equilibrio.", tiempo: 40 }
        ],
        imagen: "https://via.placeholder.com/300x200?text=Cu%C3%A1driceps"
    },
    {
        titulo: "9. Pantorrillas y Tobillos",
        fases: [
            { instruccion: "Ponte de puntillas y baja lentamente (Repetir varias veces).", tiempo: 30 },
            { instruccion: "Pie DERECHO en el aire: Haz giros con el tobillo.", tiempo: 30 },
            { instruccion: "Pie IZQUIERDO en el aire: Haz giros con el tobillo.", tiempo: 30 }
        ],
        imagen: "https://via.placeholder.com/300x200?text=Pantorrillas"
    },
    {
        titulo: "10. Ojos y Mente: Descanso",
        fases: [
            { instruccion: "Regla 20-20-20: Mira a 6 metros de distancia. Cierra los ojos y respira.", tiempo: 60 }
        ],
        imagen: "https://via.placeholder.com/300x200?text=Descanso+Visual"
    }
];

// --- 2. VARIABLES GLOBALES DE CONTROL ---
let indiceEjercicioActual = 0;
let indiceFaseActual = 0;
let tiempoRestanteFase = rutina[0].fases[0].tiempo;
let ejercicioActivo = false;
let tiempoUltimoFrame = Date.now();
let ultimaPosicionNariz = { x: 0, y: 0 };

// Historial de posiciones para detectar movimiento (ejercicio 2 - hombros)
const HISTORIAL_MAX = 45; // ~45 frames (~1.5s a 30fps) para detectar ciclos completos
let historialHombros = [];       // { yIzq, yDer, timestamp }
let historialCodosY = [];        // para detectar elevación de codos
let contadorMovimientoHombros = 0;
let umbralMovimientoHombro = 0;  // se calibra con posición de reposo

// Para muñecas: detectar la diferencia de altura entre muñeca y codo
// (brazo estirado Y que la muñeca esté en posición doblada)
let historialMunecas = [];

const video = document.querySelector("#videoElement");
const canvasElement = document.getElementById("output_canvas");
const canvasCtx = canvasElement.getContext("2d");
const aiStatus = document.getElementById("aiStatus");
const timerDisplay = document.getElementById("timer");
const btnStart = document.getElementById("btnStart");
const btnNext = document.getElementById("btnNext");
const exerciseTitle = document.getElementById("exerciseTitle");
const exerciseDesc = document.getElementById("exerciseDesc");
const exerciseImage = document.getElementById("exerciseImage");

exerciseDesc.innerText = rutina[0].fases[0].instruccion;
if (timerDisplay) timerDisplay.innerText = tiempoRestanteFase + "s";

// --- 3. CONFIGURACIÓN IA ---
const pose = new Pose({ locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}` });
pose.setOptions({ modelComplexity: 1, smoothLandmarks: true, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });
pose.onResults(evaluarPosturaYDibujar);

const camera = new Camera(video, { onFrame: async () => { await pose.send({ image: video }); }, width: 640, height: 480 });

document.addEventListener("DOMContentLoaded", () => {
    camera.start().then(() => {
        let camStatus = document.querySelector("#cameraStatus");
        if (camStatus) camStatus.style.display = "none";
    });
});

// --- 4. LÓGICA PRINCIPAL Y ALERTA VISUAL ---
function evaluarPosturaYDibujar(results) {
    if (canvasElement.width !== video.videoWidth && video.videoWidth > 0) {
        canvasElement.width = video.videoWidth;
        canvasElement.height = video.videoHeight;
    }

    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

    if (!ejercicioActivo) {
        canvasCtx.restore();
        return;
    }

    if (!results.poseLandmarks) {
        aiStatus.className = "badge bg-danger text-white fs-5 p-2 shadow-sm";
        aiStatus.innerText = "❌ No te veo en cámara. Ubícate mejor.";
        canvasCtx.restore();
        return;
    }

    drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS, { color: '#00FF00', lineWidth: 4 });
    drawLandmarks(canvasCtx, results.poseLandmarks, { color: '#FF0000', lineWidth: 2, radius: 3 });
    canvasCtx.restore();

    // Actualizar historial de puntos antes de validar
    actualizarHistoriales(results.poseLandmarks);

    let posturaCorrecta = validarMovimientoEspecifico(results.poseLandmarks);

    // --- DEBUG VISUAL (solo ejercicio 2 – hombros) ---
    // Muestra valores en tiempo real para ajustar umbrales.
    // Puedes eliminar este bloque cuando ya no lo necesites.
    if (indiceEjercicioActual === 1) {
        let debugEl = document.getElementById("debugHombros");
        if (!debugEl) {
            debugEl = document.createElement("div");
            debugEl.id = "debugHombros";
            debugEl.style.cssText = "position:fixed;bottom:10px;left:10px;background:rgba(0,0,0,0.85);color:#0ff;font-family:monospace;font-size:13px;padding:10px 14px;border-radius:8px;z-index:9999;line-height:1.8;pointer-events:none;";
            document.body.appendChild(debugEl);
        }
        if (historialHombros.length >= 2) {
            const yProm = historialHombros.map(h => (h.yIzq + h.yDer) / 2);
            const rangoY = (Math.max(...yProm) - Math.min(...yProm)).toFixed(4);
            // Calcular inversiones con muestras espaciadas (igual que la lógica real)
            const PASO = 5;
            const UMBRAL_DELTA = 0.008;
            let inv = 0, dirAnt = 0;
            for (let i = PASO; i < yProm.length; i += PASO) {
                const d = yProm[i] - yProm[i - PASO];
                if (Math.abs(d) < UMBRAL_DELTA) continue;
                const dirAct = d > 0 ? 1 : -1;
                if (dirAnt !== 0 && dirAct !== dirAnt) inv++;
                dirAnt = dirAct;
            }
            const p = results.poseLandmarks;
            const munIzqY = p[15].y.toFixed(3), homIzqY = p[11].y.toFixed(3);
            const munDerY = p[16].y.toFixed(3), homDerY = p[12].y.toFixed(3);
            debugEl.innerHTML =
                `🔵 <b>DEBUG HOMBROS</b><br>` +
                `Historial: ${historialHombros.length}/${HISTORIAL_MAX} frames<br>` +
                `Rango Y: <b>${rangoY}</b> (mín 0.015)<br>` +
                `Inversiones: <b>${inv}</b> (mín 2)<br>` +
                `Muñeca Izq Y: ${munIzqY} | Hombro Izq Y: ${homIzqY}<br>` +
                `Muñeca Der Y: ${munDerY} | Hombro Der Y: ${homDerY}<br>` +
                `Válido: <b style="color:${posturaCorrecta?'#0f0':'#f44'}">${posturaCorrecta ? '✅ SÍ' : '❌ NO'}</b>`;
        }
    } else {
        const debugEl = document.getElementById("debugHombros");
        if (debugEl) debugEl.remove();
    }

    const ahora = Date.now();
    if (ahora - tiempoUltimoFrame >= 1000) {
        tiempoUltimoFrame = ahora;

        if (posturaCorrecta) {
            aiStatus.className = "badge bg-success text-white fs-5 p-2 shadow-sm";
            aiStatus.innerText = "✅ Excelente, mantén la postura.";
            tiempoRestanteFase--;
            if (timerDisplay) timerDisplay.innerText = tiempoRestanteFase + "s";

            if (tiempoRestanteFase <= 0) {
                avanzarFaseOEjercicio();
            }
        } else {
            aiStatus.className = "badge bg-warning text-dark fs-5 p-2 shadow-sm";
            aiStatus.innerText = "⚠️ Postura incorrecta o incompleta. Tiempo Pausado.";
        }
    }
}

// --- ACTUALIZAR HISTORIALES FRAME A FRAME ---
function actualizarHistoriales(puntos) {
    const hombroIzquierdo = puntos[11];
    const hombroDerecho  = puntos[12];
    const codoIzquierdo  = puntos[13];
    const codoDerecho    = puntos[14];

    // Historial de hombros para detectar rotación/elevación
    historialHombros.push({
        yIzq: hombroIzquierdo.y,
        yDer: hombroDerecho.y,
        zIzq: hombroIzquierdo.z || 0,
        zDer: hombroDerecho.z  || 0,
        ts: Date.now()
    });
    if (historialHombros.length > HISTORIAL_MAX) historialHombros.shift();

    // Historial de codos
    historialCodosY.push({
        yIzq: codoIzquierdo.y,
        yDer: codoDerecho.y,
        ts: Date.now()
    });
    if (historialCodosY.length > HISTORIAL_MAX) historialCodosY.shift();
}

// ============================================================
// --- FUNCIÓN PRINCIPAL DE VALIDACIÓN ---
// ============================================================
function validarMovimientoEspecifico(puntos) {

    // Landmarks principales
    const nariz            = puntos[0];
    const orejaIzquierda   = puntos[7];
    const orejaDerecha     = puntos[8];
    const hombroIzquierdo  = puntos[11];
    const hombroDerecho    = puntos[12];
    const codoIzquierdo    = puntos[13];
    const codoDerecho      = puntos[14];
    const munecaIzquierda  = puntos[15];
    const munecaDerecha    = puntos[16];
    const caderaDerecha    = puntos[24];
    const caderaIzquierda  = puntos[23];
    const rodillaDerecha   = puntos[26];
    const rodillaIzquierda = puntos[25];
    const tobilloDerecho   = puntos[28];
    const tobilloIzquierdo = puntos[27];

    const hombroCentroX = (hombroIzquierdo.x + hombroDerecho.x) / 2;
    const hombroCentroY = (hombroIzquierdo.y + hombroDerecho.y) / 2;
    const caderaCentroX = (caderaDerecha.x  + caderaIzquierda.x) / 2;

    // ===========================================================
    // EJERCICIO 1 – CUELLO (4 fases)
    // ===========================================================
    if (indiceEjercicioActual === 0) {
        // Fase 0: Inclinar cabeza a la DERECHA
        // La oreja derecha debe estar significativamente más baja (Y mayor) que la izquierda
        if (indiceFaseActual === 0) {
            return orejaDerecha.y > orejaIzquierda.y + 0.06;
        }
        // Fase 1: Inclinar cabeza a la IZQUIERDA
        if (indiceFaseActual === 1) {
            return orejaIzquierda.y > orejaDerecha.y + 0.06;
        }
        // Fase 2: Barbilla al PECHO (nariz baja hacia el centro)
        if (indiceFaseActual === 2) {
            return nariz.y > hombroCentroY - 0.10;
        }
        // Fase 3: Mirar al TECHO (nariz sube por encima de los hombros)
        if (indiceFaseActual === 3) {
            return nariz.y < hombroCentroY - 0.30;
        }
    }

        // ===========================================================
        // EJERCICIO 2 – HOMBROS: CÍRCULOS (detección por muestras espaciadas)
    // ===========================================================
    else if (indiceEjercicioActual === 1) {
        if (historialHombros.length < 20) return false;

        // Promediar Y de ambos hombros
        const yPromedio = historialHombros.map(h => (h.yIzq + h.yDer) / 2);

        // Rango total: si es muy pequeño no hay movimiento real
        const rangoY = Math.max(...yPromedio) - Math.min(...yPromedio);
        if (rangoY < 0.012) return false;

        // --- Contar inversiones comparando muestras cada PASO frames ---
        // En lugar de frame-a-frame (deltas ~0.001), comparamos cada 5 frames
        // para que los deltas sean significativos y detectables.
        const PASO = 5;
        const UMBRAL_DELTA = 0.008; // delta mínimo entre muestras espaciadas
        let inversiones = 0;
        let direccionAnterior = 0;

        for (let i = PASO; i < yPromedio.length; i += PASO) {
            const delta = yPromedio[i] - yPromedio[i - PASO];
            if (Math.abs(delta) < UMBRAL_DELTA) continue;
            const direccionActual = delta > 0 ? 1 : -1;
            if (direccionAnterior !== 0 && direccionActual !== direccionAnterior) {
                inversiones++;
            }
            direccionAnterior = direccionActual;
        }

        // 45 frames / 5 = 9 muestras → un círculo a ~1s da 2 inversiones fácilmente
        return inversiones >= 2;
    }

        // ===========================================================
        // EJERCICIO 3 – PECHO Y BRAZOS: APERTURA (manos detrás, pecho afuera)
    // ===========================================================
    else if (indiceEjercicioActual === 2) {
        // Las muñecas deben estar DETRÁS del cuerpo (Z positivo = más lejos de cámara)
        // Y más bajas que los hombros, Y relativamente juntas entre sí
        const manosBajas   = munecaIzquierda.y > hombroIzquierdo.y + 0.15
            && munecaDerecha.y   > hombroDerecho.y   + 0.15;
        const manosJuntas  = Math.abs(munecaIzquierda.x - munecaDerecha.x) < 0.20;

        // Los hombros deben estar ligeramente hacia atrás (la nariz debe verse centrada)
        const espaldaRecta = Math.abs(nariz.x - hombroCentroX) < 0.08;

        return manosBajas && manosJuntas && espaldaRecta;
    }

        // ===========================================================
        // EJERCICIO 4 – ESPALDA ALTA: Manos al frente, espalda encorvada
    // ===========================================================
    else if (indiceEjercicioActual === 3) {
        // Muñecas deben estar al frente (Z negativo = más cerca de cámara) y juntas
        // a altura de hombros aproximadamente
        const manosAlFrenteX = Math.abs(munecaIzquierda.x - munecaDerecha.x) < 0.20;
        const manosAlturaHombros = munecaIzquierda.y < hombroIzquierdo.y + 0.15
            && munecaIzquierda.y > hombroIzquierdo.y - 0.25
            && munecaDerecha.y   < hombroDerecho.y   + 0.15
            && munecaDerecha.y   > hombroDerecho.y   - 0.25;

        // La espalda encorvada hace que los hombros se curven: la distancia horizontal
        // entre hombros disminuye (se juntan)
        const distHombros = Math.abs(hombroIzquierdo.x - hombroDerecho.x);
        const hombrosCurvados = distHombros < 0.35; // hombros juntos = espalda encorvada

        // Brazos extendidos: codos deben estar entre los hombros y las muñecas en Y
        const brazosEstirados = Math.abs(codoIzquierdo.y - hombroIzquierdo.y) < 0.15
            && Math.abs(codoDerecho.y   - hombroDerecho.y)   < 0.15;

        return manosAlFrenteX && manosAlturaHombros && hombrosCurvados;
    }

        // ===========================================================
        // EJERCICIO 5 – MUÑECAS Y ANTEBRAZOS
        // Requiere: brazo estirado al frente A ALTURA DE HOMBROS + muñeca DOBLADA
    // ===========================================================
    else if (indiceEjercicioActual === 4) {

        // Fases 0 y 1: Brazo DERECHO al frente (muñeca D a altura hombro D)
        //   Fase 0: dedos hacia ABAJO → muñeca D más BAJA que el codo D
        //   Fase 1: dedos hacia ARRIBA → muñeca D más ALTA que el codo D
        if (indiceFaseActual === 0 || indiceFaseActual === 1) {
            // El brazo derecho debe estar estirado (muñeca y codo a altura de hombro)
            const brazoDerechoHorizontal =
                Math.abs(munecaDerecha.y - hombroDerecho.y) < 0.18 &&
                Math.abs(codoDerecho.y   - hombroDerecho.y) < 0.18;

            // La muñeca izquierda debe estar cerca de la muñeca derecha (tirando de dedos)
            const manoIzqCercaDer = Math.abs(munecaIzquierda.x - munecaDerecha.x) < 0.15
                && Math.abs(munecaIzquierda.y - munecaDerecha.y) < 0.15;

            // Fase 0 (dedos ABAJO): la muñeca derecha debe estar debajo del codo derecho
            if (indiceFaseActual === 0) {
                const muñecaBaja = munecaDerecha.y > codoDerecho.y + 0.03;
                return brazoDerechoHorizontal && manoIzqCercaDer && muñecaBaja;
            }
            // Fase 1 (dedos ARRIBA): la muñeca derecha debe estar encima del codo derecho
            if (indiceFaseActual === 1) {
                const muñecaAlta = munecaDerecha.y < codoDerecho.y - 0.03;
                return brazoDerechoHorizontal && manoIzqCercaDer && muñecaAlta;
            }
        }

        // Fases 2 y 3: Brazo IZQUIERDO al frente
        if (indiceFaseActual === 2 || indiceFaseActual === 3) {
            const brazoIzquierdoHorizontal =
                Math.abs(munecaIzquierda.y - hombroIzquierdo.y) < 0.18 &&
                Math.abs(codoIzquierdo.y   - hombroIzquierdo.y) < 0.18;

            // La muñeca derecha debe estar cerca de la muñeca izquierda (tirando de dedos)
            const manoDerCercaIzq = Math.abs(munecaDerecha.x - munecaIzquierda.x) < 0.15
                && Math.abs(munecaDerecha.y - munecaIzquierda.y) < 0.15;

            if (indiceFaseActual === 2) {
                const muñecaBaja = munecaIzquierda.y > codoIzquierdo.y + 0.03;
                return brazoIzquierdoHorizontal && manoDerCercaIzq && muñecaBaja;
            }
            if (indiceFaseActual === 3) {
                const muñecaAlta = munecaIzquierda.y < codoIzquierdo.y - 0.03;
                return brazoIzquierdoHorizontal && manoDerCercaIzq && muñecaAlta;
            }
        }
    }

        // ===========================================================
        // EJERCICIO 6 – TRONCO: GIRO ESPINAL
    // ===========================================================
    else if (indiceEjercicioActual === 5) {
        // En un giro de torso, los hombros rotan pero las caderas quedan fijas.
        // El hombro del lado hacia donde giras se mueve hacia atrás (Z positivo).
        // Usamos la diferencia en X visible: al girar a la derecha, el hombro derecho
        // se "esconde" (se aleja del centro visible) y el izquierdo avanza.
        const distHombros = Math.abs(hombroIzquierdo.x - hombroDerecho.x);

        // Al girar, la distancia horizontal entre hombros disminuye notoriamente
        // y la distancia entre caderas permanece estable
        const distCaderas = Math.abs(caderaDerecha.x - caderaIzquierda.x);

        // Ratio: si los hombros están más juntos que las caderas = hay giro
        const ratioGiro = distCaderas > 0 ? distHombros / distCaderas : 1;

        // Fase 0: Giro a la DERECHA (hombro izquierdo avanza → se vuelve más visible en X izquierda)
        if (indiceFaseActual === 0) {
            // Al girar a la derecha, la nariz apunta a la derecha (X mayor que centro hombros)
            const narizGiraALaDerecha = nariz.x > hombroCentroX + 0.04;
            return ratioGiro < 0.80 && narizGiraALaDerecha;
        }
        // Fase 1: Giro a la IZQUIERDA
        if (indiceFaseActual === 1) {
            const narizGiraALaIzquierda = nariz.x < hombroCentroX - 0.04;
            return ratioGiro < 0.80 && narizGiraALaIzquierda;
        }
    }

        // ===========================================================
        // EJERCICIO 7 – ESPALDA BAJA: FLEXIÓN LATERAL
    // ===========================================================
    else if (indiceEjercicioActual === 6) {
        // En la flexión lateral, el brazo va arriba y el tronco se inclina.
        // La inclinación se detecta comparando la posición del hombro con la cadera:
        // si el hombro izquierdo sube y se aleja del centro, hay flexión a la derecha.

        // Fase 0: Brazo derecho arriba, tronco flexiona a la IZQUIERDA
        if (indiceFaseActual === 0) {
            // Muñeca derecha debe estar por encima del hombro derecho (brazo arriba)
            const brazoDerArriba = munecaDerecha.y < hombroDerecho.y - 0.15;
            // El tronco se inclina a la izquierda: hombro izquierdo baja (Y mayor)
            const troncoInclinaIzq = hombroIzquierdo.y > hombroDerecho.y + 0.06;
            return brazoDerArriba && troncoInclinaIzq;
        }
        // Fase 1: Brazo izquierdo arriba, tronco flexiona a la DERECHA
        if (indiceFaseActual === 1) {
            const brazoIzqArriba = munecaIzquierda.y < hombroIzquierdo.y - 0.15;
            const troncoInclinaDer = hombroDerecho.y > hombroIzquierdo.y + 0.06;
            return brazoIzqArriba && troncoInclinaDer;
        }
    }

        // ===========================================================
        // EJERCICIO 8 – PIERNAS: CUÁDRICEPS (talón al glúteo)
    // ===========================================================
    else if (indiceEjercicioActual === 7) {
        // La rodilla se dobla hacia atrás: el tobillo sube mucho.
        // El tobillo debe estar significativamente más alto que la rodilla en Y
        // (recordar: Y crece hacia abajo en coordenadas de imagen).
        // Un tobillo elevado = Y tobillo MENOR que Y rodilla por bastante margen.

        // Fase 0: talón DERECHO al glúteo
        if (indiceFaseActual === 0) {
            const rodillaDerechaVisible = rodillaDerecha && rodillaDerecha.visibility > 0.5;
            const tobilloDerechoVisible = tobilloDerecho && tobilloDerecho.visibility > 0.5;
            if (!rodillaDerechaVisible || !tobilloDerechoVisible) return false;
            // El tobillo derecho sube por encima de la rodilla derecha (se dobla la pierna)
            const tobilloSube = tobilloDerecho.y < rodillaDerecha.y - 0.10;
            return tobilloSube;
        }
        // Fase 1: talón IZQUIERDO al glúteo
        if (indiceFaseActual === 1) {
            const rodillaIzqVisible = rodillaIzquierda && rodillaIzquierda.visibility > 0.5;
            const tobilloIzqVisible  = tobilloIzquierdo && tobilloIzquierdo.visibility > 0.5;
            if (!rodillaIzqVisible || !tobilloIzqVisible) return false;
            const tobilloSube = tobilloIzquierdo.y < rodillaIzquierda.y - 0.10;
            return tobilloSube;
        }
    }

        // ===========================================================
        // EJERCICIO 9 – PANTORRILLAS Y TOBILLOS
    // ===========================================================
    else if (indiceEjercicioActual === 8) {
        // Fase 0: Puntillas (ambos talones se elevan → tobillos suben)
        if (indiceFaseActual === 0) {
            if (historialCodosY.length < 8) return false;
            // Usamos variación de los tobillos como proxy de movimiento vertical
            // (no tenemos landmark de talones directamente, usamos tobillos)
            const yTobillosRecientes = historialHombros.slice(-10).map(h => h.yIzq);
            const rangoY = Math.max(...yTobillosRecientes) - Math.min(...yTobillosRecientes);
            // Si los hombros suben y bajan (movimiento de puntillas) detectamos variación
            return rangoY > 0.015;
        }
        // Fase 1: Giro tobillo DERECHO (pie derecho en el aire)
        if (indiceFaseActual === 1) {
            const tobilloDerechoVisible = tobilloDerecho && tobilloDerecho.visibility > 0.4;
            if (!tobilloDerechoVisible) return false;
            // El pie derecho está en el aire si el tobillo derecho está más alto que el izquierdo
            const pieEnElAire = tobilloDerecho.y < tobilloIzquierdo.y - 0.05;
            return pieEnElAire;
        }
        // Fase 2: Giro tobillo IZQUIERDO (pie izquierdo en el aire)
        if (indiceFaseActual === 2) {
            const tobilloIzqVisible = tobilloIzquierdo && tobilloIzquierdo.visibility > 0.4;
            if (!tobilloIzqVisible) return false;
            const pieEnElAire = tobilloIzquierdo.y < tobilloDerecho.y - 0.05;
            return pieEnElAire;
        }
    }

        // ===========================================================
        // EJERCICIO 10 – DESCANSO VISUAL (regla 20-20-20)
        // Solo pide que el usuario esté quieto y con la cabeza neutral
    // ===========================================================
    else if (indiceEjercicioActual === 9) {
        const cabezaCentrada = Math.abs(nariz.x - hombroCentroX) < 0.10;
        const movimiento = Math.abs(nariz.x - ultimaPosicionNariz.x)
            + Math.abs(nariz.y - ultimaPosicionNariz.y);
        ultimaPosicionNariz = { x: nariz.x, y: nariz.y };
        // Quieto y mirando al frente
        return cabezaCentrada && movimiento < 0.015;
    }

    // Fallback: validación genérica anti-trampas
    const estaRecto   = Math.abs(nariz.x - hombroCentroX) < 0.08;
    const manosAbajo  = munecaIzquierda.y > hombroIzquierdo.y + 0.15
        && munecaDerecha.y   > hombroDerecho.y   + 0.15;
    const movimiento  = Math.abs(nariz.x - ultimaPosicionNariz.x)
        + Math.abs(nariz.y - ultimaPosicionNariz.y);
    ultimaPosicionNariz = { x: nariz.x, y: nariz.y };

    if (estaRecto && manosAbajo && movimiento < 0.008) return false;
    return true;
}

// --- 5. CONTROLADOR ---
function avanzarFaseOEjercicio() {
    const ejercicio = rutina[indiceEjercicioActual];
    indiceFaseActual++;

    if (indiceFaseActual < ejercicio.fases.length) {
        const nuevaFase = ejercicio.fases[indiceFaseActual];
        tiempoRestanteFase = nuevaFase.tiempo;
        exerciseDesc.innerText = nuevaFase.instruccion;
        // Limpiar historiales al cambiar de fase
        historialHombros = [];
        historialCodosY  = [];
        try { new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3').play(); } catch(e){}
    } else {
        finalizarEjercicio();
    }
}

function iniciarTemporizador() {
    btnStart.disabled = true;
    ejercicioActivo = true;
    tiempoUltimoFrame = Date.now();
    // Limpiar historiales al iniciar
    historialHombros = [];
    historialCodosY  = [];
    aiStatus.innerText = "🤖 Evaluando postura...";
}

function finalizarEjercicio() {
    ejercicioActivo = false;
    timerDisplay.innerText = "¡Listo!";
    exerciseDesc.innerText = "¡Excelente trabajo! Prepárate para el siguiente.";
    btnNext.disabled = false;
    aiStatus.className = "badge bg-info text-dark fs-5 p-2 shadow-sm";
    aiStatus.innerText = "Descansa un momento";

    try { new Audio('https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3').play(); } catch(e){}

    if (indiceEjercicioActual === rutina.length - 1) {
        btnNext.innerText = "Finalizar Pausa Activa 🏁";
        btnNext.classList.replace("btn-outline-primary", "btn-primary");
    }
}

function siguienteEjercicio() {
    indiceEjercicioActual++;
    indiceFaseActual = 0;

    if (indiceEjercicioActual >= rutina.length) {
        window.location.href = "/actividades/finalizar-pausa";
        return;
    }

    // Limpiar historiales al cambiar de ejercicio
    historialHombros = [];
    historialCodosY  = [];

    const ej = rutina[indiceEjercicioActual];
    const primeraFase = ej.fases[0];

    exerciseTitle.innerText = ej.titulo;
    exerciseDesc.innerText  = primeraFase.instruccion;
    exerciseImage.src       = ej.imagen;

    tiempoRestanteFase = primeraFase.tiempo;
    timerDisplay.innerText = tiempoRestanteFase + "s";

    const porcentaje = ((indiceEjercicioActual + 1) / rutina.length) * 100;
    document.getElementById("rutinaProgress").style.width = porcentaje + "%";
    document.getElementById("progresoTexto").innerText = `Ejercicio ${indiceEjercicioActual + 1} de ${rutina.length}`;

    btnStart.disabled  = false;
    btnNext.disabled   = true;
    aiStatus.className = "badge bg-secondary text-white fs-5 p-2 shadow-sm";
    aiStatus.innerText = "🤖 IA Esperando iniciar...";
}