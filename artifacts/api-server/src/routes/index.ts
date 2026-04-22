import { Router, type IRouter } from "express";
import healthRouter from "./health";
import chatRouter from "./chat";
import transcribeRouter from "./transcribe";
import alertRouter from "./alert";
import normalizeRouter from "./normalize";

const router: IRouter = Router();

router.use(healthRouter);
router.use(chatRouter);
router.use(transcribeRouter);
router.use(alertRouter);
router.use(normalizeRouter);

export default router;
