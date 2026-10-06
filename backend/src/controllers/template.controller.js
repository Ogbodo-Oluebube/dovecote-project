import Template from "../models/Template.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { ok } from "../utils/response.js";

const pick = ({ name, channel, subject, body }) => ({ name, channel, subject, body });

export const listTemplates = asyncHandler(async (req, res) => {
  ok(res, "Templates fetched", await Template.find({ userId: req.user._id }).sort({ createdAt: -1 }));
});

export const createTemplate = asyncHandler(async (req, res) => {
  const tpl = await Template.create({ userId: req.user._id, ...pick(req.body) });
  ok(res, "Template created", tpl, 201);
});

export const updateTemplate = asyncHandler(async (req, res) => {
  const tpl = await Template.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    pick(req.body),
    { new: true, runValidators: true }
  );
  if (!tpl) throw new ApiError(404, "Template not found");
  ok(res, "Template updated", tpl);
});

export const deleteTemplate = asyncHandler(async (req, res) => {
  const tpl = await Template.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
  if (!tpl) throw new ApiError(404, "Template not found");
  ok(res, "Template deleted");
});
