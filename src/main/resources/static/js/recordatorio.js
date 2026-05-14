// Configuración para la prueba (1 minuto)
const MINUTOS_PARA_RECORDATORIO = 1;

// 1. Pedir permiso al usuario nada más entrar a la página
document.addEventListener("DOMContentLoaded", () => {
    if ("Notification" in window) {
        if (Notification.permission !== "granted" && Notification.permission !== "denied") {
            Notification.requestPermission().then(permission => {
                if (permission === "granted") {
                    console.log("Permiso de notificaciones concedido.");
                }
            });
        }
    }
    iniciarContadorPausa();
});

function iniciarContadorPausa() {
    const milisegundos = MINUTOS_PARA_RECORDATORIO * 60 * 1000;
    console.log(`Recordatorio programado en ${MINUTOS_PARA_RECORDATORIO} minuto(s).`);

    setTimeout(() => {
        lanzarNotificacionSistema();
    }, milisegundos);
}

function lanzarNotificacionSistema() {
    const titulo = "⚠️ ¡Hora de tu Pausa Activa!";
    const opciones = {
        body: "Llevas mucho tiempo sentado. Haz clic aquí para empezar tus ejercicios.",
        icon: "https://cdn-icons-png.flaticon.com/512/3073/3073843.png", // Un icono bonito
        requireInteraction: true // Hace que la notificación no desaparezca sola rápido (en Windows)
    };

    // 2. Reproducir un sonido de alarma
    try {
        // Nota: El usuario debió haber hecho al menos un clic en la página antes,
        // o el navegador bloqueará el sonido por políticas de "Autoplay".
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
        audio.play();
    } catch (e) {
        console.log("El navegador bloqueó el sonido automático.");
    }

    // 3. Mostrar la notificación del sistema operativo
    if ("Notification" in window && Notification.permission === "granted") {
        const notificacion = new Notification(titulo, opciones);

        // Si el usuario hace clic en la notificación de Windows/Mac, lo lleva a la pausa activa
        notificacion.onclick = function() {
            window.location.href = "/pausa-activa"; // Asegúrate de que esta ruta sea la correcta de tu controlador
            window.focus(); // Intenta traer la pestaña al frente
        };
    } else {
        // Plan B: Si el usuario bloqueó las notificaciones, mostramos un simple alert o el Modal
        alert(titulo + "\n" + opciones.body);
    }
}