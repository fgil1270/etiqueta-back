import { EtiquetaTrazabilidadService } from '../service/etiqueta-trazabilidad.service';
export declare class EtiquetaTrazabilidadController {
    private readonly etiquetaTrazabilidadService;
    constructor(etiquetaTrazabilidadService: EtiquetaTrazabilidadService);
    createEtiquetaTrazabilidad(valor: string, modelo: string): Promise<{
        mensaje: string;
        valor: string;
        printerConnected: boolean;
        printed: boolean;
    }>;
}
