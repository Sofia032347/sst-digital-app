document.addEventListener('DOMContentLoaded', () => {
    console.log("Monitor de RRHH iniciado...");
    const btn = document.getElementById('btnAccionPausa');

    // Pedir permiso de notificaciones al cargar
    if (window.Notification && Notification.permission !== "granted") {
        Notification.requestPermission();
    }

    // --- FUNCIÓN UNIFICADA DE NOTIFICACIÓN ---
    function dispararNotificacionSalud() {
        try {
            new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3').play();
        } catch(e) {}

        if (Notification.permission === "granted") {
            new Notification("🕒 ¡Hora de tu Pausa Activa!", {
                body: "Han pasado 5 minutos desde tu ingreso. Cuida tu salud y estira un poco.",
                icon: "/img/cuello1.jpeg"
            });
        }

        if (!localStorage.getItem('alertaMostradaHoy')) {
            Swal.fire({
                title: '¡Aviso de Salud!',
                text: 'Han pasado 5 minutos desde su ingreso. Es momento de realizar su pausa activa.',
                icon: 'warning',
                confirmButtonColor: '#f89406',
                confirmButtonText: 'Entendido'
            }).then(() => {
                localStorage.setItem('alertaMostradaHoy', 'true');
            });
        }
    }

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
                btn.innerHTML = '<i class="bi bi-play-fill"></i> Iniciar mi Pausa Activa';
                btn.style.pointerEvents = "auto";
            } else if (data.estado === "ESPERANDO") {
                btn.className = "btn btn-outline-secondary disabled";
                btn.innerHTML = `<i class="bi bi-clock"></i> Disponible en ${data.faltan} min`;
                btn.style.pointerEvents = "none";
            }
        } catch (error) { console.error(error); }
    }

    const horaLoginStr = document.getElementById('horaLoginInput').value;
    if (horaLoginStr) {
        const horaLogin = new Date(horaLoginStr);
        const tiempoRestante = Math.max(0, (5 * 60 * 1000) - (new Date() - horaLogin));

        setTimeout(() => {
            dispararNotificacionSalud();
            actualizarBotonRRHH();
        }, tiempoRestante);
    }

    setInterval(async () => {
        try {
            const response = await fetch('/actividades/api/pendientes-hoy');
            const pendientes = await response.json();
            if (pendientes.length > 0) {
                Swal.fire({
                    toast: true, position: 'top-end', icon: 'info', title: 'Recordatorio',
                    text: `Hay ${pendientes.length} empleados pendientes.`,
                    showConfirmButton: false, timer: 6000, timerProgressBar: true
                });
            }
            actualizarBotonRRHH();
        } catch (error) { console.error(error); }
    }, 5 * 60 * 1000);

    actualizarBotonRRHH();
});

document.getElementById('formLogout')?.addEventListener('submit', () => {
    localStorage.removeItem('alertaMostradaHoy');
});