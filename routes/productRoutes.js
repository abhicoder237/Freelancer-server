import { Router } from "express";
import {
  createProduct,
  getAllProducts,
  getPublicProducts,
  getProduct,
  getFeaturedProducts,
  getCategories,
  updateProduct,
  addProductImages,
  deleteProductImage,
  setPrimaryImage,
  toggleFeatured,
  updateProductStatus,
  bulkUpdateStatus,
  deleteProduct,
} from "../controllers/productController.js";
import { protect, optionalAuth }  from "../middleware/authMiddleware.js";
import { attachRoleContext }       from "../middleware/roleMiddleware.js";
import {
  resolveClient,
  optionalResolveClient,
  injectClientToUpload,
}                                  from "../middleware/clientMiddleware.js";
import { uploadMiddleware }        from "../config/cloudinary.js";
import { productValidators }       from "../middleware/validateMiddleware.js";

const router = Router();

// ─────────────────────────────────────────
// CUSTOM MULTER MIDDLEWARE
// Handles multer errors properly
// ─────────────────────────────────────────

const productImageUpload = (req, res, next) => {
  const clientSlug = req.uploadClientSlug || req.clientSlug || "general";
  const upload     = uploadMiddleware("products", clientSlug);

  upload.array("images", 5)(req, res, (err) => {
    if (err) {
      if (
        err.message?.includes("Invalid file type") ||
        err.code === "INVALID_FILE_TYPE"
      ) {
        return res.status(400).json({
          success:    false,
          statusCode: 400,
          message:    err.message,
        });
      }
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          success:    false,
          statusCode: 400,
          message:    "File too large. Maximum 10MB allowed.",
        });
      }
      if (err.code === "LIMIT_FILE_COUNT") {
        return res.status(400).json({
          success:    false,
          statusCode: 400,
          message:    "Too many files. Maximum 5 files allowed.",
        });
      }
      return res.status(400).json({
        success:    false,
        statusCode: 400,
        message:    err.message || "File upload failed.",
      });
    }
    next();
  });
};

// ─────────────────────────────────────────
// ⚠️  ROUTE ORDER MATTERS — CRITICAL
// Static routes MUST come before dynamic /:id
// ─────────────────────────────────────────

// ── 1. STATIC PUBLIC ROUTES ──────────────
router.get(
  "/public",
  resolveClient,
  getPublicProducts
);

router.get(
  "/featured",
  resolveClient,
  getFeaturedProducts
);

router.get(
  "/categories",
  resolveClient,
  getCategories
);

// ── 2. COLLECTION ROUTES ─────────────────
router.get(
  "/",
  protect,
  attachRoleContext,
  optionalResolveClient,
  getAllProducts
);

router.post(
  "/",
  protect,
  attachRoleContext,
  optionalResolveClient,
  productValidators.create,
  createProduct
);

// ── 3. BULK OPERATIONS — before /:id ─────
router.put(
  "/bulk-status",
  protect,
  attachRoleContext,
  bulkUpdateStatus
);

// ── 4. SUB-RESOURCE ROUTES — before /:id ─
// ⚠️ These MUST be before router.get("/:identifier")
// Otherwise /:identifier matches "bulk-status", etc.

router.post(
  "/:id/images",
  protect,
  optionalResolveClient,
  injectClientToUpload("products"),
  productImageUpload,
  addProductImages
);

router.delete(
  "/:id/images/:publicId",
  protect,
  attachRoleContext,
  deleteProductImage
);

router.put(
  "/:id/images/:publicId/primary",
  protect,
  attachRoleContext,
  setPrimaryImage
);

router.put(
  "/:id/toggle-featured",
  protect,
  attachRoleContext,
  toggleFeatured
);

router.put(
  "/:id/status",
  protect,
  attachRoleContext,
  updateProductStatus
);

// ── 5. SINGLE RESOURCE ROUTES ────────────
router.get(
  "/:identifier",
  optionalAuth,
  optionalResolveClient,
  getProduct
);

router.put(
  "/:id",
  protect,
  attachRoleContext,
  productValidators.update,
  updateProduct
);

router.delete(
  "/:id",
  protect,
  attachRoleContext,
  deleteProduct
);

export default router;