import jwt from "jsonwebtoken";
import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import User from "../models/User.js";
import Client from "../models/Client.js";

// ─────────────────────────────────────────
// HELPER — Generate Token + Set Cookie
// ─────────────────────────────────────────

const generateTokenAndSetCookie = (user, res) => {
  // Generate JWT
  const token = user.generateAccessToken();

  // Cookie options
  const cookieOptions = {
    httpOnly: true,   // JS cannot access — XSS safe
    secure:   process.env.NODE_ENV === "production", // HTTPS only in prod
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge:   parseInt(process.env.JWT_COOKIE_EXPIRE || 7) * 24 * 60 * 60 * 1000,
    // e.g. 7 days in milliseconds
  };

  // Set HTTP-only cookie
  res.cookie("accessToken", token, cookieOptions);

  return token;
};

// ─────────────────────────────────────────
// HELPER — Safe User Response
// Remove sensitive fields before sending
// ─────────────────────────────────────────

const safeUserResponse = (user) => {
  const userObj = user.toObject ? user.toObject() : { ...user };

  delete userObj.password;
  delete userObj.passwordResetToken;
  delete userObj.passwordResetExpire;
  delete userObj.loginAttempts;
  delete userObj.lockUntil;

  return userObj;
};

// ─────────────────────────────────────────
// @desc    Register new user
// @route   POST /api/v1/auth/register
// @access  Private (superadmin / admin only)
// ─────────────────────────────────────────

const register = asyncHandler(async (req, res) => {
  const { name, email, password, role, client: clientId } = req.body;

  // ── Check duplicate email ────────────────
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new ApiError(
      409,
      `An account with email '${email}' already exists.`
    );
  }

  // ── Role restriction ─────────────────────
  // Only superadmin can create superadmin accounts
  if (role === "superadmin" && req.user?.role !== "superadmin") {
    throw new ApiError(
      403,
      "Only superadmin can create another superadmin account."
    );
  }

  // ── Validate client for clientadmin ──────
  if (role === "clientadmin") {
    if (!clientId) {
      throw new ApiError(
        400,
        "Client ID is required when creating a clientadmin account."
      );
    }

    const clientExists = await Client.findById(clientId);
    if (!clientExists) {
      throw new ApiError(404, "Client not found with the provided ID.");
    }
  }

  // ── Create user ──────────────────────────
  const user = await User.create({
    name,
    email,
    password,        // Hashed by pre-save hook in User model
    role: role || "clientadmin",
    client: role === "clientadmin" ? clientId : null,
  });

  // ── Response ─────────────────────────────
  return res
    .status(201)
    .json(
      new ApiResponse(
        201,
        safeUserResponse(user),
        `User '${user.name}' registered successfully.`
      )
    );
});

// ─────────────────────────────────────────
// @desc    Login user
// @route   POST /api/v1/auth/login
// @access  Public
// ─────────────────────────────────────────

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // ── Find user with password ──────────────
  // password is select: false — must explicitly select
  const user = await User.findOne({ email }).select(
    "+password +loginAttempts +lockUntil"
  );

  // ── User not found ───────────────────────
  if (!user) {
    throw new ApiError(
      401,
      "Invalid email or password."
      // Vague message — don't reveal if email exists
    );
  }

  // ── Account inactive ─────────────────────
  if (!user.isActive) {
    throw new ApiError(
      403,
      "Your account has been deactivated. Please contact support."
    );
  }

  // ── Account locked ───────────────────────
  if (user.isLocked()) {
    const minutesLeft = Math.ceil(
      (user.lockUntil - Date.now()) / (1000 * 60)
    );
    throw new ApiError(
      423,
      `Account locked due to too many failed attempts. Try again in ${minutesLeft} minute(s).`
    );
  }

  // ── Verify password ──────────────────────
  const isPasswordCorrect = await user.comparePassword(password);

  if (!isPasswordCorrect) {
    // Increment failed attempts
    await user.incrementLoginAttempts();

    const attemptsLeft = 5 - (user.loginAttempts + 1);

    throw new ApiError(
      401,
      attemptsLeft > 0
        ? `Invalid email or password. ${attemptsLeft} attempt(s) remaining before account lock.`
        : "Account locked due to too many failed attempts. Try again in 2 hours."
    );
  }

  // ── Reset login attempts on success ──────
  await user.resetLoginAttempts();

  // ── Generate token + set cookie ──────────
  const token = generateTokenAndSetCookie(user, res);

  // ── Populate client if clientadmin ───────
  let populatedUser = user;
  if (user.role === "clientadmin" && user.client) {
    populatedUser = await User.findById(user._id).populate({
      path:   "client",
      select: "name slug logo plan isActive",
    });
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        {
          user:  safeUserResponse(populatedUser),
          token, // Also send in body for API clients (mobile/Postman)
        },
        "Logged in successfully."
      )
    );
});

// ─────────────────────────────────────────
// @desc    Logout user
// @route   POST /api/v1/auth/logout
// @access  Private
// ─────────────────────────────────────────

const logout = asyncHandler(async (req, res) => {
  // Clear the cookie
  res.cookie("accessToken", "", {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    expires:  new Date(0), // Expire immediately
  });

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Logged out successfully."));
});

// ─────────────────────────────────────────
// @desc    Get current logged in user
// @route   GET /api/v1/auth/me
// @access  Private
// ─────────────────────────────────────────

const getMe = asyncHandler(async (req, res) => {
  // req.user set by protect middleware
  // Re-fetch to get latest data + populate client
  const user = await User.findById(req.user._id).populate({
    path:   "client",
    select: "name slug logo plan isActive businessType",
  });

  if (!user) {
    throw new ApiError(404, "User not found.");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        safeUserResponse(user),
        "User profile fetched successfully."
      )
    );
});

// ─────────────────────────────────────────
// @desc    Update current user profile
// @route   PUT /api/v1/auth/me
// @access  Private
// ─────────────────────────────────────────

const updateProfile = asyncHandler(async (req, res) => {
  // Fields allowed to update via this route
  const allowedUpdates = ["name"];
  const updates = {};

  allowedUpdates.forEach((field) => {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  });

  if (Object.keys(updates).length === 0) {
    throw new ApiError(400, "No valid fields provided for update.");
  }

  const updatedUser = await User.findByIdAndUpdate(
    req.user._id,
    { $set: updates },
    {
      new:         true,  // Return updated document
      runValidators: true, // Run schema validators
    }
  );

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        safeUserResponse(updatedUser),
        "Profile updated successfully."
      )
    );
});

// ─────────────────────────────────────────
// @desc    Change password
// @route   PUT /api/v1/auth/change-password
// @access  Private
// ─────────────────────────────────────────

const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  // Fetch user with password
  const user = await User.findById(req.user._id).select("+password");

  if (!user) {
    throw new ApiError(404, "User not found.");
  }

  // ── Verify current password ──────────────
  const isCurrentPasswordCorrect = await user.comparePassword(currentPassword);

  if (!isCurrentPasswordCorrect) {
    throw new ApiError(401, "Current password is incorrect.");
  }

  // ── Ensure new password is different ─────
  const isSamePassword = await user.comparePassword(newPassword);
  if (isSamePassword) {
    throw new ApiError(
      400,
      "New password cannot be the same as your current password."
    );
  }

  // ── Update password ──────────────────────
  // Assignment triggers pre-save hook → auto hashes
  user.password = newPassword;
  await user.save();

  // ── Invalidate old session ───────────────
  // Clear cookie — user must login again
  res.cookie("accessToken", "", {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    expires:  new Date(0),
  });

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        null,
        "Password changed successfully. Please log in again with your new password."
      )
    );
});

// ─────────────────────────────────────────
// @desc    Get all users (superadmin only)
// @route   GET /api/v1/auth/users
// @access  Private (superadmin)
// ─────────────────────────────────────────

const getAllUsers = asyncHandler(async (req, res) => {
  const {
    page  = 1,
    limit = 10,
    role,
    isActive,
    search,
  } = req.query;

  // ── Build filter ─────────────────────────
  const filter = {};

  if (role)     filter.role     = role;
  if (isActive !== undefined) filter.isActive = isActive === "true";

  // Search by name or email
  if (search) {
    filter.$or = [
      { name:  { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ];
  }

  // ── Pagination ───────────────────────────
  const skip  = (parseInt(page) - 1) * parseInt(limit);
  const total = await User.countDocuments(filter);

  const users = await User.find(filter)
    .populate({
      path:   "client",
      select: "name slug",
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        users.map(safeUserResponse),
        "Users fetched successfully.",
        {
          total,
          page:       parseInt(page),
          limit:      parseInt(limit),
          totalPages: Math.ceil(total / parseInt(limit)),
        }
      )
    );
});

// ─────────────────────────────────────────
// @desc    Toggle user active status
// @route   PUT /api/v1/auth/users/:id/toggle-status
// @access  Private (superadmin)
// ─────────────────────────────────────────

const toggleUserStatus = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    throw new ApiError(404, "User not found.");
  }

  // Prevent superadmin from deactivating themselves
  if (user._id.toString() === req.user._id.toString()) {
    throw new ApiError(400, "You cannot deactivate your own account.");
  }

  user.isActive = !user.isActive;
  await user.save();

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { _id: user._id, isActive: user.isActive },
        `User account ${user.isActive ? "activated" : "deactivated"} successfully.`
      )
    );
});

export {
  register,
  login,
  logout,
  getMe,
  updateProfile,
  changePassword,
  getAllUsers,
  toggleUserStatus,
};