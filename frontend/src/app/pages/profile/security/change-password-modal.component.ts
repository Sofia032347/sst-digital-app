import {CommonModule} from '@angular/common';

import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  inject,
  Input,
  NgZone,
  OnChanges,
  Output,
  SimpleChanges
} from '@angular/core';

import {FormsModule} from '@angular/forms';
import Swal from 'sweetalert2';

import {validateChangePassword} from './schema';

import {ChangePasswordErrors, ChangePasswordFormData} from './types';

import {ButtonComponent} from '../../../shared/components/ui/button/button.component';

import {InputDirective} from '../../../shared/components/ui/input/input.directive';

import {PerfilService} from '../../../services/perfil.service';

@Component({
    selector: 'app-change-password-modal',
    standalone: true,
    imports: [
        InputDirective,
        ButtonComponent,
        CommonModule,
        FormsModule
    ],
    templateUrl: './change-password-modal.component.html'
})
export class ChangePasswordModalComponent
    implements OnChanges {

    private readonly perfilService = inject(PerfilService);
    private readonly cdr = inject(ChangeDetectorRef);
    private readonly ngZone = inject(NgZone);

    @Input() isOpen = false;

    @Output() openChange =
        new EventEmitter<boolean>();

    @Output() submitSuccess =
        new EventEmitter<ChangePasswordFormData>();

    formData: ChangePasswordFormData = {
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    };

    errors: ChangePasswordErrors = {};
    mensajePendiente = '';
    guardando = false;

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['isOpen']?.currentValue) {
            this.limpiarFormulario();
        }
    }

    private limpiarFormulario(): void {
        this.formData = {
            currentPassword: '',
            newPassword: '',
            confirmPassword: ''
        };

        this.errors = {};
        this.mensajePendiente = '';
    }

    clearError(
        field: keyof ChangePasswordFormData
    ): void {
        delete this.errors[field];
        this.mensajePendiente = '';
    }

    closeModal(): void {
        if (this.guardando) {
            return;
        }

        this.limpiarFormulario();
        this.openChange.emit(false);
        this.cdr.markForCheck();
    }

    async onSubmit(): Promise<void> {

        if (this.guardando) {
            return;
        }

        this.errors =
            validateChangePassword(this.formData);

        if (Object.keys(this.errors).length > 0) {
            this.cdr.markForCheck();
            return;
        }

        if (this.formData.newPassword.length < 8) {
            this.errors = {
                ...this.errors,
                newPassword:
                    'La contraseña debe tener al menos 8 caracteres.'
            };

            this.cdr.markForCheck();
            return;
        }

        if (
            this.formData.newPassword !==
            this.formData.confirmPassword
        ) {
            this.errors = {
                ...this.errors,
                confirmPassword:
                    'Las contraseñas no coinciden.'
            };

            this.cdr.markForCheck();
            return;
        }

        const datos = {...this.formData};

        this.guardando = true;
        this.mensajePendiente = '';
        this.cdr.markForCheck();

        try {
            // El backend comprueba la contraseña actual,
            // valida la nueva y guarda su hash en MySQL.
            await this.perfilService.cambiarPassword({
                passwordActual: datos.currentPassword,
                passwordNueva: datos.newPassword,
                confirmarPassword: datos.confirmPassword
            });

            this.ngZone.run(() => {
                this.guardando = false;
                this.limpiarFormulario();

                // Cerrar solamente cuando Spring Boot confirme.
                this.openChange.emit(false);
                this.cdr.markForCheck();
            });

            // Se conserva el evento original para
            // compatibilidad con el componente padre.
            this.submitSuccess.emit(datos);

            await Swal.fire({
                icon: 'success',
                title: 'Contraseña actualizada',
                text: 'Tu contraseña se cambió correctamente.',
                confirmButtonText: 'Aceptar'
            });

        } catch (error) {
            console.error(
                'Error al cambiar la contraseña:',
                error
            );

            this.ngZone.run(() => {
                this.guardando = false;
                this.mensajePendiente =
                    'No se pudo cambiar la contraseña. ' +
                    'Verifica tu contraseña actual ' +
                    'e inténtalo nuevamente.';

                this.cdr.markForCheck();
            });
        }
    }
}

export {
    ChangePasswordModalComponent as ChangePasswordModal
};
