import { EtiquetaPTService } from './service/etiqueta-p-t.service';
import { EtiquetaPTController } from './controller/etiqueta-p-t.controller';
import { Module } from '@nestjs/common';

import { TypeOrmModule } from '@nestjs/typeorm';
import { EtiquetaProductoTerminado } from '../entities/etiqueta-producto-terminado.entity';

@Module({
  imports: [TypeOrmModule.forFeature([EtiquetaProductoTerminado])],
  controllers: [EtiquetaPTController,],
  providers: [EtiquetaPTService,],
  exports: []
})
export class EtiquetaPTModule { }
