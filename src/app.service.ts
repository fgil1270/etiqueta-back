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
export class AppService {

}
