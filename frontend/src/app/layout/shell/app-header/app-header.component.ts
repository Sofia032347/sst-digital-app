import { CommonModule } from '@angular/common';

import { Component } from '@angular/core';

import { RouterModule } from '@angular/router';

import { ThemeToggleButtonComponent } from
      '../../../shared/components/common/theme-toggle/theme-toggle-button.component';

import { NotificationDropdownComponent } from
      '../../header/notification-dropdown/notification-dropdown.component';

import { UserDropdownComponent } from
      '../../header/user-dropdown/user-dropdown.component';

import { SidebarService } from
      '../../../core/services/sidebar.service';

import { ButtonComponent } from
      '../../../shared/components/ui/button/button.component';

@Component({
  selector: 'app-header',
  standalone: true,

  imports: [
    CommonModule,
    RouterModule,
    ButtonComponent,
    ThemeToggleButtonComponent,
    NotificationDropdownComponent,
    UserDropdownComponent
  ],

  templateUrl: './app-header.component.html'
})
export class AppHeaderComponent {

  // ==========================================
  // MENÚ DE OPCIONES EN MÓVILES
  // ==========================================

  isApplicationMenuOpen = false;

  readonly isMobileOpen$;

  // ==========================================
  // CONSTRUCTOR
  // ==========================================

  constructor(
      public sidebarService: SidebarService
  ) {

    this.isMobileOpen$ =
        this.sidebarService.isMobileOpen$;
  }

  // ==========================================
  // ABRIR O CERRAR MENÚ LATERAL
  // ==========================================

  handleToggle(): void {

    if (window.innerWidth >= 1280) {

      // Escritorio:
      // Expandir o contraer el sidebar.

      this.sidebarService.toggleExpanded();

    } else {

      // Móviles:
      // Abrir o cerrar el sidebar.

      this.sidebarService.toggleMobileOpen();
    }
  }

  // ==========================================
  // OPCIONES DEL ENCABEZADO EN MÓVILES
  // ==========================================

  toggleApplicationMenu(): void {

    this.isApplicationMenuOpen =
        !this.isApplicationMenuOpen;
  }
}