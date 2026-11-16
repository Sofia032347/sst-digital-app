import {Routes} from '@angular/router';

import {AppLayoutComponent} from './layout/shell/app-layout/app-layout.component';

import {EmpleadoDashboardComponent} from './pages/sst/empleado-dashboard/empleado-dashboard.component';

import {ProfileComponent} from './pages/profile/profile.component';

import {SignInComponent} from './pages/auth-pages/sign-in/sign-in.component';

import {NotFoundComponent} from './pages/other-page/not-found/not-found.component';

import {roleGuard} from './core/guards/role.guard';
import {authChildGuard, authGuard} from './core/guards/auth.guard';

export const routes: Routes = [

    // ==========================================
    // SST DIGITAL - LAYOUT COMPARTIDO
    // ==========================================

    {
        path: '',
        component: AppLayoutComponent,

        canActivate: [authGuard],
        canActivateChild: [authChildGuard],

        children: [

            // ======================================
            // REDIRECCIÓN PRINCIPAL
            // ======================================

            {
                path: '',
                loadComponent: () =>
                    import('./pages/sst/inicio/inicio.component')
                        .then(m => m.InicioComponent),

                pathMatch: 'full'
            },

            // ======================================
            // DASHBOARD EMPLEADO
            // ======================================

            {
                path: 'sst/empleado',
                component: EmpleadoDashboardComponent,

                canActivate: [roleGuard],
                data: {
                    roles: ['EMPLEADO']
                },

                title: 'Inicio | SST Digital'
            },

            // ======================================
            // RESUMEN PERSONAL - EMPLEADO
            // ======================================

            {
                path: 'sst/empleado/resumen',

                loadComponent: () =>
                    import(
                        './pages/sst/resumen-pausas/resumen-pausas.component'
                        ).then(
                        m => m.ResumenPausasComponent
                    ),

                canActivate: [roleGuard],
                data: {
                    roles: ['EMPLEADO']
                },

                title: 'Resumen de pausas activas | SST Digital'
            },

            // ======================================
            // RESUMEN PERSONAL - RRHH
            // ======================================

            {
                path: 'sst/rrhh/resumen',

                loadComponent: () =>
                    import(
                        './pages/sst/resumen-pausas/resumen-pausas.component'
                        ).then(
                        m => m.ResumenPausasComponent
                    ),

                canActivate: [roleGuard],
                data: {
                    roles: ['RRHH']
                },

                title: 'Mi resumen de pausas activas | SST Digital'
            },

            // ======================================
            // PAUSA ACTIVA - EMPLEADO
            // ======================================

            {
                path: 'sst/empleado/pausa-activa',

                loadComponent: () =>
                    import(
                        './pages/sst/pausa-activa/pausa-activa.component'
                        ).then(
                        m => m.PausaActivaComponent
                    ),

                canActivate: [roleGuard],
                data: {
                    roles: ['EMPLEADO']
                },

                title: 'Mi pausa activa | SST Digital'
            },

            // ======================================
            // PAUSA ACTIVA - RRHH
            // ======================================

            {
                path: 'sst/rrhh/pausa-activa',

                loadComponent: () =>
                    import(
                        './pages/sst/pausa-activa/pausa-activa.component'
                        ).then(
                        m => m.PausaActivaComponent
                    ),

                canActivate: [roleGuard],
                data: {
                    roles: ['RRHH']
                },

                title: 'Mi pausa activa | SST Digital'
            },

            // ======================================
            // DASHBOARD RRHH
            // ======================================

            {
                path: 'sst/rrhh',

                loadComponent: () =>
                    import(
                        './pages/sst/rrhh/rrhh-dashboard/rrhh-dashboard.component'
                        ).then(
                        m => m.RrhhDashboardComponent
                    ),

                canActivate: [roleGuard],
                data: {
                    roles: ['RRHH']
                },

                title: 'Inicio | SST Digital'
            },

            // ======================================
            // GESTIÓN DE EMPLEADOS - RRHH
            // ======================================

            {
                path: 'sst/rrhh/empleados',

                loadComponent: () =>
                    import(
                        './pages/sst/rrhh/empleados/empleados.component'
                        ).then(
                        m => m.EmpleadosComponent
                    ),

                canActivate: [roleGuard],
                data: {
                    roles: ['RRHH']
                },

                title: 'Gestión de empleados | SST Digital'
            },

            // ======================================
            // SEGUIMIENTO DE PAUSAS - RRHH
            // ======================================

            {
                path: 'sst/rrhh/seguimiento-pausas',

                loadComponent: () =>
                    import(
                        './pages/sst/rrhh/seguimiento-pausas/seguimiento-pausas.component'
                        ).then(
                        m => m.SeguimientoPausasComponent
                    ),

                canActivate: [roleGuard],
                data: {
                    roles: ['RRHH']
                },

                title: 'Seguimiento de pausas | SST Digital'
            },

            // ======================================
            // MI CUENTA - EMPLEADO
            // ======================================

            {
                path: 'sst/empleado/perfil',
                component: ProfileComponent,

                canActivate: [roleGuard],
                data: {
                    roles: ['EMPLEADO']
                },

                title: 'Mi cuenta | SST Digital'
            },

            // ======================================
            // MI CUENTA - RRHH
            // ======================================

            {
                path: 'sst/rrhh/perfil',
                component: ProfileComponent,

                canActivate: [roleGuard],
                data: {
                    roles: ['RRHH']
                },

                title: 'Mi cuenta | SST Digital'
            }

        ]
    },

    // ==========================================
    // COMPATIBILIDAD CON RUTA ANTERIOR
    // ==========================================

    {
        path: 'actividades/pausa-activa',
        redirectTo: 'sst/empleado/pausa-activa',
        pathMatch: 'full'
    },

    // ==========================================
    // INICIAR SESIÓN
    // ==========================================

    {
        path: 'signin',
        component: SignInComponent,
        title: 'Iniciar sesión | SST Digital'
    },

    // ==========================================
    // PÁGINA NO ENCONTRADA
    // ==========================================

    {
        path: '**',
        component: NotFoundComponent,
        title: 'Página no encontrada | SST Digital'
    }

];
