 import mongoose from "mongoose";

// ─────────────────────────────────────────
// SUB SCHEMAS
// ─────────────────────────────────────────

// Color Palette
const colorSchema = new mongoose.Schema(
  {
    // Primary brand color — buttons, links, highlights
    primary: {
      type: String,
      default: "#3B82F6",
      match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Invalid hex color code"],
    },

    // Secondary accent color
    secondary: {
      type: String,
      default: "#8B5CF6",
      match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Invalid hex color code"],
    },

    // Call to action color
    accent: {
      type: String,
      default: "#F59E0B",
      match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Invalid hex color code"],
    },

    // Page background
    background: {
      type: String,
      default: "#FFFFFF",
      match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Invalid hex color code"],
    },

    // Card / section background
    surface: {
      type: String,
      default: "#F9FAFB",
      match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Invalid hex color code"],
    },

    // Main body text
    textPrimary: {
      type: String,
      default: "#111827",
      match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Invalid hex color code"],
    },

    // Secondary / muted text
    textSecondary: {
      type: String,
      default: "#6B7280",
      match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Invalid hex color code"],
    },

    // Borders and dividers
    border: {
      type: String,
      default: "#E5E7EB",
      match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Invalid hex color code"],
    },

    // Success state
    success: {
      type: String,
      default: "#10B981",
      match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Invalid hex color code"],
    },

    // Error / danger state
    error: {
      type: String,
      default: "#EF4444",
      match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Invalid hex color code"],
    },

    // Navbar background
    navbar: {
      type: String,
      default: "#FFFFFF",
      match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Invalid hex color code"],
    },

    // Footer background
    footer: {
      type: String,
      default: "#111827",
      match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Invalid hex color code"],
    },
  },
  { _id: false }
);

// Typography Config
const typographySchema = new mongoose.Schema(
  {
    // Heading font — Google Fonts name
    headingFont: {
      type: String,
      default: "Inter",
    },

    // Body text font
    bodyFont: {
      type: String,
      default: "Inter",
    },

    // Base font size in px
    baseFontSize: {
      type: Number,
      default: 16,
      min: 12,
      max: 24,
    },

    // Heading weight
    headingWeight: {
      type: String,
      enum: ["400", "500", "600", "700", "800", "900"],
      default: "700",
    },

    // Line height multiplier
    lineHeight: {
      type: Number,
      default: 1.6,
      min: 1,
      max: 2.5,
    },

    // Letter spacing in em
    letterSpacing: {
      type: Number,
      default: 0,
      min: -0.1,
      max: 0.3,
    },
  },
  { _id: false }
);

// Navbar Configuration
const navbarSchema = new mongoose.Schema(
  {
    style: {
      type: String,
      enum: ["fixed", "sticky", "static"],
      default: "sticky",
    },

    layout: {
      type: String,
      enum: ["default", "centered", "minimal", "expanded"],
      default: "default",
    },

    showSearchBar: { type: Boolean, default: true },
    showCartIcon:  { type: Boolean, default: true },
    showWishlist:  { type: Boolean, default: false },

    // Nav links
    links: {
      type: [
        {
          label:    { type: String, required: true },
          href:     { type: String, required: true },
          isExternal: { type: Boolean, default: false },
          order:    { type: Number, default: 0 },
        },
      ],
      default: [],
    },
  },
  { _id: false }
);

// Footer Configuration
const footerSchema = new mongoose.Schema(
  {
    style: {
      type: String,
      enum: ["minimal", "standard", "expanded"],
      default: "standard",
    },

    copyrightText: {
      type: String,
      default: "",
      // e.g. "© 2026 Acme Corp. All rights reserved."
    },

    showSocialLinks:  { type: Boolean, default: true },
    showNewsletter:   { type: Boolean, default: false },
    newsletterText:   { type: String,  default: "Subscribe to our newsletter" },

    // Footer column links
    columns: {
      type: [
        {
          heading: { type: String, default: "" },
          links: [
            {
              label: { type: String },
              href:  { type: String },
            },
          ],
        },
      ],
      default: [],
    },
  },
  { _id: false }
);

// Border Radius Config
const borderRadiusSchema = new mongoose.Schema(
  {
    // sm / md / lg / xl / full
    button:  { type: String, default: "md" },
    card:    { type: String, default: "lg" },
    input:   { type: String, default: "md" },
    badge:   { type: String, default: "full" },
  },
  { _id: false }
);

// Spacing Config
const spacingSchema = new mongoose.Schema(
  {
    // Container max-width
    containerMaxWidth: {
      type: String,
      enum: ["sm", "md", "lg", "xl", "2xl", "full"],
      default: "xl",
    },

    // Section vertical padding
    sectionPadding: {
      type: String,
      enum: ["sm", "md", "lg", "xl"],
      default: "lg",
    },
  },
  { _id: false }
);

// ─────────────────────────────────────────
// MAIN THEME SCHEMA
// ─────────────────────────────────────────

const themeSchema = new mongoose.Schema(
  {
    // ── Tenant Reference ────────────────────
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: [true, "Theme must belong to a client"],
      index: true,
    },

    // ── Theme Identity ──────────────────────
    name: {
      type: String,
      required: [true, "Theme name is required"],
      trim: true,
      maxlength: [50, "Theme name cannot exceed 50 characters"],
      // e.g. "Dark Mode", "Summer Sale", "Corporate"
    },

    // Is this the currently active theme for the client?
    isActive: {
      type: Boolean,
      default: false,
    },

    // Preset template this theme is based on
    preset: {
      type: String,
      enum: [
        "default",
        "minimal",
        "bold",
        "elegant",
        "dark",
        "nature",
        "corporate",
        "custom",
      ],
      default: "default",
    },

    // ── Dark Mode ───────────────────────────
    darkMode: {
      enabled: { type: Boolean, default: false },

      // If "auto" — follows system preference
      // If "manual" — user toggles it
      mode: {
        type: String,
        enum: ["auto", "manual"],
        default: "manual",
      },
    },

    // ── Sub Configs ─────────────────────────
    colors:       { type: colorSchema,        default: () => ({}) },
    typography:   { type: typographySchema,   default: () => ({}) },
    navbar:       { type: navbarSchema,       default: () => ({}) },
    footer:       { type: footerSchema,       default: () => ({}) },
    borderRadius: { type: borderRadiusSchema, default: () => ({}) },
    spacing:      { type: spacingSchema,      default: () => ({}) },

    // ── Custom CSS ──────────────────────────
    // Advanced users can add raw CSS overrides
    customCss: {
      type: String,
      default: "",
      maxlength: [10000, "Custom CSS cannot exceed 10000 characters"],
    },

    // ── Button Style ────────────────────────
    buttonStyle: {
      type: String,
      enum: ["filled", "outlined", "ghost", "soft"],
      default: "filled",
    },

    // ── Animation ───────────────────────────
    enableAnimations: {
      type: Boolean,
      default: true,
    },

    animationStyle: {
      type: String,
      enum: ["none", "fade", "slide", "bounce", "zoom"],
      default: "fade",
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

themeSchema.index({ client: 1, isActive: 1 });
themeSchema.index({ client: 1, createdAt: -1 });

// ─────────────────────────────────────────
// PRE-SAVE MIDDLEWARE
// Ensure only ONE theme is active per client
// ─────────────────────────────────────────

themeSchema.pre("save", async function (next) {
  // If this theme is being set as active
  if (this.isModified("isActive") && this.isActive === true) {
    // Deactivate all other themes for this client
    await mongoose.model("Theme").updateMany(
      {
        client: this.client,
        _id: { $ne: this._id },
      },
      { $set: { isActive: false } }
    );
  }
  next();
});

// ─────────────────────────────────────────
// STATIC METHODS
// ─────────────────────────────────────────

/**
 * Get the currently active theme for a client
 * @param   {ObjectId} clientId
 * @returns {Document|null}
 */
themeSchema.statics.getActiveTheme = async function (clientId) {
  return await this.findOne({
    client: clientId,
    isActive: true,
  });
};

/**
 * Activate a theme and deactivate all others for client
 * @param {ObjectId} themeId
 * @param {ObjectId} clientId
 */
themeSchema.statics.activateTheme = async function (themeId, clientId) {
  // Deactivate all themes for this client
  await this.updateMany(
    { client: clientId },
    { $set: { isActive: false } }
  );

  // Activate the selected theme
  return await this.findByIdAndUpdate(
    themeId,
    { $set: { isActive: true } },
    { new: true }
  );
};

// ─────────────────────────────────────────
// VIRTUAL FIELDS
// ─────────────────────────────────────────

// Generate CSS variables string for frontend injection
themeSchema.virtual("cssVariables").get(function () {
  const c = this.colors;
  const t = this.typography;

  return `
    --color-primary: ${c.primary};
    --color-secondary: ${c.secondary};
    --color-accent: ${c.accent};
    --color-background: ${c.background};
    --color-surface: ${c.surface};
    --color-text-primary: ${c.textPrimary};
    --color-text-secondary: ${c.textSecondary};
    --color-border: ${c.border};
    --color-success: ${c.success};
    --color-error: ${c.error};
    --color-navbar: ${c.navbar};
    --color-footer: ${c.footer};
    --font-heading: '${t.headingFont}', sans-serif;
    --font-body: '${t.bodyFont}', sans-serif;
    --font-size-base: ${t.baseFontSize}px;
    --font-weight-heading: ${t.headingWeight};
    --line-height: ${t.lineHeight};
    --letter-spacing: ${t.letterSpacing}em;
  `.trim();
});

// ─────────────────────────────────────────
// TO JSON TRANSFORM
// ─────────────────────────────────────────

themeSchema.set("toJSON", {
  virtuals: true,
  transform: function (doc, ret) {
    delete ret.id;
    return ret;
  },
});

const Theme = mongoose.model("Theme", themeSchema);

export default Theme;