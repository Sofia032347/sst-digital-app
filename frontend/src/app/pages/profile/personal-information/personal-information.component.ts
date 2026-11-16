import {CommonModule} from '@angular/common';
import {ChangeDetectorRef, Component, inject, Input, NgZone, OnInit} from '@angular/core';
import Swal from 'sweetalert2';
import {defaultPersonalInfo} from './data';
import {PersonalInfo} from './types';
import {InfoFieldComponent} from './info-field.component';
import {EditPersonalInfoDialogComponent} from './edit-dialog';
import {ButtonComponent} from '../../../shared/components/ui/button/button.component';
import {PerfilService, PerfilUsuario} from '../../../services/perfil.service';
import {firstValueFrom} from "rxjs";

@Component({
    selector: 'app-personal-information',
    standalone: true,
    imports: [
        CommonModule,
        ButtonComponent,
        InfoFieldComponent,
        EditPersonalInfoDialogComponent
    ],
    host: {
        class: 'block'
    },
    templateUrl: './personal-information.component.html'
})
export class PersonalInformationComponent implements OnInit {

    private readonly perfilService = inject(PerfilService);

    @Input() data: PersonalInfo = defaultPersonalInfo;

    isDialogOpen = false;
    cargandoPerfil = true;
    errorPerfil = false;
    guardando = false;

    private perfilReal: PerfilUsuario | null = null;

    private readonly cdr = inject(ChangeDetectorRef);
    private readonly ngZone = inject(NgZone);


    profileData: PersonalInfo = {
        ...defaultPersonalInfo,
        fullName: '',
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        bio: '',
        avatarUrl: ''
    };

    private aplicarPerfil(perfil: PerfilUsuario): void {
        this.ngZone.run(() => {
            this.perfilReal = perfil;

            this.profileData = {
                ...this.data,
                fullName: perfil.nombre,
                firstName: perfil.nombre,
                lastName: '',
                email: perfil.email,
                phone: '',
                bio: perfil.departamento ?? '',
                avatarUrl: ''
            };

            this.cdr.markForCheck();
        });
    }

    get iniciales(): string {

        const partes = (this.profileData.fullName || '')
            .trim()
            .split(/\s+/)
            .filter(Boolean);

        if (partes.length === 0) {
            return 'U';
        }

        return partes
            .slice(0, 2)
            .map(parte => parte.charAt(0).toUpperCase())
            .join('');
    }

    ngOnInit(): void {
        void this.cargarPerfil();
    }


    async cargarPerfil(): Promise<void> {
        this.cargandoPerfil = true;
        this.errorPerfil = false;
        this.cdr.markForCheck();

        try {
            const perfil = await firstValueFrom(
                this.perfilService.obtenerPerfil()
            );

            this.aplicarPerfil(perfil);

        } catch (error) {
            console.error('No se pudo cargar el perfil:', error);

            this.ngZone.run(() => {
                this.errorPerfil = true;
                this.cdr.markForCheck();
            });

            await Swal.fire({
                icon: 'error',
                title: 'No se pudo cargar el perfil',
                text: 'Verifica tu conexión e inténtalo nuevamente.',
                confirmButtonText: 'Entendido'
            });

        } finally {
            this.ngZone.run(() => {
                this.cargandoPerfil = false;
                this.cdr.markForCheck();
            });
        }
    }


    async handleSave(updated: PersonalInfo): Promise<void> {

        if (this.guardando || !this.perfilReal) {
            return;
        }

        const departamento = (updated.bio ?? '').trim();

        if (!departamento || departamento.length > 100) {
            await Swal.fire({
                icon: 'warning',
                title: 'Departamento inválido',
                text: 'Ingresa un departamento de máximo 100 caracteres.'
            });

            return;
        }

        this.guardando = true;
        this.cdr.markForCheck();

        try {
            const actualizado =
                await this.perfilService.actualizarDepartamento(
                    departamento
                );

            // Actualizar la información visible inmediatamente.
            this.aplicarPerfil(actualizado);

            this.ngZone.run(() => {
                this.isDialogOpen = false;
                this.cdr.markForCheck();
            });

            await Swal.fire({
                icon: 'success',
                title: 'Perfil actualizado',
                text: 'Tu departamento se guardó correctamente.',
                timer: 1800,
                showConfirmButton: false
            });

        } catch (error) {
            console.error('Error guardando el perfil:', error);

            await Swal.fire({
                icon: 'error',
                title: 'No se pudieron guardar los cambios',
                text: 'Tu información anterior se ha conservado.'
            });

        } finally {
            this.ngZone.run(() => {
                this.guardando = false;
                this.cdr.markForCheck();
            });
        }
    }
}

export {
    PersonalInformationComponent as PersonalInformationSection
};