import {CommonModule} from '@angular/common';
import {
    AfterViewInit,
    ChangeDetectorRef,
    Component,
    ElementRef,
    inject,
    NgZone,
    OnDestroy,
    ViewChild
} from '@angular/core';
import {HttpClient, HttpErrorResponse} from '@angular/common/http';
import {ActivatedRoute, Router} from '@angular/router';
import {firstValueFrom} from 'rxjs';
import Swal from 'sweetalert2';

import {
    EjercicioPausa,
    FasePausa,
    RUTINA_PAUSA,
    SEGUNDOS_PREPARACION,
    TOTAL_EJERCICIOS,
    TOTAL_SEGUNDOS_PROGRAMADOS
} from './rutina-pausa.data';
import {RolUsuarioService} from "../../../core/services/rol-usuario.service";
import {EmpleadoService} from "../../../services/empleado.service";

type EstadoRutina =
    | 'PREPARACION'
    | 'INICIANDO'
    | 'EN_PROCESO'
    | 'PAUSADA'
    | 'GUARDANDO'
    | 'FINALIZANDO'
    | 'ERROR_FINALIZACION'
    | 'TERMINADA';

interface PuntoCorporal {
    x: number;
    y: number;
    z?: number;
    visibility?: number;
}

interface ResultadoPose {
    poseLandmarks?: PuntoCorporal[];
}

interface InstanciaPose {
    setOptions(options: Record<string, unknown>): void;

    onResults(callback: (resultado: ResultadoPose) => void): void;

    send(input: { image: HTMLVideoElement }): Promise<void>;

    close(): Promise<void>;
}

interface MediaPipeGlobal {
    Pose?: new (
        config: {
            locateFile: (archivo: string) => string;
        }
    ) => InstanciaPose;

    POSE_CONNECTIONS?: number[][];

    drawConnectors?: (
        ctx: CanvasRenderingContext2D,
        puntos: PuntoCorporal[],
        conexiones: number[][],
        estilo: Record<string, unknown>
    ) => void;

    drawLandmarks?: (
        ctx: CanvasRenderingContext2D,
        puntos: PuntoCorporal[],
        estilo: Record<string, unknown>
    ) => void;
}

interface ProgresoPausa {
    indiceEjercicio: number;
    indiceFase: number;
    tiempoRestante: number;
    segundosTranscurridos: number;
}

interface PausaPendiente extends ProgresoPausa {
    id: number;
    estado: 'INCOMPLETA';
    ejerciciosCompletados?: number;
}

// El backend devuelve { existe: false } cuando no hay rutina pendiente.
interface RespuestaPausaPendiente extends Partial<PausaPendiente> {
    existe?: boolean;
    tienePausaPendiente?: boolean;
}

@Component({
    selector: 'app-pausa-activa',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './pausa-activa.component.html'
})
export class PausaActivaComponent
    implements AfterViewInit, OnDestroy {

    @ViewChild('videoElement')
    videoElement?: ElementRef<HTMLVideoElement>;

    @ViewChild('canvasElement')
    canvasElement?: ElementRef<HTMLCanvasElement>;

    private readonly http = inject(HttpClient);
    private readonly router = inject(Router);
    private readonly zone = inject(NgZone);
    private readonly cdr = inject(ChangeDetectorRef);

    readonly rutina = RUTINA_PAUSA;
    readonly totalEjercicios = TOTAL_EJERCICIOS;
    readonly totalSegundos = TOTAL_SEGUNDOS_PROGRAMADOS;

    private readonly rolUsuarioService = inject(RolUsuarioService);

    private readonly route = inject(ActivatedRoute);

    get modoContinuar(): boolean {
        return this.route.snapshot.queryParamMap.get('modo') === 'continuar';
    }

    get rutaPanel(): string {
        const rol = this.rolUsuarioService.usuarioActual?.rol;

        return rol === 'RRHH'
            ? '/sst/rrhh'
            : '/sst/empleado';
    }

    private readonly api = {
        csrf: '/actividades/csrf',
        iniciar: '/actividades/iniciar-pausa',
        pendiente: '/actividades/pausa-pendiente',
        reanudar: '/actividades/reanudar-pausa',
        guardar: '/actividades/guardar-pausa-incompleta',
        finalizar: '/actividades/finalizar-pausa',
        cancelar: '/actividades/cancelar-pausa',
        incompletas: '/actividades/pausas-incompletas',
        logout: '/logout'
    };

    estado: EstadoRutina = 'PREPARACION';

    ojosCubiertosDetectados = false;
    private ultimaDeteccionOjos = 0;

    sienesDetectadas = false;

    private ultimaDeteccionSienes = 0;

    private muestraMasajeSienes: {
        x: number;
        y: number;
        instante: number;
    } | null = null;

    procesando = false;
    actividadRegistrada = false;

    private confirmandoSalida = false;
    private destruido = false;


    private detectarManosSobreOjos(
        puntos: PuntoCorporal[]
    ): boolean {
        const ojoIzquierdo = this.punto(puntos, 2, 0.30);
        const ojoDerecho = this.punto(puntos, 5, 0.30);

        const munecaIzquierda = this.punto(puntos, 15, 0.30);
        const munecaDerecha = this.punto(puntos, 16, 0.30);

        const hombroIzquierdo = this.punto(puntos, 11, 0.40);
        const hombroDerecho = this.punto(puntos, 12, 0.40);

        if (
            !ojoIzquierdo ||
            !ojoDerecho ||
            !munecaIzquierda ||
            !munecaDerecha ||
            !hombroIzquierdo ||
            !hombroDerecho
        ) {
            return false;
        }

        const anchoHombros = Math.hypot(
            hombroDerecho.x - hombroIzquierdo.x,
            hombroDerecho.y - hombroIzquierdo.y
        );

        if (anchoHombros < 0.10) {
            return false;
        }

        const distancia = (
            a: PuntoCorporal,
            b: PuntoCorporal
        ): number => Math.hypot(
            a.x - b.x,
            a.y - b.y
        );

        // Se comprueban ambas correspondencias, porque la imagen de la webcam puede mostrarse reflejada.
        const correspondenciaNormal =
            distancia(munecaIzquierda, ojoIzquierdo) +
            distancia(munecaDerecha, ojoDerecho);

        const correspondenciaInvertida =
            distancia(munecaIzquierda, ojoDerecho) +
            distancia(munecaDerecha, ojoIzquierdo);

        const distanciaTotal = Math.min(
            correspondenciaNormal,
            correspondenciaInvertida
        );

        // Cada muñeca debe aproximarse a la región de un ojo.
        return distanciaTotal < anchoHombros * 0.85;
    }

    // PROGRESO

    indiceEjercicio = 0;
    indiceFase = 0;

    segundosTranscurridos = 0;
    tiempoRestante = 0;
    preparacionRestante = 0;

    private preparacionMs = 0;
    private acumuladoMs = 0;
    private ultimoTick = 0;
    private relojId:
        ReturnType<typeof setInterval> | null = null;

    // SEGUIMIENTO CONTINUO DE EJERCICIOS GUIADOS

    movimientoGuiadoDetectado = false;

    private ultimaEvidenciaGuiada = 0;
    private inicioCandidatoGuiado = 0;

    // Para detectar movimiento real de hombros, no solamente que alguna vez se movieron.
    private ultimaMuestraHombros: {
        izquierdo: number;
        derecho: number;
        instante: number;
    } | null = null;

    private movimientosHombrosRecientes = 0;
    private primerMovimientoHombros = 0;

    // Detección de flexión y extensión de muñeca.
    private ultimaMuestraMuneca: {
        posicion: number;
        instante: number;
    } | null = null;

    private munecaPosicionAlcanzada = false;
    private movimientosMuneca = 0;
    private primerMovimientoMuneca = 0;

    // Referencia frontal para el giro de tronco.
    private anchoHombrosNeutro = 0;
    private muestrasAnchoNeutro = 0;

    private referenciaPantorrillas: {
        hombrosY: number;
        codosY: number;
        caderaY: number | null;
        muestras: number;
    } | null = null;

    private cuerpoElevado = false;

    get guiadaConDeteccion(): boolean {
        return [1, 2, 3, 4, 5].includes(
            this.indiceEjercicio
        );
    }

    get faseMasajeSienes(): boolean {
        return (
            this.indiceEjercicio === 9 &&
            /masaj/.test(
                this.faseActual.instruccion.toLowerCase()
            ) &&
            /sien/.test(
                this.faseActual.instruccion.toLowerCase()
            )
        );
    }


    private detectarMasajeSienes(
        puntos: PuntoCorporal[],
        ahora: number
    ): boolean {
        const hI = this.punto(puntos, 11, 0.40);
        const hD = this.punto(puntos, 12, 0.40);

        if (!hI || !hD) {
            this.muestraMasajeSienes = null;
            return false;
        }

        const ancho = Math.hypot(
            hD.x - hI.x,
            hD.y - hI.y
        );

        if (ancho < 0.10) {
            return false;
        }

        const ojos = [
            this.punto(puntos, 2, 0.35),
            this.punto(puntos, 5, 0.35)
        ];

        const orejas = [
            this.punto(puntos, 7, 0.30),
            this.punto(puntos, 8, 0.30)
        ];

        // Primero intentar con puntos de las manos.
        // Si no son visibles, utilizar las muñecas.
        const manos = [
            this.punto(puntos, 19, 0.40) ??
            this.punto(puntos, 15, 0.40),

            this.punto(puntos, 20, 0.40) ??
            this.punto(puntos, 16, 0.40)
        ];

        let manoCercana: PuntoCorporal | null = null;

        for (const mano of manos) {
            if (!mano) continue;

            for (let i = 0; i < 2; i++) {
                const ojo = ojos[i];
                const oreja = orejas[i];

                if (!ojo || !oreja) continue;

                // Centro aproximado de la sien.
                const sienX = (ojo.x + oreja.x) / 2;
                const sienY = (ojo.y + oreja.y) / 2;

                const distancia = Math.hypot(
                    mano.x - sienX,
                    mano.y - sienY
                ) / ancho;

                if (distancia < 0.38) {
                    manoCercana = mano;
                    break;
                }
            }

            if (manoCercana) break;
        }

        if (!manoCercana) {
            this.muestraMasajeSienes = null;
            return false;
        }

        // Detectar un pequeño desplazamiento
        // mientras la mano está cerca de la sien.
        const anterior = this.muestraMasajeSienes;

        this.muestraMasajeSienes = {
            x: manoCercana.x,
            y: manoCercana.y,
            instante: ahora
        };

        if (!anterior) {
            return false;
        }

        const deltaMs = ahora - anterior.instante;

        if (deltaMs <= 0 || deltaMs > 500) {
            return false;
        }

        const movimiento = Math.hypot(
            manoCercana.x - anterior.x,
            manoCercana.y - anterior.y
        ) / ancho;

        return movimiento > 0.008 &&
            movimiento < 0.12;
    }

    pausaPendiente: PausaPendiente | null = null;
    pausasIncompletas: PausaPendiente[] = [];
    consultandoPendiente = false;
    errorPendiente = '';

    // DATOS DE LA RUTINA

    get ejercicioActual(): EjercicioPausa {
        return this.rutina[this.indiceEjercicio];
    }

    get faseActual(): FasePausa {
        return this.ejercicioActual.fases[this.indiceFase];
    }

    get tituloEjercicio(): string {
        if (this.estado === 'PREPARACION') {
            return 'Preparación';
        }

        return this.ejercicioActual.titulo;
    }

    get instruccionActual(): string {
        if (this.estado === 'PREPARACION') {
            return (
                'Ubícate en un espacio cómodo. ' +
                'Revisa los ejercicios antes de comenzar.'
            );
        }

        return this.faseActual.instruccion;
    }

    get imagenActual(): string {
        if (this.estado === 'PREPARACION') {
            return '/img/preparacion.png';
        }

        return this.faseActual.imagen;
    }

    get faseTexto(): string {
        if (this.estado === 'PREPARACION') {
            return 'Preparación';
        }

        return (
            `Fase ${this.indiceFase + 1} de ` +
            this.ejercicioActual.fases.length
        );
    }

    get progresoTexto(): string {
        if (this.estado === 'PREPARACION') {
            return 'Preparación';
        }

        if (this.estado === 'TERMINADA') {
            return 'Rutina completada';
        }

        return (
            `Ejercicio ${this.indiceEjercicio + 1} ` +
            `de ${this.totalEjercicios}`
        );
    }

    get modoVisual(): string {
        if (this.estado === 'PREPARACION') {
            return 'Preparación';
        }

        return this.faseActual.modo === 'GUIADA'
            ? 'Ejercicio guiado'
            : 'Con MediaPipe';
    }

    get porcentajeProgreso(): number {
        if (this.estado === 'TERMINADA') {
            return 100;
        }

        return Math.min(
            100,
            Math.floor(
                this.segundosTranscurridos /
                this.totalSegundos * 100
            )
        );
    }

    get tiempoTotalRestante(): number {
        return Math.max(
            0,
            this.totalSegundos -
            this.segundosTranscurridos
        );
    }

    get tiempoTotalRutinaFormateado(): string {
        return this.formatearTiempo(
            this.tiempoTotalRestante
        );
    }

    get tiempoMostrado(): string {
        if (this.estado === 'PREPARACION') {
            return '--';
        }

        return this.formatearTiempo(
            this.tiempoRestante
        );
    }


    get enPreparacionFase(): boolean {
        return (
            this.estado === 'EN_PROCESO' &&
            this.preparacionRestante > 0
        );
    }

    get preparacionTexto(): string {
        return `Comienza en ${this.preparacionRestante}`;
    }

    get faseTaparOjos(): boolean {
        if (this.indiceEjercicio !== 9) {
            return false;
        }

        const instruccion =
            this.faseActual.instruccion.toLowerCase();

        return (
            /(tap|cubr)/.test(instruccion) &&
            /oj/.test(instruccion)
        );
    }

    private readonly empleadoService = inject(EmpleadoService);

    actividadesRegistradasHoy = 0;
    consultandoLimite = true;
    errorLimiteDiario = false;

    get limiteDiarioAlcanzado(): boolean {
        return this.actividadesRegistradasHoy >= 4;
    }

    // Empezar NO depende de la cámara.
    get puedeIniciar(): boolean {
        return (
            this.estado === 'PREPARACION' &&
            !this.procesando &&
            !this.consultandoPendiente &&
            !this.consultandoLimite &&
            !this.errorLimiteDiario &&
            this.camaraConImagen &&
            this.cuerpoDetectado &&
            !this.limiteDiarioAlcanzado
        );
    }

    private formatearTiempo(
        total: number
    ): string {
        const n = Math.max(0, Math.floor(total));

        return (
            String(Math.floor(n / 60)).padStart(2, '0') +
            ':' +
            String(n % 60).padStart(2, '0')
        );
    }

    // ======================================
    // CICLO DE VIDA
    // ======================================
    ngAfterViewInit(): void {
        void this.consultarPausaPendiente();
        void this.consultarLimiteDiario();
        void this.iniciarCamara();
    }

    ngOnDestroy(): void {
        this.destruido = true;

        this.detenerReloj();
        this.detenerCamara();

        const instancia = this.pose;
        this.pose = null;

        if (instancia) {
            void instancia.close().catch(
                error => console.warn(error)
            );
        }

        const audio = this.contextoAudio;
        this.contextoAudio = null;

        if (
            audio &&
            audio.state !== 'closed'
        ) {
            void audio.close().catch(
                error => console.warn(error)
            );
        }
    }

    private actualizarVista(): void {
        if (!this.destruido) {
            this.cdr.detectChanges();
        }
    }

    // ======================================
    // TEMPORIZADOR
    // ======================================

    private prepararFase(
        tiempoGuardado?: number
    ): void {
        this.tiempoRestante =
            tiempoGuardado ??
            this.faseActual.tiempo;

        this.preparacionMs =
            SEGUNDOS_PREPARACION * 1000;

        this.preparacionRestante =
            SEGUNDOS_PREPARACION;

        this.acumuladoMs = 0;
        this.ultimoTick = performance.now();

        this.posturaConfirmada = false;
        this.ultimaLecturaPose = 0;
        this.ultimaPosturaCorrecta = 0;
        this.referenciaCuello = null;
        this.muestrasReferencia = 0;
        this.candidataDesde = 0;
        this.ultimaLecturaValida = 0;
        this.referenciaHombrosLateral = null;

        this.ultimaMuestraMuneca = null;
        this.munecaPosicionAlcanzada = false;
        this.movimientosMuneca = 0;
        this.primerMovimientoMuneca = 0;

        this.movimientoGuiadoDetectado = false;
        this.ultimaEvidenciaGuiada = 0;
        this.inicioCandidatoGuiado = 0;

        this.ultimaMuestraHombros = null;
        this.movimientosHombrosRecientes = 0;
        this.primerMovimientoHombros = 0;

        this.anchoHombrosNeutro = 0;
        this.muestrasAnchoNeutro = 0;

        this.referenciaPantorrillas = null;
        this.cuerpoElevado = false;

        this.ojosCubiertosDetectados = false;
        this.ultimaDeteccionOjos = 0;

        this.actualizarVista();
    }

    private iniciarReloj(): void {
        this.detenerReloj();

        this.ultimoTick = performance.now();

        this.relojId = setInterval(() => {
            this.actualizarTiempo();
            this.actualizarVista();
        }, 100);
    }

    private detenerReloj(): void {
        if (this.relojId !== null) {
            clearInterval(this.relojId);
            this.relojId = null;
        }
    }

    private actualizarTiempo(): void {
        const ahora = performance.now();

        const delta = Math.max(
            0,
            Math.min(
                250,
                ahora - this.ultimoTick
            )
        );

        this.ultimoTick = ahora;

        if (
            this.estado !== 'EN_PROCESO' ||
            this.procesando ||
            this.confirmandoSalida ||
            document.hidden
        ) {
            return;
        }

        // Preparación antes de la fase.
        if (this.preparacionMs > 0) {
            this.preparacionMs = Math.max(
                0,
                this.preparacionMs - delta
            );

            this.preparacionRestante =
                Math.ceil(this.preparacionMs / 1000);

            if (this.preparacionMs === 0) {
                this.preparacionRestante = 0;
                this.acumuladoMs = 0;
            }

            return;
        }

        const guiada =
            this.faseActual.modo === 'GUIADA';

        if (this.faseTaparOjos) {
            const posicionReciente =
                this.camaraConImagen &&
                this.cuerpoDetectado &&
                this.ojosCubiertosDetectados &&
                this.ultimaDeteccionOjos > 0 &&
                ahora - this.ultimaDeteccionOjos < 450;

            if (!posicionReciente) {
                // No acumular fracciones de segundo
                // mientras la posición no sea válida.
                this.acumuladoMs = 0;
                return;
            }
        }

        if (this.faseMasajeSienes) {
            const posicionValida =
                this.camaraConImagen &&
                this.cuerpoDetectado &&
                this.ultimaDeteccionSienes > 0 &&
                ahora - this.ultimaDeteccionSienes < 800;

            this.sienesDetectadas = posicionValida;

            if (!posicionValida) {
                this.acumuladoMs = 0;
                return;
            }
        }

        // Comprobación CONTINUA:
        // Una detección antigua no mantiene el reloj avanzando.

        if (guiada && this.guiadaConDeteccion) {
            const evidenciaReciente =
                this.camaraConImagen &&
                this.cuerpoDetectado &&
                this.ultimaEvidenciaGuiada > 0 &&
                ahora - this.ultimaEvidenciaGuiada <
                (
                    this.indiceEjercicio === 8 &&
                    this.indiceFase === 0
                        ? 1600
                        : 800
                );

            this.movimientoGuiadoDetectado =
                evidenciaReciente;

            if (!evidenciaReciente) {
                // Congelar el contador cuando deja
                // de existir movimiento o postura válida.
                this.acumuladoMs = 0;
                return;
            }
        }


        // ==========================================
        // MEDIAPIPE: DESCONTAR SOLO CON POSTURA VÁLIDA
        // ==========================================

        if (this.faseActual.modo === 'MEDIAPIPE') {

            const posturaValida =
                this.camaraConImagen &&
                this.cuerpoDetectado &&
                this.posturaConfirmada &&
                this.ultimaLecturaPose > 0 &&
                ahora - this.ultimaLecturaPose < 450 &&
                this.ultimaLecturaValida > 0 &&
                ahora - this.ultimaLecturaValida < 350;

            if (!posturaValida) {
                // Detener el tiempo hasta recuperar
                // la postura correcta.
                this.acumuladoMs = 0;
                return;
            }
        }

        this.acumuladoMs += delta;

        if (this.acumuladoMs < 1000) {
            return;
        }

        this.acumuladoMs -= 1000;

        this.tiempoRestante = Math.max(
            0,
            this.tiempoRestante - 1
        );

        this.segundosTranscurridos = Math.min(
            this.totalSegundos,
            this.segundosTranscurridos + 1
        );

        if (this.tiempoRestante === 0) {
            const terminaEjercicio =
                this.indiceFase ===
                this.ejercicioActual.fases.length - 1;

            if (terminaEjercicio) {
                this.sonidoFinEjercicio();
            } else {
                this.sonidoFinFase();
            }

            this.avanzarAutomaticamente();
            return;
        }

        // No llamar a guardar-pausa-incompleta mientras la rutina sigue
        // ejecutándose: ese endpoint cambia su estado a INCOMPLETA.

    }

    private avanzarAutomaticamente(): void {
        // Siguiente fase del mismo ejercicio.
        if (
            this.indiceFase + 1 <
            this.ejercicioActual.fases.length
        ) {
            this.indiceFase++;
            this.prepararFase();
            return;
        }

        // Siguiente ejercicio.
        if (
            this.indiceEjercicio + 1 <
            this.totalEjercicios
        ) {
            this.indiceEjercicio++;
            this.indiceFase = 0;
            this.prepararFase();
            return;
        }

        // Las pruebas nunca llaman al endpoint finalizar-pausa.
        this.detenerReloj();
        void this.finalizarRutina();
    }

    // ======================================
    // PETICIONES HTTP Y CSRF
    // ======================================

    private async enviarPost(
        ruta: string,
        cuerpo: unknown = null
    ): Promise<void> {

        const csrf = await firstValueFrom(
            this.http.get<{
                headerName: string;
                token: string;
            }>(
                this.api.csrf,
                {withCredentials: true}
            )
        );

        await firstValueFrom(
            this.http.post(
                ruta,
                cuerpo,
                {
                    withCredentials: true,
                    headers: {
                        [csrf.headerName]: csrf.token
                    },
                    responseType: 'text'
                }
            )
        );
    }

    private mensajeError(
        error: unknown
    ): string {
        if (error instanceof HttpErrorResponse) {
            if (error.status === 401) {
                return 'La sesión ha expirado.';
            }

            if (error.status === 403) {
                return 'No tienes autorización o falta CSRF.';
            }

            if (error.status === 404) {
                return 'La ruta solicitada no existe en Spring Boot.';
            }

            if (error.status === 409) {
                return (
                    'La operación no coincide con el ' +
                    'estado actual de la actividad.'
                );
            }

            return `Error HTTP ${error.status}.`;
        }

        return error instanceof Error
            ? error.message
            : 'Ha ocurrido un error inesperado.';
    }

    private async mostrarError(
        titulo: string,
        error: unknown
    ): Promise<void> {
        await Swal.fire({
            icon: 'error',
            title: titulo,
            text: this.mensajeError(error),
            confirmButtonText: 'Entendido'
        });
    }

    // ======================================
    // GUARDAR EL PROGRESO
    // ======================================

    private progresoActual(): ProgresoPausa {
        return {
            indiceEjercicio: this.indiceEjercicio,
            indiceFase: this.indiceFase,
            tiempoRestante: this.tiempoRestante,
            segundosTranscurridos:
            this.segundosTranscurridos
        };
    }

    private async guardarProgreso(): Promise<void> {
        // Solo se guarda cuando el usuario abandona temporalmente la rutina.
        // El backend registra el estado INCOMPLETA y limpia la sesión activa.
        if (!this.actividadRegistrada) {
            throw new Error('No hay una actividad iniciada para guardar.');
        }

        await this.enviarPost(
            this.api.guardar,
            this.progresoActual()
        );
    }

    // ======================================
    // CONSULTAR PAUSA INCOMPLETA
    // ======================================

    private progresoValido(
        p: PausaPendiente
    ): boolean {
        if (
            !p ||
            p.estado !== 'INCOMPLETA' ||
            !Number.isInteger(p.id) ||
            p.id <= 0
        ) {
            return false;
        }

        if (
            !Number.isInteger(p.indiceEjercicio) ||
            p.indiceEjercicio < 0 ||
            p.indiceEjercicio >= this.totalEjercicios
        ) {
            return false;
        }

        const fases =
            this.rutina[p.indiceEjercicio].fases;

        if (
            !Number.isInteger(p.indiceFase) ||
            p.indiceFase < 0 ||
            p.indiceFase >= fases.length
        ) {
            return false;
        }

        const duracion =
            fases[p.indiceFase].tiempo;

        if (
            !Number.isInteger(p.tiempoRestante) ||
            p.tiempoRestante < 1 ||
            p.tiempoRestante > duracion
        ) {
            return false;
        }

        let anteriores = 0;

        for (
            let e = 0;
            e < p.indiceEjercicio;
            e++
        ) {
            for (const fase of this.rutina[e].fases) {
                anteriores += fase.tiempo;
            }
        }

        for (
            let f = 0;
            f < p.indiceFase;
            f++
        ) {
            anteriores += fases[f].tiempo;
        }

        const calculado =
            anteriores +
            duracion -
            p.tiempoRestante;

        return (
            calculado === p.segundosTranscurridos &&
            calculado >= 0 &&
            calculado < this.totalSegundos
        );
    }


    async consultarPausaPendiente(): Promise<void> {
        if (
            this.consultandoPendiente ||
            this.actividadRegistrada ||
            this.destruido
        ) {
            return;
        }

        this.consultandoPendiente = true;
        this.errorPendiente = '';

        try {
            const respuesta = await firstValueFrom(
                this.http.get<PausaPendiente[]>(
                    this.api.incompletas,
                    {withCredentials: true}
                )
            );

            this.pausasIncompletas = (
                Array.isArray(respuesta) ? respuesta : []
            ).filter(p => this.progresoValido(p));

            // Mantener compatibilidad con el HTML actual.
            this.pausaPendiente =
                this.pausasIncompletas[0] ?? null;

        } catch (error) {
            this.pausasIncompletas = [];
            this.pausaPendiente = null;
            this.errorPendiente =
                this.mensajeError(error);

        } finally {
            this.consultandoPendiente = false;
            this.actualizarVista();
        }
    }


    // ======================================
    // INICIAR NUEVA PAUSA
    // ======================================

    async iniciarRutina(): Promise<void> {
        if (!this.puedeIniciar) {
            return;
        }

        // La autorización de audio se solicita
        // inmediatamente después del clic.
        void this.prepararAudio();

        this.procesando = true;
        this.estado = 'INICIANDO';

        try {
            await this.enviarPost(
                this.api.iniciar
            );

            this.actividadRegistrada = true;

            this.indiceEjercicio = 0;
            this.indiceFase = 0;
            this.segundosTranscurridos = 0;

            this.sienesDetectadas = false;
            this.ultimaDeteccionSienes = 0;
            this.muestraMasajeSienes = null;

            this.prepararFase();

            this.estado = 'EN_PROCESO';
            this.procesando = false;

            this.iniciarReloj();

        } catch (error) {
            this.estado = 'PREPARACION';

            await this.mostrarError(
                'No se pudo iniciar la pausa',
                error
            );

        } finally {
            this.procesando = false;
            this.ultimoTick = performance.now();
            this.actualizarVista();
        }
    }

    // ======================================
    // CONTINUAR UNA PAUSA DE HOY
    // ======================================

    async continuarPausaGuardada(
        pausaSeleccionada?: PausaPendiente
    ): Promise<void> {
        if (
            this.estado !== 'PREPARACION' ||
            this.procesando ||
            !(pausaSeleccionada ?? this.pausaPendiente)
        ) {
            return;
        }

        const pendiente = pausaSeleccionada ?? this.pausaPendiente!;

        if (!this.progresoValido(pendiente)) {
            return;
        }

        void this.prepararAudio();

        this.procesando = true;
        this.estado = 'INICIANDO';

        try {
            await this.enviarPost(
                this.api.reanudar,
                {id: pendiente.id}
            );

            this.indiceEjercicio =
                pendiente.indiceEjercicio;

            this.indiceFase =
                pendiente.indiceFase;

            this.segundosTranscurridos =
                pendiente.segundosTranscurridos;

            this.actividadRegistrada = true;
            this.pausaPendiente = null;
            this.pausasIncompletas = [];

            this.prepararFase(
                pendiente.tiempoRestante
            );

            this.estado = 'EN_PROCESO';
            this.procesando = false;

            this.iniciarReloj();

        } catch (error) {
            this.estado = 'PREPARACION';

            await this.mostrarError(
                'No se pudo continuar la pausa',
                error
            );

        } finally {
            this.procesando = false;
            this.ultimoTick = performance.now();
            this.actualizarVista();
        }
    }

    // ======================================
    // PAUSAR Y DEJAR PARA DESPUÉS
    // ======================================

    async pausarEjercicio(): Promise<void> {
        if (
            this.estado !== 'EN_PROCESO' ||
            this.procesando ||
            this.confirmandoSalida
        ) {
            return;
        }

        this.estado = 'PAUSADA';
        this.posturaConfirmada = false;
        this.ultimoTick = performance.now();

        this.confirmandoSalida = true;

        try {
            const opcion = await Swal.fire({
                icon: 'question',
                title: 'Pausa temporal',
                text:
                    '¿Quieres continuar ahora o dejar ' +
                    'la actividad para después, hoy?',
                showDenyButton: true,
                showCancelButton: true,
                confirmButtonText: 'Continuar ahora',
                denyButtonText: 'Dejar para después',
                cancelButtonText: 'Seguir en pausa',
                allowOutsideClick: false
            });

            if (opcion.isConfirmed) {
                this.estado = 'EN_PROCESO';
                this.ultimoTick = performance.now();
                return;
            }

            if (!opcion.isDenied) {
                return;
            }

            this.procesando = true;
            this.estado = 'GUARDANDO';

            await this.guardarProgreso();

            this.actividadRegistrada = false;
            this.detenerReloj();

            await Swal.fire({
                icon: 'success',
                title: 'Progreso guardado',
                text:
                    'La pausa quedó INCOMPLETA. ' +
                    'Podrás retomarla durante el día de hoy.',
                confirmButtonText: 'Volver al panel'
            });

            await this.router.navigateByUrl(
                this.rutaPanel
            );

        } catch (error) {
            this.estado = 'PAUSADA';

            await this.mostrarError(
                'No se pudo guardar la pausa',
                error
            );

        } finally {
            this.confirmandoSalida = false;
            this.procesando = false;
            this.ultimoTick = performance.now();
            this.actualizarVista();
        }
    }

    reanudarEjercicio(): void {
        if (
            this.estado !== 'PAUSADA' ||
            this.procesando ||
            this.confirmandoSalida
        ) {
            return;
        }

        this.estado = 'EN_PROCESO';

        this.ultimoTick = performance.now();

        this.ultimaLecturaPose = 0;
        this.ultimaPosturaCorrecta = 0;
        this.posturaConfirmada = false;

// Reiniciar las detecciones guiadas al continuar.
        this.movimientoGuiadoDetectado = false;
        this.ultimaEvidenciaGuiada = 0;
        this.inicioCandidatoGuiado = 0;

// Evitar reutilizar movimientos anteriores.
        this.ultimaMuestraHombros = null;
        this.movimientosHombrosRecientes = 0;
        this.primerMovimientoHombros = 0;

        this.ultimaMuestraMuneca = null;
        this.munecaPosicionAlcanzada = false;
        this.movimientosMuneca = 0;
        this.primerMovimientoMuneca = 0;


        this.actualizarVista();
    }

    // ======================================
    // FINALIZAR SOLO AL 100 %
    // ======================================

    async finalizarRutina(): Promise<void> {
        if (
            !this.actividadRegistrada ||
            this.procesando ||
            this.segundosTranscurridos !==
            this.totalSegundos ||
            this.tiempoRestante !== 0
        ) {
            return;
        }

        this.detenerReloj();

        this.procesando = true;
        this.estado = 'FINALIZANDO';

        try {
            // NO guardar como INCOMPLETA antes de finalizar:
            // guardar-pausa-incompleta cambia el estado y cerraría la sesión.
            // El servidor valida el tiempo mínimo en finalizar-pausa.
            await this.enviarPost(
                this.api.finalizar
            );

            this.actividadRegistrada = false;
            this.estado = 'TERMINADA';

            await Swal.fire({
                icon: 'success',
                title: 'Pausa activa completada',
                text:
                    'Terminaste los 10 ejercicios y ' +
                    'los 600 segundos programados.',
                confirmButtonText: 'Volver al panel'
            });

            await this.router.navigateByUrl(
                this.rutaPanel
            );

        } catch (error) {
            this.estado =
                'ERROR_FINALIZACION';

            await this.mostrarError(
                'No se pudo confirmar la finalización',
                error
            );

        } finally {
            this.procesando = false;
            this.actualizarVista();
        }
    }

    // ======================================
    // CANCELAR DEFINITIVAMENTE Y SALIR
    // ======================================

    async cancelarRutina(): Promise<void> {
        if (
            this.procesando ||
            this.confirmandoSalida
        ) {
            return;
        }

        const estadoAnterior = this.estado;

        // Detener tiempo durante confirmación.
        if (this.estado === 'EN_PROCESO') {
            this.estado = 'PAUSADA';
        }

        this.confirmandoSalida = true;

        try {
            const respuesta = await Swal.fire({
                icon: 'warning',
                title: '¿Cancelar y cerrar sesión?',
                text:
                    'La actividad se marcará CANCELADA ' +
                    'y no podrás retomarla.',
                showCancelButton: true,
                confirmButtonText: 'Sí, cancelar y salir',
                cancelButtonText: 'Continuar',
                allowOutsideClick: false
            });

            if (!respuesta.isConfirmed) {
                this.estado = estadoAnterior;
                this.ultimoTick = performance.now();
                return;
            }

            this.procesando = true;

            if (this.actividadRegistrada) {
                await this.enviarPost(
                    this.api.cancelar
                );

                this.actividadRegistrada = false;

            } else if (this.pausaPendiente) {
                await this.enviarPost(
                    this.api.reanudar,
                    {id: this.pausaPendiente.id}
                );

                await this.enviarPost(
                    this.api.cancelar
                );

                this.pausaPendiente = null;
            }

            this.detenerReloj();


            await this.enviarPost(
                this.api.logout
            );

            window.location.assign('/signin');

        } catch (error) {
            this.estado = this.actividadRegistrada
                ? 'PAUSADA'
                : estadoAnterior;

            await this.mostrarError(
                'No se pudo cancelar o cerrar sesión',
                error
            );

        } finally {
            this.procesando = false;
            this.confirmandoSalida = false;
            this.ultimoTick = performance.now();
            this.actualizarVista();
        }
    }

    // Volver al panel NO cancela. Guarda la pausa para después.
    async volverAlInicio(): Promise<void> {
        if (
            this.procesando ||
            this.confirmandoSalida
        ) {
            return;
        }

        if (!this.actividadRegistrada) {
            await this.router.navigateByUrl(
                this.rutaPanel
            );
            return;
        }

        const anterior = this.estado;
        this.estado = 'PAUSADA';
        this.procesando = true;

        try {
            await this.guardarProgreso();

            this.actividadRegistrada = false;
            this.detenerReloj();

            await this.router.navigateByUrl(
                this.rutaPanel
            );

        } catch (error) {
            this.estado = anterior;

            await this.mostrarError(
                'No se pudo guardar el progreso',
                error
            );

        } finally {
            this.procesando = false;
            this.ultimoTick = performance.now();
            this.actualizarVista();
        }
    }

    // SONIDOS

    private contextoAudio: AudioContext | null = null;

    private async prepararAudio(): Promise<void> {
        try {
            if (!this.contextoAudio) {
                this.contextoAudio = new AudioContext();
            }

            if (
                this.contextoAudio.state === 'suspended'
            ) {
                await this.contextoAudio.resume();
            }
        } catch (error) {
            console.warn(
                'No se pudo activar el audio:',
                error
            );
        }
    }

    private reproducirTono(
        frecuencia: number,
        inicio: number,
        duracion: number,
        intensidad: number
    ): void {
        const audio = this.contextoAudio;

        if (
            !audio ||
            audio.state !== 'running'
        ) {
            return;
        }

        const oscilador =
            audio.createOscillator();

        const ganancia =
            audio.createGain();

        oscilador.type = 'sine';
        oscilador.frequency.value =
            frecuencia;

        ganancia.gain.setValueAtTime(
            0.0001,
            inicio
        );

        ganancia.gain.exponentialRampToValueAtTime(
            intensidad,
            inicio + 0.025
        );

        ganancia.gain.exponentialRampToValueAtTime(
            0.0001,
            inicio + duracion
        );

        oscilador.connect(ganancia);
        ganancia.connect(audio.destination);

        oscilador.start(inicio);
        oscilador.stop(
            inicio + duracion + 0.03
        );
    }

    private sonidoFinFase(): void {
        const audio = this.contextoAudio;

        if (!audio || audio.state !== 'running') {
            return;
        }

        const t = audio.currentTime;

        this.reproducirTono(
            760, t, 0.18, 0.35
        );

        this.reproducirTono(
            940, t + 0.22, 0.24, 0.35
        );
    }

    private sonidoFinEjercicio(): void {
        const audio = this.contextoAudio;

        if (!audio || audio.state !== 'running') {
            return;
        }

        const t = audio.currentTime;

        this.reproducirTono(
            650, t, 0.24, 0.48
        );

        this.reproducirTono(
            850, t + 0.28, 0.24, 0.48
        );

        this.reproducirTono(
            1100, t + 0.56, 0.42, 0.48
        );
    }

    // CÁMARA Y MEDIAPIPE

    iniciandoCamara = true;
    camaraDisponible = false;
    cuerpoDetectado = false;
    mediapipeCargado = false;
    posturaConfirmada = false;

    mensajeCamara = 'Cámara no disponible.';

    private stream: MediaStream | null = null;
    private pose: InstanciaPose | null = null;
    private frameId: number | null = null;

    private ejecutandoCamara = false;
    private procesandoFrame = false;

    private deteccionesConsecutivas = 0;
    private deteccionesPerdidas = 0;

    private ultimaLecturaPose = 0;
    private ultimaPosturaCorrecta = 0;

    private readonly mediaPipeBase =
        'https://cdn.jsdelivr.net/npm/@mediapipe/pose';

    private get pistaVideo():
        MediaStreamTrack | undefined {
        return this.stream?.getVideoTracks()[0];
    }

    get camaraConectada(): boolean {
        const pista = this.pistaVideo;

        return (
            this.camaraDisponible &&
            !!pista &&
            pista.readyState === 'live' &&
            !pista.muted
        );
    }

    get camaraConImagen(): boolean {
        const video =
            this.videoElement?.nativeElement;

        return (
            this.camaraConectada &&
            !!video &&
            video.readyState >= 2 &&
            video.videoWidth > 0
        );
    }

    get estadoCamaraTexto(): string {
        if (this.iniciandoCamara) {
            return 'Iniciando cámara';
        }

        if (!this.camaraConectada) {
            return 'Cámara desconectada';
        }

        if (!this.cuerpoDetectado) {
            return 'Buscando persona';
        }

        return 'Cámara activa';
    }

    get claseEstadoCamara(): string {
        return this.cuerpoDetectado
            ? 'text-green-600'
            : 'text-amber-600';
    }

    get clasePuntoCamara(): string {
        return this.cuerpoDetectado
            ? 'bg-green-500'
            : 'bg-amber-500';
    }

    get estadoVisualPostura(): string {
        if (!this.camaraConectada) {
            return 'Sin cámara';
        }

        if (this.estado === 'PAUSADA') {
            return 'Rutina pausada';
        }

        if (this.enPreparacionFase) {
            return this.faseActual.modo === 'MEDIAPIPE'
                ? (this.indiceEjercicio === 0
                    ? 'Mira al frente y mantén la cabeza recta'
                    : 'Prepárate para la postura')
                : 'Prepárate';
        }


        if (
            this.estado === 'EN_PROCESO' &&
            this.faseActual.modo === 'GUIADA'
        ) {
            // Ejercicio 9: pantorrillas y tobillos.
            // Tiempo guiado, sin validar movimientos.
            if (this.indiceEjercicio === 8) {
                return this.indiceFase === 0
                    ? 'Elevación de talones: ejercicio guiado en curso'
                    : 'Rotación de tobillos: ejercicio guiado en curso';
            }

            if (this.guiadaConDeteccion) {
                if (!this.cuerpoDetectado) {
                    return 'Buscando persona';
                }

                return this.movimientoGuiadoDetectado
                    ? 'Movimiento o postura detectada · continúa la fase'
                    : this.indicacionPosturaGuiada();
            }

            return 'Ejercicio guiado: Sigue las instrucciones';
        }

        if (!this.cuerpoDetectado) {
            return 'Buscando persona';
        }

        if (
            this.faseActual.modo === 'MEDIAPIPE' &&
            this.indiceEjercicio === 0 &&
            !this.referenciaCuello
        ) {
            return 'Ubica rostro y hombros frente a la cámara';
        }

        return this.posturaConfirmada
            ? 'Postura reconocida: mantén suavemente'
            : this.indicacionPostura;
    }

    get claseVisualPostura(): string {
        if (
            this.estado === 'EN_PROCESO' &&
            this.faseActual.modo === 'GUIADA'
        ) {
            return 'bg-blue-600/90 text-white';
        }

        if (this.posturaConfirmada) {
            return 'bg-green-600/90 text-white';
        }

        return 'bg-gray-800/90 text-white';
    }

    async iniciarCamara(): Promise<void> {
        this.detenerCamara();
        this.iniciandoCamara = true;

        try {
            if (!navigator.mediaDevices?.getUserMedia) {
                throw new Error(
                    'El navegador no permite usar la cámara.'
                );
            }

            const stream =
                await navigator.mediaDevices.getUserMedia({
                    audio: false,
                    video: {
                        width: {ideal: 640},
                        height: {ideal: 480},
                        facingMode: 'user'
                    }
                });

            if (this.destruido) {
                stream.getTracks().forEach(
                    pista => pista.stop()
                );
                return;
            }

            this.stream = stream;

            const video =
                this.videoElement?.nativeElement;

            if (!video) {
                throw new Error(
                    'No existe el elemento de video.'
                );
            }

            video.srcObject = stream;
            await video.play();

            await this.cargarMediaPipe();

            if (this.destruido) {
                return;
            }

            this.camaraDisponible = true;
            this.ejecutandoCamara = true;

            this.procesarVideo();

        } catch (error) {
            this.detenerCamara();

            this.mensajeCamara =
                error instanceof Error
                    ? error.message
                    : 'No se pudo activar la cámara.';

        } finally {
            this.iniciandoCamara = false;
            this.actualizarVista();
        }
    }

    private async cargarScript(
        url: string
    ): Promise<void> {
        const existente =
            document.querySelector(
                `script[src="${url}"]`
            ) as HTMLScriptElement | null;

        if (
            existente?.dataset['cargado'] === 'true'
        ) {
            return;
        }

        await new Promise<void>(
            (resolve, reject) => {
                const script =
                    existente ??
                    document.createElement('script');

                const limpiar = (): void => {
                    script.removeEventListener(
                        'load', cargado
                    );

                    script.removeEventListener(
                        'error', error
                    );
                };

                const cargado = (): void => {
                    script.dataset['cargado'] =
                        'true';

                    limpiar();
                    resolve();
                };

                const error = (): void => {
                    limpiar();
                    reject(
                        new Error(
                            'No se pudo cargar ' + url
                        )
                    );
                };

                script.addEventListener(
                    'load', cargado
                );

                script.addEventListener(
                    'error', error
                );

                if (!existente) {
                    script.src = url;
                    script.async = true;
                    document.head.appendChild(script);
                }
            }
        );
    }

    private async cargarMediaPipe(): Promise<void> {
        const mp =
            window as Window & MediaPipeGlobal;

        if (!mp.Pose) {
            await this.cargarScript(
                this.mediaPipeBase + '/pose.js'
            );
        }

        if (!mp.drawConnectors) {
            await this.cargarScript(
                'https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js'
            );
        }

        if (!mp.Pose) {
            throw new Error(
                'No se pudo iniciar MediaPipe.'
            );
        }

        this.pose = new mp.Pose({
            locateFile: archivo =>
                this.mediaPipeBase + '/' + archivo
        });

        this.pose.setOptions({
            modelComplexity: 1,
            smoothLandmarks: true,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        });

        this.pose.onResults(
            resultado =>
                this.procesarResultadoPose(resultado)
        );

        this.mediapipeCargado = true;
    }

    private procesarVideo(): void {
        this.zone.runOutsideAngular(() => {
            const siguiente = async (): Promise<void> => {
                if (
                    this.destruido ||
                    !this.ejecutandoCamara
                ) {
                    return;
                }

                const video =
                    this.videoElement?.nativeElement;

                if (
                    video &&
                    this.pose &&
                    video.readyState >= 2 &&
                    !this.procesandoFrame
                ) {
                    this.procesandoFrame = true;

                    try {
                        await this.pose.send({
                            image: video
                        });
                    } catch (error) {
                        console.warn(
                            'MediaPipe:',
                            error
                        );
                    } finally {
                        this.procesandoFrame = false;
                    }
                }

                if (this.ejecutandoCamara) {
                    this.frameId =
                        requestAnimationFrame(
                            () => void siguiente()
                        );
                }
            };

            void siguiente();
        });
    }

    private punto(
        puntos: PuntoCorporal[],
        indice: number,
        minimo = 0.35
    ): PuntoCorporal | null {
        const p = puntos[indice];

        if (
            !p ||
            !Number.isFinite(p.x) ||
            !Number.isFinite(p.y) ||
            (p.visibility ?? 1) < minimo
        ) {
            return null;
        }

        return p;
    }

    private referenciaCuello: {
        inclinacion: number;
        alturaNariz: number;
    } | null = null;
    private muestrasReferencia = 0;
    private indicacionPostura = 'Ajusta tu postura';
    private candidataDesde = 0;
    private ultimaLecturaValida = 0;

    private medidasCuello(puntos: PuntoCorporal[]): {
        inclinacion: number;
        alturaNariz: number;
    } | null {
        const nariz = this.punto(puntos, 0, 0.5);
        const orejaIzq = this.punto(puntos, 7, 0.35);
        const orejaDer = this.punto(puntos, 8, 0.35);
        const hombroIzq = this.punto(puntos, 11, 0.5);
        const hombroDer = this.punto(puntos, 12, 0.5);

        if (!nariz || !orejaIzq || !orejaDer ||
            !hombroIzq || !hombroDer) {
            return null;
        }

        const ancho = Math.abs(hombroIzq.x - hombroDer.x);
        if (ancho < 0.12) {
            return null;
        }

        // Compensar una cámara ligeramente inclinada usando los hombros.
        const desnivelOrejas = (orejaDer.y - orejaIzq.y) / ancho;
        const desnivelHombros = (hombroDer.y - hombroIzq.y) / ancho;
        const alturaOrejas = (orejaDer.y + orejaIzq.y) / 2;

        return {
            inclinacion: desnivelOrejas - desnivelHombros,
            alturaNariz: (nariz.y - alturaOrejas) / ancho
        };
    }

    private calibrarCuello(puntos: PuntoCorporal[]): void {
        const medidas = this.medidasCuello(puntos);
        if (!medidas) {
            return;
        }

        // Media móvil durante la preparación de tres segundos.
        const n = Math.min(this.muestrasReferencia + 1, 30);
        if (!this.referenciaCuello) {
            this.referenciaCuello = {...medidas};
        } else {
            this.referenciaCuello.inclinacion +=
                (medidas.inclinacion - this.referenciaCuello.inclinacion) / n;
            this.referenciaCuello.alturaNariz +=
                (medidas.alturaNariz - this.referenciaCuello.alturaNariz) / n;
        }
        this.muestrasReferencia = n;
    }

    private validarCuello(puntos: PuntoCorporal[]): boolean {
        if (this.indiceEjercicio !== 0) {
            return false;
        }

        const actual = this.medidasCuello(puntos);
        const neutra = this.referenciaCuello;
        if (!actual || !neutra || this.muestrasReferencia < 3) {
            this.indicacionPostura =
                'Muestra tu rostro y ambos hombros a la cámara';
            return false;
        }

        const lateral = actual.inclinacion - neutra.inclinacion;
        const frontal = actual.alturaNariz - neutra.alturaNariz;

        switch (this.indiceFase) {
            case 0:
                this.indicacionPostura =
                    'Inclina suavemente la cabeza hacia tu derecha';
                return lateral > 0.07;
            case 1:
                this.indicacionPostura =
                    'Inclina suavemente la cabeza hacia tu izquierda';
                return lateral < -0.07;

            case 2: // Barbilla hacia el pecho.
                this.indicacionPostura =
                    'Baja suavemente la barbilla hacia el pecho';
                return frontal > 0.08;
            case 3: // Mirada un poco hacia arriba.
                this.indicacionPostura =
                    'Eleva ligeramente la mirada sin forzar el cuello';
                return frontal < -0.08;
            default:
                return false;
        }
    }

    private anguloArticulacion(
        a: PuntoCorporal, b: PuntoCorporal, c: PuntoCorporal
    ): number {
        const ux = a.x - b.x, uy = a.y - b.y;
        const vx = c.x - b.x, vy = c.y - b.y;
        const norma = Math.hypot(ux, uy) * Math.hypot(vx, vy);
        if (norma < 0.0001) return 0;
        const coseno = Math.max(-1, Math.min(1, (ux * vx + uy * vy) / norma));
        return Math.acos(coseno) * 180 / Math.PI;
    }

    private validarTriceps(puntos: PuntoCorporal[]): boolean {
        const hI = this.punto(puntos, 11);
        const hD = this.punto(puntos, 12);
        const cI = this.punto(puntos, 13);
        const cD = this.punto(puntos, 14);
        const mI = this.punto(puntos, 15);
        const mD = this.punto(puntos, 16);
        if (!hI || !hD || !cI || !cD || !mI || !mD) {
            this.indicacionPostura = 'Muestra ambos codos y brazos a la cámara';
            return false;
        }
        const ancho = Math.abs(hD.x - hI.x);
        if (ancho < 0.10) return false;
        const derechoArriba = this.indiceFase === 0;
        const arriba = derechoArriba ? {h: hD, c: cD, m: mD} : {h: hI, c: cI, m: mI};
        const abajo = derechoArriba ? {h: hI, c: cI, m: mI} : {h: hD, c: cD, m: mD};
        // Verificar AMBOS codos: uno cerca/por encima de hombro, el otro más bajo.
        const codoAlto = arriba.c.y < arriba.h.y + ancho * 0.13;
        const codoBajo = abajo.c.y > abajo.h.y - ancho * 0.10;
        const diferenciaCodos = abajo.c.y - arriba.c.y > ancho * 0.13;
        const brazoAltoFlexionado = this.anguloArticulacion(
            arriba.h, arriba.c, arriba.m
        ) < 165;
        const manoBaja = abajo.m.y > abajo.h.y - ancho * 0.20;
        this.indicacionPostura = derechoArriba
            ? 'Eleva el codo derecho y mantén el izquierdo abajo'
            : 'Eleva el codo izquierdo y mantén el derecho abajo';
        return codoAlto && codoBajo && diferenciaCodos &&
            brazoAltoFlexionado && manoBaja;
    }

    private validarEspaldaAlta(puntos: PuntoCorporal[]): boolean {
        const hI = this.punto(puntos, 11);
        const hD = this.punto(puntos, 12);
        const cI = this.punto(puntos, 13);
        const cD = this.punto(puntos, 14);
        const mI = this.punto(puntos, 15);
        const mD = this.punto(puntos, 16);
        if (!hI || !hD || !cI || !cD || !mI || !mD) {
            this.indicacionPostura = 'Muestra ambos brazos y muñecas en la cámara';
            return false;
        }
        const ancho = Math.abs(hD.x - hI.x);
        if (ancho < 0.10) return false;
        const alturaManos = Math.abs(mI.y - hI.y) < ancho * 0.50 &&
            Math.abs(mD.y - hD.y) < ancho * 0.50;
        const extensionIzq = this.anguloArticulacion(hI, cI, mI) > 125;
        const extensionDer = this.anguloArticulacion(hD, cD, mD) > 125;
        const manosJuntas = Math.hypot(mI.x - mD.x, mI.y - mD.y) < ancho * 0.70;
        this.indicacionPostura = 'Extiende ambos codos y junta las manos al frente';
        return alturaManos && extensionIzq && extensionDer && manosJuntas;
    }

    // Referencia neutra del ejercicio lateral: los hombros deben verse
    // durante los 3 segundos iniciales, con el tronco sin inclinar.
    private referenciaHombrosLateral: {
        desnivel: number;
        muestras: number;
    } | null = null;

    private calibrarHombrosLateral(puntos: PuntoCorporal[]): void {
        const izquierdo = this.punto(puntos, 11, 0.50);
        const derecho = this.punto(puntos, 12, 0.50);
        if (!izquierdo || !derecho) return;

        const ancho = Math.hypot(
            derecho.x - izquierdo.x,
            derecho.y - izquierdo.y
        );
        if (ancho < 0.12) return;

        const desnivel = (izquierdo.y - derecho.y) / ancho;
        if (!this.referenciaHombrosLateral) {
            this.referenciaHombrosLateral = {desnivel, muestras: 1};
            return;
        }
        const ref = this.referenciaHombrosLateral;
        ref.muestras = Math.min(ref.muestras + 1, 30);
        ref.desnivel += (desnivel - ref.desnivel) / ref.muestras;
    }

    private validarLateral(puntos: PuntoCorporal[]): boolean {
        // Fase 0: brazo DERECHO arriba, hombro IZQUIERDO desciende.
        // Fase 1: brazo IZQUIERDO arriba, hombro DERECHO desciende.
        // No se exige detectar la muñeca ni el brazo contrario.
        const hI = this.punto(puntos, 11, 0.50);
        const hD = this.punto(puntos, 12, 0.50);
        const derechoArriba = this.indiceFase === 0;
        const codo = this.punto(puntos, derechoArriba ? 14 : 13, 0.55);
        const oreja = this.punto(puntos, derechoArriba ? 8 : 7, 0.40);
        const nariz = this.punto(puntos, 0, 0.40);
        const ref = this.referenciaHombrosLateral;

        if (!hI || !hD || !codo || (!oreja && !nariz)) {
            this.indicacionPostura = derechoArriba
                ? 'Muestra hombros, cabeza y codo derecho'
                : 'Muestra hombros, cabeza y codo izquierdo';
            return false;
        }
        if (!ref || ref.muestras < 3) {
            this.indicacionPostura =
                'Mantén los hombros rectos durante la preparación';
            return false;
        }

        const ancho = Math.hypot(hD.x - hI.x, hD.y - hI.y);
        if (ancho < 0.12) {
            this.indicacionPostura = 'Colócate de frente a la cámara';
            return false;
        }

        const hombroActivo = derechoArriba ? hD : hI;
        const puntoCabeza = oreja ?? nariz!;

        // Un codo apenas levantado sobre el hombro NO es suficiente:
        // debe llegar aproximadamente a la altura de la cabeza y
        // situarse cerca de ella para representar el brazo sobre la cabeza.
        const codoSobreCabeza =
            codo.y <= puntoCabeza.y + ancho * 0.12 &&
            codo.y < hombroActivo.y - ancho * 0.30 &&
            Math.abs(codo.x - puntoCabeza.x) <= ancho * 0.95;

        // El hombro que debe cambiar de posición es el CONTRARIO al
        // brazo levantado: medimos cuánto baja frente al hombro activo,
        // descontando el desnivel existente en la postura neutra.
        const desnivelActual = (hI.y - hD.y) / ancho;
        const cambio = desnivelActual - ref.desnivel;
        const hombroContrarioDesciende = derechoArriba
            ? cambio >= 0.18  // Hombro izquierdo desciende
            : cambio <= -0.18; // Hombro derecho desciende

        if (!codoSobreCabeza) {
            this.indicacionPostura = derechoArriba
                ? 'Lleva el codo derecho por encima de la cabeza'
                : 'Lleva el codo izquierdo por encima de la cabeza';
        } else if (!hombroContrarioDesciende) {
            this.indicacionPostura = derechoArriba
                ? 'Inclina el tronco hacia la izquierda: baja el hombro izquierdo'
                : 'Inclina el tronco hacia la derecha: baja el hombro derecho';
        } else {
            this.indicacionPostura =
                'Mantén el brazo sobre la cabeza y la inclinación suave';
        }
        return codoSobreCabeza && hombroContrarioDesciende;
    }

    private indicacionPosturaGuiada(): string {
        switch (this.indiceEjercicio) {
            case 1:
                return 'Mueve los hombros varias veces; cámara comprobando desplazamientos';
            case 2:
                return 'Coloca un codo arriba y el contrario abajo, según la fase';
            case 3:
                return 'Estira los dos brazos al frente y acerca las manos';
            case 4:
                return this.indiceFase === 0 ||
                this.indiceFase === 2
                    ? 'Muestra el brazo extendido y mueve los dedos hacia abajo'
                    : 'Muestra el brazo extendido y mueve los dedos hacia arriba';
            case 5:
                return 'Gira suavemente el tronco; muestra los hombros a la cámara';
            case 8:
                if (this.indiceFase === 0) {
                    return 'Eleva y baja los talones lentamente; observando el movimiento vertical';
                }
                return 'Realiza los giros de tobillo con apoyo estable; observando el tronco';
            default:
                return 'Sigue la instrucción del ejercicio guiado';
        }
    }


    private obtenerMedidasPantorrillas(
        puntos: PuntoCorporal[]
    ): {
        hombrosY: number;
        codosY: number;
        caderaY: number | null;
        ancho: number;
    } | null {

        const hI = this.punto(puntos, 11, 0.45);
        const hD = this.punto(puntos, 12, 0.45);

        const cI = this.punto(puntos, 13, 0.30);
        const cD = this.punto(puntos, 14, 0.30);

        if (!hI || !hD || !cI || !cD) {
            return null;
        }

        const ancho = Math.hypot(
            hD.x - hI.x,
            hD.y - hI.y
        );

        if (ancho < 0.11) {
            return null;
        }

        // Cadera opcional.
        const caderaI = this.punto(puntos, 23, 0.65);
        const caderaD = this.punto(puntos, 24, 0.65);

        const caderaY =
            caderaI && caderaD
                ? (caderaI.y + caderaD.y) / 2
                : null;

        return {
            hombrosY: (hI.y + hD.y) / 2,
            codosY: (cI.y + cD.y) / 2,
            caderaY,
            ancho
        };
    }

    private calibrarPantorrillas(
        puntos: PuntoCorporal[]
    ): void {
        if (
            this.indiceEjercicio !== 8 ||
            this.indiceFase !== 0 ||
            this.preparacionRestante <= 0
        ) {
            return;
        }

        const actual =
            this.obtenerMedidasPantorrillas(puntos);

        if (!actual) {
            return;
        }

        const ref = this.referenciaPantorrillas;

        if (!ref) {
            this.referenciaPantorrillas = {
                hombrosY: actual.hombrosY,
                codosY: actual.codosY,
                caderaY: actual.caderaY,
                muestras: 1
            };
            return;
        }

        const n = Math.min(ref.muestras + 1, 30);

        ref.hombrosY +=
            (actual.hombrosY - ref.hombrosY) / n;

        ref.codosY +=
            (actual.codosY - ref.codosY) / n;

        if (actual.caderaY !== null) {
            if (ref.caderaY === null) {
                ref.caderaY = actual.caderaY;
            } else {
                ref.caderaY +=
                    (actual.caderaY - ref.caderaY) / n;
            }
        }

        ref.muestras = n;
    }

    private observarPantorrillasTobillos(
        puntos: PuntoCorporal[],
        ahora: number
    ): void {

        if (
            this.indiceEjercicio !== 8 ||
            this.indiceFase !== 0
        ) {
            return;
        }

        const actual =
            this.obtenerMedidasPantorrillas(puntos);

        const ref = this.referenciaPantorrillas;

        if (!actual || !ref || ref.muestras < 3) {
            return;
        }

        const ancho = actual.ancho;

        // Movimiento vertical respecto a la
        // posición inicial de pie.
        const subidaHombros =
            (ref.hombrosY - actual.hombrosY) / ancho;

        const subidaCodos =
            (ref.codosY - actual.codosY) / ancho;

        // Los hombros y codos deben subir juntos.
        // Esto reduce el reconocimiento cuando
        // solamente se encogen los hombros.
        const movimientoConjunto =
            Math.abs(
                subidaHombros - subidaCodos
            ) < 0.045;

        const subio =
            subidaHombros > 0.045 &&
            subidaCodos > 0.035 &&
            movimientoConjunto;

        const bajo =
            Math.abs(subidaHombros) < 0.025 &&
            Math.abs(subidaCodos) < 0.025;

        // Si aparece la cadera, comprobar que
        // su desplazamiento sea compatible.
        // La cadera no es obligatoria.
        let caderaCompatible = true;

        if (
            ref.caderaY !== null &&
            actual.caderaY !== null
        ) {
            const subidaCadera =
                (ref.caderaY - actual.caderaY) / ancho;

            caderaCompatible =
                subidaCadera > 0.015 &&
                Math.abs(
                    subidaCadera - subidaHombros
                ) < 0.10;
        }

        if (
            subio &&
            caderaCompatible &&
            !this.cuerpoElevado
        ) {
            this.cuerpoElevado = true;
            this.ultimaEvidenciaGuiada = ahora;
        }

        if (bajo && this.cuerpoElevado) {
            this.cuerpoElevado = false;
            this.ultimaEvidenciaGuiada = ahora;
        }
    }

    // Detecta indicios observables de movimiento. No certifica técnica,
    // dirección del giro, ni manos ocultas detrás de la espalda.

    private observarEjercicioGuiado(
        puntos: PuntoCorporal[]
    ): void {
        if (
            this.estado !== 'EN_PROCESO' ||
            this.preparacionRestante > 0 ||
            this.faseActual.modo !== 'GUIADA' ||
            !this.guiadaConDeteccion
        ) {
            return;
        }

        const ahora = performance.now();

        const hI = this.punto(puntos, 11, 0.50);
        const hD = this.punto(puntos, 12, 0.50);

        if (!hI || !hD) {
            this.inicioCandidatoGuiado = 0;
            return;
        }

        const ancho = Math.hypot(
            hD.x - hI.x,
            hD.y - hI.y
        );

        if (ancho < 0.11) {
            this.inicioCandidatoGuiado = 0;
            return;
        }

        // Ejercicio 9: pantorrillas y tobillos.
        if (this.indiceEjercicio === 8) {
            this.observarPantorrillasTobillos(
                puntos,
                ahora
            );
            return;
        }

        // 2. HOMBROS: MOVIMIENTO CONTINUO

        if (this.indiceEjercicio === 1) {
            const nariz = this.punto(puntos, 0, 0.45);

            if (!nariz) {
                return;
            }

            // Posiciones relativas a la nariz para
            // reducir falsos positivos por desplazamiento
            // de todo el cuerpo frente a la cámara.
            const izquierdo = (hI.y - nariz.y) / ancho;
            const derecho = (hD.y - nariz.y) / ancho;

            const anterior = this.ultimaMuestraHombros;

            if (!anterior) {
                this.ultimaMuestraHombros = {
                    izquierdo,
                    derecho,
                    instante: ahora
                };
                return;
            }

            const intervalo = ahora - anterior.instante;

            // No comparar fotogramas consecutivos
            // demasiado próximos: amplifican el ruido.
            if (intervalo < 120) {
                return;
            }

            this.ultimaMuestraHombros = {
                izquierdo,
                derecho,
                instante: ahora
            };

            if (intervalo > 500) {
                this.movimientosHombrosRecientes = 0;
                this.primerMovimientoHombros = 0;
                return;
            }

            const cambioIzquierdo = Math.abs(
                izquierdo - anterior.izquierdo
            );

            const cambioDerecho = Math.abs(
                derecho - anterior.derecho
            );

            // Reconocer movimiento apreciable en al menos un hombro.
            const movimiento =
                Math.max(cambioIzquierdo, cambioDerecho) > 0.012;

            if (movimiento) {
                if (
                    this.primerMovimientoHombros === 0 ||
                    ahora - this.primerMovimientoHombros > 1200
                ) {
                    this.primerMovimientoHombros = ahora;
                    this.movimientosHombrosRecientes = 1;
                } else {
                    this.movimientosHombrosRecientes++;
                }

                // Requiere más de una muestra con movimiento.
                if (this.movimientosHombrosRecientes >= 2) {
                    this.ultimaEvidenciaGuiada = ahora;
                }
            }

            // No conservar reconocimientos antiguos.
            // Reiniciar únicamente después de una interrupción
// prolongada en los movimientos detectados.
            if (
                this.ultimaEvidenciaGuiada > 0 &&
                ahora - this.ultimaEvidenciaGuiada > 800
            ) {
                this.movimientosHombrosRecientes = 0;
                this.primerMovimientoHombros = 0;
                this.ultimaEvidenciaGuiada = 0;
            }

            return;
        }

        // =====================================
        // ESTIRAMIENTOS: POSTURA SOSTENIDA
        // =====================================

        let cumple = false;

        // =====================================
        // 3. TRÍCEPS
        // =====================================

        if (this.indiceEjercicio === 2) {
            const cI = this.punto(puntos, 13, 0.40);
            const cD = this.punto(puntos, 14, 0.40);

            if (!cI || !cD) {
                this.inicioCandidatoGuiado = 0;
                return;
            }

            const derechoArriba =
                this.indiceFase === 0;

            const cAlto = derechoArriba ? cD : cI;
            const cBajo = derechoArriba ? cI : cD;

            const hAlto = derechoArriba ? hD : hI;
            const hBajo = derechoArriba ? hI : hD;

            cumple =
                cAlto.y <= hAlto.y - ancho * 0.12 &&
                cBajo.y >= hBajo.y - ancho * 0.10 &&
                cBajo.y - cAlto.y > ancho * 0.25;
        }



            // =====================================
            // EJERCICIO 4: ESPALDA ALTA
            // Detección más tolerante
        // =====================================

        else if (this.indiceEjercicio === 3) {
            const mI = this.punto(puntos, 15, 0.30);
            const mD = this.punto(puntos, 16, 0.30);

            if (!mI || !mD) {
                this.inicioCandidatoGuiado = 0;
                return;
            }

            const distanciaManos = Math.hypot(
                mI.x - mD.x,
                mI.y - mD.y
            );

            const centroX = (hI.x + hD.x) / 2;

            const manosCercanas =
                distanciaManos < ancho * 1.15;

            const manosAlFrente =
                Math.abs(mI.x - centroX) < ancho * 0.85 &&
                Math.abs(mD.x - centroX) < ancho * 0.85;

            const alturaAceptable =
                Math.abs(mI.y - hI.y) < ancho * 1.20 &&
                Math.abs(mD.y - hD.y) < ancho * 1.20;

            // No exigimos ángulos de codo porque
            // pueden quedar ocultos al estirar
            // los brazos directamente hacia la cámara.
            cumple =
                manosCercanas &&
                manosAlFrente &&
                alturaAceptable;
        }

            // =====================================
            // EJERCICIO 5: MUÑECAS Y ANTEBRAZOS
            // Flexión y extensión
        // =====================================

        else if (this.indiceEjercicio === 4) {
            // Fases 0 y 1: brazo derecho.
            // Fases 2 y 3: brazo izquierdo.
            const ladoDerecho = this.indiceFase < 2;

            const indiceCodo = ladoDerecho ? 14 : 13;
            const indiceMuneca = ladoDerecho ? 16 : 15;
            const indiceDedo = ladoDerecho ? 20 : 19;

            const codo = this.punto(
                puntos, indiceCodo, 0.35
            );

            const muneca = this.punto(
                puntos, indiceMuneca, 0.35
            );

            // MediaPipe Pose incluye un punto
            // aproximado del dedo índice.
            const dedo = this.punto(
                puntos, indiceDedo, 0.25
            );

            if (!codo || !muneca || !dedo) {
                this.inicioCandidatoGuiado = 0;
                this.ultimaMuestraMuneca = null;
                return;
            }

            const largoAntebrazo = Math.hypot(
                muneca.x - codo.x,
                muneca.y - codo.y
            );

            if (largoAntebrazo < 0.07) {
                this.inicioCandidatoGuiado = 0;
                return;
            }

            // Coordenadas de imagen:
            // Y positiva = hacia abajo.
            const posicionDedo = (
                dedo.y - muneca.y
            ) / largoAntebrazo;

            // Fases 0 y 2: dedos hacia ABAJO.
            // Fases 1 y 3: dedos hacia ARRIBA.
            const dedosAbajo =
                this.indiceFase === 0 ||
                this.indiceFase === 2;

            const direccionCorrecta = dedosAbajo
                ? posicionDedo > 0.12
                : posicionDedo < -0.12;

            const anterior = this.ultimaMuestraMuneca;

            if (!anterior) {
                this.ultimaMuestraMuneca = {
                    posicion: posicionDedo,
                    instante: ahora
                };

                cumple = false;
            } else {
                const intervalo =
                    ahora - anterior.instante;

                if (intervalo >= 120) {
                    this.ultimaMuestraMuneca = {
                        posicion: posicionDedo,
                        instante: ahora
                    };

                    const desplazamiento = Math.abs(
                        posicionDedo - anterior.posicion
                    );

                    // Solo cuenta cambios recientes
                    // de la posición relativa dedo-muñeca.
                    if (
                        intervalo <= 600 &&
                        desplazamiento > 0.045 &&
                        direccionCorrecta
                    ) {
                        if (
                            this.primerMovimientoMuneca === 0 ||
                            ahora - this.primerMovimientoMuneca > 1500
                        ) {
                            this.primerMovimientoMuneca = ahora;
                            this.movimientosMuneca = 1;
                        } else {
                            this.movimientosMuneca++;
                        }

                        if (this.movimientosMuneca >= 2) {
                            this.munecaPosicionAlcanzada = true;
                        }
                    }

                    if (
                        this.primerMovimientoMuneca > 0 &&
                        ahora - this.primerMovimientoMuneca > 1500 &&
                        !this.munecaPosicionAlcanzada
                    ) {
                        this.movimientosMuneca = 0;
                        this.primerMovimientoMuneca = 0;
                    }
                }

                // Una vez observado el movimiento
                // hacia la posición, se permite
                // mantener el estiramiento quieto.
                cumple =
                    this.munecaPosicionAlcanzada &&
                    direccionCorrecta;

                // Si abandona la postura, debe
                // volver a colocar la mano.
                if (!direccionCorrecta) {
                    this.munecaPosicionAlcanzada = false;
                    this.movimientosMuneca = 0;
                    this.primerMovimientoMuneca = 0;
                }
            }
        }

            // =====================================
            // 6. GIRO DE TRONCO
        // =====================================

        else if (this.indiceEjercicio === 5) {
            if (
                this.muestrasAnchoNeutro < 3 ||
                this.anchoHombrosNeutro < 0.11
            ) {
                this.inicioCandidatoGuiado = 0;
                return;
            }

            // Cambio aparente de orientación de hombros.
            // No determina con certeza el sentido del giro.
            cumple =
                ancho < this.anchoHombrosNeutro * 0.79;
        }

        // =====================================
        // ESTABILIZACIÓN DE POSTURA
        // =====================================

        if (cumple) {
            if (this.inicioCandidatoGuiado === 0) {
                this.inicioCandidatoGuiado = ahora;
            }

            if (
                ahora - this.inicioCandidatoGuiado >= 450
            ) {
                // Se actualiza mientras la postura
                // continúe siendo reconocida.
                this.ultimaEvidenciaGuiada = ahora;
            }
        } else {
            this.inicioCandidatoGuiado = 0;
        }
    }

    private calibrarGiroGuiado(puntos: PuntoCorporal[]): void {
        if (this.indiceEjercicio !== 5 ||
            this.faseActual.modo !== 'GUIADA') return;
        const a = this.punto(puntos, 11, 0.50);
        const b = this.punto(puntos, 12, 0.50);
        if (!a || !b) return;
        const ancho = Math.hypot(b.x - a.x, b.y - a.y);
        if (ancho < 0.11) return;
        this.muestrasAnchoNeutro = Math.min(30, this.muestrasAnchoNeutro + 1);
        this.anchoHombrosNeutro += (ancho - this.anchoHombrosNeutro) /
            this.muestrasAnchoNeutro;
    }

    private validarPosturaActual(puntos: PuntoCorporal[]): boolean {
        switch (this.indiceEjercicio) {
            case 0:
                return this.validarCuello(puntos);
            case 2:
                return this.validarTriceps(puntos);
            case 3:
                return this.validarEspaldaAlta(puntos);
            case 6:
                return this.validarLateral(puntos);
            default:
                return false;
        }
    }

    private procesarResultadoPose(
        resultado: ResultadoPose
    ): void {
        if (this.destruido) {
            return;
        }

        const video =
            this.videoElement?.nativeElement;

        const canvas =
            this.canvasElement?.nativeElement;

        if (!video || !canvas) {
            return;
        }

        const ctx =
            canvas.getContext('2d');

        if (!ctx) {
            return;
        }

        if (
            canvas.width !== video.videoWidth ||
            canvas.height !== video.videoHeight
        ) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
        }

        ctx.clearRect(
            0, 0, canvas.width, canvas.height
        );

        const puntos = resultado.poseLandmarks;

        const hombrosVisibles =
            !!puntos &&
            !!this.punto(puntos, 11) &&
            !!this.punto(puntos, 12);

        if (hombrosVisibles) {
            this.deteccionesConsecutivas++;
            this.deteccionesPerdidas = 0;
        } else {
            this.deteccionesPerdidas++;
            this.deteccionesConsecutivas = 0;
        }

        if (
            !this.cuerpoDetectado &&
            this.deteccionesConsecutivas >= 3
        ) {
            this.zone.run(() => {
                this.cuerpoDetectado = true;
                this.actualizarVista();
            });
        }

        if (
            this.cuerpoDetectado &&
            this.deteccionesPerdidas >= 8
        ) {
            this.zone.run(() => {
                this.cuerpoDetectado = false;
                this.posturaConfirmada = false;
                this.actualizarVista();
            });
        }

        // Calibrar la cabeza neutra durante la preparación de cada fase.
        if (
            this.estado === 'EN_PROCESO' &&
            this.preparacionRestante > 0 &&
            this.faseActual.modo === 'MEDIAPIPE' &&
            puntos
        ) {
            if (this.indiceEjercicio === 0) {
                this.calibrarCuello(puntos);
            } else if (this.indiceEjercicio === 6) {
                this.calibrarHombrosLateral(puntos);
            }
        }

        if (
            this.estado === 'EN_PROCESO' &&
            puntos &&
            this.preparacionRestante > 0
        ) {
            this.calibrarGiroGuiado(puntos);
            this.calibrarPantorrillas(puntos);
        }

        if (this.estado === 'EN_PROCESO' && puntos &&
            this.preparacionRestante === 0) {
            this.observarEjercicioGuiado(puntos);

            if (this.faseMasajeSienes) {
                const ahora = performance.now();

                if (this.detectarMasajeSienes(puntos, ahora)) {
                    this.ultimaDeteccionSienes = ahora;
                }

                this.sienesDetectadas =
                    this.ultimaDeteccionSienes > 0 &&
                    ahora - this.ultimaDeteccionSienes < 800;
            }

            if (this.indiceEjercicio === 9) {

                // Aplicar solo en la fase cuya instrucción
                // sea cubrir o tapar los ojos.
                const instruccion =
                    this.faseActual.instruccion.toLowerCase();

                const esFaseTaparOjos =
                    /(tap|cubr)/.test(instruccion) &&
                    /oj/.test(instruccion);

                if (esFaseTaparOjos) {
                    const ahora = performance.now();

                    if (this.detectarManosSobreOjos(puntos)) {
                        this.ultimaDeteccionOjos = ahora;
                    }

                    this.ojosCubiertosDetectados =
                        this.ultimaDeteccionOjos > 0 &&
                        ahora - this.ultimaDeteccionOjos < 450;

                } else {
                    this.ojosCubiertosDetectados = false;
                }
            }

        }

        if (
            this.estado === 'EN_PROCESO' &&
            this.preparacionRestante === 0 &&
            this.faseActual.modo === 'MEDIAPIPE'
        ) {
            const valida =
                !!puntos &&
                hombrosVisibles &&
                this.validarPosturaActual(puntos);

            const ahora = performance.now();

            this.ultimaLecturaPose = ahora;

            if (valida) {
                this.ultimaLecturaValida = ahora;
                if (this.candidataDesde === 0) this.candidataDesde = ahora;
            } else if (ahora - this.ultimaLecturaValida > 500) {
                this.candidataDesde = 0;
            }

            // Lateral exige mayor estabilidad para evitar falsos positivos.
            const msConfirmacion =
                this.indiceEjercicio === 0 ? 200 :
                    this.indiceEjercicio === 6 ? 550 : 300;
            const confirmada = this.candidataDesde > 0 &&
                ahora - this.candidataDesde >= msConfirmacion &&
                ahora - this.ultimaLecturaValida <= 500;
            if (confirmada) this.ultimaPosturaCorrecta = ahora;

            if (this.posturaConfirmada !== confirmada) {
                this.zone.run(() => {
                    this.posturaConfirmada = confirmada;
                    this.actualizarVista();
                });
            }
        }

        if (!puntos) {
            return;
        }

        const mp =
            window as Window & MediaPipeGlobal;

        mp.drawConnectors?.(
            ctx,
            puntos,
            mp.POSE_CONNECTIONS ?? [],
            {
                color: '#00FF00',
                lineWidth: 3
            }
        );

        mp.drawLandmarks?.(
            ctx,
            puntos,
            {
                color: '#FF0000',
                lineWidth: 2,
                radius: 3
            }
        );
    }


    private async consultarLimiteDiario(): Promise<void> {
        this.consultandoLimite = true;
        this.errorLimiteDiario = false;

        try {
            const datos = await firstValueFrom(
                this.empleadoService.obtenerResumen()
            );

            this.actividadesRegistradasHoy =
                datos.completadasHoy +
                datos.incompletasHoy +
                datos.canceladasHoy +
                datos.enProcesoHoy;

        } catch (error) {
            console.error(
                'Error consultando límite diario:',
                error
            );

            this.errorLimiteDiario = true;
        } finally {
            this.consultandoLimite = false;
            this.actualizarVista();
        }
    }

    detenerCamara(): void {
        this.ejecutandoCamara = false;

        if (this.frameId !== null) {
            cancelAnimationFrame(
                this.frameId
            );

            this.frameId = null;
        }

        this.stream?.getTracks().forEach(
            pista => pista.stop()
        );

        this.stream = null;

        const video =
            this.videoElement?.nativeElement;

        if (video) {
            video.pause();
            video.srcObject = null;
        }

        const canvas =
            this.canvasElement?.nativeElement;

        if (canvas) {
            canvas.getContext('2d')?.clearRect(
                0, 0, canvas.width, canvas.height
            );
        }

        this.camaraDisponible = false;
        this.cuerpoDetectado = false;
        this.posturaConfirmada = false;
    }

}