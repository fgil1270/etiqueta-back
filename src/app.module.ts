import { ReimpresionTrazabilidadModule } from './reimpresion-trazabilidad/reimpresion-trazabilidad.module';
import { EtiquetaTrazabilidadModule } from './etiqueta-trazabilidad/etiqueta-trazabilidad.module';
import { EtiquetaPTModule } from './etiqueta-pt/etiqueta-p-t.module';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    ReimpresionTrazabilidadModule,
    EtiquetaTrazabilidadModule,
    EtiquetaPTModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
