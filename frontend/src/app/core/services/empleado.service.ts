import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';

import { ResumenEmpleado } from '../models/resumen-empleado.model';

@Injectable({
    providedIn: 'root'
})
export class EmpleadoService {

    private readonly http = inject(HttpClient);

    // Método que utilizaremos cuando la API sea segura
    obtenerResumen(): Observable<ResumenEmpleado> {
        return this.http.get<ResumenEmpleado>(
            '/api/empleado/resumen'
        );
    }

    // Datos temporales para probar el dashboard
    obtenerResumenDemo(): Observable<ResumenEmpleado> {
        return of({
            objetivoDiario: 4,
            pausasCompletadas: 2,
            minutosAcumulados: 20
        });
    }
}
