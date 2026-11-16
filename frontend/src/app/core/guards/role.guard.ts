import {inject} from '@angular/core';

import {CanActivateFn, Router} from '@angular/router';

import {catchError, map, of} from 'rxjs';

import {RolUsuario, RolUsuarioService} from '../services/rol-usuario.service';

export const roleGuard: CanActivateFn = route => {

    const rolService = inject(RolUsuarioService);
    const router = inject(Router);

    const permitidos =
        (route.data['roles'] ?? []) as RolUsuario[];

    return rolService.obtenerUsuarioActual().pipe(
        map(usuario => {

            // No hay sesión.
            if (!usuario.autenticado) {
                return router.createUrlTree(['/signin']);
            }

            // Tiene el rol requerido.
            if (permitidos.includes(usuario.rol)) {
                return true;
            }

            // Tiene sesión, pero no permiso.
            const destino =
                usuario.rol === 'RRHH'
                    ? '/sst/rrhh'
                    : '/sst/empleado';

            return router.createUrlTree([destino]);
        }),

        catchError(error => {
            console.error(
                'Error comprobando permisos:',
                error
            );

            return of(
                router.createUrlTree(['/signin'])
            );
        })
    );
};