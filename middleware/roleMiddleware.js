import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";

// ─────────────────────────────────────────
// ROLE HIERARCHY
// Higher index = more permissions
// ─────────────────────────────────────────

const ROLE_HIERARCHY = {
  clientadmin: 1,
  admin:       2,
  superadmin:  3,
};

// ─────────────────────────────────────────
// AUTHORIZE ROLES
// Allows only specified roles to access route
// Must be used AFTER protect middleware
//
// Usage:
//   router.delete(
//     "/clients/:id",
//     protect,
//     authorizeRoles("superadmin"),
//     deleteClient
//   );
// ─────────────────────────────────────────

const authorizeRoles = (...allowedRoles) => {
  return asyncHandler(async (req, res, next) => {
    // protect middleware must run first
    if (!req.user) {
      throw new ApiError(
        401,
        "Authentication required. Please log in first."
      );
    }

    const userRole = req.user.role;

    // Check if user's role is in allowed roles list
    if (!allowedRoles.includes(userRole)) {
      throw new ApiError(
        403,
        `Access denied. Required role: [${allowedRoles.join(
          " or "
        )}]. Your role: '${userRole}'.`
      );
    }

    next();
  });
};

// ─────────────────────────────────────────
// AUTHORIZE MIN ROLE
// Allows user if their role is >= minimum level
// More flexible than listing every allowed role
//
// Usage:
//   router.get(
//     "/dashboard",
//     protect,
//     authorizeMinRole("admin"), // admin + superadmin allowed
//     getDashboard
//   );
// ─────────────────────────────────────────

const authorizeMinRole = (minRole) => {
  return asyncHandler(async (req, res, next) => {
    if (!req.user) {
      throw new ApiError(
        401,
        "Authentication required. Please log in first."
      );
    }

    const userLevel    = ROLE_HIERARCHY[req.user.role] || 0;
    const requiredLevel = ROLE_HIERARCHY[minRole] || 0;

    if (userLevel < requiredLevel) {
      throw new ApiError(
        403,
        `Access denied. Minimum required role: '${minRole}'. Your role: '${req.user.role}'.`
      );
    }

    next();
  });
};

// ─────────────────────────────────────────
// IS SUPERADMIN
// Shorthand — only superadmin allowed
// ─────────────────────────────────────────

const isSuperAdmin = asyncHandler(async (req, res, next) => {
  if (!req.user) {
    throw new ApiError(401, "Authentication required. Please log in first.");
  }

  if (req.user.role !== "superadmin") {
    throw new ApiError(
      403,
      "Access denied. Only superadmin can perform this action."
    );
  }

  next();
});

// ─────────────────────────────────────────
// IS ADMIN OR ABOVE
// Shorthand — admin + superadmin allowed
// ─────────────────────────────────────────

const isAdminOrAbove = asyncHandler(async (req, res, next) => {
  if (!req.user) {
    throw new ApiError(401, "Authentication required. Please log in first.");
  }

  const allowedRoles = ["admin", "superadmin"];

  if (!allowedRoles.includes(req.user.role)) {
    throw new ApiError(
      403,
      "Access denied. Admin privileges required."
    );
  }

  next();
});

// ─────────────────────────────────────────
// IS OWN RESOURCE
// User can only modify their own resource
// unless they are admin/superadmin
//
// Usage — protect user profile routes:
//   router.put("/users/:id", protect, isOwnResource, updateUser)
// ─────────────────────────────────────────

const isOwnResource = asyncHandler(async (req, res, next) => {
  if (!req.user) {
    throw new ApiError(401, "Authentication required. Please log in first.");
  }

  const requestedId = req.params.id || req.params.userId;

  // Admin/superadmin can modify anyone
  if (
    req.user.role === "superadmin" ||
    req.user.role === "admin"
  ) {
    return next();
  }

  // Regular user — can only access own resource
  if (req.user._id.toString() !== requestedId?.toString()) {
    throw new ApiError(
      403,
      "Access denied. You can only modify your own resource."
    );
  }

  next();
});

// ─────────────────────────────────────────
// ATTACH ROLE CONTEXT
// Attaches role-based flags to req
// Useful in controllers to conditionally
// filter data based on role
//
// Usage:
//   router.get("/products", protect, attachRoleContext, getProducts)
//
// In controller:
//   if (req.isClientAdmin) {
//     query.client = req.user.client; // filter by own client
//   }
// ─────────────────────────────────────────

const attachRoleContext = (req, res, next) => {
  if (!req.user) return next();

  req.isSuperAdmin  = req.user.role === "superadmin";
  req.isAdmin       = req.user.role === "admin";
  req.isClientAdmin = req.user.role === "clientadmin";

  // Can this user manage ALL clients?
  req.canManageAllClients = ["superadmin", "admin"].includes(req.user.role);

  // Which client does this user belong to?
  req.userClientId = req.user.client || null;

  next();
};

export {
  authorizeRoles,
  authorizeMinRole,
  isSuperAdmin,
  isAdminOrAbove,
  isOwnResource,
  attachRoleContext,
};