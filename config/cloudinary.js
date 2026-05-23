 import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import multer from "multer";

// ─────────────────────────────────────────
// CLOUDINARY CONFIGURATION
// ─────────────────────────────────────────

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure:     true,
});

// ─────────────────────────────────────────
// CONSTANTS
// ✅ AVIF + HEIC added for modern browsers
// ─────────────────────────────────────────

const ALLOWED_FORMATS = [
  "jpg", "jpeg", "png", "webp",
  "svg", "avif", "heic", "heif",
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // ✅ 10MB (was 5MB)

// ─────────────────────────────────────────
// TRANSFORMATION PRESETS
// ─────────────────────────────────────────

const getTransformation = (folderType) => {
  const transformations = {
    logos: [
      { width: 400, height: 400, crop: "limit" },
      { quality: "auto" },
      { fetch_format: "auto" },
    ],
    banners: [
      { width: 1920, height: 600, crop: "fill", gravity: "center" },
      { quality: "auto:good" },
      { fetch_format: "auto" },
    ],
    products: [
      { width: 800, height: 800, crop: "fill", gravity: "center" },
      { quality: "auto:good" },
      { fetch_format: "auto" },
    ],
    avatars: [
      { width: 200, height: 200, crop: "fill", gravity: "face" },
      { quality: "auto" },
      { fetch_format: "auto" },
    ],
    sections: [
      { width: 1920, crop: "limit" },
      { quality: "auto:good" },
      { fetch_format: "auto" },
    ],
    favicons: [
      { width: 64, height: 64, crop: "fill" },
      { quality: "auto" },
      { fetch_format: "auto" },
    ],
    seo: [
      { width: 1200, height: 630, crop: "fill", gravity: "center" },
      { quality: "auto:good" },
      { fetch_format: "auto" },
    ],
    general: [
      { width: 1200, crop: "limit" },
      { quality: "auto" },
      { fetch_format: "auto" },
    ],
  };

  return transformations[folderType] || transformations.general;
};

// ─────────────────────────────────────────
// CLOUDINARY STORAGE FACTORY
// ─────────────────────────────────────────

const getStorage = (folderType, clientSlug = "general") => {
  return new CloudinaryStorage({
    cloudinary,
    params: async (req, file) => {
      const folder      = `saas_platform/${clientSlug}/${folderType}`;
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      const fileName    = `${folderType}-${uniqueSuffix}`;

      return {
        folder,
        public_id:       fileName,
        allowed_formats: ALLOWED_FORMATS,
        transformation:  getTransformation(folderType),
        resource_type:   "image",
      };
    },
  });
};

// ─────────────────────────────────────────
// MULTER FILE FILTER
// ✅ AVIF + HEIC added
// ─────────────────────────────────────────

 const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/svg+xml",
    "image/avif",
    "image/heic",
    "image/heif",
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    // ✅ Pass error to callback — not throw
    // Throwing causes undefined stack trace
    const error    = new Error(
      `Invalid file type: ${file.mimetype}. Allowed: JPG, PNG, WEBP, SVG, AVIF`
    );
    error.code     = "INVALID_FILE_TYPE";
    error.httpCode = 400;
    cb(error, false);
  }
};
// ─────────────────────────────────────────
// UPLOAD MIDDLEWARE FACTORY
// ─────────────────────────────────────────

const uploadMiddleware = (folderType, clientSlug) => {
  return multer({
    storage:  getStorage(folderType, clientSlug),
    fileFilter,
    limits: {
      fileSize: MAX_FILE_SIZE, // 10MB
      files:    10,
    },
  });
};

// ─────────────────────────────────────────
// CLOUDINARY UTILITIES
// ─────────────────────────────────────────

const deleteImage = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (err) {
    console.error(`❌ Cloudinary delete error: ${err.message}`);
    throw err;
  }
};

const extractPublicId = (url) => {
  try {
    const splitUrl       = url.split("/upload/")[1];
    const withoutVersion = splitUrl.replace(/^v\d+\//, "");
    const withoutExt     = withoutVersion.replace(/\.[^/.]+$/, "");
    return withoutExt;
  } catch {
    return null;
  }
};

export {
  cloudinary,
  uploadMiddleware,
  deleteImage,
  extractPublicId,
};