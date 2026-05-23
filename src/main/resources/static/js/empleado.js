async function chequearBoton() {
    const btn = document.getElementById('btnAccionPausa');
    const response = await fetch('/actividades/estado-boton');
    const data = await response.json();

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
}

document.addEventListener('DOMContentLoaded', () => {
    chequearBoton();
    setInterval(chequearBoton, 30000); // Revisa cada 30 seg
});