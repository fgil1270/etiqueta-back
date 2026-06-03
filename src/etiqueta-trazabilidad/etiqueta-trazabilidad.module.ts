import { Module } from '@nestjs/common';
import { EtiquetaTrazabilidadController } from './controller/etiqueta-trazabilidad.controller';
import { EtiquetaTrazabilidadService } from './service/etiqueta-trazabilidad.service';

@Module({
  imports: [],
  controllers: [EtiquetaTrazabilidadController],
  providers: [EtiquetaTrazabilidadService],
  exports: [EtiquetaTrazabilidadService]
})
export class EtiquetaTrazabilidadModule { }
