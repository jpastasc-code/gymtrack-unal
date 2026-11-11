import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { CanchaModule } from './cancha/cancha.module';
import { EjerciciosModule } from './ejercicios/ejercicios.module';
import { EvaluacionesModule } from './evaluaciones/evaluaciones.module';
import { GimnasioModule } from './gimnasio/gimnasio.module';
import { NutricionModule } from './nutricion/nutricion.module';
import { PerfilModule } from './perfil/perfil.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProgresoModule } from './progreso/progreso.module';
import { RutinasModule } from './rutinas/rutinas.module';
import { SesionesModule } from './sesiones/sesiones.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    PerfilModule,
    EjerciciosModule,
    EvaluacionesModule,
    RutinasModule,
    SesionesModule,
    NutricionModule,
    CanchaModule,
    GimnasioModule,
    ProgresoModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
