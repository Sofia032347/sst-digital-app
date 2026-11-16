
import { CommonModule } from '@angular/common';

import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  Output,
  ViewChild
} from '@angular/core';

import { ButtonComponent } from
      '../../../../shared/components/ui/button/button.component';

@Component({
  selector: 'app-avatar-upload-section',
  imports: [
    ButtonComponent,
    CommonModule
  ],
  host: {
    class: 'block'
  },
  template: `
    <div class="space-y-4">

      <h3 class="text-base font-medium text-gray-800 dark:text-white/90">
        Fotografía de perfil
      </h3>

      <div class="flex flex-wrap items-center gap-5">

        <!-- FOTOGRAFÍA ACTUAL O VISTA PREVIA -->

        <div class="relative">

          <div
            class="relative flex size-20 shrink-0 overflow-hidden
                   rounded-full sm:size-24"
          >

            @if (previewAvatarUrl) {

              <img
                [src]="previewAvatarUrl"
                [alt]="fullName || 'Foto de perfil'"
                class="aspect-square size-full object-cover"
              />

            } @else {

              <div
                class="flex size-full items-center justify-center
                       bg-cyan-500 text-2xl font-medium text-white"
              >
                {{ fallbackLetter }}
              </div>

            }

          </div>

          <!-- BOTÓN DE CÁMARA ORIGINAL DE TAILADMIN -->

          <button
            app-button
            variant="unstyled"
            type="button"

            (click)="abrirCamara()"

            aria-label="Tomar fotografía"

            class="absolute end-0 bottom-0 flex size-8
                   cursor-pointer items-center justify-center
                   rounded-full border border-gray-200
                   bg-white text-gray-600 shadow-theme-xs
                   transition-colors hover:bg-gray-50
                   hover:text-gray-900 dark:border-gray-700
                   dark:bg-gray-800 dark:text-gray-300"
          >

            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              class="size-4.5"
              aria-hidden="true"
            >

              <path
                d="M12.6732 3.41872C12.4373 3.10275
                   12.066 2.91667 11.6717 2.91667
                   H8.32825C7.93391 2.91667
                   7.56268 3.10275 7.32672 3.41872
                   L6.83189 4.08131C6.59593 4.39727
                   6.2247 4.58336 5.83036 4.58336
                   H3.54167C2.85131 4.58336
                   2.29167 5.14301 2.29167 5.83336
                   V14.375C2.29167 15.0654
                   2.85131 15.625 3.54167 15.625
                   H16.4583C17.1487 15.625
                   17.7083 15.0654 17.7083 14.375
                   V5.83336C17.7083 5.14301
                   17.1487 4.58336 16.4583 4.58336
                   H14.1696C13.7752 4.58336
                   13.404 4.39727 13.1681 4.08131
                   L12.6732 3.41872Z"

                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />

              <circle
                cx="10"
                cy="9.8"
                r="3.3"
                stroke="currentColor"
                stroke-width="1.5"
              />

            </svg>

          </button>

        </div>

        <!-- BOTONES PARA SUBIR O TOMAR FOTO -->

        <div class="flex flex-col gap-3">

          <div class="flex flex-wrap gap-2">

            <button
              app-button
              variant="unstyled"
              type="button"

              (click)="seleccionarArchivo()"

              class="flex h-10 cursor-pointer items-center
                     justify-center rounded-lg border
                     border-gray-300 bg-white px-4
                     text-sm font-medium text-gray-700
                     shadow-theme-xs hover:bg-gray-50
                     dark:border-gray-700 dark:bg-gray-800
                     dark:text-gray-300"
            >
              Subir foto
            </button>

            <button
              app-button
              variant="unstyled"
              type="button"

              (click)="abrirCamara()"

              class="flex h-10 cursor-pointer items-center
                     justify-center rounded-lg bg-brand-500
                     px-4 text-sm font-medium text-white
                     hover:bg-brand-600"
            >
              Tomar foto
            </button>

          </div>

          <p class="text-xs text-gray-500 dark:text-gray-400">
            Formatos JPG, PNG o WEBP.
            Tamaño máximo: 5 MB.
          </p>

        </div>

        <!-- INPUT OCULTO -->

        <input
          #fileInput
          type="file"
          accept="image/png,image/jpeg,image/webp"
          (change)="handleImageChange($event)"
          class="hidden"
        />

      </div>

      <!-- MENSAJE DE ERROR -->

      @if (errorImagen) {

        <p class="text-sm text-red-500">
          {{ errorImagen }}
        </p>

      }

      <!-- CÁMARA EN DIRECTO -->

      @if (camaraAbierta) {

        <div
          class="rounded-xl border border-gray-200
                 p-4 dark:border-gray-700"
        >

          <h4
            class="mb-3 text-sm font-semibold
                   text-gray-800 dark:text-white"
          >
            Tomar fotografía
          </h4>

          <div
            class="overflow-hidden rounded-xl
                   bg-gray-900"
          >

            <video
              #videoCamara
              autoplay
              muted
              playsinline
              class="aspect-video w-full object-cover"
            ></video>

          </div>

          <div class="mt-4 flex flex-wrap justify-end gap-3">

            <button
              app-button
              variant="unstyled"
              type="button"

              (click)="cerrarCamara()"

              class="rounded-lg border border-gray-300
                     px-4 py-2 text-sm font-medium
                     text-gray-700 dark:border-gray-700
                     dark:text-gray-300"
            >
              Cancelar
            </button>

            <button
              app-button
              variant="unstyled"
              type="button"

              (click)="capturarFotografia()"

              class="rounded-lg bg-brand-500
                     px-4 py-2 text-sm font-medium
                     text-white hover:bg-brand-600"
            >
              Capturar foto
            </button>

          </div>

        </div>

      }

    </div>
  `
})
export class AvatarUploadSectionComponent
    implements OnDestroy {

  @Input() previewAvatarUrl = '';
  @Input() fullName = '';
  @Input() fallbackLetter = 'E';

  // Mantiene la salida original de TailAdmin.
  @Output() avatarChange =
      new EventEmitter<string>();

  // Nueva salida: archivo real para Spring Boot.
  @Output() avatarFileChange =
      new EventEmitter<File>();

  @ViewChild('fileInput')
  fileInputRef?: ElementRef<HTMLInputElement>;

  @ViewChild('videoCamara')
  videoCamaraRef?: ElementRef<HTMLVideoElement>;

  camaraAbierta = false;
  errorImagen = '';

  private streamCamara: MediaStream | null = null;

  private readonly MAX_BYTES =
      5 * 1024 * 1024;

  constructor(
      private readonly cdr: ChangeDetectorRef
  ) {}

  // ==========================================
  // SELECCIONAR ARCHIVO
  // ==========================================

  seleccionarArchivo(): void {
    this.fileInputRef?.nativeElement.click();
  }

  handleImageChange(event: Event): void {

    const input =
        event.target as HTMLInputElement;

    const archivo = input.files?.[0];

    if (archivo) {
      this.procesarArchivo(archivo);
    }

    // Permite volver a elegir el mismo archivo.
    input.value = '';
  }

  // ==========================================
  // VALIDAR Y MOSTRAR LA FOTO
  // ==========================================

  private procesarArchivo(archivo: File): void {

    this.errorImagen = '';

    const formatosPermitidos = [
      'image/jpeg',
      'image/png',
      'image/webp'
    ];

    if (!formatosPermitidos.includes(
        archivo.type
    )) {

      this.errorImagen =
          'Selecciona una imagen JPG, PNG o WEBP.';

      return;
    }

    if (archivo.size > this.MAX_BYTES) {

      this.errorImagen =
          'La fotografía no puede superar los 5 MB.';

      return;
    }

    const lector = new FileReader();

    lector.onload = () => {

      const resultado = lector.result;

      if (typeof resultado !== 'string') {

        this.errorImagen =
            'No fue posible leer la fotografía.';

        return;
      }

      // Vista previa.
      this.avatarChange.emit(resultado);

      // Archivo real, sin convertirlo en URL temporal.
      this.avatarFileChange.emit(archivo);

      this.cdr.detectChanges();
    };

    lector.onerror = () => {

      this.errorImagen =
          'Ocurrió un error al cargar la imagen.';

      this.cdr.detectChanges();
    };

    lector.readAsDataURL(archivo);
  }

  // ==========================================
  // ABRIR CÁMARA
  // ==========================================

  async abrirCamara(): Promise<void> {

    this.errorImagen = '';

    if (
        typeof navigator === 'undefined' ||
        !navigator.mediaDevices?.getUserMedia
    ) {

      this.errorImagen =
          'Este navegador no permite acceder a la cámara.';

      return;
    }

    this.cerrarCamara();

    try {

      const stream =
          await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: {
              facingMode: 'user'
            }
          });

      this.streamCamara = stream;
      this.camaraAbierta = true;

      // Renderizar el video antes de asignar
      // el MediaStream.
      this.cdr.detectChanges();

      const video =
          this.videoCamaraRef?.nativeElement;

      if (!video) {
        throw new Error(
            'No se encontró el visor de cámara.'
        );
      }

      video.srcObject = stream;

      await video.play();

    } catch (error) {

      console.error(
          'No se pudo abrir la cámara:',
          error
      );

      this.cerrarCamara();

      this.errorImagen =
          'No se pudo acceder a la cámara. ' +
          'Revisa los permisos del navegador.';

      this.cdr.detectChanges();
    }
  }

  // ==========================================
  // CAPTURAR FOTOGRAFÍA
  // ==========================================

  capturarFotografia(): void {

    const video =
        this.videoCamaraRef?.nativeElement;

    if (
        !video ||
        !video.videoWidth ||
        !video.videoHeight
    ) {

      this.errorImagen =
          'La cámara todavía no está lista.';

      return;
    }

    const lienzo =
        document.createElement('canvas');

    // Tamaño máximo de salida para mantener
    // la fotografía ligera.
    const escala = Math.min(
        1,
        800 / Math.max(
            video.videoWidth,
            video.videoHeight
        )
    );

    lienzo.width = Math.round(
        video.videoWidth * escala
    );

    lienzo.height = Math.round(
        video.videoHeight * escala
    );

    const contexto =
        lienzo.getContext('2d');

    if (!contexto) {

      this.errorImagen =
          'No fue posible capturar la imagen.';

      return;
    }

    contexto.drawImage(
        video,
        0,
        0,
        lienzo.width,
        lienzo.height
    );

    lienzo.toBlob(
        blob => {

          if (!blob) {

            this.errorImagen =
                'No fue posible generar la fotografía.';

            return;
          }

          const archivo = new File(
              [blob],
              `foto-perfil-${Date.now()}.jpg`,
              {
                type: 'image/jpeg'
              }
          );

          this.procesarArchivo(archivo);
          this.cerrarCamara();
        },
        'image/jpeg',
        0.85
    );
  }

  // ==========================================
  // CERRAR CÁMARA
  // ==========================================

  cerrarCamara(): void {

    if (this.streamCamara) {

      this.streamCamara.getTracks()
          .forEach(track => track.stop());

      this.streamCamara = null;
    }

    const video =
        this.videoCamaraRef?.nativeElement;

    if (video) {
      video.srcObject = null;
    }

    this.camaraAbierta = false;
  }

  ngOnDestroy(): void {
    this.cerrarCamara();
  }
}
