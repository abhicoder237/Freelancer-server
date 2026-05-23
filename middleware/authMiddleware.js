import jwt from "jsonwebtoken";
import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import User from "../models/User.js";

// ─────────────────────────────────────────
// HELPER — Extract token from request
// Supports two strategies:
// 1. HTTP-only Cookie (preferred — XSS safe)
// 2. Authorization Bearer header (for API clients)
// ─────────────────────────────────────────

const extractToken = (req) => {
  // Strategy 1 — Cookie (sent automatically by browser)
  if (req.cookies && req.cookies.accessToken) {
    return req.cookies.accessToken;
  }

  // Strategy 2 — Authorization header
  // Format: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI..."
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.split(" ")[1];
  }

  return null;
};

// ─────────────────────────────────────────
// PROTECT MIDDLEWARE
// Verifies JWT and attaches user to req.user
// Use on any route that requires login
// ─────────────────────────────────────────

const protect = asyncHandler(async (req, res, next) => {
  // Step 1 — Extract token
  const token = extractToken(req);

  if (!token) {
    throw new ApiError(
      401,
      "Access denied. No token provided. Please log in."
    );
  }

  // Step 2 — Verify token signature + expiry
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    // JWT errors are handled by errorMiddleware
    // JsonWebTokenError → 401 Invalid token
    // TokenExpiredError → 401 Session expired
    throw err;
  }

  // Step 3 — Check user still exists in DB
  // Token could be valid but user deleted/deactivated
  const user = await User.findById(decoded._id).select(
    "+loginAttempts +lockUntil"
  );

  if (!user) {
    throw new ApiError(
      401,
      "User associated with this token no longer exists. Please log in again."
    );
  }

  // Step 4 — Check account is active
  if (!user.isActive) {
    throw new ApiError(
      403,
      "Your account has been deactivated. Please contact support."
    );
  }

  // Step 5 — Check account is not locked
  if (user.isLocked()) {
    const lockTimeRemaining = Math.ceil(
      (user.lockUntil - Date.now()) / (1000 * 60)
    );
    throw new ApiError(
      423, // Locked
      `Account temporarily locked due to too many failed login attempts. Try again in ${lockTimeRemaining} minute(s).`
    );
  }

  // Step 6 — Attach user to request object
  // Available as req.user in all subsequent middleware + controllers
  req.user = user;

  next();
});

// ─────────────────────────────────────────
// OPTIONAL AUTH MIDDLEWARE
// Does NOT throw error if no token
// Attaches user if token present and valid
// Use for public routes that show extra content
// when logged in (e.g. wishlist status on product page)
// ─────────────────────────────────────────

const optionalAuth = asyncHandler(async (req, res, next) => {
  const token = extractToken(req);

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded._id);

    if (user && user.isActive) {
      req.user = user;
    } else {
      req.user = null;
    }
  } catch {
    // Invalid token — just ignore, treat as unauthenticated
    req.user = null;
  }

  next();
});

// ─────────────────────────────────────────
// VERIFY SAME CLIENT
// Ensures clientadmin can only access
// their own client's data
// Used AFTER protect middleware
// ─────────────────────────────────────────

const verifySameClient = asyncHandler(async (req, res, next) => {
  const { user } = req;

  // superadmin and admin can access any client
  if (user.role === "superadmin" || user.role === "admin") {
    return next();
  }

  // clientadmin — must match the client in request
  // Client ID comes from route param or body
  const requestedClientId =
    req.params.clientId ||
    req.params.id ||
    req.body.client ||
    req.client?._id?.toString();

  if (!requestedClientId) {
    throw new ApiError(400, "Client ID is required.");
  }

  if (user.client?.toString() !== requestedClientId.toString()) {
    throw new ApiError(
      403,
      "Access denied. You can only access your own client data."
    );
  }

  next();
});

export { protect, optionalAuth, verifySameClient };