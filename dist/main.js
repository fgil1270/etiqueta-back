"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const dotenv_1 = require("dotenv");
const common_1 = require("@nestjs/common");
const all_exceptions_filter_1 = require("./common/filters/all-exceptions.filter");
async function bootstrap() {
    const logger = new common_1.Logger('Bootstrap');
    (0, dotenv_1.configDotenv)();
    try {
        const app = await core_1.NestFactory.create(app_module_1.AppModule);
        const port = process.env.PORT ?? process.env.IISNODE_PORT ?? '3000';
        app.useGlobalFilters(new all_exceptions_filter_1.AllExceptionsFilter());
        app.enableCors({
            origin: '*',
        });
        logger.log(`Servidor iniciado en el puerto ${port}`);
        await app.listen(port);
    }
    catch (error) {
        logger.error('Error iniciando la aplicación', error instanceof Error ? error.stack : String(error));
        throw error;
    }
}
void bootstrap();
//# sourceMappingURL=main.js.map