import {CommonModule} from '@angular/common';

import {ChangeDetectorRef, Component, ElementRef, HostListener, OnDestroy, OnInit} from '@angular/core';

import {RouterModule} from '@angular/router';

import {Subscription} from 'rxjs';
import Swal from 'sweetalert2';

import {DropdownService} from '../../../core/services/dropdown.service';

import {AuthService} from '../../../core/services/auth.service';

import {ButtonComponent} from '../../../shared/components/ui/button/button.component';

import {EmpleadoService} from '../../../services/empleado.service';
import {RolUsuarioService} from "../../../core/services/rol-usuario.service";

@Component({
    selector: 'app-user-dropdown',
    standalone: true,
    imports: [
        ButtonComponent,
        CommonModule,
        RouterModule
    ],
    templateUrl: './user-dropdown.component.html'
})
export class UserDropdownComponent
    implements OnInit, OnDestroy {

    readonly dropdownId = 'user-dropdown';

    isOpen = false;
    cerrandoSesion = false;

    // ==========================================
    // DATOS DEL USUARIO AUTENTICADO
    // ==========================================

    nombreUsuario = 'Usuario';
    correoUsuario = '';

    cargandoUsuario = true;

    // ==========================================
    // IDIOMA PREDETERMINADO
    // ==========================================

    currentLocale = 'es';
    readonly idiomaActual = 'Español';

    private readonly suscripciones =
        new Subscription();

    constructor(
        private readonly elementRef: ElementRef,
        private readonly dropdownService: DropdownService,
        private readonly empleadoService: EmpleadoService,
        private readonly authService: AuthService,
        private readonly rolUsuarioService: RolUsuarioService,
        private readonly cdr: ChangeDetectorRef
    ) {
    }

    // ==========================================
    // INICIALIZACIÓN
    // ==========================================

    ngOnInit(): void {

        document.documentElement.setAttribute(
            'lang',
            'es'
        );

        document.documentElement.setAttribute(
            'dir',
            'ltr'
        );

        localStorage.setItem('dir', 'ltr');

        this.suscripciones.add(
            this.dropdownService.activeDropdown$
                .subscribe(activeId => {

                    this.isOpen =
                        activeId === this.dropdownId;

                    this.cdr.detectChanges();
                })
        );

        this.cargarUsuario();
    }

    // ==========================================
    // CONSULTAR DATOS DEL USUARIO
    // ==========================================

    cargarUsuario(): void {

        this.cargandoUsuario = true;

        this.suscripciones.add(
            this.empleadoService.obtenerResumen()
                .subscribe({

                    next: datos => {

                        this.nombreUsuario =
                            datos.nombre?.trim() ||
                            'Usuario';

                        this.correoUsuario =
                            datos.email?.trim() ||
                            '';

                        this.cargandoUsuario = false;
                        this.cdr.detectChanges();
                    },

                    error: error => {

                        console.error(
                            'No se pudo cargar la identidad:',
                            error
                        );

                        this.nombreUsuario = 'Usuario';
                        this.correoUsuario = '';

                        this.cargandoUsuario = false;
                        this.cdr.detectChanges();
                    }
                })
        );
    }

    // ==========================================
    // NOMBRE CORTO
    // ==========================================

    get nombreCorto(): string {

        const partes = this.nombreUsuario
            .trim()
            .split(/\s+/)
            .filter(Boolean);

        return partes[0] || 'Usuario';
    }

    // ==========================================
    // INICIALES DEL AVATAR
    // ==========================================

    get iniciales(): string {

        const partes = this.nombreUsuario
            .trim()
            .split(/\s+/)
            .filter(Boolean);

        if (!partes.length) {
            return 'U';
        }

        if (partes.length === 1) {
            return partes[0]
                .charAt(0)
                .toUpperCase();
        }

        return (
            partes[0].charAt(0) +
            partes[1].charAt(0)
        ).toUpperCase();
    }

    get rutaPerfil(): string {
        const rol = this.rolUsuarioService.usuarioActual?.rol;

        return rol === 'RRHH'
            ? '/sst/rrhh/perfil'
            : '/sst/empleado/perfil';
    }

    // ==========================================
    // ABRIR / CERRAR DROPDOWN
    // ==========================================

    toggleDropdown(event?: Event): void {

        event?.stopPropagation();

        this.dropdownService.toggle(
            this.dropdownId
        );
    }

    closeDropdown(): void {

        this.dropdownService.close(
            this.dropdownId
        );
    }

    // ==========================================
    // CERRAR SESIÓN REAL EN SPRING BOOT
    // ==========================================

    async cerrarSesion(): Promise<void> {

        if (this.cerrandoSesion) {
            return;
        }

        const confirmacion = await Swal.fire({
            title: '¿Cerrar sesión?',
            text: 'Se cerrará tu sesión de SST Digital.',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Sí, cerrar sesión',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#465FFF',
            reverseButtons: true
        });

        if (!confirmacion.isConfirmed) {
            return;
        }

        this.cerrandoSesion = true;

        try {

            // AuthService realiza POST /logout
            // y redirige a /signin cuando Spring
            // confirma el cierre de sesión.
            await this.authService.cerrarSesion();

            this.closeDropdown();

        } catch (error) {

            console.error(
                'No se pudo cerrar sesión:',
                error
            );

            await Swal.fire({
                icon: 'error',
                title: 'No se pudo cerrar sesión',
                text:
                    'La sesión continúa activa. Inténtalo nuevamente.',
                confirmButtonText: 'Aceptar'
            });

        } finally {

            this.cerrandoSesion = false;
            this.cdr.detectChanges();
        }
    }

    // ==========================================
    // CERRAR SI PULSA FUERA
    // ==========================================

    @HostListener('document:click', ['$event'])
    onDocumentClick(event: MouseEvent): void {

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
    // LIBERAR SUSCRIPCIONES
    // ==========================================

    ngOnDestroy(): void {
        this.suscripciones.unsubscribe();
    }
}
