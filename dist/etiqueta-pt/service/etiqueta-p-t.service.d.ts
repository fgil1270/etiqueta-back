export declare class EtiquetaPTService {
    private readonly logger;
    private readonly logFilePath;
    private PRINT_COPIES;
    createEtiqueta(valor: string, modelo: string, totalEtiquetas: number): Promise<{
        mensaje: string;
        valor: string;
        printerConnected: boolean;
        printed: boolean;
    }>;
    getUltimoModelo(year: string): Promise<string>;
    private agregarNumeroAImagen;
    private generarEan13Svg;
    private isUsbZebraConnected;
    private printImage;
    private writeLog;
    private printImageZpl;
    private resolveImagePath;
}
