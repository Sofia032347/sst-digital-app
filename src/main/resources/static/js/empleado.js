document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('btnAccionPausa');

    if (window.Notification && Notification.permission !== "granted") {
        Notification.requestPermission();
    }

    function dispararNotificacionSalud() {
        try {
            new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3').play();
        } catch(e) {}

        if (Notification.permission === "granted") {
            new Notification("🕒 ¡Es hora de moverse!", {
                body: "Se han cumplido los 5 minutos de actividad. Inicie su pausa.",
                icon: "/img/cuello1.jpeg"
            });
        }

        if (!localStorage.getItem('alertaMostradaHoy')) {
            Swal.fire({
                title: '¡Es hora de moverse!',
                text: 'Se han cumplido los 5 minutos de actividad. Inicie su pausa activa.',
                icon: 'info',
                confirmButtonColor: '#198754'
            }).then(() => {
                localStorage.setItem('alertaMostradaHoy', 'true');
            });
        }
    }

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

    const horaLoginStr = document.getElementById('horaLoginInput')?.value;
    if (horaLoginStr) {
        const horaLogin = new Date(horaLoginStr);
        const tiempoRestante = Math.max(0, (5 * 60 * 1000) - (new Date() - horaLogin));

        setTimeout(() => {
            dispararNotificacionSalud();
            chequearBoton();
        }, tiempoRestante);
    }

    chequearBoton();
    setInterval(chequearBoton, 30000);
});

document.getElementById('formLogout')?.addEventListener('submit', () => {
    localStorage.removeItem('alertaMostradaHoy');
});