
window.fetchConCsrf = function (url, opciones = {}) {

    const metodo = (opciones.method || "GET").toUpperCase();

    // Conserva las cabeceras originales de la petición.
    const headers = new Headers(opciones.headers);

    // Las peticiones que modifican datos necesitan CSRF.
    if (!["GET", "HEAD", "OPTIONS", "TRACE"].includes(metodo)) {

        const token = document.querySelector(
            'meta[name="_csrf"]'
        )?.content;

        const nombreHeader = document.querySelector(
            'meta[name="_csrf_header"]'
        )?.content;

        if (!token || !nombreHeader) {
            throw new Error(
                "No se encontró el token CSRF de la página."
            );
        }

        headers.set(nombreHeader, token);
    }

    // Realiza la petición conservando las opciones originales.
    return fetch(url, {
        ...opciones,
        headers: headers,
        credentials: "same-origin"
    });
};
