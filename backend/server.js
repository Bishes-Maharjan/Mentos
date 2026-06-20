require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");

const app = express();

// ---- Middleware ----
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded images statically
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ---- Routes ----
const { auth } = require("./middleware/auth");
const receiptRoutes = require("./routes/receipts");
const annexRoutes = require("./routes/annex");
const vatRoutes = require("./routes/vat");
const d2Routes = require("./routes/d2");
const userRoutes = require("./routes/users");

// Public routes (no auth needed)
app.use("/api/users", userRoutes);

// Protected routes (JWT required)
app.use("/api/receipts", auth, receiptRoutes);
app.use("/api/annex", auth, annexRoutes);
app.use("/api/vat", auth, vatRoutes);
app.use("/api/d2", d2Routes);

// ---- Health check ----
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service: "Kaji.ai Backend",
    timestamp: new Date().toISOString(),
    mongoStatus: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  });
});

// ---- Error handling ----
app.use((err, req, res, next) => {
  // Multer file size / type errors
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({ error: "File too large. Maximum size is 10 MB." });
  }
  if (err.message && err.message.includes("Unsupported file type")) {
    return res.status(400).json({ error: err.message });
  }
  console.error("[Server Error]", err);
  res.status(500).json({ error: "Internal server error" });
});

// ---- Database & Server Start ----
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/kaji";

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log("✅ Connected to MongoDB");
    app.listen(PORT, () => {
      console.log(`🚀 Kaji.ai backend running on http://localhost:${PORT}`);
      console.log(`📋 Health check: http://localhost:${PORT}/api/health`);
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB connection failed:", err.message);
    process.exit(1);
  });

module.exports = app;
