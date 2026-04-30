import type { ToolContract } from '../tools/contracts.js';

export interface StorageToolAdapter {
  get(key: string): Promise<unknown | undefined>;
  set(key: string, value: unknown): Promise<void>;
}

export interface HttpFetchRequest {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
}

export interface HttpFetchResponse {
  status: number;
  ok: boolean;
  headers?: Record<string, string>;
  data: unknown;
}

export type HttpFetchAdapter = (request: HttpFetchRequest) => Promise<HttpFetchResponse>;

export interface FileArtifact {
  id: string;
  type: string;
  filename?: string;
  mimeType?: string;
  uri?: string;
  data?: unknown;
}

export interface ExportCsvRequest {
  filename?: string;
  rows: Array<Record<string, unknown>>;
}

export interface ExportPdfRequest {
  filename?: string;
  title?: string;
  sections?: Array<{
    heading: string;
    content: string;
  }>;
}

export interface FileExportResult {
  artifact: FileArtifact;
}

export interface FileExportAdapter {
  exportCsv(request: ExportCsvRequest): Promise<FileExportResult>;
  exportPdf(request: ExportPdfRequest): Promise<FileExportResult>;
}

export function createStorageTools(adapter: StorageToolAdapter): ToolContract[] {
  const getTool: ToolContract = {
    toolId: 'storage.get',
    description: 'Read a value from app storage by key.',
    schema: {
      key: { type: 'string', required: true },
    },
    metadata: {
      timeoutMs: 3000,
      retries: 0,
      idempotent: true,
    },
    handler: async (input) => {
      const key = String(input.key);
      const value = await adapter.get(key);
      return {
        key,
        found: value !== undefined,
        value: value ?? null,
      };
    },
  };

  const setTool: ToolContract = {
    toolId: 'storage.set',
    description: 'Persist a value in app storage by key.',
    schema: {
      key: { type: 'string', required: true },
      payload: { type: 'object', required: true },
    },
    metadata: {
      timeoutMs: 3000,
      retries: 0,
      idempotent: false,
    },
    handler: async (input) => {
      const key = String(input.key);
      const payload = input.payload;
      await adapter.set(key, payload);
      return {
        key,
        ok: true,
      };
    },
  };

  return [getTool, setTool];
}

export function createHttpFetchTool(adapter?: HttpFetchAdapter): ToolContract {
  const fetchAdapter: HttpFetchAdapter = adapter ?? defaultHttpAdapter;

  return {
    toolId: 'http.fetch',
    description: 'Fetch remote HTTP data.',
    schema: {
      url: { type: 'string', required: true },
      method: { type: 'string', required: false },
      headers: { type: 'object', required: false },
      body: { type: 'object', required: false },
    },
    metadata: {
      timeoutMs: 10000,
      retries: 1,
      idempotent: true,
    },
    handler: async (input) => {
      return fetchAdapter({
        url: String(input.url),
        method: typeof input.method === 'string' ? input.method : 'GET',
        headers: isObject(input.headers) ? (input.headers as Record<string, string>) : undefined,
        body: input.body,
      });
    },
  };
}

export function createFileExportTools(adapter?: FileExportAdapter): ToolContract[] {
  const exportAdapter = adapter ?? defaultFileExportAdapter;

  const exportCsvTool: ToolContract = {
    toolId: 'file.export_csv',
    description: 'Export structured rows as a CSV artifact.',
    schema: {
      filename: { type: 'string', required: false },
      rows: { type: 'array', required: true },
    },
    metadata: {
      timeoutMs: 10000,
      retries: 0,
      idempotent: true,
    },
    handler: async (input) => {
      const rows = Array.isArray(input.rows) ? (input.rows as Array<Record<string, unknown>>) : [];
      return exportAdapter.exportCsv({
        filename: typeof input.filename === 'string' ? input.filename : undefined,
        rows,
      });
    },
  };

  const exportPdfTool: ToolContract = {
    toolId: 'file.export_pdf',
    description: 'Export plan sections as a PDF artifact.',
    schema: {
      filename: { type: 'string', required: false },
      title: { type: 'string', required: false },
      sections: { type: 'array', required: true },
    },
    metadata: {
      timeoutMs: 10000,
      retries: 0,
      idempotent: true,
    },
    handler: async (input) => {
      const sections = Array.isArray(input.sections)
        ? (input.sections as Array<{ heading: string; content: string }>)
        : [];
      return exportAdapter.exportPdf({
        filename: typeof input.filename === 'string' ? input.filename : undefined,
        title: typeof input.title === 'string' ? input.title : undefined,
        sections,
      });
    },
  };

  return [exportCsvTool, exportPdfTool];
}

async function defaultHttpAdapter(request: HttpFetchRequest): Promise<HttpFetchResponse> {
  const init: RequestInit = {
    method: request.method ?? 'GET',
    headers: request.headers,
  };

  if (request.body !== undefined) {
    init.body = JSON.stringify(request.body);
    init.headers = {
      'Content-Type': 'application/json',
      ...(request.headers ?? {}),
    };
  }

  const response = await fetch(request.url, init);
  const contentType = response.headers.get('content-type') ?? '';
  const data = contentType.includes('application/json') ? await response.json() : await response.text();
  const headers: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    headers[key] = value;
  });

  return {
    status: response.status,
    ok: response.ok,
    headers,
    data,
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const defaultFileExportAdapter: FileExportAdapter = {
  async exportCsv(request) {
    const csv = toCsv(request.rows);
    const filename = request.filename ?? `responseos-export-${Date.now()}.csv`;
    return {
      artifact: {
        id: generateArtifactId('csv'),
        type: 'csv',
        filename,
        mimeType: 'text/csv',
        uri: `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`,
        data: csv,
      },
    };
  },

  async exportPdf(request) {
    const title = request.title ?? 'ResponseOS Export';
    const sections = request.sections ?? [];
    const text = [title, ...sections.map((section) => `${section.heading}\n${section.content}`)].join('\n\n');
    const filename = request.filename ?? `responseos-export-${Date.now()}.pdf`;

    return {
      artifact: {
        id: generateArtifactId('pdf'),
        type: 'pdf',
        filename,
        mimeType: 'application/pdf',
        data: {
          title,
          sections,
          text,
        },
      },
    };
  },
};

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

function generateArtifactId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `artifact_${prefix}_${Date.now().toString(36)}_${rand}`;
}
