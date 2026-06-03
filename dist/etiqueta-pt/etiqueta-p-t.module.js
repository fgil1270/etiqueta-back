"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EtiquetaPTModule = void 0;
const etiqueta_p_t_service_1 = require("./service/etiqueta-p-t.service");
const etiqueta_p_t_controller_1 = require("./controller/etiqueta-p-t.controller");
const common_1 = require("@nestjs/common");
let EtiquetaPTModule = class EtiquetaPTModule {
};
exports.EtiquetaPTModule = EtiquetaPTModule;
exports.EtiquetaPTModule = EtiquetaPTModule = __decorate([
    (0, common_1.Module)({
        imports: [],
        controllers: [etiqueta_p_t_controller_1.EtiquetaPTController,],
        providers: [etiqueta_p_t_service_1.EtiquetaPTService,],
        exports: []
    })
], EtiquetaPTModule);
//# sourceMappingURL=etiqueta-p-t.module.js.map