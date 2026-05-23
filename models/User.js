import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

// ─────────────────────────────────────────
// USER SCHEMA
// ─────────────────────────────────────────

const userSchema = new mongoose.Schema(
  {
    // ── Basic Info ──────────────────────────
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [50, "Name cannot exceed 50 characters"],
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Please provide a valid email address",
      ],
    },

    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters"],
      select: false, // Never returned in queries by default
    },

    // ── Role Based Access ───────────────────
    role: {
      type: String,
      enum: {
        values: ["superadmin", "admin", "clientadmin"],
        message: "Role must be superadmin, admin, or clientadmin",
      },
      default: "clientadmin",
    },

    // ── Client Association ──────────────────
    // Only for clientadmin role
    // Links this user to a specific client/tenant
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      default: null,
    },

    // ── Avatar ──────────────────────────────
    avatar: {
      url: {
        type: String,
        default: "",
      },
      publicId: {
        type: String,
        default: "",
      },
    },

    // ── Account Status ──────────────────────
    isActive: {
      type: Boolean,
      default: true,
    },

    // ── Password Reset ──────────────────────
    passwordResetToken: {
      type: String,
      select: false,
    },

    passwordResetExpire: {
      type: Date,
      select: false,
    },

    // ── Security Tracking ───────────────────
    lastLogin: {
      type: Date,
      default: null,
    },

    loginAttempts: {
      type: Number,
      default: 0,
    },

    lockUntil: {
      type: Date,
      default: null,
    },
  },
  {
    // Auto createdAt + updatedAt timestamps
    timestamps: true,

    // Remove __v field from responses
    versionKey: false,
  }
);

// ─────────────────────────────────────────
// INDEXES
// ─────────────────────────────────────────

// email already unique — auto-indexed
// Additional index for client-based queries
userSchema.index({ client: 1, role: 1 });
userSchema.index({ role: 1 });

// ─────────────────────────────────────────
// PRE-SAVE MIDDLEWARE
// Hash password before saving to DB
// ─────────────────────────────────────────

userSchema.pre("save", async function (next) {
  // Only hash if password field was modified
  // Prevents re-hashing on profile updates
  if (!this.isModified("password")) return next();

  try {
    // Salt rounds: 12 — good balance of security vs performance
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────
// INSTANCE METHODS
// Available on every user document
// ─────────────────────────────────────────

/**
 * Compare entered password with hashed DB password
 * @param   {string}  enteredPassword - Plain text password from login form
 * @returns {boolean} true if match, false otherwise
 */
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

/**
 * Generate signed JWT access token
 * @returns {string} JWT token string
 */
userSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    {
      _id: this._id,
      email: this.email,
      role: this.role,
      client: this.client,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRE || "7d",
    }
  );
};

/**
 * Check if account is currently locked
 * Account locks after 5 failed login attempts
 * @returns {boolean}
 */
userSchema.methods.isLocked = function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
};

/**
 * Increment failed login attempts
 * Lock account for 2 hours after 5 failed attempts
 */
userSchema.methods.incrementLoginAttempts = async function () {
  const MAX_ATTEMPTS = 5;
  const LOCK_DURATION = 2 * 60 * 60 * 1000; // 2 hours in ms

  // If lock has expired — reset attempts and remove lock
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return await this.updateOne({
      $set: { loginAttempts: 1 },
      $unset: { lockUntil: 1 },
    });
  }

  const updates = { $inc: { loginAttempts: 1 } };

  // Lock account if max attempts reached
  if (this.loginAttempts + 1 >= MAX_ATTEMPTS && !this.isLocked()) {
    updates.$set = { lockUntil: Date.now() + LOCK_DURATION };
  }

  return await this.updateOne(updates);
};

/**
 * Reset login attempts after successful login
 */
userSchema.methods.resetLoginAttempts = async function () {
  return await this.updateOne({
    $set: { loginAttempts: 0, lastLogin: Date.now() },
    $unset: { lockUntil: 1 },
  });
};

// ─────────────────────────────────────────
// VIRTUAL FIELDS
// Not stored in DB — computed on the fly
// ─────────────────────────────────────────

// Full profile URL (can be extended later)
userSchema.virtual("profileUrl").get(function () {
  return this.avatar?.url || "";
});

// ─────────────────────────────────────────
// TO JSON TRANSFORM
// Remove sensitive fields from API responses
// ─────────────────────────────────────────

userSchema.set("toJSON", {
  virtuals: true,
  transform: function (doc, ret) {
    delete ret.password;
    delete ret.passwordResetToken;
    delete ret.passwordResetExpire;
    delete ret.loginAttempts;
    delete ret.lockUntil;
    delete ret.id; // Remove duplicate id (keep _id)
    return ret;
  },
});

const User = mongoose.model("User", userSchema);

export default User;