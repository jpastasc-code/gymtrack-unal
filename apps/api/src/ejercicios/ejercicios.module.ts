import { Module } from '@nestjs/common';
import { EjerciciosController } from './ejercicios.controller';
import { EjerciciosService } from './ejercicios.service';

@Module({
  controllers: [EjerciciosController],
  providers: [EjerciciosService],
  exports: [EjerciciosService],
})
export class EjerciciosModule {}
