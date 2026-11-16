import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';

import {
  ChangeDetectorRef,
  Component,
  DestroyRef,
  OnInit,
  inject
} from '@angular/core';

import { RouterModule } from '@angular/router';
import { timeout, TimeoutError } from 'rxjs';

import { takeUntilDestroyed } from
      '@angular/core/rxjs-interop';

import { EmpleadoService } from
      '../../services/empleado.service';

import { PersonalInformationComponent } from
      './personal-information';

import { SecurityComponent } from
      './security';

import { defaultPersonalInfo } from
      './personal-information/data';

import { PersonalInfo } from
      './personal-information/types';

@Component({
  selector: 'app-profile',
  standalone: true,

  imports: [
    CommonModule,
    RouterModule,
    PersonalInformationComponent,
    SecurityComponent
  ],

  host: {
    class: 'block'
  },

  templateUrl: './profile.component.html'
})
export class ProfileComponent implements OnInit {

  private readonly empleadoService =
      inject(EmpleadoService);

  private readonly destroyRef =
      inject(DestroyRef);

  private readonly cdr =
      inject(ChangeDetectorRef);

  perfil: PersonalInfo = {
    ...defaultPersonalInfo
  };

  cargando = true;
  errorMensaje = '';

  ngOnInit(): void {
    this.cargarPerfil();
  }

  cargarPerfil(): void {

    this.cargando = true;
    this.errorMensaje = '';

    this.empleadoService.obtenerResumen()
        .pipe(
            timeout(10000),
            takeUntilDestroyed(this.destroyRef)
        )
        .subscribe({

          next: datos => {

            const nombre =
                datos.nombre?.trim() || '';

            const correo =
                datos.email?.trim() || '';

            if (!nombre && !correo) {

              this.errorMensaje =
                  'No se encontraron los datos del empleado.';

              this.cargando = false;
              this.cdr.detectChanges();

              return;
            }

            const partes =
                nombre.split(/\s+/).filter(Boolean);

            this.perfil = {
              ...defaultPersonalInfo,

              fullName: nombre,
              firstName: partes[0] || '',
              lastName: partes.slice(1).join(' '),

              email: correo,
              role: 'Empleado',

              avatarUrl: ''
            };

            this.cargando = false;
            this.errorMensaje = '';

            this.cdr.detectChanges();
          },

          error: error => {

            console.error(
                'No se pudo cargar Mi cuenta:',
                error
            );

            this.cargando = false;

            if (error instanceof TimeoutError) {

              this.errorMensaje =
                  'La consulta tardó demasiado.';

            } else if (
                error instanceof HttpErrorResponse
            ) {

              if (error.status === 0) {

                this.errorMensaje =
                    'No se pudo conectar con Spring Boot.';

              } else {

                this.errorMensaje =
                    'Error consultando el perfil (HTTP ' +
                    error.status + ').';
              }

            } else {

              this.errorMensaje =
                  'No fue posible cargar la información.';
            }

            this.cdr.detectChanges();
          }
        });
  }
}