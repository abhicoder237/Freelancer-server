import asyncHandler  from "../utils/asyncHandler.js";
import ApiError      from "../utils/ApiError.js";
import ApiResponse   from "../utils/ApiResponse.js";
import Product       from "../models/Product.js";
import Client        from "../models/Client.js";
import { deleteImage } from "../config/cloudinary.js";

// ─────────────────────────────────────────
// @desc    Create new product
// @route   POST /api/v1/products
// @access  Private
// ─────────────────────────────────────────

const createProduct = asyncHandler(async (req, res) => {
  const {
    name,
    description,
    shortDescription,
    category,
    subcategory,
    price,
    compareAtPrice,
    currency,
    sku,
    stock,
    trackInventory,
    variants,
    hasVariants,
    weight,
    isFreeShipping,
    status,
    isFeatured,
    isDigital,
    tags,
    seo,
    sortOrder,
  } = req.body;

  // ── Resolve client ID ────────────────────
  let clientId;

  if (req.user.role === "clientadmin") {
    clientId = req.user.client?.toString();
    if (!clientId) {
      throw new ApiError(
        400,
        "Your account is not associated with any client."
      );
    }
  } else {
    // admin/superadmin → from body or req.clientId
    clientId =
      req.body.client ||
      req.clientId    ||
      null;

    if (!clientId) {
      throw new ApiError(
        400,
        "Client ID is required. Provide 'client' field in request body."
      );
    }
  }

  // ── Verify client exists ─────────────────
  const clientExists = await Client.findById(clientId);
  if (!clientExists) {
    throw new ApiError(404, "Client not found.");
  }

  // ── Check duplicate SKU ──────────────────
  if (sku) {
    const skuExists = await Product.findOne({
      client: clientId,
      sku:    sku.toUpperCase(),
    });
    if (skuExists) {
      throw new ApiError(
        409,
        `SKU '${sku.toUpperCase()}' already exists for this client.`
      );
    }
  }

  // ── Create product ───────────────────────
  const product = await Product.create({
    client:          clientId,
    name,
    description,
    shortDescription: shortDescription || undefined,
    category,
    subcategory:      subcategory || undefined,
    price,
    compareAtPrice:   compareAtPrice || null,
    currency:         currency || "INR",
    sku:              sku || undefined,
    stock:            stock || 0,
    trackInventory:   trackInventory ?? true,
    variants:         variants || [],
    hasVariants:      hasVariants || false,
    weight,
    isFreeShipping:   isFreeShipping || false,
    status:           status || "draft",
    isFeatured:       isFeatured || false,
    isDigital:        isDigital || false,
    tags:             tags || [],
    seo,
    sortOrder:        sortOrder || 0,
  });

  // ── Update client product count ──────────
  await Client.findByIdAndUpdate(clientId, {
    $inc: { totalProducts: 1 },
  });

  return res
    .status(201)
    .json(
      new ApiResponse(
        201,
        product,
        `Product '${product.name}' created successfully.`
      )
    );
});

// ─────────────────────────────────────────
// @desc    Get all products (admin panel)
// @route   GET /api/v1/products
// @access  Private
// ─────────────────────────────────────────

const getAllProducts = asyncHandler(async (req, res) => {
  const {
    page        = 1,
    limit       = 12,
    search,
    category,
    subcategory,
    status,
    isFeatured,
    minPrice,
    maxPrice,
    inStock,
    sort        = "-createdAt",
    tags,
  } = req.query;

  // ── Resolve client filter ────────────────
  let clientFilter = {};

  if (req.user.role === "clientadmin") {
    clientFilter = { client: req.user.client };
  } else if (req.clientId) {
    clientFilter = { client: req.clientId };
  }
  // admin/superadmin without clientId → all products

  const filter = { ...clientFilter };

  if (category)    filter.category    = { $regex: category, $options: "i" };
  if (subcategory) filter.subcategory = { $regex: subcategory, $options: "i" };
  if (status)      filter.status      = status;

  if (isFeatured !== undefined) {
    filter.isFeatured = isFeatured === "true";
  }

  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = parseFloat(minPrice);
    if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
  }

  if (inStock === "true") {
    filter.$or = [
      { trackInventory: false },
      { stock: { $gt: 0 } },
    ];
  }

  if (tags) {
    const tagsArray = tags.split(",").map((t) => t.trim());
    filter.tags = { $in: tagsArray };
  }

  if (search) {
    filter.$text = { $search: search };
  }

  let sortObj = {};
  if (search) {
    sortObj = { score: { $meta: "textScore" } };
  } else if (sort.startsWith("-")) {
    sortObj[sort.slice(1)] = -1;
  } else {
    sortObj[sort] = 1;
  }

  const skip  = (parseInt(page) - 1) * parseInt(limit);
  const total = await Product.countDocuments(filter);

  let query = Product.find(filter)
    .sort(sortObj)
    .skip(skip)
    .limit(parseInt(limit));

  if (search) {
    query = query.select({ score: { $meta: "textScore" } });
  }

  const products = await query.lean();

  return res.status(200).json(
    new ApiResponse(200, products, "Products fetched successfully.", {
      total,
      page:       parseInt(page),
      limit:      parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit)),
    })
  );
});

// ─────────────────────────────────────────
// @desc    Get public products (storefront)
// @route   GET /api/v1/products/public
// @access  Public
// ─────────────────────────────────────────

const getPublicProducts = asyncHandler(async (req, res) => {
  const {
    page     = 1,
    limit    = 12,
    category,
    search,
    minPrice,
    maxPrice,
    inStock,
    sort     = "-createdAt",
    tags,
  } = req.query;

  if (!req.clientId) {
    throw new ApiError(400, "Client context is required.");
  }

  const filter = {
    client: req.clientId,
    status: "active",
  };

  if (category) filter.category = { $regex: category, $options: "i" };

  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = parseFloat(minPrice);
    if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
  }

  if (inStock === "true") {
    filter.$or = [
      { trackInventory: false },
      { stock: { $gt: 0 } },
    ];
  }

  if (tags) {
    const tagsArray = tags.split(",").map((t) => t.trim());
    filter.tags = { $in: tagsArray };
  }

  if (search) {
    filter.$text = { $search: search };
  }

  let sortObj = {};
  if (search) {
    sortObj = { score: { $meta: "textScore" } };
  } else if (sort.startsWith("-")) {
    sortObj[sort.slice(1)] = -1;
  } else {
    sortObj[sort] = 1;
  }

  const skip  = (parseInt(page) - 1) * parseInt(limit);
  const total = await Product.countDocuments(filter);

  let query = Product.find(filter)
    .select("-__v")
    .sort(sortObj)
    .skip(skip)
    .limit(parseInt(limit));

  if (search) {
    query = query.select({ score: { $meta: "textScore" } });
  }

  const products = await query.lean();

  return res.status(200).json(
    new ApiResponse(200, products, "Products fetched successfully.", {
      total,
      page:       parseInt(page),
      limit:      parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit)),
    })
  );
});

// ─────────────────────────────────────────
// @desc    Get single product
// @route   GET /api/v1/products/:identifier
// @access  Public
// ─────────────────────────────────────────

const getProduct = asyncHandler(async (req, res) => {
  const { identifier } = req.params;

  let product     = null;
  const isMongoId = /^[0-9a-fA-F]{24}$/.test(identifier);

  if (isMongoId) {
    product = await Product.findById(identifier).lean();
  } else {
    if (!req.clientId) {
      throw new ApiError(400, "Client context required for slug-based lookup.");
    }
    product = await Product.findOne({
      client: req.clientId,
      slug:   identifier,
      status: "active",
    }).lean();
  }

  if (!product) {
    throw new ApiError(404, `Product not found: '${identifier}'.`);
  }

  return res
    .status(200)
    .json(new ApiResponse(200, product, "Product fetched successfully."));
});

// ─────────────────────────────────────────
// @desc    Get featured products
// @route   GET /api/v1/products/featured
// @access  Public
// ─────────────────────────────────────────

const getFeaturedProducts = asyncHandler(async (req, res) => {
  if (!req.clientId) {
    throw new ApiError(400, "Client context is required.");
  }

  const limit = parseInt(req.query.limit) || 8;

  const products = await Product.find({
    client:     req.clientId,
    status:     "active",
    isFeatured: true,
  })
    .sort({ sortOrder: 1, createdAt: -1 })
    .limit(limit)
    .lean();

  return res
    .status(200)
    .json(
      new ApiResponse(200, products, "Featured products fetched successfully.")
    );
});

// ─────────────────────────────────────────
// @desc    Get categories
// @route   GET /api/v1/products/categories
// @access  Public
// ─────────────────────────────────────────

const getCategories = asyncHandler(async (req, res) => {
  if (!req.clientId) {
    throw new ApiError(400, "Client context is required.");
  }

  const categories = await Product.aggregate([
    {
      $match: {
        client: req.client._id,
        status: "active",
      },
    },
    {
      $group: {
        _id:           "$category",
        count:         { $sum: 1 },
        subcategories: { $addToSet: "$subcategory" },
      },
    },
    { $sort: { count: -1 } },
    {
      $project: {
        _id:          0,
        category:     "$_id",
        count:        1,
        subcategories: {
          $filter: {
            input: "$subcategories",
            as:    "sub",
            cond:  { $ne: ["$$sub", ""] },
          },
        },
      },
    },
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, categories, "Categories fetched successfully."));
});

// ─────────────────────────────────────────
// @desc    Update product
// @route   PUT /api/v1/products/:id
// @access  Private
// ─────────────────────────────────────────

const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    throw new ApiError(404, "Product not found.");
  }

  if (
    req.user.role === "clientadmin" &&
    product.client.toString() !== req.user.client?.toString()
  ) {
    throw new ApiError(403, "Access denied.");
  }

  if (req.body.sku && req.body.sku !== product.sku) {
    const skuExists = await Product.findOne({
      client: product.client,
      sku:    req.body.sku.toUpperCase(),
      _id:    { $ne: product._id },
    });
    if (skuExists) {
      throw new ApiError(
        409,
        `SKU '${req.body.sku.toUpperCase()}' already exists for this client.`
      );
    }
  }

  const updatedProduct = await Product.findByIdAndUpdate(
    req.params.id,
    { $set: req.body },
    { new: true, runValidators: true }
  );

  return res
    .status(200)
    .json(
      new ApiResponse(200, updatedProduct, "Product updated successfully.")
    );
});

// ─────────────────────────────────────────
// @desc    Add images to product
// @route   POST /api/v1/products/:id/images
// @access  Private
// ─────────────────────────────────────────

 
const addProductImages = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    throw new ApiError(404, "Product not found.");
  }

  // ── Tenant isolation ─────────────────────
  if (
    req.user.role === "clientadmin" &&
    product.client.toString() !== req.user.client?.toString()
  ) {
    throw new ApiError(403, "Access denied.");
  }

  // ── Check files uploaded ─────────────────
  if (!req.files || req.files.length === 0) {
    throw new ApiError(
      400,
      "No images uploaded. Please select at least one image file."
    );
  }

  // ── Check image limit ────────────────────
  const currentImageCount = product.images.length;
  if (currentImageCount + req.files.length > 10) {
    throw new ApiError(
      400,
      `Cannot add ${req.files.length} image(s). Product already has ${currentImageCount} image(s). Maximum is 10.`
    );
  }

  // ── Build image objects ──────────────────
  const newImages = req.files.map((file, index) => ({
    url:       file.path,       // Cloudinary URL
    publicId:  file.filename,   // Cloudinary public_id
    altText:   req.body.altText || product.name,
    isPrimary: currentImageCount === 0 && index === 0,
  }));

  // ── Push to product ──────────────────────
  const updatedProduct = await Product.findByIdAndUpdate(
    req.params.id,
    { $push: { images: { $each: newImages } } },
    { new: true }
  );

  return res.status(200).json(
    new ApiResponse(
      200,
      { images: updatedProduct.images },
      `${newImages.length} image(s) added successfully.`
    )
  );
});

// ─────────────────────────────────────────
// @desc    Delete product image
// @route   DELETE /api/v1/products/:id/images/:publicId
// @access  Private
// ─────────────────────────────────────────

const deleteProductImage = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    throw new ApiError(404, "Product not found.");
  }

  if (
    req.user.role === "clientadmin" &&
    product.client.toString() !== req.user.client?.toString()
  ) {
    throw new ApiError(403, "Access denied.");
  }

  const { publicId } = req.params;

  const imageIndex = product.images.findIndex(
    (img) => img.publicId === publicId
  );

  if (imageIndex === -1) {
    throw new ApiError(404, "Image not found in this product.");
  }

  const imageToDelete = product.images[imageIndex];

  await deleteImage(publicId);

  product.images.splice(imageIndex, 1);

  if (imageToDelete.isPrimary && product.images.length > 0) {
    product.images[0].isPrimary = true;
  }

  await product.save();

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { images: product.images },
        "Image deleted successfully."
      )
    );
});

// ─────────────────────────────────────────
// @desc    Set primary image
// @route   PUT /api/v1/products/:id/images/:publicId/primary
// @access  Private
// ─────────────────────────────────────────

const setPrimaryImage = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    throw new ApiError(404, "Product not found.");
  }

  const { publicId } = req.params;

  const targetImage = product.images.find(
    (img) => img.publicId === publicId
  );

  if (!targetImage) {
    throw new ApiError(404, "Image not found in this product.");
  }

  product.images.forEach((img) => {
    img.isPrimary = img.publicId === publicId;
  });

  await product.save();

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { images: product.images },
        "Primary image updated successfully."
      )
    );
});

// ─────────────────────────────────────────
// @desc    Toggle featured
// @route   PUT /api/v1/products/:id/toggle-featured
// @access  Private
// ─────────────────────────────────────────

const toggleFeatured = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    throw new ApiError(404, "Product not found.");
  }

  product.isFeatured = !product.isFeatured;
  await product.save();

  return res.status(200).json(
    new ApiResponse(
      200,
      { _id: product._id, isFeatured: product.isFeatured },
      `Product ${product.isFeatured ? "marked as featured" : "removed from featured"} successfully.`
    )
  );
});

// ─────────────────────────────────────────
// @desc    Update product status
// @route   PUT /api/v1/products/:id/status
// @access  Private
// ─────────────────────────────────────────

const updateProductStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;

  if (!["draft", "active", "archived"].includes(status)) {
    throw new ApiError(400, "Invalid status. Must be: draft, active, or archived.");
  }

  const product = await Product.findByIdAndUpdate(
    req.params.id,
    { $set: { status } },
    { new: true }
  );

  if (!product) {
    throw new ApiError(404, "Product not found.");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { _id: product._id, status: product.status },
        `Product status updated to '${status}' successfully.`
      )
    );
});

// ─────────────────────────────────────────
// @desc    Bulk update status
// @route   PUT /api/v1/products/bulk-status
// @access  Private
// ─────────────────────────────────────────

const bulkUpdateStatus = asyncHandler(async (req, res) => {
  const { productIds, status } = req.body;

  if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
    throw new ApiError(400, "productIds array is required.");
  }

  if (!["draft", "active", "archived"].includes(status)) {
    throw new ApiError(400, "Invalid status value.");
  }

  const result = await Product.updateMany(
    { _id: { $in: productIds } },
    { $set: { status } }
  );

  return res.status(200).json(
    new ApiResponse(
      200,
      { modifiedCount: result.modifiedCount },
      `${result.modifiedCount} product(s) updated to '${status}' successfully.`
    )
  );
});

// ─────────────────────────────────────────
// @desc    Delete product
// @route   DELETE /api/v1/products/:id
// @access  Private
// ─────────────────────────────────────────

const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    throw new ApiError(404, "Product not found.");
  }

  if (
    req.user.role === "clientadmin" &&
    product.client.toString() !== req.user.client?.toString()
  ) {
    throw new ApiError(403, "Access denied.");
  }

  const imageDeletePromises = product.images
    .filter((img) => img.publicId)
    .map((img) => deleteImage(img.publicId).catch(console.error));

  await Promise.all(imageDeletePromises);

  await Product.findByIdAndDelete(req.params.id);

  await Client.findByIdAndUpdate(product.client, {
    $inc: { totalProducts: -1 },
  });

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        null,
        `Product '${product.name}' deleted successfully.`
      )
    );
});

export {
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
};