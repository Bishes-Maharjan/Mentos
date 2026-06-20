const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

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
    address: {
      type: String,
      required: [true, "Address is required"],
      minlength: [3, "Address must be at least 3 characters long"]
    },
    municipality: { type: String, default: "" },
    district: { type: String, default: "" },
    province: { type: Number, default: null }, // 1-7
    phone: {
      type: String,
      match: [/^\d{10}$/, "Phone number must be 10 digits"],
      unique: true,
      sparse: true
    },
    email: {
      type: String,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email address"],
      unique: true,
      sparse: true
    },
    vatRegistered: { type: Boolean, default: true },
    isNewBusiness: { type: Boolean, default: true },
    fiscalYearStart: { type: String, default: "" }, // e.g. "2081"
    password: { 
      type: String, 
      required: true,
      minlength: 6,
      select: false 
    },
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
