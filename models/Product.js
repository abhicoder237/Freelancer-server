import mongoose from "mongoose";
import slugify from "slugify";

// ─────────────────────────────────────────
// SUB SCHEMAS
// ─────────────────────────────────────────

// Single image structure
const imageSchema = new mongoose.Schema(
  {
    url:      { type: String, required: true },
    publicId: { type: String, required: true },
    altText:  { type: String, default: "" },
    isPrimary: { type: Boolean, default: false },
  },
  { _id: false }
);

// Product variant (e.g. Size: S/M/L or Color: Red/Blue)
const variantSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      // e.g. "Size", "Color", "Material"
    },
    options: {
      type: [String],
      required: true,
      // e.g. ["S", "M", "L", "XL"]
    },
  },
  { _id: false }
);

// Per-product SEO
const productSeoSchema = new mongoose.Schema(
  {
    metaTitle: {
      type: String,
      maxlength: [60, "Meta title cannot exceed 60 characters"],
      default: "",
    },
    metaDescription: {
      type: String,
      maxlength: [160, "Meta description cannot exceed 160 characters"],
      default: "",
    },
    metaKeywords: {
      type: [String],
      default: [],
    },
  },
  { _id: false }
);

// ─────────────────────────────────────────
// MAIN PRODUCT SCHEMA
// ─────────────────────────────────────────

const productSchema = new mongoose.Schema(
  {
    // ── Tenant Reference ────────────────────
    // Every product belongs to exactly one client
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: [true, "Product must belong to a client"],
      index: true,
    },

    // ── Basic Info ──────────────────────────
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
      minlength: [2, "Product name must be at least 2 characters"],
      maxlength: [200, "Product name cannot exceed 200 characters"],
    },

    slug: {
      type: String,
      lowercase: true,
      trim: true,
    },

    description: {
      type: String,
      required: [true, "Product description is required"],
      maxlength: [2000, "Description cannot exceed 2000 characters"],
    },

    shortDescription: {
      type: String,
      maxlength: [300, "Short description cannot exceed 300 characters"],
      default: "",
    },

    // ── Categorization ──────────────────────
    category: {
      type: String,
      required: [true, "Product category is required"],
      trim: true,
    },

    subcategory: {
      type: String,
      trim: true,
      default: "",
    },

    tags: {
      type: [String],
      default: [],
    },

    // ── Pricing ─────────────────────────────
    price: {
      type: Number,
      required: [true, "Product price is required"],
      min: [0, "Price cannot be negative"],
    },

    compareAtPrice: {
      // Original price before discount
      // e.g. price: 799, compareAtPrice: 999
      type: Number,
      min: [0, "Compare price cannot be negative"],
      default: null,
    },

    currency: {
      type: String,
      default: "INR",
      uppercase: true,
      maxlength: 3,
    },

    // ── Stock Management ────────────────────
    sku: {
      type: String,
      trim: true,
      uppercase: true,
      default: "",
    },

    stock: {
      type: Number,
      default: 0,
      min: [0, "Stock cannot be negative"],
    },

    lowStockThreshold: {
      // Alert when stock falls below this
      type: Number,
      default: 5,
    },

    trackInventory: {
      type: Boolean,
      default: true,
    },

    // ── Images ──────────────────────────────
    images: {
      type: [imageSchema],
      validate: {
        validator: function (arr) {
          return arr.length <= 10;
        },
        message: "A product cannot have more than 10 images",
      },
      default: [],
    },

    // ── Variants ────────────────────────────
    // e.g. [{ name: "Size", options: ["S","M","L"] }]
    variants: {
      type: [variantSchema],
      default: [],
    },

    hasVariants: {
      type: Boolean,
      default: false,
    },

    // ── Shipping ────────────────────────────
    weight: {
      value: { type: Number, default: 0 },
      unit:  { type: String, enum: ["kg", "g", "lb"], default: "kg" },
    },

    isFreeShipping: {
      type: Boolean,
      default: false,
    },

    // ── Status & Visibility ─────────────────
    status: {
      type: String,
      enum: {
        values: ["draft", "active", "archived"],
        message: "Status must be draft, active, or archived",
      },
      default: "draft",
    },

    isFeatured: {
      type: Boolean,
      default: false,
    },

    isDigital: {
      type: Boolean,
      default: false,
    },

    // ── SEO ─────────────────────────────────
    seo: {
      type: productSeoSchema,
      default: () => ({}),
    },

    // ── Stats ───────────────────────────────
    totalSales: {
      type: Number,
      default: 0,
    },

    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },

    totalReviews: {
      type: Number,
      default: 0,
    },

    // ── Sort Order ──────────────────────────
    // Manual ordering in admin panel
    sortOrder: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// ─────────────────────────────────────────
// INDEXES
// ─────────────────────────────────────────

// Compound index — most common query pattern
productSchema.index({ client: 1, status: 1 });
productSchema.index({ client: 1, category: 1 });
productSchema.index({ client: 1, isFeatured: 1 });
productSchema.index({ client: 1, slug: 1 }, { unique: true });
productSchema.index({ client: 1, createdAt: -1 });

// Text search index — for product search feature
productSchema.index(
  {
    name: "text",
    description: "text",
    tags: "text",
    category: "text",
  },
  {
    weights: {
      name: 10,        // Name matches rank highest
      tags: 5,
      category: 3,
      description: 1,
    },
    name: "product_text_search",
  }
);

// ─────────────────────────────────────────
// PRE-SAVE MIDDLEWARE
// ─────────────────────────────────────────

productSchema.pre("save", async function (next) {
  // Auto-generate slug from product name + client
  if (this.isModified("name") || !this.slug) {
    let generatedSlug = slugify(this.name, {
      lower: true,
      strict: true,
      trim: true,
    });

    // Ensure slug is unique within same client
    const existing = await mongoose.model("Product").findOne({
      client: this.client,
      slug: generatedSlug,
      _id: { $ne: this._id },
    });

    if (existing) {
      generatedSlug = `${generatedSlug}-${Date.now()}`;
    }

    this.slug = generatedSlug;
  }

  // Ensure only one image is marked as primary
  if (this.images && this.images.length > 0) {
    const hasPrimary = this.images.some((img) => img.isPrimary);
    if (!hasPrimary) {
      // Auto-set first image as primary
      this.images[0].isPrimary = true;
    }
  }

  next();
});

// ─────────────────────────────────────────
// VIRTUAL FIELDS
// ─────────────────────────────────────────

// Discount percentage — computed from price + compareAtPrice
productSchema.virtual("discountPercentage").get(function () {
  if (!this.compareAtPrice || this.compareAtPrice <= this.price) return 0;
  return Math.round(
    ((this.compareAtPrice - this.price) / this.compareAtPrice) * 100
  );
});

// Stock status label
productSchema.virtual("stockStatus").get(function () {
  if (!this.trackInventory) return "in_stock";
  if (this.stock === 0) return "out_of_stock";
  if (this.stock <= this.lowStockThreshold) return "low_stock";
  return "in_stock";
});

// Primary image shortcut
productSchema.virtual("primaryImage").get(function () {
  if (!this.images || this.images.length === 0) return null;
  return (
    this.images.find((img) => img.isPrimary) || this.images[0]
  );
});

// ─────────────────────────────────────────
// INSTANCE METHODS
// ─────────────────────────────────────────

/**
 * Check if product is in stock
 * @returns {boolean}
 */
productSchema.methods.isInStock = function () {
  if (!this.trackInventory) return true;
  return this.stock > 0;
};

/**
 * Reduce stock after order
 * @param {number} quantity - Units sold
 */
productSchema.methods.reduceStock = async function (quantity) {
  if (!this.trackInventory) return;
  if (this.stock < quantity) {
    throw new Error(`Insufficient stock. Available: ${this.stock}`);
  }
  this.stock -= quantity;
  this.totalSales += quantity;
  await this.save();
};

// ─────────────────────────────────────────
// TO JSON TRANSFORM
// ─────────────────────────────────────────

productSchema.set("toJSON", {
  virtuals: true,
  transform: function (doc, ret) {
    delete ret.id;
    return ret;
  },
});

const Product = mongoose.model("Product", productSchema);

export default Product;