import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

export interface StoredProposalRecord {
  id: string;
  savedAt: string;
  proposal: unknown;
}

export interface ClientRecord {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface ClientUpsertInput {
  id?: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
}

const defaultDataRoot = () => path.resolve(process.cwd(), ".nss-gateway-data");

const sanitizeId = (value: string): string => {
  const normalized = value.trim().toLowerCase().replace(/[^a-z0-9_-]+/gi, "-");
  return normalized.replace(/^-+|-+$/g, "").slice(0, 96) || randomUUID();
};

const gatewayDataRoot = (): string => process.env.NSS_GATEWAY_DATA_DIR?.trim() || defaultDataRoot();
const proposalsDir = (): string => path.join(gatewayDataRoot(), "proposals");
const pdfDir = (): string => path.join(gatewayDataRoot(), "pdf");
const clientsFile = (): string => path.join(gatewayDataRoot(), "clients.json");

const ensureDir = async (directory: string): Promise<void> => {
  await fs.mkdir(directory, { recursive: true });
};

const readJsonFile = async <T>(filePath: string, fallback: T): Promise<T> => {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const writeJsonFile = async (filePath: string, payload: unknown): Promise<void> => {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, JSON.stringify(payload, null, 2), "utf8");
};

export const getLocalStorageInfo = () => ({
  root: gatewayDataRoot(),
  proposalsDirectory: proposalsDir(),
  pdfDirectory: pdfDir(),
  clientsPath: clientsFile()
});

export const saveProposal = async (id: string, proposal: unknown): Promise<StoredProposalRecord> => {
  const safeId = sanitizeId(id);
  const record: StoredProposalRecord = {
    id: safeId,
    savedAt: new Date().toISOString(),
    proposal
  };

  await ensureDir(proposalsDir());
  const target = path.join(proposalsDir(), `${safeId}.json`);
  await writeJsonFile(target, record);
  return record;
};

export const loadProposal = async (id: string): Promise<StoredProposalRecord | null> => {
  const safeId = sanitizeId(id);
  const target = path.join(proposalsDir(), `${safeId}.json`);
  const record = await readJsonFile<StoredProposalRecord | null>(target, null);
  return record;
};

const mergeClient = (current: ClientRecord | undefined, next: ClientUpsertInput): ClientRecord => {
  const now = new Date().toISOString();
  if (!current) {
    return {
      id: sanitizeId(next.id || next.name),
      name: next.name.trim(),
      email: (next.email || "").trim(),
      phone: (next.phone || "").trim(),
      address: (next.address || "").trim(),
      notes: (next.notes || "").trim(),
      createdAt: now,
      updatedAt: now
    };
  }

  return {
    ...current,
    name: next.name.trim() || current.name,
    email: next.email?.trim() ?? current.email,
    phone: next.phone?.trim() ?? current.phone,
    address: next.address?.trim() ?? current.address,
    notes: next.notes?.trim() ?? current.notes,
    updatedAt: now
  };
};

export const listClients = async (): Promise<ClientRecord[]> => {
  const clients = await readJsonFile<ClientRecord[]>(clientsFile(), []);
  return [...clients].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
};

export const upsertClient = async (input: ClientUpsertInput): Promise<ClientRecord> => {
  const current = await readJsonFile<ClientRecord[]>(clientsFile(), []);
  const requestedId = input.id ? sanitizeId(input.id) : sanitizeId(input.name);
  const foundIndex = current.findIndex((item) => item.id === requestedId);
  const existing = foundIndex >= 0 ? current[foundIndex] : undefined;
  const updated = mergeClient(existing, {
    ...input,
    id: requestedId
  });

  if (foundIndex >= 0) {
    current[foundIndex] = updated;
  } else {
    current.push(updated);
  }

  await writeJsonFile(clientsFile(), current);
  return updated;
};

export const writePdfFile = async (proposalId: string, buffer: Buffer): Promise<string> => {
  const safeId = sanitizeId(proposalId);
  await ensureDir(pdfDir());
  const target = path.join(pdfDir(), `${safeId}.pdf`);
  await fs.writeFile(target, buffer);
  return target;
};
