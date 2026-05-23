import { Router } from "express";
import {
  register,
  login,
  logout,
  getMe,
  updateProfile,
  changePassword,
  getAllUsers,
  toggleUserStatus,
} from "../controllers/authController.js";
import { protect }                    from "../middleware/authMiddleware.js";
import { isSuperAdmin, isAdminOrAbove } from "../middleware/roleMiddleware.js";
import { authValidators }             from "../middleware/validateMiddleware.js";

const router = Router();

// ─────────────────────────────────────────
// PUBLIC ROUTES
// No authentication required
// ─────────────────────────────────────────

// POST /api/v1/auth/login
router.post(
  "/login",
  authValidators.login,
  login
);

// ─────────────────────────────────────────
// PROTECTED ROUTES — any logged in user
// ─────────────────────────────────────────

// POST /api/v1/auth/logout
router.post("/logout", protect, logout);

// GET  /api/v1/auth/me
router.get("/me", protect, getMe);

// PUT  /api/v1/auth/me
router.put("/me", protect, updateProfile);

// PUT  /api/v1/auth/change-password
router.put(
  "/change-password",
  protect,
  authValidators.changePassword,
  changePassword
);

// ─────────────────────────────────────────
// ADMIN+ ROUTES
// ─────────────────────────────────────────

// POST /api/v1/auth/register
// Only admin+ can create new user accounts
router.post(
  "/register",
  protect,
  isAdminOrAbove,
  authValidators.register,
  register
);

// ─────────────────────────────────────────
// SUPERADMIN ONLY ROUTES
// ─────────────────────────────────────────

// GET  /api/v1/auth/users
router.get(
  "/users",
  protect,
  isSuperAdmin,
  getAllUsers
);

// PUT  /api/v1/auth/users/:id/toggle-status
router.put(
  "/users/:id/toggle-status",
  protect,
  isSuperAdmin,
  toggleUserStatus
);

export default router;