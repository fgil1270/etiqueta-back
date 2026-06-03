import { ReimpresionTrazabilidadService } from '../service/reimpresion-trazabilidad.service';
interface ReimpresionRequest {
    dataMatrix: string;
    code: string;
}
export declare class ReimpresionTrazabilidadController {
    private readonly reimpresionTrazabilidadService;
    constructor(reimpresionTrazabilidadService: ReimpresionTrazabilidadService);
    create(body: ReimpresionRequest): Promise<{
        mensaje: string;
        printerConnected: boolean;
        printed: boolean;
    }>;
}
export {};
