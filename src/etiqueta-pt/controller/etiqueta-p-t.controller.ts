import { BadRequestException, Body, Controller, Get, Post, Param } from '@nestjs/common';

import { EtiquetaPTService } from '../service/etiqueta-p-t.service';

@Controller('etiqueta/pt')
export class EtiquetaPTController {
  constructor(private readonly etiquetaPTService: EtiquetaPTService) { }

  @Post()
  async createEtiqueta(@Body('valor') valor: string, @Body('modelo') modelo: string, @Body('totalEtiqueta') totalEtiqueta: number): Promise<{
    mensaje: string;
    valor: string;
    printerConnected: boolean;
    printed: boolean;
  }> {

    if (!valor || typeof valor !== 'string') {
      throw new BadRequestException('El campo valor debe ser un string.');
    }

    if (modelo == null || modelo === '' || modelo === undefined || typeof modelo !== 'string') {
      throw new BadRequestException('El campo modelo debe ser un string.');
    }

    if (!totalEtiqueta || typeof totalEtiqueta !== 'number') {
      throw new BadRequestException('El campo totalEtiquetas debe ser un número.');
    }

    return await this.etiquetaPTService.createEtiqueta(valor, modelo, totalEtiqueta);
  }

  @Get('modelo')
  async getUltimoModelo(): Promise<{ modelo: string }> {
    const year = new Date().getFullYear().toString();
    try {
      const modelo = await this.etiquetaPTService.getUltimoModelo(year);
      return { modelo };
    } catch (errorDetails) {
      const message = errorDetails instanceof Error ? errorDetails.message : String(errorDetails);
      throw new BadRequestException(message);
    }
  }
}
