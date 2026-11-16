import {inject, Injectable} from '@angular/core';

import {HttpClient, HttpHeaders} from '@angular/common/http';

import {BehaviorSubject, firstValueFrom, interval, Observable, Subject, Subscription} from 'rxjs';

// ==========================================
// NOTIFICACIÓN
// ==========================================

export interface Notificacion {
    id: number;
    tipo: string;
    titulo: string;
    mensaje: string;
    estado: string;
    leida: boolean;
    fechaCreacion: string;
    fechaProgramada: string | null;
    proximoAviso: string | null;
    fechaAtencion: string | null;
    vecesPospuesta: number;
}

// ==========================================
// ESTADO OFICIAL DESDE SPRING BOOT
// ==========================================

export interface EstadoPausa {
    estado: string;
    faltan: number;
    proximaPausa: string | null;
    notificacionId: number | null;
    proximaPausaEpochMs?: number | null;
    servidorAhoraEpochMs?: number;
}

// ==========================================
// ESTADO VISUAL DEL RELOJ GLOBAL
// ==========================================

export interface RelojGlobal {
    estado: string;
    segundosRestantes: number;
    porcentaje: number;
    proximaPausa: string | null;
    notificacionId: number | null;
    tiempoFormateado: string;
}

interface TokenCsrf {
    token: string;
    headerName: string;
}

@Injectable({
    providedIn: 'root'
})
export class NotificacionService {

    private readonly http = inject(HttpClient);

    private readonly base = '/api/notificaciones';

    // ========================================
    // EVENTOS DE LA CAMPANA
    // ========================================

    private readonly cambios =
        new Subject<void>();

    readonly cambios$ =
        this.cambios.asObservable();

    private readonly lecturas =
        new Subject<void>();

    readonly lecturas$ =
        this.lecturas.asObservable();

    // ========================================
    // EVENTOS DE APLAZAMIENTO
    // ========================================

    private readonly aplazamientos =
        new Subject<Notificacion>();

    readonly aplazamientos$ =
        this.aplazamientos.asObservable();

    // ========================================
    // ESTADO OFICIAL COMPARTIDO
    // ========================================

    private readonly estadoActual =
        new BehaviorSubject<EstadoPausa | null>(null);

    readonly estado$ =
        this.estadoActual.asObservable();

    // ========================================
    // RELOJ GLOBAL
    // ========================================

    private readonly duracionIntervaloSegundos = 300;

    private readonly relojActual =
        new BehaviorSubject<RelojGlobal>(
            this.relojInicial()
        );

    readonly reloj$ =
        this.relojActual.asObservable();

    private intervaloReloj:
        Subscription | null = null;

    private vencimientoMs = 0;

    private claveHorario = '';

    // ========================================
    // ESTADO INICIAL
    // ========================================

    private relojInicial(): RelojGlobal {

        return {
            estado: 'CARGANDO',
            segundosRestantes: 0,
            porcentaje: 0,
            proximaPausa: null,
            notificacionId: null,
            tiempoFormateado: '00:00'
        };
    }

    // ========================================
    // INICIAR EL RELOJ GLOBAL
    // ========================================

    iniciarRelojGlobal(): void {

        // Evitar crear varios intervalos
        // al navegar entre páginas.
        if (this.intervaloReloj) {
            return;
        }

        this.intervaloReloj = interval(1000)
            .subscribe(() => {
                this.actualizarReloj();
            });

        this.actualizarReloj();
    }

    // ========================================
    // DETENER EL RELOJ GLOBAL
    // ========================================

    detenerRelojGlobal(): void {

        this.intervaloReloj?.unsubscribe();

        this.intervaloReloj = null;
    }

    // ========================================
    // PUBLICAR ESTADO DE SPRING BOOT
    // ========================================

    publicarEstado(estado: EstadoPausa): void {

        this.estadoActual.next(estado);

        const clave =
            `${estado.notificacionId ?? 'sin-id'}|` +
            `${estado.proximaPausa ?? 'sin-fecha'}`;

        // ====================================
        // RECORDATORIO DISPONIBLE
        // ====================================

        if (estado.estado === 'DISPONIBLE') {

            this.vencimientoMs = 0;
            this.claveHorario = '';

            this.relojActual.next({
                estado: 'DISPONIBLE',
                segundosRestantes: 0,
                porcentaje: 100,
                proximaPausa: estado.proximaPausa,
                notificacionId: estado.notificacionId,
                tiempoFormateado: '00:00'
            });

            return;
        }

        // ====================================
        // PAUSAS COMPLETADAS
        // ====================================

        if (estado.estado === 'BLOQUEADO_COMPLETO') {

            this.vencimientoMs = 0;
            this.claveHorario = '';

            this.relojActual.next({
                estado: estado.estado,
                segundosRestantes: 0,
                porcentaje: 100,
                proximaPausa: null,
                notificacionId: null,
                tiempoFormateado: '00:00'
            });

            return;
        }

        // ====================================
        // PRÓXIMA PAUSA PROGRAMADA
        // ====================================

        if (estado.proximaPausa) {

            // No reiniciar el reloj si Java
            // devuelve la misma programación.
            if (this.claveHorario !== clave) {

                const restantes =
                    this.calcularMsRestantes(estado);

                this.vencimientoMs =
                    Date.now() + restantes;

                this.claveHorario = clave;
            }

            this.actualizarReloj(
                estado.estado,
                estado.proximaPausa,
                estado.notificacionId
            );

            return;
        }

        // ====================================
        // ESTADO SIN PAUSA PROGRAMADA
        // ====================================

        this.vencimientoMs = 0;
        this.claveHorario = '';

        this.relojActual.next({
            estado: estado.estado,
            segundosRestantes: 0,
            porcentaje: 0,
            proximaPausa: null,
            notificacionId: estado.notificacionId,
            tiempoFormateado: '00:00'
        });
    }

    // ========================================
    // TIEMPO RESTANTE SEGÚN EL SERVIDOR
    // ========================================

    private calcularMsRestantes(
        estado: EstadoPausa
    ): number {

        // Preferimos las marcas numéricas
        // del servidor para evitar diferencias
        // por zona horaria.
        if (
            typeof estado.proximaPausaEpochMs === 'number' &&
            typeof estado.servidorAhoraEpochMs === 'number'
        ) {

            return Math.max(
                0,
                estado.proximaPausaEpochMs -
                estado.servidorAhoraEpochMs
            );
        }

        if (
            estado.estado === 'ESPERANDO' &&
            estado.faltan > 0
        ) {

            return estado.faltan * 1000;
        }

        if (!estado.proximaPausa) {
            return 0;
        }

        const fecha = new Date(
            estado.proximaPausa
        ).getTime();

        return Number.isFinite(fecha)
            ? Math.max(
                0,
                fecha - Date.now()
            )
            : 0;
    }

    // ========================================
    // ACTUALIZAR EL RELOJ CADA SEGUNDO
    // ========================================

    private actualizarReloj(
        nuevoEstado?: string,
        nuevaFecha?: string | null,
        nuevoId?: number | null
    ): void {

        const anterior =
            this.relojActual.value;

        const estado =
            nuevoEstado ?? anterior.estado;

        // No generar tiempo artificial cuando
        // el servidor no tiene una pausa programada.
        if (this.vencimientoMs <= 0) {
            return;
        }

        const segundosRestantes = Math.max(
            0,
            Math.ceil(
                (this.vencimientoMs - Date.now()) / 1000
            )
        );

        const porcentaje = Math.max(
            0,
            Math.min(
                100,
                (
                    1 -
                    segundosRestantes /
                    this.duracionIntervaloSegundos
                ) * 100
            )
        );

        const minutos = Math.floor(
            segundosRestantes / 60
        );

        const segundos =
            segundosRestantes % 60;

        const tiempoFormateado =
            `${String(minutos).padStart(2, '0')}:` +
            `${String(segundos).padStart(2, '0')}`;

        this.relojActual.next({
            estado,
            segundosRestantes,
            porcentaje,

            proximaPausa:
                nuevaFecha !== undefined
                    ? nuevaFecha
                    : anterior.proximaPausa,

            notificacionId:
                nuevoId !== undefined
                    ? nuevoId
                    : anterior.notificacionId,

            tiempoFormateado
        });
    }

    // ========================================
    // REPROGRAMAR DESPUÉS DE POSPONER
    // ========================================

    private aplicarAplazamiento(
        notificacion: Notificacion
    ): void {

        if (
            notificacion.estado !== 'POSPUESTA' ||
            !notificacion.proximoAviso
        ) {
            return;
        }

        // El servidor confirmó un aplazamiento
        // de cinco minutos.
        this.vencimientoMs =
            Date.now() + 300000;

        this.claveHorario =
            `${notificacion.id}|` +
            `${notificacion.proximoAviso}`;

        this.relojActual.next({
            estado: 'POSPUESTA',
            segundosRestantes: 300,
            porcentaje: 0,
            proximaPausa:
            notificacion.proximoAviso,
            notificacionId:
            notificacion.id,
            tiempoFormateado: '05:00'
        });
    }

    // ========================================
    // LIMPIAR EL ESTADO GLOBAL
    // ========================================

    limpiarEstado(): void {

        this.detenerRelojGlobal();

        this.vencimientoMs = 0;
        this.claveHorario = '';

        this.estadoActual.next(null);

        this.relojActual.next(
            this.relojInicial()
        );
    }

    // ========================================
    // HISTORIAL
    // ========================================

    obtenerHistorial(): Observable<Notificacion[]> {

        return this.http.get<Notificacion[]>(
            this.base,
            {
                withCredentials: true
            }
        );
    }

    // ========================================
    // PENDIENTES
    // ========================================

    obtenerPendientes(): Observable<Notificacion[]> {

        return this.http.get<Notificacion[]>(
            `${this.base}/pendientes`,
            {
                withCredentials: true
            }
        );
    }

    // ========================================
    // VENCIDAS
    // ========================================

    obtenerVencidas(): Observable<Notificacion[]> {

        return this.http.get<Notificacion[]>(
            `${this.base}/vencidas`,
            {
                withCredentials: true
            }
        );
    }

    // ========================================
    // CONTADOR DE NOTIFICACIONES
    // ========================================

    obtenerContador():
        Observable<{ pendientes: number }> {

        return this.http.get<{ pendientes: number }>(
            `${this.base}/contador`,
            {
                withCredentials: true
            }
        );
    }

    // ========================================
    // SINCRONIZACIÓN CON SPRING BOOT
    // ========================================

    sincronizar(): Observable<EstadoPausa> {

        return this.http.get<EstadoPausa>(
            `${this.base}/sincronizar`,
            {
                withCredentials: true
            }
        );
    }

    // ========================================
    // TOKEN CSRF
    // ========================================

    private async encabezadosCsrf():
        Promise<HttpHeaders> {

        const csrf = await firstValueFrom(
            this.http.get<TokenCsrf>(
                `${this.base}/csrf`,
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

    // ========================================
    // POST PROTEGIDO CON CSRF
    // ========================================

    private async post<T>(
        ruta: string,
        body: unknown = {}
    ): Promise<T> {

        const headers =
            await this.encabezadosCsrf();

        return firstValueFrom(
            this.http.post<T>(
                `${this.base}${ruta}`,
                body,
                {
                    headers,
                    withCredentials: true
                }
            )
        );
    }

    // ========================================
    // POSPONER CINCO MINUTOS
    // ========================================

    async posponer(
        id: number,
        minutos = 5
    ): Promise<Notificacion> {

        const confirmada =
            await this.post<Notificacion>(
                `/${id}/posponer`,
                {
                    minutos
                }
            );

        if (
            confirmada.estado !== 'POSPUESTA' ||
            !confirmada.proximoAviso
        ) {
            throw new Error(
                'El servidor no confirmó el aplazamiento.'
            );
        }

        // Actualizar inmediatamente el reloj.
        this.aplicarAplazamiento(confirmada);

        // Notificar a los componentes existentes.
        this.aplazamientos.next(confirmada);

        // Actualizar el historial de la campana.
        this.cambios.next();

        return confirmada;
    }

    // ========================================
    // MARCAR UNA NOTIFICACIÓN COMO LEÍDA
    // ========================================

    async marcarLeida(id: number): Promise<void> {

        await this.post<void>(
            `/${id}/leer`
        );

        this.lecturas.next();
    }

    // ========================================
    // MARCAR TODAS COMO LEÍDAS
    // ========================================

    async marcarTodasLeidas(): Promise<void> {

        await this.post<void>(
            '/leer-todas'
        );

        this.lecturas.next();
    }

    // ========================================
    // AVISAR CAMBIOS A LA CAMPANA
    // ========================================

    avisarCambio(): void {
        this.cambios.next();
    }
}