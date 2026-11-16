
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

// ============================================
// TIPOS DE AVISO
// ============================================

export type TipoAvisoPersonal =
    | 'SIN_ACCESO'
    | 'RESUMEN'
    | 'META_CUMPLIDA';


// ============================================
// INFORMACIÓN DE CADA EMPLEADO
// ============================================

export interface AvisoPersonalRrhh {
    usuarioId: number;
    nombre: string;
    departamento: string;
    tipo: TipoAvisoPersonal;
    mensaje: string;
    inicioSesionHoy: boolean;

    incompletas: number;
    enProgreso: number;
    completadas: number;
    canceladas: number;
}

// ============================================
// INFORMACIÓN GENERAL DE RRHH
// ============================================

export interface SeguimientoDashboardRrhh {
    fecha: string;
    totalEmpleados: number;

    iniciaronSesionHoy: number;
    noIniciaronSesionHoy: number;
    sinPausasCompletadasHoy: number;

    pausasCompletadasHoy: number;
    pausasIncompletasHoy: number;
    pausasEnProgresoHoy: number;
    pausasCanceladasHoy: number;

    avisos: AvisoPersonalRrhh[];
}

// ============================================
// SERVICIO DE SEGUIMIENTO
// ============================================

@Injectable({
    providedIn: 'root'
})
export class RrhhSeguimientoDashboardService {

    private readonly http = inject(HttpClient);

    obtenerSeguimiento():
        Observable<SeguimientoDashboardRrhh> {

        return this.http.get<SeguimientoDashboardRrhh>(
            '/api/rrhh/seguimiento-dashboard',
            {
                withCredentials: true
            }
        );
    }
}
