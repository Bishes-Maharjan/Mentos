const mongoose = require("mongoose");

const itemSchema = new mongoose.Schema(
  {
    description: { type: String, default: "" },
    quantity: { type: Number, default: 1 },
    unitPrice: { type: Number, default: 0 },
    amount: { type: Number, default: 0 },
    vatApplicable: { type: Boolean, default: true },
  },
  { _id: false }
);

const receiptSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    // Counterparty info — vendor for purchases, buyer for sales
    partyName: { type: String, default: "" },
    partyPAN: {
      type: String,
      match: [/^\d{9}$/, "PAN must be 9 digits"],
      default: null,
    },
    invoiceNumber: { type: String, default: null },
    date: { type: Date, default: null },
    dateBS: { type: String, default: "" }, // Bikram Sambat date string e.g. "2081-02-15"
    items: { type: [itemSchema], default: [] },
    subtotal: { type: Number, default: 0 },
    vatAmount: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    type: {
      type: String,
      enum: ["sale", "purchase"],
      required: true,
      default: "purchase",
    },
    transactionType: {
      type: String,
      enum: ["domestic", "export", "exempt", "import"],
      default: "domestic",
    },
    fiscalYear: { type: String, default: "" },    // e.g. "2081/82"
    nepaliMonth: { type: Number, default: null },  // 1-12 (Baishakh to Chaitra)
    notes: [{ type: String }],
    confidence: {
      type: String,
      enum: ["high", "medium", "low"],
      default: "low",
    },
    imagePath: { type: String, default: "" },
    rawText: { type: String, default: "" }, // Store raw OCR text for debugging
  },
  {
    timestamps: true, // adds createdAt and updatedAt
  }
);

// Virtual: compute taxable amount (sum of items where VAT is applicable)
receiptSchema.virtual("taxableAmount").get(function () {
  return this.items
    .filter((item) => item.vatApplicable)
    .reduce((sum, item) => sum + item.amount, 0);
});

// Virtual: compute exempt amount (sum of items where VAT is NOT applicable)
receiptSchema.virtual("exemptAmount").get(function () {
  return this.items
    .filter((item) => !item.vatApplicable)
    .reduce((sum, item) => sum + item.amount, 0);
});

// Ensure virtuals are included in JSON output
receiptSchema.set("toJSON", { virtuals: true });
receiptSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("Receipt", receiptSchema);
