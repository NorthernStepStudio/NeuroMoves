import { Router } from "express";
import { z } from "zod";
import {
  type ProposalRefinementType
} from "../../../../../dist/index.js";
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

export const createBoostRouter = () => {
  const router = Router();

  router.post("/api/proposals/refine", async (req, res) => {
    try {
      const payload = refinePayloadSchema.parse(req.body);
      const output = await runBoostModeLocally("refine", {
        proposal: payload.proposal,
        refinementType: payload.refinementType
      });
      if (output.status !== "ok") {
        res.status(400).json({ error: output.message });
        return;
      }

      res.json({
        proposal: extractProposalJson(output),
        warnings: output.debug ?? {},
        output
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to refine proposal";
      res.status(400).json({ error: message });
    }
  });

  router.post("/api/proposals/translate", async (req, res) => {
    try {
      const payload = translatePayloadSchema.parse(req.body);
      const output = await runBoostModeLocally("translate", {
        proposal: payload.proposal,
        targetLanguage: payload.targetLanguage
      });
      if (output.status !== "ok") {
        res.status(400).json({ error: output.message });
        return;
      }

      res.json({
        proposal: extractProposalJson(output),
        output
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to translate proposal";
      res.status(400).json({ error: message });
    }
  });

  router.post("/api/proposals/qa", async (req, res) => {
    try {
      const payload = qaPayloadSchema.parse(req.body);
      const output = await runBoostModeLocally("qa", {
        proposal: payload.proposal,
        intake: payload.intake
      });
      if (output.status !== "ok") {
        res.status(400).json({ error: output.message });
        return;
      }

      res.json({
        proposal: extractProposalJson(output),
        qa: isObject(output.data) ? output.data.qa_report ?? null : null,
        output
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to run proposal QA";
      res.status(400).json({ error: message });
    }
  });

  return router;
};
