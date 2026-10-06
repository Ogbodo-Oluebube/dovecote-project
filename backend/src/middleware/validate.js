import { validationResult } from "express-validator";
import { fail } from "../utils/response.js";

// Runs after express-validator's rule chains. If any rule failed, respond
// with a single combined message instead of letting the request continue.
export default function validate(req, res, next) {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();
  return fail(res, 400, errors.array().map((e) => e.msg).join(", "));
}
