// Minimal CSV builder + downloader. CSV opens directly in Excel; we prepend a
// UTF-8 BOM and use CRLF line endings so Excel reads accents / £ and rows cleanly.

type Cell = string | number | null | undefined

const BOM = '﻿'

function escapeCell(value: Cell): string {
  let s = value === null || value === undefined ? '' : String(value)
  // Member-supplied text starting with = + - @ would run as a formula when the
  // admin opens the export in Excel; a leading apostrophe forces it to text.
  if (typeof value === 'string' && /^[=+\-@\t\r]/.test(s)) s = `'${s}`
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function toCsv(headers: string[], rows: Cell[][]): string {
  return [headers, ...rows]
    .map((row) => row.map(escapeCell).join(','))
    .join('\r\n')
}

/** Build CSV from raw rows (no separate header) - for multi-section reports. */
export function rowsToCsv(rows: Cell[][]): string {
  return rows.map((row) => row.map(escapeCell).join(',')).join('\r\n')
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
