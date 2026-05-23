import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import {
  cloudinary,
  deleteImage,
  extractPublicId,
} from "../config/cloudinary.js";
import User from "../models/User.js";
import Client from "../models/Client.js";
import Section from "../models/Section.js";

// ─────────────────────────────────────────
// HELPER — Build Cloudinary folder path
// ─────────────────────────────────────────

const buildFolder = (clientSlug, folderType) => {
  return `saas_platform/${clientSlug}/${folderType}`;
};

// ─────────────────────────────────────────
// @desc    Upload single image (generic)
// @route   POST /api/v1/upload/image
// @access  Private
//
// Multer middleware handles actual upload
// This controller just returns the result
// ─────────────────────────────────────────

const uploadImage = asyncHandler(async (req, res) => {
  // multer + cloudinary already uploaded the file
  // req.file is populated by uploadMiddleware
  if (!req.file) {
    throw new ApiError(400, "No image file provided.");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        {
          url:      req.file.path,      // Cloudinary URL
          publicId: req.file.filename,  // Cloudinary public_id
          format:   req.file.mimetype,
          size:     req.file.size,
        },
        "Image uploaded successfully."
      )
    );
});

// ─────────────────────────────────────────
// @desc    Upload multiple images
// @route   POST /api/v1/upload/images
// @access  Private
// ─────────────────────────────────────────

const uploadMultipleImages = asyncHandler(async (req, res) => {
  if (!req.files || req.files.length === 0) {
    throw new ApiError(400, "No image files provided.");
  }

  const uploadedImages = req.files.map((file) => ({
    url:      file.path,
    publicId: file.filename,
    format:   file.mimetype,
    size:     file.size,
  }));

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        uploadedImages,
        `${uploadedImages.length} image(s) uploaded successfully.`
      )
    );
});

// ─────────────────────────────────────────
// @desc    Upload client logo
// @route   POST /api/v1/upload/logo
// @access  Private (all roles — own client only)
// ─────────────────────────────────────────

const uploadLogo = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError(400, "No logo file provided.");
  }

  // Client resolved by resolveClient middleware
  const client = await Client.findById(req.clientId);
  if (!client) {
    throw new ApiError(404, "Client not found.");
  }

  // ── Delete old logo from Cloudinary ──────
  if (client.logo?.publicId) {
    await deleteImage(client.logo.publicId).catch((err) =>
      console.error("Old logo delete failed:", err.message)
    );
  }

  // ── Update client logo ───────────────────
  const updatedClient = await Client.findByIdAndUpdate(
    req.clientId,
    {
      $set: {
        "logo.url":      req.file.path,
        "logo.publicId": req.file.filename,
        "logo.altText":  req.body.altText || `${client.name} Logo`,
      },
    },
    { new: true }
  );

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { logo: updatedClient.logo },
        "Client logo uploaded successfully."
      )
    );
});

// ─────────────────────────────────────────
// @desc    Upload client favicon
// @route   POST /api/v1/upload/favicon
// @access  Private (all roles — own client only)
// ─────────────────────────────────────────

const uploadFavicon = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError(400, "No favicon file provided.");
  }

  const client = await Client.findById(req.clientId);
  if (!client) {
    throw new ApiError(404, "Client not found.");
  }

  // ── Delete old favicon ───────────────────
  if (client.favicon?.publicId) {
    await deleteImage(client.favicon.publicId).catch((err) =>
      console.error("Old favicon delete failed:", err.message)
    );
  }

  // ── Update client favicon ────────────────
  const updatedClient = await Client.findByIdAndUpdate(
    req.clientId,
    {
      $set: {
        "favicon.url":      req.file.path,
        "favicon.publicId": req.file.filename,
      },
    },
    { new: true }
  );

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { favicon: updatedClient.favicon },
        "Favicon uploaded successfully."
      )
    );
});

// ─────────────────────────────────────────
// @desc    Upload user avatar
// @route   POST /api/v1/upload/avatar
// @access  Private (own account)
// ─────────────────────────────────────────

const uploadAvatar = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError(400, "No avatar file provided.");
  }

  const user = await User.findById(req.user._id);
  if (!user) {
    throw new ApiError(404, "User not found.");
  }

  // ── Delete old avatar ────────────────────
  if (user.avatar?.publicId) {
    await deleteImage(user.avatar.publicId).catch((err) =>
      console.error("Old avatar delete failed:", err.message)
    );
  }

  // ── Update user avatar ───────────────────
  const updatedUser = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        "avatar.url":      req.file.path,
        "avatar.publicId": req.file.filename,
      },
    },
    { new: true }
  );

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { avatar: updatedUser.avatar },
        "Avatar uploaded successfully."
      )
    );
});

// ─────────────────────────────────────────
// @desc    Upload section image
//          (hero bg, banner, gallery image)
// @route   POST /api/v1/upload/section/:sectionId
// @access  Private
// ─────────────────────────────────────────

const uploadSectionImage = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError(400, "No image file provided.");
  }

  const { sectionId } = req.params;
  const { imageField  } = req.body;
  // imageField tells which field to update
  // e.g. "heroData.backgroundImage" or "bannerData.backgroundImage"

  const section = await Section.findById(sectionId);
  if (!section) {
    throw new ApiError(404, "Section not found.");
  }

  // ── Tenant isolation ─────────────────────
  if (
    req.user.role === "clientadmin" &&
    section.client.toString() !== req.user.client?.toString()
  ) {
    throw new ApiError(403, "Access denied.");
  }

  // ── Valid image fields per section type ──
  const validImageFields = {
    hero:         ["heroData.backgroundImage", "heroData.foregroundImage"],
    banner:       ["bannerData.backgroundImage"],
    gallery:      ["galleryData.images"],
    newsletter:   ["newsletterData.backgroundImage"],
    features:     [],
    testimonials: [],
  };

  const allowedFields = validImageFields[section.type] || [];

  if (imageField && !allowedFields.includes(imageField)) {
    throw new ApiError(
      400,
      `Invalid imageField '${imageField}' for section type '${section.type}'. Allowed: ${allowedFields.join(", ")}`
    );
  }

  // ── Build update ─────────────────────────
  let updateQuery = {};

  if (imageField === "galleryData.images") {
    // Gallery — push new image to array
    updateQuery = {
      $push: {
        "galleryData.images": {
          url:      req.file.path,
          publicId: req.file.filename,
          altText:  req.body.altText || "",
        },
      },
    };
  } else if (imageField) {
    // Single image field — replace
    updateQuery = {
      $set: {
        [`${imageField}.url`]:      req.file.path,
        [`${imageField}.publicId`]: req.file.filename,
        [`${imageField}.altText`]:  req.body.altText || "",
      },
    };
  } else {
    // No field specified — return URL only
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          {
            url:      req.file.path,
            publicId: req.file.filename,
          },
          "Image uploaded. Use imageField param to auto-update section."
        )
      );
  }

  const updatedSection = await Section.findByIdAndUpdate(
    sectionId,
    updateQuery,
    { new: true }
  );

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        updatedSection,
        "Section image uploaded and updated successfully."
      )
    );
});

// ─────────────────────────────────────────
// @desc    Upload SEO OG image for client
// @route   POST /api/v1/upload/og-image
// @access  Private
// ─────────────────────────────────────────

const uploadOgImage = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError(400, "No OG image file provided.");
  }

  const client = await Client.findById(req.clientId);
  if (!client) {
    throw new ApiError(404, "Client not found.");
  }

  // ── Delete old OG image ──────────────────
  if (client.seo?.ogImage?.publicId) {
    await deleteImage(client.seo.ogImage.publicId).catch(console.error);
  }

  // ── Update OG image ──────────────────────
  const updatedClient = await Client.findByIdAndUpdate(
    req.clientId,
    {
      $set: {
        "seo.ogImage.url":      req.file.path,
        "seo.ogImage.publicId": req.file.filename,
      },
    },
    { new: true }
  );

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { ogImage: updatedClient.seo.ogImage },
        "OG image uploaded successfully."
      )
    );
});

// ─────────────────────────────────────────
// @desc    Delete image by public ID
// @route   DELETE /api/v1/upload/:publicId
// @access  Private
// ─────────────────────────────────────────

const deleteUploadedImage = asyncHandler(async (req, res) => {
  // publicId comes as base64 encoded in URL param
  // to handle slashes in publicId
  let { publicId } = req.params;

  if (!publicId) {
    throw new ApiError(400, "publicId is required.");
  }

  // Decode base64 encoded publicId
  try {
    publicId = Buffer.from(publicId, "base64").toString("utf-8");
  } catch {
    // Not base64 — use as is
  }

  // ── Security — only delete from saas_platform folder
  if (!publicId.startsWith("saas_platform/")) {
    throw new ApiError(
      403,
      "Access denied. Can only delete images from this platform."
    );
  }

  const result = await deleteImage(publicId);

  if (result.result !== "ok" && result.result !== "not found") {
    throw new ApiError(500, "Failed to delete image from Cloudinary.");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { publicId, result: result.result },
        "Image deleted successfully."
      )
    );
});

// ─────────────────────────────────────────
// @desc    Get all images for a client
//          from Cloudinary
// @route   GET /api/v1/upload/gallery
// @access  Private
// ─────────────────────────────────────────

const getClientGallery = asyncHandler(async (req, res) => {
  const clientSlug = req.clientSlug || req.query.clientSlug;

  if (!clientSlug) {
    throw new ApiError(400, "Client slug is required.");
  }

  const {
    folderType = "",
    maxResults = 30,
    nextCursor,
  } = req.query;

  // ── Build folder path ────────────────────
  const folder = folderType
    ? buildFolder(clientSlug, folderType)
    : `saas_platform/${clientSlug}`;

  // ── Fetch from Cloudinary ────────────────
  const searchQuery = cloudinary.search
    .expression(`folder:${folder}/*`)
    .sort_by("created_at", "desc")
    .max_results(parseInt(maxResults));

  if (nextCursor) {
    searchQuery.next_cursor(nextCursor);
  }

  const result = await searchQuery.execute();

  const images = result.resources.map((resource) => ({
    url:         resource.secure_url,
    publicId:    resource.public_id,
    format:      resource.format,
    width:       resource.width,
    height:      resource.height,
    bytes:       resource.bytes,
    createdAt:   resource.created_at,
    folder:      resource.folder,
  }));

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        images,
        "Gallery images fetched successfully.",
        {
          total:      result.total_count,
          nextCursor: result.next_cursor || null,
          maxResults: parseInt(maxResults),
        }
      )
    );
});

// ─────────────────────────────────────────
// @desc    Get upload signature
//          for direct browser-to-cloudinary uploads
// @route   GET /api/v1/upload/signature
// @access  Private
// ─────────────────────────────────────────

const getUploadSignature = asyncHandler(async (req, res) => {
  const { folderType = "general" } = req.query;

  const clientSlug = req.clientSlug || "general";
  const folder     = buildFolder(clientSlug, folderType);
  const timestamp  = Math.round(new Date().getTime() / 1000);

  // ── Generate signature ───────────────────
  const signature = cloudinary.utils.api_sign_request(
    {
      timestamp,
      folder,
      allowed_formats: "jpg,jpeg,png,webp,svg",
    },
    process.env.CLOUDINARY_API_SECRET
  );

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        {
          signature,
          timestamp,
          folder,
          cloudName: process.env.CLOUDINARY_CLOUD_NAME,
          apiKey:    process.env.CLOUDINARY_API_KEY,
          // Never expose API secret — only signature
        },
        "Upload signature generated successfully."
      )
    );
});

export {
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
};