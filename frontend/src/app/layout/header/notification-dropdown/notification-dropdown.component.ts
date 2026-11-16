import {
  ChangeDetectorRef,
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  OnInit,
  inject
} from '@angular/core';

import { CommonModule } from '@angular/common';

import {
  catchError,
  exhaustMap,
  firstValueFrom,
  merge,
  of,
  timer
} from 'rxjs';

import { takeUntilDestroyed } from
      '@angular/core/rxjs-interop';

import Swal from 'sweetalert2';

import {
  Notificacion,
  NotificacionService
} from '../../../services/notificacion.service';

@Component({
  selector: 'app-notification-dropdown',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notification-dropdown.component.html'
})
export class NotificationDropdownComponent implements OnInit {

  private readonly servicio =
      inject(NotificacionService);

  private readonly cdr =
      inject(ChangeDetectorRef);

  private readonly destroyRef =
      inject(DestroyRef);

  private readonly elemento =
      inject(ElementRef<HTMLElement>);

  private destruido = false;

  isOpen = false;
  cargando = true;
  errorCarga = false;
  procesando = false;

  notifications: Notificacion[] = [];
  totalPendientes = 0;
  notifying = false;

  ngOnInit(): void {

    this.destroyRef.onDestroy(() => {
      this.destruido = true;
    });

    // Actualizar el historial periódicamente.
    timer(0, 15000)
        .pipe(
            exhaustMap(() =>
                this.servicio.obtenerHistorial().pipe(
                    catchError(error => {

                      console.error(
                          'Historial de notificaciones:',
                          error
                      );

                      this.cargando = false;
                      this.errorCarga = true;

                      return of(null);
                    })
                )
            ),

            takeUntilDestroyed(this.destroyRef)
        )
        .subscribe(items => {

          if (items !== null) {
            this.actualizar(items);
          }
        });

    // Ambos eventos actualizan la campana.
    // Ninguno abre SweetAlert de pausa.
    merge(
        this.servicio.cambios$,
        this.servicio.lecturas$
    )
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(() => {
          void this.cargarNotificaciones();
        });
  }

  private actualizar(
      items: Notificacion[]
  ): void {

    if (this.destruido) {
      return;
    }

    this.notifications = items;

    this.totalPendientes = items.filter(
        n => !n.leida
    ).length;

    this.notifying =
        this.totalPendientes > 0;

    this.cargando = false;
    this.errorCarga = false;

    this.cdr.detectChanges();
  }

  async cargarNotificaciones(): Promise<void> {

    try {

      const items = await firstValueFrom(
          this.servicio.obtenerHistorial()
      );

      this.actualizar(items);

    } catch (error) {

      console.error(
          'No se pudo cargar el historial:',
          error
      );

      this.cargando = false;
      this.errorCarga = true;

      if (!this.destruido) {
        this.cdr.detectChanges();
      }
    }
  }

  toggleDropdown(event: MouseEvent): void {

    event.stopPropagation();

    this.isOpen = !this.isOpen;

    if (this.isOpen) {
      void this.cargarNotificaciones();
    }
  }

  closeDropdown(): void {

    this.isOpen = false;

    if (!this.destruido) {
      this.cdr.detectChanges();
    }
  }

  @HostListener('document:click', ['$event'])
  cerrarFuera(event: MouseEvent): void {

    if (
        this.isOpen &&
        event.target instanceof Node &&
        !this.elemento.nativeElement.contains(
            event.target
        )
    ) {
      this.closeDropdown();
    }
  }

  private escapar(texto: string): string {

    return texto
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
  }

  // ==========================================
  // DETALLE DE UNA NOTIFICACIÓN
  // ==========================================
  // El historial no permite iniciar ni posponer.
  // Esas decisiones corresponden al SweetAlert
  // automático del dashboard.

  async verNotificacion(
      n: Notificacion
  ): Promise<void> {

    if (this.procesando) {
      return;
    }

    this.procesando = true;

    try {

      if (!n.leida) {
        await this.servicio.marcarLeida(n.id);
      }

      this.closeDropdown();

      const filas: Array<[string, string]> = [
        [
          'Tipo',
          this.obtenerNombreTipo(n.tipo)
        ],
        [
          'Estado',
          this.obtenerNombreEstado(n.estado)
        ],
        [
          'Creada',
          this.formatearFecha(n.fechaCreacion)
        ]
      ];

      if (n.fechaProgramada) {
        filas.push([
          'Programada',
          this.formatearFecha(n.fechaProgramada)
        ]);
      }

      if (n.proximoAviso) {
        filas.push([
          'Próximo aviso',
          this.formatearFecha(n.proximoAviso)
        ]);
      }

      if (n.tipo === 'RECORDATORIO') {
        filas.push([
          'Veces pospuesta',
          String(n.vecesPospuesta)
        ]);
      }

      if (n.fechaAtencion) {
        filas.push([
          'Atendida',
          this.formatearFecha(n.fechaAtencion)
        ]);
      }

      const detalle = filas.map(
          ([titulo, valor]) => `
          <div class="flex justify-between gap-3
                      border-b border-gray-100 py-2
                      dark:border-gray-700">
            <span class="text-xs text-gray-500">
              ${this.escapar(titulo)}
            </span>
            <span class="text-right text-xs font-semibold
                         text-gray-800 dark:text-gray-200">
              ${this.escapar(valor)}
            </span>
          </div>
        `
      ).join('');

      await Swal.fire({
        title: n.titulo,
        icon: 'info',
        width: 500,

        html: `
          <div class="text-left">
            <p class="mb-3 text-sm text-gray-600
                      dark:text-gray-300">
              ${this.escapar(n.mensaje)}
            </p>

            <div class="rounded-xl bg-gray-50 px-3
                        py-2 dark:bg-gray-800">
              ${detalle}
            </div>
          </div>
        `,

        confirmButtonText:
            'Volver al historial',

        showCancelButton: false,
        showDenyButton: false
      });

    } catch (error) {

      console.error(
          'No se pudo abrir el detalle:',
          error
      );

      await Swal.fire({
        icon: 'error',
        title: 'No se pudo abrir el historial'
      });

    } finally {

      this.procesando = false;

      if (!this.destruido) {
        void this.cargarNotificaciones();
      }
    }
  }

  // ==========================================
  // MARCAR TODAS COMO LEÍDAS
  // ==========================================

  async marcarTodasLeidas(): Promise<void> {

    if (
        this.procesando ||
        !this.totalPendientes
    ) {
      return;
    }

    this.procesando = true;

    try {

      await this.servicio.marcarTodasLeidas();

      this.actualizar(
          this.notifications.map(
              n => ({
                ...n,
                leida: true
              })
          )
      );

      // IMPORTANTE:
      // No mostrar SweetAlert.
      // No llamar a sincronizar().
      // No cambiar proximoAviso.

    } catch (error) {

      console.error(
          'Error marcando notificaciones leídas:',
          error
      );

      this.errorCarga = true;

    } finally {

      this.procesando = false;

      if (!this.destruido) {
        this.cdr.detectChanges();
      }
    }
  }

  obtenerNombreEstado(
      estado: string
  ): string {

    switch (estado) {

      case 'PENDIENTE':
        return 'Pendiente';

      case 'POSPUESTA':
        return 'Pospuesta';

      case 'ATENDIDA':
        return 'Atendida';

      default:
        return estado;
    }
  }

  obtenerNombreTipo(
      tipo: string
  ): string {

    switch (tipo) {

      case 'RECORDATORIO':
        return 'Recordatorio de pausa';

      case 'RECORDATORIO_POSPUESTO':
        return 'Recordatorio pospuesto';

      case 'RECORDATORIO_REACTIVADO':
        return 'Recordatorio reactivado';

      case 'PAUSA_COMPLETADA':
        return 'Pausa completada';

      default:
        return tipo.replace(/_/g, ' ');
    }
  }

  formatearFecha(
      valor: string | null
  ): string {

    if (!valor) {
      return 'Sin fecha';
    }

    const fecha = new Date(valor);

    return Number.isFinite(fecha.getTime())
        ? new Intl.DateTimeFormat('es-CO', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }).format(fecha)
        : 'Fecha no disponible';
  }
}