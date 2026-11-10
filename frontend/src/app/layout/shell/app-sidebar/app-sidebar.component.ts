
import { CommonModule } from '@angular/common';

import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  QueryList,
  ViewChildren
} from '@angular/core';

import {
  NavigationEnd,
  Router,
  RouterModule
} from '@angular/router';

import {
  combineLatest,
  Subscription
} from 'rxjs';

import { SafeHtmlPipe } from '../../../shared/pipe/safe-html.pipe';

import { SidebarService } from '../../../core/services/sidebar.service';

import { SidebarWidgetComponent } from './app-sidebar-widget.component';

import { ButtonComponent } from '../../../shared/components/ui/button/button.component';

// =============================================
// MODELO DE NAVEGACIÓN
// =============================================

type NavItem = {
  name: string;
  icon: string;
  path?: string;
  new?: boolean;
  subItems?: {
    name: string;
    path: string;
    pro?: boolean;
    new?: boolean;
  }[];
};

@Component({
  selector: 'app-sidebar',
  imports: [
    ButtonComponent,
    CommonModule,
    RouterModule,
    SafeHtmlPipe,
    SidebarWidgetComponent
  ],
  templateUrl: './app-sidebar.component.html'
})
export class AppSidebarComponent {

  // =============================================
  // ICONOS DE SST DIGITAL
  // =============================================

  private readonly iconoPanel = `
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="1em"
      height="1em"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.8"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <rect x="3" y="3" width="7" height="7" rx="1"/>
      <rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/>
      <rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>
  `;

  // =============================================
  // MENÚ PRINCIPAL DE SST DIGITAL
  // =============================================

  navItems: NavItem[] = [
    {
      name: 'SST Digital',
      icon: this.iconoPanel,
      subItems: [
        {
          name: 'Panel del empleado',
          path: '/sst/empleado'
        }
      ]
    }
  ];

  // Dejamos vacía la sección de demostración.
  // Más adelante incorporaremos opciones reales
  // para RRHH, historial y pausas activas.
  othersItems: NavItem[] = [];

  // =============================================
  // ESTADO DE LOS SUBMENÚS
  // =============================================

  openSubmenu: string | null | number = null;

  subMenuHeights: {
    [key: string]: number
  } = {};

  @ViewChildren('subMenu')
  subMenuRefs!: QueryList<ElementRef>;

  readonly isExpanded$;
  readonly isMobileOpen$;
  readonly isHovered$;

  private subscription: Subscription = new Subscription();

  // =============================================
  // CONSTRUCTOR
  // =============================================

  constructor(
      public sidebarService: SidebarService,
      private router: Router,
      private cdr: ChangeDetectorRef
  ) {
    this.isExpanded$ = this.sidebarService.isExpanded$;
    this.isMobileOpen$ = this.sidebarService.isMobileOpen$;
    this.isHovered$ = this.sidebarService.isHovered$;
  }

  // =============================================
  // INICIALIZACIÓN
  // =============================================

  ngOnInit(): void {

    this.subscription.add(
        this.router.events.subscribe(event => {

          if (event instanceof NavigationEnd) {
            this.setActiveMenuFromRoute(this.router.url);
          }

        })
    );

    this.subscription.add(
        combineLatest([
          this.isExpanded$,
          this.isMobileOpen$,
          this.isHovered$
        ]).subscribe(
            ([isExpanded, isMobileOpen, isHovered]) => {

              if (
                  !isExpanded &&
                  !isMobileOpen &&
                  !isHovered
              ) {
                this.cdr.detectChanges();
              }

            }
        )
    );

    this.setActiveMenuFromRoute(this.router.url);
  }

  // =============================================
  // LIMPIEZA DE SUSCRIPCIONES
  // =============================================

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  // =============================================
  // VERIFICAR RUTA ACTIVA
  // =============================================

  isActive(path: string): boolean {
    return (
        this.router.url === path ||
        this.router.url.startsWith(path + '?')
    );
  }

  isItemActive(
      nav: NavItem,
      section: string,
      index: number
  ): boolean {

    if (nav.subItems?.length) {
      return (
          this.openSubmenu === `${section}-${index}` ||
          nav.subItems.some(
              sub => this.isActive(sub.path)
          )
      );
    }

    return nav.path
        ? this.isActive(nav.path)
        : false;
  }

  // =============================================
  // ABRIR Y CERRAR SUBMENÚS
  // =============================================

  toggleSubmenu(section: string, index: number): void {

    const key = `${section}-${index}`;

    if (this.openSubmenu === key) {

      this.openSubmenu = null;
      this.subMenuHeights[key] = 0;

    } else {

      this.openSubmenu = key;

      setTimeout(() => {

        const el = document.getElementById(key);

        if (el) {
          this.subMenuHeights[key] = el.scrollHeight;
          this.cdr.detectChanges();
        }

      });
    }
  }

  // =============================================
  // CONTROL DEL MENÚ LATERAL
  // =============================================

  onSidebarMouseEnter(): void {

    this.isExpanded$.subscribe(expanded => {

      if (!expanded) {
        this.sidebarService.setHovered(true);
      }

    }).unsubscribe();
  }

  // =============================================
  // ABRIR MENÚ CORRESPONDIENTE A LA RUTA
  // =============================================

  private setActiveMenuFromRoute(
      currentUrl: string
  ): void {

    const menuGroups = [
      {
        items: this.navItems,
        prefix: 'main'
      },
      {
        items: this.othersItems,
        prefix: 'others'
      }
    ];

    menuGroups.forEach(group => {

      group.items.forEach((nav, index) => {

        if (nav.subItems) {

          nav.subItems.forEach(subItem => {

            if (
                currentUrl === subItem.path ||
                currentUrl.startsWith(subItem.path + '?')
            ) {

              const key = `${group.prefix}-${index}`;

              this.openSubmenu = key;

              setTimeout(() => {

                const el = document.getElementById(key);

                if (el) {
                  this.subMenuHeights[key] = el.scrollHeight;
                  this.cdr.detectChanges();
                }

              });
            }

          });
        }

      });
    });
  }

  // =============================================
  // CERRAR MENÚ EN MÓVILES
  // =============================================

  onSubmenuClick(): void {

    this.isMobileOpen$.subscribe(isMobile => {

      if (isMobile) {
        this.sidebarService.setMobileOpen(false);
      }

    }).unsubscribe();
  }

  onSingleMenuClick(): void {

    this.openSubmenu = null;
    this.subMenuHeights = {};

    this.isMobileOpen$.subscribe(isMobile => {

      if (isMobile) {
        this.sidebarService.setMobileOpen(false);
      }

    }).unsubscribe();
  }
}
