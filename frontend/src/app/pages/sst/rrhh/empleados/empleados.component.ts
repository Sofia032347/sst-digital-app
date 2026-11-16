import {CommonModule} from '@angular/common';
import {ChangeDetectorRef, Component, DestroyRef, inject, OnInit} from '@angular/core';


import {firstValueFrom} from 'rxjs';
import Swal from 'sweetalert2';

import {EmpleadoRrhh, GuardarEmpleado, RolEmpleado, RrhhService} from '../../../../core/services/rrhh.service';

@Component({
    selector: 'app-empleados',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './empleados.component.html'
})
export class EmpleadosComponent implements OnInit {

    private readonly rrhhService = inject(RrhhService);

    private readonly cdr = inject(ChangeDetectorRef);
    private readonly destroyRef = inject(DestroyRef);

    empleados: EmpleadoRrhh[] = [];

    busqueda = '';
    cargando = false;
    guardando = false;
    eliminandoId: number | null = null;
    error = '';

    ngOnInit(): void {
        void this.cargarEmpleados();
    }

    // ==========================================
    // CARGAR EMPLEADOS
    // ==========================================


    async cargarEmpleados(): Promise<void> {

        if (this.cargando) {
            return;
        }

        this.cargando = true;
        this.error = '';

        try {

            const empleados = await firstValueFrom(
                this.rrhhService.listarEmpleados()
            );

            this.empleados = empleados ?? [];

        } catch (error) {

            console.error('Error al listar empleados:', error);

            this.error = 'No se pudieron cargar los empleados.';

        } finally {

            this.cargando = false;

            if (!this.destroyRef.destroyed) {
                this.cdr.detectChanges();
            }
        }
    }


// ==========================================
// ACTUALIZACIÓN DE LA VISTA ANGULAR
// ==========================================

    private actualizarVista(): void {

        if (!this.destroyRef.destroyed) {
            this.cdr.detectChanges();
        }
    }


    // ==========================================
    // BUSCAR EMPLEADOS
    // ==========================================

    actualizarBusqueda(valor: string): void {
        this.busqueda = valor;
    }

    get empleadosFiltrados(): EmpleadoRrhh[] {

        const filtro = this.busqueda
            .trim()
            .toLowerCase();

        if (!filtro) {
            return this.empleados;
        }

        return this.empleados.filter(
            empleado =>
                (empleado.nombre ?? '')
                    .toLowerCase().includes(filtro) ||

                (empleado.email ?? '')
                    .toLowerCase().includes(filtro) ||

                (empleado.departamento ?? '')
                    .toLowerCase().includes(filtro) ||

                (empleado.rol ?? '')
                    .toLowerCase().includes(filtro)
        );
    }

    // ==========================================
    // CREAR EMPLEADO
    // ==========================================

    async crearEmpleado(): Promise<void> {

        if (this.guardando || this.eliminandoId !== null) {
            return;
        }

        await this.abrirFormulario();
    }

    // ==========================================
    // EDITAR EMPLEADO
    // ==========================================

    async editarEmpleado(
        empleado: EmpleadoRrhh
    ): Promise<void> {

        if (this.guardando || this.eliminandoId !== null) {
            return;
        }

        await this.abrirFormulario(empleado);
    }

    // ==========================================
    // TEMA PARA SWEETALERT2
    // ==========================================

    private get temaOscuro(): boolean {
        return document.documentElement.classList.contains('dark');
    }

    private get coloresSwal() {
        return {
            background: this.temaOscuro ? '#101828' : '#ffffff',
            color: this.temaOscuro ? '#f9fafb' : '#101828',
            confirmButtonColor: '#2563eb',
            cancelButtonColor: '#64748b'
        };
    }

    // ==========================================
    // ABRIR FORMULARIO SWEETALERT2
    // ==========================================

    private async abrirFormulario(
        empleado?: EmpleadoRrhh
    ): Promise<void> {

        const editando = !!empleado;
        const oscuro = this.temaOscuro;

        const claseInput = [
            'w-full',
            'rounded-lg',
            'border',
            'px-4',
            'text-sm',
            'outline-none',
            'transition',
            'focus:border-blue-500',
            'focus:ring-2',
            'focus:ring-blue-500/10',
            oscuro
                ? 'border-gray-700 bg-gray-800 text-white'
                : 'border-gray-300 bg-white text-gray-900'
        ].join(' ');

        const claseLabel = [
            'mb-2',
            'block',
            'text-sm',
            'font-medium',
            oscuro ? 'text-gray-300' : 'text-gray-700'
        ].join(' ');

        const resultado = await Swal.fire<GuardarEmpleado>({

            title: editando
                ? 'Editar empleado'
                : 'Registrar nuevo empleado',

            width: 580,
            padding: '1.5rem',

            ...this.coloresSwal,

            showCancelButton: true,

            confirmButtonText: editando
                ? 'Guardar cambios'
                : 'Crear usuario',

            cancelButtonText: 'Cancelar',

            reverseButtons: true,
            focusConfirm: false,


            customClass: {
                popup: 'rounded-2xl',

                title: 'text-xl font-semibold',

                confirmButton: 'rounded-lg px-5 py-2.5',

                cancelButton: 'rounded-lg px-5 py-2.5',

                validationMessage:
                    'rrhh-alerta-validacion'
            },

            html: `
        <div class="mt-5 space-y-4 text-left">

          <!-- NOMBRE -->

          <div>
            <label
              for="rrhh-nombre"
              class="${claseLabel}"
            >
              Nombre completo
              <span class="text-red-500">*</span>
            </label>

            <input
              id="rrhh-nombre"
              type="text"
              maxlength="120"
              autocomplete="name"
              placeholder="Ej. Juan Pérez"
              class="${claseInput} h-11"
            />
          </div>

          <!-- CORREO -->

          <div>
            <label
              for="rrhh-email"
              class="${claseLabel}"
            >
              Correo electrónico
              <span class="text-red-500">*</span>
            </label>

            <input
              id="rrhh-email"
              type="email"
              maxlength="150"
              autocomplete="email"
              placeholder="usuario@empresa.com"
              class="${claseInput} h-11"
            />
          </div>

          <!-- ROL -->

          <div>
            <label
              for="rrhh-rol"
              class="${claseLabel}"
            >
              Rol
              <span class="text-red-500">*</span>
            </label>

            <select
              id="rrhh-rol"
              class="${claseInput} h-11"
            >
              <option value="EMPLEADO">
                EMPLEADO
              </option>

              <option value="RRHH">
                RRHH
              </option>
            </select>
          </div>

          <!-- DEPARTAMENTO -->

          <div>
            <label
              for="rrhh-departamento"
              class="${claseLabel}"
            >
              Departamento
              <span class="text-red-500">*</span>
            </label>

            <input
              id="rrhh-departamento"
              type="text"
              maxlength="100"
              placeholder="Ej. Sistemas"
              class="${claseInput} h-11"
            />
          </div>

          <!-- CONTRASEÑA -->

          <div>
            <label
              for="rrhh-password"
              class="${claseLabel}"
            >
              ${
                editando
                    ? 'Nueva contraseña (opcional)'
                    : 'Contraseña inicial <span class="text-red-500">*</span>'
            }
            </label>

            <div class="relative">

              <input
                id="rrhh-password"
                type="password"
                autocomplete="new-password"
                placeholder="${
                editando
                    ? 'Dejar vacía para no cambiar'
                    : 'Mínimo 8 caracteres'
            }"
                class="${claseInput} h-11 pr-24"
              />


<button
  id="rrhh-mostrar-password"
  type="button"
  aria-label="Mostrar contraseña"
  aria-pressed="false"
  title="Mostrar contraseña"
  class="absolute right-3 top-1/2 -translate-y-1/2
         flex h-9 w-9 items-center justify-center
         rounded-lg text-gray-500 transition
         hover:bg-gray-100 hover:text-blue-600
         dark:text-gray-400
         dark:hover:bg-gray-700 dark:hover:text-blue-400"
>
  <svg
    id="rrhh-icono-password"
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path
      d="M2.062 12.348a1 1 0 0 1 0-.696
         10.75 10.75 0 0 1 19.876 0
         1 1 0 0 1 0 .696
         10.75 10.75 0 0 1-19.876 0"
    />
    <circle cx="12" cy="12" r="3" />
    <path
      d="M2 2l20 20"
      class="rrhh-ojo-tachado"
    />
  </svg>
</button>

            </div>

            <p class="mt-2 text-xs ${
                oscuro ? 'text-gray-400' : 'text-gray-500'
            }">
              ${
                editando
                    ? 'Deja este campo vacío para conservar la contraseña actual.'
                    : 'Debe contener al menos 8 caracteres.'
            }
            </p>

          </div>

        </div>
      `,

            // ======================================
            // AL ABRIR EL SWEETALERT
            // ======================================

            didOpen: () => {

                const popup = Swal.getPopup();

                if (!popup) {
                    return;
                }

                const input = (id: string) =>
                    popup.querySelector<HTMLInputElement>(
                        `#${id}`
                    );

                const nombre = input('rrhh-nombre');
                const email = input('rrhh-email');
                const departamento = input('rrhh-departamento');
                const password = input('rrhh-password');

                const rol =
                    popup.querySelector<HTMLSelectElement>(
                        '#rrhh-rol'
                    );

                const botonPassword =
                    popup.querySelector<HTMLButtonElement>(
                        '#rrhh-mostrar-password'
                    );

                // Cargar los valores actuales al editar.
                if (empleado) {

                    if (nombre) {
                        nombre.value = empleado.nombre ?? '';
                    }

                    if (email) {
                        email.value = empleado.email ?? '';
                    }

                    if (departamento) {
                        departamento.value =
                            empleado.departamento ?? '';
                    }

                    if (rol) {
                        rol.value = empleado.rol;
                    }
                }

                // Mostrar u ocultar contraseña.

                botonPassword?.addEventListener('click', () => {

                    if (!password || !botonPassword) {
                        return;
                    }

                    const mostrar = password.type === 'password';

                    password.type = mostrar ? 'text' : 'password';

                    botonPassword.setAttribute(
                        'aria-label',
                        mostrar ? 'Ocultar contraseña' : 'Mostrar contraseña'
                    );

                    botonPassword.setAttribute(
                        'title',
                        mostrar ? 'Ocultar contraseña' : 'Mostrar contraseña'
                    );

                    botonPassword.setAttribute(
                        'aria-pressed',
                        String(mostrar)
                    );

                    const lineaTachada =
                        botonPassword.querySelector<SVGPathElement>(
                            '.rrhh-ojo-tachado'
                        );

                    if (lineaTachada) {
                        lineaTachada.style.display =
                            mostrar ? 'none' : '';
                    }
                });


                nombre?.focus();
            },

            // ======================================
            // VALIDAR DATOS
            // ======================================

            preConfirm: () => {

                const popup = Swal.getPopup();

                if (!popup) {
                    return false;
                }

                const valor = (id: string) =>
                    popup.querySelector<HTMLInputElement>(
                        `#${id}`
                    )?.value.trim() ?? '';

                const rol =
                    popup.querySelector<HTMLSelectElement>(
                        '#rrhh-rol'
                    )?.value as RolEmpleado | undefined;

                const datos: GuardarEmpleado = {

                    nombre: valor('rrhh-nombre'),

                    email: valor('rrhh-email').toLowerCase(),

                    rol: rol ?? 'EMPLEADO',

                    departamento: valor('rrhh-departamento'),

                    password: valor('rrhh-password')
                };

                if (
                    !datos.nombre ||
                    !datos.email ||
                    !datos.departamento
                ) {

                    Swal.showValidationMessage(
                        'Completa todos los campos obligatorios.'
                    );

                    return false;
                }

                if (
                    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
                        datos.email
                    )
                ) {

                    Swal.showValidationMessage(
                        'Ingresa un correo electrónico válido.'
                    );

                    return false;
                }

                if (
                    datos.rol !== 'EMPLEADO' &&
                    datos.rol !== 'RRHH'
                ) {

                    Swal.showValidationMessage(
                        'Selecciona un rol válido.'
                    );

                    return false;
                }

                if (
                    !editando &&
                    datos.password.length < 8
                ) {

                    Swal.showValidationMessage(
                        'La contraseña inicial debe tener mínimo 8 caracteres.'
                    );

                    return false;
                }

                if (
                    editando &&
                    datos.password.length > 0 &&
                    datos.password.length < 8
                ) {

                    Swal.showValidationMessage(
                        'La nueva contraseña debe tener mínimo 8 caracteres.'
                    );

                    return false;
                }

                return datos;
            }
        });

        if (!resultado.isConfirmed || !resultado.value) {
            return;
        }

        // ========================================
        // GUARDAR EN MYSQL
        // ========================================


        this.guardando = true;
        this.actualizarVista();

        let guardadoCorrectamente = false;
        let mensajeError = '';

        try {

            const datos = resultado.value;

            if (empleado) {

                await firstValueFrom(
                    this.rrhhService.editarEmpleado(
                        empleado.id,
                        datos
                    )
                );

            } else {

                await firstValueFrom(
                    this.rrhhService.crearEmpleado(datos)
                );

            }

            guardadoCorrectamente = true;

        } catch (error: any) {

            console.error('Error al guardar:', error);

            mensajeError = this.obtenerMensajeError(
                error,
                'No se pudo guardar el empleado.'
            );

        } finally {

            // Habilitar los botones inmediatamente.
            this.guardando = false;
            this.actualizarVista();

        }

        if (!guardadoCorrectamente) {

            await Swal.fire({
                icon: 'error',
                title: 'No se pudo guardar',
                text: mensajeError,
                confirmButtonText: 'Aceptar',
                ...this.coloresSwal
            });

            return;
        }

        // Actualizar automáticamente la tabla.
        await this.cargarEmpleados();

        await Swal.fire({
            icon: 'success',
            title: empleado
                ? 'Empleado actualizado'
                : 'Empleado registrado',
            text: empleado
                ? 'Los datos se actualizaron correctamente.'
                : 'El nuevo usuario se creó correctamente.',
            confirmButtonText: 'Aceptar',
            ...this.coloresSwal
        });
    }

    // ==========================================
    // ELIMINAR EMPLEADO
    // ==========================================

    async eliminarEmpleado(
        empleado: EmpleadoRrhh
    ): Promise<void> {

        if (
            this.guardando ||
            this.eliminandoId !== null
        ) {
            return;
        }

        const confirmacion = await Swal.fire({

            icon: 'warning',

            title: '¿Eliminar empleado?',

            text:
                `¿Deseas eliminar a ${empleado.nombre}? ` +
                'Esta operación puede afectar su historial de pausas.',

            showCancelButton: true,

            confirmButtonText: 'Sí, eliminar',

            cancelButtonText: 'Cancelar',

            confirmButtonColor: '#dc2626',
            cancelButtonColor: '#64748b',

            background: this.coloresSwal.background,
            color: this.coloresSwal.color,

            reverseButtons: true
        });

        if (!confirmacion.isConfirmed) {
            return;
        }

        this.eliminandoId = empleado.id;

        try {

            await firstValueFrom(
                this.rrhhService.eliminarEmpleado(
                    empleado.id
                )
            );

            await this.cargarEmpleados();

            await Swal.fire({

                icon: 'success',
                title: 'Empleado eliminado',
                text: 'La operación fue realizada correctamente.',
                confirmButtonText: 'Aceptar',

                ...this.coloresSwal
            });

        } catch (error: any) {

            console.error(error);

            await Swal.fire({

                icon: 'error',

                title: 'No se pudo eliminar',

                text: this.obtenerMensajeError(
                    error,
                    'El servidor no permitió eliminar al usuario.'
                ),

                confirmButtonText: 'Aceptar',

                ...this.coloresSwal
            });
        } finally {

            this.eliminandoId = null;
            this.actualizarVista();

        }

    }

    // ==========================================
    // EXTRAER MENSAJES DEL BACKEND
    // ==========================================


    private obtenerMensajeError(
        error: any,
        predeterminado: string
    ): string {

        console.error('Error completo del servidor:', error);

        const respuesta = error?.error;

        // Mensaje enviado directamente como texto
        if (typeof respuesta === 'string' && respuesta.trim()) {
            return respuesta;
        }

        // Mensajes de Spring Boot
        if (respuesta?.detail) {
            return respuesta.detail;
        }

        if (respuesta?.message) {
            return respuesta.message;
        }

        if (respuesta?.error_description) {
            return respuesta.error_description;
        }

        // Errores HTTP conocidos
        switch (error?.status) {

            case 0:
                return 'No se pudo conectar con Spring Boot. Verifica que el servidor esté iniciado.';

            case 400:
                return 'Los datos enviados no son válidos. Revisa los campos del formulario.';

            case 401:
                return 'Tu sesión ha expirado. Inicia sesión nuevamente.';

            case 403:
                return 'El servidor rechazó la solicitud (403). Revisa los permisos de RRHH y el token CSRF.';

            case 404:
                return 'No se encontró el endpoint para crear empleados (404).';

            case 405:
                return 'El endpoint no permite esta operación (405).';

            case 409:
                return 'Ya existe un usuario con ese correo o hay un conflicto con los datos.';

            case 500:
                return 'Ocurrió un error interno en Spring Boot. Revisa la consola de Java.';

            default:
                return `${predeterminado} Código HTTP: ${error?.status ?? 'desconocido'}.`;
        }
    }

}
