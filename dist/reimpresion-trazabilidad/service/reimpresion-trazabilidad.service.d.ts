interface ImprimirResult {
    dataMatrix: string;
    code: string;
}
export declare class ReimpresionTrazabilidadService {
    private readonly logger;
    imprimir(body: ImprimirResult): Promise<{
        mensaje: string;
        printerConnected: boolean;
        printed: boolean;
    }>;
    private buildDataMatrixZpl;
    private isUsbZebraConnected;
    private sendRawToPrinter;
}
export {};
