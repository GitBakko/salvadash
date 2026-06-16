import { describe, it, expect } from 'vitest';
import * as ExcelJS from 'exceljs';
import { normalizeCell, sheetToMatrix } from '../lib/xlsx-import.js';

describe('xlsx-import helpers', () => {
  describe('normalizeCell', () => {
    it('passes through primitives and Dates, drops null/undefined', () => {
      const d = new Date('2026-01-01');
      expect(normalizeCell(42)).toBe(42);
      expect(normalizeCell('hello')).toBe('hello');
      expect(normalizeCell(true)).toBe(true);
      expect(normalizeCell(d)).toBe(d);
      expect(normalizeCell(null)).toBeUndefined();
      expect(normalizeCell(undefined)).toBeUndefined();
    });

    it('unwraps formula, hyperlink and rich-text cell objects', () => {
      expect(normalizeCell({ formula: 'A1+B1', result: 7 } as ExcelJS.CellValue)).toBe(7);
      expect(
        normalizeCell({ text: 'Site', hyperlink: 'https://x' } as ExcelJS.CellValue),
      ).toBe('Site');
      expect(
        normalizeCell({ richText: [{ text: 'foo' }, { text: 'bar' }] } as ExcelJS.CellValue),
      ).toBe('foobar');
    });
  });

  describe('sheetToMatrix', () => {
    it('produces a 0-indexed array-of-arrays matching the import shape', async () => {
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('Sheet1');
      const month = new Date(2026, 0, 31);
      ws.addRow(['Label', month]); // header: col A label, col B month
      ws.addRow(['Conto Principale', 1500.5]);
      ws.addRow(['Stipendio', 2000]);

      // Round-trip through a real xlsx buffer so we exercise exceljs' parser too
      const arrayBuffer = await wb.xlsx.writeBuffer();
      const wb2 = new ExcelJS.Workbook();
      await wb2.xlsx.load(arrayBuffer as ArrayBuffer);
      const matrix = sheetToMatrix(wb2.worksheets[0]);

      expect(matrix.length).toBe(3);
      expect(matrix[0][0]).toBe('Label');
      expect(matrix[0][1]).toBeInstanceOf(Date);
      expect(matrix[1][0]).toBe('Conto Principale');
      expect(Number(matrix[1][1])).toBeCloseTo(1500.5);
      expect(matrix[2][0]).toBe('Stipendio');
      expect(Number(matrix[2][1])).toBe(2000);
    });
  });
});
