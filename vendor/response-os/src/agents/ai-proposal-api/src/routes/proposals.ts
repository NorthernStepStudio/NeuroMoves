import multer from "multer";
import { Router } from "express";
import { z } from "zod";
import {
  buildDeterministicProposal,
  extractJsonObject,
  sanitizeGeminiDraft
} from "@nss/proposal-core";
import { generateGeminiDraft } from "../services/geminiService.js";
import { ProposalAgent, type ProposalAgentInput } from "../../../../../dist/index.js";
import { createProposalPdfBuffer } from "../services/pdfService.js";
import {
  listClients,
  loadProposal,
  saveProposal,
  upsertClient,
  writePdfFile
} from "../services/localStoreService.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 8 * 1024 * 1024,
    files: 3
  },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      cb(new Error("Only image uploads are allowed."));
      return;
    }

    cb(null, true);
  }
});

const settingsSchema = z.object({
  taxRate: z.number().min(0).max(20),
  contingencyRate: z.number().min(0).max(30),
  depositRate: z.number().min(10).max(60),
  timelineDays: z.number().int().min(1).max(120),
  validityDays: z.number().int().min(7).max(120),
  includePermitAllowance: z.boolean()
});

const intelSchema = z.any().nullable();
const entitlementSchema = z.object({
  tier: z.enum(["free", "pro"]),
  source: z.literal("local-placeholder"),
  expiresAt: z.string().optional()
});

const defaultSettings = {
  taxRate: 0,
  contingencyRate: 10,
  depositRate: 35,
  timelineDays: 21,
  validityDays: 30,
  includePermitAllowance: true
} as const;

const defaultContractor = {
  companyName: "NSS Contractor",
  contactName: "Project Lead",
  email: "",
  phone: "",
  licenseNumber: ""
} as const;

const defaultClient = {
  name: "Client",
  email: "",
  phone: "",
  address: ""
} as const;

const defaultEntitlement = {
  tier: "free",
  source: "local-placeholder"
} as const;

const payloadSchema = z.object({
  description: z.string().max(5000).optional().default(""),
  contractor: z
    .object({
    companyName: z.string().min(1),
    contactName: z.string().min(1),
    email: z.string().optional().default(""),
    phone: z.string().optional().default(""),
    licenseNumber: z.string().optional().default("")
    })
    .optional()
    .default(defaultContractor),
  client: z
    .object({
    name: z.string().min(1),
    email: z.string().optional().default(""),
    phone: z.string().optional().default(""),
    address: z.string().optional().default("")
    })
    .optional()
    .default(defaultClient),
  settings: settingsSchema.optional().default(defaultSettings),
  language: z.enum(["en", "es", "it"]).default("en"),
  intel: intelSchema.default(null),
  entitlementState: entitlementSchema.optional().default(defaultEntitlement),
  historySignals: z
    .object({
      projectTypeMedianTotal: z.number().nullable(),
      projectTypeMedianPerSqFt: z.number().nullable(),
      sampleSize: z.number(),
      lastUpdatedAt: z.string()
    })
    .optional(),
  responseOs: z.unknown().optional()
});

const renderPdfSchema = z.object({
  proposal: z.unknown(),
  proposalId: z.string().trim().min(1).max(120).optional(),
  output: z.enum(["bytes", "path"]).default("bytes")
});

const saveProposalSchema = z.object({
  proposal: z.unknown()
});

const proposalIdParamSchema = z.object({
  id: z.string().trim().min(1).max(120)
});

const clientUpsertSchema = z.object({
  id: z.string().trim().min(1).max(120).optional(),
  name: z.string().trim().min(1).max(160),
  email: z.string().trim().optional().default(""),
  phone: z.string().trim().optional().default(""),
  address: z.string().trim().optional().default(""),
  notes: z.string().trim().optional().default("")
});

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const getResponseOsGoal = (responseOs: unknown): string | null => {
  if (!isObject(responseOs)) {
    return null;
  }
  if (typeof responseOs.goal === "string" && responseOs.goal.trim()) {
    return responseOs.goal.trim();
  }
  return null;
};

const parseGeneratePayload = (body: unknown): unknown => {
  if (isObject(body) && typeof body.payload === "string") {
    return JSON.parse(body.payload);
  }
  return body;
};

export const createProposalRouter = () => {
  const router = Router();

  router.post(
    "/v1/proposals/generate",
    upload.array("images", 3),
    async (req, res) => {
      try {
        const payloadJson = parseGeneratePayload(req.body);
        const payload = payloadSchema.parse(payloadJson);
        const files = (req.files as Express.Multer.File[] | undefined) ?? [];
        const effectiveDescription =
          payload.description.trim() ||
          getResponseOsGoal(payload.responseOs) ||
          "Contractor proposal scope";

        if (payload.responseOs && isObject(payload.responseOs)) {
          const responseOsInput = payload.responseOs as unknown as ProposalAgentInput;
          if (!responseOsInput.goal || !responseOsInput.goal.trim()) {
            responseOsInput.goal = effectiveDescription;
          }
          if (typeof responseOsInput.goal === "string" && responseOsInput.goal.trim()) {
            const agent = new ProposalAgent({
              appId: "nss-contractor-proposal-engine"
            });
            const output = await agent.propose(responseOsInput);
            if (output.status === "ok") {
              res.json(output);
              return;
            }
          }
        }

        const gemini = await generateGeminiDraft({
          description: effectiveDescription,
          timelineDays: payload.settings.timelineDays,
          validityDays: payload.settings.validityDays,
          contractorName: payload.contractor.companyName || payload.contractor.contactName,
          clientName: payload.client.name,
          includePermitAllowance: payload.settings.includePermitAllowance,
          language: payload.language,
          images: files
        });

        const geminiDraft = gemini?.draft ? sanitizeGeminiDraft(extractJsonObject(gemini.draft)) : null;

        const proposal = buildDeterministicProposal({
          description: effectiveDescription,
          photoCount: files.length,
          contractor: payload.contractor,
          client: payload.client,
          settings: payload.settings,
          intel: payload.intel,
          geminiDraft,
          aiModel: gemini?.model,
          language: payload.language,
          platform: "web",
          historySignals: payload.historySignals
        });

        res.json(proposal);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to generate proposal";
        res.status(400).json({ error: message });
      }
    }
  );

  router.post("/v1/proposals/render/pdf", async (req, res) => {
    try {
      const payload = renderPdfSchema.parse(req.body);
      const pdfBuffer = createProposalPdfBuffer(payload.proposal);
      const proposalId = payload.proposalId || `proposal_${Date.now()}`;

      if (payload.output === "path") {
        const filePath = await writePdfFile(proposalId, pdfBuffer);
        res.json({
          proposalId,
          path: filePath,
          bytes: pdfBuffer.byteLength
        });
        return;
      }

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${proposalId}.pdf"`);
      res.send(pdfBuffer);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to render proposal PDF";
      res.status(400).json({ error: message });
    }
  });

  router.get("/v1/proposals/:id", async (req, res) => {
    try {
      const { id } = proposalIdParamSchema.parse(req.params);
      const record = await loadProposal(id);
      if (!record) {
        res.status(404).json({ error: "Proposal not found." });
        return;
      }

      res.json(record);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to fetch proposal";
      res.status(400).json({ error: message });
    }
  });

  router.post("/v1/proposals/:id/save", async (req, res) => {
    try {
      const { id } = proposalIdParamSchema.parse(req.params);
      const payload = saveProposalSchema.parse(req.body);
      const record = await saveProposal(id, payload.proposal);
      res.json(record);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save proposal";
      res.status(400).json({ error: message });
    }
  });

  router.get("/v1/clients", async (_req, res) => {
    try {
      const clients = await listClients();
      res.json({
        clients
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load clients";
      res.status(400).json({ error: message });
    }
  });

  router.post("/v1/clients/upsert", async (req, res) => {
    try {
      const payload = clientUpsertSchema.parse(req.body);
      const client = await upsertClient(payload);
      res.json({
        client
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to upsert client";
      res.status(400).json({ error: message });
    }
  });

  return router;
};
