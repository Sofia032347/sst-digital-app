import {Component, HostListener} from '@angular/core';

import {CommonModule} from '@angular/common';

import {RouterModule} from '@angular/router';

import {SidebarService} from '../../../core/services/sidebar.service';

import {AppSidebarComponent} from '../app-sidebar/app-sidebar.component';

import {BackdropComponent} from '../backdrop/backdrop.component';

import {AppHeaderComponent} from '../app-header/app-header.component';
import {
  RecordatoriosGlobalesComponent
} from "../../../shared/components/recordatorios-globales/recordatorios-globales.component";

@Component({
    selector: 'app-layout',
    standalone: true,
    imports: [
        CommonModule,
        RouterModule,
        AppHeaderComponent,
        AppSidebarComponent,
        BackdropComponent,
        RecordatoriosGlobalesComponent
    ],
    templateUrl: './app-layout.component.html'
})
export class AppLayoutComponent {

    readonly isExpanded$;
    readonly isHovered$;
    readonly isMobileOpen$;

    constructor(
        public sidebarService: SidebarService
    ) {
        this.isExpanded$ =
            this.sidebarService.isExpanded$;

        this.isHovered$ =
            this.sidebarService.isHovered$;

        this.isMobileOpen$ =
            this.sidebarService.isMobileOpen$;
    }

    // ==========================================
    // COMPORTAMIENTO RESPONSIVE
    // ==========================================

    @HostListener('window:resize')
    onResize(): void {

        if (window.innerWidth >= 1280) {
            this.sidebarService.setMobileOpen(false);
        }
    }

    // ==========================================
    // CLASES DEL CONTENEDOR
    // ==========================================

    get containerClasses(): string[] {

        return [
            'flex-1',
            'transition-all',
            'duration-300',
            'ease-in-out',

            (this.isExpanded$ || this.isHovered$)
                ? 'xl:ml-[290px]'
                : 'xl:ml-[90px]',

            this.isMobileOpen$
                ? 'ml-0'
                : ''
        ];
    }
}
