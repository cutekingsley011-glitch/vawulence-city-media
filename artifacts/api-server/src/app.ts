import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

// Locate the built React frontend.
// Try multiple candidate paths — whichever exists on this deployment wins.
// Candidates ordered by reliability:
//   1. Explicit env override (set FRONTEND_DIST in Railway if needed)
//   2. import.meta.url — always points to the bundled file, works in ESM regardless of cwd
//   3. cwd-relative — works on Railway (start cmd runs from repo root)
const bundleDir = path.dirname(fileURLToPath(import.meta.url));
const candidatePaths: string[] = [
  ...(process.env.FRONTEND_DIST ? [process.env.FRONTEND_DIST] : []),
  path.resolve(bundleDir, "../../vcm/dist/public"),
  path.join(process.cwd(), "artifacts", "vcm", "dist", "public"),
  "/app/artifacts/vcm/dist/public",          // Nixpacks/Railway default root
  "/workspace/artifacts/vcm/dist/public",    // alternate Railway layout
];

const frontendDist = candidatePaths.find((p) => fs.existsSync(p));

logger.info({ candidatePaths, frontendDist: frontendDist ?? null }, "Frontend dist resolution");

if (frontendDist) {
  app.use(express.static(frontendDist));
  app.get("/{*path}", (_req, res) => {
    res.sendFile(path.join(frontendDist, "index.html"));
  });
}

export default app;
