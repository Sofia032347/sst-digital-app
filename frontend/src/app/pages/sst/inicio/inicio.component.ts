
import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { take } from 'rxjs';

import { RolUsuarioService } from
        '../../../core/services/rol-usuario.service';

@Component({
    selector: 'app-inicio',
    standalone: true,
    template: ''
})
export class InicioComponent implements OnInit {

    private readonly router = inject(Router);
    private readonly roles = inject(RolUsuarioService);

    ngOnInit(): void {
        this.roles.obtenerRutaInicio()
            .pipe(take(1))
            .subscribe({
                next: ruta => {
                    void this.router.navigateByUrl(ruta, {
                        replaceUrl: true
                    });
                },
                error: () => {
                    void this.router.navigateByUrl('/signin', {
                        replaceUrl: true
                    });
                }
            });
    }
}
