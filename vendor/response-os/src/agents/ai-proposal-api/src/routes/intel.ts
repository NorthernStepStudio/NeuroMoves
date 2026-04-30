import { Router } from "express";
import { z } from "zod";
import { fetchPublicProposalIntel } from "../services/intelService.js";

const payloadSchema = z.object({
  locationQuery: z.string().min(1).max(180).optional(),
  timelineDays: z.number().int().min(1).max(120),
  language: z.enum(["en", "es", "it"]).default("en")
});

export const createIntelRouter = () => {
  const router = Router();

  router.post("/v1/intel/fetch", async (req, res) => {
    try {
      const payload = payloadSchema.parse(req.body);
      const result = await fetchPublicProposalIntel(
        payload.locationQuery ?? "United States",
        payload.timelineDays,
        payload.language
      );
      res.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to fetch intel";
      res.status(400).json({ error: message });
    }
  });

  return router;
};
