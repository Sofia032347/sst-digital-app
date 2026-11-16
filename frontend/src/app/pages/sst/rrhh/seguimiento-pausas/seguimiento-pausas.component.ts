import {CommonModule} from '@angular/common';
import {ChangeDetectorRef, Component, inject, OnDestroy, OnInit} from '@angular/core';
import {HttpClient, HttpParams} from '@angular/common/http';
import {firstValueFrom, interval, Subscription, timeout} from 'rxjs';
import {RolUsuarioService} from '../../../../core/services/rol-usuario.service';

// TIPOS
type Rol = 'EMPLEADO' | 'RRHH';

type PeriodoActividad = 'dia' | 'mes';

interface ResumenUsuarioPausas {
    usuarioId: number;
    nombre: string;
    email: string;
    rol: Rol;
    esperadas: number;
    completadas: number;
    incompletas: number;
    canceladas: number;
    enProceso: number;
    noIniciadas: number;
    completadasParaMeta: number;
    cumplimiento: number;
}

interface SeguimientoConsolidado {
    fechaCorte: string;
    inicioMes: string;
    metaDiaria: number;
    diario: ResumenUsuarioPausas[];
    mensual: ResumenUsuarioPausas[];
}

interface DetalleDiaRango {
    fecha: string;
    esperadas: number;
    completadas: number;
    incompletas: number;
    canceladas: number;
    enProceso: number;
    noIniciadas: number;
    completadasParaMeta: number;
    cumplimiento: number;
}

interface ResumenUsuarioRango extends ResumenUsuarioPausas {
    detalleDiario: DetalleDiaRango[];
}

interface ResumenActividad {
    usuarios: number;
    esperadas: number;
    completadas: number;
    incompletas: number;
    canceladas: number;
    enProceso: number;
    noIniciadas: number;
    completadasParaMeta: number;
    cumplimiento: number;
}

interface SeguimientoRango {
    inicio: string;
    fin: string;
    metaDiaria: number;
    general: {
        totalUsuarios: number;
        esperadas: number;
        completadas: number;
        incompletas: number;
        canceladas: number;
        enProceso: number;
        noIniciadas: number;
        completadasParaMeta: number;
        cumplimiento: number;
    };
    usuarios: ResumenUsuarioRango[];
}

interface DiaCalendario {
    fecha: string;
    numero: number;
    perteneceAlMes: boolean;
    seleccionado: boolean;
    enRango: boolean;
    esInicio: boolean;
    esFin: boolean;
    esHoy: boolean;
    esFuturo: boolean;
}

interface GraficaActividadDia {
    fecha: string;
    esperadas: number;
    completadas: number;
    incompletas: number;
    canceladas: number;
    enProceso: number;
    noIniciadas: number;
    completadasParaMeta: number;
    cumplimiento: number;
}

@Component({
    selector: 'app-seguimiento-pausas',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './seguimiento-pausas.component.html'
})
export class SeguimientoPausasComponent
    implements OnInit, OnDestroy {

    private readonly http = inject(HttpClient);
    private readonly cdr = inject(ChangeDetectorRef);


    private readonly rolUsuarioService =
        inject(RolUsuarioService);

    private readonly apiConsolidado =
        '/api/rrhh/seguimiento-consolidado';

    private readonly apiRango =
        '/api/rrhh/seguimiento-rango';

    private readonly apiExcelGeneral =
        '/api/rrhh/seguimiento-rango/excel';

    private readonly apiExcelIndividual =
        '/api/rrhh/seguimiento-rango/excel-individual';

// Control del estado de las descargas.
    descargandoExcel = false;
    mensajeErrorExcel = '';

    private actualizacionAutomatica?: Subscription;

    private numeroConsulta = 0;
    private destruido = false;

    readonly intervaloActualizacion = 15000;
    readonly maximoDiasRango = 366;

    // ==========================================
    // CALENDARIO
    // ==========================================

    readonly fechaMaxima = this.obtenerFechaLocal();

    fechaSeleccionada = this.fechaMaxima;


    fechaInicio: string | null = this.fechaMaxima;
    fechaFin: string | null = null;

// La fecha de hoy se carga inicialmente como un solo día.
// El primer clic del usuario inicia una nueva selección.
    esperandoFechaFinal = false;


    mesVisible = new Date().getMonth();
    anioVisible = new Date().getFullYear();

    readonly nombresMeses = [
        'Enero', 'Febrero', 'Marzo',
        'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre',
        'Octubre', 'Noviembre', 'Diciembre'
    ];

    readonly diasSemana = [
        'L', 'M', 'X', 'J', 'V', 'S', 'D'
    ];

    // ==========================================
    // DATOS
    // ==========================================

    busqueda = '';

    cargando = false;
    error = '';

    datos: SeguimientoConsolidado | null = null;

    datosRango: SeguimientoRango | null = null;

    emailUsuarioActual = '';

    // Compatibilidad temporal con el HTML anterior.
    // Lo eliminaremos al quitar el selector de período.
    periodoActividad: PeriodoActividad = 'dia';

    // ==========================================
    // MODAL DE DETALLE
    // ==========================================

    detalleAbierto = false;

    usuarioDetalle: ResumenUsuarioRango | null = null;

    tipoDetalle: 'dia' | 'rango' = 'rango';

    // ==========================================
    // CICLO DE VIDA
    // ==========================================

    ngOnInit(): void {
        void this.cargarSeguimiento();

        this.actualizacionAutomatica = interval(
            this.intervaloActualizacion
        ).subscribe(() => {

            if (!this.cargando) {
                void this.cargarSeguimiento(true);
            }
        });
    }

    ngOnDestroy(): void {
        this.destruido = true;
        this.actualizacionAutomatica?.unsubscribe();
        this.numeroConsulta++;
    }

    // ==========================================
    // CONSULTAR BACKEND
    // ==========================================


    async cargarSeguimiento(automatico = false): Promise<void> {
        const consultaActual = ++this.numeroConsulta;

        this.cargando = true;

        if (!automatico) {
            this.error = '';
        }

        const inicio = this.fechaInicio ?? this.fechaSeleccionada;
        const fin = this.fechaFin ?? inicio;

        const esConsultaActual = () =>
            !this.destruido &&
            consultaActual === this.numeroConsulta;

        const parametrosRango = new HttpParams()
            .set('inicio', inicio)
            .set('fin', fin);

        const parametrosDiario = new HttpParams()
            .set('fecha', this.fechaSeleccionada);

        // Cada petición tiene un límite de espera.
        const consultarUsuario = async () => {
            if (this.emailUsuarioActual) {
                return;
            }

            this.cdr.markForCheck();

            const usuario = await firstValueFrom(
                this.rolUsuarioService
                    .obtenerUsuarioActual()
                    .pipe(timeout(12000))
            );

            if (!esConsultaActual()) return;

            if (!usuario.autenticado) {
                throw new Error('Sesión no autenticada.');
            }

            this.emailUsuarioActual = (usuario.email ?? '')
                .trim()
                .toLowerCase();
        };

        // Las gráficas se actualizan en cuanto llega el rango.
        const consultarRango = async () => {
            const rango = await firstValueFrom(
                this.http.get<SeguimientoRango>(
                    this.apiRango,
                    {
                        params: parametrosRango,
                        withCredentials: true
                    }
                ).pipe(timeout(12000))
            );

            if (!esConsultaActual()) return;


            this.datosRango = rango;

// Actualiza las gráficas y el informe del período
// sin depender de un clic en el calendario.
            this.cdr.markForCheck();

            if (this.usuarioDetalle) {
                const actualizado = rango.usuarios.find(
                    usuario =>
                        usuario.usuarioId ===
                        this.usuarioDetalle?.usuarioId
                );

                this.usuarioDetalle = actualizado ?? null;

                if (!actualizado) {
                    this.detalleAbierto = false;
                }
            }
        };

        // La tabla diaria se actualiza independientemente.
        const consultarDiario = async () => {
            const consolidado = await firstValueFrom(
                this.http.get<SeguimientoConsolidado>(
                    this.apiConsolidado,
                    {
                        params: parametrosDiario,
                        withCredentials: true
                    }
                ).pipe(timeout(12000))
            );

            if (!esConsultaActual()) return;


            this.datos = consolidado;

// Actualiza la tabla diaria al recibir sus datos.
            this.cdr.markForCheck();

        };

        try {
            const resultados = await Promise.allSettled([
                consultarUsuario(),
                consultarRango(),
                consultarDiario()
            ]);

            if (!esConsultaActual()) return;

            const errores = resultados.filter(
                resultado => resultado.status === 'rejected'
            );

            if (errores.length > 0) {
                console.error(
                    'Error en las consultas de seguimiento:',
                    errores
                );

                this.error =
                    'No se pudo actualizar toda la información. ' +
                    'Verifica la conexión con el servidor.';
            } else {
                this.error = '';
            }

        } catch (error) {
            if (!esConsultaActual()) return;

            console.error(
                'Error inesperado en seguimiento:',
                error
            );

            this.error =
                'Ocurrió un error al actualizar el seguimiento.';

        } finally {
            if (esConsultaActual()) {
                this.cargando = false;

                // Refresca el indicador de carga, los mensajes
                // y los controles dependientes del estado.
                this.cdr.markForCheck();
            }
        }
    }

    // ==========================================
    // SELECCIÓN DE UNA O DOS FECHAS
    // ==========================================

    seleccionarDia(dia: DiaCalendario): void {

        if (dia.esFuturo) {
            return;
        }

        // Primer clic o inicio de una selección nueva.
        if (
            !this.fechaInicio ||
            !this.esperandoFechaFinal
        ) {
            this.establecerRango(dia.fecha, null);
            return;
        }

        // Segundo clic: ordenar las dos fechas.
        const inicio =
            dia.fecha < this.fechaInicio
                ? dia.fecha
                : this.fechaInicio;

        const fin =
            dia.fecha > this.fechaInicio
                ? dia.fecha
                : this.fechaInicio;

        const cantidadDias =
            this.contarDias(inicio, fin);

        if (cantidadDias > this.maximoDiasRango) {
            this.error =
                'Solo puedes seleccionar hasta 366 días.';
            return;
        }

        this.establecerRango(inicio, fin);
    }

    private establecerRango(
        inicio: string,
        fin: string | null
    ): void {

        this.fechaInicio = inicio;
        this.fechaFin = fin;

        // Un solo día: aún admite un segundo clic.
        // Dos fechas: el próximo clic inicia otro rango.
        this.esperandoFechaFinal = fin === null;

        this.fechaSeleccionada = fin ?? inicio;

        const fecha = this.crearFechaLocal(
            this.fechaSeleccionada
        );

        this.mesVisible = fecha.getMonth();
        this.anioVisible = fecha.getFullYear();

        this.cerrarDetalle();

        void this.cargarSeguimiento();
    }

    actualizarFecha(valor: string): void {

        if (
            !/^\d{4}-\d{2}-\d{2}$/.test(valor) ||
            valor > this.fechaMaxima
        ) {
            return;
        }

        const fecha = this.crearFechaLocal(valor);

        if (
            Number.isNaN(fecha.getTime()) ||
            this.formatearFecha(fecha) !== valor
        ) {
            return;
        }

        this.establecerRango(valor, null);
    }

    irHoy(): void {
        this.actualizarFecha(
            this.obtenerFechaLocal()
        );
    }

    limpiarRango(): void {
        this.actualizarFecha(
            this.obtenerFechaLocal()
        );
    }

    get textoFechasSeleccionadas(): string {

        if (!this.fechaInicio) {
            return 'Selecciona una fecha';
        }

        if (!this.fechaFin) {
            return (
                'Día seleccionado: ' +
                this.fechaInicio
            );
        }

        return (
            'Del ' + this.fechaInicio +
            ' al ' + this.fechaFin
        );
    }

    get cantidadDiasSeleccionados(): number {

        if (!this.fechaInicio) {
            return 0;
        }

        return this.contarDias(
            this.fechaInicio,
            this.fechaFin ?? this.fechaInicio
        );
    }

    // ==========================================
    // DÍAS DEL CALENDARIO
    // ==========================================

    get nombreMesVisible(): string {

        return (
            this.nombresMeses[this.mesVisible] +
            ' de ' +
            this.anioVisible
        );
    }

    get puedeAvanzarMes(): boolean {

        const hoy = new Date();

        return (
            this.anioVisible < hoy.getFullYear() ||
            (
                this.anioVisible === hoy.getFullYear() &&
                this.mesVisible < hoy.getMonth()
            )
        );
    }

    get diasCalendario(): DiaCalendario[] {

        const primerDia = new Date(
            this.anioVisible,
            this.mesVisible,
            1
        );

        // Semana desde el lunes.
        const desplazamiento =
            (primerDia.getDay() + 6) % 7;

        const inicioCuadricula = new Date(
            this.anioVisible,
            this.mesVisible,
            1 - desplazamiento
        );

        const dias: DiaCalendario[] = [];

        for (let i = 0; i < 42; i++) {

            const fecha = new Date(
                inicioCuadricula.getFullYear(),
                inicioCuadricula.getMonth(),
                inicioCuadricula.getDate() + i
            );

            const clave = this.formatearFecha(fecha);

            const fechaInicial = this.fechaInicio;
            const fechaFinal = this.fechaFin;

            const esInicio =
                clave === fechaInicial;

            const esFin =
                fechaFinal !== null &&
                clave === fechaFinal;

            const enRango =
                fechaInicial !== null &&
                fechaFinal !== null &&
                clave >= fechaInicial &&
                clave <= fechaFinal;

            dias.push({

                fecha: clave,
                numero: fecha.getDate(),

                perteneceAlMes:
                    fecha.getMonth() === this.mesVisible &&
                    fecha.getFullYear() === this.anioVisible,

                seleccionado: esInicio || esFin,

                enRango,
                esInicio,
                esFin,

                esHoy:
                    clave === this.fechaMaxima,

                esFuturo:
                    clave > this.fechaMaxima
            });
        }

        return dias;
    }

    irMesAnterior(): void {

        const fecha = new Date(
            this.anioVisible,
            this.mesVisible - 1,
            1
        );

        this.mesVisible = fecha.getMonth();
        this.anioVisible = fecha.getFullYear();
    }

    irMesSiguiente(): void {

        if (!this.puedeAvanzarMes) {
            return;
        }

        const fecha = new Date(
            this.anioVisible,
            this.mesVisible + 1,
            1
        );

        this.mesVisible = fecha.getMonth();
        this.anioVisible = fecha.getFullYear();
    }

    // ==========================================
    // TABLAS
    // ==========================================

    actualizarBusqueda(valor: string): void {
        this.busqueda = valor;
    }

    get registrosDiarios(): ResumenUsuarioPausas[] {

        return this.filtrarUsuarios(
            this.datos?.diario ?? []
        );
    }

    // La segunda tabla ahora representa
    // el rango seleccionado, no solo el mes.
    // Conservamos el nombre para que el HTML
    // anterior siga compilando.
    get registrosMensuales(): ResumenUsuarioPausas[] {

        return this.filtrarUsuarios(
            this.datosRango?.usuarios ?? []
        );
    }

    get registrosRango(): ResumenUsuarioRango[] {

        return this.filtrarUsuarios(
            this.datosRango?.usuarios ?? []
        );
    }

    get totalUsuarios(): number {

        return this.datosRango?.general.totalUsuarios ?? 0;
    }

    private filtrarUsuarios<T extends ResumenUsuarioPausas>(
        registros: T[]
    ): T[] {

        const texto = this.busqueda
            .trim()
            .toLowerCase();

        if (!texto) {
            return registros;
        }

        return registros.filter(usuario =>
            usuario.nombre.toLowerCase().includes(texto) ||
            usuario.email.toLowerCase().includes(texto) ||
            usuario.rol.toLowerCase().includes(texto)
        );
    }


    get usuarioPersonalRango(): ResumenUsuarioRango | null {

        if (!this.datosRango || !this.emailUsuarioActual) {
            return null;
        }

        const emailActual =
            this.emailUsuarioActual.trim().toLowerCase();

        return this.datosRango.usuarios.find(usuario =>
            (usuario.email ?? '').trim().toLowerCase()
            === emailActual
        ) ?? null;
    }

    get resumenPersonal(): ResumenActividad | null {

        const usuario = this.usuarioPersonalRango;

        return usuario
            ? this.calcularResumen([usuario])
            : null;
    }

    get resumenGeneral(): ResumenActividad {

        return this.calcularResumen(
            this.datosRango?.usuarios ?? []
        );
    }


// ==========================================
// GRÁFICA PERSONAL: TODOS LOS DÍAS DEL RANGO
// ==========================================

    get graficaPersonal(): GraficaActividadDia[] {

        return this.usuarioPersonalRango
            ?.detalleDiario ?? [];
    }

// ==========================================
// GRÁFICA GENERAL: SUMA POR CADA DÍA
// ==========================================

    get graficaGeneral(): GraficaActividadDia[] {

        const usuarios = this.datosRango?.usuarios ?? [];

        const agrupados = new Map<
            string,
            GraficaActividadDia
        >();

        for (const usuario of usuarios) {

            for (const dia of usuario.detalleDiario) {

                let registro = agrupados.get(dia.fecha);

                if (!registro) {

                    registro = {
                        fecha: dia.fecha,
                        esperadas: 0,
                        completadas: 0,
                        incompletas: 0,
                        canceladas: 0,
                        enProceso: 0,
                        noIniciadas: 0,
                        completadasParaMeta: 0,
                        cumplimiento: 0
                    };

                    agrupados.set(dia.fecha, registro);
                }

                registro.esperadas += dia.esperadas;
                registro.completadas += dia.completadas;
                registro.incompletas += dia.incompletas;
                registro.canceladas += dia.canceladas;
                registro.enProceso += dia.enProceso;
                registro.noIniciadas += dia.noIniciadas;

                registro.completadasParaMeta +=
                    dia.completadasParaMeta;
            }
        }

        return Array.from(agrupados.values())
            .sort((a, b) => a.fecha.localeCompare(b.fecha))
            .map(dia => ({

                ...dia,

                cumplimiento: dia.esperadas > 0
                    ? Math.round(
                    dia.completadasParaMeta * 10000
                    / dia.esperadas
                ) / 100
                    : 0
            }));
    }

// ==========================================
// TOTAL DE PAUSAS REGISTRADAS
// ==========================================

    totalActividades(
        resumen: ResumenActividad | null
    ): number {

        if (!resumen) {
            return 0;
        }

        return (
            resumen.completadas +
            resumen.incompletas +
            resumen.canceladas +
            resumen.enProceso
        );
    }

    // ==========================================
    // COMPATIBILIDAD CON HTML ACTUAL
    // ==========================================

    actualizarPeriodoActividad(
        periodo: PeriodoActividad
    ): void {

        // Compatibilidad temporal.
        // El próximo HTML eliminará estos botones.
        this.periodoActividad = periodo;
    }

    get etiquetaPeriodo(): string {

        return this.textoFechasSeleccionadas;
    }

    get cumplimientoDiario(): number {

        return this.calcularResumen(
            this.datos?.diario ?? []
        ).cumplimiento;
    }

    // El indicador ahora muestra el rango.
    get cumplimientoMensual(): number {

        return this.resumenGeneral.cumplimiento;
    }

    // ==========================================
    // MODAL: VER DETALLE
    // ==========================================

    verDetalle(
        usuarioId: number,
        tipo: 'dia' | 'rango'
    ): void {

        const usuario = this.datosRango?.usuarios.find(
            registro =>
                registro.usuarioId === usuarioId
        );

        if (!usuario) {
            this.error =
                'No se encontró el detalle del usuario.';
            return;
        }

        this.usuarioDetalle = usuario;

        this.tipoDetalle = tipo;

        this.detalleAbierto = true;
    }

    cerrarDetalle(): void {

        this.detalleAbierto = false;
        this.usuarioDetalle = null;
    }

    get detalleDiarioGrafica(): DetalleDiaRango[] {

        if (!this.usuarioDetalle) {
            return [];
        }

        if (this.tipoDetalle === 'dia') {

            return this.usuarioDetalle.detalleDiario.filter(
                dia =>
                    dia.fecha === this.fechaSeleccionada
            );
        }

        return this.usuarioDetalle.detalleDiario;
    }

    get resumenDetalle(): ResumenActividad | null {

        if (!this.usuarioDetalle) {
            return null;
        }

        if (this.tipoDetalle === 'rango') {

            return this.calcularResumen([
                this.usuarioDetalle
            ]);
        }

        const dia = this.detalleDiarioGrafica[0];

        if (!dia) {
            return null;
        }

        return {
            usuarios: 1,
            esperadas: dia.esperadas,
            completadas: dia.completadas,
            incompletas: dia.incompletas,
            canceladas: dia.canceladas,
            enProceso: dia.enProceso,
            noIniciadas: dia.noIniciadas,
            completadasParaMeta:
            dia.completadasParaMeta,
            cumplimiento: dia.cumplimiento
        };
    }

    // Altura de las barras individuales.
    porcentaje(valor: number): number {

        return Math.max(
            0,
            Math.min(
                100,
                Number.isFinite(valor) ? valor : 0
            )
        );
    }

    // ==========================================
    // CÁLCULOS GENERALES
    // ==========================================

    private calcularResumen(
        registros: ResumenUsuarioPausas[]
    ): ResumenActividad {

        const sumar = (
            campo: keyof Pick<
                ResumenUsuarioPausas,
                | 'esperadas'
                | 'completadas'
                | 'incompletas'
                | 'canceladas'
                | 'enProceso'
                | 'noIniciadas'
                | 'completadasParaMeta'
            >
        ): number => {

            return registros.reduce(
                (total, registro) =>
                    total + registro[campo],
                0
            );
        };

        const esperadas = sumar('esperadas');

        const completadasParaMeta =
            sumar('completadasParaMeta');

        const cumplimiento = esperadas > 0
            ? Math.round(
            completadasParaMeta * 10000 / esperadas
        ) / 100
            : 0;

        return {
            usuarios: registros.length,
            esperadas,
            completadas: sumar('completadas'),
            incompletas: sumar('incompletas'),
            canceladas: sumar('canceladas'),
            enProceso: sumar('enProceso'),
            noIniciadas: sumar('noIniciadas'),
            completadasParaMeta,
            cumplimiento
        };
    }


    // ==========================================
    // EXPORTAR EXCEL GENERAL
    // ==========================================

    async descargarExcelGeneral(): Promise<void> {

        const inicio = this.fechaInicio
            ?? this.fechaSeleccionada;

        const fin = this.fechaFin ?? inicio;

        const parametros = new HttpParams()
            .set('inicio', inicio)
            .set('fin', fin);

        const nombreArchivo =
            `seguimiento_general_${inicio}_${fin}.xlsx`;

        await this.descargarArchivoExcel(
            this.apiExcelGeneral,
            parametros,
            nombreArchivo
        );
    }

    // ==========================================
    // EXPORTAR EXCEL INDIVIDUAL POR RANGO
    // ==========================================

    async descargarExcelIndividualRango(
        usuarioId: number
    ): Promise<void> {

        const inicio = this.fechaInicio
            ?? this.fechaSeleccionada;

        const fin = this.fechaFin ?? inicio;

        const parametros = new HttpParams()
            .set('usuarioId', usuarioId.toString())
            .set('inicio', inicio)
            .set('fin', fin);

        const nombreArchivo =
            `seguimiento_usuario_${usuarioId}_${inicio}_${fin}.xlsx`;

        await this.descargarArchivoExcel(
            this.apiExcelIndividual,
            parametros,
            nombreArchivo
        );
    }

    // ==========================================
    // EXPORTAR EXCEL INDIVIDUAL DIARIO
    // ==========================================

    async descargarExcelIndividualDia(
        usuarioId: number
    ): Promise<void> {

        const fecha = this.fechaSeleccionada;

        const parametros = new HttpParams()
            .set('usuarioId', usuarioId.toString())
            .set('inicio', fecha)
            .set('fin', fecha);

        const nombreArchivo =
            `seguimiento_usuario_${usuarioId}_${fecha}.xlsx`;

        await this.descargarArchivoExcel(
            this.apiExcelIndividual,
            parametros,
            nombreArchivo
        );
    }

    // MÉTODO COMPARTIDO PARA DESCARGAS

    private async descargarArchivoExcel(
        url: string,
        parametros: HttpParams,
        nombreArchivo: string
    ): Promise<void> {

        if (this.descargandoExcel) {
            return;
        }

        this.descargandoExcel = true;
        this.mensajeErrorExcel = '';

        try {

            const archivo = await firstValueFrom(
                this.http.get(url, {
                    params: parametros,
                    responseType: 'blob',
                    withCredentials: true
                })
            );

            if (!archivo || archivo.size === 0) {
                throw new Error(
                    'El servidor devolvió un archivo vacío.'
                );
            }

            const enlaceTemporal =
                URL.createObjectURL(archivo);

            const enlace = document.createElement('a');

            enlace.href = enlaceTemporal;
            enlace.download = nombreArchivo;

            document.body.appendChild(enlace);

            enlace.click();
            enlace.remove();

            // Liberar el recurso temporal después
            // de iniciar la descarga.
            setTimeout(() => {
                URL.revokeObjectURL(enlaceTemporal);
            }, 1000);

        } catch (error) {

            console.error(
                'Error descargando informe Excel:',
                error
            );

            this.mensajeErrorExcel =
                'No se pudo descargar el informe Excel. ' +
                'Verifica tu sesión e inténtalo nuevamente.';

        } finally {

            this.descargandoExcel = false;
        }
    }

    // UTILIDADES DE FECHAS

    private obtenerFechaLocal(): string {

        return this.formatearFecha(new Date());
    }

    private formatearFecha(fecha: Date): string {

        const anio = fecha.getFullYear();

        const mes = String(
            fecha.getMonth() + 1
        ).padStart(2, '0');

        const dia = String(
            fecha.getDate()
        ).padStart(2, '0');

        return `${anio}-${mes}-${dia}`;
    }

    private crearFechaLocal(valor: string): Date {

        const [anio, mes, dia] =
            valor.split('-').map(Number);

        return new Date(
            anio,
            mes - 1,
            dia
        );
    }


    private contarDias(
        inicio: string,
        fin: string
    ): number {

        const [anioInicio, mesInicio, diaInicio] =
            inicio.split('-').map(Number);

        const [anioFin, mesFin, diaFin] =
            fin.split('-').map(Number);

        const desde = Date.UTC(
            anioInicio,
            mesInicio - 1,
            diaInicio
        );

        const hasta = Date.UTC(
            anioFin,
            mesFin - 1,
            diaFin
        );

        return Math.floor(
            (hasta - desde) / 86400000
        ) + 1;
    }
}
