import { Router } from "express";
import {
  createClient,
  getAllClients,
  getClient,
  getClientConfig,
  updateClient,
  updateClientLogo,
  toggleMaintenance,
  getClientStats,
  assignOwner,
  deleteClient,
} from "../controllers/clientController.js";
import { protect }                          from "../middleware/authMiddleware.js";
import {
  isSuperAdmin,
  isAdminOrAbove,
  attachRoleContext,
}                                           from "../middleware/roleMiddleware.js";
import {
  resolveClient,
  verifyClientOwnership,
  injectClientToUpload,
}                                           from "../middleware/clientMiddleware.js";
import { uploadMiddleware }                 from "../config/cloudinary.js";
import { clientValidators }                 from "../middleware/validateMiddleware.js";

const router = Router();

// ─────────────────────────────────────────
// PUBLIC ROUTES
// Frontend uses these to load client data
// Requires x-client-slug header
// ─────────────────────────────────────────

// GET /api/v1/clients/config
// Main frontend entry point — loads everything
// Theme, logo, contact, SEO, social links
router.get(
  "/config",
  resolveClient,
  getClientConfig
);

// ─────────────────────────────────────────
// PROTECTED ROUTES — admin+
// ─────────────────────────────────────────

// POST /api/v1/clients
// Create new client + auto default theme
router.post(
  "/",
  protect,
  isAdminOrAbove,
  clientValidators.create,
  createClient
);

// GET /api/v1/clients
// List all clients with pagination + filters
router.get(
  "/",
  protect,
  isAdminOrAbove,
  getAllClients
);

// GET /api/v1/clients/:identifier
// Get by MongoDB ID or slug
router.get(
  "/:identifier",
  protect,
  isAdminOrAbove,
  getClient
);

// ─────────────────────────────────────────
// PROTECTED ROUTES — all roles
// clientadmin can only access own client
// ─────────────────────────────────────────

// PUT /api/v1/clients/:id
// Update client config
// clientadmin → own client only (verifyClientOwnership)
// admin/superadmin → any client
router.put(
  "/:id",
  protect,
  attachRoleContext,
  resolveClient,
  verifyClientOwnership,
  clientValidators.update,
  updateClient
);

// PUT /api/v1/clients/:id/logo
// Upload + update client logo
// Multer + Cloudinary middleware chain
router.put(
  "/:id/logo",
  protect,
  resolveClient,
  verifyClientOwnership,
  injectClientToUpload("logos"),
  (req, res, next) => {
    // Dynamic multer — uses clientSlug from middleware
    uploadMiddleware("logos", req.uploadClientSlug)
      .single("logo")(req, res, next);
  },
  updateClientLogo
);

// GET /api/v1/clients/:id/stats
// Dashboard stats — products, sections, views
router.get(
  "/:id/stats",
  protect,
  attachRoleContext,
  getClientStats
);

// ─────────────────────────────────────────
// PROTECTED ROUTES — admin+ only
// ─────────────────────────────────────────

// PUT /api/v1/clients/:id/maintenance
// Toggle maintenance mode on/off
router.put(
  "/:id/maintenance",
  protect,
  isAdminOrAbove,
  toggleMaintenance
);

// PUT /api/v1/clients/:id/assign-owner
// Assign a clientadmin user as owner
router.put(
  "/:id/assign-owner",
  protect,
  isAdminOrAbove,
  assignOwner
);

// ─────────────────────────────────────────
// SUPERADMIN ONLY ROUTES
// ─────────────────────────────────────────

// DELETE /api/v1/clients/:id
// Cascade delete — client + products + themes
// + sections + Cloudinary images
router.delete(
  "/:id",
  protect,
  isSuperAdmin,
  deleteClient
);

export default router;