
import { Routes } from '@angular/router';

import { EcommerceComponent } from './pages/dashboard/ecommerce/ecommerce.component';
import { ProfileComponent } from './pages/profile/profile.component';
import { FormElementsComponent } from './pages/forms/form-elements/form-elements.component';
import { BasicTablesComponent } from './pages/tables/basic-tables/basic-tables.component';
import { BlankComponent } from './pages/blank/blank.component';
import { NotFoundComponent } from './pages/other-page/not-found/not-found.component';
import { AppLayoutComponent } from './layout/shell/app-layout/app-layout.component';
import { InvoiceComponent } from './pages/ecommerce/invoice/invoice.component';
import { LineChartComponent } from './pages/charts/line-chart/line-chart.component';
import { BarChartComponent } from './pages/charts/bar-chart/bar-chart.component';
import { AlertsComponent } from './pages/ui-elements/alerts/alerts.component';
import { AvatarElementComponent } from './pages/ui-elements/avatars/avatars.component';
import { BadgesComponent } from './pages/ui-elements/badge/badge.component';
import { ButtonsComponent } from './pages/ui-elements/buttons/buttons.component';
import { ImagesComponent } from './pages/ui-elements/images/images.component';
import { VideosComponent } from './pages/ui-elements/videos/videos.component';
import { SignInComponent } from './pages/auth-pages/sign-in/sign-in.component';
import { SignUpComponent } from './pages/auth-pages/sign-up/sign-up.component';
import { CalendarComponent } from './pages/calendar/calendar.component';

import { EmpleadoDashboardComponent }
  from './pages/sst/empleado-dashboard/empleado-dashboard.component';

export const routes: Routes = [
  {
    path: '',
    component: AppLayoutComponent,
    children: [

      // ==========================================
      // PÁGINA PRINCIPAL SST DIGITAL
      // ==========================================

      {
        path: '',
        redirectTo: 'sst/empleado',
        pathMatch: 'full'
      },

      // ==========================================
      // DASHBOARD DEL EMPLEADO
      // ==========================================

      {
        path: 'sst/empleado',
        component: EmpleadoDashboardComponent,
        title: 'Panel del empleado | SST Digital'
      },

      // ==========================================
      // DASHBOARD ORIGINAL DE TAILADMIN
      // ==========================================

      {
        path: 'ecommerce',
        component: EcommerceComponent,
        title: 'Dashboard Ecommerce | TailAdmin'
      },

      {
        path: 'calendar',
        component: CalendarComponent,
        title: 'Calendario | TailAdmin'
      },

      {
        path: 'profile',
        component: ProfileComponent,
        title: 'Perfil | TailAdmin'
      },

      {
        path: 'form-elements',
        component: FormElementsComponent,
        title: 'Formularios | TailAdmin'
      },

      {
        path: 'basic-tables',
        component: BasicTablesComponent,
        title: 'Tablas | TailAdmin'
      },

      {
        path: 'blank',
        component: BlankComponent,
        title: 'Página en blanco | TailAdmin'
      },

      {
        path: 'invoice',
        component: InvoiceComponent,
        title: 'Factura | TailAdmin'
      },

      {
        path: 'line-chart',
        component: LineChartComponent,
        title: 'Gráfica de líneas | TailAdmin'
      },

      {
        path: 'bar-chart',
        component: BarChartComponent,
        title: 'Gráfica de barras | TailAdmin'
      },

      {
        path: 'alerts',
        component: AlertsComponent,
        title: 'Alertas | TailAdmin'
      },

      {
        path: 'avatars',
        component: AvatarElementComponent,
        title: 'Avatares | TailAdmin'
      },

      {
        path: 'badge',
        component: BadgesComponent,
        title: 'Insignias | TailAdmin'
      },

      {
        path: 'buttons',
        component: ButtonsComponent,
        title: 'Botones | TailAdmin'
      },

      {
        path: 'images',
        component: ImagesComponent,
        title: 'Imágenes | TailAdmin'
      },

      {
        path: 'videos',
        component: VideosComponent,
        title: 'Videos | TailAdmin'
      }
    ]
  },

  // ==========================================
  // PÁGINAS DE AUTENTICACIÓN DE TAILADMIN
  // ==========================================

  {
    path: 'signin',
    component: SignInComponent,
    title: 'Iniciar sesión | TailAdmin'
  },

  {
    path: 'signup',
    component: SignUpComponent,
    title: 'Registrarse | TailAdmin'
  },

  // ==========================================
  // PÁGINAS NO ENCONTRADAS
  // ==========================================

  {
    path: '**',
    component: NotFoundComponent,
    title: 'Página no encontrada | SST Digital'
  }
];
