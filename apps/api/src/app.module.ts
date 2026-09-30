import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { EjerciciosModule } from './ejercicios/ejercicios.module';
import { EvaluacionesModule } from './evaluaciones/evaluaciones.module';
import { PerfilModule } from './perfil/perfil.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    PerfilModule,
    EjerciciosModule,
    EvaluacionesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
