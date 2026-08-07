import { Module } from '@nestjs/common';
import { EtiquetaTrazabilidadController } from './controller/etiqueta-trazabilidad.controller';
import { EtiquetaTrazabilidadService } from './service/etiqueta-trazabilidad.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EtiquetaTrazabilidad } from '../entities/etiqueta-trazabilidad.entity';

@Module({
  imports: [TypeOrmModule.forFeature([EtiquetaTrazabilidad])],
  controllers: [EtiquetaTrazabilidadController],
  providers: [EtiquetaTrazabilidadService],
  exports: [EtiquetaTrazabilidadService]
})
export class EtiquetaTrazabilidadModule { }
