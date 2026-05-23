// ─────────────────────────────────────────
// ASYNC HANDLER UTILITY
// Wraps async route handlers to automatically
// catch errors and forward them to Express
// global error middleware — eliminates
// repetitive try-catch in every controller
// ─────────────────────────────────────────

/**
 * @param   {Function} fn  - Any async controller function
 * @returns {Function}     - Express middleware with auto error catching
 *
 * Usage:
 *   export const getClients = asyncHandler(async (req, res) => {
 *     const clients = await Client.find();
 *     res.status(200).json(new ApiResponse(200, clients, "Fetched"));
 *   });
 */

const asyncHandler = (fn) => {
  return (req, res, next) => {
    // Resolve the async function
    // If it rejects — catch forwards error to next()
    // next(err) triggers Express global error handler
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export default asyncHandler;