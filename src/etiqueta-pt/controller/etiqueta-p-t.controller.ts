import { BadRequestException, Body, Controller, Get, Post } from '@nestjs/common';

import { EtiquetaPTService } from '../service/etiqueta-p-t.service';

@Controller('etiqueta/pt')
export class EtiquetaPTController {
  constructor(private readonly etiquetaPTService: EtiquetaPTService) { }

  @Post()
  async createEtiqueta(@Body('valor') valor: string, @Body('modelo') modelo: string): Promise<{
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

    return await this.etiquetaPTService.createEtiqueta(valor, modelo);
  }
}
