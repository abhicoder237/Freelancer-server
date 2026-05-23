import asyncHandler from "../utils/asyncHandler.js";
import ApiError     from "../utils/ApiError.js";
import Client       from "../models/Client.js";

// ─────────────────────────────────────────
// HELPER — Extract client identifier
// ─────────────────────────────────────────

const extractClientIdentifier = (req) => {
  // Strategy 1 — Custom Header
  const slugHeader = req.headers["x-client-slug"];
  if (slugHeader && slugHeader.trim()) {
    return { type: "slug", value: slugHeader.trim().toLowerCase() };
  }

  // Strategy 2 — Subdomain
  const host           = req.headers.host || "";
  const platformDomain = process.env.PLATFORM_DOMAIN || "youragency.com";

  if (host.endsWith(`.${platformDomain}`)) {
    const subdomain = host.replace(`.${platformDomain}`, "").trim();
    if (subdomain && subdomain !== "www" && subdomain !== "api") {
      return { type: "subdomain", value: subdomain.toLowerCase() };
    }
  }

  // Strategy 3 — Custom Domain
  if (
    host &&
    !host.includes(platformDomain) &&
    !host.includes("localhost") &&
    !host.includes("127.0.0.1")
  ) {
    return {
      type:  "customDomain",
      value: host.toLowerCase().replace(/^www\./, ""),
    };
  }

  // Strategy 4 — Query Param (dev only)
  if (process.env.NODE_ENV === "development" && req.query.client) {
    return {
      type:  "slug",
      value: req.query.client.trim().toLowerCase(),
    };
  }

  return null;
};

// ─────────────────────────────────────────
// RESOLVE CLIENT — mandatory
// ─────────────────────────────────────────

const resolveClient = asyncHandler(async (req, res, next) => {
  const identifier = extractClientIdentifier(req);

  if (!identifier) {
    throw new ApiError(
      400,
      "Client identifier is required. Provide 'x-client-slug' header or use a valid subdomain."
    );
  }

  let query = { isActive: true };

  switch (identifier.type) {
    case "slug":
      query.slug = identifier.value;
      break;
    case "subdomain":
      query.subdomain = identifier.value;
      break;
    case "customDomain":
      query.customDomain = identifier.value;
      break;
    default:
      throw new ApiError(400, "Invalid client identifier type.");
  }

  const client = await Client.findOne(query)
    .populate({ path: "theme", select: "-__v" })
    .lean();

  if (!client) {
    throw new ApiError(
      404,
      `No active client found for identifier: '${identifier.value}'.`
    );
  }

  if (client.isUnderMaintenance) {
    throw new ApiError(
      503,
      client.maintenanceMessage ||
        "This website is currently under maintenance. Please check back soon."
    );
  }

  if (client.plan !== "free" && client.planExpiry) {
    const isExpired = new Date(client.planExpiry) < new Date();
    if (isExpired) {
      throw new ApiError(
        402,
        "Client subscription has expired. Please renew your plan."
      );
    }
  }

  req.client     = client;
  req.clientId   = client._id.toString();
  req.clientSlug = client.slug;

  next();
});

// ─────────────────────────────────────────
// OPTIONAL RESOLVE CLIENT
// Does NOT throw if client not found
// ─────────────────────────────────────────

const optionalResolveClient = asyncHandler(async (req, res, next) => {
  const identifier = extractClientIdentifier(req);

  if (!identifier) {
    req.client     = null;
    req.clientId   = null;
    req.clientSlug = null;
    return next();
  }

  try {
    let query = { isActive: true };

    switch (identifier.type) {
      case "slug":
        query.slug = identifier.value;
        break;
      case "subdomain":
        query.subdomain = identifier.value;
        break;
      case "customDomain":
        query.customDomain = identifier.value;
        break;
    }

    const client = await Client.findOne(query)
      .populate("theme")
      .lean();

    req.client     = client || null;
    req.clientId   = client?._id?.toString() || null;
    req.clientSlug = client?.slug || null;
  } catch {
    req.client     = null;
    req.clientId   = null;
    req.clientSlug = null;
  }

  next();
});

// ─────────────────────────────────────────
// VERIFY CLIENT OWNERSHIP
// ─────────────────────────────────────────

const verifyClientOwnership = asyncHandler(async (req, res, next) => {
  const { user, client } = req;

  if (!user) throw new ApiError(401, "Authentication required.");
  if (!client) throw new ApiError(400, "Client context is required.");

  if (user.role === "superadmin" || user.role === "admin") {
    return next();
  }

  if (!user.client) {
    throw new ApiError(
      403,
      "Access denied. Your account is not associated with any client."
    );
  }

  if (user.client.toString() !== client._id.toString()) {
    throw new ApiError(
      403,
      "Access denied. You do not have permission to manage this client."
    );
  }

  next();
});

// ─────────────────────────────────────────
// INJECT CLIENT TO UPLOAD
// Safe fallback — no crash if slug missing
// ─────────────────────────────────────────

const injectClientToUpload = (folderType) => {
  return asyncHandler(async (req, res, next) => {
    req.uploadFolderType = folderType;
    // ✅ Fallback to "general" if no slug — no crash
    req.uploadClientSlug = req.clientSlug || "general";
    next();
  });
};

export {
  resolveClient,
  optionalResolveClient,
  verifyClientOwnership,
  injectClientToUpload,
};