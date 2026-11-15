import { Router, type IRouter } from "express";
import healthRouter from "./health";
import trojanRouter from "./trojan";

const router: IRouter = Router();

router.use(healthRouter);
router.use(trojanRouter);

export default router;
