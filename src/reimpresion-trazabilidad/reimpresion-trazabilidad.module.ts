import { ReimpresionTrazabilidadService } from './service/reimpresion-trazabilidad.service';
import { ReimpresionTrazabilidadController } from './controller/reimpresion-trazabilidad.controller';
import { Module } from '@nestjs/common';

@Module({
  imports: [],
  controllers: [ReimpresionTrazabilidadController,],
  providers: [ReimpresionTrazabilidadService,],
  exports: []
})
export class ReimpresionTrazabilidadModule { }
