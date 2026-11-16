
import { Injectable, inject } from '@angular/core';

import {
    HttpClient,
    HttpHeaders
} from '@angular/common/http';

import { Router } from '@angular/router';

import { firstValueFrom } from 'rxjs';

import {
    RolUsuarioService
} from './rol-usuario.service';

interface CsrfResponse {
    headerName: string;
    token: string;
}

@Injectable({
    providedIn: 'root'
})
export class AuthService {

    private readonly http = inject(HttpClient);

    private readonly router = inject(Router);

    private readonly rolUsuarioService =
        inject(RolUsuarioService);

    private cerrandoSesion = false;

    async cerrarSesion(): Promise<void> {

        if (this.cerrandoSesion) {
            return;
        }

        this.cerrandoSesion = true;

        try {

            // 1. Obtener el token CSRF de Spring.
            const csrf = await firstValueFrom(
                this.http.get<CsrfResponse>(
                    '/api/auth/csrf',
                    { withCredentials: true }
                )
            );

            // 2. Enviar POST /logout autenticado.
            const headers = new HttpHeaders()
                .set(csrf.headerName, csrf.token);

            await firstValueFrom(
                this.http.post(
                    '/logout',
                    null,
                    {
                        headers,
                        withCredentials: true,
                        responseType: 'text'
                    }
                )
            );

            // 3. Limpiar el usuario anterior.
            this.rolUsuarioService.limpiarSesion();

            // 4. Volver al formulario TailAdmin.
            await this.router.navigateByUrl(
                '/signin',
                {
                    replaceUrl: true
                }
            );

        } catch (error) {

            console.error(
                'No se pudo cerrar la sesión:',
                error
            );

            // No redirigir afirmando que se cerró
            // si Spring Security no lo confirmó.
            throw error;

        } finally {

            this.cerrandoSesion = false;
        }
    }
}
