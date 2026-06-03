export declare class EtiquetaTrazabilidadService {
    private readonly logger;
    private readonly logFilePath;
    createEtiquetaTrazabilidad(valor: string, modelo: string): Promise<{
        mensaje: string;
        valor: string;
        printerConnected: boolean;
        printed: boolean;
    }>;
    private writeLog;
    private isUsbZebraConnected;
    printNumberDirectly(numero: string): Promise<{
        mensaje: string;
        numero: string;
        printerConnected: boolean;
        printed: boolean;
    }>;
    printValueAsPng(valor: string): Promise<{
        mensaje: string;
        valor: string;
        printerConnected: boolean;
        printed: boolean;
        imagePath: string;
    }>;
    private printPngFile;
    private escapeXml;
}
