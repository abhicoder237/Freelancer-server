import { Router } from "express";
import {
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
} from "../controllers/themeController.js";
import { protect }               from "../middleware/authMiddleware.js";
import { attachRoleContext }      from "../middleware/roleMiddleware.js";
import {
  resolveClient,
  optionalResolveClient,
}                                 from "../middleware/clientMiddleware.js";
import { themeValidators }        from "../middleware/validateMiddleware.js";

const router = Router();

// ── Public ───────────────────────────────
router.get("/active",  resolveClient, getActiveTheme);
router.get("/presets", protect, getPresets);

// ── Private ──────────────────────────────
router.get(
  "/",
  protect,
  attachRoleContext,
  optionalResolveClient,
  getAllThemes
);

router.post(
  "/",
  protect,
  attachRoleContext,
  optionalResolveClient,
  themeValidators.create,
  createTheme
);

router.get(
  "/:id",
  protect,
  attachRoleContext,
  getTheme
);

router.put(
  "/:id",
  protect,
  attachRoleContext,
  themeValidators.update,
  updateTheme
);

// ── Activate — optionalResolveClient ─────
router.put(
  "/:id/activate",
  protect,
  attachRoleContext,
  optionalResolveClient,
  themeValidators.activate,
  activateTheme
);

router.put(
  "/:id/apply-preset",
  protect,
  attachRoleContext,
  applyPreset
);

router.post(
  "/:id/duplicate",
  protect,
  attachRoleContext,
  duplicateTheme
);

router.delete(
  "/:id",
  protect,
  attachRoleContext,
  deleteTheme
);

export default router;