import { body, param, query, validationResult } from "express-validator";
import ApiError from "../utils/ApiError.js";

// ─────────────────────────────────────────
// VALIDATION RESULT CHECKER
// Run this AFTER validator chains
// Collects all errors and throws ApiError
// ─────────────────────────────────────────

const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    // Format errors into clean array
    const formattedErrors = errors.array().map((err) => ({
      field:   err.path,
      message: err.msg,
      value:   err.value,
    }));

    throw new ApiError(
      400,
      "Validation failed. Please check your input.",
      formattedErrors
    );
  }

  next();
};

// ─────────────────────────────────────────
// REUSABLE FIELD VALIDATORS
// Building blocks — compose into rule sets
// ─────────────────────────────────────────

const fields = {
  // ── Common Fields ───────────────────────

  name: (min = 2, max = 100) =>
    body("name")
      .trim()
      .notEmpty().withMessage("Name is required")
      .isLength({ min, max })
      .withMessage(`Name must be between ${min} and ${max} characters`)
      .escape(), // Sanitize — prevent XSS

  email: () =>
    body("email")
      .trim()
      .notEmpty().withMessage("Email is required")
      .isEmail().withMessage("Please provide a valid email address")
      .normalizeEmail() // lowercase + remove dots in gmail
      .isLength({ max: 255 }).withMessage("Email cannot exceed 255 characters"),

  password: () =>
    body("password")
      .notEmpty().withMessage("Password is required")
      .isLength({ min: 8 }).withMessage("Password must be at least 8 characters")
      .matches(/[A-Z]/).withMessage("Password must contain at least one uppercase letter")
      .matches(/[a-z]/).withMessage("Password must contain at least one lowercase letter")
      .matches(/[0-9]/).withMessage("Password must contain at least one number")
      .matches(/[!@#$%^&*(),.?":{}|<>]/)
      .withMessage("Password must contain at least one special character"),

  optionalPassword: () =>
    body("password")
      .optional()
      .isLength({ min: 8 }).withMessage("Password must be at least 8 characters")
      .matches(/[A-Z]/).withMessage("Password must contain at least one uppercase letter")
      .matches(/[a-z]/).withMessage("Password must contain at least one lowercase letter")
      .matches(/[0-9]/).withMessage("Password must contain at least one number"),

  mongoId: (field = "id", location = "param") => {
    const source = location === "param" ? param(field) : body(field);
    return source
      .notEmpty().withMessage(`${field} is required`)
      .isMongoId().withMessage(`Invalid ${field} format`);
  },

  hexColor: (field) =>
    body(field)
      .optional()
      .matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
      .withMessage(`${field} must be a valid hex color code (e.g. #3B82F6)`),

  url: (field) =>
    body(field)
      .optional()
      .trim()
      .isURL({ protocols: ["http", "https"] })
      .withMessage(`${field} must be a valid URL starting with http or https`),

  positiveNumber: (field) =>
    body(field)
      .notEmpty().withMessage(`${field} is required`)
      .isFloat({ min: 0 }).withMessage(`${field} must be a positive number`),

  optionalPositiveNumber: (field) =>
    body(field)
      .optional()
      .isFloat({ min: 0 }).withMessage(`${field} must be a positive number`),

  stringEnum: (field, values) =>
    body(field)
      .optional()
      .isIn(values)
      .withMessage(`${field} must be one of: ${values.join(", ")}`),

  paginationQuery: () => [
    query("page")
      .optional()
      .isInt({ min: 1 }).withMessage("Page must be a positive integer")
      .toInt(),

    query("limit")
      .optional()
      .isInt({ min: 1, max: 100 }).withMessage("Limit must be between 1 and 100")
      .toInt(),

    query("sort")
      .optional()
      .isIn(["createdAt", "-createdAt", "name", "-name", "price", "-price"])
      .withMessage("Invalid sort field"),
  ],
};

// ─────────────────────────────────────────
// AUTH VALIDATORS
// ─────────────────────────────────────────

const authValidators = {
  // POST /api/v1/auth/register
  register: [
    fields.name(2, 50),

    fields.email(),

    fields.password(),

    body("role")
      .optional()
      .isIn(["admin", "clientadmin"])
      .withMessage("Role must be admin or clientadmin"),

    body("client")
      .optional()
      .isMongoId().withMessage("Invalid client ID format"),

    validate,
  ],

  // POST /api/v1/auth/login
  login: [
    fields.email(),

    body("password")
      .notEmpty().withMessage("Password is required"),

    validate,
  ],

  // PUT /api/v1/auth/change-password
  changePassword: [
    body("currentPassword")
      .notEmpty().withMessage("Current password is required"),

    body("newPassword")
      .notEmpty().withMessage("New password is required")
      .isLength({ min: 8 }).withMessage("New password must be at least 8 characters")
      .matches(/[A-Z]/).withMessage("Must contain at least one uppercase letter")
      .matches(/[a-z]/).withMessage("Must contain at least one lowercase letter")
      .matches(/[0-9]/).withMessage("Must contain at least one number")
      .matches(/[!@#$%^&*(),.?":{}|<>]/)
      .withMessage("Must contain at least one special character"),

    body("confirmPassword")
      .notEmpty().withMessage("Confirm password is required")
      .custom((value, { req }) => {
        if (value !== req.body.newPassword) {
          throw new Error("Passwords do not match");
        }
        return true;
      }),

    validate,
  ],

  // POST /api/v1/auth/forgot-password
  forgotPassword: [
    fields.email(),
    validate,
  ],
};

// ─────────────────────────────────────────
// CLIENT VALIDATORS
// ─────────────────────────────────────────

const clientValidators = {
  // POST /api/v1/clients
  create: [
    fields.name(2, 100),

    body("businessType")
      .optional()
      .isIn([
        "ecommerce", "restaurant", "portfolio",
        "services", "healthcare", "education",
        "realestate", "other",
      ])
      .withMessage("Invalid business type"),

    body("plan")
      .optional()
      .isIn(["free", "basic", "professional", "enterprise"])
      .withMessage("Invalid plan"),

    body("tagline")
      .optional()
      .trim()
      .isLength({ max: 150 }).withMessage("Tagline cannot exceed 150 characters")
      .escape(),

    body("description")
      .optional()
      .trim()
      .isLength({ max: 500 }).withMessage("Description cannot exceed 500 characters")
      .escape(),

    fields.url("contact.email"),
    fields.url("social.facebook"),
    fields.url("social.instagram"),
    fields.url("social.linkedin"),

    body("contact.email")
      .optional()
      .isEmail().withMessage("Invalid contact email")
      .normalizeEmail(),

    body("contact.phone")
      .optional()
      .trim()
      .isMobilePhone().withMessage("Invalid phone number"),

    body("seo.metaTitle")
      .optional()
      .trim()
      .isLength({ max: 60 }).withMessage("Meta title cannot exceed 60 characters")
      .escape(),

    body("seo.metaDescription")
      .optional()
      .trim()
      .isLength({ max: 160 }).withMessage("Meta description cannot exceed 160 characters")
      .escape(),

    validate,
  ],

  // PUT /api/v1/clients/:id
  update: [
    fields.mongoId("id"),

    body("name")
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage("Name must be between 2 and 100 characters")
      .escape(),

    body("tagline")
      .optional()
      .trim()
      .isLength({ max: 150 }).withMessage("Tagline cannot exceed 150 characters")
      .escape(),

    body("isActive")
      .optional()
      .isBoolean().withMessage("isActive must be true or false"),

    body("isUnderMaintenance")
      .optional()
      .isBoolean().withMessage("isUnderMaintenance must be true or false"),

    validate,
  ],
};

// ─────────────────────────────────────────
// PRODUCT VALIDATORS
// ─────────────────────────────────────────

const productValidators = {
  // POST /api/v1/products
  create: [
    fields.name(2, 200),

    body("description")
      .trim()
      .notEmpty().withMessage("Description is required")
      .isLength({ max: 2000 }).withMessage("Description cannot exceed 2000 characters"),

    body("shortDescription")
      .optional()
      .trim()
      .isLength({ max: 300 }).withMessage("Short description cannot exceed 300 characters")
      .escape(),

    body("category")
      .trim()
      .notEmpty().withMessage("Category is required")
      .isLength({ max: 100 }).withMessage("Category cannot exceed 100 characters")
      .escape(),

    body("subcategory")
      .optional()
      .trim()
      .isLength({ max: 100 }).withMessage("Subcategory cannot exceed 100 characters")
      .escape(),

    fields.positiveNumber("price"),

    fields.optionalPositiveNumber("compareAtPrice")
      .custom((value, { req }) => {
        if (value && Number(value) <= Number(req.body.price)) {
          throw new Error(
            "Compare price must be greater than the actual price"
          );
        }
        return true;
      }),

    body("stock")
      .optional()
      .isInt({ min: 0 }).withMessage("Stock must be a non-negative integer")
      .toInt(),

    body("sku")
      .optional()
      .trim()
      .isLength({ max: 100 }).withMessage("SKU cannot exceed 100 characters")
      .toUpperCase(),

    fields.stringEnum("status", ["draft", "active", "archived"]),

    body("isFeatured")
      .optional()
      .isBoolean().withMessage("isFeatured must be true or false"),

    body("tags")
      .optional()
      .isArray().withMessage("Tags must be an array")
      .custom((tags) => {
        if (tags.length > 20) throw new Error("Maximum 20 tags allowed");
        return true;
      }),

    body("seo.metaTitle")
      .optional()
      .trim()
      .isLength({ max: 60 }).withMessage("Meta title cannot exceed 60 characters")
      .escape(),

    body("seo.metaDescription")
      .optional()
      .trim()
      .isLength({ max: 160 }).withMessage("Meta description cannot exceed 160 characters")
      .escape(),

    validate,
  ],

  // PUT /api/v1/products/:id
  update: [
    fields.mongoId("id"),

    body("name")
      .optional()
      .trim()
      .isLength({ min: 2, max: 200 })
      .withMessage("Name must be between 2 and 200 characters")
      .escape(),

    body("price")
      .optional()
      .isFloat({ min: 0 }).withMessage("Price must be a positive number"),

    body("stock")
      .optional()
      .isInt({ min: 0 }).withMessage("Stock must be a non-negative integer")
      .toInt(),

    fields.stringEnum("status", ["draft", "active", "archived"]),

    validate,
  ],
};

// ─────────────────────────────────────────
// THEME VALIDATORS
// ─────────────────────────────────────────

const themeValidators = {
  // POST /api/v1/themes
  create: [
    fields.name(2, 50),

    fields.stringEnum("preset", [
      "default", "minimal", "bold",
      "elegant", "dark", "nature",
      "corporate", "custom",
    ]),

    // Validate color fields
    fields.hexColor("colors.primary"),
    fields.hexColor("colors.secondary"),
    fields.hexColor("colors.accent"),
    fields.hexColor("colors.background"),
    fields.hexColor("colors.surface"),
    fields.hexColor("colors.textPrimary"),
    fields.hexColor("colors.textSecondary"),
    fields.hexColor("colors.navbar"),
    fields.hexColor("colors.footer"),

    body("typography.baseFontSize")
      .optional()
      .isInt({ min: 12, max: 24 })
      .withMessage("Base font size must be between 12 and 24"),

    body("customCss")
      .optional()
      .isLength({ max: 10000 })
      .withMessage("Custom CSS cannot exceed 10000 characters"),

    validate,
  ],

  // PUT /api/v1/themes/:id
  update: [
    fields.mongoId("id"),

    body("name")
      .optional()
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage("Theme name must be between 2 and 50 characters")
      .escape(),

    fields.hexColor("colors.primary"),
    fields.hexColor("colors.secondary"),
    fields.hexColor("colors.accent"),

    validate,
  ],

  // PUT /api/v1/themes/:id/activate
  activate: [
    fields.mongoId("id"),
    validate,
  ],
};

// ─────────────────────────────────────────
// SECTION VALIDATORS
// ─────────────────────────────────────────

const sectionValidators = {
  // POST /api/v1/sections
  create: [
    fields.name(2, 100),

    body("type")
      .notEmpty().withMessage("Section type is required")
      .isIn([
        "hero", "features", "testimonials",
        "banner", "stats", "gallery",
        "faq", "newsletter", "products", "custom",
      ])
      .withMessage("Invalid section type"),

    body("page")
      .optional()
      .isIn(["home", "about", "contact", "products", "custom"])
      .withMessage("Invalid page value"),

    body("order")
      .optional()
      .isInt({ min: 0 }).withMessage("Order must be a non-negative integer")
      .toInt(),

    body("isVisible")
      .optional()
      .isBoolean().withMessage("isVisible must be true or false"),

    validate,
  ],

  // PUT /api/v1/sections/:id
  update: [
    fields.mongoId("id"),

    body("name")
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage("Name must be between 2 and 100 characters")
      .escape(),

    body("isVisible")
      .optional()
      .isBoolean().withMessage("isVisible must be true or false"),

    body("order")
      .optional()
      .isInt({ min: 0 }).withMessage("Order must be a non-negative integer")
      .toInt(),

    validate,
  ],

  // PUT /api/v1/sections/reorder
  reorder: [
    body("sections")
      .isArray({ min: 1 }).withMessage("sections must be a non-empty array"),

    body("sections.*.id")
      .isMongoId().withMessage("Each section must have a valid id"),

    body("sections.*.order")
      .isInt({ min: 0 }).withMessage("Each section must have a valid order"),

    validate,
  ],
};

export {
  validate,
  fields,
  authValidators,
  clientValidators,
  productValidators,
  themeValidators,
  sectionValidators,
};