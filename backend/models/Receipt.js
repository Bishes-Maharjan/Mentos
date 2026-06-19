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
    vendorName: { type: String, default: "" },
    vendorPAN: { type: String, default: null },
    invoiceNumber: { type: String, default: null },
    date: { type: Date, default: null },
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
