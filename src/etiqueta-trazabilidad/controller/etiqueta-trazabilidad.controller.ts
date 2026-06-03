import { BadRequestException, Body, Controller, Get, Post } from '@nestjs/common';

import { EtiquetaTrazabilidadService } from '../service/etiqueta-trazabilidad.service';

@Controller('etiqueta/trazabilidad')
export class EtiquetaTrazabilidadController {
  constructor(private readonly etiquetaTrazabilidadService: EtiquetaTrazabilidadService) { }

  @Post()
  async createEtiquetaTrazabilidad(@Body('valor') valor: string, @Body('modelo') modelo: string): Promise<{
    mensaje: string;
    valor: string;
    printerConnected: boolean;
    printed: boolean;
  }> {
    if (!valor || typeof valor !== 'string') {
      throw new BadRequestException('El campo valor debe ser un string.');
    }

    if (!modelo || typeof modelo !== 'string') {
      throw new BadRequestException('El campo modelo debe ser un string.');
    }

    return await this.etiquetaTrazabilidadService.createEtiquetaTrazabilidad(valor, modelo);
  }


}
