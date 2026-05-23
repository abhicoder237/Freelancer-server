import { Router } from "express";
import {
  uploadImage,
  uploadMultipleImages,
  uploadLogo,
  uploadFavicon,
  uploadAvatar,
  uploadSectionImage,
  uploadOgImage,
  deleteUploadedImage,
  getClientGallery,
  getUploadSignature,
} from "../controllers/uploadController.js";
import { protect }                from "../middleware/authMiddleware.js";
import { attachRoleContext }      from "../middleware/roleMiddleware.js";
import {
  resolveClient,
  optionalResolveClient,
  verifyClientOwnership,
  injectClientToUpload,
}                                 from "../middleware/clientMiddleware.js";
import { uploadMiddleware }       from "../config/cloudinary.js";

const router = Router();

// ─────────────────────────────────────────
// HELPER — Dynamic Multer Middleware
// Creates multer instance per request
// with client-specific folder
// ─────────────────────────────────────────

// Single file upload factory
const singleUpload = (folderType) => {
  return (req, res, next) => {
    const clientSlug = req.uploadClientSlug || req.clientSlug || "general";
    uploadMiddleware(folderType, clientSlug).single("image")(req, res, next);
  };
};

// Multiple files upload factory
const multipleUpload = (folderType, maxCount = 5) => {
  return (req, res, next) => {
    const clientSlug = req.uploadClientSlug || req.clientSlug || "general";
    uploadMiddleware(folderType, clientSlug).array("images", maxCount)(req, res, next);
  };
};

// ─────────────────────────────────────────
// SIGNATURE ROUTE — before all others
// No file upload — just generates signature
// ─────────────────────────────────────────

// GET /api/v1/upload/signature
// Generate Cloudinary upload signature
// For direct browser→Cloudinary uploads
// Frontend uses this to upload without hitting our server
router.get(
  "/signature",
  protect,
  optionalResolveClient,
  getUploadSignature
);

// ─────────────────────────────────────────
// GALLERY ROUTE
// ─────────────────────────────────────────

// GET /api/v1/upload/gallery
// Fetch all images for a client from Cloudinary
// Paginated with nextCursor
router.get(
  "/gallery",
  protect,
  optionalResolveClient,
  getClientGallery
);

// ─────────────────────────────────────────
// AVATAR UPLOAD
// User uploads their own avatar
// ─────────────────────────────────────────

// POST /api/v1/upload/avatar
// field name: "image"
// Max size: 5MB, auto-crop to 200x200
router.post(
  "/avatar",
  protect,
  (req, res, next) => {
    // Avatar folder uses user ID as client slug
    // saas_platform/users/avatars/
    uploadMiddleware("avatars", "users")
      .single("image")(req, res, next);
  },
  uploadAvatar
);

// ─────────────────────────────────────────
// CLIENT BRANDING UPLOADS
// Logo, favicon, OG image
// Requires client context
// ─────────────────────────────────────────

// POST /api/v1/upload/logo
// field name: "image"
// Auto-resize to 400x400, auto-format
router.post(
  "/logo",
  protect,
  resolveClient,
  verifyClientOwnership,
  injectClientToUpload("logos"),
  singleUpload("logos"),
  uploadLogo
);

// POST /api/v1/upload/favicon
// field name: "image"
// Small image — auto-resize to 64x64
router.post(
  "/favicon",
  protect,
  resolveClient,
  verifyClientOwnership,
  injectClientToUpload("favicons"),
  singleUpload("favicons"),
  uploadFavicon
);

// POST /api/v1/upload/og-image
// field name: "image"
// Open Graph image — 1200x630 recommended
router.post(
  "/og-image",
  protect,
  resolveClient,
  verifyClientOwnership,
  injectClientToUpload("seo"),
  singleUpload("seo"),
  uploadOgImage
);

// ─────────────────────────────────────────
// SECTION IMAGE UPLOADS
// Hero backgrounds, gallery images, banners
// ─────────────────────────────────────────

// POST /api/v1/upload/section/:sectionId
// field name: "image"
// Body: { imageField: "heroData.backgroundImage" }
// Auto-updates section in DB after upload
router.post(
  "/section/:sectionId",
  protect,
  resolveClient,
  verifyClientOwnership,
  injectClientToUpload("sections"),
  singleUpload("sections"),
  uploadSectionImage
);

// ─────────────────────────────────────────
// GENERIC UPLOAD ROUTES
// For any miscellaneous image uploads
// ─────────────────────────────────────────

// POST /api/v1/upload/image
// Single generic image upload
// Returns { url, publicId } — caller saves to DB
router.post(
  "/image",
  protect,
  optionalResolveClient,
  injectClientToUpload("general"),
  singleUpload("general"),
  uploadImage
);

// POST /api/v1/upload/images
// Multiple images — max 5
// Returns array of { url, publicId }
router.post(
  "/images",
  protect,
  optionalResolveClient,
  injectClientToUpload("general"),
  multipleUpload("general", 5),
  uploadMultipleImages
);

// ─────────────────────────────────────────
// DELETE ROUTE
// publicId is base64 encoded in URL
// to safely handle slashes in publicId
// ─────────────────────────────────────────

// DELETE /api/v1/upload/:publicId
// Deletes image from Cloudinary
// publicId must start with "saas_platform/"
router.delete(
  "/:publicId",
  protect,
  attachRoleContext,
  deleteUploadedImage
);

export default router;