document.addEventListener('DOMContentLoaded', () => {
    console.log("Monitor de Empleado (Modo Demo) iniciado...");
    const btn = document.getElementById('btnAccionPausa');
    const horaLoginInput = document.getElementById('horaLoginInput');

    // 1. Permiso de notificaciones
    if (window.Notification && Notification.permission !== "granted") {
        Notification.requestPermission();
    }

    // --- FUNCIÓN DE ALERTA PARA EL EMPLEADO ---
    function dispararAlertaEmpleado() {
        // Sonido
        try {
            new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3').play();
        } catch(e) {}

        // Notificación de Escritorio
        if (Notification.permission === "granted") {
            new Notification("🕒 ¡Es hora de moverse!", {
                body: "Simulación: Han pasado 5 minutos de actividad. Inicie su pausa activa.",
                icon: "/img/cuello1.jpeg"
            });
        }

        Swal.fire({
            title: '¡Es hora de moverse!',
            text: 'Se ha cumplido el tiempo de actividad. Cuida tu salud con una pausa activa.',
            icon: 'info',
            showCancelButton: true,
            confirmButtonColor: '#198754',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Iniciar ahora',
            cancelButtonText: 'Omitir (2 min)',
            allowOutsideClick: false
        }).then((result) => {
            if (result.isConfirmed) {
                // Si el botón está en "REANUDAR" o "DISPONIBLE", podemos redirigir
                window.location.href = '/actividades/pausa-activa';
            } else {
                // SI OMITE: Volver a verificar en 2 minutos
                console.log("Empleado omitió pausa. Reintentando en 2 minutos...");
                setTimeout(verificarCicloPausa, 2 * 60 * 1000);
            }
        });
    }

    // --- CONSULTA SI TOCA PAUSA (CADA 5 MIN TRAS COMPLETAR) ---
    async function verificarCicloPausa() {
        try {
            const res = await fetch('/actividades/api/pendientes-hoy');
            const pendientes = await res.json();

            // Verificamos si este empleado específico está en la lista de pendientes
            // Nota: El backend ahora retorna "pendiente" si pasaron 5 min desde la última completada
            if (pendientes.length > 0) {
                dispararAlertaEmpleado();
            } else {
                // Si no es hora, revisar cada 30 segundos para la demo
                setTimeout(verificarCicloPausa, 30000);
            }
        } catch (e) { console.error("Error consultando ciclo:", e); }
    }

    // --- CHEQUEAR ESTADO DEL BOTÓN ---
    async function chequearBoton() {
        try {
            const response = await fetch('/actividades/estado-boton');
            const data = await response.json();
            if (!btn) return;

            if (data.estado === "BLOQUEADO_COMPLETO") {
                btn.className = "btn btn-secondary btn-lg mt-4 disabled";
                btn.innerHTML = '<i class="bi bi-check-all"></i> Pausa Completada';
            } else if (data.estado === "REANUDAR") {
                btn.className = "btn btn-warning btn-lg mt-4 shadow";
                btn.innerHTML = '<i class="bi bi-play-circle"></i> Reanudar Pausa';
            } else if (data.estado === "DISPONIBLE") {
                btn.className = "btn btn-success btn-lg mt-4 shadow";
                btn.innerHTML = '<i class="bi bi-play-fill"></i> Iniciar Pausa Activa';
            } else {
                btn.className = "btn btn-light btn-lg mt-4 disabled";
                btn.innerHTML = `<i class="bi bi-clock"></i> Disponible en ${data.faltan} min`;
            }
        } catch (error) { console.error(error); }
    }

    // --- INICIO DE LÓGICA ---

    // 1. Espera inicial de 5 minutos al loguearse por primera vez
    if (horaLoginInput && horaLoginInput.value) {
        const horaLogin = new Date(horaLoginInput.value);
        const esperaInicial = Math.max(0, (5 * 60 * 1000) - (new Date() - horaLogin));

        setTimeout(() => {
            verificarCicloPausa();
            chequearBoton();
        }, esperaInicial);
    }

    // 2. Mantener el botón actualizado cada 30 segundos
    chequearBoton();
    setInterval(chequearBoton, 30000);
});

// Limpiar localStorage al cerrar sesión
document.getElementById('formLogout')?.addEventListener('submit', () => {
    localStorage.removeItem('alertaMostradaHoy');
});