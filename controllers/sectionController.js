import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import Section from "../models/Section.js";
import Client from "../models/Client.js";

// ─────────────────────────────────────────
// HELPER — Resolve client ID from request
// ─────────────────────────────────────────

const resolveClientId = (req) => {
  if (req.user.role === "clientadmin") {
    return req.user.client?.toString() || null;
  }
  return (
    req.body.client ||
    req.query.client ||
    req.clientId ||
    null
  );
};

// ─────────────────────────────────────────
// @desc    Create new section
// @route   POST /api/v1/sections
// @access  Private (all roles — own client only)
// ─────────────────────────────────────────

const createSection = asyncHandler(async (req, res) => {
  const {
    name,
    type,
    page        = "home",
    isVisible   = true,
    backgroundColor,
    paddingTop,
    paddingBottom,
    sortOrder,
  } = req.body;

  // ── Resolve client ───────────────────────
  const clientId = resolveClientId(req);
  if (!clientId) {
    throw new ApiError(400, "Client ID is required.");
  }

  const clientExists = await Client.findById(clientId);
  if (!clientExists) {
    throw new ApiError(404, "Client not found.");
  }

  // ── Get next order number ────────────────
  // Auto-place new section at bottom of page
  const lastSection = await Section.findOne({
    client: clientId,
    page,
  })
    .sort({ order: -1 })
    .lean();

  const order =
    sortOrder !== undefined
      ? sortOrder
      : (lastSection?.order ?? -1) + 1;

  // ── Build section data ───────────────────
  // Extract type-specific data from request body
  const sectionData = {
    client: clientId,
    name,
    type,
    page,
    isVisible,
    order,
  };

  // Optional styling
  if (backgroundColor) sectionData.backgroundColor = backgroundColor;
  if (paddingTop)      sectionData.paddingTop       = paddingTop;
  if (paddingBottom)   sectionData.paddingBottom    = paddingBottom;

  // ── Inject type-specific data ────────────
  const typeDataMap = {
    hero:          "heroData",
    features:      "featuresData",
    testimonials:  "testimonialsData",
    banner:        "bannerData",
    stats:         "statsData",
    gallery:       "galleryData",
    faq:           "faqData",
    newsletter:    "newsletterData",
    custom:        "customData",
  };

  const dataKey = typeDataMap[type];
  if (dataKey && req.body[dataKey]) {
    sectionData[dataKey] = req.body[dataKey];
  }

  const section = await Section.create(sectionData);

  return res
    .status(201)
    .json(
      new ApiResponse(
        201,
        section,
        `Section '${section.name}' created successfully.`
      )
    );
});

// ─────────────────────────────────────────
// @desc    Get all sections for a client page
// @route   GET /api/v1/sections
// @access  Private (admin panel)
// ─────────────────────────────────────────

const getAllSections = asyncHandler(async (req, res) => {
  const { page, type, isVisible } = req.query;

  // ── Resolve client ───────────────────────
  const clientId = resolveClientId(req);
  if (!clientId) {
    throw new ApiError(400, "Client ID is required.");
  }

  // ── Build filter ─────────────────────────
  const filter = { client: clientId };

  if (page)      filter.page      = page;
  if (type)      filter.type      = type;
  if (isVisible !== undefined) {
    filter.isVisible = isVisible === "true";
  }

  const sections = await Section.find(filter)
    .sort({ page: 1, order: 1 })
    .lean();

  // ── Group by page ────────────────────────
  // Useful for admin panel page-wise view
  const grouped = sections.reduce((acc, section) => {
    const pg = section.page;
    if (!acc[pg]) acc[pg] = [];
    acc[pg].push(section);
    return acc;
  }, {});

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        {
          sections, // flat array
          grouped,  // grouped by page
          total: sections.length,
        },
        "Sections fetched successfully."
      )
    );
});

// ─────────────────────────────────────────
// @desc    Get visible sections for a page
//          (client-facing frontend)
// @route   GET /api/v1/sections/page/:page
// @access  Public (resolveClient middleware)
// ─────────────────────────────────────────

const getPageSections = asyncHandler(async (req, res) => {
  const { page = "home" } = req.params;

  if (!req.clientId) {
    throw new ApiError(400, "Client context is required.");
  }

  const validPages = ["home", "about", "contact", "products", "custom"];
  if (!validPages.includes(page)) {
    throw new ApiError(
      400,
      `Invalid page: '${page}'. Valid pages: ${validPages.join(", ")}`
    );
  }

  // Static method from Section model
  const sections = await Section.getPageSections(req.clientId, page);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        sections,
        `Sections for page '${page}' fetched successfully.`
      )
    );
});

// ─────────────────────────────────────────
// @desc    Get single section by ID
// @route   GET /api/v1/sections/:id
// @access  Private
// ─────────────────────────────────────────

const getSection = asyncHandler(async (req, res) => {
  const section = await Section.findById(req.params.id);

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

  return res
    .status(200)
    .json(
      new ApiResponse(200, section, "Section fetched successfully.")
    );
});

// ─────────────────────────────────────────
// @desc    Update section base config
//          (name, visibility, styling, order)
// @route   PUT /api/v1/sections/:id
// @access  Private
// ─────────────────────────────────────────

const updateSection = asyncHandler(async (req, res) => {
  const section = await Section.findById(req.params.id);

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

  // ── Allowed base fields ──────────────────
  const allowedFields = [
    "name",
    "isVisible",
    "order",
    "backgroundColor",
    "paddingTop",
    "paddingBottom",
    "page",
  ];

  const updates = {};
  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  });

  if (Object.keys(updates).length === 0) {
    throw new ApiError(400, "No valid fields provided for update.");
  }

  const updatedSection = await Section.findByIdAndUpdate(
    req.params.id,
    { $set: updates },
    { new: true, runValidators: true }
  );

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        updatedSection,
        "Section updated successfully."
      )
    );
});

// ─────────────────────────────────────────
// @desc    Update section content data
//          (heroData, featuresData, etc.)
// @route   PUT /api/v1/sections/:id/data
// @access  Private
// ─────────────────────────────────────────

const updateSectionData = asyncHandler(async (req, res) => {
  const section = await Section.findById(req.params.id);

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

  // ── Map type to data field ───────────────
  const typeDataMap = {
    hero:         "heroData",
    features:     "featuresData",
    testimonials: "testimonialsData",
    banner:       "bannerData",
    stats:        "statsData",
    gallery:      "galleryData",
    faq:          "faqData",
    newsletter:   "newsletterData",
    custom:       "customData",
  };

  const dataKey = typeDataMap[section.type];

  if (!dataKey) {
    throw new ApiError(
      400,
      `Section type '${section.type}' does not support data updates.`
    );
  }

  // ── Validate data key is in request ──────
  if (!req.body[dataKey] && req.body.data === undefined) {
    throw new ApiError(
      400,
      `Please provide '${dataKey}' in request body for section type '${section.type}'.`
    );
  }

  // Accept both req.body[dataKey] and req.body.data
  const incomingData = req.body[dataKey] || req.body.data;

  // ── Deep merge with existing data ────────
  const existingData = section[dataKey]?.toObject() || {};
  const mergedData   = deepMerge(existingData, incomingData);

  const updatedSection = await Section.findByIdAndUpdate(
    req.params.id,
    { $set: { [dataKey]: mergedData } },
    { new: true, runValidators: true }
  );

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        updatedSection,
        `Section data updated successfully.`
      )
    );
});

// ─────────────────────────────────────────
// @desc    Toggle section visibility
// @route   PUT /api/v1/sections/:id/toggle-visibility
// @access  Private
// ─────────────────────────────────────────

const toggleVisibility = asyncHandler(async (req, res) => {
  const section = await Section.findById(req.params.id);

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

  section.isVisible = !section.isVisible;
  await section.save();

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        {
          _id:       section._id,
          isVisible: section.isVisible,
          name:      section.name,
        },
        `Section '${section.name}' is now ${section.isVisible ? "visible" : "hidden"}.`
      )
    );
});

// ─────────────────────────────────────────
// @desc    Reorder sections (drag and drop)
// @route   PUT /api/v1/sections/reorder
// @access  Private
//
// Body: { sections: [{ id, order }] }
// ─────────────────────────────────────────

const reorderSections = asyncHandler(async (req, res) => {
  const { sections } = req.body;

  if (!sections || !Array.isArray(sections) || sections.length === 0) {
    throw new ApiError(
      400,
      "sections array is required. Format: [{ id, order }]"
    );
  }

  // ── Validate all sections belong to client
  const clientId = resolveClientId(req);

  const sectionIds = sections.map((s) => s.id);
  const existingSections = await Section.find({
    _id:    { $in: sectionIds },
    client: clientId,
  }).lean();

  if (existingSections.length !== sections.length) {
    throw new ApiError(
      400,
      "Some sections not found or do not belong to this client."
    );
  }

  // ── Bulk update orders ───────────────────
  // Static method from Section model
  await Section.bulkReorder(sections);

  // ── Return updated sections ──────────────
  const updatedSections = await Section.find({
    _id: { $in: sectionIds },
  })
    .sort({ order: 1 })
    .lean();

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        updatedSections,
        `${sections.length} section(s) reordered successfully.`
      )
    );
});

// ─────────────────────────────────────────
// @desc    Duplicate a section
// @route   POST /api/v1/sections/:id/duplicate
// @access  Private
// ─────────────────────────────────────────

const duplicateSection = asyncHandler(async (req, res) => {
  const section = await Section.findById(req.params.id).lean();

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

  // ── Find highest order on same page ──────
  const lastSection = await Section.findOne({
    client: section.client,
    page:   section.page,
  })
    .sort({ order: -1 })
    .lean();

  // ── Strip meta fields + create duplicate ─
  const {
    _id,
    createdAt,
    updatedAt,
    ...sectionData
  } = section;

  const duplicated = await Section.create({
    ...sectionData,
    name:      `${section.name} (Copy)`,
    isVisible: false,  // Hidden by default
    order:     (lastSection?.order ?? 0) + 1,
  });

  return res
    .status(201)
    .json(
      new ApiResponse(
        201,
        duplicated,
        `Section duplicated as '${duplicated.name}' successfully.`
      )
    );
});

// ─────────────────────────────────────────
// @desc    Add item to section array data
//          (e.g. add a feature item, FAQ item)
// @route   POST /api/v1/sections/:id/items
// @access  Private
// ─────────────────────────────────────────

const addSectionItem = asyncHandler(async (req, res) => {
  const section = await Section.findById(req.params.id);

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

  // ── Map type to items field path ─────────
  const typeItemsMap = {
    features:     "featuresData.items",
    testimonials: "testimonialsData.items",
    stats:        "statsData.items",
    gallery:      "galleryData.images",
    faq:          "faqData.items",
  };

  const itemsPath = typeItemsMap[section.type];

  if (!itemsPath) {
    throw new ApiError(
      400,
      `Section type '${section.type}' does not support item addition.`
    );
  }

  const { item } = req.body;

  if (!item) {
    throw new ApiError(400, "item is required in request body.");
  }

  // ── Append item ──────────────────────────
  const updatedSection = await Section.findByIdAndUpdate(
    req.params.id,
    { $push: { [itemsPath]: item } },
    { new: true }
  );

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        updatedSection,
        "Item added to section successfully."
      )
    );
});

// ─────────────────────────────────────────
// @desc    Remove item from section array
// @route   DELETE /api/v1/sections/:id/items/:index
// @access  Private
// ─────────────────────────────────────────

const removeSectionItem = asyncHandler(async (req, res) => {
  const section = await Section.findById(req.params.id);

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

  const itemIndex = parseInt(req.params.index);

  // ── Map type to items array ───────────────
  const typeItemsMap = {
    features:     "featuresData",
    testimonials: "testimonialsData",
    stats:        "statsData",
    faq:          "faqData",
    gallery:      "galleryData",
  };

  const dataKey   = typeItemsMap[section.type];
  const arrayKey  = section.type === "gallery" ? "images" : "items";

  if (!dataKey) {
    throw new ApiError(
      400,
      `Section type '${section.type}' does not support item removal.`
    );
  }

  const itemsArray = section[dataKey]?.[arrayKey];

  if (!itemsArray || itemIndex < 0 || itemIndex >= itemsArray.length) {
    throw new ApiError(
      400,
      `Invalid item index: ${itemIndex}. Array has ${itemsArray?.length || 0} items.`
    );
  }

  // ── Remove item by index ─────────────────
  // MongoDB $unset + $pull trick for index removal
  itemsArray.splice(itemIndex, 1);
  section[dataKey][arrayKey] = itemsArray;
  section.markModified(dataKey);
  await section.save();

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        section,
        "Item removed from section successfully."
      )
    );
});

// ─────────────────────────────────────────
// @desc    Delete section
// @route   DELETE /api/v1/sections/:id
// @access  Private
// ─────────────────────────────────────────

const deleteSection = asyncHandler(async (req, res) => {
  const section = await Section.findById(req.params.id);

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

  await Section.findByIdAndDelete(req.params.id);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        null,
        `Section '${section.name}' deleted successfully.`
      )
    );
});

// ─────────────────────────────────────────
// UTILITY — Deep merge two objects
// Used for partial section data updates
// ─────────────────────────────────────────

const deepMerge = (target, source) => {
  if (!source) return target;

  const output = { ...target };

  Object.keys(source).forEach((key) => {
    if (
      source[key] !== null &&
      typeof source[key] === "object" &&
      !Array.isArray(source[key])
    ) {
      // Recursively merge nested objects
      output[key] = deepMerge(target[key] || {}, source[key]);
    } else {
      // Arrays + primitives — override directly
      output[key] = source[key];
    }
  });

  return output;
};

export {
  createSection,
  getAllSections,
  getPageSections,
  getSection,
  updateSection,
  updateSectionData,
  toggleVisibility,
  reorderSections,
  duplicateSection,
  addSectionItem,
  removeSectionItem,
  deleteSection,
};