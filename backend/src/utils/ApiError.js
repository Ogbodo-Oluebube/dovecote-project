// Thrown anywhere in a controller to produce a specific status + message.
// Caught by middleware/errorHandler.js, which turns it into the standard
// { success: false, message, data: null } response.
export default class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
