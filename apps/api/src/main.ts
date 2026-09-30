import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp, DOCS_PATH } from './app.setup';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  configureApp(app);

  const port = Number(process.env.PORT ?? 3000);
  // 0.0.0.0 para que Render/Railway puedan enrutar tráfico al contenedor.
  await app.listen(port, '0.0.0.0');
  Logger.log(`API escuchando en el puerto ${port} (docs en /${DOCS_PATH})`);
}
void bootstrap();
