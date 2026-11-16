
import { CommonModule } from '@angular/common';

import {
  Component,
  EventEmitter,
  Output
} from '@angular/core';

import { ChangePasswordModalComponent } from
      './change-password-modal.component';

import { ChangePasswordFormData } from './types';

import { ButtonComponent } from
      '../../../shared/components/ui/button/button.component';

@Component({
  selector: 'app-security',
  standalone: true,
  imports: [
    CommonModule,
    ButtonComponent,
    ChangePasswordModalComponent
  ],
  host: {
    class: 'block'
  },
  templateUrl: './security.component.html'
})
export class SecurityComponent {

  @Output() passwordChange =
      new EventEmitter<ChangePasswordFormData>();

  // El modal empieza siempre cerrado.
  isModalOpen = false;

  abrirCambioContrasena(): void {
    this.isModalOpen = true;
  }

  cerrarCambioContrasena(): void {
    this.isModalOpen = false;
  }

  handlePasswordSubmit(
      datos: ChangePasswordFormData
  ): void {

    this.passwordChange.emit(datos);

    // No cerrar automáticamente:
    // todavía falta confirmar el cambio
    // de contraseña en Spring Boot.
  }
}

export {
  SecurityComponent as SecuritySection
};
