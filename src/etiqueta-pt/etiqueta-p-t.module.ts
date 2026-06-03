import { EtiquetaPTService } from './service/etiqueta-p-t.service';
import { EtiquetaPTController } from './controller/etiqueta-p-t.controller';
import { Module } from '@nestjs/common';

@Module({
  imports: [],
  controllers: [EtiquetaPTController,],
  providers: [EtiquetaPTService,],
  exports: []
})
export class EtiquetaPTModule { }
