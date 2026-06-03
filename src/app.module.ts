import { ReimpresionTrazabilidadModule } from './reimpresion-trazabilidad/reimpresion-trazabilidad.module';
import { EtiquetaTrazabilidadModule } from './etiqueta-trazabilidad/etiqueta-trazabilidad.module';
import { EtiquetaPTModule } from './etiqueta-pt/etiqueta-p-t.module';
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [ReimpresionTrazabilidadModule, EtiquetaTrazabilidadModule, EtiquetaPTModule,],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
