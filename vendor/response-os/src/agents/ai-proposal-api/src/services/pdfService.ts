const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const escapePdfText = (value: string): string =>
  value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");

const wrapLine = (value: string, maxLength = 94): string[] => {
  const normalized = value.trim().replace(/\s+/g, " ");
  if (!normalized) return [""];

  const words = normalized.split(" ");
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxLength) {
      current = candidate;
      continue;
    }
    lines.push(current);
    current = word;
  }

  if (current) {
    lines.push(current);
  }

  return lines;
};

const toReadableLines = (proposal: unknown): string[] => {
  if (!isObject(proposal)) {
    return ["Contractor Proposal", "No structured proposal payload was provided."];
  }

  const lines: string[] = [];

  const meta = isObject(proposal.meta) ? proposal.meta : null;
  const client = isObject(proposal.client) ? proposal.client : null;
  const project = isObject(proposal.project) ? proposal.project : null;
  const sections = Array.isArray(proposal.sections) ? proposal.sections : [];
  const lineItems = Array.isArray(proposal.line_items) ? proposal.line_items : [];
  const exclusions = Array.isArray(proposal.exclusions) ? proposal.exclusions : [];
  const assumptions = Array.isArray(proposal.assumptions) ? proposal.assumptions : [];

  lines.push("NSS Contractor Proposal");

  if (meta && typeof meta.proposal_id === "string" && meta.proposal_id.trim()) {
    lines.push(`Proposal ID: ${meta.proposal_id}`);
  }
  if (meta && typeof meta.trade === "string" && meta.trade.trim()) {
    lines.push(`Trade: ${meta.trade}`);
  }

  lines.push("");
  lines.push("Client");
  if (client && typeof client.name === "string") {
    lines.push(`Name: ${client.name}`);
  }
  if (client && typeof client.address === "string" && client.address.trim()) {
    lines.push(`Address: ${client.address}`);
  }

  lines.push("");
  lines.push("Project");
  if (project && typeof project.title === "string") {
    lines.push(`Title: ${project.title}`);
  }
  if (project && typeof project.summary === "string" && project.summary.trim()) {
    lines.push(project.summary);
  }

  if (sections.length > 0) {
    lines.push("");
    lines.push("Scope");
    for (const section of sections) {
      if (!isObject(section)) continue;
      const title = typeof section.title === "string" ? section.title : "Section";
      lines.push(`- ${title}`);
      const items = Array.isArray(section.items) ? section.items : [];
      for (const item of items) {
        if (typeof item === "string" && item.trim()) {
          lines.push(`  * ${item.trim()}`);
        }
      }
    }
  }

  if (lineItems.length > 0) {
    lines.push("");
    lines.push("Pricing");
    for (const entry of lineItems) {
      if (!isObject(entry)) continue;
      const description =
        (typeof entry.description === "string" && entry.description) ||
        (typeof entry.name === "string" && entry.name) ||
        "Line Item";
      const total =
        typeof entry.total === "number"
          ? entry.total.toFixed(2)
          : typeof entry.total === "string"
          ? entry.total
          : "0.00";
      lines.push(`- ${description}: $${total}`);
    }
  }

  if (exclusions.length > 0) {
    lines.push("");
    lines.push("Exclusions");
    for (const exclusion of exclusions) {
      if (typeof exclusion === "string" && exclusion.trim()) {
        lines.push(`- ${exclusion.trim()}`);
      }
    }
  }

  if (assumptions.length > 0) {
    lines.push("");
    lines.push("Assumptions");
    for (const assumption of assumptions) {
      if (typeof assumption === "string" && assumption.trim()) {
        lines.push(`- ${assumption.trim()}`);
      }
    }
  }

  return lines.flatMap((line) => wrapLine(line));
};

const buildSinglePagePdf = (lines: string[]): Buffer => {
  const capped = lines.slice(0, 50);
  if (lines.length > capped.length) {
    capped.push("...");
    capped.push("Additional content was truncated for the one-page local PDF export.");
  }

  const content = [
    "BT",
    "/F1 10 Tf",
    "14 TL",
    "50 770 Td",
    ...capped.map((line, index) =>
      index === 0 ? `(${escapePdfText(line)}) Tj` : `T* (${escapePdfText(line)}) Tj`
    ),
    "ET"
  ].join("\n");

  const objects = [
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj",
    "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj",
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj",
    "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj",
    `5 0 obj\n<< /Length ${Buffer.byteLength(content, "utf8")} >>\nstream\n${content}\nendstream\nendobj`
  ];

  let payload = "%PDF-1.4\n";
  const offsets: number[] = [0];

  for (const object of objects) {
    offsets.push(Buffer.byteLength(payload, "utf8"));
    payload += `${object}\n`;
  }

  const xrefOffset = Buffer.byteLength(payload, "utf8");
  payload += `xref\n0 ${objects.length + 1}\n`;
  payload += "0000000000 65535 f \n";
  for (const offset of offsets.slice(1)) {
    payload += `${offset.toString().padStart(10, "0")} 00000 n \n`;
  }
  payload += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(payload, "utf8");
};

export const createProposalPdfBuffer = (proposal: unknown): Buffer => {
  const lines = toReadableLines(proposal);
  return buildSinglePagePdf(lines);
};
