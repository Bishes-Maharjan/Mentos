const express = require("express");
const Receipt = require("../models/Receipt");

const router = express.Router();

// ============================================================
// GET /api/vat/summary — VAT Liability Summary
// Output VAT (sales) − Input VAT (purchases) = Net Payable
// ============================================================
router.get("/summary", async (req, res) => {
  try {
    const { month, year } = req.query;

    const dateFilter = {};
    if (month && year) {
      const m = parseInt(month);
      const y = parseInt(year);
      const startDate = new Date(y, m - 1, 1);
      const endDate = new Date(y, m, 0, 23, 59, 59, 999);
      dateFilter.date = { $gte: startDate, $lte: endDate };
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
router.get("/monthly-breakdown", async (req, res) => {
  try {
    const { year } = req.query;
    const y = parseInt(year) || new Date().getFullYear();

    const months = [];
    for (let m = 1; m <= 12; m++) {
      const startDate = new Date(y, m - 1, 1);
      const endDate = new Date(y, m, 0, 23, 59, 59, 999);
      const dateFilter = { date: { $gte: startDate, $lte: endDate } };

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
        monthName: new Date(y, m - 1).toLocaleString("en", { month: "short" }),
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
