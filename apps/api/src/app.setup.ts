import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { crearValidationPipe } from './validacion';

export const API_PREFIX = 'api';
export const DOCS_PATH = `${API_PREFIX}/docs`;

/**
 * Lee la lista de orígenes permitidos para CORS desde CORS_ORIGINS
 * (separados por coma). Si no está definida, se permite cualquier origen,
 * lo cual solo es aceptable en desarrollo.
 */
export function parseCorsOrigins(value: string | undefined): string[] | true {
  const origins = (value ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
  return origins.length > 0 ? origins : true;
}

/**
 * Configuración común de la aplicación: prefijo global, CORS y Swagger.
 * Se usa tanto en main.ts como en las pruebas e2e para que se comporten igual.
 */
export function configureApp(app: INestApplication): void {
  app.setGlobalPrefix(API_PREFIX);
  app.useGlobalPipes(crearValidationPipe());
  app.enableCors({ origin: parseCorsOrigins(process.env.CORS_ORIGINS) });

  const config = new DocumentBuilder()
    .setTitle('GymTrack UNAL API')
    .setDescription('API del gimnasio de la Universidad Nacional')
    .setVersion(process.env.npm_package_version ?? '0.0.1')
    .addBearerAuth({
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      description: 'Token de acceso de Supabase Auth (session.access_token).',
    })
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup(DOCS_PATH, app, document);
}
