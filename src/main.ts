import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configDotenv } from 'dotenv';

async function bootstrap() {
    configDotenv();
    const app = await NestFactory.create(AppModule);
    const port = process.env.PORT ?? process.env.IISNODE_PORT ?? '3000';

    app.enableCors({
        origin: '*',
        /* methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        credentials: true, */
    });
    console.log(`Servidor iniciado en el puerto ${port}`);
    await app.listen(port);

}

void bootstrap();
