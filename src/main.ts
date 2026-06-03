import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configDotenv } from 'dotenv';
import { Logger } from '@nestjs/common';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
    const logger = new Logger('Bootstrap');

    configDotenv();
    try {
        const app = await NestFactory.create(AppModule);
        const port = process.env.PORT ?? process.env.IISNODE_PORT ?? '3000';

        app.useGlobalFilters(new AllExceptionsFilter());
        app.enableCors({
            origin: '*',
            /* methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
            credentials: true, */
        });
        logger.log(`Servidor iniciado en el puerto ${port}`);
        await app.listen(port);
    } catch (error) {
        logger.error('Error iniciando la aplicación', error instanceof Error ? error.stack : String(error));
        throw error;
    }

}

void bootstrap();
