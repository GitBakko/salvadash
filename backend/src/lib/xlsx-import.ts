import type * as ExcelJS from 'exceljs';

// Helpers for parsing uploaded .xlsx workbooks (via exceljs) into the
// 0-indexed array-of-arrays shape the import route expects — equivalent to
// xlsx's `sheet_to_json(sheet, { header: 1 })`.

/** Normalize an exceljs cell value to a primitive (number | string | boolean | Date | undefined). */
export function normalizeCell(v: ExcelJS.CellValue): unknown {
  if (v === null || v === undefined) return undefined;
  if (v instanceof Date) return v;
  if (typeof v === 'object') {
    if ('result' in v) return (v as { result?: unknown }).result; // formula
    if ('text' in v) return (v as { text?: unknown }).text; // hyperlink
    if ('richText' in v) {
      return (v as { richText: { text: string }[] }).richText.map((t) => t.text).join('');
    }
    return undefined; // error / shared formula
  }
  return v;
}

/** Convert a worksheet to a 0-indexed matrix of normalized cell values. */
export function sheetToMatrix(ws: ExcelJS.Worksheet): unknown[][] {
  const matrix: unknown[][] = [];
  for (let r = 1; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const arr: unknown[] = [];
    for (let c = 1; c <= ws.columnCount; c++) {
      arr[c - 1] = normalizeCell(row.getCell(c).value);
    }
    matrix.push(arr);
  }
  return matrix;
}
