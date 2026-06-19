const express = require("express");
const multer = require("multer");
const path = require("path");
const Receipt = require("../models/Receipt");
const { processReceipt } = require("../services/geminiService");
const { validatePAN } = require("../services/panValidator");

const router = express.Router();

// --- Multer config: store images in /uploads with original extension ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "..", "uploads"));
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e6)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = [".jpg", ".jpeg", ".png", ".webp"];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`Unsupported file type: ${ext}. Allowed: ${allowed.join(", ")}`));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

// ============================================================
// POST /api/receipts/upload — Upload receipt image & extract data
// ============================================================
router.post("/upload", upload.single("receipt"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image file uploaded" });
    }

    const imagePath = req.file.path;
    const receiptType = req.body.type || "purchase"; // default to purchase

    // Run two-step Gemini extraction
    const { rawText, structured } = await processReceipt(imagePath);

    // Map Gemini's snake_case output to our Mongoose schema
    const receiptData = {
      vendorName: structured.vendor_name || "",
      vendorPAN: structured.vendor_pan || null,
      invoiceNumber: structured.invoice_number || null,
      date: structured.date ? new Date(structured.date) : null,
      items: (structured.items || []).map((item) => ({
        description: item.description || "",
        quantity: item.quantity || 1,
        unitPrice: item.unit_price || 0,
        amount: item.amount || 0,
        vatApplicable: item.vat_applicable !== false,
      })),
      subtotal: structured.subtotal || 0,
      vatAmount: structured.vat_amount || 0,
      total: structured.total || 0,
      type: receiptType,
      confidence: structured.confidence || "low",
      imagePath: req.file.filename, // store just the filename, not full path
      rawText,
    };

    // PAN validation if extracted
    let panValidation = null;
    if (receiptData.vendorPAN) {
      panValidation = validatePAN(receiptData.vendorPAN);
    }

    // Save to MongoDB
    const receipt = new Receipt(receiptData);
    await receipt.save();

    res.status(201).json({
      message: "Receipt uploaded and processed successfully",
      receipt,
      panValidation,
    });
  } catch (error) {
    console.error("[Upload Error]", error);
    res.status(500).json({
      error: "Failed to process receipt",
      details: error.message,
    });
  }
});

// ============================================================
// GET /api/receipts — List all receipts (with optional filters)
// ============================================================
router.get("/", async (req, res) => {
  try {
    const { type, month, year, limit = 50, page = 1 } = req.query;
    const filter = {};

    if (type) filter.type = type;

    if (month && year) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59, 999);
      filter.date = { $gte: startDate, $lte: endDate };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Receipt.countDocuments(filter);
    const receipts = await Receipt.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.json({
      receipts,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("[List Error]", error);
    res.status(500).json({ error: "Failed to fetch receipts", details: error.message });
  }
});

// ============================================================
// GET /api/receipts/:id — Get single receipt by ID
// ============================================================
router.get("/:id", async (req, res) => {
  try {
    const receipt = await Receipt.findById(req.params.id);
    if (!receipt) {
      return res.status(404).json({ error: "Receipt not found" });
    }
    res.json(receipt);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch receipt", details: error.message });
  }
});

// ============================================================
// PUT /api/receipts/:id — Update/correct extracted receipt data
// ============================================================
router.put("/:id", async (req, res) => {
  try {
    const allowedFields = [
      "vendorName",
      "vendorPAN",
      "invoiceNumber",
      "date",
      "items",
      "subtotal",
      "vatAmount",
      "total",
      "type",
      "confidence",
    ];

    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    // Re-validate PAN if it was updated
    let panValidation = null;
    if (updates.vendorPAN) {
      panValidation = validatePAN(updates.vendorPAN);
    }

    const receipt = await Receipt.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!receipt) {
      return res.status(404).json({ error: "Receipt not found" });
    }

    res.json({ message: "Receipt updated", receipt, panValidation });
  } catch (error) {
    res.status(500).json({ error: "Failed to update receipt", details: error.message });
  }
});

// ============================================================
// DELETE /api/receipts/:id — Delete a receipt
// ============================================================
router.delete("/:id", async (req, res) => {
  try {
    const receipt = await Receipt.findByIdAndDelete(req.params.id);
    if (!receipt) {
      return res.status(404).json({ error: "Receipt not found" });
    }
    res.json({ message: "Receipt deleted" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete receipt", details: error.message });
  }
});

// ============================================================
// POST /api/receipts/:id/validate-pan — Validate PAN for a receipt
// ============================================================
router.post("/:id/validate-pan", async (req, res) => {
  try {
    const receipt = await Receipt.findById(req.params.id);
    if (!receipt) {
      return res.status(404).json({ error: "Receipt not found" });
    }

    const pan = req.body.pan || receipt.vendorPAN;
    const validation = validatePAN(pan);

    res.json({ pan, validation });
  } catch (error) {
    res.status(500).json({ error: "Failed to validate PAN", details: error.message });
  }
});

module.exports = router;
