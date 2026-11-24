import {HttpInterceptorFn} from '@angular/common/http';

const API_URL = 'https://sst-digital-app.onrender.com';

export const apiInterceptor: HttpInterceptorFn = (req, next) => {

    const rutasBackend = [
        '/api/',
        '/login',
        '/logout',
        '/actividades'
    ];

    const esPeticionBackend = rutasBackend.some(ruta =>
        req.url.startsWith(ruta)
    );

    if (!esPeticionBackend) {
        return next(req);
    }

    const request = req.clone({
        url: `${API_URL}${req.url}`,
        withCredentials: true
    });

    return next(request);
};
