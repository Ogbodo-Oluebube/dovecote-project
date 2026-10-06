// Keeps every success/error response in the same shape across the whole API.
export const ok = (res, message, data = null, status = 200) =>
  res.status(status).json({ success: true, message, data });

export const fail = (res, status, message) =>
  res.status(status).json({ success: false, message, data: null });
