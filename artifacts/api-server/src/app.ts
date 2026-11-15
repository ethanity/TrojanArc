import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { liveAI } from "./lib/claude";
import { createAiRateLimitMiddleware } from "./middlewares/ai-rate-limit";

const app: Express = express();

// The app is served behind one trusted Replit ingress proxy in production.
app.set("trust proxy", 1);

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
app.use("/api", createAiRateLimitMiddleware(liveAI));
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

app.use((err: unknown, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err instanceof Error && "type" in err && err.type === "entity.too.large") {
    res.status(413).json({ error: "Request body too large. Reduce the request size and try again." });
    return;
  }
  next(err);
});

export default app;
