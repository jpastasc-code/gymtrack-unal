import {
  BadRequestException,
  ValidationPipe,
  type ValidationError,
} from '@nestjs/common';

/**
 * Aplana los errores de class-validator (incluidos los de objetos anidados, como
 * cada medida de una evaluación) en `{ "campo": "mensaje" }`, con rutas como
 * `medidas.2.valor` para los anidados.
 */
export function aplanarErrores(
  errores: ValidationError[],
  prefijo = '',
  destino: Record<string, string> = {},
): Record<string, string> {
  for (const error of errores) {
    const ruta = prefijo ? `${prefijo}.${error.property}` : error.property;
    const restricciones = error.constraints ?? {};
    if (restricciones.whitelistValidation) {
      destino[ruta] = `El campo "${error.property}" no se puede editar.`;
    } else if (Object.keys(restricciones).length > 0) {
      destino[ruta] = Object.values(restricciones)[0];
    }
    if (error.children?.length) aplanarErrores(error.children, ruta, destino);
  }
  return destino;
}

/**
 * Convierte los errores de validación en una respuesta con mensajes en español:
 * `{ statusCode: 400, message: "…", errores: { campo: "mensaje" } }`.
 */
export function formatearErrores(
  errores: ValidationError[],
): BadRequestException {
  const porCampo = aplanarErrores(errores);
  if (Object.keys(porCampo).length === 0)
    porCampo.general = 'Datos no válidos.';
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
