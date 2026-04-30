import { Router } from "express";
import { z } from "zod";
import type { ProposalRefinementType } from "../../../../../dist/index.js";
import { callCloudBoost, isCloudAiConfigured } from "../services/cloudAiService.js";
import {
  extractProposalJson,
  isObject,
  runBoostModeLocally
} from "../services/proposalBoostService.js";

const refinePayloadSchema = z.object({
  proposal: z.unknown(),
  refinementType: z
    .enum(["clarity", "persuasion", "executive_summary", "scope_tightening", "missing_info"])
    .optional()
});

const translatePayloadSchema = z.object({
  proposal: z.unknown(),
  targetLanguage: z.enum(["en", "es", "it"])
});

const qaPayloadSchema = z.object({
  proposal: z.unknown(),
  intake: z.unknown().optional()
});

type RefinePayload = {
  proposal: unknown;
  refinementType?: ProposalRefinementType;
};

type TranslatePayload = {
  proposal: unknown;
  targetLanguage: "en" | "es" | "it";
};

type QaPayload = {
  proposal: unknown;
  intake?: unknown;
};

const runLocalRefine = async (payload: RefinePayload) => {
  const output = await runBoostModeLocally("refine", payload);
  if (output.status !== "ok") {
    throw new Error(output.message);
  }
  return {
    proposal: extractProposalJson(output),
    output,
    source: "local"
  };
};

const runLocalTranslate = async (payload: TranslatePayload) => {
  const output = await runBoostModeLocally("translate", payload);
  if (output.status !== "ok") {
    throw new Error(output.message);
  }
  return {
    proposal: extractProposalJson(output),
    output,
    source: "local"
  };
};

const runLocalQa = async (payload: QaPayload) => {
  const output = await runBoostModeLocally("qa", payload);
  if (output.status !== "ok") {
    throw new Error(output.message);
  }
  return {
    proposal: extractProposalJson(output),
    qa: isObject(output.data) ? output.data.qa_report ?? null : null,
    output,
    source: "local"
  };
};

const hasProposalPayload = (value: unknown): value is { proposal: unknown } =>
  isObject(value) && "proposal" in value;

export const createAiRouter = () => {
  const router = Router();

  router.post("/v1/ai/refine", async (req, res) => {
    try {
      const parsed = refinePayloadSchema.parse(req.body);
      const payload: RefinePayload = {
        proposal: parsed.proposal,
        refinementType: parsed.refinementType
      };

      if (isCloudAiConfigured()) {
        try {
          const cloudResult = await callCloudBoost("refine", payload);
          if (hasProposalPayload(cloudResult)) {
            res.json({
              ...(isObject(cloudResult) ? cloudResult : { data: cloudResult }),
              source: "cloud"
            });
            return;
          }
          throw new Error("Cloud refine response missing proposal payload.");
        } catch (error) {
          const fallback = await runLocalRefine(payload);
          res.json({
            ...fallback,
            warning: `Cloud refine unavailable. Local fallback used. ${error instanceof Error ? error.message : ""}`.trim()
          });
          return;
        }
      }

      const localResult = await runLocalRefine(payload);
      res.json(localResult);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to refine proposal";
      res.status(400).json({ error: message });
    }
  });

  router.post("/v1/ai/translate", async (req, res) => {
    try {
      const parsed = translatePayloadSchema.parse(req.body);
      const payload: TranslatePayload = {
        proposal: parsed.proposal,
        targetLanguage: parsed.targetLanguage
      };

      if (isCloudAiConfigured()) {
        try {
          const cloudResult = await callCloudBoost("translate", payload);
          if (hasProposalPayload(cloudResult)) {
            res.json({
              ...(isObject(cloudResult) ? cloudResult : { data: cloudResult }),
              source: "cloud"
            });
            return;
          }
          throw new Error("Cloud translate response missing proposal payload.");
        } catch (error) {
          const fallback = await runLocalTranslate(payload);
          res.json({
            ...fallback,
            warning: `Cloud translate unavailable. Local fallback used. ${error instanceof Error ? error.message : ""}`.trim()
          });
          return;
        }
      }

      const localResult = await runLocalTranslate(payload);
      res.json(localResult);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to translate proposal";
      res.status(400).json({ error: message });
    }
  });

  router.post("/v1/ai/qa", async (req, res) => {
    try {
      const parsed = qaPayloadSchema.parse(req.body);
      const payload: QaPayload = {
        proposal: parsed.proposal,
        intake: parsed.intake
      };

      if (isCloudAiConfigured()) {
        try {
          const cloudResult = await callCloudBoost("qa", payload);
          if (hasProposalPayload(cloudResult)) {
            res.json({
              ...(isObject(cloudResult) ? cloudResult : { data: cloudResult }),
              source: "cloud"
            });
            return;
          }
          throw new Error("Cloud QA response missing proposal payload.");
        } catch (error) {
          const fallback = await runLocalQa(payload);
          res.json({
            ...fallback,
            warning: `Cloud QA unavailable. Local fallback used. ${error instanceof Error ? error.message : ""}`.trim()
          });
          return;
        }
      }

      const localResult = await runLocalQa(payload);
      res.json(localResult);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to run proposal QA";
      res.status(400).json({ error: message });
    }
  });

  return router;
};
