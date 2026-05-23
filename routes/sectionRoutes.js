import { Router } from "express";
import {
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
} from "../controllers/sectionController.js";
import { protect }                from "../middleware/authMiddleware.js";
import { attachRoleContext }      from "../middleware/roleMiddleware.js";
import {
  resolveClient,
  optionalResolveClient,
  verifyClientOwnership,
}                                 from "../middleware/clientMiddleware.js";
import { sectionValidators }      from "../middleware/validateMiddleware.js";

const router = Router();

// ─────────────────────────────────────────
// PUBLIC ROUTES
// Frontend reads sections to render pages
// Requires x-client-slug header
// ─────────────────────────────────────────

// GET /api/v1/sections/page/:page
// Returns visible sections sorted by order
// Frontend maps each section type to component
// e.g. type: "hero" → <HeroSection />
router.get(
  "/page/:page",
  resolveClient,
  getPageSections
);

// ─────────────────────────────────────────
// PRIVATE ROUTES — bulk operations
// Must be defined BEFORE /:id routes
// ─────────────────────────────────────────

// PUT /api/v1/sections/reorder
// Drag-drop reorder — bulk update orders
// Body: { sections: [{ id, order }] }
router.put(
  "/reorder",
  protect,
  attachRoleContext,
  optionalResolveClient,
  sectionValidators.reorder,
  reorderSections
);

// ─────────────────────────────────────────
// PRIVATE ROUTES — collection level
// ─────────────────────────────────────────

// GET /api/v1/sections
// All sections for a client (admin panel)
// Returns flat array + grouped by page
router.get(
  "/",
  protect,
  attachRoleContext,
  optionalResolveClient,
  getAllSections
);

// POST /api/v1/sections
// Create new section
// Auto-places at bottom of page (order++)
router.post(
  "/",
  protect,
  attachRoleContext,
  optionalResolveClient,
  sectionValidators.create,
  createSection
);

// ─────────────────────────────────────────
// PRIVATE ROUTES — single section
// ─────────────────────────────────────────

// GET /api/v1/sections/:id
// Single section with all data
router.get(
  "/:id",
  protect,
  attachRoleContext,
  getSection
);

// PUT /api/v1/sections/:id
// Update base config
// (name, visibility, order, padding, bg color)
router.put(
  "/:id",
  protect,
  attachRoleContext,
  sectionValidators.update,
  updateSection
);

// PUT /api/v1/sections/:id/data
// Update section content data
// (heroData, featuresData, bannerData, etc.)
// Supports partial deep merge
router.put(
  "/:id/data",
  protect,
  attachRoleContext,
  updateSectionData
);

// PUT /api/v1/sections/:id/toggle-visibility
// Show / hide section
// One click in admin panel
router.put(
  "/:id/toggle-visibility",
  protect,
  attachRoleContext,
  toggleVisibility
);

// POST /api/v1/sections/:id/duplicate
// Duplicate section — creates hidden copy
// Admin can then edit + show
router.post(
  "/:id/duplicate",
  protect,
  attachRoleContext,
  duplicateSection
);

// ─────────────────────────────────────────
// SECTION ITEMS ROUTES
// For sections with array data
// (features, testimonials, faq, stats, gallery)
// ─────────────────────────────────────────

// POST /api/v1/sections/:id/items
// Add new item to section array
// Body: { item: { title, description, icon } }
router.post(
  "/:id/items",
  protect,
  attachRoleContext,
  addSectionItem
);

// DELETE /api/v1/sections/:id/items/:index
// Remove item by array index
router.delete(
  "/:id/items/:index",
  protect,
  attachRoleContext,
  removeSectionItem
);

// ─────────────────────────────────────────
// DELETE ROUTE
// ─────────────────────────────────────────

// DELETE /api/v1/sections/:id
// Permanently delete section
router.delete(
  "/:id",
  protect,
  attachRoleContext,
  deleteSection
);

export default router;