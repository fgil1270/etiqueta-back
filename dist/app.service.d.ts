export declare class AppService {
    private readonly logger;
    private readonly logFilePath;
    getHello(): string;
    createEtiqueta(valor: string): Promise<{
        mensaje: string;
        valor: string;
        printerConnected: boolean;
        printed: boolean;
    }>;
    private agregarNumeroAImagen;
    private isUsbZebraConnected;
    private printImage;
    private writeLog;
    private printImageZpl;
    private resolveImagePath;
}
