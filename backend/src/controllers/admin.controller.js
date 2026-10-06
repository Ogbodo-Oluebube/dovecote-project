import User from "../models/User.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { ok } from "../utils/response.js";

export const listUsers = asyncHandler(async (req, res) => {
  ok(res, "Users fetched", await User.find().sort({ createdAt: -1 }));
});

export const setRole = asyncHandler(async (req, res) => {
  if (req.params.id === String(req.user._id)) {
    throw new ApiError(400, "You cannot change your own role");
  }
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { role: req.body.role },
    { new: true, runValidators: true }
  );
  if (!user) throw new ApiError(404, "User not found");
  ok(res, "Role updated", user);
});
