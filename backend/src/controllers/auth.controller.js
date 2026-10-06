import jwt from "jsonwebtoken";
import User from "../models/User.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { ok } from "../utils/response.js";

const signToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });

export const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body; // role is never taken from the client
  if (await User.findOne({ email })) throw new ApiError(409, "Email already registered");

  const user = await User.create({ name, email, password });
  ok(res, "Account created successfully", { token: signToken(user), user }, 201);
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select("+password");
  if (!user || !(await user.comparePassword(password))) {
    throw new ApiError(401, "Invalid email or password");
  }
  ok(res, "Logged in successfully", { token: signToken(user), user });
});

export const me = (req, res) => ok(res, "Current user", req.user);
