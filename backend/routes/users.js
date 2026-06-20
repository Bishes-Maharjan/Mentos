const express = require("express");
const User = require("../models/User");
const D2 = require("../models/D2");
const { signToken } = require("../middleware/auth");

const router = express.Router();
const SUSPENDED_PANS_DEMO = new Set([
  "999999999",
  "000000000",
  "123456789",
  "111111111",
]);
// ============================================================
// POST /api/users/register — Register a new business user
// ============================================================
// Body:
//   - businessName (required)
//   - pan (required, 9 digits)
//   - ownerName, address, municipality, district, province, phone, email
//   - vatRegistered (boolean, defaults true)
//   - isNewBusiness (boolean, defaults true)
//   - If isNewBusiness is false, also send:
//       latestD2.fiscalYear  (e.g. "2081/82")
//       latestD2.month       (1-12)
//       latestD2.totalSales
//       latestD2.totalPurchases
//       latestD2.outputVAT
//       latestD2.inputVAT
//       latestD2.creditBroughtForward
//       latestD2.netVATPayable
// ============================================================
router.post("/register", async (req, res) => {
  try {
    const {
      businessName,
      ownerName,
      pan,
      address,
      municipality,
      district,
      province,
      phone,
      email,
      vatRegistered,
      isNewBusiness,
      fiscalYearStart,
      latestD2,
    } = req.body;

    // --- Validation ---
    if (!businessName || !pan) {
      return res.status(400).json({ error: "businessName and pan are required" });
    }

    if (!address) {
      return res.status(400).json({ error: "Address is required" });
    }

    if (!/^\d{9}$/.test(pan)) {
      return res.status(400).json({ error: "PAN must be exactly 9 digits" });
    }
    if (SUSPENDED_PANS_DEMO.has(pan)) {
      return res.status(400).json({ error: "Invalid PAN Format" })
    }

    if (!phone && !email) {
      return res.status(400).json({ error: "At least one of phone or email is required" });
    }

    if (phone && !/^\d{10}$/.test(phone)) {
      return res.status(400).json({ error: "Phone number must be exactly 10 digits" });
    }

    if (email && !/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ error: "Invalid email address format" });
    }

    // Check if PAN already registered
    const existing = await User.findOne({ pan });
    if (existing) {
      return res.status(409).json({ error: "A business with this PAN is already registered" });
    }

    // Existing business must provide latest D2 data
    const newBusiness = isNewBusiness !== false; // default true
    if (!newBusiness) {
      if (!latestD2 || !latestD2.fiscalYear || !latestD2.month) {
        return res.status(400).json({
          error: "Existing businesses must provide latestD2 with at least fiscalYear and month",
        });
      }
    }

    // --- Create user ---
    const user = new User({
      businessName,
      ownerName: ownerName || "",
      pan,
      address,
      municipality: municipality || "",
      district: district || "",
      province: province || null,
      vatRegistered: vatRegistered !== false,
      isNewBusiness: newBusiness,
      fiscalYearStart: fiscalYearStart || "",
    });

    if (phone) user.phone = phone;
    if (email) user.email = email;

    await user.save();

    // --- If existing business, seed a D2 record with their carry-forward ---
    let d2Record = null;
    if (!newBusiness && latestD2) {
      d2Record = new D2({
        userId: user._id,
        fiscalYear: latestD2.fiscalYear,
        month: parseInt(latestD2.month),
        totalSales: latestD2.totalSales || 0,
        totalPurchases: latestD2.totalPurchases || 0,
        outputVAT: latestD2.outputVAT || 0,
        inputVAT: latestD2.inputVAT || 0,
        creditBroughtForward: latestD2.creditBroughtForward || 0,
        netVATPayable: latestD2.netVATPayable || 0,
        isSubmitted: true, // they've already filed this — it's historical
      });
      await d2Record.save();
    }

    const token = signToken(user._id);

    res.status(201).json({
      message: "Registration successful",
      token,
      user,
      d2: d2Record,
    });
  } catch (error) {
    console.error("[Register Error]", error);
    if (error.code === 11000) {
      return res.status(409).json({ error: "A business with this PAN is already registered" });
    }
    res.status(500).json({ error: "Registration failed", details: error.message });
  }
});

// ============================================================
// POST /api/users/login — Login with (email or phone) + PAN
// ============================================================
// Body:
//   - pan (required, 9 digits)
//   - email OR phone (at least one required)
// ============================================================
router.post("/login", async (req, res) => {
  try {
    const { pan, email, phone } = req.body;

    if (!pan) {
      return res.status(400).json({ error: "PAN is required" });
    }

    if (!email && !phone) {
      return res.status(400).json({ error: "Email or phone is required" });
    }

    // Build query: PAN must match + at least one contact field must match
    const query = { pan };
    if (email && phone) {
      query.$or = [{ email }, { phone }];
    } else if (email) {
      query.email = email;
    } else {
      query.phone = phone;
    }

    const user = await User.findOne(query);
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials. No matching PAN + contact found." });
    }

    // Fetch their latest D2 record (if any)
    const latestD2 = await D2.findOne({ userId: user._id }).sort({ fiscalYear: -1, month: -1 });

    const token = signToken(user._id);

    res.json({
      message: "Login successful",
      token,
      user,
      latestD2: latestD2 || null,
    });
  } catch (error) {
    console.error("[Login Error]", error);
    res.status(500).json({ error: "Login failed", details: error.message });
  }
});

// ============================================================
// GET /api/users — List all users
// ============================================================
router.get("/", async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch users", details: error.message });
  }
});

// ============================================================
// GET /api/users/:id — Get a single user
// ============================================================
router.get("/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch user", details: error.message });
  }
});

// ============================================================
// PUT /api/users/:id — Update user info
// ============================================================
router.put("/:id", async (req, res) => {
  try {
    const allowedFields = [
      "businessName",
      "ownerName",
      "address",
      "municipality",
      "district",
      "province",
      "phone",
      "email",
      "vatRegistered",
      "fiscalYearStart",
    ];

    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ message: "User updated", user });
  } catch (error) {
    res.status(500).json({ error: "Failed to update user", details: error.message });
  }
});

// ============================================================
// DELETE /api/users/:id — Delete a user
// ============================================================
router.delete("/:id", async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json({ message: "User deleted" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete user", details: error.message });
  }
});

module.exports = router;
