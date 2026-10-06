import { Router } from "express";
import { body, param } from "express-validator";
import { protect } from "../middleware/auth.js";
import validate from "../middleware/validate.js";
import {
  listTemplates, createTemplate, updateTemplate, deleteTemplate,
} from "../controllers/template.controller.js";

const router = Router();
router.use(protect);

const rules = [
  body("name").trim().notEmpty().withMessage("Template name is required"),
  body("channel").isIn(["email", "sms", "in_app"]).withMessage("Invalid channel"),
  body("body").trim().notEmpty().withMessage("Template body is required"),
];
const idRule = param("id").isMongoId().withMessage("Invalid template ID");

router.get("/", listTemplates);
router.post("/", rules, validate, createTemplate);
router.put("/:id", idRule, rules, validate, updateTemplate);
router.delete("/:id", idRule, validate, deleteTemplate);

export default router;
