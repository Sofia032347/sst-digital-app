
import {
    Component,
    OnInit,
    ChangeDetectorRef,
    inject
} from '@angular/core';

import { timeout } from 'rxjs';

import {
    EmpleadoService
} from '../../../services/empleado.service';

import {
    ResumenEmpleado
} from '../../../core/models/resumen-empleado.model';

@Component({
    selector: 'app-empleado-dashboard',
    standalone: true,
    templateUrl: './empleado-dashboard.component.html'
})
export class EmpleadoDashboardComponent implements OnInit {

    private readonly empleadoService = inject(EmpleadoService);
    private readonly cdr = inject(ChangeDetectorRef);

    // ==========================================
    // ESTADÍSTICAS DEL EMPLEADO
    // ==========================================

    resumen: ResumenEmpleado = {
        objetivoDiario: 4,
        pausasCompletadas: 0,
        minutosAcumulados: 0
    };

    // ==========================================
    // ESTADO DE LA CONSULTA
    // ==========================================

    cargando = true;
    errorCarga = false;

    // ==========================================
    // INFORMACIÓN DEL EMPLEADO
    // ==========================================

    nombreEmpleado = '';
    emailEmpleado = '';

    pausasPendientes = 4;
    pausasIncompletas = 0;
    pausasCanceladas = 0;
    pausasEnProceso = 0;

    porcentajeReal = 0;

    // ==========================================
    // INICIALIZACIÓN
    // ==========================================

    ngOnInit(): void {
        this.cargarResumen();
    }

    // ==========================================
    // CONSULTA REAL A SPRING BOOT
    // ==========================================

    cargarResumen(): void {

        if (!this.cargando || !this.nombreEmpleado) {
            this.cargando = true;
        }

        this.errorCarga = false;

        this.empleadoService.obtenerResumen()
            .pipe(
                timeout(12000)
            )
            .subscribe({

                next: (datos) => {

                    console.log(
                        'Resumen recibido de Spring Boot:',
                        datos
                    );

                    this.nombreEmpleado = datos.nombre;
                    this.emailEmpleado = datos.email;

                    // Adaptar los datos de la API al HTML.
                    this.resumen = {
                        objetivoDiario: datos.metaDiaria,
                        pausasCompletadas: datos.completadasHoy,

                        // La API todavía no proporciona
                        // minutos acumulados reales.
                        minutosAcumulados: 0
                    };

                    this.pausasPendientes = datos.pendientesHoy;
                    this.pausasIncompletas = datos.incompletasHoy;
                    this.pausasCanceladas = datos.canceladasHoy;
                    this.pausasEnProceso = datos.enProcesoHoy;

                    this.porcentajeReal =
                        datos.porcentajeCumplimiento;

                    this.errorCarga = false;
                    this.cargando = false;

                    // Forzar la actualización visual
                    // después de recibir la respuesta.
                    this.cdr.detectChanges();
                },

                error: (error) => {

                    console.error(
                        'Error al cargar estadísticas:',
                        error
                    );

                    this.errorCarga = true;
                    this.cargando = false;

                    this.cdr.detectChanges();
                }

            });
    }

    // ==========================================
    // PORCENTAJE PARA LA BARRA DE PROGRESO
    // ==========================================

    get porcentajeCumplimiento(): number {
        return this.porcentajeReal;
    }
}
