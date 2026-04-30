import * as FileSystem from 'expo-file-system';
import * as Print from 'expo-print';
import { createFileExportTools, type FileExportAdapter, type ToolContract } from '@nss/response-os';

const EXPORT_ID_PREFIX = 'neuromoves_export';

export function createNeuromovesExportTools(): ToolContract[] {
  const adapter: FileExportAdapter = {
    async exportCsv(request) {
      const rows = request.rows ?? [];
      const csv = toCsv(rows);
      const filename = sanitizeFilename(request.filename ?? `responseos-plan-${Date.now()}.csv`, 'csv');
      const uri = resolveExportUri(filename);
      await FileSystem.writeAsStringAsync(uri, csv);

      return {
        artifact: {
          id: `${EXPORT_ID_PREFIX}_csv_${Date.now()}`,
          type: 'csv',
          filename,
          mimeType: 'text/csv',
          uri,
        },
      };
    },

    async exportPdf(request) {
      const title = request.title ?? 'ResponseOS Plan';
      const sections = request.sections ?? [];
      const html = toHtml(title, sections);
      const pdf = await Print.printToFileAsync({
        html,
        base64: false,
      });

      return {
        artifact: {
          id: `${EXPORT_ID_PREFIX}_pdf_${Date.now()}`,
          type: 'pdf',
          filename: sanitizeFilename(request.filename ?? `responseos-plan-${Date.now()}.pdf`, 'pdf'),
          mimeType: 'application/pdf',
          uri: pdf.uri,
        },
      };
    },
  };

  return createFileExportTools(adapter);
}

function resolveExportUri(filename: string): string {
  const base = ((FileSystem as unknown as { cacheDirectory?: string }).cacheDirectory ??
    (FileSystem as unknown as { documentDirectory?: string }).documentDirectory) as string | undefined;
  if (!base) {
    throw new Error('File system directory is unavailable.');
  }
  return `${base}${filename}`;
}

function sanitizeFilename(filename: string, extension: 'csv' | 'pdf'): string {
  const cleaned = filename
    .trim()
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (!cleaned) {
    return `responseos-export.${extension}`;
  }
  if (cleaned.toLowerCase().endsWith(`.${extension}`)) {
    return cleaned;
  }
  return `${cleaned}.${extension}`;
}

function toCsv(rows: Array<Record<string, unknown>>): string {
  if (rows.length === 0) {
    return '';
  }

  const columns = Array.from(
    rows.reduce((set, row) => {
      for (const key of Object.keys(row)) {
        set.add(key);
      }
      return set;
    }, new Set<string>())
  );

  const header = columns.map(escapeCsv).join(',');
  const body = rows
    .map((row) =>
      columns
        .map((column) => {
          const value = row[column];
          return escapeCsv(value === undefined || value === null ? '' : String(value));
        })
        .join(',')
    )
    .join('\n');

  return `${header}\n${body}`;
}

function escapeCsv(value: string): string {
  if (value.includes('"') || value.includes(',') || value.includes('\n')) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}

function toHtml(
  title: string,
  sections: Array<{
    heading: string;
    content: string;
  }>
): string {
  const sectionHtml = sections
    .map((section) => `<h2>${escapeHtml(section.heading)}</h2><p>${escapeHtml(section.content)}</p>`)
    .join('\n');

  return `
  <!doctype html>
  <html>
    <head>
      <meta charset="utf-8"/>
      <style>
        body { font-family: Arial, sans-serif; padding: 24px; color: #111827; }
        h1 { margin: 0 0 16px 0; font-size: 24px; }
        h2 { margin-top: 16px; font-size: 16px; }
        p { margin: 6px 0 0 0; font-size: 13px; line-height: 1.4; }
      </style>
    </head>
    <body>
      <h1>${escapeHtml(title)}</h1>
      ${sectionHtml}
    </body>
  </html>
  `.trim();
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
