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

// Serve the built React frontend when the dist directory exists (Railway / production).
// Uses fs.existsSync so it works regardless of NODE_ENV value.
const __serverDir = path.dirname(fileURLToPath(import.meta.url));
const frontendDist = path.resolve(__serverDir, "../../vcm/dist/public");

if (fs.existsSync(frontendDist)) {
  logger.info({ frontendDist }, "Serving frontend static files");
  app.use(express.static(frontendDist));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(frontendDist, "index.html"));
  });
} else {
  logger.info({ frontendDist }, "Frontend dist not found — skipping static serving (dev mode)");
}

export default app;
