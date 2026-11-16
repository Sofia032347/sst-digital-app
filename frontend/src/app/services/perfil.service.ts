import {inject, Injectable} from '@angular/core';
import {HttpClient, HttpHeaders} from '@angular/common/http';
import {firstValueFrom, Observable} from 'rxjs';
import {Router} from "@angular/router";

export interface PerfilUsuario {
    id: number;
    nombre: string;
    email: string;
    departamento: string | null;
    rol: string;
}

export interface CambioPassword {
    passwordActual: string;
    passwordNueva: string;
    confirmarPassword: string;
}

interface TokenCsrf {
    token: string;
    headerName: string;
}

@Injectable({
    providedIn: 'root'
})
export class PerfilService {

    private readonly http = inject(HttpClient);

    private readonly router = inject(Router);

    // Cada rol consulta su propia ruta.

    private get apiUrl(): string {

        const ruta = this.router.url.split('?')[0];

        if (ruta === '/sst/rrhh/perfil') {
            return '/api/rrhh/perfil';
        }

        if (ruta === '/sst/empleado/perfil') {
            return '/api/empleado/perfil';
        }

        throw new Error(
            'Ruta de perfil no reconocida: ' + ruta
        );
    }

    // ======================================
    // OBTENER DATOS DE MYSQL
    // ======================================

    obtenerPerfil(): Observable<PerfilUsuario> {

        return this.http.get<PerfilUsuario>(
            this.apiUrl,
            {
                withCredentials: true
            }
        );
    }

    // ======================================
    // CSRF PARA CAMBIOS PROTEGIDOS
    // ======================================

    private async encabezadosCsrf():
        Promise<HttpHeaders> {

        const csrf = await firstValueFrom(
            this.http.get<TokenCsrf>(
                '/actividades/csrf',
                {
                    withCredentials: true
                }
            )
        );

        return new HttpHeaders().set(
            csrf.headerName,
            csrf.token
        );
    }

    // ======================================
    // ACTUALIZAR DEPARTAMENTO
    // ======================================

    async actualizarDepartamento(
        departamento: string
    ): Promise<PerfilUsuario> {

        const headers =
            await this.encabezadosCsrf();

        return firstValueFrom(
            this.http.put<PerfilUsuario>(
                `${this.apiUrl}/departamento`,
                {
                    departamento
                },
                {
                    headers,
                    withCredentials: true
                }
            )
        );
    }

    // ======================================
    // CAMBIAR CONTRASEÑA
    // ======================================

    async cambiarPassword(
        datos: CambioPassword
    ): Promise<void> {

        const headers =
            await this.encabezadosCsrf();

        await firstValueFrom(
            this.http.put<void>(
                `${this.apiUrl}/password`,
                datos,
                {
                    headers,
                    withCredentials: true
                }
            )
        );
    }
}
