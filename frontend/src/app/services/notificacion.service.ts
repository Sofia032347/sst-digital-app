import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

// ============================================
// ESTADOS DE NOTIFICACIONES
// ============================================

export type EstadoNotificacion =
    | 'PENDIENTE'
    | 'POSPUESTA'
    | 'ATENDIDA';

export type TipoNotificacion =
    | 'RECORDATORIO'
    | 'PAUSA_COMPLETADA'
    | 'INFORMATIVA';

// ============================================
// MODELO DE NOTIFICACIÓN
// ============================================

export interface Notificacion {
    id: number;
    tipo: TipoNotificacion;
    titulo: string;
    mensaje: string;
    estado: EstadoNotificacion;

    fechaCreacion: string;
    fechaProgramada: string | null;
    proximoAviso: string | null;
    fechaAtencion: string | null;

    vecesPospuesta: number;
}

// ============================================
// RESPUESTA DEL CONTADOR
// ============================================

export interface ContadorNotificaciones {
    pendientes: number;
}

// ============================================
// SERVICIO DE NOTIFICACIONES
// ============================================

@Injectable({
    providedIn: 'root'
})
export class NotificacionService {

    private readonly http = inject(HttpClient);

    private readonly apiUrl = '/api/notificaciones';

    // ==========================================
    // HISTORIAL COMPLETO
    // ==========================================

    obtenerHistorial(): Observable<Notificacion[]> {
        return this.http.get<Notificacion[]>(
            this.apiUrl,
            {
                withCredentials: true
            }
        );
    }

    // ==========================================
    // NOTIFICACIONES PENDIENTES Y POSPUESTAS
    // ==========================================

    obtenerPendientes(): Observable<Notificacion[]> {
        return this.http.get<Notificacion[]>(
            `${this.apiUrl}/pendientes`,
            {
                withCredentials: true
            }
        );
    }

    // ==========================================
    // CONTADOR DE LA CAMPANA
    // ==========================================

    obtenerContador(): Observable<ContadorNotificaciones> {
        return this.http.get<ContadorNotificaciones>(
            `${this.apiUrl}/contador`,
            {
                withCredentials: true
            }
        );
    }

    // ==========================================
    // RECORDATORIOS CUYA HORA YA LLEGÓ
    // ==========================================

    obtenerVencidas(): Observable<Notificacion[]> {
        return this.http.get<Notificacion[]>(
            `${this.apiUrl}/vencidas`,
            {
                withCredentials: true
            }
        );
    }

    // ==========================================
    // POSPONER RECORDATORIO
    // ==========================================

    posponer(
        notificacionId: number,
        minutos: number = 10
    ): Observable<Notificacion> {

        return this.http.post<Notificacion>(
            `${this.apiUrl}/${notificacionId}/posponer`,
            {
                minutos
            },
            {
                withCredentials: true
            }
        );
    }
}