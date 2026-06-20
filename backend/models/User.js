const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    businessName: { type: String, required: true },
    ownerName: { type: String, default: "" },
    pan: {
      type: String,
      required: true,
      unique: true,
      match: [/^\d{9}$/, "PAN must be 9 digits"],
    },
    address: { type: String, default: "" },
    municipality: { type: String, default: "" },
    district: { type: String, default: "" },
    province: { type: Number, default: null }, // 1-7
    phone: { type: String, default: "", unique: true },
    email: { type: String, default: "", unique: true },
    vatRegistered: { type: Boolean, default: true },
    isNewBusiness: { type: Boolean, default: true },
    fiscalYearStart: { type: String, default: "" }, // e.g. "2081"
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
