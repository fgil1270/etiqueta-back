import { Injectable, Logger } from '@nestjs/common';
import { appendFileSync, existsSync, mkdirSync, writeFileSync } from 'fs';
import { extname, join, resolve } from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import sharp = require('sharp');
import * as path from 'path';

const execFileAsync = promisify(execFile);
const ZEBRA_PRINTER_NAME =
  process.env.ZEBRA_PRINTER_NAME ?? 'Zebra';//'Zebra TT Printer ZT610';
const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.bmp'];
const LABEL_DPI = 300
//const LABEL_WIDTH_IN = Number(process.env.LABEL_WIDTH_IN ?? 3.259);
//const LABEL_HEIGHT_IN = Number(process.env.LABEL_HEIGHT_IN ?? 1.6);
const LABEL_WIDTH_IN = Number(process.env.LABEL_WIDTH_IN ?? 3.2); //define el area de imprecion
const LABEL_HEIGHT_IN = Number(process.env.LABEL_HEIGHT_IN ?? 1.4715);
const LABEL_WIDTH_PX = Math.round(LABEL_WIDTH_IN * LABEL_DPI);
const LABEL_HEIGHT_PX = Math.round(LABEL_HEIGHT_IN * LABEL_DPI);
const LABEL_WIDTH_HI = Math.round(LABEL_WIDTH_IN * 100);
const LABEL_HEIGHT_HI = Math.round(LABEL_HEIGHT_IN * 100);
// Calibración posición de impresión: mm → centésimas de pulgada (unidad GDI+)
const PRINT_OFFSET_X_MM = Number(process.env.PRINT_OFFSET_X_MM ?? 4);
const PRINT_OFFSET_Y_MM = Number(process.env.PRINT_OFFSET_Y_MM ?? 4);
const PRINT_OFFSET_X_HI = Math.round((PRINT_OFFSET_X_MM / 25.4) * 100);
const PRINT_OFFSET_Y_HI = Math.round((PRINT_OFFSET_Y_MM / 25.4) * 100);
const PRINT_OFFSET_X_PX = Math.round((PRINT_OFFSET_X_MM / 25.4) * LABEL_DPI);
const PRINT_OFFSET_Y_PX = Math.round((PRINT_OFFSET_Y_MM / 25.4) * LABEL_DPI);
const PRINT_COPIES = Math.max(1, Number(process.env.PRINT_COPIES ?? 1)); // Número de copias a imprimir por etiqueta
// Configuración Zebra: oscuridad (0-30) y velocidad de impresión en pulgadas/seg (1-14)
const ZPL_DARKNESS = Math.min(30, Math.max(0, Number(process.env.ZPL_DARKNESS ?? 15)));
const ZPL_PRINT_SPEED = Math.min(14, Math.max(1, Number(process.env.ZPL_PRINT_SPEED ?? 3)));


@Injectable()
export class EtiquetaPTService {
  private readonly logger = new Logger(EtiquetaPTService.name);
  private readonly logFilePath = resolve(process.cwd(), 'logs', 'etiqueta.log');

  async createEtiqueta(valor: string, modelo: string): Promise<{
    mensaje: string;
    valor: string;
    printerConnected: boolean;
    printed: boolean;
  }> {
    this.writeLog(`Solicitud de etiqueta recibida. valor=${valor}, modelo=${modelo}`);

    const imgFilename = modelo + '.png';//`LV432820.png`;
    const imgsDirectory = resolve(process.cwd(), 'C://imgs');

    //se obtiene la ruta de la imagen, si no existe se retorna un mensaje de error
    const imagePath = this.resolveImagePath(`${imgsDirectory}/${imgFilename}`);

    if (!imagePath) {
      this.logger.error(
        `No existe una imagen asociada : ${imgFilename}`,
      );
      this.writeLog(`ERROR: imagen no encontrada. archivo=${imgFilename}`);
      return {
        mensaje: 'No se pudo imprimir: no existe una imagen asociada a la etiqueta.',
        valor,
        printerConnected: false,
        printed: false,
      };
    }

    //se valida que la impresora zebra este conectada por usb
    const printerConnected = await this.isUsbZebraConnected();

    if (!printerConnected) {
      this.logger.warn(
        `Impresora no conectada por USB: ${ZEBRA_PRINTER_NAME}`,
      );
      this.writeLog(`ERROR: impresora no disponible. nombre=${ZEBRA_PRINTER_NAME}`);

      return {
        mensaje: 'Impresora Zebra no conectada por USB.',
        valor,
        printerConnected: false,
        printed: false,
      };
    }

    //se agrega el numero a la imagen
    const agregaImagenBuffer = await this.agregarNumeroAImagen(imagePath, 205, 100, valor, modelo);
    const dia = new Date();
    const rutaTemporal = `C://imgs/temp-schneider/${dia.getFullYear()}-${(dia.getMonth() + 1).toString().padStart(2, '0')}-${dia.getDate().toString().padStart(2, '0')}`;
    //se guarda la imagen temporalmente para imprimirla
    const tempDirectory = resolve(process.cwd(), rutaTemporal);
    if (!existsSync(tempDirectory)) {
      mkdirSync(tempDirectory, { recursive: true });
    }

    const tempImagePath = resolve(tempDirectory, `etiqueta_${Date.now()}.png`);

    // Guardar la imagen sin reescalado para evitar cambios de tamaño y pérdida por remuestreo.
    await sharp(agregaImagenBuffer)
      /* .resize({
          width: LABEL_WIDTH_PX,
          height: LABEL_HEIGHT_PX,
          fit: 'fill',
          kernel: 'lanczos3',
          background: { r: 255, g: 255, b: 255, alpha: 1 },
      })
      .sharpen({ sigma: 0.8, m1: 1.5, m2: 0.5 }) */
      .withMetadata({ density: LABEL_DPI })
      .png({ compressionLevel: 0 })
      .toFile(tempImagePath);

    return {
      mensaje: 'Etiqueta enviada a impresion correctamente',
      valor,
      printerConnected: true,
      printed: true,
    };

    //await this.printImage(tempImagePath);
    await this.printImageZpl(tempImagePath);

    return {
      mensaje: 'Etiqueta enviada a impresion correctamente',
      valor,
      printerConnected: true,
      printed: true,
    };
  }

  private async agregarNumeroAImagen(imagePath: string, x: number, y: number, valor: string, modelo: string): Promise<Buffer> {
    const texto = valor;
    let codeBar = '';

    if (modelo == 'LV432820') {
      codeBar = '3606488042845';
    } else if (modelo == 'LV432920') {
      codeBar = '3606488042852';
    }

    // Creamos una capa SVG con el número y el código de barras
    // El tamaño del SVG debe ser igual o menor a la imagen original
    const svgTexto = `
              <svg width="510" height="400">
                  <style>
                  .numero { fill: black; font-size: 30px; font-weight: bold; font-family: sans-serif; }
                  </style>
                  <text x="400" y="45" class="numero">${texto}</text>
                  <g transform="translate(0,230)">
                      ${this.generarEan13Svg(codeBar)}
                  </g>
              </svg>
          `;

    // Usamos Sharp para el composite (encimar capas)
    return await sharp(imagePath)
      .composite([
        {
          input: Buffer.from(svgTexto),
          top: y,  // Coordenada exacta en píxeles
          left: x, // Coordenada exacta en píxeles
        },
      ])
      .toBuffer(); // Regresamos el buffer editado
  }

  private generarEan13Svg(code: string): string {
    if (!code) {
      return '';
    }

    const cleanCode = code.replace(/\D/g, '');
    if (cleanCode.length !== 13) {
      return '';
    }

    const structure = [
      ['L', 'L', 'L', 'L', 'L', 'L'], // 0
      ['L', 'L', 'G', 'L', 'G', 'G'], // 1
      ['L', 'L', 'G', 'G', 'L', 'G'], // 2
      ['L', 'L', 'G', 'G', 'G', 'L'], // 3
      ['L', 'G', 'L', 'L', 'G', 'G'], // 4
      ['L', 'G', 'G', 'L', 'L', 'G'], // 5
      ['L', 'G', 'G', 'G', 'L', 'L'], // 6
      ['L', 'G', 'L', 'G', 'L', 'G'], // 7
      ['L', 'G', 'L', 'G', 'G', 'L'], // 8
      ['L', 'G', 'G', 'L', 'G', 'L']  // 9
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

    let binary = '101'; // Start guard

    // Left-hand group (digits 2 to 7)
    for (let i = 1; i <= 6; i++) {
      const digit = parseInt(cleanCode[i], 10);
      binary += leftParity[i - 1] === 'L' ? L[digit] : G[digit];
    }

    binary += '01010'; // Center guard

    // Right-hand group (digits 8 to 13)
    for (let i = 7; i <= 12; i++) {
      const digit = parseInt(cleanCode[i], 10);
      binary += R[digit];
    }

    binary += '101'; // End guard

    const moduleWidth = 2; // pixel width per module
    const barHeight = 45;  // height of normal bars
    const guardHeight = 50; // guard bars are slightly longer
    let rects = '';

    // Shift entire barcode to the right to make room for first digit
    const barOffset = 15;

    for (let i = 0; i < binary.length; i++) {
      if (binary[i] === '1') {
        const xPos = barOffset + (i * moduleWidth);
        const isGuard = i < 3 || (i >= 45 && i < 50) || i >= 92;
        const h = isGuard ? guardHeight : barHeight;
        rects += `<rect x="${xPos}" y="0" width="${moduleWidth}" height="${h}" fill="black" />`;
      }
    }

    const textStyle = 'fill: black; font-size: 14px; font-family: sans-serif; font-weight: bold;';
    const firstChar = cleanCode[0];
    const leftGroup = cleanCode.slice(1, 7);
    const rightGroup = cleanCode.slice(7);

    // EAN-13 text layout:
    // First digit is on the far left, before the bars
    rects += `<text x="0" y="${guardHeight + 11}" style="${textStyle}">${firstChar}</text>`;

    // Left group digits spaced under left bars
    for (let i = 0; i < 6; i++) {
      const x = barOffset + 6 + (i * 13);
      rects += `<text x="${x}" y="${guardHeight + 11}" style="${textStyle}">${leftGroup[i]}</text>`;
    }

    // Right group digits spaced under right bars
    for (let i = 0; i < 6; i++) {
      const x = barOffset + 102 + (i * 13);
      rects += `<text x="${x}" y="${guardHeight + 11}" style="${textStyle}">${rightGroup[i]}</text>`;
    }

    return rects;
  }

  // Función para validar si la impresora Zebra está conectada por USB usando PowerShell
  private async isUsbZebraConnected(): Promise<boolean> {
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
      } else if (status === 'NOT_USB') {

        this.writeLog(`Impresora '${ZEBRA_PRINTER_NAME}' encontrada pero no conectada por USB.`);
      } else {

        this.writeLog(`Impresora '${ZEBRA_PRINTER_NAME}' no encontrada.`);
      }

      return false;
    } catch (error) {

      this.writeLog(`ERROR validando impresora: ${String(error)}`);
      return false;
    }
  }

  // Función para enviar la imagen a impresión usando mspaint
  private async printImage(imagePath: string): Promise<void> {
    try {
      const escapedPrinterName = ZEBRA_PRINTER_NAME.replace(/'/g, "''");
      const escapedImagePath = imagePath.replace(/'/g, "''");

      // Enviar configuración de oscuridad y velocidad como ZPL raw antes del job GDI+
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
        //`$doc.add_PrintPage({ param($sender, $e) $e.Graphics.TranslateTransform(-$e.PageSettings.HardMarginX, -$e.PageSettings.HardMarginY); $safeWidth = [Math]::Max(1, $drawWidth - $offsetX); $safeHeight = [Math]::Max(1, $drawHeight - $offsetY); $rect = New-Object System.Drawing.Rectangle($offsetX, $offsetY, $safeWidth, $safeHeight); $e.Graphics.DrawImage($img, $rect); $e.HasMorePages = $false })`,
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

    } catch (error) {
      this.writeLog(`ERROR enviando imagen a impresion: ${String(error)}`);
      throw error;
    }
  }

  private writeLog(message: string): void {
    const logDir = resolve(process.cwd(), 'logs');
    if (!existsSync(logDir)) {
      mkdirSync(logDir, { recursive: true });
    }

    const timestamp = new Date().toISOString();
    appendFileSync(this.logFilePath, `[${timestamp}] ${message}\n`, { encoding: 'utf8' });
  }

  // Función para enviar la imagen a la impresora Zebra en formato ZPL nativo (sin GDI+, más rápido)
  private async printImageZpl(imagePath: string): Promise<void> {
    const labelWidthDots = LABEL_WIDTH_PX;
    const labelHeightDots = LABEL_HEIGHT_PX;

    // Convertir PNG a escala de grises 1-bit para comando ^GFA de ZPL
    // .flatten() elimina canal alfa (si existe) antes de convertir a gris
    const { data, info } = await sharp(imagePath)
      .flatten({ background: { r: 255, g: 255, b: 255 } })
      .grayscale()
      .raw()
      .toBuffer({ resolveWithObject: true });

    // Usar el tamaño real de la imagen
    const widthDots = info.width;
    const heightDots = info.height;
    const bytesPerRow = Math.ceil(widthDots / 8);
    const totalBytes = bytesPerRow * heightDots;

    // info.channels = número real de canales (1 tras grayscale+flatten)
    const ch = info.channels;

    // Empaquetar píxeles en 1 bit por pixel (umbral 128 → negro/blanco) codificado en hex ASCII
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

    // Construir documento ZPL con tamaño de etiqueta explícito
    //const zpl = `^XA^PW${widthDots}^LL${heightDots}^FO${PRINT_OFFSET_X_PX},${PRINT_OFFSET_Y_PX}^GFA,${totalBytes},${totalBytes},${bytesPerRow},${gfData}^FS^XZ`;
    const zpl = `^XA^PW${labelWidthDots}^LL${labelHeightDots}^FO${PRINT_OFFSET_X_PX},${PRINT_OFFSET_Y_PX}^GFA,${totalBytes},${totalBytes},${bytesPerRow},${gfData}^FS^PQ${PRINT_COPIES}^XZ`;

    // Guardar ZPL en archivo temporal junto a la imagen
    const zplPath = imagePath.replace(/\.png$/i, '.zpl');
    writeFileSync(zplPath, zpl, 'ascii');

    // Enviar bytes raw al spooler de Windows usando P/Invoke (no carga GDI+)
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

      //eliminar el archivo ZPL temporal después de imprimir
      //eliminar el archivo de imagen temporal después de imprimir

    } catch (error) {
      this.writeLog(`ERROR enviando ZPL a impresion: ${String(error)}`);
      throw error;
    }
  }

  // Función para resolver la ruta de la imagen basada en el valor, buscando con diferentes extensiones
  private resolveImagePath(ruta: string): string | null {
    const imgDirectory = resolve(process.cwd(), ruta);
    const hasExtension = extname(ruta).length > 0;
    if (existsSync(imgDirectory)) {
      return imgDirectory;
    }

    return null;
  }


}
