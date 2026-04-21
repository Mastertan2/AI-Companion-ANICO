import { Router, type IRouter } from "express";
import healthRouter from "./health";
import chatRouter from "./chat";
import transcribeRouter from "./transcribe";
import alertRouter from "./alert";

const router: IRouter = Router();

router.use(healthRouter);
router.use(chatRouter);
router.use(transcribeRouter);
router.use(alertRouter);

export default router;
