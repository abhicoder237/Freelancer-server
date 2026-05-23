// ─────────────────────────────────────────
// STANDARD API RESPONSE CLASS
// Ensures every success response has the
// same predictable structure — makes
// frontend integration much easier
// ─────────────────────────────────────────

class ApiResponse {
  /**
   * @param {number} statusCode  - HTTP status code (200, 201, 204...)
   * @param {any}    data        - Response payload (object, array, null)
   * @param {string} message     - Human readable success message
   * @param {object} meta        - Optional pagination / extra info
   */
  constructor(
    statusCode,
    data = null,
    message = "Success",
    meta = {}
  ) {
    this.statusCode = statusCode;

    // true for 2xx codes, false for anything else
    this.success = statusCode >= 200 && statusCode < 300;

    this.message = message;

    // Main response payload
    this.data = data;

    // Optional metadata — pagination, counts, etc.
    // Example: { total: 100, page: 1, limit: 10, totalPages: 10 }
    if (Object.keys(meta).length > 0) {
      this.meta = meta;
    }
  }
}

export default ApiResponse;