 import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import Client from "../models/Client.js";
import User from "../models/User.js";
import Theme from "../models/Theme.js";
import Product from "../models/Product.js";
import Section from "../models/Section.js";
import { deleteImage, extractPublicId } from "../config/cloudinary.js";

// ─────────────────────────────────────────
// HELPER — Clean empty strings to undefined
// ─────────────────────────────────────────

const cleanEmpty = (val) => {
  if (val === "" || val === null || val === undefined) return undefined;
  if (typeof val === "string") return val.trim() || undefined;
  return val;
};

const cleanObject = (obj) => {
  if (!obj || typeof obj !== "object") return obj;
  const cleaned = {};
  Object.keys(obj).forEach((key) => {
    const val = obj[key];
    if (typeof val === "object" && !Array.isArray(val) && val !== null) {
      const nested = cleanObject(val);
      if (Object.keys(nested).length > 0) cleaned[key] = nested;
    } else {
      const clean = cleanEmpty(val);
      if (clean !== undefined) cleaned[key] = clean;
    }
  });
  return cleaned;
};

// ─────────────────────────────────────────
// @desc    Create new client
// @route   POST /api/v1/clients
// @access  Private (superadmin / admin)
// ─────────────────────────────────────────

const createClient = asyncHandler(async (req, res) => {
  const {
    name,
    tagline,
    description,
    businessType,
    plan,
    contact,
    social,
    seo,
    customDomain,
    subdomain,
  } = req.body;

  // ── Check duplicate custom domain ────────
  const cleanCustomDomain = cleanEmpty(customDomain);
  const cleanSubdomain    = cleanEmpty(subdomain);

  if (cleanCustomDomain) {
    const domainExists = await Client.findOne({
      customDomain: cleanCustomDomain,
    });
    if (domainExists) {
      throw new ApiError(
        409,
        `Custom domain '${cleanCustomDomain}' is already registered to another client.`
      );
    }
  }

  if (cleanSubdomain) {
    const subdomainExists = await Client.findOne({
      subdomain: cleanSubdomain,
    });
    if (subdomainExists) {
      throw new ApiError(409, `Subdomain '${cleanSubdomain}' is already taken.`);
    }
  }

  // ── Create client ────────────────────────
  const client = await Client.create({
    name,
    tagline:      cleanEmpty(tagline),
    description:  cleanEmpty(description),
    businessType: businessType || "other",
    plan:         plan || "free",
    contact:      cleanObject(contact),
    social:       cleanObject(social),
    seo:          cleanObject(seo),
    customDomain: cleanCustomDomain,
    subdomain:    cleanSubdomain,
  });

  // ── Create default theme for client ──────
  const defaultTheme = await Theme.create({
    client:   client._id,
    name:     "Default Theme",
    preset:   "default",
    isActive: true,
  });

  client.theme = defaultTheme._id;
  await client.save();

  const populatedClient = await Client.findById(client._id).populate("theme");

  return res
    .status(201)
    .json(
      new ApiResponse(
        201,
        populatedClient,
        `Client '${client.name}' created successfully with default theme.`
      )
    );
});

// ─────────────────────────────────────────
// @desc    Get all clients (paginated)
// @route   GET /api/v1/clients
// @access  Private (superadmin / admin)
// ─────────────────────────────────────────

const getAllClients = asyncHandler(async (req, res) => {
  const {
    page        = 1,
    limit       = 10,
    search,
    plan,
    businessType,
    isActive,
    sort        = "-createdAt",
  } = req.query;

  const filter = {};

  if (plan)         filter.plan         = plan;
  if (businessType) filter.businessType = businessType;

  if (isActive !== undefined) {
    filter.isActive = isActive === "true";
  }

  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { slug: { $regex: search, $options: "i" } },
    ];
  }

  const skip  = (parseInt(page) - 1) * parseInt(limit);
  const total = await Client.countDocuments(filter);

  const sortObj = {};
  if (sort.startsWith("-")) {
    sortObj[sort.slice(1)] = -1;
  } else {
    sortObj[sort] = 1;
  }

  const clients = await Client.find(filter)
    .populate({ path: "theme", select: "name preset isActive colors" })
    .populate({ path: "owner", select: "name email" })
    .sort(sortObj)
    .skip(skip)
    .limit(parseInt(limit))
    .lean();

  return res.status(200).json(
    new ApiResponse(200, clients, "Clients fetched successfully.", {
      total,
      page:       parseInt(page),
      limit:      parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit)),
    })
  );
});

// ─────────────────────────────────────────
// @desc    Get single client by slug or ID
// @route   GET /api/v1/clients/:identifier
// @access  Private (admin+) / Public (own client)
// ─────────────────────────────────────────

const getClient = asyncHandler(async (req, res) => {
  const { identifier } = req.params;

  let client = null;
  const isMongoId = /^[0-9a-fA-F]{24}$/.test(identifier);

  if (isMongoId) {
    client = await Client.findById(identifier)
      .populate("theme")
      .populate({ path: "owner", select: "name email avatar" });
  } else {
    client = await Client.findOne({ slug: identifier })
      .populate("theme")
      .populate({ path: "owner", select: "name email avatar" });
  }

  if (!client) {
    throw new ApiError(404, `Client not found: '${identifier}'.`);
  }

  return res
    .status(200)
    .json(new ApiResponse(200, client, "Client fetched successfully."));
});

// ─────────────────────────────────────────
// @desc    Get current client config (public)
// @route   GET /api/v1/clients/config
// @access  Public (resolveClient middleware required)
// ─────────────────────────────────────────

const getClientConfig = asyncHandler(async (req, res) => {
  const { client } = req;

  if (!client) {
    throw new ApiError(400, "Client context not found.");
  }

  const sectionsCount = await Section.countDocuments({
    client:    client._id,
    isVisible: true,
  });

  const productsCount = await Product.countDocuments({
    client: client._id,
    status: "active",
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        ...client,
        _counts: {
          sections: sectionsCount,
          products: productsCount,
        },
      },
      "Client config fetched successfully."
    )
  );
});

// ─────────────────────────────────────────
// @desc    Update client
// @route   PUT /api/v1/clients/:id
// @access  Private (superadmin/admin/clientadmin)
// ─────────────────────────────────────────

const updateClient = asyncHandler(async (req, res) => {
  const client = await Client.findById(req.params.id);

  if (!client) {
    throw new ApiError(404, "Client not found.");
  }

  const allowedFields = [
    "name",
    "tagline",
    "description",
    "businessType",
    "contact",
    "social",
    "seo",
    "customDomain",
    "subdomain",
    "maintenanceMessage",
  ];

  const superAdminFields = [
    "plan",
    "planExpiry",
    "isActive",
    "isUnderMaintenance",
  ];

  const updates = {};

  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      if (field === "customDomain" || field === "subdomain") {
        // ✅ Empty string → undefined
        updates[field] = cleanEmpty(req.body[field]);
      } else if (
        field === "contact" ||
        field === "social" ||
        field === "seo"
      ) {
        updates[field] = cleanObject(req.body[field]);
      } else {
        updates[field] = req.body[field];
      }
    }
  });

  if (
    req.user.role === "superadmin" ||
    req.user.role === "admin"
  ) {
    superAdminFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });
  }

  // ── Custom domain uniqueness check ───────
  if (
    updates.customDomain &&
    updates.customDomain !== client.customDomain
  ) {
    const domainExists = await Client.findOne({
      customDomain: updates.customDomain,
      _id: { $ne: client._id },
    });
    if (domainExists) {
      throw new ApiError(
        409,
        `Custom domain '${updates.customDomain}' is already taken.`
      );
    }
  }

  // ── Subdomain uniqueness check ───────────
  if (
    updates.subdomain &&
    updates.subdomain !== client.subdomain
  ) {
    const subdomainExists = await Client.findOne({
      subdomain: updates.subdomain,
      _id: { $ne: client._id },
    });
    if (subdomainExists) {
      throw new ApiError(
        409,
        `Subdomain '${updates.subdomain}' is already taken.`
      );
    }
  }

  // ── Handle undefined values (unset fields) ─
  const setFields   = {};
  const unsetFields = {};

  Object.keys(updates).forEach((key) => {
    if (updates[key] === undefined) {
      unsetFields[key] = 1;
    } else {
      setFields[key] = updates[key];
    }
  });

  const updateOp = {};
  if (Object.keys(setFields).length > 0)   updateOp.$set   = setFields;
  if (Object.keys(unsetFields).length > 0) updateOp.$unset = unsetFields;

  const updatedClient = await Client.findByIdAndUpdate(
    req.params.id,
    updateOp,
    { new: true, runValidators: true }
  ).populate("theme");

  return res
    .status(200)
    .json(
      new ApiResponse(200, updatedClient, "Client updated successfully.")
    );
});

// ─────────────────────────────────────────
// @desc    Update client logo
// @route   PUT /api/v1/clients/:id/logo
// @access  Private (superadmin/admin/clientadmin)
// ─────────────────────────────────────────

const updateClientLogo = asyncHandler(async (req, res) => {
  const client = await Client.findById(req.params.id);

  if (!client) {
    throw new ApiError(404, "Client not found.");
  }

  if (!req.file) {
    throw new ApiError(400, "No logo file uploaded.");
  }

  if (client.logo?.publicId) {
    await deleteImage(client.logo.publicId);
  }

  const updatedClient = await Client.findByIdAndUpdate(
    req.params.id,
    {
      $set: {
        logo: {
          url:      req.file.path,
          publicId: req.file.filename,
          altText:  req.body.altText || `${client.name} logo`,
        },
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
        "Client logo updated successfully."
      )
    );
});

// ─────────────────────────────────────────
// @desc    Toggle maintenance mode
// @route   PUT /api/v1/clients/:id/maintenance
// @access  Private (superadmin / admin)
// ─────────────────────────────────────────

const toggleMaintenance = asyncHandler(async (req, res) => {
  const client = await Client.findById(req.params.id);

  if (!client) {
    throw new ApiError(404, "Client not found.");
  }

  const { isUnderMaintenance, maintenanceMessage } = req.body;

  const updatedClient = await Client.findByIdAndUpdate(
    req.params.id,
    {
      $set: {
        isUnderMaintenance:
          isUnderMaintenance ?? !client.isUnderMaintenance,
        ...(maintenanceMessage && { maintenanceMessage }),
      },
    },
    { new: true }
  );

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        isUnderMaintenance: updatedClient.isUnderMaintenance,
        maintenanceMessage: updatedClient.maintenanceMessage,
      },
      `Maintenance mode ${
        updatedClient.isUnderMaintenance ? "enabled" : "disabled"
      } successfully.`
    )
  );
});

// ─────────────────────────────────────────
// @desc    Get client dashboard stats
// @route   GET /api/v1/clients/:id/stats
// @access  Private (all roles — own client only)
// ─────────────────────────────────────────

const getClientStats = asyncHandler(async (req, res) => {
  const clientId = req.params.id;

  const client = await Client.findById(clientId);
  if (!client) {
    throw new ApiError(404, "Client not found.");
  }

  const [
    totalProducts,
    activeProducts,
    featuredProducts,
    totalSections,
    visibleSections,
    outOfStockProducts,
  ] = await Promise.all([
    Product.countDocuments({ client: clientId }),
    Product.countDocuments({ client: clientId, status: "active" }),
    Product.countDocuments({ client: clientId, isFeatured: true }),
    Section.countDocuments({ client: clientId }),
    Section.countDocuments({ client: clientId, isVisible: true }),
    Product.countDocuments({
      client:         clientId,
      trackInventory: true,
      stock:          0,
    }),
  ]);

  const categoryBreakdown = await Product.aggregate([
    { $match: { client: client._id } },
    { $group: { _id: "$category", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 5 },
  ]);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        products: {
          total:      totalProducts,
          active:     activeProducts,
          featured:   featuredProducts,
          outOfStock: outOfStockProducts,
          draft:      totalProducts - activeProducts,
        },
        sections: {
          total:   totalSections,
          visible: visibleSections,
          hidden:  totalSections - visibleSections,
        },
        pageViews:          client.totalPageViews,
        topCategories:      categoryBreakdown,
        plan:               client.plan,
        isUnderMaintenance: client.isUnderMaintenance,
      },
      "Client stats fetched successfully."
    )
  );
});

// ─────────────────────────────────────────
// @desc    Assign owner to client
// @route   PUT /api/v1/clients/:id/assign-owner
// @access  Private (superadmin / admin)
// ─────────────────────────────────────────

const assignOwner = asyncHandler(async (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    throw new ApiError(400, "User ID is required.");
  }

  const [client, user] = await Promise.all([
    Client.findById(req.params.id),
    User.findById(userId),
  ]);

  if (!client) throw new ApiError(404, "Client not found.");
  if (!user)   throw new ApiError(404, "User not found.");

  if (user.role !== "clientadmin") {
    throw new ApiError(
      400,
      "Only users with role 'clientadmin' can be assigned as client owner."
    );
  }

  await Promise.all([
    Client.findByIdAndUpdate(req.params.id, { $set: { owner: userId } }),
    User.findByIdAndUpdate(userId, { $set: { client: req.params.id } }),
  ]);

  return res.status(200).json(
    new ApiResponse(
      200,
      { clientId: req.params.id, ownerId: userId },
      `User '${user.name}' assigned as owner of '${client.name}' successfully.`
    )
  );
});

// ─────────────────────────────────────────
// @desc    Delete client (and all related data)
// @route   DELETE /api/v1/clients/:id
// @access  Private (superadmin only)
// ─────────────────────────────────────────

const deleteClient = asyncHandler(async (req, res) => {
  const client = await Client.findById(req.params.id);

  if (!client) {
    throw new ApiError(404, "Client not found.");
  }

  if (client.logo?.publicId) {
    await deleteImage(client.logo.publicId).catch(console.error);
  }

  const products = await Product.find({ client: client._id });
  const imageDeletePromises = products.flatMap((product) =>
    product.images
      .filter((img) => img.publicId)
      .map((img) => deleteImage(img.publicId).catch(console.error))
  );
  await Promise.all(imageDeletePromises);

  await Promise.all([
    Product.deleteMany({ client: client._id }),
    Theme.deleteMany({ client: client._id }),
    Section.deleteMany({ client: client._id }),
    User.updateMany(
      { client: client._id },
      { $set: { client: null, isActive: false } }
    ),
  ]);

  await Client.findByIdAndDelete(req.params.id);

  return res.status(200).json(
    new ApiResponse(
      200,
      null,
      `Client '${client.name}' and all associated data deleted successfully.`
    )
  );
});

export {
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
};