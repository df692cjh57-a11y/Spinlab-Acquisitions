import { Router, type IRouter } from "express";
import healthRouter from "./health";
import dealsRouter from "./deals";
import brokersRouter from "./brokers";
import remindersRouter from "./reminders";
import notesRouter from "./notes";
import documentsRouter from "./documents";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(dashboardRouter);
router.use(dealsRouter);
router.use(brokersRouter);
router.use(remindersRouter);
router.use(notesRouter);
router.use(documentsRouter);

export default router;
