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
// MULTER ERROR HANDLER
// Multer errors Express ke normal error
// handler se catch nahi hote — alag handle karo
// ─────────────────────────────────────────

const multerErrorHandler = (err, req, res, next) => {
  if (err) {
    // Multer specific errors
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success:    false,
        statusCode: 400,
        message:    "File too large. Maximum allowed size is 10MB.",
      });
    }
    if (err.code === "LIMIT_FILE_COUNT") {
      return res.status(400).json({
        success:    false,
        statusCode: 400,
        message:    "Too many files. Maximum 5 files allowed.",
      });
    }
    if (err.code === "LIMIT_UNEXPECTED_FILE") {
      return res.status(400).json({
        success:    false,
        statusCode: 400,
        message:    `Unexpected field: ${err.field}`,
      });
    }
    // File type error from fileFilter
    if (err.message && err.message.includes("Invalid file type")) {
      return res.status(400).json({
        success:    false,
        statusCode: 400,
        message:    err.message,
      });
    }
    // Other multer errors
    return res.status(400).json({
      success:    false,
      statusCode: 400,
      message:    err.message || "File upload failed.",
    });
  }
  next();
};

// ─────────────────────────────────────────
// DYNAMIC MULTER MIDDLEWARE
// Product images ke liye
// ─────────────────────────────────────────

const productImageUpload = (req, res, next) => {
  // Product se client info lo
  const clientSlug = req.clientSlug || req.uploadClientSlug || "general";
  const upload     = uploadMiddleware("products", clientSlug);

  upload.array("images", 5)(req, res, (err) => {
    if (err) {
      // Multer error — directly respond
      if (err.message && err.message.includes("Invalid file type")) {
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
// PUBLIC ROUTES
// ─────────────────────────────────────────

router.get("/public",     resolveClient, getPublicProducts);
router.get("/featured",   resolveClient, getFeaturedProducts);
router.get("/categories", resolveClient, getCategories);

// ─────────────────────────────────────────
// MIXED
// ─────────────────────────────────────────

router.get(
  "/:identifier",
  optionalAuth,
  optionalResolveClient,
  getProduct
);

// ─────────────────────────────────────────
// PRIVATE — admin panel
// ─────────────────────────────────────────

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

router.put(
  "/bulk-status",
  protect,
  attachRoleContext,
  bulkUpdateStatus
);

router.put(
  "/:id",
  protect,
  attachRoleContext,
  productValidators.update,
  updateProduct
);

router.put(
  "/:id/status",
  protect,
  attachRoleContext,
  updateProductStatus
);

router.put(
  "/:id/toggle-featured",
  protect,
  attachRoleContext,
  toggleFeatured
);

// ─────────────────────────────────────────
// IMAGE ROUTES — Fixed multer error handling
// ─────────────────────────────────────────

router.post(
  "/:id/images",
  protect,
  optionalResolveClient,
  injectClientToUpload("products"),
  productImageUpload,      // ✅ Custom multer with error handling
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

// ─────────────────────────────────────────
// DELETE
// ─────────────────────────────────────────

router.delete(
  "/:id",
  protect,
  attachRoleContext,
  deleteProduct
);

export default router;