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
    const agregaImagenBuffer = await this.agregarNumeroAImagen(imagePath, 605, 100, valor);
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


    //await this.printImage(tempImagePath);
    await this.printImageZpl(tempImagePath);

    return {
      mensaje: 'Etiqueta enviada a impresion correctamente',
      valor,
      printerConnected: true,
      printed: true,
    };
  }

  private async agregarNumeroAImagen(imagePath: string, x: number, y: number, valor: string): Promise<Buffer> {
    const texto = valor;

    // Creamos una capa SVG con el número
    // El tamaño del SVG debe ser igual o menor a la imagen original
    const svgTexto = `
              <svg width="500" height="100">
                  <style>
                  .numero { fill: black; font-size: 30px; font-weight: bold; font-family: sans-serif; }
                  </style>
                  <text x="0" y="45" class="numero">${texto}</text>
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
