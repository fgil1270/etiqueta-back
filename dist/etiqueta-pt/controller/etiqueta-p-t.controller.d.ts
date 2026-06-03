import { EtiquetaPTService } from '../service/etiqueta-p-t.service';
export declare class EtiquetaPTController {
    private readonly etiquetaPTService;
    constructor(etiquetaPTService: EtiquetaPTService);
    createEtiqueta(valor: string, modelo: string): Promise<{
        mensaje: string;
        valor: string;
        printerConnected: boolean;
        printed: boolean;
    }>;
}
