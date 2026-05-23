import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import Theme from "../models/Theme.js";
import Client from "../models/Client.js";

// ─────────────────────────────────────────
// THEME PRESETS
// Ready-made color/font configs
// Admin panel mein one-click apply honge
// ─────────────────────────────────────────

const THEME_PRESETS = {
  default: {
    colors: {
      primary:       "#3B82F6",
      secondary:     "#8B5CF6",
      accent:        "#F59E0B",
      background:    "#FFFFFF",
      surface:       "#F9FAFB",
      textPrimary:   "#111827",
      textSecondary: "#6B7280",
      border:        "#E5E7EB",
      success:       "#10B981",
      error:         "#EF4444",
      navbar:        "#FFFFFF",
      footer:        "#111827",
    },
    typography: {
      headingFont:   "Inter",
      bodyFont:      "Inter",
      baseFontSize:  16,
      headingWeight: "700",
      lineHeight:    1.6,
      letterSpacing: 0,
    },
    buttonStyle:      "filled",
    animationStyle:   "fade",
    enableAnimations: true,
  },

  dark: {
    colors: {
      primary:       "#6366F1",
      secondary:     "#8B5CF6",
      accent:        "#F59E0B",
      background:    "#0F172A",
      surface:       "#1E293B",
      textPrimary:   "#F1F5F9",
      textSecondary: "#94A3B8",
      border:        "#334155",
      success:       "#10B981",
      error:         "#EF4444",
      navbar:        "#0F172A",
      footer:        "#020617",
    },
    typography: {
      headingFont:   "Inter",
      bodyFont:      "Inter",
      baseFontSize:  16,
      headingWeight: "700",
      lineHeight:    1.6,
      letterSpacing: 0,
    },
    buttonStyle:      "filled",
    animationStyle:   "fade",
    enableAnimations: true,
    darkMode:         { enabled: true, mode: "manual" },
  },

  minimal: {
    colors: {
      primary:       "#18181B",
      secondary:     "#3F3F46",
      accent:        "#F4F4F5",
      background:    "#FFFFFF",
      surface:       "#FAFAFA",
      textPrimary:   "#18181B",
      textSecondary: "#71717A",
      border:        "#E4E4E7",
      success:       "#22C55E",
      error:         "#EF4444",
      navbar:        "#FFFFFF",
      footer:        "#18181B",
    },
    typography: {
      headingFont:   "DM Sans",
      bodyFont:      "DM Sans",
      baseFontSize:  16,
      headingWeight: "600",
      lineHeight:    1.7,
      letterSpacing: 0.02,
    },
    buttonStyle:      "outline",
    animationStyle:   "fade",
    enableAnimations: false,
  },

  bold: {
    colors: {
      primary:       "#DC2626",
      secondary:     "#B91C1C",
      accent:        "#FCD34D",
      background:    "#FFFFFF",
      surface:       "#FEF2F2",
      textPrimary:   "#111827",
      textSecondary: "#6B7280",
      border:        "#FECACA",
      success:       "#16A34A",
      error:         "#DC2626",
      navbar:        "#DC2626",
      footer:        "#7F1D1D",
    },
    typography: {
      headingFont:   "Montserrat",
      bodyFont:      "Open Sans",
      baseFontSize:  16,
      headingWeight: "800",
      lineHeight:    1.5,
      letterSpacing: -0.02,
    },
    buttonStyle:      "filled",
    animationStyle:   "slide",
    enableAnimations: true,
  },

  elegant: {
    colors: {
      primary:       "#92400E",
      secondary:     "#78350F",
      accent:        "#D97706",
      background:    "#FFFBEB",
      surface:       "#FEF3C7",
      textPrimary:   "#1C1917",
      textSecondary: "#78716C",
      border:        "#FDE68A",
      success:       "#059669",
      error:         "#DC2626",
      navbar:        "#FFFBEB",
      footer:        "#1C1917",
    },
    typography: {
      headingFont:   "Playfair Display",
      bodyFont:      "Lora",
      baseFontSize:  17,
      headingWeight: "700",
      lineHeight:    1.8,
      letterSpacing: 0.01,
    },
    buttonStyle:      "soft",
    animationStyle:   "fade",
    enableAnimations: true,
  },

  nature: {
    colors: {
      primary:       "#16A34A",
      secondary:     "#15803D",
      accent:        "#CA8A04",
      background:    "#F0FDF4",
      surface:       "#DCFCE7",
      textPrimary:   "#14532D",
      textSecondary: "#4B5563",
      border:        "#BBF7D0",
      success:       "#16A34A",
      error:         "#DC2626",
      navbar:        "#FFFFFF",
      footer:        "#14532D",
    },
    typography: {
      headingFont:   "Nunito",
      bodyFont:      "Nunito",
      baseFontSize:  16,
      headingWeight: "700",
      lineHeight:    1.6,
      letterSpacing: 0,
    },
    buttonStyle:      "filled",
    animationStyle:   "zoom",
    enableAnimations: true,
  },

  corporate: {
    colors: {
      primary:       "#1D4ED8",
      secondary:     "#1E40AF",
      accent:        "#0369A1",
      background:    "#FFFFFF",
      surface:       "#F8FAFC",
      textPrimary:   "#0F172A",
      textSecondary: "#475569",
      border:        "#CBD5E1",
      success:       "#0D9488",
      error:         "#DC2626",
      navbar:        "#1D4ED8",
      footer:        "#0F172A",
    },
    typography: {
      headingFont:   "Roboto",
      bodyFont:      "Roboto",
      baseFontSize:  15,
      headingWeight: "700",
      lineHeight:    1.5,
      letterSpacing: 0,
    },
    buttonStyle:      "filled",
    animationStyle:   "none",
    enableAnimations: false,
  },
};

// ─────────────────────────────────────────
// @desc    Create new theme for client
// @route   POST /api/v1/themes
// @access  Private (all roles — own client only)
// ─────────────────────────────────────────

const createTheme = asyncHandler(async (req, res) => {
  const {
    name,
    preset = "default",
    colors,
    typography,
    navbar,
    footer,
    borderRadius,
    spacing,
    darkMode,
    buttonStyle,
    enableAnimations,
    animationStyle,
    customCss,
  } = req.body;

  // ── Resolve client ID ────────────────────
  let clientId;

  if (req.user.role === "clientadmin") {
    clientId = req.user.client;
    if (!clientId) {
      throw new ApiError(400, "Your account is not linked to any client.");
    }
  } else {
    clientId = req.body.client || req.clientId;
    if (!clientId) {
      throw new ApiError(400, "Client ID is required.");
    }
  }

  // ── Verify client exists ─────────────────
  const clientExists = await Client.findById(clientId);
  if (!clientExists) {
    throw new ApiError(404, "Client not found.");
  }

  // ── Get preset defaults ──────────────────
  const presetDefaults = THEME_PRESETS[preset] || THEME_PRESETS.default;

  // ── Merge preset with custom overrides ───
  // Custom values override preset defaults
  const themeData = {
    client:   clientId,
    name,
    preset,
    isActive: false, // New theme is inactive by default

    // Deep merge — custom values take priority
    colors: {
      ...presetDefaults.colors,
      ...(colors || {}),
    },

    typography: {
      ...presetDefaults.typography,
      ...(typography || {}),
    },

    darkMode: {
      ...(presetDefaults.darkMode || { enabled: false, mode: "manual" }),
      ...(darkMode || {}),
    },

    buttonStyle:      buttonStyle      || presetDefaults.buttonStyle      || "filled",
    enableAnimations: enableAnimations ?? presetDefaults.enableAnimations  ?? true,
    animationStyle:   animationStyle   || presetDefaults.animationStyle   || "fade",
    customCss:        customCss        || "",
  };

  // Apply navbar/footer/borderRadius/spacing if provided
  if (navbar)       themeData.navbar       = navbar;
  if (footer)       themeData.footer       = footer;
  if (borderRadius) themeData.borderRadius = borderRadius;
  if (spacing)      themeData.spacing      = spacing;

  const theme = await Theme.create(themeData);

  return res
    .status(201)
    .json(
      new ApiResponse(
        201,
        theme,
        `Theme '${theme.name}' created successfully.`
      )
    );
});

// ─────────────────────────────────────────
// @desc    Get all themes for a client
// @route   GET /api/v1/themes
// @access  Private (all roles — own client only)
// ─────────────────────────────────────────

const getAllThemes = asyncHandler(async (req, res) => {
  // ── Resolve client ID ────────────────────
  let clientId;

  if (req.user.role === "clientadmin") {
    clientId = req.user.client;
  } else {
    clientId = req.query.client || req.clientId;
  }

  if (!clientId) {
    throw new ApiError(400, "Client ID is required.");
  }

  const themes = await Theme.find({ client: clientId })
    .sort({ isActive: -1, createdAt: -1 })
    // Active theme first, then newest
    .lean();

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        themes,
        "Themes fetched successfully."
      )
    );
});

// ─────────────────────────────────────────
// @desc    Get active theme for client
//          (main endpoint for frontend)
// @route   GET /api/v1/themes/active
// @access  Public (resolveClient middleware)
// ─────────────────────────────────────────

const getActiveTheme = asyncHandler(async (req, res) => {
  if (!req.clientId) {
    throw new ApiError(400, "Client context is required.");
  }

  const theme = await Theme.getActiveTheme(req.clientId);

  if (!theme) {
    throw new ApiError(
      404,
      "No active theme found for this client."
    );
  }

  // Include CSS variables in response
  const themeObj = theme.toJSON();

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        {
          ...themeObj,
          cssVariables: theme.cssVariables,
          // Frontend injects this into :root { }
        },
        "Active theme fetched successfully."
      )
    );
});

// ─────────────────────────────────────────
// @desc    Get single theme by ID
// @route   GET /api/v1/themes/:id
// @access  Private
// ─────────────────────────────────────────

const getTheme = asyncHandler(async (req, res) => {
  const theme = await Theme.findById(req.params.id);

  if (!theme) {
    throw new ApiError(404, "Theme not found.");
  }

  // ── Tenant isolation ─────────────────────
  if (
    req.user.role === "clientadmin" &&
    theme.client.toString() !== req.user.client?.toString()
  ) {
    throw new ApiError(403, "Access denied.");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        {
          ...theme.toJSON(),
          cssVariables: theme.cssVariables,
        },
        "Theme fetched successfully."
      )
    );
});

// ─────────────────────────────────────────
// @desc    Update theme
// @route   PUT /api/v1/themes/:id
// @access  Private (all roles — own client only)
// ─────────────────────────────────────────

const updateTheme = asyncHandler(async (req, res) => {
  const theme = await Theme.findById(req.params.id);

  if (!theme) {
    throw new ApiError(404, "Theme not found.");
  }

  // ── Tenant isolation ─────────────────────
  if (
    req.user.role === "clientadmin" &&
    theme.client.toString() !== req.user.client?.toString()
  ) {
    throw new ApiError(403, "Access denied.");
  }

  const {
    name,
    colors,
    typography,
    navbar,
    footer,
    borderRadius,
    spacing,
    darkMode,
    buttonStyle,
    enableAnimations,
    animationStyle,
    customCss,
  } = req.body;

  // ── Build update with deep merge ─────────
  // Partial color updates — only changed colors
  const updates = {};

  if (name)            updates.name            = name;
  if (buttonStyle)     updates.buttonStyle     = buttonStyle;
  if (animationStyle)  updates.animationStyle  = animationStyle;
  if (customCss !== undefined) updates.customCss = customCss;
  if (enableAnimations !== undefined) {
    updates.enableAnimations = enableAnimations;
  }

  // Deep merge nested objects
  if (colors) {
    updates.colors = { ...theme.colors.toObject(), ...colors };
  }

  if (typography) {
    updates.typography = {
      ...theme.typography.toObject(),
      ...typography,
    };
  }

  if (navbar) {
    updates.navbar = { ...theme.navbar.toObject(), ...navbar };
  }

  if (footer) {
    updates.footer = { ...theme.footer.toObject(), ...footer };
  }

  if (borderRadius) {
    updates.borderRadius = {
      ...theme.borderRadius.toObject(),
      ...borderRadius,
    };
  }

  if (spacing) {
    updates.spacing = { ...theme.spacing.toObject(), ...spacing };
  }

  if (darkMode) {
    updates.darkMode = { ...theme.darkMode.toObject(), ...darkMode };
  }

  const updatedTheme = await Theme.findByIdAndUpdate(
    req.params.id,
    { $set: updates },
    { new: true, runValidators: true }
  );

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        {
          ...updatedTheme.toJSON(),
          cssVariables: updatedTheme.cssVariables,
        },
        "Theme updated successfully."
      )
    );
});

// ─────────────────────────────────────────
// @desc    Activate a theme
// @route   PUT /api/v1/themes/:id/activate
// @access  Private (all roles — own client only)
// ─────────────────────────────────────────

const activateTheme = asyncHandler(async (req, res) => {
  const theme = await Theme.findById(req.params.id);

  if (!theme) {
    throw new ApiError(404, "Theme not found.");
  }

  // ── Tenant isolation ─────────────────────
  if (
    req.user.role === "clientadmin" &&
    theme.client.toString() !== req.user.client?.toString()
  ) {
    throw new ApiError(403, "Access denied.");
  }

  // ── Admin/superadmin can activate any client's theme ──
  // No need for x-client-slug header
  if (
    req.user.role === "superadmin" ||
    req.user.role === "admin"
  ) {
    // Use client from theme document directly
    const clientId = theme.client.toString();

    if (theme.isActive) {
      return res.status(200).json(
        new ApiResponse(200, theme, `Theme '${theme.name}' is already active.`)
      );
    }

    const activatedTheme = await Theme.activateTheme(theme._id, clientId);

    await Client.findByIdAndUpdate(clientId, {
      $set: { theme: theme._id },
    });

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          ...activatedTheme.toJSON(),
          cssVariables: activatedTheme.cssVariables,
        },
        `Theme '${activatedTheme.name}' activated successfully.`
      )
    );
  }

  // ── ClientAdmin flow ──────────────────────
  if (theme.isActive) {
    return res.status(200).json(
      new ApiResponse(200, theme, `Theme '${theme.name}' is already active.`)
    );
  }

  const clientId      = req.clientId || theme.client.toString();
  const activatedTheme = await Theme.activateTheme(theme._id, clientId);

  await Client.findByIdAndUpdate(clientId, {
    $set: { theme: theme._id },
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        ...activatedTheme.toJSON(),
        cssVariables: activatedTheme.cssVariables,
      },
      `Theme '${activatedTheme.name}' activated successfully.`
    )
  );
});
// ─────────────────────────────────────────
// @desc    Apply preset to existing theme
// @route   PUT /api/v1/themes/:id/apply-preset
// @access  Private (all roles — own client only)
// ─────────────────────────────────────────

const applyPreset = asyncHandler(async (req, res) => {
  const { preset } = req.body;

  if (!preset || !THEME_PRESETS[preset]) {
    throw new ApiError(
      400,
      `Invalid preset. Available: ${Object.keys(THEME_PRESETS).join(", ")}`
    );
  }

  const theme = await Theme.findById(req.params.id);

  if (!theme) {
    throw new ApiError(404, "Theme not found.");
  }

  // ── Tenant isolation ─────────────────────
  if (
    req.user.role === "clientadmin" &&
    theme.client.toString() !== req.user.client?.toString()
  ) {
    throw new ApiError(403, "Access denied.");
  }

  // ── Apply preset values ──────────────────
  const presetData = THEME_PRESETS[preset];

  const updatedTheme = await Theme.findByIdAndUpdate(
    req.params.id,
    {
      $set: {
        preset,
        colors:           presetData.colors,
        typography:       presetData.typography,
        buttonStyle:      presetData.buttonStyle      || "filled",
        animationStyle:   presetData.animationStyle   || "fade",
        enableAnimations: presetData.enableAnimations ?? true,
        ...(presetData.darkMode && { darkMode: presetData.darkMode }),
      },
    },
    { new: true, runValidators: true }
  );

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        {
          ...updatedTheme.toJSON(),
          cssVariables: updatedTheme.cssVariables,
        },
        `Preset '${preset}' applied to theme '${updatedTheme.name}' successfully.`
      )
    );
});

// ─────────────────────────────────────────
// @desc    Get all available presets
// @route   GET /api/v1/themes/presets
// @access  Private
// ─────────────────────────────────────────

const getPresets = asyncHandler(async (req, res) => {
  // Return preset names + preview colors only
  const presets = Object.entries(THEME_PRESETS).map(([key, value]) => ({
    id:     key,
    name:   key.charAt(0).toUpperCase() + key.slice(1),
    colors: {
      primary:    value.colors.primary,
      secondary:  value.colors.secondary,
      accent:     value.colors.accent,
      background: value.colors.background,
      navbar:     value.colors.navbar,
      footer:     value.colors.footer,
    },
    typography: {
      headingFont: value.typography.headingFont,
      bodyFont:    value.typography.bodyFont,
    },
    buttonStyle: value.buttonStyle,
    darkMode:    value.darkMode?.enabled || false,
  }));

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        presets,
        "Theme presets fetched successfully."
      )
    );
});

// ─────────────────────────────────────────
// @desc    Duplicate theme
// @route   POST /api/v1/themes/:id/duplicate
// @access  Private
// ─────────────────────────────────────────

const duplicateTheme = asyncHandler(async (req, res) => {
  const theme = await Theme.findById(req.params.id).lean();

  if (!theme) {
    throw new ApiError(404, "Theme not found.");
  }

  // ── Tenant isolation ─────────────────────
  if (
    req.user.role === "clientadmin" &&
    theme.client.toString() !== req.user.client?.toString()
  ) {
    throw new ApiError(403, "Access denied.");
  }

  // ── Create duplicate ─────────────────────
  const {
    _id,
    createdAt,
    updatedAt,
    isActive,
    ...themeData
  } = theme;

  const duplicatedTheme = await Theme.create({
    ...themeData,
    name:     `${theme.name} (Copy)`,
    isActive: false,
  });

  return res
    .status(201)
    .json(
      new ApiResponse(
        201,
        duplicatedTheme,
        `Theme duplicated as '${duplicatedTheme.name}' successfully.`
      )
    );
});

// ─────────────────────────────────────────
// @desc    Delete theme
// @route   DELETE /api/v1/themes/:id
// @access  Private
// ─────────────────────────────────────────

const deleteTheme = asyncHandler(async (req, res) => {
  const theme = await Theme.findById(req.params.id);

  if (!theme) {
    throw new ApiError(404, "Theme not found.");
  }

  // ── Cannot delete active theme ───────────
  if (theme.isActive) {
    throw new ApiError(
      400,
      "Cannot delete the active theme. Please activate another theme first."
    );
  }

  // ── Tenant isolation ─────────────────────
  if (
    req.user.role === "clientadmin" &&
    theme.client.toString() !== req.user.client?.toString()
  ) {
    throw new ApiError(403, "Access denied.");
  }

  await Theme.findByIdAndDelete(req.params.id);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        null,
        `Theme '${theme.name}' deleted successfully.`
      )
    );
});

export {
  createTheme,
  getAllThemes,
  getActiveTheme,
  getTheme,
  updateTheme,
  activateTheme,
  applyPreset,
  getPresets,
  duplicateTheme,
  deleteTheme,
};