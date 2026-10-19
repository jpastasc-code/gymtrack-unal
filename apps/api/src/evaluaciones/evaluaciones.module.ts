import { Module } from '@nestjs/common';
import { EvaluacionesController } from './evaluaciones.controller';
import { EvaluacionesService } from './evaluaciones.service';
import { MiFichaController } from './mi-ficha.controller';

@Module({
  controllers: [EvaluacionesController, MiFichaController],
  providers: [EvaluacionesService],
})
export class EvaluacionesModule {}
