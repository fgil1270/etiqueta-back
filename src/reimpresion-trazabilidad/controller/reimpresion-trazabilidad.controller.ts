import {
  BadRequestException,
  Body,
  Controller,
  Post,
} from '@nestjs/common';

import { ReimpresionTrazabilidadService } from '../service/reimpresion-trazabilidad.service';

interface ReimpresionRequest {
  dataMatrix: string;
  code: string;
}

@Controller('reimpresion/trazabilidad')
export class ReimpresionTrazabilidadController {
  constructor(private readonly reimpresionTrazabilidadService: ReimpresionTrazabilidadService) { }

  @Post()
  async create(@Body() body: ReimpresionRequest
  ): Promise<{
    mensaje: string;
    printerConnected: boolean;
    printed: boolean;
  }> {

    return this.reimpresionTrazabilidadService.imprimir(body);
  }
}
