import { config } from "dotenv";
import cors from "cors";
import express from "express";
import { createProposalRouter } from "./routes/proposals.js";
import { createIntelRouter } from "./routes/intel.js";
import { createSystemRouter } from "./routes/system.js";
import { createBoostRouter } from "./routes/boost.js";
import { createAiRouter } from "./routes/ai.js";
import { rateLimitMiddleware } from "./middleware/rateLimit.js";

config();

const app = express();
const PORT = Number(process.env.PORT ?? 8787);

app.use(
  cors({
    origin: true,
    credentials: false
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(rateLimitMiddleware({ windowMs: 60_000, maxPerWindow: 80 }));

app.use(createSystemRouter());
app.use(createIntelRouter());
app.use(createProposalRouter());
app.use(createAiRouter());
app.use(createBoostRouter());

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const message = error instanceof Error ? error.message : "Unexpected server error";
  res.status(500).json({ error: message });
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`ai-proposal-api listening on ${PORT}`);
});
