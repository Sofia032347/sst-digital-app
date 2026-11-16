import {CommonModule} from '@angular/common';
import {ChangeDetectorRef, Component, OnDestroy, OnInit} from '@angular/core';
import {HttpClient, HttpParams} from '@angular/common/http';
import {forkJoin, Subscription} from 'rxjs';
import {RolUsuarioService} from '../../../core/services/rol-usuario.service';

interface ActividadRegistro {
    id: number;
    fecha: string;
    estado: string;
    duracionSegundos: number | null;
}

interface DiaCalendario {
    fecha: Date;
    clave: string;
    numero: number;
    mesActual: boolean;
    esHoy: boolean;
    seleccionado: boolean;
    enRango: boolean;
    deshabilitado: boolean;
    total: number;
    completadas: number;
}

interface SectorGrafica {
    nombre: string;
    cantidad: number;
    color: string;
    clasePunto: string;
    claseTexto: string;
}

@Component({
    selector: 'app-resumen-pausas',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './resumen-pausas.component.html'
})
export class ResumenPausasComponent
    implements OnInit, OnDestroy {

    readonly diasSemana = [
        'L', 'M', 'X', 'J', 'V', 'S', 'D'
    ];

    // ==========================================
    // CALENDARIO Y SELECCIÓN
    // ==========================================

    readonly hoy = this.soloFecha(new Date());

    mesVisible = new Date(
        this.hoy.getFullYear(),
        this.hoy.getMonth(),
        1
    );

    inicioSeleccion = new Date(this.hoy);
    finSeleccion: Date | null = null;

    // Tras el primer clic se permite escoger
    // una segunda fecha para cerrar el rango.
    esperandoFin = false;

    // ==========================================
    // REGISTROS
    // ==========================================

    actividadesPeriodo: ActividadRegistro[] = [];
    actividadesCalendario: ActividadRegistro[] = [];

    cargando = false;
    error = '';
    avisoSeleccion = '';

    private solicitud?: Subscription;

    constructor(
        private readonly http: HttpClient,
        private readonly rolUsuarioService: RolUsuarioService,
        private readonly cdr: ChangeDetectorRef
    ) {
    }

    ngOnInit(): void {
        this.cargarActividades();
    }

    ngOnDestroy(): void {
        this.solicitud?.unsubscribe();
    }

    // ==========================================
    // FECHAS SIN HORAS
    // ==========================================

    private soloFecha(fecha: Date): Date {
        return new Date(
            fecha.getFullYear(),
            fecha.getMonth(),
            fecha.getDate()
        );
    }

    private claveFecha(fecha: Date): string {

        const anio = fecha.getFullYear();

        const mes = String(
            fecha.getMonth() + 1
        ).padStart(2, '0');

        const dia = String(
            fecha.getDate()
        ).padStart(2, '0');

        return `${anio}-${mes}-${dia}`;
    }

    private sumarDias(
        fecha: Date,
        cantidad: number
    ): Date {

        const resultado = new Date(fecha);

        resultado.setDate(
            resultado.getDate() + cantidad
        );

        return this.soloFecha(resultado);
    }

    private inicioSemana(fecha: Date): Date {

        const resultado = this.soloFecha(fecha);

        const desplazamiento =
            (resultado.getDay() + 6) % 7;

        resultado.setDate(
            resultado.getDate() - desplazamiento
        );

        return resultado;
    }

    private comparar(
        a: Date,
        b: Date
    ): number {

        return this.claveFecha(a).localeCompare(
            this.claveFecha(b)
        );
    }

    private mismoMes(
        a: Date,
        b: Date
    ): boolean {

        return (
            a.getFullYear() === b.getFullYear() &&
            a.getMonth() === b.getMonth()
        );
    }

    private diasInclusivos(
        inicio: Date,
        fin: Date
    ): number {

        const a = Date.UTC(
            inicio.getFullYear(),
            inicio.getMonth(),
            inicio.getDate()
        );

        const b = Date.UTC(
            fin.getFullYear(),
            fin.getMonth(),
            fin.getDate()
        );

        return (
            Math.round(
                (b - a) / 86400000
            ) + 1
        );
    }

    // ==========================================
    // RANGO SELECCIONADO
    // ==========================================

    get fechaFinal(): Date {
        return this.finSeleccion ??
            this.inicioSeleccion;
    }

    get diasSeleccionados(): number {

        return this.diasInclusivos(
            this.inicioSeleccion,
            this.fechaFinal
        );
    }

    get tituloSeleccion(): string {

        const formato = new Intl.DateTimeFormat(
            'es-CO',
            {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
            }
        );

        const inicio =
            formato.format(this.inicioSeleccion);

        if (
            !this.finSeleccion ||
            this.comparar(
                this.inicioSeleccion,
                this.finSeleccion
            ) === 0
        ) {
            return inicio;
        }

        return (
            `${inicio} - ` +
            formato.format(this.finSeleccion)
        );
    }

    get tipoSeleccion(): string {

        const dias = this.diasSeleccionados;

        if (dias === 1) {
            return 'Resumen del día';
        }

        if (dias === 7) {
            return 'Resumen de 7 días';
        }

        return `Resumen de ${dias} días`;
    }

    // ==========================================
    // NAVEGACIÓN DEL CALENDARIO
    // ==========================================

    get tituloMes(): string {

        return new Intl.DateTimeFormat(
            'es-CO',
            {
                month: 'long',
                year: 'numeric'
            }
        ).format(this.mesVisible);
    }

    get puedeAvanzarMes(): boolean {

        const siguiente = new Date(
            this.mesVisible.getFullYear(),
            this.mesVisible.getMonth() + 1,
            1
        );

        return this.comparar(
            siguiente,
            new Date(
                this.hoy.getFullYear(),
                this.hoy.getMonth(),
                1
            )
        ) <= 0;
    }

    moverMes(direccion: number): void {

        if (
            direccion > 0 &&
            !this.puedeAvanzarMes
        ) {
            return;
        }

        this.mesVisible = new Date(
            this.mesVisible.getFullYear(),
            this.mesVisible.getMonth() + direccion,
            1
        );

        this.cargarActividades();
    }

    seleccionarHoy(): void {

        this.inicioSeleccion = new Date(this.hoy);
        this.finSeleccion = null;
        this.esperandoFin = false;

        this.mesVisible = new Date(
            this.hoy.getFullYear(),
            this.hoy.getMonth(),
            1
        );

        this.avisoSeleccion = '';
        this.cargarActividades();
    }

    // ==========================================
    // SELECCIONAR UNA O DOS FECHAS
    // ==========================================

    seleccionarDia(fecha: Date): void {

        const seleccionada = this.soloFecha(fecha);

        if (this.comparar(
            seleccionada,
            this.hoy
        ) > 0) {
            return;
        }

        this.avisoSeleccion = '';

        if (!this.esperandoFin) {

            // Primer clic: día individual.
            this.inicioSeleccion = seleccionada;
            this.finSeleccion = null;
            this.esperandoFin = true;

        } else {

            // Segundo clic: completar el intervalo.
            const primera = this.inicioSeleccion;

            const inicio =
                this.comparar(primera, seleccionada) <= 0
                    ? primera
                    : seleccionada;

            const fin =
                this.comparar(primera, seleccionada) <= 0
                    ? seleccionada
                    : primera;

            const dias =
                this.diasInclusivos(inicio, fin);

            if (dias > 62) {

                this.avisoSeleccion =
                    'Puedes seleccionar hasta 62 días por consulta.';

                // La selección anterior permanece.
                return;
            }

            this.inicioSeleccion = inicio;

            this.finSeleccion =
                this.comparar(inicio, fin) === 0
                    ? null
                    : fin;

            this.esperandoFin = false;
        }

        if (!this.mismoMes(
            seleccionada,
            this.mesVisible
        )) {

            this.mesVisible = new Date(
                seleccionada.getFullYear(),
                seleccionada.getMonth(),
                1
            );
        }

        this.cargarActividades();
    }

    // ==========================================
    // CONSULTAS INDEPENDIENTES
    // ==========================================

    private consultar(
        desde: Date,
        hasta: Date
    ) {
        const params = new HttpParams()
            .set('desde', this.claveFecha(desde))
            .set('hasta', this.claveFecha(hasta));


        const rol = this.rolUsuarioService.usuarioActual?.rol;

        const url = rol === 'RRHH'
            ? '/api/rrhh/mis-actividades'
            : '/api/empleado/actividades';

        return this.http.get<ActividadRegistro[]>(
            url,
            {
                params,
                withCredentials: true
            }
        );
    }

    private rangoCalendario(): {
        desde: Date;
        hasta: Date;
    } {

        const primerDia = new Date(
            this.mesVisible.getFullYear(),
            this.mesVisible.getMonth(),
            1
        );

        const desde =
            this.inicioSemana(primerDia);

        const hasta =
            this.sumarDias(desde, 41);

        return {desde, hasta};
    }

    cargarActividades(): void {

        const calendario =
            this.rangoCalendario();

        this.solicitud?.unsubscribe();

        this.cargando = true;
        this.error = '';

        // Una consulta para el calendario visible
        // y otra para el periodo seleccionado.
        //
        // De este modo el usuario puede navegar
        // por otros meses sin perder su selección
        // ni superar el límite de 62 días de la API.

        this.solicitud = forkJoin({
            calendario: this.consultar(
                calendario.desde,
                calendario.hasta
            ),
            periodo: this.consultar(
                this.inicioSeleccion,
                this.fechaFinal
            )
        }).subscribe({

            next: respuesta => {

                this.actividadesCalendario =
                    respuesta.calendario ?? [];

                this.actividadesPeriodo =
                    (respuesta.periodo ?? [])
                        .slice()
                        .sort(
                            (a, b) =>
                                b.fecha.localeCompare(a.fecha)
                        );

                this.cargando = false;
                this.error = '';
                this.cdr.markForCheck();
            },

            error: error => {

                console.error(
                    'Error cargando actividades:',
                    error
                );

                this.actividadesCalendario = [];
                this.actividadesPeriodo = [];

                this.cargando = false;

                this.error =
                    'No fue posible consultar las actividades. ' +
                    'Revisa la conexión con Spring Boot.';

                this.cdr.markForCheck();
            }
        });
    }

    // ==========================================
    // CONTEOS REALES
    // ==========================================

    get totalActividades(): number {
        return this.actividadesPeriodo.length;
    }

    get completadas(): number {

        return this.actividadesPeriodo.filter(
            a => a.estado === 'COMPLETADA'
        ).length;
    }

    get incompletas(): number {

        return this.actividadesPeriodo.filter(
            a => a.estado === 'INCOMPLETA'
        ).length;
    }

    get canceladas(): number {

        return this.actividadesPeriodo.filter(
            a => a.estado === 'CANCELADA'
        ).length;
    }

    // ==========================================
    // CUMPLIMIENTO DEL PERIODO
    // ==========================================

    get metaPeriodo(): number {

        // Cuatro pausas por cada día transcurrido
        // dentro de las fechas seleccionadas.
        //
        // No contamos días futuros, porque
        // el calendario no permite seleccionarlos.

        return this.diasSeleccionados * 4;
    }

    get porcentajeCumplimiento(): number {

        return this.metaPeriodo > 0
            ? Math.min(
                100,
                Math.round(
                    this.completadas /
                    this.metaPeriodo * 100
                )
            )
            : 0;
    }

    // ==========================================
    // GRÁFICA DONA SIN EN PROCESO
    // ==========================================

    get totalGrafica(): number {

        return (
            this.completadas +
            this.incompletas +
            this.canceladas
        );
    }

    get sectoresGrafica(): SectorGrafica[] {

        return [
            {
                nombre: 'Completadas',
                cantidad: this.completadas,
                color: '#00C950',
                clasePunto: 'bg-green-500',
                claseTexto: 'text-green-600'
            },
            {
                nombre: 'Incompletas',
                cantidad: this.incompletas,
                color: '#FF8904',
                clasePunto: 'bg-orange-500',
                claseTexto: 'text-orange-600'
            },
            {
                nombre: 'Canceladas',
                cantidad: this.canceladas,
                color: '#E7000B',
                clasePunto: 'bg-red-600',
                claseTexto: 'text-red-600'
            }
        ];
    }

    get fondoGrafica(): string {

        const total = this.totalGrafica;

        if (total === 0) {
            return 'conic-gradient(#E5E7EB 0% 100%)';
        }

        let inicio = 0;

        const segmentos: string[] = [];

        for (const sector of this.sectoresGrafica) {

            if (sector.cantidad === 0) {
                continue;
            }

            const fin =
                inicio + sector.cantidad / total * 100;

            segmentos.push(
                `${sector.color} ${inicio}% ${fin}%`
            );

            inicio = fin;
        }

        return `conic-gradient(${segmentos.join(', ')})`;
    }

    // ==========================================
    // CALENDARIO CON RANGO MARCADO
    // ==========================================

    get diasCalendario(): DiaCalendario[] {

        const {desde} =
            this.rangoCalendario();

        const conteos = new Map<
            string,
            { total: number; completadas: number }
        >();

        for (const actividad of this.actividadesCalendario) {

            if (!actividad.fecha) {
                continue;
            }

            const clave =
                actividad.fecha.slice(0, 10);

            const previo = conteos.get(clave) ?? {
                total: 0,
                completadas: 0
            };

            previo.total++;

            if (actividad.estado === 'COMPLETADA') {
                previo.completadas++;
            }

            conteos.set(clave, previo);
        }

        const resultado: DiaCalendario[] = [];

        for (let i = 0; i < 42; i++) {

            const fecha =
                this.sumarDias(desde, i);

            const clave =
                this.claveFecha(fecha);

            const fin = this.fechaFinal;

            const enRango =
                this.comparar(
                    fecha,
                    this.inicioSeleccion
                ) >= 0 &&
                this.comparar(fecha, fin) <= 0;

            const inicioElegido =
                this.comparar(
                    fecha,
                    this.inicioSeleccion
                ) === 0;

            const finElegido =
                this.finSeleccion !== null &&
                this.comparar(
                    fecha,
                    this.finSeleccion
                ) === 0;

            const conteo =
                conteos.get(clave);

            resultado.push({
                fecha,
                clave,
                numero: fecha.getDate(),
                mesActual: this.mismoMes(
                    fecha,
                    this.mesVisible
                ),
                esHoy: this.comparar(
                    fecha,
                    this.hoy
                ) === 0,
                seleccionado:
                    inicioElegido || finElegido,
                enRango,
                deshabilitado:
                    this.comparar(fecha, this.hoy) > 0,
                total: conteo?.total ?? 0,
                completadas: conteo?.completadas ?? 0
            });
        }

        return resultado;
    }

    // ==========================================
    // FORMATEOS
    // ==========================================

    formatearFecha(valor: string): string {

        const fecha = new Date(valor);

        return Number.isFinite(fecha.getTime())
            ? new Intl.DateTimeFormat('es-CO', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            }).format(fecha)
            : 'Sin fecha';
    }

    formatearHora(valor: string): string {

        const fecha = new Date(valor);

        return Number.isFinite(fecha.getTime())
            ? new Intl.DateTimeFormat('es-CO', {
                hour: '2-digit',
                minute: '2-digit'
            }).format(fecha)
            : 'Sin hora';
    }

    formatearDuracion(
        segundos: number | null
    ): string {

        if (
            segundos == null ||
            segundos < 0
        ) {
            return 'Sin duración';
        }

        const minutos =
            Math.floor(segundos / 60);

        const resto = segundos % 60;

        return `${minutos} min ${resto} s`;
    }

    nombreEstado(estado: string): string {

        switch (estado) {

            case 'COMPLETADA':
                return 'Completada';

            case 'INCOMPLETA':
                return 'Incompleta';

            case 'CANCELADA':
                return 'Cancelada';

            case 'EN_PROCESO':
                return 'En proceso';

            default:
                return estado;
        }
    }
}
