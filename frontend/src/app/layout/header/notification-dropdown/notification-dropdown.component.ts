import { CommonModule } from '@angular/common';

import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
  inject
} from '@angular/core';

import { RouterModule } from '@angular/router';

import {
  interval,
  Subscription,
  timeout
} from 'rxjs';

import {
  DropdownComponent
} from '../../../shared/components/ui/dropdown/dropdown.component';

import {
  DropdownItemComponent
} from '../../../shared/components/ui/dropdown/dropdown-item/dropdown-item.component';

import {
  DropdownService
} from '../../../core/services/dropdown.service';

import {
  ButtonComponent
} from '../../../shared/components/ui/button/button.component';

import {
  Notificacion,
  NotificacionService
} from '../../../services/notificacion.service';

// ============================================
// MODELO TEMPORAL PARA EL HTML ACTUAL
// ============================================

interface NotificationItem {
  id: number;

  // Datos reales de SST Digital
  tipo: Notificacion['tipo'];
  titulo: string;
  mensaje: string;
  estado: Notificacion['estado'];
  fechaCreacion: string;
  proximoAviso: string | null;
  vecesPospuesta: number;

  // Compatibilidad con el HTML de TailAdmin.
  // Eliminaremos estos campos en el siguiente paso.
  name: string;
  avatar: string;
  action: string;
  project: string;
  time: string;
  status: 'online' | 'offline' | 'busy';
}

@Component({
  selector: 'app-notification-dropdown',

  templateUrl: './notification-dropdown.component.html',

  imports: [
    ButtonComponent,
    CommonModule,
    RouterModule,
    DropdownComponent,
    DropdownItemComponent
  ]
})
export class NotificationDropdownComponent
    implements OnInit, OnDestroy {

  readonly dropdownId = 'notification-dropdown';

  private readonly notificacionService =
      inject(NotificacionService);

  private readonly cdr =
      inject(ChangeDetectorRef);

  private readonly elementRef =
      inject(ElementRef);

  private readonly dropdownService =
      inject(DropdownService);

  private readonly subscriptions =
      new Subscription();

  // ==========================================
  // ESTADO DEL COMPONENTE
  // ==========================================

  isOpen = false;

  notifying = false;

  cargando = false;

  errorCarga = false;

  notifications: NotificationItem[] = [];

  totalPendientes = 0;

  // ==========================================
  // INICIALIZACIÓN
  // ==========================================

  ngOnInit(): void {

    // Mantener funcionamiento original
    // del desplegable de TailAdmin.
    this.subscriptions.add(

        this.dropdownService.activeDropdown$
            .subscribe(activeId => {

              this.isOpen =
                  activeId === this.dropdownId;

              this.cdr.detectChanges();

            })

    );

    // Obtener las notificaciones al cargar.
    this.cargarNotificaciones();

    // Actualizar periódicamente mientras
    // el componente permanezca activo.
    this.subscriptions.add(

        interval(30000).subscribe(() => {
          this.cargarNotificaciones();
        })

    );
  }

  // ==========================================
  // CONSULTAR NOTIFICACIONES REALES
  // ==========================================

  cargarNotificaciones(): void {

    if (this.cargando) {
      return;
    }

    this.cargando = true;
    this.errorCarga = false;

    this.subscriptions.add(

        this.notificacionService
            .obtenerHistorial()
            .pipe(timeout(12000))
            .subscribe({

              next: (datos: Notificacion[]) => {

                this.notifications = datos.map(
                    item => this.convertirNotificacion(item)
                );

                this.totalPendientes = datos.filter(
                    item =>
                        item.estado === 'PENDIENTE' ||
                        item.estado === 'POSPUESTA'
                ).length;

                this.notifying =
                    this.totalPendientes > 0;

                this.cargando = false;
                this.errorCarga = false;

                this.cdr.detectChanges();
              },

              error: error => {

                console.error(
                    'Error al consultar notificaciones:',
                    error
                );

                this.errorCarga = true;
                this.cargando = false;

                this.cdr.detectChanges();
              }

            })

    );
  }

  // ==========================================
  // ADAPTAR DATOS AL HTML EXISTENTE
  // ==========================================

  private convertirNotificacion(
      item: Notificacion
  ): NotificationItem {

    return {

      id: item.id,

      tipo: item.tipo,
      titulo: item.titulo,
      mensaje: item.mensaje,
      estado: item.estado,

      fechaCreacion: item.fechaCreacion,
      proximoAviso: item.proximoAviso,
      vecesPospuesta: item.vecesPospuesta,

      // Estos campos permiten que el HTML
      // anterior siga compilando por ahora.
      name: item.titulo,

      avatar: '/images/logo/logo-icon.svg',

      action: item.mensaje,

      project: this.obtenerNombreEstado(
          item.estado
      ),

      time: this.formatearFecha(
          item.fechaCreacion
      ),

      status: this.obtenerEstadoVisual(
          item.estado
      )
    };
  }

  // ==========================================
  // NOMBRES DE ESTADOS EN ESPAÑOL
  // ==========================================

  obtenerNombreEstado(
      estado: Notificacion['estado']
  ): string {

    switch (estado) {

      case 'PENDIENTE':
        return 'Pendiente';

      case 'POSPUESTA':
        return 'Pospuesta';

      case 'ATENDIDA':
        return 'Atendida';

      default:
        return 'Notificación';
    }
  }

  // ==========================================
  // ESTADO VISUAL COMPATIBLE CON TAILADMIN
  // ==========================================

  private obtenerEstadoVisual(
      estado: Notificacion['estado']
  ): 'online' | 'offline' | 'busy' {

    switch (estado) {

      case 'ATENDIDA':
        return 'online';

      case 'POSPUESTA':
        return 'busy';

      case 'PENDIENTE':
      default:
        return 'offline';
    }
  }

  // ==========================================
  // FECHA EN ESPAÑOL
  // ==========================================

  formatearFecha(
      fecha: string | null
  ): string {

    if (!fecha) {
      return 'Sin fecha';
    }

    const fechaConvertida =
        new Date(fecha);

    if (
        Number.isNaN(
            fechaConvertida.getTime()
        )
    ) {
      return fecha;
    }

    return fechaConvertida.toLocaleString(
        'es-CO',
        {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }
    );
  }

  // ==========================================
  // ABRIR Y CERRAR LA CAMPANA
  // ==========================================

  toggleDropdown(event?: Event): void {

    event?.stopPropagation();

    this.dropdownService.toggle(
        this.dropdownId
    );

    // Actualizar información al abrir.
    if (this.isOpen) {
      this.cargarNotificaciones();
    }
  }

  closeDropdown(): void {

    this.dropdownService.close(
        this.dropdownId
    );
  }

  // ==========================================
  // CERRAR AL HACER CLIC FUERA
  // ==========================================

  @HostListener(
      'document:click',
      ['$event']
  )
  onDocumentClick(
      event: MouseEvent
  ): void {

    if (
        this.isOpen &&
        !this.elementRef.nativeElement.contains(
            event.target
        )
    ) {
      this.closeDropdown();
    }
  }

  // ==========================================
  // LIBERAR RECURSOS
  // ==========================================

  ngOnDestroy(): void {

    this.subscriptions.unsubscribe();
  }
}