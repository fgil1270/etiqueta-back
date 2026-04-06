"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const dotenv_1 = require("dotenv");
async function bootstrap() {
    (0, dotenv_1.configDotenv)();
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    const port = process.env.PORT ?? process.env.IISNODE_PORT ?? '3000';
    app.enableCors({
        origin: '*',
    });
    console.log(`Servidor iniciado en el puerto ${port}`);
    await app.listen(port);
}
void bootstrap();
//# sourceMappingURL=main.js.map