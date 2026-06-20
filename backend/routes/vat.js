const express = require("express");
const Receipt = require("../models/Receipt");
const { auth } = require("../middleware/auth");

const router = express.Router();

// ============================================================
// GET /api/vat/summary — VAT Liability Summary
// Output VAT (sales) − Input VAT (purchases) = Net Payable
// ============================================================
router.get("/summary", auth, async (req, res) => {
  try {
    const { month, year } = req.query;

    const dateFilter = { userId: req.user._id };
    if (month && year) {
      const prefix = `${year}-${String(month).padStart(2, "0")}`;
      dateFilter.dateBS = { $regex: `^${prefix}` };
    }

    // Aggregate sales (output VAT)
    const salesAgg = await Receipt.aggregate([
      { $match: { type: "sale", ...dateFilter } },
      {
        $group: {
          _id: null,
          totalSales: { $sum: "$total" },
          totalVAT: { $sum: "$vatAmount" },
          totalSubtotal: { $sum: "$subtotal" },
          count: { $sum: 1 },
        },
      },
    ]);

    // Aggregate purchases (input VAT)
    const purchasesAgg = await Receipt.aggregate([
      { $match: { type: "purchase", ...dateFilter } },
      {
        $group: {
          _id: null,
          totalPurchases: { $sum: "$total" },
          totalVAT: { $sum: "$vatAmount" },
          totalSubtotal: { $sum: "$subtotal" },
          count: { $sum: 1 },
        },
      },
    ]);

    const sales = salesAgg[0] || {
      totalSales: 0,
      totalVAT: 0,
      totalSubtotal: 0,
      count: 0,
    };
    const purchases = purchasesAgg[0] || {
      totalPurchases: 0,
      totalVAT: 0,
      totalSubtotal: 0,
      count: 0,
    };

    const outputVAT = sales.totalVAT;
    const inputVAT = purchases.totalVAT;
    const netVAT = outputVAT - inputVAT;

    res.json({
      period: month && year ? `${year}-${String(month).padStart(2, "0")}` : "All Time",
      sales: {
        count: sales.count,
        totalAmount: sales.totalSales,
        taxableAmount: sales.totalSubtotal,
        outputVAT: sales.totalVAT,
      },
      purchases: {
        count: purchases.count,
        totalAmount: purchases.totalPurchases || 0,
        taxableAmount: purchases.totalSubtotal,
        inputVAT: purchases.totalVAT,
      },
      vatLiability: {
        outputVAT,
        inputVAT,
        netVAT,
        status: netVAT > 0 ? "payable" : netVAT < 0 ? "refundable" : "nil",
        statusLabel:
          netVAT > 0
            ? `NPR ${netVAT.toLocaleString("en-NP")} Payable to IRD`
            : netVAT < 0
              ? `NPR ${Math.abs(netVAT).toLocaleString("en-NP")} Refundable from IRD`
              : "No VAT liability",
      },
    });
  } catch (error) {
    console.error("[VAT Summary Error]", error);
    res.status(500).json({ error: "Failed to compute VAT summary", details: error.message });
  }
});

// ============================================================
// GET /api/vat/monthly-breakdown — Monthly breakdown for charts
// ============================================================
router.get("/monthly-breakdown", auth, async (req, res) => {
  try {
    const { year } = req.query;
    const y = parseInt(year) || 2081;

    const bsMonthNames = [
      "Baishakh", "Jestha", "Ashadh", "Shrawan", "Bhadra", "Ashwin",
      "Kartik", "Mangsir", "Poush", "Magh", "Falgun", "Chaitra"
    ];

    const months = [];
    for (let m = 1; m <= 12; m++) {
      const prefix = `${y}-${String(m).padStart(2, "0")}`;
      const dateFilter = { dateBS: { $regex: `^${prefix}` }, userId: req.user._id };

      const [salesAgg] = await Receipt.aggregate([
        { $match: { type: "sale", ...dateFilter } },
        {
          $group: {
            _id: null,
            totalVAT: { $sum: "$vatAmount" },
            totalAmount: { $sum: "$total" },
            count: { $sum: 1 },
          },
        },
      ]);

      const [purchasesAgg] = await Receipt.aggregate([
        { $match: { type: "purchase", ...dateFilter } },
        {
          $group: {
            _id: null,
            totalVAT: { $sum: "$vatAmount" },
            totalAmount: { $sum: "$total" },
            count: { $sum: 1 },
          },
        },
      ]);

      const outputVAT = salesAgg?.totalVAT || 0;
      const inputVAT = purchasesAgg?.totalVAT || 0;

      months.push({
        month: m,
        monthName: bsMonthNames[m - 1],
        outputVAT,
        inputVAT,
        netVAT: outputVAT - inputVAT,
        salesCount: salesAgg?.count || 0,
        purchasesCount: purchasesAgg?.count || 0,
        salesAmount: salesAgg?.totalAmount || 0,
        purchasesAmount: purchasesAgg?.totalAmount || 0,
      });
    }

    res.json({ year: y, months });
  } catch (error) {
    console.error("[Monthly Breakdown Error]", error);
    res.status(500).json({ error: "Failed to compute breakdown", details: error.message });
  }
});

module.exports = router;
