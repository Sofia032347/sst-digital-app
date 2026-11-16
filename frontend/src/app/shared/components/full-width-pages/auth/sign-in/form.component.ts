
import { CommonModule } from '@angular/common';

import {
  Component,
  Input,
  inject
} from '@angular/core';

import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';

import {
  HttpClient,
  HttpErrorResponse,
  HttpHeaders,
  HttpParams
} from '@angular/common/http';

import { Router } from '@angular/router';

import {
  firstValueFrom,
  timeout
} from 'rxjs';

import Swal from 'sweetalert2';

import { ButtonComponent } from
      '../../../ui/button/button.component';

import { InputDirective } from
      '../../../ui/input/input.directive';

import { RolUsuarioService } from
      '../../../../../core/services/rol-usuario.service';

// ============================================
// TOKEN CSRF DE SPRING SECURITY
// ============================================

interface CsrfResponse {
  token: string;
  headerName: string;
}

// ============================================
// RESPUESTA DE /api/auth/me
// ============================================

interface UsuarioAutenticado {
  autenticado: boolean;
  email: string;
  rol: string;
}

@Component({
  selector: 'app-sign-in-form-fields',
  standalone: true,
  imports: [
    InputDirective,
    ButtonComponent,
    CommonModule,
    ReactiveFormsModule
  ],
  templateUrl: './form.component.html',
  host: {
    class: 'contents'
  },
  styles: [
    `
      :host {
        display: contents;
      }
    `
  ]
})
export class SignInFormFieldsComponent {

  @Input() className = '';

  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly rolUsuarioService =
      inject(RolUsuarioService);

  showPassword = false;
  isSubmitting = false;

  errorLogin = '';

  // ==========================================
  // FORMULARIO
  // ==========================================

  signInForm = new FormGroup({

    email: new FormControl('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.email
      ]
    }),

    password: new FormControl('', {
      nonNullable: true,
      validators: [
        Validators.required
      ]
    })

  });

  // ==========================================
  // MOSTRAR / OCULTAR CONTRASEÑA
  // ==========================================

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  // ==========================================
  // VALIDACIONES
  // ==========================================

  isFieldInvalid(
      fieldName: 'email' | 'password'
  ): boolean {

    const control =
        this.signInForm.get(fieldName);

    return !!(
        control &&
        control.invalid &&
        (control.dirty || control.touched)
    );
  }

  getFieldError(
      fieldName: 'email' | 'password'
  ): string {

    const control =
        this.signInForm.get(fieldName);

    if (!control?.errors) {
      return '';
    }

    if (fieldName === 'email') {

      if (control.errors['required']) {
        return 'El correo electrónico es obligatorio.';
      }

      if (control.errors['email']) {
        return 'Ingresa un correo electrónico válido.';
      }
    }

    if (fieldName === 'password') {

      if (control.errors['required']) {
        return 'La contraseña es obligatoria.';
      }
    }

    return '';
  }

  // ==========================================
  // AYUDA PARA RECUPERAR CONTRASEÑA
  // ==========================================

  async mostrarAyudaContrasena(): Promise<void> {

    await Swal.fire({
      icon: 'info',
      title: 'Recuperar contraseña',
      text:
          'Para recuperar o restablecer tu contraseña, ' +
          'comunícate con tu jefe de Recursos Humanos.',
      confirmButtonText: 'Entendido',
      confirmButtonColor: '#465FFF'
    });
  }

  // ==========================================
  // LOGIN REAL EN SPRING SECURITY
  // ==========================================

  async onSubmit(): Promise<void> {

    if (this.isSubmitting) {
      return;
    }

    this.errorLogin = '';

    if (this.signInForm.invalid) {

      this.signInForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;

    const { email, password } =
        this.signInForm.getRawValue();

    try {

      // ======================================
      // 1. OBTENER TOKEN CSRF
      // ======================================

      const csrf = await firstValueFrom(
          this.http.get<CsrfResponse>(
              '/api/auth/csrf',
              {
                withCredentials: true
              }
          ).pipe(
              timeout(12000)
          )
      );

      // ======================================
      // 2. PREPARAR CREDENCIALES
      // Spring Security espera datos
      // application/x-www-form-urlencoded
      // ======================================

      const datos = new HttpParams()
          .set('email', email.trim())
          .set('password', password);

      const headers = new HttpHeaders({
        'Content-Type':
            'application/x-www-form-urlencoded'
      }).set(
          csrf.headerName,
          csrf.token
      );

      // ======================================
      // 3. INICIAR SESIÓN
      // ======================================

      await firstValueFrom(
          this.http.post(
              '/login',
              datos.toString(),
              {
                headers,
                withCredentials: true,
                responseType: 'text'
              }
          ).pipe(
              timeout(15000)
          )
      );

      // Spring puede responder con una
      // redirección HTML, por eso NO
      // interpretamos el resultado como JSON.

      // ======================================
      // 4. CONSULTAR LA SESIÓN REAL
      // ======================================

      this.rolUsuarioService.limpiarSesion();

      const usuario = await firstValueFrom(
          this.http.get<UsuarioAutenticado>(
              '/api/auth/me',
              {
                withCredentials: true
              }
          ).pipe(
              timeout(12000)
          )
      );

      if (
          !usuario.autenticado ||
          !usuario.rol
      ) {
        throw new Error(
            'No se pudo verificar la sesión.'
        );
      }

      // ======================================
      // 5. REDIRECCIÓN POR ROL
      // ======================================

      let destino: string;

      switch (
          usuario.rol.trim().toUpperCase()
          ) {

        case 'RRHH':
          destino = '/sst/rrhh';
          break;

        case 'EMPLEADO':
          destino = '/sst/empleado';
          break;

        default:
          throw new Error(
              'Tu usuario no tiene un rol autorizado.'
          );
      }

      const navegacionCorrecta =
          await this.router.navigateByUrl(
              destino,
              {
                replaceUrl: true
              }
          );

      if (!navegacionCorrecta) {
        throw new Error(
            'No se pudo abrir el dashboard.'
        );
      }

    } catch (error: unknown) {

      console.error(
          'Error de inicio de sesión:',
          error
      );

      if (error instanceof HttpErrorResponse) {

        if (
            error.status === 401 ||
            error.status === 400
        ) {

          this.errorLogin =
              'Correo o contraseña incorrectos.';

        } else if (error.status === 403) {

          this.errorLogin =
              'No se autorizó la solicitud. ' +
              'Verifica el token de seguridad CSRF.';

        } else if (error.status === 404) {

          this.errorLogin =
              'No se encontró el servicio de autenticación.';

        } else if (error.status === 0) {

          this.errorLogin =
              'No hay conexión con Spring Boot. ' +
              'Verifica que el servidor esté funcionando.';

        } else {

          this.errorLogin =
              'No fue posible iniciar sesión. ' +
              'Inténtalo nuevamente.';
        }

      } else if (
          error instanceof Error &&
          error.name === 'TimeoutError'
      ) {

        this.errorLogin =
            'El servidor tardó demasiado en responder. ' +
            'Inténtalo nuevamente.';

      } else if (error instanceof Error) {

        this.errorLogin = error.message;

      } else {

        this.errorLogin =
            'Ocurrió un error inesperado.';
      }

    } finally {

      // ======================================
      // EL BOTÓN SIEMPRE DEJA DE CARGAR
      // ======================================

      this.isSubmitting = false;
    }
  }
}
