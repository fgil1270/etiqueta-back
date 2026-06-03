"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReimpresionTrazabilidadModule = void 0;
const reimpresion_trazabilidad_service_1 = require("./service/reimpresion-trazabilidad.service");
const reimpresion_trazabilidad_controller_1 = require("./controller/reimpresion-trazabilidad.controller");
const common_1 = require("@nestjs/common");
let ReimpresionTrazabilidadModule = class ReimpresionTrazabilidadModule {
};
exports.ReimpresionTrazabilidadModule = ReimpresionTrazabilidadModule;
exports.ReimpresionTrazabilidadModule = ReimpresionTrazabilidadModule = __decorate([
    (0, common_1.Module)({
        imports: [],
        controllers: [reimpresion_trazabilidad_controller_1.ReimpresionTrazabilidadController,],
        providers: [reimpresion_trazabilidad_service_1.ReimpresionTrazabilidadService,],
        exports: []
    })
], ReimpresionTrazabilidadModule);
//# sourceMappingURL=reimpresion-trazabilidad.module.js.map