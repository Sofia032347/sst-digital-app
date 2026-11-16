import {inject, Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {catchError, map, Observable, shareReplay, tap, throwError} from 'rxjs';

export type RolUsuario = 'EMPLEADO' | 'RRHH';

export interface UsuarioActual {
    autenticado: boolean;
    email: string;
    rol: RolUsuario;
}

@Injectable({
    providedIn: 'root'
})
export class RolUsuarioService {

    private readonly http = inject(HttpClient);

    private readonly apiUrl = '/api/auth/me';

    private usuarioActual$?: Observable<UsuarioActual>;

    private usuarioEnMemoria: UsuarioActual | null = null;

    // Permite obtener el usuario ya cargado sin
    // realizar otra petición al backend.
    get usuarioActual(): UsuarioActual | null {
        return this.usuarioEnMemoria;
    }

    get rolActual(): RolUsuario | null {
        const usuario = this.usuarioEnMemoria;

        return usuario?.autenticado
            ? usuario.rol
            : null;
    }

    obtenerUsuarioActual(): Observable<UsuarioActual> {

        if (!this.usuarioActual$) {

            this.usuarioActual$ = this.http.get<UsuarioActual>(
                this.apiUrl,
                {withCredentials: true}
            ).pipe(
                tap(usuario => {
                    this.usuarioEnMemoria =
                        usuario.autenticado
                            ? usuario
                            : null;
                }),

                catchError(error => {
                    this.usuarioEnMemoria = null;
                    this.usuarioActual$ = undefined;

                    return throwError(() => error);
                }),

                shareReplay({
                    bufferSize: 1,
                    refCount: false
                })
            );
        }

        return this.usuarioActual$;
    }

    obtenerRoles(): Observable<RolUsuario[]> {

        return this.obtenerUsuarioActual().pipe(
            map(usuario => {

                if (
                    !usuario.autenticado ||
                    !['EMPLEADO', 'RRHH'].includes(usuario.rol)
                ) {
                    return [];
                }

                return [usuario.rol];
            })
        );
    }

    tieneRol(
        permitidos: RolUsuario[]
    ): Observable<boolean> {

        return this.obtenerUsuarioActual().pipe(
            map(usuario =>
                usuario.autenticado &&
                permitidos.includes(usuario.rol)
            )
        );
    }

    obtenerRutaInicio(): Observable<string> {

        return this.obtenerUsuarioActual().pipe(
            map(usuario => {

                if (!usuario.autenticado) {
                    return '/signin';
                }

                return usuario.rol === 'RRHH'
                    ? '/sst/rrhh'
                    : '/sst/empleado';
            })
        );
    }

    limpiarSesion(): void {
        this.usuarioActual$ = undefined;
        this.usuarioEnMemoria = null;
    }
}