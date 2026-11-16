
import { CommonModule } from '@angular/common';

import {
    ChangeDetectorRef,
    Component,
    DestroyRef,
    OnInit,
    inject
} from '@angular/core';

import { RouterLink } from '@angular/router';

import {
    finalize,
    timeout
} from 'rxjs';

import {
    takeUntilDestroyed
} from '@angular/core/rxjs-interop';

import {
    EmpleadoDashboardComponent
} from '../../empleado-dashboard/empleado-dashboard.component';

import {
    AvisoPersonalRrhh,
    SeguimientoDashboardRrhh,
    RrhhSeguimientoDashboardService
} from '../../../../core/services/rrhh-seguimiento-dashboard.service';

@Component({
    selector: 'app-rrhh-dashboard',
    standalone: true,
    imports: [
        CommonModule,
        RouterLink,
        EmpleadoDashboardComponent
    ],
    templateUrl: './rrhh-dashboard.component.html'
})
export class RrhhDashboardComponent implements OnInit {

    private readonly seguimientoService =
        inject(RrhhSeguimientoDashboardService);

    private readonly destroyRef = inject(DestroyRef);
    private readonly cdr = inject(ChangeDetectorRef);

    cargandoSeguimiento = false;
    errorSeguimiento = '';

    seguimiento: SeguimientoDashboardRrhh | null = null;

    ngOnInit(): void {
        this.cargarSeguimiento();
    }

    // ==========================================
    // CONSULTAR DATOS REALES DESDE MYSQL
    // ==========================================

    cargarSeguimiento(): void {

        if (this.cargandoSeguimiento) {
            return;
        }

        this.cargandoSeguimiento = true;
        this.errorSeguimiento = '';

        this.seguimientoService.obtenerSeguimiento()
            .pipe(
                timeout(15000),
                takeUntilDestroyed(this.destroyRef),
                finalize(() => {
                    this.cargandoSeguimiento = false;
                    this.cdr.markForCheck();
                })
            )
            .subscribe({

                next: datos => {
                    this.seguimiento = datos;
                    this.cdr.markForCheck();
                },

                error: error => {

                    console.error(
                        'Error al consultar seguimiento RRHH:',
                        error
                    );

                    if (error.status === 401) {

                        this.errorSeguimiento =
                            'Tu sesión ha expirado. ' +
                            'Inicia sesión nuevamente.';

                    } else if (error.status === 403) {

                        this.errorSeguimiento =
                            'No tienes permisos para consultar ' +
                            'el seguimiento del personal.';

                    } else if (error.name === 'TimeoutError') {

                        this.errorSeguimiento =
                            'La consulta tardó demasiado. ' +
                            'Pulsa Actualizar para reintentar.';

                    } else {

                        this.errorSeguimiento =
                            'No fue posible cargar el seguimiento. ' +
                            'Verifica la conexión con Spring Boot.';
                    }

                    this.cdr.markForCheck();
                }
            });
    }

    // ==========================================
    // MÉTRICAS
    // ==========================================

    get iniciaronSesionHoy(): number | null {
        return this.seguimiento?.iniciaronSesionHoy ?? null;
    }

    get noIniciaronSesionHoy(): number | null {
        return this.seguimiento?.noIniciaronSesionHoy ?? null;
    }

    get pausasIncompletasHoy(): number | null {
        return this.seguimiento?.pausasIncompletasHoy ?? null;
    }

    get pausasEnProgresoHoy(): number | null {
        return this.seguimiento?.pausasEnProgresoHoy ?? null;
    }

    get sinPausasCompletadasHoy(): number | null {
        return this.seguimiento?.sinPausasCompletadasHoy ?? null;
    }

    get avisos(): AvisoPersonalRrhh[] {
        return this.seguimiento?.avisos ?? [];
    }

    get totalAvisos(): number {
        return this.avisos.length;
    }

    // ==========================================
    // ESTILO DE AVISOS
    // ==========================================

    etiquetaAviso(tipo: string): string {

        switch (tipo) {
            case 'SIN_ACCESO':
                return 'Sin acceso';

            case 'SIN_PAUSAS_COMPLETADAS':
                return 'Sin pausas completadas';

            case 'INCOMPLETA':
                return 'Incompleta';

            case 'EN_PROCESO':
                return 'En progreso';

            default:
                return tipo;
        }
    }

    estiloAviso(tipo: string): string {

        switch (tipo) {

            case 'EN_PROCESO':
                return (
                    'bg-blue-100 text-blue-700 ' +
                    'dark:bg-blue-900/30 dark:text-blue-300'
                );

            case 'INCOMPLETA':
                return (
                    'bg-amber-100 text-amber-700 ' +
                    'dark:bg-amber-900/30 dark:text-amber-300'
                );

            case 'SIN_PAUSAS_COMPLETADAS':
                return (
                    'bg-orange-100 text-orange-700 ' +
                    'dark:bg-orange-900/30 dark:text-orange-300'
                );

            default:
                return (
                    'bg-gray-100 text-gray-700 ' +
                    'dark:bg-gray-700 dark:text-gray-300'
                );
        }
    }
}
