const mongoose = require("mongoose");

const d2Schema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    fiscalYear: { type: String, required: true },    // e.g. "2081/82"
    month: { type: Number, required: true },          // 1-12 (Baishakh to Chaitra)
    totalSales: { type: Number, default: 0 },
    totalPurchases: { type: Number, default: 0 },
    outputVAT: { type: Number, default: 0 },          // from Annex 10
    inputVAT: { type: Number, default: 0 },           // from Annex 13
    creditBroughtForward: { type: Number, default: 0 }, // from last month's D2
    netVATPayable: { type: Number, default: 0 },       // can be negative (refundable/credit)
    isSubmitted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("D2", d2Schema);
