import type { RequestHandler } from "express";

interface Bucket {
  count: number;
  startedAt: number;
}

const buckets = new Map<string, Bucket>();

export const rateLimitMiddleware = ({
  windowMs,
  maxPerWindow
}: {
  windowMs: number;
  maxPerWindow: number;
}): RequestHandler => {
  return (req, res, next) => {
    const ip = req.ip || req.headers["x-forwarded-for"]?.toString() || "unknown";
    const now = Date.now();
    const bucket = buckets.get(ip);

    if (!bucket || now - bucket.startedAt > windowMs) {
      buckets.set(ip, { count: 1, startedAt: now });
      next();
      return;
    }

    if (bucket.count >= maxPerWindow) {
      res.status(429).json({ error: "Rate limit exceeded. Try again soon." });
      return;
    }

    bucket.count += 1;
    next();
  };
};
