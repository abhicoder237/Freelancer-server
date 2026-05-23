// ─────────────────────────────────────────
// CUSTOM API ERROR CLASS
// Extends native Error class with extra fields
// needed for consistent HTTP error responses
// ─────────────────────────────────────────

class ApiError extends Error {
  /**
   * @param {number} statusCode   - HTTP status code (400, 401, 403, 404, 500...)
   * @param {string} message      - Human readable error message
   * @param {Array}  errors       - Field-level validation errors array (optional)
   * @param {string} stack        - Custom stack trace (optional)
   */
  constructor(
    statusCode,
    message = "Something went wrong",
    errors = [],
    stack = ""
  ) {
    // Call parent Error constructor with message
    super(message);

    // HTTP status code
    this.statusCode = statusCode;

    // message already set by super()
    this.message = message;

    // false — because this is an error response, not success
    this.success = false;

    // Field-level errors (e.g. from express-validator)
    // Example: [{ field: "email", message: "Invalid email" }]
    this.errors = errors;

    // Stack trace — for debugging in development
    if (stack) {
      this.stack = stack;
    } else {
      // Captures current call stack automatically
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export default ApiError;