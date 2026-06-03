import { Injectable, Logger } from '@nestjs/common';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);
const ZEBRA_PRINTER_NAME = process.env.ZEBRA_PRINTER_NAME ?? 'Zebra';//'Trazabilidad';
const LABEL_DPI = 300;
const LABEL_WIDTH_IN = Number(process.env.LABEL_WIDTH_IN ?? (1.7 / 2.54)); // 1.2 cm convertido a pulgadas
const LABEL_HEIGHT_IN = Number(process.env.LABEL_HEIGHT_IN ?? (1.2 / 2.54)); // 1.5 cm convertido a pulgadas
const LABEL_WIDTH_PX = Math.round(LABEL_WIDTH_IN * LABEL_DPI);
const LABEL_HEIGHT_PX = Math.round(LABEL_HEIGHT_IN * LABEL_DPI);
const PRINT_OFFSET_X_MM = Number(process.env.PRINT_OFFSET_X_MM ?? 5.2);
const PRINT_OFFSET_Y_MM = Number(process.env.PRINT_OFFSET_Y_MM ?? 2.5);
const PRINT_OFFSET_X_PX = Math.round((PRINT_OFFSET_X_MM / 25.4) * LABEL_DPI);
const PRINT_OFFSET_Y_PX = Math.round((PRINT_OFFSET_Y_MM / 25.4) * LABEL_DPI);
const PRINT_COPIES = Math.max(1, Number(process.env.PRINT_COPIES ?? 1));
const ZPL_DARKNESS = Math.min(30, Math.max(0, Number(process.env.ZPL_DARKNESS ?? 2)));
const ZPL_PRINT_SPEED = Math.min(14, Math.max(1, Number(process.env.ZPL_PRINT_SPEED ?? 3)));
let REQUIRED_DM_CODE = 'AMmb03713437';
let REQUIRED_HUMAN_TEXT = `A007T033 C`;
const LEFT_TEXT_ZONE_PX = Number(process.env.LEFT_TEXT_ZONE_PX ?? 28);
const TEXT_FONT_HEIGHT_PX = Number(process.env.TEXT_FONT_HEIGHT_PX ?? 15);
const TEXT_FONT_WIDTH_PX = Number(process.env.TEXT_FONT_WIDTH_PX ?? 8);
const TEXT_FONT_PRINTER_PATH = process.env.TEXT_FONT_PRINTER_PATH ?? 'E:CALIBRI.TTF';
const DM_MODULE_SIZE = Number(process.env.DM_MODULE_SIZE ?? 7);

interface ImprimirResult {
  dataMatrix: string;
  code: string;
}

@Injectable()
export class ReimpresionTrazabilidadService {
  private readonly logger = new Logger(ReimpresionTrazabilidadService.name);



  async imprimir(body: ImprimirResult): Promise<{
    mensaje: string;
    printerConnected: boolean;
    printed: boolean;
  }> {

    REQUIRED_DM_CODE = body.dataMatrix;
    REQUIRED_HUMAN_TEXT = body.code + ' C';

    const printerConnected = await this.isUsbZebraConnected();
    if (!printerConnected) {
      this.logger.warn(`Impresora no conectada por USB: ${ZEBRA_PRINTER_NAME}`);
      return {
        mensaje: 'Impresora Zebra no conectada por USB.',
        printerConnected: false,
        printed: false,
      };
    }

    const zpl = this.buildDataMatrixZpl();
    await this.sendRawToPrinter(zpl);

    return {
      mensaje: 'Data Matrix enviado a impresión correctamente.',
      printerConnected: true,
      printed: true,
    };
  }

  private buildDataMatrixZpl(): string {
    const safeValue = REQUIRED_DM_CODE;
    const dmX = PRINT_OFFSET_X_PX + LEFT_TEXT_ZONE_PX;
    const dmY = PRINT_OFFSET_Y_PX + 6;
    const textX = PRINT_OFFSET_X_PX + 3;
    const textY = PRINT_OFFSET_Y_PX + 3;
    const printerFontPath = TEXT_FONT_PRINTER_PATH.replace(/\\/g, '/');

    return [
      '^XA',
      //'^CI28',
      //`^CWK,${printerFontPath}`,
      `^PW${LABEL_WIDTH_PX}`,
      `^LL${LABEL_HEIGHT_PX}`,
      `^MD${ZPL_DARKNESS}`,
      `^PR${ZPL_PRINT_SPEED}`,
      `^FO${textX},${textY}`,
      `^ADR,${TEXT_FONT_HEIGHT_PX},${TEXT_FONT_WIDTH_PX}`,
      `^FD${REQUIRED_HUMAN_TEXT}`,
      '^FS',
      `^FO${dmX},${dmY}`,
      // ^BX en Zebra genera Data Matrix ECC 200 rotado 90 grados
      `^BXI,${DM_MODULE_SIZE},200,14,14,6,_`,
      `^FD${safeValue}`,
      '^FS',
      `^PQ${PRINT_COPIES}`,
      '^XZ',
    ].join('');
  }

  private async isUsbZebraConnected(): Promise<boolean> {
    const escapedPrinterName = ZEBRA_PRINTER_NAME.replace(/'/g, "''");
    const script = [
      `$printer = Get-Printer | Where-Object { $_.Name -like '*${escapedPrinterName}*' } | Select-Object -First 1`,
      `if ($null -eq $printer) { Write-Output 'NOT_FOUND' } else { $isUsb = $printer.PortName -like 'USB*'; $wmi = Get-CimInstance -ClassName Win32_Printer | Where-Object { $_.Name -eq $printer.Name } | Select-Object -First 1; $isOffline = $false; if ($null -ne $wmi -and $null -ne $wmi.WorkOffline) { $isOffline = [bool]$wmi.WorkOffline } elseif (($printer.PrinterStatus -as [string]) -match 'Offline') { $isOffline = $true }; if (-not $isUsb) { Write-Output 'NOT_USB' } elseif ($isOffline) { Write-Output 'OFFLINE' } else { Write-Output 'READY' } }`,
    ].join('; ');

    try {
      const { stdout } = await execFileAsync('powershell.exe', [
        '-NoProfile',
        '-NonInteractive',
        '-Command',
        script,
      ]);

      const status = stdout
        .split(/\r?\n/)
        .map((line) => line.trim())
        .find(Boolean);

      return status === 'READY';
    } catch (error) {
      this.logger.error(`Error validando impresora: ${String(error)}`);
      return false;
    }
  }

  private async sendRawToPrinter(zpl: string): Promise<void> {
    const escapedPrinterName = ZEBRA_PRINTER_NAME.replace(/'/g, "''");
    const escapedZpl = zpl.replace(/'/g, "''");
    const rawPrintScript = [
      `Add-Type -TypeDefinition 'using System;using System.Runtime.InteropServices;public class RawPrinter{[StructLayout(LayoutKind.Sequential,CharSet=CharSet.Unicode)]public struct DOCINFOW{public string pDocName;public string pOutputFile;public string pDataType;}[DllImport("winspool.drv",CharSet=CharSet.Unicode)]public static extern bool OpenPrinter(string n,out IntPtr h,IntPtr d);[DllImport("winspool.drv")]public static extern bool ClosePrinter(IntPtr h);[DllImport("winspool.drv",CharSet=CharSet.Unicode)]public static extern int StartDocPrinter(IntPtr h,int l,ref DOCINFOW d);[DllImport("winspool.drv")]public static extern bool EndDocPrinter(IntPtr h);[DllImport("winspool.drv")]public static extern bool StartPagePrinter(IntPtr h);[DllImport("winspool.drv")]public static extern bool EndPagePrinter(IntPtr h);[DllImport("winspool.drv")]public static extern bool WritePrinter(IntPtr h,IntPtr buf,int count,out int written);}' -Language CSharp`,
      '$h=[IntPtr]::Zero',
      `[RawPrinter]::OpenPrinter('${escapedPrinterName}',[ref]$h,[IntPtr]::Zero) | Out-Null`,
      `$bytes=[System.Text.Encoding]::ASCII.GetBytes('${escapedZpl}')`,
      '$ptr=[System.Runtime.InteropServices.Marshal]::AllocHGlobal($bytes.Length)',
      '[System.Runtime.InteropServices.Marshal]::Copy($bytes,0,$ptr,$bytes.Length)',
      "$di=New-Object RawPrinter+DOCINFOW;$di.pDocName='ZPL';$di.pDataType='RAW'",
      '[RawPrinter]::StartDocPrinter($h,1,[ref]$di) | Out-Null',
      '[RawPrinter]::StartPagePrinter($h) | Out-Null',
      '$w=0;[RawPrinter]::WritePrinter($h,$ptr,$bytes.Length,[ref]$w) | Out-Null',
      '[RawPrinter]::EndPagePrinter($h) | Out-Null',
      '[RawPrinter]::EndDocPrinter($h) | Out-Null',
      '[RawPrinter]::ClosePrinter($h) | Out-Null',
      '[System.Runtime.InteropServices.Marshal]::FreeHGlobal($ptr)',
    ].join('; ');

    await execFileAsync('powershell.exe', [
      '-NoProfile',
      '-NonInteractive',
      '-Command',
      rawPrintScript,
    ]);
  }
}
