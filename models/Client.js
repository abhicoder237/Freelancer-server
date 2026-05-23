 import mongoose from "mongoose";
import slugify  from "slugify";

// ─────────────────────────────────────────
// SUB SCHEMAS
// ─────────────────────────────────────────

const contactSchema = new mongoose.Schema(
  {
    email: {
      type:    String,
      trim:    true,
      lowercase: true,
      default: "",
    },
    phone: {
      type:    String,
      trim:    true,
      default: "",
    },
    whatsapp: {
      type:    String,
      trim:    true,
      default: "",
    },
    address: {
      street:  { type: String, default: "" },
      city:    { type: String, default: "" },
      state:   { type: String, default: "" },
      zip:     { type: String, default: "" },
      country: { type: String, default: "India" },
    },
  },
  { _id: false }
);

const socialSchema = new mongoose.Schema(
  {
    facebook:  { type: String, default: "" },
    instagram: { type: String, default: "" },
    twitter:   { type: String, default: "" },
    linkedin:  { type: String, default: "" },
    youtube:   { type: String, default: "" },
    pinterest: { type: String, default: "" },
  },
  { _id: false }
);

const seoSchema = new mongoose.Schema(
  {
    metaTitle: {
      type:      String,
      maxlength: [60, "Meta title cannot exceed 60 characters"],
      default:   "",
    },
    metaDescription: {
      type:      String,
      maxlength: [160, "Meta description cannot exceed 160 characters"],
      default:   "",
    },
    metaKeywords: { type: [String], default: [] },
    ogImage: {
      url:      { type: String, default: "" },
      publicId: { type: String, default: "" },
    },
    canonicalUrl:          { type: String, default: "" },
    googleAnalyticsId:     { type: String, default: "" },
    googleSearchConsoleId: { type: String, default: "" },
  },
  { _id: false }
);

const logoSchema = new mongoose.Schema(
  {
    url:      { type: String, default: "" },
    publicId: { type: String, default: "" },
    altText:  { type: String, default: "" },
    width:    { type: Number, default: 200 },
    height:   { type: Number, default: 60 },
  },
  { _id: false }
);

const faviconSchema = new mongoose.Schema(
  {
    url:      { type: String, default: "" },
    publicId: { type: String, default: "" },
  },
  { _id: false }
);

// ─────────────────────────────────────────
// MAIN CLIENT SCHEMA
// ─────────────────────────────────────────

const clientSchema = new mongoose.Schema(
  {
    // ── Identity ────────────────────────────
    name: {
      type:      String,
      required:  [true, "Client business name is required"],
      trim:      true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [100, "Name cannot exceed 100 characters"],
    },

    // ✅ No unique:true here — handled in schema.index()
    slug: {
      type:      String,
      lowercase: true,
      trim:      true,
    },

    // ── Domain Config ───────────────────────
    // ✅ No unique:true here — handled in schema.index()
    customDomain: {
      type:      String,
      trim:      true,
      lowercase: true,
      default:   undefined,
      sparse:    true,
    },

    // ✅ No unique:true here — handled in schema.index()
    subdomain: {
      type:      String,
      trim:      true,
      lowercase: true,
      default:   undefined,
      sparse:    true,
    },

    // ── Branding ────────────────────────────
    tagline: {
      type:      String,
      maxlength: [150, "Tagline cannot exceed 150 characters"],
      default:   "",
    },

    description: {
      type:      String,
      maxlength: [500, "Description cannot exceed 500 characters"],
      default:   "",
    },

    logo:    { type: logoSchema,    default: () => ({}) },
    favicon: { type: faviconSchema, default: () => ({}) },

    // ── Business Info ───────────────────────
    businessType: {
      type: String,
      enum: {
        values: [
          "ecommerce", "restaurant", "portfolio",
          "services",  "healthcare", "education",
          "realestate", "other",
        ],
        message: "Invalid business type",
      },
      default: "other",
    },

    industry: { type: String, trim: true, default: "" },

    // ── Embedded Sub-documents ──────────────
    contact: { type: contactSchema, default: () => ({}) },
    social:  { type: socialSchema,  default: () => ({}) },
    seo:     { type: seoSchema,     default: () => ({}) },

    // ── Theme Reference ─────────────────────
    theme: {
      type:    mongoose.Schema.Types.ObjectId,
      ref:     "Theme",
      default: null,
    },

    // ── Plan / Subscription ─────────────────
    plan: {
      type: String,
      enum: {
        values:  ["free", "basic", "professional", "enterprise"],
        message: "Invalid plan type",
      },
      default: "free",
    },

    planExpiry: { type: Date, default: null },

    // ── Status ──────────────────────────────
    isActive: { type: Boolean, default: true },

    isUnderMaintenance: { type: Boolean, default: false },

    maintenanceMessage: {
      type:    String,
      default: "We are currently under maintenance. Please check back soon.",
    },

    // ── Owner Reference ─────────────────────
    owner: {
      type:    mongoose.Schema.Types.ObjectId,
      ref:     "User",
      default: null,
    },

    // ── Analytics / Stats ───────────────────
    totalProducts:  { type: Number, default: 0 },
    totalPageViews: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// ─────────────────────────────────────────
// INDEXES — defined ONLY here, not in fields
// ✅ Duplicate warning fix
// ─────────────────────────────────────────

clientSchema.index({ slug: 1 },         { unique: true, sparse: true });
clientSchema.index({ customDomain: 1 }, { unique: true, sparse: true });
clientSchema.index({ subdomain: 1 },    { unique: true, sparse: true });
clientSchema.index({ isActive: 1 });
clientSchema.index({ plan: 1 });

// ─────────────────────────────────────────
// PRE-SAVE — Auto generate slug
// ─────────────────────────────────────────

clientSchema.pre("save", async function (next) {
  if (!this.isModified("name") && this.slug) return next();

  try {
    let generatedSlug = slugify(this.name, {
      lower:  true,
      strict: true,
      trim:   true,
    });

    const existingClient = await mongoose.model("Client").findOne({
      slug: generatedSlug,
      _id:  { $ne: this._id },
    });

    if (existingClient) {
      generatedSlug = `${generatedSlug}-${Date.now()}`;
    }

    this.slug = generatedSlug;
    next();
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────
// INSTANCE METHODS
// ─────────────────────────────────────────

clientSchema.methods.isPlanActive = function () {
  if (this.plan === "free") return true;
  if (!this.planExpiry) return false;
  return this.planExpiry > Date.now();
};

clientSchema.methods.incrementPageView = async function () {
  return await this.updateOne({ $inc: { totalPageViews: 1 } });
};

// ─────────────────────────────────────────
// STATIC METHODS
// ─────────────────────────────────────────

clientSchema.statics.findByIdentifier = async function (identifier) {
  return await this.findOne({
    $or: [
      { slug:         identifier },
      { customDomain: identifier },
      { subdomain:    identifier },
    ],
    isActive: true,
  }).populate("theme");
};

// ─────────────────────────────────────────
// VIRTUAL FIELDS
// ─────────────────────────────────────────

clientSchema.virtual("platformUrl").get(function () {
  if (this.customDomain) return `https://${this.customDomain}`;
  if (this.subdomain)
    return `https://${this.subdomain}.${
      process.env.PLATFORM_DOMAIN || "youragency.com"
    }`;
  return `https://youragency.com/client/${this.slug}`;
});

// ─────────────────────────────────────────
// TO JSON
// ─────────────────────────────────────────

clientSchema.set("toJSON", {
  virtuals:  true,
  transform: function (doc, ret) {
    delete ret.id;
    return ret;
  },
});

const Client = mongoose.model("Client", clientSchema);

export default Client;