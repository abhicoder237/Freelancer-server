import mongoose from "mongoose";

// ─────────────────────────────────────────
// SUB SCHEMAS
// ─────────────────────────────────────────

// Single image/media block
const mediaSchema = new mongoose.Schema(
  {
    url:      { type: String, default: "" },
    publicId: { type: String, default: "" },
    altText:  { type: String, default: "" },
  },
  { _id: false }
);

// CTA Button config
const ctaSchema = new mongoose.Schema(
  {
    label:     { type: String, default: "" },
    href:      { type: String, default: "" },
    style: {
      type: String,
      enum: ["primary", "secondary", "outline", "ghost"],
      default: "primary",
    },
    isExternal: { type: Boolean, default: false },
  },
  { _id: false }
);

// ── HERO SECTION ───────────────────────────
const heroDataSchema = new mongoose.Schema(
  {
    heading:       { type: String, default: "" },
    subheading:    { type: String, default: "" },
    description:   { type: String, default: "" },
    backgroundImage: { type: mediaSchema, default: () => ({}) },
    foregroundImage: { type: mediaSchema, default: () => ({}) },

    // Overlay color + opacity for bg image
    overlayColor:   { type: String, default: "#000000" },
    overlayOpacity: { type: Number, default: 0.4, min: 0, max: 1 },

    // Text alignment
    alignment: {
      type: String,
      enum: ["left", "center", "right"],
      default: "center",
    },

    // Hero style variant
    variant: {
      type: String,
      enum: ["fullscreen", "split", "minimal", "video"],
      default: "fullscreen",
    },

    primaryCta:   { type: ctaSchema, default: () => ({}) },
    secondaryCta: { type: ctaSchema, default: () => ({}) },

    // Video URL for video variant
    videoUrl: { type: String, default: "" },
  },
  { _id: false }
);

// ── FEATURES SECTION ───────────────────────
const featureItemSchema = new mongoose.Schema(
  {
    icon:        { type: String, default: "" }, // Icon name or emoji
    title:       { type: String, default: "" },
    description: { type: String, default: "" },
    image:       { type: mediaSchema, default: () => ({}) },
    order:       { type: Number, default: 0 },
  },
  { _id: false }
);

const featuresDataSchema = new mongoose.Schema(
  {
    heading:     { type: String, default: "" },
    subheading:  { type: String, default: "" },
    description: { type: String, default: "" },
    layout: {
      type: String,
      enum: ["grid-2", "grid-3", "grid-4", "list", "alternating"],
      default: "grid-3",
    },
    items: {
      type: [featureItemSchema],
      default: [],
    },
  },
  { _id: false }
);

// ── TESTIMONIALS SECTION ───────────────────
const testimonialItemSchema = new mongoose.Schema(
  {
    name:       { type: String, default: "" },
    role:       { type: String, default: "" },  // e.g. "CEO, Acme Corp"
    content:    { type: String, default: "" },  // Review text
    avatar:     { type: mediaSchema, default: () => ({}) },
    rating:     { type: Number, default: 5, min: 1, max: 5 },
    order:      { type: Number, default: 0 },
  },
  { _id: false }
);

const testimonialsDataSchema = new mongoose.Schema(
  {
    heading:    { type: String, default: "" },
    subheading: { type: String, default: "" },
    layout: {
      type: String,
      enum: ["carousel", "grid", "masonry", "single"],
      default: "carousel",
    },
    items: {
      type: [testimonialItemSchema],
      default: [],
    },
  },
  { _id: false }
);

// ── BANNER / PROMO SECTION ─────────────────
const bannerDataSchema = new mongoose.Schema(
  {
    heading:         { type: String, default: "" },
    subheading:      { type: String, default: "" },
    backgroundImage: { type: mediaSchema, default: () => ({}) },
    backgroundColor: { type: String, default: "#3B82F6" },
    textColor:       { type: String, default: "#FFFFFF" },
    cta:             { type: ctaSchema, default: () => ({}) },

    // Countdown timer for sale banners
    showCountdown:  { type: Boolean, default: false },
    countdownEndAt: { type: Date, default: null },

    // Badge / tag label
    badgeText:  { type: String, default: "" },
    badgeColor: { type: String, default: "#F59E0B" },
  },
  { _id: false }
);

// ── STATS / NUMBERS SECTION ────────────────
const statItemSchema = new mongoose.Schema(
  {
    value:  { type: String, default: "" }, // e.g. "10K+", "99%", "500"
    label:  { type: String, default: "" }, // e.g. "Happy Customers"
    icon:   { type: String, default: "" },
    order:  { type: Number, default: 0 },
  },
  { _id: false }
);

const statsDataSchema = new mongoose.Schema(
  {
    heading:    { type: String, default: "" },
    subheading: { type: String, default: "" },
    layout: {
      type: String,
      enum: ["grid-2", "grid-3", "grid-4"],
      default: "grid-4",
    },
    items: {
      type: [statItemSchema],
      default: [],
    },
  },
  { _id: false }
);

// ── GALLERY SECTION ────────────────────────
const galleryDataSchema = new mongoose.Schema(
  {
    heading:    { type: String, default: "" },
    subheading: { type: String, default: "" },
    layout: {
      type: String,
      enum: ["grid", "masonry", "carousel", "justified"],
      default: "grid",
    },
    columns: {
      type: Number,
      enum: [2, 3, 4],
      default: 3,
    },
    images: {
      type: [mediaSchema],
      default: [],
    },
  },
  { _id: false }
);

// ── FAQ SECTION ────────────────────────────
const faqItemSchema = new mongoose.Schema(
  {
    question: { type: String, default: "" },
    answer:   { type: String, default: "" },
    order:    { type: Number, default: 0 },
  },
  { _id: false }
);

const faqDataSchema = new mongoose.Schema(
  {
    heading:    { type: String, default: "" },
    subheading: { type: String, default: "" },
    layout: {
      type: String,
      enum: ["accordion", "grid", "list"],
      default: "accordion",
    },
    items: {
      type: [faqItemSchema],
      default: [],
    },
  },
  { _id: false }
);

// ── NEWSLETTER SECTION ─────────────────────
const newsletterDataSchema = new mongoose.Schema(
  {
    heading:         { type: String, default: "" },
    subheading:      { type: String, default: "" },
    placeholder:     { type: String, default: "Enter your email" },
    buttonLabel:     { type: String, default: "Subscribe" },
    successMessage:  { type: String, default: "Thank you for subscribing!" },
    backgroundImage: { type: mediaSchema, default: () => ({}) },
    backgroundColor: { type: String, default: "#F9FAFB" },
  },
  { _id: false }
);

// ── CUSTOM HTML SECTION ────────────────────
const customDataSchema = new mongoose.Schema(
  {
    // Raw HTML — for advanced clients
    html:       { type: String, default: "" },
    cssClasses: { type: String, default: "" },
  },
  { _id: false }
);

// ─────────────────────────────────────────
// MAIN SECTION SCHEMA
// ─────────────────────────────────────────

const sectionSchema = new mongoose.Schema(
  {
    // ── Tenant Reference ────────────────────
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: [true, "Section must belong to a client"],
      index: true,
    },

    // ── Section Identity ────────────────────
    name: {
      type: String,
      required: [true, "Section name is required"],
      trim: true,
      maxlength: [100, "Section name cannot exceed 100 characters"],
      // Internal label — e.g. "Hero Banner", "Summer Sale Banner"
    },

    // Section type — determines which data schema is used
    type: {
      type: String,
      required: [true, "Section type is required"],
      enum: {
        values: [
          "hero",
          "features",
          "testimonials",
          "banner",
          "stats",
          "gallery",
          "faq",
          "newsletter",
          "products",   // Featured products section
          "custom",     // Raw HTML section
        ],
        message: "Invalid section type",
      },
    },

    // Page this section belongs to
    page: {
      type: String,
      enum: {
        values: ["home", "about", "contact", "products", "custom"],
        message: "Invalid page",
      },
      default: "home",
    },

    // ── Visibility & Order ──────────────────
    isVisible: {
      type: Boolean,
      default: true,
    },

    // Display order on page — lower = higher on page
    order: {
      type: Number,
      default: 0,
    },

    // ── Section-level Styling ───────────────
    backgroundColor: {
      type: String,
      default: "",
      // Overrides theme background for this section
    },

    backgroundImage: {
      type: mediaSchema,
      default: () => ({}),
    },

    paddingTop: {
      type: String,
      enum: ["none", "sm", "md", "lg", "xl"],
      default: "lg",
    },

    paddingBottom: {
      type: String,
      enum: ["none", "sm", "md", "lg", "xl"],
      default: "lg",
    },

    // ── Section Data ────────────────────────
    // Only the relevant type's data will be populated
    // Others will remain at defaults

    heroData:         { type: heroDataSchema,         default: () => ({}) },
    featuresData:     { type: featuresDataSchema,     default: () => ({}) },
    testimonialsData: { type: testimonialsDataSchema, default: () => ({}) },
    bannerData:       { type: bannerDataSchema,       default: () => ({}) },
    statsData:        { type: statsDataSchema,        default: () => ({}) },
    galleryData:      { type: galleryDataSchema,      default: () => ({}) },
    faqData:          { type: faqDataSchema,          default: () => ({}) },
    newsletterData:   { type: newsletterDataSchema,   default: () => ({}) },
    customData:       { type: customDataSchema,       default: () => ({}) },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// ─────────────────────────────────────────
// INDEXES
// ─────────────────────────────────────────

sectionSchema.index({ client: 1, page: 1, order: 1 });
sectionSchema.index({ client: 1, type: 1 });
sectionSchema.index({ client: 1, isVisible: 1 });

// ─────────────────────────────────────────
// STATIC METHODS
// ─────────────────────────────────────────

/**
 * Get all visible sections for a client page
 * sorted by order — ready for frontend render
 * @param {ObjectId} clientId
 * @param {string}   page - "home" | "about" | "contact" etc.
 */
sectionSchema.statics.getPageSections = async function (clientId, page = "home") {
  return await this.find({
    client: clientId,
    page,
    isVisible: true,
  }).sort({ order: 1 }); // Ascending — order 0 renders first
};

/**
 * Reorder sections in bulk
 * @param {Array} orderUpdates - [{ _id, order }]
 */
sectionSchema.statics.bulkReorder = async function (orderUpdates) {
  const bulkOps = orderUpdates.map(({ _id, order }) => ({
    updateOne: {
      filter: { _id },
      update: { $set: { order } },
    },
  }));
  return await this.bulkWrite(bulkOps);
};

// ─────────────────────────────────────────
// VIRTUAL FIELDS
// ─────────────────────────────────────────

// Returns only the relevant data for this section type
sectionSchema.virtual("sectionData").get(function () {
  const dataMap = {
    hero:          this.heroData,
    features:      this.featuresData,
    testimonials:  this.testimonialsData,
    banner:        this.bannerData,
    stats:         this.statsData,
    gallery:       this.galleryData,
    faq:           this.faqData,
    newsletter:    this.newsletterData,
    custom:        this.customData,
    products:      null, // Fetched separately from Product model
  };
  return dataMap[this.type] || null;
});

// ─────────────────────────────────────────
// TO JSON TRANSFORM
// ─────────────────────────────────────────

sectionSchema.set("toJSON", {
  virtuals: true,
  transform: function (doc, ret) {
    delete ret.id;
    return ret;
  },
});

const Section = mongoose.model("Section", sectionSchema);

export default Section;