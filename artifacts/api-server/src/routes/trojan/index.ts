import { Router, raw, type IRouter } from "express";
import { GET as status } from "./status/route";
import { POST as onboard } from "./onboard/route";
import { POST as interview } from "./interview/route";
import { POST as roadmap } from "./roadmap/route";
import { POST as radar } from "./radar/route";
import { POST as advice } from "./advice/route";

const router: IRouter = Router();
const handlers: Record<string, (request: Request) => Promise<Response>> = {
  onboard, interview, roadmap, radar, advice,
};

router.get("/status", async (_req, res) => {
  const response = await status();
  res.status(response.status).json(await response.json());
});

// Keep multipart bytes intact for the standard FormData parser. Uploaded documents
// are used only for this request, just as in the imported app.
router.post(
  "/:action",
  raw({ type: "multipart/form-data", limit: "50mb" }),
  async (req, res, next) => {
    const handler = handlers[String(req.params.action)];
    if (!handler) return next();
    try {
      const request = new Request(`http://api.internal/api/${req.params.action}`, {
        method: "POST",
        headers: { "content-type": req.headers["content-type"] ?? "application/json" },
        body: Buffer.isBuffer(req.body) ? req.body : JSON.stringify(req.body ?? {}),
      });
      const response = await handler(request);
      res.status(response.status);
      response.headers.forEach((value, key) => res.setHeader(key, value));
      res.send(await response.text());
    } catch (err) {
      req.log.error({ err }, "Trojan Arc request failed");
      res.status(400).json({ error: "Unable to process the request. Check your input and try again." });
    }
  },
);

export default router;
