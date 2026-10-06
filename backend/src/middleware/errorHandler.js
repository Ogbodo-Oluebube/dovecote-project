// Central error handler. Every thrown error in the app ends up here and is
// turned into the standard { success, message, data } shape.
export default function errorHandler(err, req, res, next) {
  let status = err.status || 500;
  let message = err.message;

  if (err.name === "ValidationError") {
    // Mongoose schema validation (a safety net; express-validator catches most of this first)
    status = 400;
    message = Object.values(err.errors).map((e) => e.message).join(", ");
  } else if (err.name === "CastError") {
    status = 400;
    message = "Invalid ID";
  } else if (err.code === 11000) {
    status = 409;
    message = "That record already exists";
  } else if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
    status = 401;
    message = "Invalid or expired token";
  } else if (err.type === "entity.parse.failed") {
    status = 400;
    message = "Invalid JSON body";
  }

  if (status >= 500) {
    console.error(err); // full detail goes to the server log only
    message = "Something went wrong";
  }

  res.status(status).json({ success: false, message, data: null });
}
