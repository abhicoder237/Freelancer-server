import express          from "express";
import dotenv           from "dotenv";
import cors             from "cors";
import helmet           from "helmet";
import morgan           from "morgan";
import cookieParser     from "cookie-parser";
import mongoSanitize    from "express-mongo-sanitize";
import { rateLimit }    from "express-rate-limit";

// ── Core Config ──────────────────────────
import connectDB        from "./config/db.js";

// ── Routes ──────────────────────────────
import authRoutes       from "./routes/authRoutes.js";
import clientRoutes     from "./routes/clientRoutes.js";
import productRoutes    from "./routes/productRoutes.js";
import themeRoutes      from "./routes/themeRoutes.js";
import sectionRoutes    from "./routes/sectionRoutes.js";
import uploadRoutes     from "./routes/uploadRoutes.js";

// ── Error Middleware ─────────────────────
import {
  errorMiddleware,
  notFoundMiddleware,
}                       from "./middleware/errorMiddleware.js";

// ─────────────────────────────────────────
// ENVIRONMENT SETUP
// ─────────────────────────────────────────

// Load .env FIRST — before anything else
dotenv.config();

// Connect to MongoDB
connectDB();

// ─────────────────────────────────────────
// EXPRESS APP INIT
// ─────────────────────────────────────────

const app = express();

// ─────────────────────────────────────────
// TRUST PROXY
// Required for rate limiting behind
// Nginx / Render / Railway / Heroku
// ─────────────────────────────────────────

app.set("trust proxy", 1);

// ─────────────────────────────────────────
// SECURITY MIDDLEWARE
// ─────────────────────────────────────────

// Secure HTTP headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  // Allow Cloudinary images to load cross-origin
}));

// Rate limiting — 100 requests per 10 minutes per IP
const globalLimiter = rateLimit({
  windowMs:        10 * 60 * 1000,
  max:             100,
  standardHeaders: true,
  legacyHeaders:   false,
  message: {
    success: false,
    message: "Too many requests from this IP. Please try again after 10 minutes.",
  },
});

// Stricter limiter for auth routes
// 10 attempts per 15 minutes — brute force protection
const authLimiter = rateLimit({
  windowMs:        15 * 60 * 1000,
  max:             10,
  standardHeaders: true,
  legacyHeaders:   false,
  message: {
    success: false,
    message: "Too many login attempts. Please try again after 15 minutes.",
  },
});

app.use("/api",           globalLimiter);
app.use("/api/v1/auth",   authLimiter);

// MongoDB NoSQL injection prevention
app.use(mongoSanitize());

// ─────────────────────────────────────────
// CORE MIDDLEWARE
// ─────────────────────────────────────────

// Parse JSON body
app.use(express.json({ limit: "10mb" }));

// Parse URL-encoded body
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Parse cookies
app.use(cookieParser());

// HTTP request logger — dev only
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// ─────────────────────────────────────────
// CORS CONFIGURATION
// ─────────────────────────────────────────
app.use(
  cors({
    origin: [
      "https://freelancer-client-seven.vercel.app",
      "http://localhost:5173",
    ],
    credentials: true,
  })
);
 
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "API Running Successfully 🚀"
  });
});
// ─────────────────────────────────────────
// HEALTH CHECK
// Used by deployment platforms to verify
// server is running
// ─────────────────────────────────────────

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success:     true,
    message:     "Server is healthy",
    environment: process.env.NODE_ENV,
    timestamp:   new Date().toISOString(),
    uptime:      `${Math.floor(process.uptime())} seconds`,
    version:     "1.0.0",
  });
});

// ─────────────────────────────────────────
// API ROUTES — v1
// All routes prefixed with /api/v1/
// ─────────────────────────────────────────

app.use("/api/v1/auth",     authRoutes);
app.use("/api/v1/clients",  clientRoutes);
app.use("/api/v1/products", productRoutes);
app.use("/api/v1/themes",   themeRoutes);
app.use("/api/v1/sections", sectionRoutes);
app.use("/api/v1/upload",   uploadRoutes);

// ─────────────────────────────────────────
// 404 HANDLER
// Catches all unmatched routes
// Must be AFTER all route definitions
// ─────────────────────────────────────────

app.use(notFoundMiddleware);

// ─────────────────────────────────────────
// GLOBAL ERROR HANDLER
// Must be LAST middleware
// 4 params = Express error handler
// ─────────────────────────────────────────

app.use(errorMiddleware);

// ─────────────────────────────────────────
// START SERVER
// ─────────────────────────────────────────

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log("─────────────────────────────────────────");
  console.log(`🚀 Server running in ${process.env.NODE_ENV} mode`);
  console.log(`📡 Port: ${PORT}`);
  console.log(`🌐 URL: http://localhost:${PORT}`);
  console.log(`❤️  Health: http://localhost:${PORT}/api/health`);
  console.log("─────────────────────────────────────────");
  console.log("📌 API Endpoints:");
  console.log(`   /api/v1/auth`);
  console.log(`   /api/v1/clients`);
  console.log(`   /api/v1/products`);
  console.log(`   /api/v1/themes`);
  console.log(`   /api/v1/sections`);
  console.log(`   /api/v1/upload`);
  console.log("─────────────────────────────────────────");
});

// ─────────────────────────────────────────
// GRACEFUL SHUTDOWN HANDLERS
// ─────────────────────────────────────────

// Unhandled promise rejections
process.on("unhandledRejection", (err) => {
  console.error("─────────────────────────────────────────");
  console.error(`❌ UNHANDLED REJECTION: ${err.message}`);
  console.error(err.stack);
  console.error("─────────────────────────────────────────");

  // Close server gracefully — finish pending requests
  server.close(() => {
    console.log("🔴 Server closed due to unhandled rejection");
    process.exit(1);
  });
});

// Uncaught exceptions
process.on("uncaughtException", (err) => {
  console.error("─────────────────────────────────────────");
  console.error(`❌ UNCAUGHT EXCEPTION: ${err.message}`);
  console.error(err.stack);
  console.error("─────────────────────────────────────────");
  process.exit(1);
});

// SIGTERM — graceful shutdown (Docker/PM2/Render)
process.on("SIGTERM", () => {
  console.log("📴 SIGTERM received — shutting down gracefully");
  server.close(() => {
    console.log("✅ Server closed successfully");
    process.exit(0);
  });
});

export default app;