import {inject} from '@angular/core';

import {CanActivateChildFn, CanActivateFn, Router} from '@angular/router';

import {catchError, map, of} from 'rxjs';

import {RolUsuarioService} from '../services/rol-usuario.service';

const comprobarSesion = () => {
    const rolService = inject(RolUsuarioService);
    const router = inject(Router);

    return rolService.obtenerUsuarioActual().pipe(
        map(usuario => {
            const autenticado =
                usuario.autenticado &&
                (
                    usuario.rol === 'EMPLEADO' ||
                    usuario.rol === 'RRHH'
                );

            return autenticado
                ? true
                : router.createUrlTree(['/signin']);
        }),

        catchError(error => {
            console.error(
                'No se pudo verificar la sesión:',
                error
            );

            // No permitir acceso al layout si no se pudo validar la sesión.
            return of(
                router.createUrlTree(['/signin'])
            );
        })
    );
};

export const authGuard: CanActivateFn =
    () => comprobarSesion();

export const authChildGuard: CanActivateChildFn =
    () => comprobarSesion();