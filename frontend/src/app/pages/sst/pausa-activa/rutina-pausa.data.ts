export type ModoFase = 'MEDIAPIPE' | 'GUIADA';

export interface FasePausa {
    instruccion: string;
    tiempo: number;
    imagen: string;
    modo: ModoFase;
}

export interface EjercicioPausa {
    titulo: string;
    imagen: string;
    fases: FasePausa[];
}

export const SEGUNDOS_PREPARACION = 3;
export const RUTINA_PAUSA: EjercicioPausa[] = [
    {
        titulo: '1. Cuello: Relajación lateral y frontal', imagen: '/img/cuello1.jpeg',
        fases: [
            {
                instruccion: 'Inclina la cabeza suavemente hacia la DERECHA intentando tocar el hombro con la oreja. Sostén.',
                tiempo: 15,
                imagen: '/img/cuello1.jpeg',
                modo: 'MEDIAPIPE'
            },
            {
                instruccion: 'Inclina la cabeza suavemente hacia la IZQUIERDA intentando tocar el hombro con la oreja. Sostén.',
                tiempo: 15,
                imagen: '/img/cuello1.jpeg',
                modo: 'MEDIAPIPE'
            },
            {
                instruccion: 'Lleva la barbilla al PECHO durante 15 segundos.',
                tiempo: 15,
                imagen: '/img/cuello2.jpeg',
                modo: 'MEDIAPIPE'
            },
            {
                instruccion: 'Mira ligeramente hacia ARRIBA durante 15 segundos, sin forzar el cuello.',
                tiempo: 15,
                imagen: '/img/cuello2.jpeg',
                modo: 'MEDIAPIPE'
            }
        ]
    },
    {
        titulo: '2. Hombros: Círculos liberadores', imagen: '/img/hombros1.png',
        fases: [
            {
                instruccion: 'Con los brazos sueltos, haz círculos amplios con los hombros hacia ATRÁS.',
                tiempo: 30,
                imagen: '/img/hombros1.jpeg',
                modo: 'GUIADA'
            },
            {
                instruccion: 'Cambia la dirección y haz círculos con los hombros hacia ADELANTE.',
                tiempo: 30,
                imagen: '/img/hombros2.png',
                modo: 'GUIADA'
            }
        ]
    },
    {
        titulo: '3. Hombros y Brazos: Estiramiento de tríceps', imagen: '/img/estiramiento.jpeg',
        fases: [
            {
                instruccion: 'Pasa el brazo DERECHO por arriba y el IZQUIERDO por abajo, intentando acercar tus manos en la espalda sin forzar.',
                tiempo: 30,
                imagen: '/img/estiramiento.jpeg',
                modo: 'GUIADA'
            },
            {
                instruccion: 'Pasa el brazo IZQUIERDO por arriba y el DERECHO por abajo, intentando acercar tus manos en la espalda sin forzar.',
                tiempo: 30,
                imagen: '/img/estiramiento.jpeg',
                modo: 'GUIADA'
            }
        ]
    },
    {
        titulo: '4. Espalda Alta: Estiramiento frontal', imagen: '/img/espalda.jpeg',
        fases: [
            {
                instruccion: 'Entrelaza las manos al frente, palmas hacia afuera, y empuja hacia adelante suavemente.',
                tiempo: 30,
                imagen: '/img/espalda.jpeg',
                modo: 'GUIADA'
            }
        ]
    },
    {
        titulo: '5. Muñecas y Antebrazos: Flexión y extensión', imagen: '/img/brazoderecho1.png',
        fases: [
            {
                instruccion: 'Brazo DERECHO extendido: lleva suavemente los dedos hacia ABAJO con ayuda de la mano izquierda.',
                tiempo: 15,
                imagen: '/img/brazoderecho1.png',
                modo: 'GUIADA'
            },
            {
                instruccion: 'Brazo DERECHO extendido: apunta los dedos hacia ARRIBA y acércalos suavemente hacia ti.',
                tiempo: 15,
                imagen: '/img/brazoderecho2.jpeg',
                modo: 'GUIADA'
            },
            {
                instruccion: 'Brazo IZQUIERDO extendido: lleva suavemente los dedos hacia ABAJO con ayuda de la mano derecha.',
                tiempo: 15,
                imagen: '/img/brazoizquierdo1.png',
                modo: 'GUIADA'
            },
            {
                instruccion: 'Brazo IZQUIERDO extendido: apunta los dedos hacia ARRIBA y acércalos suavemente hacia ti.',
                tiempo: 15,
                imagen: '/img/brazoizquierdo2.jpeg',
                modo: 'GUIADA'
            }
        ]
    },
    {
        titulo: '6. Tronco: Giro espinal', imagen: '/img/tronco1.jpeg',
        fases: [
            {
                instruccion: 'Sentado, gira suavemente el torso hacia la DERECHA y apoya las manos en el respaldo de la silla.',
                tiempo: 30,
                imagen: '/img/tronco1.jpeg',
                modo: 'GUIADA'
            },
            {
                instruccion: 'Sentado, gira suavemente el torso hacia la IZQUIERDA y apoya las manos en el respaldo de la silla.',
                tiempo: 30,
                imagen: '/img/tronco2.jpeg',
                modo: 'GUIADA'
            }
        ]
    },
    {
        titulo: '7. Espalda Baja: Estiramiento lateral', imagen: '/img/lateral1.jpeg',
        fases: [
            {
                instruccion: 'Levanta el brazo DERECHO por encima de la cabeza y flexiona suavemente el tronco hacia la izquierda.',
                tiempo: 30,
                imagen: '/img/lateral1.jpeg',
                modo: 'MEDIAPIPE'
            },
            {
                instruccion: 'Levanta el brazo IZQUIERDO por encima de la cabeza y flexiona suavemente el tronco hacia la derecha.',
                tiempo: 30,
                imagen: '/img/lateral2.jpeg',
                modo: 'MEDIAPIPE'
            }
        ]
    },
    {
        titulo: '8. Piernas: Estiramiento de Cuádriceps', imagen: '/img/cuadricep1.jpeg',
        fases: [
            {
                instruccion: 'De pie, con apoyo estable, dobla la rodilla DERECHA llevando el talón hacia el glúteo sin forzar.',
                tiempo: 30,
                imagen: '/img/cuadricep1.jpeg',
                modo: 'GUIADA'
            },
            {
                instruccion: 'De pie, con apoyo estable, dobla la rodilla IZQUIERDA llevando el talón hacia el glúteo sin forzar.',
                tiempo: 30,
                imagen: '/img/cuadricep2.jpeg',
                modo: 'GUIADA'
            }
        ]
    },
    {
        titulo: '9. Pantorrillas y Tobillos: Elevaciones y rotaciones', imagen: '/img/pantorrillas.jpeg',
        fases: [
            {
                instruccion: 'Con apoyo estable, elévate lentamente sobre las puntas de los pies y vuelve a bajar.',
                tiempo: 30,
                imagen: '/img/pantorrillas.jpeg',
                modo: 'GUIADA'
            },
            {
                instruccion: 'Levanta el pie DERECHO y realiza giros suaves del tobillo hacia la DERECHA.',
                tiempo: 15,
                imagen: '/img/tobillos1.jpeg',
                modo: 'GUIADA'
            },
            {
                instruccion: 'Con el pie DERECHO levantado, realiza giros suaves del tobillo hacia la IZQUIERDA.',
                tiempo: 15,
                imagen: '/img/tobillos1.jpeg',
                modo: 'GUIADA'
            },
            {
                instruccion: 'Levanta el pie IZQUIERDO y realiza giros suaves del tobillo hacia la DERECHA.',
                tiempo: 15,
                imagen: '/img/tobillos2.jpeg',
                modo: 'GUIADA'
            },
            {
                instruccion: 'Con el pie IZQUIERDO levantado, realiza giros suaves del tobillo hacia la IZQUIERDA.',
                tiempo: 15,
                imagen: '/img/tobillos2.jpeg',
                modo: 'GUIADA'
            }
        ]
    },
    {
        titulo: '10. Ojos y Mente: Relajación profunda', imagen: '/img/ojos.jpeg',
        fases: [
            {
                instruccion: 'Cubre suavemente los ojos con las palmas de las manos, sin ejercer presión.',
                tiempo: 20,
                imagen: '/img/ojos.jpeg',
                modo: 'GUIADA'
            },
            {
                instruccion: 'Masajea suavemente las sienes con movimientos circulares.',
                tiempo: 20,
                imagen: '/img/ojos.jpeg',
                modo: 'GUIADA'
            },
            {
                instruccion: 'Baja las manos, relaja los hombros y respira profundamente.',
                tiempo: 20,
                imagen: '/img/relax.jpeg',
                modo: 'GUIADA'
            }
        ]
    }
];

export const TOTAL_EJERCICIOS = RUTINA_PAUSA.length;
export const TOTAL_FASES = RUTINA_PAUSA.reduce((n, e) => n + e.fases.length, 0);
export const TOTAL_SEGUNDOS_PROGRAMADOS = RUTINA_PAUSA.reduce(
    (n, e) => n + e.fases.reduce((m, f) => m + f.tiempo, 0), 0
);
