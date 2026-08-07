"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var EtiquetaTrazabilidadService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EtiquetaTrazabilidadService = void 0;
const common_1 = require("@nestjs/common");
const fs_1 = require("fs");
const path_1 = require("path");
const child_process_1 = require("child_process");
const util_1 = require("util");
const sharp = require("sharp");
const execFileAsync = (0, util_1.promisify)(child_process_1.execFile);
const ZEBRA_PRINTER_NAME = process.env.ZEBRA_PRINTER_NAME ?? 'Trazabilidad';
const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.bmp'];
const LABEL_DPI = 300;
const LABEL_WIDTH_IN = Number(process.env.LABEL_WIDTH_IN ?? 1.70);
const LABEL_HEIGHT_IN = Number(process.env.LABEL_HEIGHT_IN ?? 1.10);
const LABEL_WIDTH_PX = Math.round(LABEL_WIDTH_IN * LABEL_DPI);
const LABEL_HEIGHT_PX = Math.round(LABEL_HEIGHT_IN * LABEL_DPI);
const LABEL_WIDTH_HI = Math.round(LABEL_WIDTH_IN * 100);
const LABEL_HEIGHT_HI = Math.round(LABEL_HEIGHT_IN * 100);
const PRINT_OFFSET_X_MM = Number(process.env.PRINT_OFFSET_X_MM ?? 10);
const PRINT_OFFSET_Y_MM = Number(process.env.PRINT_OFFSET_Y_MM ?? 7);
const PRINT_OFFSET_X_HI = Math.round((PRINT_OFFSET_X_MM / 25.4) * 100);
const PRINT_OFFSET_Y_HI = Math.round((PRINT_OFFSET_Y_MM / 25.4) * 100);
const PRINT_OFFSET_X_PX = Math.round((PRINT_OFFSET_X_MM / 25.4) * LABEL_DPI);
const PRINT_OFFSET_Y_PX = Math.round((PRINT_OFFSET_Y_MM / 25.4) * LABEL_DPI);
const PRINT_COPIES = Math.max(1, Number(process.env.PRINT_COPIES ?? 1));
const ZPL_DARKNESS = Math.min(30, Math.max(0, Number(process.env.ZPL_DARKNESS ?? 15)));
const ZPL_PRINT_SPEED = Math.min(14, Math.max(1, Number(process.env.ZPL_PRINT_SPEED ?? 3)));
let EtiquetaTrazabilidadService = EtiquetaTrazabilidadService_1 = class EtiquetaTrazabilidadService {
    constructor() {
        this.logger = new common_1.Logger(EtiquetaTrazabilidadService_1.name);
        this.logFilePath = (0, path_1.resolve)(process.cwd(), 'logs', 'etiqueta.log');
    }
    async createEtiquetaTrazabilidad(valor, modelo) {
        this.writeLog(`Solicitud de etiqueta recibida. valor=${valor}, modelo=${modelo}`);
        const imgFilename = modelo + '.png';
        const imgsDirectory = (0, path_1.resolve)(process.cwd(), 'C://imgs');
        const printerConnected = await this.isUsbZebraConnected();
        if (!printerConnected) {
            this.writeLog(`ERROR: impresora no disponible. nombre=${ZEBRA_PRINTER_NAME}`);
            return {
                mensaje: 'Impresora Zebra no conectada por USB.',
                valor,
                printerConnected: false,
                printed: false,
            };
        }
        const tempDirectory = (0, path_1.resolve)(process.cwd(), 'C://imgs/temp-schneider');
        if (!(0, fs_1.existsSync)(tempDirectory)) {
            (0, fs_1.mkdirSync)(tempDirectory, { recursive: true });
        }
        await this.printNumberDirectly(valor);
        return {
            mensaje: 'Etiqueta enviada a impresion correctamente',
            valor,
            printerConnected: true,
            printed: true,
        };
    }
    writeLog(message) {
        const logDir = (0, path_1.resolve)(process.cwd(), 'logs');
        if (!(0, fs_1.existsSync)(logDir)) {
            (0, fs_1.mkdirSync)(logDir, { recursive: true });
        }
        const timestamp = new Date().toISOString();
        (0, fs_1.appendFileSync)(this.logFilePath, `[${timestamp}] ${message}\n`, { encoding: 'utf8' });
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
            this.writeLog(`Impresora '${ZEBRA_PRINTER_NAME}' status: ${status}. Detalles: ${lines.slice(1).join(', ')}`);
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
    async printNumberDirectly(numero) {
        this.writeLog(`Enviando número directamente a impresora. numero=${numero}`);
        const printerConnected = await this.isUsbZebraConnected();
        if (!printerConnected) {
            this.writeLog(`ERROR: impresora no disponible. nombre=${ZEBRA_PRINTER_NAME}`);
            return {
                mensaje: 'Impresora Zebra no conectada por USB.',
                numero,
                printerConnected: false,
                printed: false,
            };
        }
        try {
            const zpl = `^XA^PW${LABEL_WIDTH_PX}^LL${LABEL_HEIGHT_PX}^MD${ZPL_DARKNESS}^PR${ZPL_PRINT_SPEED}^FO${PRINT_OFFSET_X_PX},${PRINT_OFFSET_Y_PX}^ADHN,36,20^FD${numero}^FS^PQ${PRINT_COPIES}^XZ`;
            const escapedPrinterName = ZEBRA_PRINTER_NAME.replace(/'/g, "''");
            const rawPrintScript = [
                `Add-Type -TypeDefinition 'using System;using System.Runtime.InteropServices;public class RawPrinter{[StructLayout(LayoutKind.Sequential,CharSet=CharSet.Unicode)]public struct DOCINFOW{public string pDocName;public string pOutputFile;public string pDataType;}[DllImport("winspool.drv",CharSet=CharSet.Unicode)]public static extern bool OpenPrinter(string n,out IntPtr h,IntPtr d);[DllImport("winspool.drv")]public static extern bool ClosePrinter(IntPtr h);[DllImport("winspool.drv",CharSet=CharSet.Unicode)]public static extern int StartDocPrinter(IntPtr h,int l,ref DOCINFOW d);[DllImport("winspool.drv")]public static extern bool EndDocPrinter(IntPtr h);[DllImport("winspool.drv")]public static extern bool StartPagePrinter(IntPtr h);[DllImport("winspool.drv")]public static extern bool EndPagePrinter(IntPtr h);[DllImport("winspool.drv")]public static extern bool WritePrinter(IntPtr h,IntPtr buf,int count,out int written);}' -Language CSharp`,
                `$h=[IntPtr]::Zero`,
                `[RawPrinter]::OpenPrinter('${escapedPrinterName}',[ref]$h,[IntPtr]::Zero) | Out-Null`,
                `$bytes=[System.Text.Encoding]::ASCII.GetBytes('${zpl.replace(/'/g, "''")}')`,
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
            await execFileAsync('powershell.exe', [
                '-NoProfile',
                '-NonInteractive',
                '-Command',
                rawPrintScript,
            ]);
            this.writeLog(`Número enviado a impresión correctamente. numero=${numero}`);
            return {
                mensaje: 'Número enviado a impresión correctamente',
                numero,
                printerConnected: true,
                printed: true,
            };
        }
        catch (error) {
            this.writeLog(`ERROR enviando número a impresion: ${String(error)}`);
            throw error;
        }
    }
    async printValueAsPng(valor) {
        this.writeLog(`Generando imagen PNG para impresión. valor=${valor}`);
        const tempDirectory = (0, path_1.resolve)(process.cwd(), 'temp', 'etiqueta-trazabilidad');
        if (!(0, fs_1.existsSync)(tempDirectory)) {
            (0, fs_1.mkdirSync)(tempDirectory, { recursive: true });
        }
        const imagePath = (0, path_1.resolve)(tempDirectory, `valor_${Date.now()}.png`);
        try {
            const escapedValue = this.escapeXml(valor);
            const svg = `
        <svg width="${LABEL_WIDTH_PX}" height="${LABEL_HEIGHT_PX}" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" fill="white"/>
          <text
            x="50%"
            y="50%"
            dominant-baseline="middle"
            text-anchor="middle"
            font-family="Arial"
            font-size="20"
            fill="black">${escapedValue}</text>
        </svg>`;
            const pngBuffer = await sharp({
                create: {
                    width: LABEL_WIDTH_PX,
                    height: LABEL_HEIGHT_PX,
                    channels: 3,
                    background: { r: 255, g: 255, b: 255 },
                },
            })
                .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
                .png()
                .toBuffer();
            (0, fs_1.writeFileSync)(imagePath, pngBuffer);
            await this.printPngFile(imagePath);
            this.writeLog(`Valor enviado a impresión como imagen PNG. valor=${valor}, archivo=${imagePath}`);
            return {
                mensaje: 'Valor enviado a impresión como imagen PNG.',
                valor,
                printerConnected: true,
                printed: true,
                imagePath,
            };
        }
        catch (error) {
            this.writeLog(`ERROR imprimiendo valor como PNG: ${String(error)}`);
            throw error;
        }
    }
    async printPngFile(imagePath) {
        const escapedPrinterName = ZEBRA_PRINTER_NAME.replace(/'/g, "''");
        const escapedImagePath = imagePath.replace(/'/g, "''");
        const printScript = [
            `Add-Type -AssemblyName System.Drawing`,
            `$doc = New-Object System.Drawing.Printing.PrintDocument`,
            `$doc.PrinterSettings.PrinterName = '${escapedPrinterName}'`,
            `$doc.PrinterSettings.Copies = ${PRINT_COPIES}`,
            `$doc.PrintController = New-Object System.Drawing.Printing.StandardPrintController`,
            `$image = [System.Drawing.Image]::FromFile('${escapedImagePath}')`,
            `$handler = [System.Drawing.Printing.PrintPageEventHandler]{ param($sender, $e) $pb = $e.PageBounds; $x = ($pb.Width - ${LABEL_WIDTH_HI}) / 2; $y = ($pb.Height - ${LABEL_HEIGHT_HI}) / 2; $e.Graphics.DrawImage($image, $x, $y, ${LABEL_WIDTH_HI}, ${LABEL_HEIGHT_HI}); $e.HasMorePages = $false }`,
            `$doc.add_PrintPage($handler)`,
            `$doc.Print()`,
            `$image.Dispose()`,
            `$doc.Dispose()`,
        ].join('; ');
        await execFileAsync('powershell.exe', [
            '-NoProfile',
            '-NonInteractive',
            '-Command',
            printScript,
        ]);
    }
    escapeXml(value) {
        return value
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    }
};
exports.EtiquetaTrazabilidadService = EtiquetaTrazabilidadService;
exports.EtiquetaTrazabilidadService = EtiquetaTrazabilidadService = EtiquetaTrazabilidadService_1 = __decorate([
    (0, common_1.Injectable)()
], EtiquetaTrazabilidadService);
//# sourceMappingURL=etiqueta-trazabilidad.service.js.map