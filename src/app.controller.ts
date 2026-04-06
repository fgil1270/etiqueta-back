import { BadRequestException, Body, Controller, Get, Post } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
    constructor(private readonly appService: AppService) { }

    @Get()
    getHello(): string {
        return this.appService.getHello();
    }

    @Post('etiqueta')
    async createEtiqueta(@Body('valor') valor: string): Promise<{
        mensaje: string;
        valor: string;
        printerConnected: boolean;
        printed: boolean;
    }> {
        console.log('Valor recibido en el controlador:', valor);
        if (!valor || typeof valor !== 'string') {
            throw new BadRequestException('El campo valor debe ser un string.');
        }

        return await this.appService.createEtiqueta(valor);
    }
}
