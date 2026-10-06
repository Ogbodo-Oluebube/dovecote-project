import { Router } from "express";
import { param } from "express-validator";
import { protect } from "../middleware/auth.js";
import validate from "../middleware/validate.js";
import { listInbox, markRead } from "../controllers/inbox.controller.js";

const router = Router();
router.use(protect);

router.get("/", listInbox);
router.patch("/:id/read", param("id").isMongoId().withMessage("Invalid message ID"), validate, markRead);

export default router;
