
import {
  ChangePasswordErrors,
  ChangePasswordFormData
} from './types';

export function validateChangePassword(
    data: ChangePasswordFormData
): ChangePasswordErrors {

  const errors: ChangePasswordErrors = {};

  if (!data.currentPassword?.trim()) {
    errors.currentPassword =
        'La contraseña actual es obligatoria.';
  }

  if (!data.newPassword || data.newPassword.length < 8) {
    errors.newPassword =
        'La nueva contraseña debe tener al menos 8 caracteres.';
  } else if (data.currentPassword === data.newPassword) {
    errors.newPassword =
        'La nueva contraseña debe ser diferente de la actual.';
  }

  if (!data.confirmPassword) {
    errors.confirmPassword =
        'Debes confirmar la nueva contraseña.';
  } else if (data.newPassword !== data.confirmPassword) {
    errors.confirmPassword =
        'Las contraseñas no coinciden.';
  }

  return errors;
}

export type { ChangePasswordFormData };
