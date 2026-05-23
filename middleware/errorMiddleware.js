import ApiError from "../utils/ApiError.js";

// ─────────────────────────────────────────
// HELPER — Convert any error to ApiError
// ─────────────────────────────────────────

const normalizeError = (err) => {
  // Already an ApiError — return as is
  if (err instanceof ApiError) return err;

  // ── Multer / File upload errors ──────────
if (err.code === "LIMIT_FILE_SIZE") {
  return new ApiError(400, "File too large. Maximum allowed size is 10MB.");
}

if (err.code === "LIMIT_FILE_COUNT") {
  return new ApiError(400, "Too many files. Maximum 5 files allowed per request.");
}

if (err.code === "LIMIT_UNEXPECTED_FILE") {
  return new ApiError(400, `Unexpected file field: '${err.field}'.`);
}

// ✅ Custom file type error
if (err.code === "INVALID_FILE_TYPE") {
  return new ApiError(400, err.message);
}

if (err.message && err.message.includes("Invalid file type")) {
  return new ApiError(400, err.message);
}

  // ── Mongoose Validation Error ───────────
  // Triggered when schema validation fails
  // e.g. required field missing, enum mismatch
  if (err.name === "ValidationError") {
    const errors = Object.values(err.errors).map((e) => ({
      field:   e.path,
      message: e.message,
    }));

    return new ApiError(
      400,
      "Validation failed",
      errors
    );
  }

  // ── Mongoose Duplicate Key Error ────────
  // Triggered when unique constraint is violated
  // e.g. duplicate email, duplicate slug
  if (err.code === 11000) {
    const duplicateField = Object.keys(err.keyValue)[0];
    const duplicateValue = err.keyValue[duplicateField];

    return new ApiError(
      409, // Conflict
      `'${duplicateValue}' is already taken for field '${duplicateField}'. Please use a different value.`
    );
  }

  // ── Mongoose Cast Error ─────────────────
  // Triggered when invalid ObjectId is passed
  // e.g. /api/products/invalid-id
  if (err.name === "CastError") {
    return new ApiError(
      400,
      `Invalid ${err.path}: '${err.value}' is not a valid ID`
    );
  }

  // ── JWT Errors ──────────────────────────
  if (err.name === "JsonWebTokenError") {
    return new ApiError(401, "Invalid token. Please log in again.");
  }

  if (err.name === "TokenExpiredError") {
    return new ApiError(401, "Your session has expired. Please log in again.");
  }

  if (err.name === "NotBeforeError") {
    return new ApiError(401, "Token not yet active. Please log in again.");
  }

  // ── Multer Errors ───────────────────────
  // File upload errors
  if (err.code === "LIMIT_FILE_SIZE") {
    return new ApiError(400, "File too large. Maximum allowed size is 5MB.");
  }

  if (err.code === "LIMIT_FILE_COUNT") {
    return new ApiError(400, "Too many files. Maximum 5 files allowed per request.");
  }

  if (err.code === "LIMIT_UNEXPECTED_FILE") {
    return new ApiError(400, `Unexpected file field: '${err.field}'.`);
  }

  // ── CORS Error ──────────────────────────
  if (err.message && err.message.includes("CORS policy")) {
    return new ApiError(403, err.message);
  }

  // ── Mongoose Connection Error ───────────
  if (err.name === "MongoNetworkError" || err.name === "MongoServerError") {
    return new ApiError(503, "Database connection error. Please try again later.");
  }

  // ── Syntax Error in JSON body ───────────
  // e.g. malformed JSON in request body
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return new ApiError(400, "Invalid JSON in request body. Please check your syntax.");
  }

  // ── Unknown / Unhandled Error ───────────
  // Fallback — don't expose internal details in production
  return new ApiError(
    err.statusCode || 500,
    err.message || "Internal server error"
  );
};

// ─────────────────────────────────────────
// GLOBAL ERROR HANDLER MIDDLEWARE
// Must have 4 params — Express identifies it
// as error handler by signature (err, req, res, next)
// ─────────────────────────────────────────

const errorMiddleware = (err, req, res, next) => {
  // Normalize any error type into ApiError
  const apiError = normalizeError(err);

  // ── Log Error ───────────────────────────
  // Full stack in development, minimal in production
  if (process.env.NODE_ENV === "development") {
    console.error("─────────────────────────────────");
    console.error(`❌ ERROR: ${apiError.message}`);
    console.error(`📍 PATH: ${req.method} ${req.originalUrl}`);
    console.error(`🔢 STATUS: ${apiError.statusCode}`);
    console.error(`📦 BODY:`, req.body);
    console.error(`🔑 USER:`, req.user?._id || "unauthenticated");
    console.error(`📋 STACK:\n${err.stack}`);
    console.error("─────────────────────────────────");
  } else {
    // Production — minimal logging
    // (use a proper logger like Winston in real prod)
    console.error(
      `[${new Date().toISOString()}] ${apiError.statusCode} ${req.method} ${req.originalUrl} — ${apiError.message}`
    );
  }

  // ── Build Response ──────────────────────
  const response = {
    success:    false,
    statusCode: apiError.statusCode,
    message:    apiError.message,
    errors:     apiError.errors || [],
  };

  // Only expose stack trace in development
  if (process.env.NODE_ENV === "development") {
    response.stack = err.stack;
  }

  // Send error response
  return res.status(apiError.statusCode).json(response);
};

// ─────────────────────────────────────────
// 404 HANDLER
// For routes that don't exist
// ─────────────────────────────────────────

const notFoundMiddleware = (req, res, next) => {
  const error = new ApiError(
    404,
    `Route not found: ${req.method} ${req.originalUrl}`
  );
  next(error);
};

export { errorMiddleware, notFoundMiddleware };