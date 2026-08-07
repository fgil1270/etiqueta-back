import { EtiquetaPTService } from '../service/etiqueta-p-t.service';
export declare class EtiquetaPTController {
    private readonly etiquetaPTService;
    constructor(etiquetaPTService: EtiquetaPTService);
    createEtiqueta(valor: string, modelo: string, totalEtiqueta: number): Promise<{
        mensaje: string;
        valor: string;
        printerConnected: boolean;
        printed: boolean;
    }>;
    getUltimoModelo(): Promise<{
        modelo: string;
    }>;
}
