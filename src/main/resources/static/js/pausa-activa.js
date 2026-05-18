// --- 1. RUTINA DIVIDIDA EN FASES ---
const rutina = [
    {
        titulo: "1. Cuello: Relajación lateral y frontal",
        fases: [
            { instruccion: "Inclina la cabeza suavemente hacia la DERECHA intentando tocar el hombro con la oreja. Sostén.", tiempo: 15, imagen: "/img/cuello1.jpeg" },
            { instruccion: "Inclina la cabeza suavemente hacia la IZQUIERDA intentando tocar el hombro con la oreja. Sostén.", tiempo: 15, imagen: "/img/cuello1.jpeg" },
            { instruccion: "Lleva la barbilla al PECHO por 15 segundos.", tiempo: 15, imagen: "/img/cuello2.jpeg" },
            { instruccion: "Mira hacia el TECHO por otros 15 segundos.", tiempo: 15, imagen: "/img/cuello2.jpeg" }
        ],
        imagen: "/img/cuello1.jpeg"
    },
    {
        titulo: "2. Hombros: Círculos liberadores",
        fases: [
            { instruccion: "Con los brazos sueltos, haz círculos amplios con los hombros hacia ATRÁS.", tiempo: 30, imagen: "/img/hombros1.jpeg" },
            { instruccion: "Cambia la dirección y haz círculos con los hombros hacia ADELANTE.", tiempo: 30, imagen: "/img/hombros2.jpeg" }
        ],
        imagen: "/img/hombros1.jpeg"
    },
    {
        titulo: "3. Hombros y Brazos: Estiramiento de tríceps",
        fases: [
            { instruccion: "Pasa el brazo DERECHO por arriba y el IZQUIERDO por abajo, intentando tocar tus manos en la espalda.", tiempo: 30, imagen: "/img/estiramiento.jpeg" },
            { instruccion: "Pasa el brazo IZQUIERDO por arriba y el DERECHO por abajo, intentando tocar tus manos en la espalda.", tiempo: 30, imagen: "/img/estiramiento.jpeg" }
        ],
        imagen: "/img/estiramiento.jpeg"
    },
    {
        titulo: "4. Espalda Alta: Estiramiento frontal",
        fases: [
            { instruccion: "Entrelaza manos al frente, palmas hacia afuera, y empuja hacia adelante encorvando ligeramente la espalda alta.", tiempo: 30 }
        ],
        imagen: "/img/espalda2.jpeg"
    },
    {
        titulo: "5. Muñecas y Antebrazos: Flexión y extensión",
        fases: [
            { instruccion: "Brazo DERECHO ESTIRADO al frente: Tira suavemente de los dedos hacia ABAJO con la mano izquierda.", tiempo: 15, imagen: "/img/brazoderecho1.jpeg" },
            { instruccion: "Brazo DERECHO ESTIRADO al frente: Apunta los dedos hacia ARRIBA y empújalos hacia ti.", tiempo: 15, imagen: "/img/brazoderecho2.jpeg"},
            { instruccion: "Brazo IZQUIERDO ESTIRADO al frente: Tira suavemente de los dedos hacia ABAJO con la mano derecha.", tiempo: 15, imagen: "/img/brazoizquierdo1.jpeg" },
            { instruccion: "Brazo IZQUIERDO ESTIRADO al frente: Apunta los dedos hacia ARRIBA y empújalos hacia ti.", tiempo: 15, imagen: "/img/brazoizquierdo2.jpeg"}
        ],
        imagen: "/img/.jpeg"
    },
    {
        titulo: "6. Tronco: Giro espinal",
        fases: [
            { instruccion: "Sentado, gira el torso a la DERECHA y toca tu hombro derecho con la mano izquierda.", tiempo: 30 },
            { instruccion: "Gira el torso a la IZQUIERDA y toca tu hombro izquierdo con la mano derecha.", tiempo: 30 }
        ],
        imagen: "/img/.jpeg"
    },
    {
        titulo: "7. Espalda Baja: Estiramiento lateral",
        fases: [
            { instruccion: "Levanta el brazo DERECHO por encima de la cabeza y flexiona el tronco hacia el lado izquierdo suavemente.", tiempo: 30 },
            { instruccion: "Levanta el brazo IZQUIERDO por encima de la cabeza y flexiona el tronco hacia el lado derecho suavemente.", tiempo: 30 }
        ],
        imagen: "/img/.jpeg"
    },
    {
        titulo: "8. Piernas: Estiramiento de Cuádriceps",
        fases: [
            { instruccion: "De pie, dobla la rodilla DERECHA llevando el talón al glúteo. Mantén el equilibrio.", tiempo: 30 },
            { instruccion: "De pie, dobla la rodilla IZQUIERDA llevando el talón al glúteo. Mantén el equilibrio.", tiempo: 30 }
        ],
        imagen: "/img/.jpeg"
    },
    {
        titulo: "9. Pantorrillas y Tobillos: Elevaciones y rotaciones",
        fases: [
            { instruccion: "De pie, ponte de puntillas lentamente y vuelve a bajar (repite varias veces).", tiempo: 30 },
            { instruccion: "Levanta el pie DERECHO del suelo: Haz giros con el tobillo.", tiempo: 15 },
            { instruccion: "Levanta el pie IZQUIERDO del suelo: Haz giros con el tobillo.", tiempo: 15}
        ],
        imagen: "/img/.jpeg"
    },
    {
        titulo: "10. Ojos y Mente: Relajación profunda",
        fases: [
            { instruccion: "Cubre tus ojos con las palmas de tus manos sin presionar para bloquear la luz.", tiempo: 20 },
            { instruccion: "Masajea suavemente tus sienes (los lados de tu cabeza) haciendo círculos.", tiempo: 20 },
            { instruccion: "Baja las manos, relaja los hombros y respira profundo.", tiempo: 20 }
        ],
        imagen: "/img/.jpeg"
    }
];

// --- 2. VARIABLES GLOBALES DE CONTROL ---
let indiceEjercicioActual = 0;
let indiceFaseActual = 0;
let tiempoRestanteFase = 0;
let ejercicioActivo = false;
let tiempoUltimoFrame = Date.now();

let ultimaPosicionNariz = { x: 0, y: 0 };
let ultimaPosicionPie = { x: 0, y: 0 };

const HISTORIAL_MAX = 45;
let historialHombros = [];
let historialCodosY = [];

// --- CONFIGURACIÓN DEL RECORDATORIO (NUEVO) ---
// 5 minutos para simulación (En producción cambiar a: 2 * 60 * 60 * 1000)
const TIEMPO_RECORDATORIO = 5 * 60 * 1000;

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

// --- 3. CONFIGURACIÓN IA ---
const pose = new Pose({ locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}` });
pose.setOptions({ modelComplexity: 1, smoothLandmarks: true, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });
pose.onResults(evaluarPosturaYDibujar);

const camera = new Camera(video, { onFrame: async () => { await pose.send({ image: video }); }, width: 640, height: 480 });

// --- LÓGICA DE RECORDATORIOS (NUEVO) ---
function iniciarTemporizadorRecordatorio() {
    setInterval(() => {
        // Solo envía la alerta si el usuario NO está ejecutando la rutina actualmente
        if (!ejercicioActivo) {
            enviarAlertaPausaActiva();
        }
    }, TIEMPO_RECORDATORIO);
}

function enviarAlertaPausaActiva() {
    // Intentar reproducir sonido de atención
    try {
        new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3').play();
    } catch(e){}

    // Si hay permisos de notificación del sistema, enviamos un globo flotante
    if (Notification.permission === "granted") {
        new Notification("🕒 ¡Hora de tu Pausa Activa!", {
            body: "Llevas mucho tiempo trabajando. Dedica unos minutos a estirar tu cuerpo y descansar la vista.",
            icon: "/img/cuello1.jpeg"
        });
    } else {
        // Respaldo clásico si el navegador no soporta o rechazó las notificaciones directas
        alert("🕒 [RECORDATORIO] ¡Es momento de tu pausa activa de bienestar! Levántate de la silla y estira.");
    }
}

document.addEventListener("DOMContentLoaded", () => {
    // Solicitar permisos de notificación flotante al iniciar
    if (window.Notification && Notification.permission !== "granted" && Notification.permission !== "denied") {
        Notification.requestPermission();
    }

    // Arrancar el reloj de fondo de 5 minutos
    iniciarTemporizadorRecordatorio();

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

    canvasCtx.translate(canvasElement.width, 0);
    canvasCtx.scale(-1, 1);

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

    actualizarHistoriales(results.poseLandmarks);

    let posturaCorrecta = validarMovimientoEspecifico(results.poseLandmarks);

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

function actualizarHistoriales(puntos) {
    const hombroIzquierdo = puntos[11];
    const hombroDerecho  = puntos[12];
    const codoIzquierdo  = puntos[13];
    const codoDerecho    = puntos[14];

    historialHombros.push({
        yIzq: hombroIzquierdo.y,
        yDer: hombroDerecho.y,
        ts: Date.now()
    });
    if (historialHombros.length > HISTORIAL_MAX) historialHombros.shift();

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
    const nariz            = puntos[0];
    const orejaIzquierda   = puntos[7];
    const orejaDerecha     = puntos[8];
    const hombroIzquierdo  = puntos[11];
    const hombroDerecho    = puntos[12];
    const codoIzquierdo    = puntos[13];
    const codoDerecho      = puntos[14];
    const munecaIzquierda  = puntos[15];
    const munecaDerecha    = puntos[16];
    const rodillaDerecha   = puntos[26];
    const rodillaIzquierda = puntos[25];
    const tobilloDerecho   = puntos[28];
    const tobilloIzquierdo = puntos[27];

    const pieIzquierdo     = puntos[31] || tobilloIzquierdo;
    const pieDerecho       = puntos[32] || tobilloDerecho;

    const hombroCentroX = (hombroIzquierdo.x + hombroDerecho.x) / 2;
    const hombroCentroY = (hombroIzquierdo.y + hombroDerecho.y) / 2;

    if (indiceEjercicioActual === 0) {
        if (indiceFaseActual === 0) return orejaDerecha.y > orejaIzquierda.y + 0.06;
        if (indiceFaseActual === 1) return orejaIzquierda.y > orejaDerecha.y + 0.06;
        if (indiceFaseActual === 2) return nariz.y > hombroCentroY - 0.10;
        if (indiceFaseActual === 3) return nariz.y < hombroCentroY - 0.30;
    }
    else if (indiceEjercicioActual === 1) {
        if (historialHombros.length < 20) return false;
        const yPromedio = historialHombros.map(h => (h.yIzq + h.yDer) / 2);
        const rangoY = Math.max(...yPromedio) - Math.min(...yPromedio);
        if (rangoY < 0.012) return false;

        const PASO = 5;
        const UMBRAL_DELTA = 0.008;
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
        return inversiones >= 2;
    }
    else if (indiceEjercicioActual === 2) {
        if (indiceFaseActual === 0) {
            const codoDerAlto = codoDerecho.y < hombroDerecho.y + 0.1;
            const munecaIzqBaja = munecaIzquierda.y > hombroIzquierdo.y;
            const munecaIzqHaciaCentro = Math.abs(munecaIzquierda.x - hombroCentroX) < 0.25;
            return codoDerAlto && munecaIzqBaja && munecaIzqHaciaCentro;
        }
        if (indiceFaseActual === 1) {
            const codoIzqAlto = codoIzquierdo.y < hombroIzquierdo.y + 0.1;
            const munecaDerBaja = munecaDerecha.y > hombroDerecho.y;
            const munecaDerHaciaCentro = Math.abs(munecaDerecha.x - hombroCentroX) < 0.25;
            return codoIzqAlto && munecaDerBaja && munecaDerHaciaCentro;
        }
    }
    else if (indiceEjercicioActual === 3) {
        const manosAlFrenteX = Math.abs(munecaIzquierda.x - munecaDerecha.x) < 0.20;
        const manosAlturaHombros = munecaIzquierda.y < hombroIzquierdo.y + 0.15
            && munecaIzquierda.y > hombroIzquierdo.y - 0.25
            && munecaDerecha.y   < hombroDerecho.y   + 0.15
            && munecaDerecha.y   > hombroDerecho.y   - 0.25;

        const distHombros = Math.abs(hombroIzquierdo.x - hombroDerecho.x);
        const hombrosCurvados = distHombros < 0.35;
        return manosAlFrenteX && manosAlturaHombros && hombrosCurvados;
    }
    else if (indiceEjercicioActual === 4) {
        const dedoDerecho = puntos[20] || munecaDerecha;
        const dedoIzquierdo = puntos[19] || munecaIzquierda;

        if (indiceFaseActual === 0 || indiceFaseActual === 1) {
            const brazoLevantado = Math.abs(munecaDerecha.y - hombroDerecho.y) < 0.25;
            const manosJuntas = Math.abs(munecaIzquierda.x - munecaDerecha.x) < 0.25;
            if (indiceFaseActual === 0) return brazoLevantado && manosJuntas && (dedoDerecho.y > munecaDerecha.y);
            if (indiceFaseActual === 1) return brazoLevantado && manosJuntas && (dedoDerecho.y < munecaDerecha.y);
        }

        if (indiceFaseActual === 2 || indiceFaseActual === 3) {
            const brazoLevantado = Math.abs(munecaIzquierda.y - hombroIzquierdo.y) < 0.25;
            const manosJuntas = Math.abs(munecaDerecha.x - munecaIzquierda.x) < 0.25;
            if (indiceFaseActual === 2) return brazoLevantado && manosJuntas && (dedoIzquierdo.y > munecaIzquierda.y);
            if (indiceFaseActual === 3) return brazoLevantado && manosJuntas && (dedoIzquierdo.y < munecaIzquierda.y);
        }
    }
    else if (indiceEjercicioActual === 5) {
        const distHombros = Math.abs(hombroIzquierdo.x - hombroDerecho.x);
        const hombrosGirados = distHombros < 0.30;

        if (indiceFaseActual === 0) {
            const mirandoDerecha = nariz.x > hombroCentroX + 0.05;
            const manoIzqEnHombroDer = Math.abs(munecaIzquierda.x - hombroDerecho.x) < 0.25 && Math.abs(munecaIzquierda.y - hombroDerecho.y) < 0.25;
            return (hombrosGirados || mirandoDerecha) && manoIzqEnHombroDer;
        }
        if (indiceFaseActual === 1) {
            const mirandoIzquierda = nariz.x < hombroCentroX - 0.05;
            const manoDerEnHombroIzq = Math.abs(munecaDerecha.x - hombroIzquierdo.x) < 0.25 && Math.abs(munecaDerecha.y - hombroIzquierdo.y) < 0.25;
            return (hombrosGirados || mirandoIzquierda) && manoDerEnHombroIzq;
        }
    }
    else if (indiceEjercicioActual === 6) {
        if (indiceFaseActual === 0) {
            const brazoDerArriba = munecaDerecha.y < hombroDerecho.y - 0.15;
            const troncoInclinaIzq = hombroIzquierdo.y > hombroDerecho.y + 0.06;
            return brazoDerArriba && troncoInclinaIzq;
        }
        if (indiceFaseActual === 1) {
            const brazoIzqArriba = munecaIzquierda.y < hombroIzquierdo.y - 0.15;
            const troncoInclinaDer = hombroDerecho.y > hombroIzquierdo.y + 0.06;
            return brazoIzqArriba && troncoInclinaDer;
        }
    }
    else if (indiceEjercicioActual === 7) {
        if (indiceFaseActual === 0) {
            const rodillaDerechaVisible = rodillaDerecha && rodillaDerecha.visibility > 0.5;
            const tobilloDerechoVisible = tobilloDerecho && tobilloDerecho.visibility > 0.5;
            if (!rodillaDerechaVisible || !tobilloDerechoVisible) return false;
            return tobilloDerecho.y < rodillaDerecha.y - 0.10;
        }
        if (indiceFaseActual === 1) {
            const rodillaIzqVisible = rodillaIzquierda && rodillaIzquierda.visibility > 0.5;
            const tobilloIzqVisible  = tobilloIzquierdo && tobilloIzquierdo.visibility > 0.5;
            if (!rodillaIzqVisible || !tobilloIzqVisible) return false;
            return tobilloIzquierdo.y < rodillaIzquierda.y - 0.10;
        }
    }
    else if (indiceEjercicioActual === 8) {
        if (indiceFaseActual === 0) {
            if (historialCodosY.length < 8) return false;
            const yTobillosRecientes = historialHombros.slice(-10).map(h => h.yIzq);
            const rangoY = Math.max(...yTobillosRecientes) - Math.min(...yTobillosRecientes);
            return rangoY > 0.015;
        }
        if (indiceFaseActual === 1) {
            const tobilloVisible = tobilloDerecho && tobilloDerecho.visibility > 0.4;
            if (!tobilloVisible) return false;

            const pieElevado = tobilloDerecho.y < tobilloIzquierdo.y - 0.03;
            const mov = Math.abs(pieDerecho.x - ultimaPosicionPie.x) + Math.abs(pieDerecho.y - ultimaPosicionPie.y);
            ultimaPosicionPie = { x: pieDerecho.x, y: pieDerecho.y };

            return pieElevado && mov > 0.002;
        }
        if (indiceFaseActual === 2) {
            const tobilloVisible = tobilloIzquierdo && tobilloIzquierdo.visibility > 0.4;
            if (!tobilloVisible) return false;

            const pieElevado = tobilloIzquierdo.y < tobilloDerecho.y - 0.03;
            const mov = Math.abs(pieIzquierdo.x - ultimaPosicionPie.x) + Math.abs(pieIzquierdo.y - ultimaPosicionPie.y);
            ultimaPosicionPie = { x: pieIzquierdo.x, y: pieIzquierdo.y };

            return pieElevado && mov > 0.002;
        }
    }
    else if (indiceEjercicioActual === 9) {
        if (indiceFaseActual === 0) {
            return Math.abs(munecaDerecha.y - nariz.y) < 0.15 &&
                Math.abs(munecaIzquierda.y - nariz.y) < 0.15 &&
                Math.abs(munecaDerecha.x - munecaIzquierda.x) < 0.22;
        }
        if (indiceFaseActual === 1) {
            return Math.abs(munecaDerecha.x - orejaDerecha.x) < 0.15 &&
                Math.abs(munecaIzquierda.x - orejaIzquierda.x) < 0.15;
        }
        if (indiceFaseActual === 2) {
            const movimiento = Math.abs(nariz.x - ultimaPosicionNariz.x) + Math.abs(nariz.y - ultimaPosicionNariz.y);
            ultimaPosicionNariz = { x: nariz.x, y: nariz.y };
            return munecaDerecha.y > hombroDerecho.y + 0.1 && movimiento < 0.010;
        }
    }

    const estaRecto   = Math.abs(nariz.x - hombroCentroX) < 0.08;
    const movimiento  = Math.abs(nariz.x - ultimaPosicionNariz.x) + Math.abs(nariz.y - ultimaPosicionNariz.y);
    ultimaPosicionNariz = { x: nariz.x, y: nariz.y };

    if (estaRecto && movimiento < 0.008) return false;
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

        if (nuevaFase.imagen) {
            exerciseImage.src = nuevaFase.imagen;
        } else if (ejercicio.imagen) {
            exerciseImage.src = ejercicio.imagen;
        }

        historialHombros = [];
        historialCodosY  = [];
        try { new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3').play(); } catch(e){}
    } else {
        finalizarEjercicio();
    }
}

function iniciarTemporizador() {
    btnStart.disabled = true;

    const ej = rutina[indiceEjercicioActual];
    const fase = ej.fases[indiceFaseActual];

    exerciseTitle.innerText = ej.titulo;
    exerciseDesc.innerText = fase.instruccion;

    document.getElementById("progresoTexto").innerText = `Ejercicio ${indiceEjercicioActual + 1} de ${rutina.length}`;

    if (fase.imagen) {
        exerciseImage.src = fase.imagen;
    } else if (ej.imagen) {
        exerciseImage.src = ej.imagen;
    }

    tiempoRestanteFase = fase.tiempo;
    if (timerDisplay) timerDisplay.innerText = tiempoRestanteFase + "s";

    ejercicioActivo = true;
    tiempoUltimoFrame = Date.now();
    historialHombros = [];
    historialCodosY  = [];

    aiStatus.className = "badge bg-info text-dark fs-5 p-2 shadow-sm";
    aiStatus.innerText = "🤖 Evaluando postura...";
}

// Al finalizar se desactiva "ejercicioActivo" permitiendo que el recordatorio de 5 min vuelva a evaluar en el futuro
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

    historialHombros = [];
    historialCodosY  = [];

    const ej = rutina[indiceEjercicioActual];
    const primeraFase = ej.fases[0];

    exerciseTitle.innerText = ej.titulo;
    exerciseDesc.innerText  = primeraFase.instruccion;

    if (primeraFase.imagen) {
        exerciseImage.src = primeraFase.imagen;
    } else if (ej.imagen) {
        exerciseImage.src = ej.imagen;
    }

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