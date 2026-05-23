document.addEventListener('DOMContentLoaded', () => {
    console.log("Monitor de RRHH iniciado...");

    // --- 1. ADVERTENCIA SALUD RRHH (5 min desde login) ---
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
        }, tiempoRestante);
    }

    // --- 2. MONITOREO DE PENDIENTES CADA 5 MINUTOS ---
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
        } catch (error) {
            console.error("Error al consultar pendientes:", error);
        }
    }, 5 * 60 * 1000);
});