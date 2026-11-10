import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

// Estructura de los datos enviados por Spring Boot.
export interface ResumenEmpleado {
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

@Injectable({
    providedIn: 'root'
})
export class EmpleadoService {

    private readonly http = inject(HttpClient);

    // Usamos una ruta relativa para poder configurar
    // el proxy de Angular hacia Spring Boot.
    private readonly apiUrl = '/api/empleado';

    // ==========================================
    // CONSULTAR ESTADÍSTICAS DEL EMPLEADO
    // ==========================================

    obtenerResumen(): Observable<ResumenEmpleado> {
        return this.http.get<ResumenEmpleado>(
            `${this.apiUrl}/resumen`,
            {
                withCredentials: true
            }
        );
    }
}
