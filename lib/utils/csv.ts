/** Escapes a field for CSV per RFC 4180. */
export function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function toCsv(header: string[], rows: string[][]): string {
  const lines = [header.map(csvEscape).join(","), ...rows.map((row) => row.map(csvEscape).join(","))];
  return lines.join("\n");
}
