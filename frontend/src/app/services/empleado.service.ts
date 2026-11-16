import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ResumenEmpleadoApi {
    nombre: string;
    email: string;
    metaDiaria: number;
    completadasHoy: number;
    pendientesHoy: number;
    porcentajeCumplimiento: number;
    incompletasHoy: number;
    canceladasHoy: number;
    enProcesoHoy: number;
}

export interface TemporizadorEmpleado {
    fechaInicioDia: string;
    proximaPausa: string;
    duracionSegundos: number;
}

@Injectable({
    providedIn: 'root'
})
export class EmpleadoService {

    private readonly http = inject(HttpClient);

    private readonly apiUrl = '/api/empleado';

    // ==========================================
    // RESUMEN DEL EMPLEADO
    // ==========================================

    obtenerResumen(): Observable<ResumenEmpleadoApi> {

        return this.http.get<ResumenEmpleadoApi>(
            `${this.apiUrl}/resumen`,
            {
                withCredentials: true
            }
        );

    }

    // ==========================================
    // CONSULTAR TEMPORIZADOR
    // ==========================================

    obtenerTemporizador(): Observable<TemporizadorEmpleado> {

        return this.http.get<TemporizadorEmpleado>(
            `${this.apiUrl}/temporizador`,
            {
                withCredentials: true
            }
        );

    }

    // ==========================================
    // REGISTRAR PAUSA COMPLETADA
    // ==========================================

    registrarPausaCompletada(): Observable<TemporizadorEmpleado> {

        return this.http.post<TemporizadorEmpleado>(
            `${this.apiUrl}/temporizador/completar`,
            {},
            {
                withCredentials: true
            }
        );

    }

}