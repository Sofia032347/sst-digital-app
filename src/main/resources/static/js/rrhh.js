document.addEventListener('DOMContentLoaded', () => {
    console.log("Monitor de RRHH iniciado...");

    const btn = document.getElementById('btnAccionPausa');

    // --- 1. FUNCIÓN PARA CONTROLAR EL ESTADO DEL BOTÓN PROPIO ---
    async function actualizarBotonRRHH() {
        try {
            const response = await fetch('/actividades/estado-boton');
            const data = await response.json();

            if (data.estado === "BLOQUEADO_COMPLETO") {
                btn.className = "btn btn-secondary disabled";
                btn.innerHTML = '<i class="bi bi-check-circle"></i> Pausa Cumplida';
                btn.style.pointerEvents = "none";
            } else if (data.estado === "REANUDAR") {
                btn.className = "btn btn-warning shadow-sm";
                btn.innerHTML = '<i class="bi bi-play-circle"></i> Reanudar Pausa';
                btn.style.pointerEvents = "auto";
            } else if (data.estado === "DISPONIBLE") {
                btn.className = "btn btn-pausa"; // Clase original de tu CSS
                btn.innerHTML = '<i class="bi bi-play-fill"></i> Iniciar mi Pausa Activa';
                btn.style.pointerEvents = "auto";
            } else if (data.estado === "ESPERANDO") {
                btn.className = "btn btn-outline-secondary disabled";
                btn.innerHTML = `<i class="bi bi-clock"></i> Disponible en ${data.faltan} min`;
                btn.style.pointerEvents = "none";
            }
        } catch (error) {
            console.error("Error al chequear estado del botón:", error);
        }
    }

    // --- 2. ADVERTENCIA SALUD RRHH (Advertencia visual) ---
    const horaLoginStr = document.getElementById('horaLoginInput').value;
    if (horaLoginStr) {
        const horaLogin = new Date(horaLoginStr);
        const ahora = new Date();
        const diferenciaMs = ahora - horaLogin;
        const cincoMinutosMs = 5 * 60 * 1000;
        const tiempoRestante = Math.max(0, cincoMinutosMs - diferenciaMs);

        setTimeout(() => {
            Swal.fire({
                title: '¡Aviso de Salud!',
                text: 'Han pasado 5 minutos desde su ingreso. Recuerde que usted también debe realizar su pausa activa hoy.',
                icon: 'warning',
                confirmButtonColor: '#f89406',
                confirmButtonText: 'Entendido'
            });
            actualizarBotonRRHH(); // Re-chequear para activar botón
        }, tiempoRestante);
    }

    // --- 3. MONITOREO DE PENDIENTES (Notificaciones Toast) ---
    setInterval(async () => {
        try {
            const response = await fetch('/actividades/api/pendientes-hoy');
            const pendientes = await response.json();

            if (pendientes.length > 0) {
                Swal.fire({
                    toast: true,
                    position: 'top-end',
                    icon: 'info',
                    title: 'Recordatorio',
                    text: `Hay ${pendientes.length} empleados que aún no hacen su pausa.`,
                    showConfirmButton: false,
                    timer: 6000,
                    timerProgressBar: true
                });
            }
            actualizarBotonRRHH(); // Actualizar botón también aquí
        } catch (error) {
            console.error("Error al consultar pendientes:", error);
        }
    }, 5 * 60 * 1000);

    // Ejecución inicial
    actualizarBotonRRHH();
});