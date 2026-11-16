import {CommonModule} from '@angular/common';
import {Component, EventEmitter, Input, OnChanges, Output, SimpleChanges} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {PersonalInfo} from '../types';
import {PersonalDetailsFieldsComponent} from './personal-details-fields.component';
import {PersonalInfoErrors, PersonalInfoFormData} from './types';
import {ButtonComponent} from '../../../../shared/components/ui/button/button.component';

@Component({
    selector: 'app-edit-personal-info-dialog',

    standalone: true,

    imports: [
        ButtonComponent,
        CommonModule,
        FormsModule,
        PersonalDetailsFieldsComponent
    ],

    // HTML separado del TypeScript.
    templateUrl: './edit-personal-info-dialog.component.html'
})
export class EditPersonalInfoDialogComponent
    implements OnChanges {

    // ==========================================
    // DATOS RECIBIDOS DEL COMPONENTE PADRE
    // ==========================================

    @Input() isOpen = false;

    @Input() initialData!: PersonalInfo;
    @Input() guardando = false;

    // ==========================================
    // EVENTOS
    // ==========================================

    @Output() openChange =
        new EventEmitter<boolean>();

    @Output() save =
        new EventEmitter<PersonalInfo>();

    // Archivo real de la fotografía.
    @Output() avatarFileSave =
        new EventEmitter<File>();

    // ==========================================
    // FOTOGRAFÍA
    // ==========================================

    avatarFileUrl: string | null = null;

    archivoAvatar: File | null = null;

    // ==========================================
    // FORMULARIO
    // ==========================================

    formData: PersonalInfoFormData = {
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        bio: '',
        facebook: '',
        x: '',
        linkedin: '',
        instagram: '',
        avatarUrl: ''
    };

    errors: PersonalInfoErrors = {};

    // ==========================================
    // VISTA PREVIA DE LA FOTO
    // ==========================================

    get previewAvatarUrl(): string {

        return (
            this.avatarFileUrl ||
            this.formData.avatarUrl ||
            this.initialData?.avatarUrl ||
            ''
        );
    }

    // ==========================================
    // INICIAL DEL NOMBRE
    // ==========================================

    get initialLetter(): string {

        const nombre =
            this.formData.firstName?.trim() ||
            this.initialData?.firstName?.trim() ||
            this.initialData?.fullName?.trim() ||
            'E';

        return nombre.charAt(0).toUpperCase();
    }

    // ==========================================
    // ACTUALIZAR VISTA PREVIA
    // ==========================================

    cambiarVistaPrevia(url: string): void {

        this.avatarFileUrl = url;
    }

    // ==========================================
    // RECIBIR ARCHIVO DE FOTO O CÁMARA
    // ==========================================

    recibirArchivo(archivo: File): void {

        this.archivoAvatar = archivo;
    }

    // ==========================================
    // INICIALIZAR DATOS AL ABRIR
    // ==========================================

    ngOnChanges(changes: SimpleChanges): void {

        if (
            !changes['isOpen']?.currentValue &&
            !changes['initialData']?.currentValue
        ) {
            return;
        }

        if (!this.initialData) {
            return;
        }

        this.avatarFileUrl = null;
        this.archivoAvatar = null;

        this.errors = {};

        this.formData = {
            firstName:
                this.initialData.fullName || '',

            lastName:
                this.initialData.lastName || '',

            email:
                this.initialData.email || '',

            phone:
                this.initialData.phone || '',

            // Se conservan en la estructura de datos
            // original para evitar incompatibilidades.
            // No se dibujan las redes sociales aquí.

            bio:
                this.initialData.bio || '',

            facebook:
                this.initialData.socialLinks?.facebook || '',

            x:
                this.initialData.socialLinks?.x || '',

            linkedin:
                this.initialData.socialLinks?.linkedin || '',

            instagram:
                this.initialData.socialLinks?.instagram || '',

            avatarUrl:
                this.initialData.avatarUrl || ''
        };
    }

    // ==========================================
    // LIMPIAR ERRORES DE CAMPOS
    // ==========================================

    clearError(
        campo: keyof PersonalInfoFormData
    ): void {

        if (this.errors[campo]) {
            delete this.errors[campo];
        }
    }

    // ==========================================
    // CERRAR MODAL
    // ==========================================
    closeModal(): void {

        if (this.guardando) {
            return;
        }

        this.avatarFileUrl = null;
        this.archivoAvatar = null;

        this.openChange.emit(false);
    }


    // ==========================================
    // VALIDAR Y APLICAR CAMBIOS
    // ==========================================


    onSubmit(): void {

        if (this.guardando || !this.initialData) {
            return;
        }

        this.errors = {};

        const departamento = (this.formData.bio ?? '').trim();

        if (!departamento) {
            this.errors.bio = 'Ingresa tu departamento o área de trabajo.';
            return;
        }

        if (departamento.length > 100) {
            this.errors.bio = 'Máximo 100 caracteres.';
            return;
        }

        // En la entidad Usuario, el campo se llama
        // "departamento". En el formulario actual
        // se representa mediante "bio".
        const actualizado: PersonalInfo = {
            ...this.initialData,
            bio: departamento
        };

        // El componente padre realizará el PUT a Spring Boot.
        this.save.emit(actualizado);

        // NO cerrar aquí.
        // El padre cerrará el modal cuando MySQL
        // confirme que se guardaron los cambios.
    }
}

export {
    EditPersonalInfoDialogComponent as
        EditPersonalInfoDialog
};
