export declare class EtiquetaPTService {
    private readonly logger;
    private readonly logFilePath;
    createEtiqueta(valor: string, modelo: string): Promise<{
        mensaje: string;
        valor: string;
        printerConnected: boolean;
        printed: boolean;
    }>;
    private agregarNumeroAImagen;
    private generarEan13Svg;
    private isUsbZebraConnected;
    private printImage;
    private writeLog;
    private printImageZpl;
    private resolveImagePath;
}
