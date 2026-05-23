document.addEventListener('DOMContentLoaded', () => {
    console.log("Monitor de RRHH (Modo Demo) iniciado...");
    const btn = document.getElementById('btnAccionPausa');
    const horaLoginInput = document.getElementById('horaLoginInput');

    // 1. Permiso de notificaciones al cargar
    if (window.Notification && Notification.permission !== "granted") {
        Notification.requestPermission();
    }

    // --- FUNCIÓN DE ALERTA (CON OPCIÓN OMITIR) ---
    function dispararNotificacionSalud() {
        // Sonido de alerta
        try {
            new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3').play();
        } catch(e) {}

        // Notificación de Escritorio
        if (Notification.permission === "granted") {
            new Notification("🕒 ¡Hora de tu Pausa Activa!", {
                body: "Simulación: Es momento de estirar (Ciclo de 5 min detectado).",
                icon: "/img/cuello1.jpeg"
            });
        }

        Swal.fire({
            title: '¡Aviso de Salud!',
            text: 'Es momento de realizar su pausa activa periódica.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#f89406',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Iniciar ahora',
            cancelButtonText: 'Omitir (2 min)',
            allowOutsideClick: false
        }).then((result) => {
            if (result.isConfirmed) {
                window.location.href = '/actividades/pausa-activa';
            } else {
                // SI OMITE: Vuelve a preguntar en 2 minutos reales
                console.log("Pausa omitida. Reintentando en 2 minutos...");
                setTimeout(verificarSiTocaPausa, 2 * 60 * 1000);
            }
        });
    }

    // --- CONSULTA AL BACKEND PARA LA ALERTA ---
    async function verificarSiTocaPausa() {
        try {
            const response = await fetch('/actividades/api/pendientes-hoy');
            const pendientes = await response.json();

            // Para la demo, el encargado de RRHH también recibe alertas
            // Solo disparamos si el controller dice que ya pasaron los 5 min de simulación
            if (pendientes.length > 0) {
                dispararNotificacionSalud();
            } else {
                // Si aún no toca, revisar cada 30 segundos
                setTimeout(verificarSiTocaPausa, 30000);
            }
        } catch (error) { console.error("Error consultando pendientes:", error); }
    }

    // --- ACTUALIZAR BOTÓN RRHH ---
    async function actualizarBotonRRHH() {
        try {
            const response = await fetch('/actividades/estado-boton');
            const data = await response.json();
            if (!btn) return;

            if (data.estado === "BLOQUEADO_COMPLETO") {
                btn.className = "btn btn-secondary disabled";
                btn.innerHTML = '<i class="bi bi-check-circle"></i> Pausa Cumplida';
                btn.style.pointerEvents = "none";
            } else if (data.estado === "REANUDAR") {
                btn.className = "btn btn-warning shadow-sm";
                btn.innerHTML = '<i class="bi bi-play-circle"></i> Reanudar Pausa';
                btn.style.pointerEvents = "auto";
            } else if (data.estado === "DISPONIBLE") {
                btn.className = "btn btn-pausa";
                btn.innerHTML = '<i class="bi bi-play-fill"></i> Iniciar mi Pausa Activa (RRHH)';
                btn.style.pointerEvents = "auto";
            } else if (data.estado === "ESPERANDO") {
                btn.className = "btn btn-outline-secondary disabled";
                btn.innerHTML = `<i class="bi bi-clock"></i> Disponible en ${data.faltan} min`;
                btn.style.pointerEvents = "none";
            }
        } catch (error) { console.error(error); }
    }

    // --- LÓGICA DE TIEMPOS ---

    // 1. Verificación inicial basada en el Login (Los primeros 5 min simulados)
    if (horaLoginInput && horaLoginInput.value) {
        const horaLogin = new Date(horaLoginInput.value);
        const tiempoRestante = Math.max(0, (5 * 60 * 1000) - (new Date() - horaLogin));

        setTimeout(() => {
            verificarSiTocaPausa();
            actualizarBotonRRHH();
        }, tiempoRestante);
    }

    // 2. Notificación Toast de otros empleados (Cada 5 min para la demo)
    setInterval(async () => {
        try {
            const response = await fetch('/actividades/api/pendientes-hoy');
            const pendientes = await response.json();
            if (pendientes.length > 0) {
                Swal.fire({
                    toast: true, position: 'top-end', icon: 'info', title: 'Alerta Global',
                    text: `Hay ${pendientes.length} empleados sin pausas.`,
                    showConfirmButton: false, timer: 6000, timerProgressBar: true
                });
            }
        } catch (error) { console.error(error); }
    }, 5 * 60 * 1000);

    // 3. Mantener botón actualizado constantemente
    actualizarBotonRRHH();
    setInterval(actualizarBotonRRHH, 15000);
});

// Reset de la alerta al cerrar sesión
document.getElementById('formLogout')?.addEventListener('submit', () => {
    localStorage.removeItem('alertaMostradaHoy');
});