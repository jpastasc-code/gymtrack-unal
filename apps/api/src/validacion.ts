import {
  BadRequestException,
  ValidationPipe,
  type ValidationError,
} from '@nestjs/common';

/**
 * Convierte los errores de class-validator en una respuesta con mensajes en español:
 * `{ statusCode: 400, message: "…", errores: { campo: "mensaje" } }`.
 * Los campos que no existen en el DTO se reportan como no editables.
 */
export function formatearErrores(
  errores: ValidationError[],
): BadRequestException {
  const porCampo: Record<string, string> = {};
  for (const error of errores) {
    const restricciones = error.constraints ?? {};
    porCampo[error.property] = restricciones.whitelistValidation
      ? `El campo "${error.property}" no se puede editar.`
      : (Object.values(restricciones)[0] ?? 'Valor no válido.');
  }
  return new BadRequestException({
    statusCode: 400,
    message: Object.values(porCampo).join(' '),
    errores: porCampo,
  });
}

/** Validación global de los cuerpos de las peticiones (DTOs). */
export function crearValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    exceptionFactory: formatearErrores,
  });
}
