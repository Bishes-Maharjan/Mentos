const express = require("express");
const multer = require("multer");
const path = require("path");
const Receipt = require("../models/Receipt");
const { processReceipt } = require("../services/geminiService");
const { validatePAN } = require("../services/panValidator");
const { auth } = require("../middleware/auth");
const { estimateBSFromAD, parseBSDate } = require("../utils/dateUtils");

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
router.post("/upload", auth, upload.single("receipt"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image file uploaded" });
    }

    const imagePath = req.file.path;
    const receiptType = req.body.type || "purchase"; // default to purchase

    // Run two-step Gemini extraction
    const userContext = {
      businessName: req.user.businessName,
      pan: req.user.pan,
    };
    const { rawText, structured } = await processReceipt(imagePath, userContext, receiptType);

    // Extract date_bs and determine fiscalYear / nepaliMonth
    let dateBS = structured.date_bs || "";
    const parsedDate = structured.date ? new Date(structured.date) : null;
    if (!dateBS && parsedDate) {
      dateBS = estimateBSFromAD(parsedDate);
    }
    const { fiscalYear, nepaliMonth } = parseBSDate(dateBS);

    // Map Gemini output to our Mongoose schema
    const receiptData = {
      userId: req.user._id,
      partyName: structured.party_name || "",
      partyPAN: structured.party_pan || null,
      invoiceNumber: structured.invoice_number || null,
      date: parsedDate,
      dateBS,
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
      transactionType: structured.transaction_type || "domestic",
      fiscalYear: fiscalYear || "",
      nepaliMonth: nepaliMonth || null,
      confidence: structured.confidence || "low",
      notes: structured.notes || [],
      imagePath: req.file.filename, // store just the filename, not full path
      rawText,
    };

    // PAN validation if extracted
    let panValidation = null;
    if (receiptData.partyPAN) {
      panValidation = validatePAN(receiptData.partyPAN);
    }

    // Assign a temporary ID for the frontend to use during review
    receiptData._id = "temp-" + Date.now() + "-" + Math.random().toString(36).substr(2, 5);

    res.status(200).json({
      message: "Receipt extracted successfully",
      receipt: receiptData,
      panValidation,
    });
  } catch (error) {
    console.error("[Upload Error]", error);
    res.status(500).json({ error: "Failed to process receipt image", details: error.message });
  }
});

// ============================================================
// POST /api/receipts — Save an extracted receipt after review
// ============================================================
router.post("/", auth, async (req, res) => {
  try {
    const data = req.body;
    // ensure userId is correct
    data.userId = req.user._id;
    // remove the temporary id so Mongo generates a real ObjectId
    if (data._id && data._id.startsWith("temp-")) {
      delete data._id;
    }

    const receipt = new Receipt(data);
    await receipt.save();

    let panValidation = null;
    if (receipt.partyPAN) {
      panValidation = validatePAN(receipt.partyPAN);
    }

    res.status(201).json({ message: "Receipt saved successfully", receipt, panValidation });
  } catch (error) {
    console.error("[Save Error]", error);
    res.status(500).json({ error: "Failed to save receipt", details: error.message });
  }
});

// ============================================================
// GET /api/receipts — List all receipts (with optional filters)
// ============================================================
router.get("/", auth, async (req, res) => {
  try {
    const { type, month, year, limit = 50, page = 1 } = req.query;
    const filter = { userId: req.user._id };

    if (type) filter.type = type;

    if (month && year) {
      const prefix = `${year}-${String(month).padStart(2, "0")}`;
      filter.dateBS = { $regex: `^${prefix}` };
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
router.get("/:id", auth, async (req, res) => {
  try {
    const receipt = await Receipt.findOne({ _id: req.params.id, userId: req.user._id });
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
router.put("/:id", auth, async (req, res) => {
  try {
    const allowedFields = [
      "partyName",
      "partyPAN",
      "invoiceNumber",
      "date",
      "dateBS",
      "items",
      "subtotal",
      "vatAmount",
      "total",
      "type",
      "transactionType",
      "confidence",
      "notes",
      "fiscalYear",
      "nepaliMonth",
    ];

    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    // Recalculate fiscalYear and nepaliMonth if dateBS changes
    if (updates.dateBS) {
      const { fiscalYear, nepaliMonth } = parseBSDate(updates.dateBS);
      updates.fiscalYear = fiscalYear;
      updates.nepaliMonth = nepaliMonth;
    } else if (updates.date && !updates.dateBS) {
      const estimatedBS = estimateBSFromAD(updates.date);
      if (estimatedBS) {
        updates.dateBS = estimatedBS;
        const { fiscalYear, nepaliMonth } = parseBSDate(estimatedBS);
        updates.fiscalYear = fiscalYear;
        updates.nepaliMonth = nepaliMonth;
      }
    }

    // Re-validate PAN if it was updated
    let panValidation = null;
    if (updates.partyPAN) {
      panValidation = validatePAN(updates.partyPAN);
    }

    const receipt = await Receipt.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
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
router.delete("/:id", auth, async (req, res) => {
  try {
    const receipt = await Receipt.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
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
router.post("/:id/validate-pan", auth, async (req, res) => {
  try {
    const receipt = await Receipt.findOne({ _id: req.params.id, userId: req.user._id });
    if (!receipt) {
      return res.status(404).json({ error: "Receipt not found" });
    }

    const pan = req.body.pan || receipt.partyPAN;
    const validation = validatePAN(pan);

    res.json({ pan, validation });
  } catch (error) {
    res.status(500).json({ error: "Failed to validate PAN", details: error.message });
  }
});

module.exports = router;
