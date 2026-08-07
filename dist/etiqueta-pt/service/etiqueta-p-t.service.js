"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var EtiquetaPTService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EtiquetaPTService = void 0;
const common_1 = require("@nestjs/common");
const fs_1 = require("fs");
const path_1 = require("path");
const child_process_1 = require("child_process");
const util_1 = require("util");
const sharp = require("sharp");
const etiqueta_producto_terminado_entity_1 = require("../../entities/etiqueta-producto-terminado.entity");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const execFileAsync = (0, util_1.promisify)(child_process_1.execFile);
const ZEBRA_PRINTER_NAME = process.env.ZEBRA_PRINTER_NAME ?? 'Zebra';
const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.bmp'];
const LABEL_DPI = 300;
const LABEL_WIDTH_IN = Number(process.env.LABEL_WIDTH_IN ?? 3.2);
const LABEL_HEIGHT_IN = Number(process.env.LABEL_HEIGHT_IN ?? 1.8715);
const LABEL_WIDTH_PX = Math.round(LABEL_WIDTH_IN * LABEL_DPI);
const LABEL_HEIGHT_PX = Math.round(LABEL_HEIGHT_IN * LABEL_DPI);
const LABEL_WIDTH_HI = Math.round(LABEL_WIDTH_IN * 100);
const LABEL_HEIGHT_HI = Math.round(LABEL_HEIGHT_IN * 100);
const PRINT_OFFSET_X_MM = Number(process.env.PRINT_OFFSET_X_MM ?? 4);
const PRINT_OFFSET_Y_MM = Number(process.env.PRINT_OFFSET_Y_MM ?? 4);
const PRINT_OFFSET_X_HI = Math.round((PRINT_OFFSET_X_MM / 25.4) * 100);
const PRINT_OFFSET_Y_HI = Math.round((PRINT_OFFSET_Y_MM / 25.4) * 100);
const PRINT_OFFSET_X_PX = Math.round((PRINT_OFFSET_X_MM / 25.4) * LABEL_DPI);
const PRINT_OFFSET_Y_PX = Math.round((PRINT_OFFSET_Y_MM / 25.4) * LABEL_DPI);
const ZPL_DARKNESS = Math.min(30, Math.max(0, Number(process.env.ZPL_DARKNESS ?? 15)));
const ZPL_PRINT_SPEED = Math.min(14, Math.max(1, Number(process.env.ZPL_PRINT_SPEED ?? 3)));
let EtiquetaPTService = EtiquetaPTService_1 = class EtiquetaPTService {
    constructor(etiquetaProductoTerminadoRepository) {
        this.etiquetaProductoTerminadoRepository = etiquetaProductoTerminadoRepository;
        this.logger = new common_1.Logger(EtiquetaPTService_1.name);
        this.logFilePath = (0, path_1.resolve)(process.cwd(), 'logs', 'etiqueta.log');
        this.PRINT_COPIES = Math.max(1, Number(process.env.PRINT_COPIES ?? 1));
    }
    async createEtiqueta(valor, modelo, totalEtiquetas) {
        this.writeLog(`Solicitud de etiqueta recibida. valor=${valor}, modelo=${modelo}`);
        try {
            this.PRINT_COPIES = Math.max(1, Number(totalEtiquetas ?? 1));
            ;
            const imgFilename = modelo + '.png';
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
                this.writeLog(`ERROR: impresora no disponible. nombre=${ZEBRA_PRINTER_NAME}`);
                return {
                    mensaje: 'Impresora Zebra no conectada por USB.',
                    valor,
                    printerConnected: false,
                    printed: false,
                };
            }
            const agregaImagenBuffer = await this.agregarNumeroAImagen(imagePath, 205, 80, valor, modelo);
            const dia = new Date();
            const rutaTemporal = `C://imgs/temp-schneider/${dia.getFullYear()}-${(dia.getMonth() + 1).toString().padStart(2, '0')}-${dia.getDate().toString().padStart(2, '0')}`;
            const tempDirectory = (0, path_1.resolve)(process.cwd(), rutaTemporal);
            if (!(0, fs_1.existsSync)(tempDirectory)) {
                (0, fs_1.mkdirSync)(tempDirectory, { recursive: true });
            }
            const tempImagePath = (0, path_1.resolve)(tempDirectory, `etiqueta_${Date.now()}.png`);
            await sharp(agregaImagenBuffer)
                .withMetadata({ density: LABEL_DPI })
                .png({ compressionLevel: 0 })
                .toFile(tempImagePath);
            const nowTxt = new Date();
            const yearTxt = nowTxt.getFullYear();
            const monthTxt = (nowTxt.getMonth() + 1).toString().padStart(2, '0');
            const dayTxt = nowTxt.getDate().toString().padStart(2, '0');
            const hourTxt = nowTxt.getHours().toString().padStart(2, '0');
            const minuteTxt = nowTxt.getMinutes().toString().padStart(2, '0');
            const secondTxt = nowTxt.getSeconds().toString().padStart(2, '0');
            const folderPath = (0, path_1.resolve)(process.cwd(), 'documentos', yearTxt.toString());
            if (!(0, fs_1.existsSync)(folderPath)) {
                (0, fs_1.mkdirSync)(folderPath, { recursive: true });
            }
            const txtFileName = `modelo.txt`;
            const txtFilePath = (0, path_1.resolve)(folderPath, txtFileName);
            (0, fs_1.writeFileSync)(txtFilePath, modelo);
            const printed = await this.printImageZpl(tempImagePath);
            if (!printed) {
                this.writeLog(`ERROR: la impresora no confirmó la finalización del trabajo de impresion.`);
                return {
                    mensaje: 'La etiqueta se envió a la impresora pero no se confirmó que se haya impreso (revisar papel/cinta/estado de la impresora).',
                    valor,
                    printerConnected: true,
                    printed: false,
                };
            }
            const etiquetas = Array.from({ length: totalEtiquetas }, () => ({
                codigo: valor,
                modelo,
            }));
            await this.etiquetaProductoTerminadoRepository.insert(etiquetas);
            return {
                mensaje: 'Etiqueta enviada a impresion correctamente',
                valor,
                printerConnected: true,
                printed: true,
            };
        }
        catch (error) {
            return {
                mensaje: error instanceof Error ? error.message : String(error),
                valor,
                printerConnected: false,
                printed: false,
            };
        }
    }
    async getUltimoModelo(year) {
        const folderPath = (0, path_1.resolve)(process.cwd(), 'documentos', year);
        if (!(0, fs_1.existsSync)(folderPath)) {
            throw new Error(`La ruta del año ${year} no existe.`);
        }
        const files = (0, fs_1.readdirSync)(folderPath);
        if (files.length === 0) {
            throw new Error(`No hay archivos en la ruta del año ${year}.`);
        }
        let latestFile = '';
        let latestMtime = 0;
        for (const file of files) {
            const filePath = (0, path_1.resolve)(folderPath, file);
            const stats = (0, fs_1.statSync)(filePath);
            if (stats.isFile() && stats.mtimeMs > latestMtime) {
                latestMtime = stats.mtimeMs;
                latestFile = file;
            }
        }
        if (!latestFile) {
            throw new Error(`No se encontró un archivo válido para el año ${year}.`);
        }
        const content = (0, fs_1.readFileSync)((0, path_1.resolve)(folderPath, latestFile), 'utf8');
        return content.trim();
    }
    async agregarNumeroAImagen(imagePath, x, y, valor, modelo) {
        const texto = valor;
        let codeBar = '';
        if (modelo == 'LV432820') {
            codeBar = '3606488042845';
        }
        else if (modelo == 'LV432920') {
            codeBar = '3606488042852';
        }
        const svgTexto = `
              <svg width="510" height="410">
                  <style>
                  .numero { fill: black; font-size: 30px; font-weight: bold; font-family: sans-serif; }
                  </style>
                  <text x="400" y="65" class="numero">${texto}</text>
                  <g transform="translate(0,245)" >
                    ${this.generarEan13Svg(codeBar)}
                  </g>
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
    generarEan13Svg(code) {
        if (!code) {
            return '';
        }
        const cleanCode = code.replace(/\D/g, '');
        if (cleanCode.length !== 13) {
            return '';
        }
        const structure = [
            ['L', 'L', 'L', 'L', 'L', 'L'],
            ['L', 'L', 'G', 'L', 'G', 'G'],
            ['L', 'L', 'G', 'G', 'L', 'G'],
            ['L', 'L', 'G', 'G', 'G', 'L'],
            ['L', 'G', 'L', 'L', 'G', 'G'],
            ['L', 'G', 'G', 'L', 'L', 'G'],
            ['L', 'G', 'G', 'G', 'L', 'L'],
            ['L', 'G', 'L', 'G', 'L', 'G'],
            ['L', 'G', 'L', 'G', 'G', 'L'],
            ['L', 'G', 'G', 'L', 'G', 'L']
        ];
        const L = [
            '0001101', '0011001', '0010011', '0111101', '0100011',
            '0110001', '0101111', '0111011', '0110111', '0001011'
        ];
        const G = [
            '0100111', '0110011', '0011011', '0100001', '0011101',
            '0111001', '0000101', '0010001', '0001001', '0010111'
        ];
        const R = [
            '1110010', '1100110', '1101100', '1000010', '1011100',
            '1001110', '1010000', '1000100', '1001000', '1110100'
        ];
        const firstDigit = parseInt(cleanCode[0], 10);
        const leftParity = structure[firstDigit] || structure[0];
        let binary = '101';
        for (let i = 1; i <= 6; i++) {
            const digit = parseInt(cleanCode[i], 10);
            binary += leftParity[i - 1] === 'L' ? L[digit] : G[digit];
        }
        binary += '01010';
        for (let i = 7; i <= 12; i++) {
            const digit = parseInt(cleanCode[i], 10);
            binary += R[digit];
        }
        binary += '101';
        const moduleWidth = 2.3;
        const barHeight = 80;
        const guardHeight = 80;
        let rects = '';
        const barOffset = 15;
        for (let i = 0; i < binary.length; i++) {
            if (binary[i] === '1') {
                const xPos = barOffset + (i * moduleWidth);
                const isGuard = i < 3 || (i >= 45 && i < 50) || i >= 92;
                const h = isGuard ? guardHeight : barHeight;
                rects += `<rect x="${xPos}" y="0" width="${moduleWidth}" height="${h}" fill="black" />`;
            }
        }
        const textStyle = 'fill: black; font-size: 21px; font-family: sans-serif; font-weight: bold; text-anchor: middle;';
        const firstChar = cleanCode[0];
        const leftGroup = cleanCode.slice(1, 7);
        const rightGroup = cleanCode.slice(7);
        rects += `<text x="4" y="${guardHeight + 17}" style="fill: black; font-size: 21px; font-family: sans-serif; font-weight: bold;">${firstChar}</text>`;
        for (let i = 0; i < 6; i++) {
            const x = barOffset + (7 * i + 6.5) * moduleWidth;
            rects += `<text x="${x}" y="${guardHeight + 17}" style="${textStyle}">${leftGroup[i]}</text>`;
        }
        for (let i = 0; i < 6; i++) {
            const x = barOffset + (7 * i + 53.5) * moduleWidth;
            rects += `<text x="${x}" y="${guardHeight + 17}" style="${textStyle}">${rightGroup[i]}</text>`;
        }
        return rects;
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
        const labelWidthDots = LABEL_WIDTH_PX;
        const labelHeightDots = LABEL_HEIGHT_PX;
        const { data, info } = await sharp(imagePath)
            .flatten({ background: { r: 255, g: 255, b: 255 } })
            .grayscale()
            .raw()
            .toBuffer({ resolveWithObject: true });
        const widthDots = info.width;
        const heightDots = info.height;
        const bytesPerRow = Math.ceil(widthDots / 8);
        const totalBytes = bytesPerRow * heightDots;
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
        const zpl = `^XA^PW${labelWidthDots}^LL${labelHeightDots}^FO${PRINT_OFFSET_X_PX},${PRINT_OFFSET_Y_PX}^GFA,${totalBytes},${totalBytes},${bytesPerRow},${gfData}^FS^PQ${this.PRINT_COPIES}^XZ`;
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
            `$jobId=[RawPrinter]::StartDocPrinter($h,1,[ref]$di)`,
            `[RawPrinter]::StartPagePrinter($h) | Out-Null`,
            `$w=0;[RawPrinter]::WritePrinter($h,$ptr,$bytes.Length,[ref]$w) | Out-Null`,
            `[RawPrinter]::EndPagePrinter($h) | Out-Null`,
            `[RawPrinter]::EndDocPrinter($h) | Out-Null`,
            `[RawPrinter]::ClosePrinter($h) | Out-Null`,
            `[System.Runtime.InteropServices.Marshal]::FreeHGlobal($ptr)`,
            `$finalStatus='UNKNOWN'`,
            `if ($jobId -le 0) { $finalStatus='ERROR:NoJobId' } else {`,
            `  $elapsedMs=0; $timeoutMs=15000`,
            `  while ($elapsedMs -lt $timeoutMs) {`,
            `    Start-Sleep -Milliseconds 300; $elapsedMs+=300`,
            `    $job = Get-PrintJob -PrinterName '${escapedPrinterName}' -ID $jobId -ErrorAction SilentlyContinue`,
            `    if ($null -eq $job) { $finalStatus='COMPLETED'; break }`,
            `    if ($job.JobStatus -match 'Error|Offline|PaperOut|UserIntervention|Blocked|Deleted') { $finalStatus="ERROR:$($job.JobStatus)"; break }`,
            `  }`,
            `  if ($finalStatus -eq 'UNKNOWN') { $finalStatus='ERROR:Timeout' }`,
            `}`,
            `Write-Output "JOBSTATUS=$finalStatus"`,
        ].join('; ');
        try {
            const { stdout } = await execFileAsync('powershell.exe', [
                '-NoProfile',
                '-NonInteractive',
                '-Command',
                rawPrintScript,
            ]);
            const statusLine = stdout
                .split(/\r?\n/)
                .map((line) => line.trim())
                .find((line) => line.startsWith('JOBSTATUS='));
            const jobStatus = statusLine?.replace('JOBSTATUS=', '') ?? 'ERROR:NoStatus';
            this.writeLog(`Estado del trabajo de impresion ZPL: ${jobStatus}`);
            return jobStatus === 'COMPLETED';
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
exports.EtiquetaPTService = EtiquetaPTService;
exports.EtiquetaPTService = EtiquetaPTService = EtiquetaPTService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(etiqueta_producto_terminado_entity_1.EtiquetaProductoTerminado)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], EtiquetaPTService);
//# sourceMappingURL=etiqueta-p-t.service.js.map