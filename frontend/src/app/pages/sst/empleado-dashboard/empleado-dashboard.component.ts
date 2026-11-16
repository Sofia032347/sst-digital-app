import {ChangeDetectorRef, Component, DestroyRef, inject, OnInit} from '@angular/core';
import {CommonModule} from '@angular/common';
import {timeout} from 'rxjs';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {EmpleadoService} from '../../../services/empleado.service';
import {ResumenEmpleado} from '../../../core/models/resumen-empleado.model';
import {NotificacionService, RelojGlobal} from '../../../services/notificacion.service';
import {RolUsuarioService} from '../../../core/services/rol-usuario.service';
import {Router} from "@angular/router";

@Component({
    selector: 'app-empleado-dashboard',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './empleado-dashboard.component.html'
})
export class EmpleadoDashboardComponent
    implements OnInit {

    // ==========================================
    // SERVICIOS
    // ==========================================

    private readonly empleados =
        inject(EmpleadoService);

    private readonly notificaciones =
        inject(NotificacionService);

    private readonly router =
        inject(Router);

    private readonly rolUsuarioService =
        inject(RolUsuarioService);

    private readonly cdr =
        inject(ChangeDetectorRef);

    private readonly destroyRef =
        inject(DestroyRef);

    // ==========================================
    // DATOS DEL EMPLEADO
    // ==========================================

    resumen: ResumenEmpleado = {
        objetivoDiario: 4,
        pausasCompletadas: 0,
        minutosAcumulados: 0
    };

    nombreEmpleado = '';
    emailEmpleado = '';

    pausasPendientes = 0;
    pausasIncompletas = 0;
    pausasCanceladas = 0;
    pausasEnProceso = 0;

    porcentajeReal = 0;

    cargando = true;
    errorCarga = false;

    // ==========================================
    // TEMPORIZADOR VISUAL
    // ==========================================

    estadoTemporizador = 'CARGANDO';

    segundosRestantes = 0;

    porcentajeTemporizador = 0;

    fechaProximaPausa: string | null = null;

    notificacionVigenteId: number | null = null;

    // ==========================================
    // COMPATIBILIDAD CON EL HTML EXISTENTE
    // ==========================================

    // El sonido real se reproduce únicamente
    // desde RecordatoriosGlobalesComponent.

    sonidoActivado = false;

    permisosAvisos:
        NotificationPermission | 'no-disponible' =
        typeof Notification === 'undefined'
            ? 'no-disponible'
            : Notification.permission;

    // ==========================================
    // INICIALIZACIÓN
    // ==========================================

    ngOnInit(): void {

        // ======================================
        // ESTADÍSTICAS PERSONALES
        // ======================================

        this.cargarResumen();

        // ======================================
        // RELOJ GLOBAL COMPARTIDO
        // ======================================

        // Ya no hay un interval(1000) aquí.
        // Ya no se consulta sincronizar() aquí.
        //
        // NotificacionService publica el reloj
        // global que inició el layout.

        this.notificaciones.reloj$
            .pipe(
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe(reloj => {

                this.aplicarRelojGlobal(reloj);
            });
    }

    // ==========================================
    // RECIBIR EL RELOJ GLOBAL
    // ==========================================

    private aplicarRelojGlobal(
        reloj: RelojGlobal
    ): void {

        if (this.destroyRef.destroyed) {
            return;
        }

        this.estadoTemporizador =
            reloj.estado;

        this.segundosRestantes =
            reloj.segundosRestantes;

        this.porcentajeTemporizador =
            reloj.porcentaje;

        this.fechaProximaPausa =
            reloj.proximaPausa;

        this.notificacionVigenteId =
            reloj.notificacionId;

        this.actualizarVista();
    }

    // ==========================================
    // CARGAR ESTADÍSTICAS PERSONALES
    // ==========================================

    cargarResumen(): void {

        this.cargando = true;
        this.errorCarga = false;

        this.empleados.obtenerResumen()
            .pipe(
                timeout(12000),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe({

                next: datos => {

                    this.nombreEmpleado =
                        datos.nombre;

                    this.emailEmpleado =
                        datos.email;

                    this.resumen = {
                        objetivoDiario:
                        datos.metaDiaria,

                        pausasCompletadas:
                        datos.completadasHoy,

                        minutosAcumulados: 0
                    };

                    this.pausasPendientes =
                        datos.pendientesHoy;

                    this.pausasIncompletas =
                        datos.incompletasHoy;

                    this.pausasCanceladas =
                        datos.canceladasHoy;

                    this.pausasEnProceso =
                        datos.enProcesoHoy;

                    this.porcentajeReal =
                        datos.porcentajeCumplimiento;

                    this.cargando = false;
                    this.errorCarga = false;

                    this.actualizarVista();
                },

                error: error => {

                    console.error(
                        'Error cargando estadísticas:',
                        error
                    );

                    this.cargando = false;
                    this.errorCarga = true;

                    this.actualizarVista();
                }
            });
    }

    // ==========================================
    // ACTUALIZAR VISTA DE ANGULAR
    // ==========================================

    private actualizarVista(): void {

        if (!this.destroyRef.destroyed) {
            this.cdr.detectChanges();
        }
    }

    // ==========================================
    // INICIAR PAUSA MANUALMENTE
    // ==========================================

    get puedeIniciarAhora(): boolean {

        return (
            this.estadoTemporizador === 'DISPONIBLE' ||
            this.estadoTemporizador === 'POSPUESTA'
        );
    }


    iniciarPausaAhora(): void {

        if (!this.puedeIniciarAhora) {
            return;
        }

        const rol = this.rolUsuarioService.usuarioActual?.rol;

        const ruta = rol === 'RRHH'
            ? '/sst/rrhh/pausa-activa'
            : '/sst/empleado/pausa-activa';

        void this.router.navigateByUrl(ruta);
    }

    continuarPausaIncompleta(): void {
        if (this.pausasIncompletas <= 0) {
            return;
        }

        const rol = this.rolUsuarioService.usuarioActual?.rol;

        const ruta = rol === 'RRHH'
            ? '/sst/rrhh/pausa-activa'
            : '/sst/empleado/pausa-activa';

        void this.router.navigate([ruta], {
            queryParams: {modo: 'continuar'}
        });
    }


    // ==========================================
    // FORMATO DEL TIEMPO
    // ==========================================

    get tiempoFormateado(): string {

        const minutos = Math.floor(
            this.segundosRestantes / 60
        );

        const segundos =
            this.segundosRestantes % 60;

        return (
            `${String(minutos).padStart(2, '0')}:` +
            `${String(segundos).padStart(2, '0')}`
        );
    }

    // ==========================================
    // PORCENTAJE DE CUMPLIMIENTO DIARIO
    // ==========================================

    get porcentajeCumplimiento(): number {

        return Math.max(
            0,
            Math.min(
                100,
                this.porcentajeReal
            )
        );
    }

    // ==========================================
    // ACTIVAR SONIDO
    // ==========================================

    // Se conserva este método para que el
    // botón existente en el HTML compile.
    //
    // El controlador global detecta la
    // interacción del usuario y habilita
    // su propio AudioContext.

    async activarSonido(): Promise<void> {

        if (
            typeof AudioContext === 'undefined'
        ) {
            this.sonidoActivado = false;
            this.actualizarVista();
            return;
        }

        // El clic que llama este método permite
        // que el controlador global intente
        // habilitar el audio.
        //
        // No creamos aquí otro AudioContext
        // ni reproducimos sonidos duplicados.

        this.sonidoActivado = true;
        this.actualizarVista();
    }

    // ==========================================
    // ACTIVAR AVISOS DE ESCRITORIO
    // ==========================================

    async activarAvisosEscritorio(): Promise<void> {

        if (
            typeof Notification === 'undefined'
        ) {

            this.permisosAvisos =
                'no-disponible';

            this.actualizarVista();
            return;
        }

        try {

            this.permisosAvisos =
                await Notification.requestPermission();

        } catch (error) {

            console.warn(
                'No se pudo solicitar permiso:',
                error
            );

            this.permisosAvisos =
                Notification.permission;
        }

        this.actualizarVista();
    }
}
