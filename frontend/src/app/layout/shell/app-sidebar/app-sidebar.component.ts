import {CommonModule} from '@angular/common';
import {Component, OnInit} from '@angular/core';
import {Router, RouterModule} from '@angular/router';
import {take} from 'rxjs';
import {SidebarService} from '../../../core/services/sidebar.service';
import {RolUsuarioService} from '../../../core/services/rol-usuario.service';
import {NgIcon, provideIcons} from "@ng-icons/core";
import {heroCalendarDays, heroChartBar, heroHome, heroUsers} from "@ng-icons/heroicons/outline";

interface MenuItem {
    name: string;
    path: string;
    icon: string;
}

@Component({
    selector: 'app-sidebar',
    standalone: true,

    imports: [
        CommonModule,
        RouterModule,
        NgIcon
    ],

    providers: [
        provideIcons({
            heroHome,
            heroCalendarDays,
            heroUsers,
            heroChartBar
        })
    ],

    templateUrl: './app-sidebar.component.html'
})

export class AppSidebarComponent implements OnInit {


// ======================================
// MENÚ DEL EMPLEADO
// ======================================

    private readonly menuEmpleado: MenuItem[] = [
        {
            name: 'Inicio',
            path: '/sst/empleado',
            icon: 'heroHome'
        },
        {
            name: 'Resumen de pausas activas',
            path: '/sst/empleado/resumen',
            icon: 'heroCalendarDays'
        }
    ];

// ======================================
// MENÚ DE RECURSOS HUMANOS
// ======================================


    private readonly menuRrhh: MenuItem[] = [
        {
            name: 'Inicio RR. HH.',
            path: '/sst/rrhh',
            icon: 'heroHome'
        },
        {
            name: 'Resumen de pausas activas',
            path: '/sst/rrhh/resumen',
            icon: 'heroCalendarDays'
        },
        {
            name: 'Gestión de empleados',
            path: '/sst/rrhh/empleados',
            icon: 'heroUsers'
        },
        {
            name: 'Seguimiento de pausas',
            path: '/sst/rrhh/seguimiento-pausas',
            icon: 'heroChartBar'
        }
    ];

    // ESTADO DEL MENÚ

    navItems: MenuItem[] = [];

    rutaInicio = '/sst/empleado';

    cargandoMenu = true;
    errorMenu = '';

    // ESTADO DEL SIDEBAR TAILADMIN

    readonly isExpanded$;
    readonly isMobileOpen$;
    readonly isHovered$;

    constructor(
        public sidebarService: SidebarService,
        private router: Router,
        private rolUsuarioService: RolUsuarioService
    ) {

        this.isExpanded$ =
            this.sidebarService.isExpanded$;

        this.isMobileOpen$ =
            this.sidebarService.isMobileOpen$;

        this.isHovered$ =
            this.sidebarService.isHovered$;
    }

    // INICIALIZAR MENÚ

    ngOnInit(): void {
        this.cargarMenu();
    }

    // CONSULTAR ROL DE USUARIO


    cargarMenu(): void {

        this.errorMenu = '';

        // 1. Si el guard ya identificó al usuario,
        // construir el menú inmediatamente.
        const usuarioGuardado =
            this.rolUsuarioService.usuarioActual;

        if (usuarioGuardado?.autenticado) {
            this.configurarMenu(usuarioGuardado.rol);
            return;
        }

        // 2. Si todavía no hay información,
        // esperar la consulta compartida del servicio.
        this.cargandoMenu = true;

        this.rolUsuarioService
            .obtenerUsuarioActual()
            .pipe(take(1))
            .subscribe({

                next: usuario => {

                    if (!usuario.autenticado) {
                        this.navItems = [];
                        this.errorMenu =
                            'No existe una sesión activa.';

                        this.cargandoMenu = false;

                        void this.router.navigateByUrl(
                            '/signin',
                            {replaceUrl: true}
                        );

                        return;
                    }

                    this.configurarMenu(usuario.rol);
                },

                error: error => {

                    console.error(
                        'Error consultando el rol:',
                        error
                    );

                    this.navItems = [];
                    this.errorMenu =
                        'No se pudo verificar tu sesión.';

                    this.cargandoMenu = false;
                }
            });
    }

    private configurarMenu(
        rol: 'EMPLEADO' | 'RRHH'
    ): void {

        if (rol === 'RRHH') {

            this.navItems = [...this.menuRrhh];

            this.rutaInicio = '/sst/rrhh';

        } else if (rol === 'EMPLEADO') {

            this.navItems = [...this.menuEmpleado];

            this.rutaInicio = '/sst/empleado';

        } else {

            this.navItems = [];

            this.errorMenu =
                'El usuario no tiene un rol válido.';
        }

        this.cargandoMenu = false;
    }

    // RUTA ACTIVA

    isActive(path: string): boolean {

        const rutaActual =
            this.router.url
                .split('?')[0]
                .split('#')[0];

        return rutaActual === path;
    }

    // EXPANDIR SIDEBAR AL PASAR EL CURSOR

    onSidebarMouseEnter(): void {

        this.isExpanded$
            .pipe(take(1))
            .subscribe(expanded => {

                if (!expanded) {

                    this.sidebarService.setHovered(
                        true
                    );

                }
            });
    }

    // CERRAR MENÚ EN MÓVILES

    onMenuClick(): void {

        this.isMobileOpen$
            .pipe(take(1))
            .subscribe(isMobile => {

                if (isMobile) {

                    this.sidebarService.setMobileOpen(
                        false
                    );

                }
            });
    }
}
