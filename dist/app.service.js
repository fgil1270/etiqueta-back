"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var AppService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppService = void 0;
const common_1 = require("@nestjs/common");
const fs_1 = require("fs");
const path_1 = require("path");
const child_process_1 = require("child_process");
const util_1 = require("util");
const sharp = require("sharp");
const execFileAsync = (0, util_1.promisify)(child_process_1.execFile);
const ZEBRA_PRINTER_NAME = process.env.ZEBRA_PRINTER_NAME ?? 'Zebra';
const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.bmp'];
const LABEL_DPI = 300;
const LABEL_WIDTH_IN = Number(process.env.LABEL_WIDTH_IN ?? 3.1);
const LABEL_HEIGHT_IN = Number(process.env.LABEL_HEIGHT_IN ?? 1.4715);
const LABEL_WIDTH_PX = Math.round(LABEL_WIDTH_IN * LABEL_DPI);
const LABEL_HEIGHT_PX = Math.round(LABEL_HEIGHT_IN * LABEL_DPI);
const LABEL_WIDTH_HI = Math.round(LABEL_WIDTH_IN * 100);
const LABEL_HEIGHT_HI = Math.round(LABEL_HEIGHT_IN * 100);
const PRINT_OFFSET_X_MM = Number(process.env.PRINT_OFFSET_X_MM ?? 8);
const PRINT_OFFSET_Y_MM = Number(process.env.PRINT_OFFSET_Y_MM ?? 4);
const PRINT_OFFSET_X_HI = Math.round((PRINT_OFFSET_X_MM / 25.4) * 100);
const PRINT_OFFSET_Y_HI = Math.round((PRINT_OFFSET_Y_MM / 25.4) * 100);
const ZPL_DARKNESS = Math.min(30, Math.max(0, Number(process.env.ZPL_DARKNESS ?? 15)));
const ZPL_PRINT_SPEED = Math.min(14, Math.max(1, Number(process.env.ZPL_PRINT_SPEED ?? 3)));
let AppService = AppService_1 = class AppService {
    constructor() {
        this.logger = new common_1.Logger(AppService_1.name);
        this.logFilePath = (0, path_1.resolve)(process.cwd(), 'logs', 'etiqueta.log');
    }
    getHello() {
        return 'Hello World!';
    }
    async createEtiqueta(valor) {
        this.writeLog(`Solicitud de etiqueta recibida. valor=${valor}`);
        const imgFilename = `LV432820.png`;
        const imgsDirectory = (0, path_1.resolve)(process.cwd(), 'C://imgs');
        const imagePath = this.resolveImagePath(`${imgsDirectory}/${imgFilename}`);
        if (!imagePath) {
            this.logger.error(`No existe una imagen asociada : ${imgFilename}`);
            this.writeLog(`ERROR: imagen no encontrada. archivo=${imgFilename}`);
            return {
                mensaje: 'No se pudo imprimir: no existe una imagen asociada a la etiqueta.',
                valor,
                printerConnected: false,
                printed: false,
            };
        }
        const printerConnected = await this.isUsbZebraConnected();
        if (!printerConnected) {
            this.logger.warn(`Impresora no conectada por USB: ${ZEBRA_PRINTER_NAME}`);
            this.writeLog(`ERROR: impresora no disponible. nombre=${ZEBRA_PRINTER_NAME}`);
            return {
                mensaje: 'Impresora Zebra no conectada por USB.',
                valor,
                printerConnected: false,
                printed: false,
            };
        }
        const agregaImagenBuffer = await this.agregarNumeroAImagen(imagePath, 605, 100, valor);
        const tempDirectory = (0, path_1.resolve)(process.cwd(), 'C://imgs/temp-schneider');
        if (!(0, fs_1.existsSync)(tempDirectory)) {
            (0, fs_1.mkdirSync)(tempDirectory, { recursive: true });
        }
        const tempImagePath = (0, path_1.resolve)(tempDirectory, `etiqueta_${Date.now()}.png`);
        await sharp(agregaImagenBuffer)
            .withMetadata({ density: LABEL_DPI })
            .png({ compressionLevel: 0 })
            .toFile(tempImagePath);
        await this.printImage(tempImagePath);
        return {
            mensaje: 'Etiqueta enviada a impresion correctamente',
            valor,
            printerConnected: true,
            printed: true,
        };
    }
    async agregarNumeroAImagen(imagePath, x, y, valor) {
        const texto = valor;
        const svgTexto = `
            <svg width="500" height="100">
                <style>
                .numero { fill: black; font-size: 30px; font-weight: bold; font-family: sans-serif; }
                </style>
                <text x="0" y="45" class="numero">${texto}</text>
            </svg>
        `;
        return await sharp(imagePath)
            .composite([
            {
                input: Buffer.from(svgTexto),
                top: y,
                left: x,
            },
        ])
            .toBuffer();
    }
    async isUsbZebraConnected() {
        const escapedPrinterName = ZEBRA_PRINTER_NAME.replace(/'/g, "''");
        const script = [
            `$printer = Get-Printer | Where-Object { $_.Name -like '*${escapedPrinterName}*' } | Select-Object -First 1`,
            `if ($null -eq $printer) { Write-Output 'NOT_FOUND' } else { $isUsb = $printer.PortName -like 'USB*'; $wmi = Get-CimInstance -ClassName Win32_Printer | Where-Object { $_.Name -eq $printer.Name } | Select-Object -First 1; $isOffline = $false; if ($null -ne $wmi -and $null -ne $wmi.WorkOffline) { $isOffline = [bool]$wmi.WorkOffline } elseif (($printer.PrinterStatus -as [string]) -match 'Offline') { $isOffline = $true }; if (-not $isUsb) { Write-Output 'NOT_USB' } elseif ($isOffline) { Write-Output 'OFFLINE' } else { Write-Output 'READY' }; Write-Output "NAME=$($printer.Name)"; Write-Output "PORT=$($printer.PortName)"; Write-Output "STATUS=$($printer.PrinterStatus)"; Write-Output "WMI_WORKOFFLINE=$(if ($null -ne $wmi) { $wmi.WorkOffline } else { 'N/A' })" }`,
        ].join('; ');
        try {
            const { stdout } = await execFileAsync('powershell.exe', [
                '-NoProfile',
                '-NonInteractive',
                '-Command',
                script,
            ]);
            const lines = stdout
                .split(/\r?\n/)
                .map((line) => line.trim())
                .filter(Boolean);
            const status = lines[0] ?? 'NOT_FOUND';
            if (status === 'READY') {
                return true;
            }
            if (status === 'OFFLINE') {
                this.writeLog(`Impresora '${ZEBRA_PRINTER_NAME}' encontrada pero está offline.`);
            }
            else if (status === 'NOT_USB') {
                this.writeLog(`Impresora '${ZEBRA_PRINTER_NAME}' encontrada pero no conectada por USB.`);
            }
            else {
                this.writeLog(`Impresora '${ZEBRA_PRINTER_NAME}' no encontrada.`);
            }
            return false;
        }
        catch (error) {
            this.writeLog(`ERROR validando impresora: ${String(error)}`);
            return false;
        }
    }
    async printImage(imagePath) {
        try {
            const escapedPrinterName = ZEBRA_PRINTER_NAME.replace(/'/g, "''");
            const escapedImagePath = imagePath.replace(/'/g, "''");
            const darknessStr = String(ZPL_DARKNESS).padStart(2, '0');
            const zplConfig = `~SD${darknessStr}^XA^PR${ZPL_PRINT_SPEED}^XZ`;
            const configScript = [
                `Add-Type -TypeDefinition 'using System;using System.Runtime.InteropServices;public class RawCfg{[StructLayout(LayoutKind.Sequential,CharSet=CharSet.Unicode)]public struct DOCINFOW{public string pDocName;public string pOutputFile;public string pDataType;}[DllImport("winspool.drv",CharSet=CharSet.Unicode)]public static extern bool OpenPrinter(string n,out IntPtr h,IntPtr d);[DllImport("winspool.drv")]public static extern bool ClosePrinter(IntPtr h);[DllImport("winspool.drv",CharSet=CharSet.Unicode)]public static extern int StartDocPrinter(IntPtr h,int l,ref DOCINFOW d);[DllImport("winspool.drv")]public static extern bool EndDocPrinter(IntPtr h);[DllImport("winspool.drv")]public static extern bool StartPagePrinter(IntPtr h);[DllImport("winspool.drv")]public static extern bool EndPagePrinter(IntPtr h);[DllImport("winspool.drv")]public static extern bool WritePrinter(IntPtr h,IntPtr buf,int count,out int written);}' -Language CSharp`,
                `$h=[IntPtr]::Zero`,
                `[RawCfg]::OpenPrinter('${escapedPrinterName}',[ref]$h,[IntPtr]::Zero) | Out-Null`,
                `$bytes=[System.Text.Encoding]::ASCII.GetBytes('${zplConfig}')`,
                `$ptr=[System.Runtime.InteropServices.Marshal]::AllocHGlobal($bytes.Length)`,
                `[System.Runtime.InteropServices.Marshal]::Copy($bytes,0,$ptr,$bytes.Length)`,
                `$di=New-Object RawCfg+DOCINFOW;$di.pDocName='ZPL-CFG';$di.pDataType='RAW'`,
                `[RawCfg]::StartDocPrinter($h,1,[ref]$di) | Out-Null`,
                `[RawCfg]::StartPagePrinter($h) | Out-Null`,
                `$w=0;[RawCfg]::WritePrinter($h,$ptr,$bytes.Length,[ref]$w) | Out-Null`,
                `[RawCfg]::EndPagePrinter($h) | Out-Null`,
                `[RawCfg]::EndDocPrinter($h) | Out-Null`,
                `[RawCfg]::ClosePrinter($h) | Out-Null`,
                `[System.Runtime.InteropServices.Marshal]::FreeHGlobal($ptr)`,
            ].join('; ');
            await execFileAsync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', configScript]);
            const printScript = [
                `Add-Type -AssemblyName System.Drawing`,
                `$printerName = '${escapedPrinterName}'`,
                `$imagePath = '${escapedImagePath}'`,
                `$img = [System.Drawing.Image]::FromFile($imagePath)`,
                `$doc = New-Object System.Drawing.Printing.PrintDocument`,
                `$doc.PrinterSettings.PrinterName = $printerName`,
                `$paper = New-Object System.Drawing.Printing.PaperSize('EtiquetaCustom', ${LABEL_WIDTH_HI}, ${LABEL_HEIGHT_HI})`,
                `$doc.DefaultPageSettings.PaperSize = $paper`,
                `$doc.DefaultPageSettings.Margins = New-Object System.Drawing.Printing.Margins(0, 0, 0, 0)`,
                `$doc.OriginAtMargins = $false`,
                `$drawWidth = ${LABEL_WIDTH_HI}`,
                `$drawHeight = ${LABEL_HEIGHT_HI}`,
                `$offsetX = ${PRINT_OFFSET_X_HI}`,
                `$offsetY = ${PRINT_OFFSET_Y_HI}`,
                `$doc.add_PrintPage({ param($sender, $e) $e.Graphics.TranslateTransform(-$e.PageSettings.HardMarginX, -$e.PageSettings.HardMarginY); $e.Graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic; $e.Graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality; $e.Graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality; $e.Graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality; $safeWidth = [Math]::Max(1, $drawWidth - $offsetX); $safeHeight = [Math]::Max(1, $drawHeight - $offsetY); $imgRatio = $img.Width / [double]$img.Height; $areaRatio = $safeWidth / [double]$safeHeight; if ($imgRatio -gt $areaRatio) { $targetWidth = $safeWidth; $targetHeight = [int][Math]::Round($safeWidth / $imgRatio) } else { $targetHeight = $safeHeight; $targetWidth = [int][Math]::Round($safeHeight * $imgRatio) }; $targetWidth = [Math]::Max(1, $targetWidth); $targetHeight = [Math]::Max(1, $targetHeight); $x = $offsetX + [int][Math]::Floor(($safeWidth - $targetWidth) / 2); $y = $offsetY + [int][Math]::Floor(($safeHeight - $targetHeight) / 2); $rect = New-Object System.Drawing.Rectangle($x, $y, $targetWidth, $targetHeight); $e.Graphics.DrawImage($img, $rect); $e.HasMorePages = $false })`,
                `$doc.Print()`,
                `$img.Dispose()`,
                `$doc.Dispose()`,
            ].join('; ');
            await execFileAsync('powershell.exe', [
                '-NoProfile',
                '-NonInteractive',
                '-Command',
                printScript,
            ]);
        }
        catch (error) {
            this.writeLog(`ERROR enviando imagen a impresion: ${String(error)}`);
            throw error;
        }
    }
    writeLog(message) {
        const logDir = (0, path_1.resolve)(process.cwd(), 'logs');
        if (!(0, fs_1.existsSync)(logDir)) {
            (0, fs_1.mkdirSync)(logDir, { recursive: true });
        }
        const timestamp = new Date().toISOString();
        (0, fs_1.appendFileSync)(this.logFilePath, `[${timestamp}] ${message}\n`, { encoding: 'utf8' });
    }
    async printImageZpl(imagePath) {
        const widthDots = LABEL_WIDTH_PX;
        const heightDots = LABEL_HEIGHT_PX;
        const bytesPerRow = Math.ceil(widthDots / 8);
        const totalBytes = bytesPerRow * heightDots;
        const { data, info } = await sharp(imagePath)
            .flatten({ background: { r: 255, g: 255, b: 255 } })
            .resize(widthDots, heightDots, { fit: 'fill', kernel: 'lanczos3' })
            .grayscale()
            .raw()
            .toBuffer({ resolveWithObject: true });
        const ch = info.channels;
        let gfData = '';
        for (let y = 0; y < heightDots; y++) {
            for (let b = 0; b < bytesPerRow; b++) {
                let byte = 0;
                for (let bit = 0; bit < 8; bit++) {
                    const x = b * 8 + bit;
                    if (x < widthDots && data[(y * widthDots + x) * ch] < 128) {
                        byte |= (0x80 >> bit);
                    }
                }
                gfData += byte.toString(16).padStart(2, '0').toUpperCase();
            }
        }
        const zpl = `^XA^PW${widthDots}^LL${heightDots}^FO0,0^GFA,${totalBytes},${totalBytes},${bytesPerRow},${gfData}^FS^XZ`;
        const zplPath = imagePath.replace(/\.png$/i, '.zpl');
        (0, fs_1.writeFileSync)(zplPath, zpl, 'ascii');
        const escapedPrinterName = ZEBRA_PRINTER_NAME.replace(/'/g, "''");
        const escapedZplPath = zplPath.replace(/'/g, "''");
        const rawPrintScript = [
            `Add-Type -TypeDefinition 'using System;using System.Runtime.InteropServices;public class RawPrinter{[StructLayout(LayoutKind.Sequential,CharSet=CharSet.Unicode)]public struct DOCINFOW{public string pDocName;public string pOutputFile;public string pDataType;}[DllImport("winspool.drv",CharSet=CharSet.Unicode)]public static extern bool OpenPrinter(string n,out IntPtr h,IntPtr d);[DllImport("winspool.drv")]public static extern bool ClosePrinter(IntPtr h);[DllImport("winspool.drv",CharSet=CharSet.Unicode)]public static extern int StartDocPrinter(IntPtr h,int l,ref DOCINFOW d);[DllImport("winspool.drv")]public static extern bool EndDocPrinter(IntPtr h);[DllImport("winspool.drv")]public static extern bool StartPagePrinter(IntPtr h);[DllImport("winspool.drv")]public static extern bool EndPagePrinter(IntPtr h);[DllImport("winspool.drv")]public static extern bool WritePrinter(IntPtr h,IntPtr buf,int count,out int written);}' -Language CSharp`,
            `$h=[IntPtr]::Zero`,
            `[RawPrinter]::OpenPrinter('${escapedPrinterName}',[ref]$h,[IntPtr]::Zero) | Out-Null`,
            `$bytes=[System.IO.File]::ReadAllBytes('${escapedZplPath}')`,
            `$ptr=[System.Runtime.InteropServices.Marshal]::AllocHGlobal($bytes.Length)`,
            `[System.Runtime.InteropServices.Marshal]::Copy($bytes,0,$ptr,$bytes.Length)`,
            `$di=New-Object RawPrinter+DOCINFOW;$di.pDocName='ZPL';$di.pDataType='RAW'`,
            `[RawPrinter]::StartDocPrinter($h,1,[ref]$di) | Out-Null`,
            `[RawPrinter]::StartPagePrinter($h) | Out-Null`,
            `$w=0;[RawPrinter]::WritePrinter($h,$ptr,$bytes.Length,[ref]$w) | Out-Null`,
            `[RawPrinter]::EndPagePrinter($h) | Out-Null`,
            `[RawPrinter]::EndDocPrinter($h) | Out-Null`,
            `[RawPrinter]::ClosePrinter($h) | Out-Null`,
            `[System.Runtime.InteropServices.Marshal]::FreeHGlobal($ptr)`,
        ].join('; ');
        try {
            await execFileAsync('powershell.exe', [
                '-NoProfile',
                '-NonInteractive',
                '-Command',
                rawPrintScript,
            ]);
        }
        catch (error) {
            this.writeLog(`ERROR enviando ZPL a impresion: ${String(error)}`);
            throw error;
        }
    }
    resolveImagePath(ruta) {
        const imgDirectory = (0, path_1.resolve)(process.cwd(), ruta);
        const hasExtension = (0, path_1.extname)(ruta).length > 0;
        if ((0, fs_1.existsSync)(imgDirectory)) {
            return imgDirectory;
        }
        return null;
    }
};
exports.AppService = AppService;
exports.AppService = AppService = AppService_1 = __decorate([
    (0, common_1.Injectable)()
], AppService);
//# sourceMappingURL=app.service.js.map