import {Component, DestroyRef, inject, OnInit} from '@angular/core';
import {Router} from '@angular/router';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {catchError, exhaustMap, firstValueFrom, of, timer} from 'rxjs';
import Swal from 'sweetalert2';
import {EstadoPausa, Notificacion, NotificacionService} from '../../../services/notificacion.service';
import {RolUsuarioService} from "../../../core/services/rol-usuario.service";

@Component({
    selector: 'app-recordatorios-globales',
    standalone: true,
    template: ''
})
export class RecordatoriosGlobalesComponent
    implements OnInit {

    private readonly notificaciones =
        inject(NotificacionService);

    private readonly router =
        inject(Router);

    private readonly rolUsuarioService =
        inject(RolUsuarioService);

    private readonly destroyRef =
        inject(DestroyRef);

    // ==========================================
    // CONTROL GENERAL
    // ==========================================

    private destruido = false;

    private alertaAbierta = false;

    private consultandoAviso = false;

    // Una alerta por cada versión del recordatorio.
    private readonly avisosMostrados =
        new Set<string>();

    private readonly historialNotificado =
        new Set<string>();

    // ==========================================
    // CONTROL DE APLAZAMIENTO
    // ==========================================

    private versionAplazamiento = 0;

    private idAplazado: number | null = null;

    private protegerAplazamientoHastaMs = 0;

    // ==========================================
    // AUDIO GLOBAL
    // ==========================================

    private contextoAudio: AudioContext | null = null;

    private temporizadoresSonido:
        Array<ReturnType<typeof setTimeout>> = [];

    // ==========================================
    // PRIMERA INTERACCIÓN DEL USUARIO
    // ==========================================

    private readonly primeraInteraccion = (): void => {

        this.habilitarAudio();

        document.removeEventListener(
            'pointerdown',
            this.primeraInteraccion,
            true
        );

        document.removeEventListener(
            'keydown',
            this.primeraInteraccion,
            true
        );
    };

    // ==========================================
    // INICIALIZACIÓN
    // ==========================================

    ngOnInit(): void {

        // ======================================
        // INICIAR EL RELOJ GLOBAL
        // ======================================

        // Este método ya existe en el
        // NotificacionService actualizado.
        //
        // No crea varios relojes si
        // cambiamos de página.

        this.notificaciones.iniciarRelojGlobal();

        // ======================================
        // PREPARAR AUDIO
        // ======================================

        if (typeof document !== 'undefined') {

            document.addEventListener(
                'pointerdown',
                this.primeraInteraccion,
                true
            );

            document.addEventListener(
                'keydown',
                this.primeraInteraccion,
                true
            );
        }

        // ======================================
        // LIMPIEZA AL SALIR DEL LAYOUT
        // ======================================

        this.destroyRef.onDestroy(() => {

            this.destruido = true;

            this.detenerSonidos();

            if (typeof document !== 'undefined') {

                document.removeEventListener(
                    'pointerdown',
                    this.primeraInteraccion,
                    true
                );

                document.removeEventListener(
                    'keydown',
                    this.primeraInteraccion,
                    true
                );
            }

            // Cerrar únicamente si la alerta
            // automática pertenece a este componente.

            if (this.alertaAbierta) {
                Swal.close();
            }

            if (this.contextoAudio) {

                void this.contextoAudio.close()
                    .catch(error => {
                        console.warn(
                            'No se pudo cerrar el audio:',
                            error
                        );
                    });
            }

            // Detener el reloj y limpiar el estado
            // cuando salimos del layout autenticado.

            this.notificaciones.limpiarEstado();
        });

        // ======================================
        // SINCRONIZAR CON SPRING BOOT
        // ======================================

        // El servidor mantiene la programación
        // oficial desde el inicio de sesión.
        //
        // Angular no vuelve a programar una pausa
        // al navegar de una pantalla a otra.

        timer(0, 5000)
            .pipe(
                exhaustMap(() =>
                    this.notificaciones.sincronizar()
                        .pipe(
                            catchError(error => {

                                console.error(
                                    'Error sincronizando pausas:',
                                    error
                                );

                                return of(null);
                            })
                        )
                ),

                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe(estado => {

                if (
                    this.destruido ||
                    estado === null
                ) {
                    return;
                }

                // Actualizar el reloj compartido.
                this.notificaciones.publicarEstado(estado);

                // Verificar si corresponde
                // mostrar un recordatorio.
                void this.procesarEstado(estado);
            });

        // ======================================
        // ESCUCHAR APLAZAMIENTOS CONFIRMADOS
        // ======================================

        this.notificaciones.aplazamientos$
            .pipe(
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe(notificacion => {

                this.versionAplazamiento++;

                this.idAplazado =
                    notificacion.id;

                this.protegerAplazamientoHastaMs =
                    Date.now() + 30000;

                // No reiniciamos aquí el reloj:
                // el NotificacionService ya lo
                // actualizó al confirmar el POST.
            });
    }

    // ==========================================
    // PROCESAR ESTADO DEL SERVIDOR
    // ==========================================

    private async procesarEstado(
        estado: EstadoPausa
    ): Promise<void> {

        if (this.destruido) {
            return;
        }

        // Únicamente generar avisos cuando
        // Spring Boot los declara disponibles.

        if (
            estado.estado !== 'DISPONIBLE' ||
            estado.notificacionId == null
        ) {
            return;
        }

        // ======================================
        // NO INTERRUMPIR LOS EJERCICIOS
        // ======================================

        if (
            this.router.url.includes('/pausa-activa')
        ) {
            return;
        }

        // ======================================
        // EVITAR ALERTAS SUPERPUESTAS
        // ======================================

        if (
            this.alertaAbierta ||
            this.consultandoAviso ||
            Swal.isVisible()
        ) {
            return;
        }

        // ======================================
        // PROTEGER APLAZAMIENTO
        // ======================================

        if (
            estado.notificacionId === this.idAplazado &&
            Date.now() <
            this.protegerAplazamientoHastaMs
        ) {
            return;
        }

        this.consultandoAviso = true;

        const versionInicial =
            this.versionAplazamiento;

        try {

            // ==================================
            // CONSULTAR RECORDATORIOS VENCIDOS
            // ==================================

            const vencidas =
                await firstValueFrom(
                    this.notificaciones.obtenerVencidas()
                );

            // Si cambió el aplazamiento mientras
            // consultábamos, ignorar el resultado.

            if (
                this.destruido ||
                versionInicial !==
                this.versionAplazamiento
            ) {
                return;
            }

            // Revalidar página y ventanas abiertas.

            if (
                this.router.url.includes('/pausa-activa') ||
                Swal.isVisible()
            ) {
                return;
            }

            const actual = vencidas.find(n =>
                n.id === estado.notificacionId &&
                n.tipo === 'RECORDATORIO'
            );

            if (!actual) {
                return;
            }

            const claveVersion =
                `${actual.id}|${actual.vecesPospuesta}`;

            // No repetir la misma alerta.
            if (
                this.avisosMostrados.has(claveVersion)
            ) {
                return;
            }

            // ==================================
            // ACTUALIZAR CAMPANA
            // ==================================

            if (
                !this.historialNotificado
                    .has(claveVersion)
            ) {

                this.historialNotificado.add(
                    claveVersion
                );

                // La notificación ya está en MySQL.
                // Solo refrescar el historial.

                this.notificaciones.avisarCambio();
            }

            // Marcar como mostrada antes de abrir.
            this.avisosMostrados.add(claveVersion);

            // ==================================
            // MOSTRAR SWEETALERT2
            // ==================================

            await this.mostrarDecision(actual);

        } catch (error) {

            console.error(
                'Error procesando recordatorio:',
                error
            );

        } finally {

            this.consultandoAviso = false;
        }
    }

    // ==========================================
    // MOSTRAR RECORDATORIO GLOBAL
    // ==========================================

    private async mostrarDecision(
        notificacion: Notificacion
    ): Promise<void> {

        this.alertaAbierta = true;

        try {

            // Notificación del navegador si
            // ya se concedió el permiso.

            this.notificarEscritorio(notificacion);

            const oscuro =
                document.documentElement.classList
                    .contains('dark');

            const resultado = await Swal.fire({

                icon: 'info',

                title:
                    'Es momento de realizar una pausa activa',

                text: notificacion.mensaje,

                width: 520,

                // ==================================
                // INICIAR PAUSA
                // ==================================

                showConfirmButton: true,

                confirmButtonText:
                    'Iniciar pausa activa',

                confirmButtonColor: '#2563eb',

                // ==================================
                // POSPONER
                // ==================================

                showDenyButton: true,

                denyButtonText:
                    'Posponer 5 minutos',

                denyButtonColor: '#64748b',

                // ==================================
                // COMPORTAMIENTO
                // ==================================

                showCancelButton: false,
                showCloseButton: false,

                allowOutsideClick: false,
                allowEscapeKey: false,

                timer: undefined,

                reverseButtons: false,

                background:
                    oscuro ? '#101828' : '#ffffff',

                color:
                    oscuro ? '#f9fafb' : '#101828',

                customClass: {
                    popup: 'rounded-2xl',
                    confirmButton: 'rounded-lg',
                    denyButton: 'rounded-lg'
                },

                // ==================================
                // SONIDO AL ABRIR
                // ==================================

                didOpen: () => {

                    this.reproducirSonido(false);

                    this.programarSonidos();
                },

                // ==================================
                // DETENER SONIDOS AL CERRAR
                // ==================================

                willClose: () => {

                    this.detenerSonidos();
                }
            });

            if (this.destruido) {
                return;
            }

            // ======================================
            // USUARIO DECIDE INICIAR
            // ======================================

            if (resultado.isConfirmed) {

                const rol = this.rolUsuarioService.usuarioActual?.rol;

                const ruta = rol === 'RRHH'
                    ? '/sst/rrhh/pausa-activa'
                    : '/sst/empleado/pausa-activa';

                const navegacion =
                    await this.router.navigateByUrl(ruta);

                if (!navegacion) {

                    await Swal.fire({
                        icon: 'error',
                        title:
                            'No se pudo abrir la pausa',
                        text:
                            'Verifica el acceso a la ' +
                            'pantalla de ejercicios.'
                    });
                }

                return;
            }

            // ======================================
            // USUARIO DECIDE POSPONER
            // ======================================

            if (resultado.isDenied) {

                try {

                    const guardada =
                        await this.notificaciones.posponer(
                            notificacion.id,
                            5
                        );

                    await Swal.fire({

                        icon: 'success',
                        title: 'Pausa pospuesta',

                        text:
                            'Te recordaremos en 5 minutos. ' +
                            'Veces pospuesta: ' +
                            guardada.vecesPospuesta,

                        timer: 1600,
                        showConfirmButton: false,

                        background:
                            oscuro ? '#101828' : '#ffffff',

                        color:
                            oscuro ? '#f9fafb' : '#101828'
                    });

                } catch (error) {

                    console.error(
                        'Error al posponer pausa:',
                        error
                    );

                    await Swal.fire({

                        icon: 'error',
                        title: 'No se pudo posponer',

                        text:
                            'El servidor no confirmó ' +
                            'el aplazamiento.',

                        background:
                            oscuro ? '#101828' : '#ffffff',

                        color:
                            oscuro ? '#f9fafb' : '#101828'
                    });
                }
            }

        } finally {

            this.detenerSonidos();

            this.alertaAbierta = false;
        }
    }

    // ==========================================
    // HABILITAR AUDIO DEL NAVEGADOR
    // ==========================================

    private habilitarAudio(): void {

        if (
            typeof AudioContext === 'undefined'
        ) {
            return;
        }

        try {

            if (!this.contextoAudio) {

                this.contextoAudio =
                    new AudioContext();
            }

            void this.contextoAudio.resume()
                .catch(error => {

                    console.warn(
                        'Audio bloqueado por el navegador:',
                        error
                    );
                });

        } catch (error) {

            console.warn(
                'No se pudo habilitar audio:',
                error
            );
        }
    }

    // ==========================================
    // REPRODUCIR SONIDO
    // ==========================================

    private reproducirSonido(
        suave: boolean
    ): void {

        const audio =
            this.contextoAudio;

        if (
            !audio ||
            audio.state !== 'running'
        ) {
            return;
        }

        const frecuencia =
            suave ? 660 : 880;

        const cantidad =
            suave ? 1 : 3;

        const volumenMaximo =
            suave ? 0.08 : 0.2;

        for (
            let i = 0;
            i < cantidad;
            i++
        ) {

            const inicio =
                audio.currentTime +
                i * 0.28;

            const oscilador =
                audio.createOscillator();

            const volumen =
                audio.createGain();

            oscilador.type = 'sine';

            oscilador.frequency.value =
                frecuencia + (
                    suave ? 0 : i * 110
                );

            volumen.gain.setValueAtTime(
                0.0001,
                inicio
            );

            volumen.gain.exponentialRampToValueAtTime(
                volumenMaximo,
                inicio + 0.025
            );

            volumen.gain.exponentialRampToValueAtTime(
                0.0001,
                inicio + 0.2
            );

            oscilador.connect(volumen);

            volumen.connect(
                audio.destination
            );

            oscilador.start(inicio);

            oscilador.stop(
                inicio + 0.21
            );
        }
    }

    // ==========================================
    // SONIDOS DE SEGUIMIENTO
    // ==========================================

    private programarSonidos(): void {

        this.detenerSonidos();

        // Primer sonido recordatorio
        // a los tres minutos.

        this.temporizadoresSonido.push(
            setTimeout(() => {

                if (
                    !this.destruido &&
                    this.alertaAbierta &&
                    Swal.isVisible()
                ) {
                    this.reproducirSonido(true);
                }

            }, 3 * 60 * 1000)
        );

        // Segundo sonido recordatorio
        // a los ocho minutos.

        this.temporizadoresSonido.push(
            setTimeout(() => {

                if (
                    !this.destruido &&
                    this.alertaAbierta &&
                    Swal.isVisible()
                ) {
                    this.reproducirSonido(true);
                }

            }, 8 * 60 * 1000)
        );
    }

    // ==========================================
    // DETENER SONIDOS
    // ==========================================

    private detenerSonidos(): void {

        for (
            const id of
            this.temporizadoresSonido
            ) {
            clearTimeout(id);
        }

        this.temporizadoresSonido = [];
    }

    // ==========================================
    // NOTIFICACIÓN DE ESCRITORIO
    // ==========================================

    private notificarEscritorio(
        notificacion: Notificacion
    ): void {

        if (
            typeof Notification === 'undefined' ||
            Notification.permission !== 'granted'
        ) {
            return;
        }

        try {

            const aviso = new Notification(
                notificacion.titulo,
                {
                    body:
                    notificacion.mensaje,

                    icon:
                        '/favicon.ico',

                    tag:
                        `sst-pausa-${notificacion.id}-` +
                        `${notificacion.vecesPospuesta}`
                }
            );

            aviso.onclick = () => {

                window.focus();

                aviso.close();
            };

        } catch (error) {

            console.warn(
                'No se pudo mostrar el aviso de escritorio:',
                error
            );
        }
    }
}