import { BadRequestException, Body, Controller, Get, Post } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
    constructor(private readonly appService: AppService) { }

    @Post('etiqueta')
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

        return await this.appService.createEtiqueta(valor, modelo);
    }
}
