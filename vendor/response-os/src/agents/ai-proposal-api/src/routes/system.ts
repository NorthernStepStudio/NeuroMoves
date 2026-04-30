import { Router } from "express";

export const createSystemRouter = () => {
  const router = Router();

  router.get("/v1/health", (_req, res) => {
    res.json({
      ok: true,
      timestamp: new Date().toISOString(),
      geminiConfigured: Boolean(process.env.GEMINI_API_KEY)
    });
  });

  router.get("/v1/config", (_req, res) => {
    res.json({
      features: {
        proposalGeneration: true,
        publicIntel: true,
        screenshotProtectionHints: true,
        entitlementPlaceholder: true,
        localHistory: true,
        localGatewayStorage: true,
        aiBoostProxy: true
      },
      maxUploadImages: 3,
      supportedLanguages: ["en", "es", "it"],
      themeModes: ["system", "light", "dark"]
    });
  });

  return router;
};
