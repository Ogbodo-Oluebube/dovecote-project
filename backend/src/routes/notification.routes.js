import { Router } from "express";
import { body, param } from "express-validator";
import { protect } from "../middleware/auth.js";
import validate from "../middleware/validate.js";
import {
  createNotification, listNotifications, getNotification,
  getAttempts, retryNotification, cancelNotification,
} from "../controllers/notification.controller.js";

const router = Router();
router.use(protect);

const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const idRule = param("id").isMongoId().withMessage("Invalid notification ID");

const createRules = [
  body("channel").isIn(["email", "sms", "in_app"]).withMessage("Channel must be email, sms or in_app"),
  body("recipient")
    .trim()
    .notEmpty().withMessage("Recipient is required")
    .custom((value, { req }) => {
      if (req.body.channel === "sms" && !/^\+?\d{7,15}$/.test(value)) {
        throw new Error("Enter a valid phone number, e.g. +2348012345678");
      }
      if (["email", "in_app"].includes(req.body.channel) && !emailRx.test(value)) {
        throw new Error("Enter a valid recipient email");
      }
      return true;
    }),
  body("subject")
    .if(body("channel").equals("email"))
    .if(body("templateId").not().exists())
    .trim().notEmpty().withMessage("Subject is required for email"),
  body("message")
    .if(body("templateId").not().exists())
    .trim()
    .notEmpty().withMessage("Message is required")
    .isLength({ max: 2000 }).withMessage("Message is too long (max 2000 characters)"),
  body("templateId").optional().isMongoId().withMessage("Invalid template ID"),
  body("variables").optional().isObject().withMessage("variables must be an object"),
  body("scheduledFor")
    .optional({ values: "falsy" })
    .isISO8601().withMessage("scheduledFor must be a valid date")
    .bail()
    .custom((v) => new Date(v) > new Date()).withMessage("scheduledFor must be in the future"),
  body("priority").optional().isInt({ min: 0, max: 2 }).withMessage("Priority must be 0, 1 or 2"),
];

router.post("/", createRules, validate, createNotification);
router.get("/", listNotifications);
router.get("/:id", idRule, validate, getNotification);
router.get("/:id/attempts", idRule, validate, getAttempts);
router.post("/:id/retry", idRule, validate, retryNotification);
router.post("/:id/cancel", idRule, validate, cancelNotification);

export default router;
