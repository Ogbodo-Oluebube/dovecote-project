import { Router } from "express";
import { body, param } from "express-validator";
import { protect, requireRole } from "../middleware/auth.js";
import validate from "../middleware/validate.js";
import { listUsers, setRole } from "../controllers/admin.controller.js";

const router = Router();
router.use(protect, requireRole("admin"));

router.get("/users", listUsers);
router.patch(
  "/users/:id/role",
  [
    param("id").isMongoId().withMessage("Invalid user ID"),
    body("role").isIn(["user", "admin"]).withMessage("Role must be user or admin"),
  ],
  validate,
  setRole
);

export default router;
