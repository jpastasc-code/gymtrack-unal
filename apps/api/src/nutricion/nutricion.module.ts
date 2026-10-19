import { Module } from '@nestjs/common';
import { NutricionController } from './nutricion.controller';
import { NutricionService } from './nutricion.service';

@Module({
  controllers: [NutricionController],
  providers: [NutricionService],
})
export class NutricionModule {}
