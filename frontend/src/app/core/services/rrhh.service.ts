import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { HttpHeaders } from '@angular/common/http';
import { switchMap } from 'rxjs';

export type RolEmpleado = 'EMPLEADO' | 'RRHH';

export type EstadoActividad =
    | 'COMPLETADA'
    | 'INCOMPLETA'
    | 'CANCELADA'
    | 'EN_PROCESO';

export interface EmpleadoRrhh {
    id: number;
    nombre: string;
    email: string;
    departamento: string;
    rol: RolEmpleado;
}

export interface GuardarEmpleado {
    nombre: string;
    email: string;
    departamento: string;
    rol: RolEmpleado;
    password: string;
}

export interface ResumenRrhh {
    totalEmpleados: number;
    pausasCompletadas: number;
    pausasIncompletas: number;
    pausasCanceladas: number;
    pausasEnProceso: number;
}

export interface ActividadRrhh {
    id: number;
    usuarioId: number;
    empleado: string;
    email: string;
    fecha: string;
    estado: EstadoActividad;
    segundosRealizados: number;
    porcentaje: number;
}

@Injectable({
    providedIn: 'root'
})
export class RrhhService {

    private readonly http = inject(HttpClient);

    private readonly api = '/api/rrhh';


    private ejecutarConCsrf<T>(
        peticion: (headers: HttpHeaders) => Observable<T>
    ): Observable<T> {

        return this.http.get<{
            token: string;
            headerName: string;
        }>('/api/auth/csrf', {
            withCredentials: true
        }).pipe(
            switchMap(csrf => {

                const headers = new HttpHeaders()
                    .set(csrf.headerName, csrf.token);

                return peticion(headers);
            })
        );
    }

    obtenerResumen(): Observable<ResumenRrhh> {
        return this.http.get<ResumenRrhh>(
            `${this.api}/resumen`,
            { withCredentials: true }
        );
    }

    listarEmpleados(): Observable<EmpleadoRrhh[]> {
        return this.http.get<EmpleadoRrhh[]>(
            `${this.api}/empleados`,
            { withCredentials: true }
        );
    }


    crearEmpleado(
        empleado: GuardarEmpleado
    ): Observable<EmpleadoRrhh> {

        return this.ejecutarConCsrf(headers =>
            this.http.post<EmpleadoRrhh>(
                `${this.api}/empleados`,
                empleado,
                {
                    headers,
                    withCredentials: true
                }
            )
        );
    }


    editarEmpleado(
        id: number,
        empleado: GuardarEmpleado
    ): Observable<EmpleadoRrhh> {

        return this.ejecutarConCsrf(headers =>
            this.http.put<EmpleadoRrhh>(
                `${this.api}/empleados/${id}`,
                empleado,
                {
                    headers,
                    withCredentials: true
                }
            )
        );
    }

    listarActividades(
        desde: string,
        hasta: string,
        usuarioId?: number
    ): Observable<ActividadRrhh[]> {
        const params: Record<string, string> = {
            desde,
            hasta
        };

        if (usuarioId !== undefined) {
            params['usuarioId'] = String(usuarioId);
        }

        return this.http.get<ActividadRrhh[]>(
            `${this.api}/actividades`,
            {
                params,
                withCredentials: true
            }
        );
    }


    eliminarEmpleado(id: number): Observable<void> {

        return this.ejecutarConCsrf(headers =>
            this.http.delete<void>(
                `${this.api}/empleados/${id}`,
                {
                    headers,
                    withCredentials: true
                }
            )
        );
    }
}
