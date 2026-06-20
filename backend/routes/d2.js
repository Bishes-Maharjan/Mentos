const express = require("express");
const Receipt = require("../models/Receipt");
const D2 = require("../models/D2");
const User = require("../models/User");
const { auth } = require("../middleware/auth");
const { estimateBSFromAD, parseBSDate } = require("../utils/dateUtils");

const router = express.Router();

// Helper: Get previous month (Nepali fiscal flow) and fiscal year
function getPreviousMonthAndFY(currentMonth, currentFY) {
  if (currentMonth === 4) { // Shrawan
    // Go to Ashad (3) of previous fiscal year
    const parts = currentFY.split("/");
    const startYear = parseInt(parts[0]);
    if (isNaN(startYear)) return { month: 3, fiscalYear: "" };
    const prevStartYear = startYear - 1;
    const prevEndYearShort = startYear % 100;
    const prevFY = `${prevStartYear}/${prevEndYearShort.toString().padStart(2, "0")}`;
    return { month: 3, fiscalYear: prevFY };
  }
  
  let prevMonth;
  if (currentMonth === 1) { // Baishakh
    prevMonth = 12; // Chaitra
  } else {
    prevMonth = currentMonth - 1;
  }
  return { month: prevMonth, fiscalYear: currentFY };
}

// ============================================================
// GET /api/d2 — List all D2 records
// ============================================================
router.get("/", auth, async (req, res) => {
  try {
    const { fiscalYear } = req.query;
    const filter = { userId: req.user._id };
    if (fiscalYear) {
      filter.fiscalYear = fiscalYear;
    }
    const returns = await D2.find(filter).sort({ fiscalYear: -1, month: -1 });
    res.json(returns);
  } catch (error) {
    console.error("[D2 List Error]", error);
    res.status(500).json({ error: "Failed to fetch D2 returns", details: error.message });
  }
});

// ============================================================
// POST /api/d2/calculate — Calculate or recalculate D2 for a month
// ============================================================
router.post("/calculate", auth, async (req, res) => {
  try {
    const { fiscalYear, month } = req.body;

    if (!fiscalYear || !month) {
      return res.status(400).json({ error: "fiscalYear and month are required" });
    }

    const monthNum = parseInt(month);
    if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      return res.status(400).json({ error: "month must be a number between 1 and 12" });
    }

    // 1. Query all receipts for this fiscal year and nepali month
    const receipts = await Receipt.find({
      userId: req.user._id,
      fiscalYear,
      nepaliMonth: monthNum,
    });

    let totalSales = 0;
    let totalPurchases = 0;
    let outputVAT = 0;
    let inputVAT = 0;

    receipts.forEach((receipt) => {
      if (receipt.type === "sale") {
        totalSales += receipt.total || 0;
        outputVAT += receipt.vatAmount || 0;
      } else {
        totalPurchases += receipt.total || 0;
        inputVAT += receipt.vatAmount || 0;
      }
    });

    // 2. Query previous month's D2 to get carry-forward credit
    const prev = getPreviousMonthAndFY(monthNum, fiscalYear);
    let creditBroughtForward = 0;

    if (prev.fiscalYear) {
      const prevD2 = await D2.findOne({
        userId: req.user._id,
        fiscalYear: prev.fiscalYear,
        month: prev.month,
      });

      if (prevD2 && prevD2.netVATPayable < 0) {
        // Carry forward the negative net VAT payable (which is credit) as positive
        creditBroughtForward = Math.abs(prevD2.netVATPayable);
      }
    }

    // 3. Compute net VAT payable
    const netVATPayable = outputVAT - inputVAT - creditBroughtForward;

    // 4. Upsert/save D2 record
    const updatedD2 = await D2.findOneAndUpdate(
      { userId: req.user._id, fiscalYear, month: monthNum },
      {
        $set: {
          totalSales,
          totalPurchases,
          outputVAT,
          inputVAT,
          creditBroughtForward,
          netVATPayable,
        },
      },
      { new: true, upsert: true, runValidators: true }
    );

    res.json({
      message: "D2 calculation completed",
      d2: updatedD2,
      receiptsCount: receipts.length,
    });
  } catch (error) {
    console.error("[D2 Calculate Error]", error);
    res.status(500).json({ error: "Failed to calculate D2 return", details: error.message });
  }
});

// ============================================================
// POST /api/d2/cron/calculate — Automated monthly D2 calculation
// ============================================================
router.post("/cron/calculate", async (req, res) => {
  try {
    const cronSecret = req.headers["x-cron-secret"];
    // In production, require CRON_SECRET. If missing, fail.
    if (!cronSecret || cronSecret !== process.env.CRON_SECRET) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // 1. Determine current BS date
    const currentAdDate = new Date();
    const currentBsStr = estimateBSFromAD(currentAdDate);
    const { fiscalYear: currentFY, nepaliMonth: currentMonth } = parseBSDate(currentBsStr);

    if (!currentFY || !currentMonth) {
      return res.status(500).json({ error: "Failed to determine current BS date" });
    }

    // 2. The cron runs for the *past* month
    const target = getPreviousMonthAndFY(currentMonth, currentFY);
    const targetFY = target.fiscalYear;
    const targetMonth = target.month;

    // 3. Get all users
    const users = await User.find({}, "_id");

    let processedCount = 0;

    for (const user of users) {
      const userId = user._id;

      // Query receipts for this user in the target month
      const receipts = await Receipt.find({
        userId,
        fiscalYear: targetFY,
        nepaliMonth: targetMonth,
      });

      let totalSales = 0;
      let totalPurchases = 0;
      let outputVAT = 0;
      let inputVAT = 0;

      receipts.forEach((r) => {
        if (r.type === "sale") {
          totalSales += r.total || 0;
          outputVAT += r.vatAmount || 0;
        } else {
          totalPurchases += r.total || 0;
          inputVAT += r.vatAmount || 0;
        }
      });

      // Query previous month's D2 for carry-forward credit
      const prev = getPreviousMonthAndFY(targetMonth, targetFY);
      let creditBroughtForward = 0;

      if (prev.fiscalYear) {
        const prevD2 = await D2.findOne({
          userId,
          fiscalYear: prev.fiscalYear,
          month: prev.month,
        });

        if (prevD2 && prevD2.netVATPayable < 0) {
          creditBroughtForward = Math.abs(prevD2.netVATPayable);
        }
      }

      const netVATPayable = outputVAT - inputVAT - creditBroughtForward;

      await D2.findOneAndUpdate(
        { userId, fiscalYear: targetFY, month: targetMonth },
        {
          $set: {
            totalSales,
            totalPurchases,
            outputVAT,
            inputVAT,
            creditBroughtForward,
            netVATPayable,
          },
        },
        { new: true, upsert: true, runValidators: true }
      );
      processedCount++;
    }

    res.json({
      message: "Cron D2 calculation completed",
      targetPeriod: { fiscalYear: targetFY, month: targetMonth },
      usersProcessed: processedCount,
    });
  } catch (error) {
    console.error("[D2 Cron Error]", error);
    res.status(500).json({ error: "Failed to run D2 cron", details: error.message });
  }
});

// ============================================================
// POST /api/d2/:id/submit — Submit a D2 return
// ============================================================
router.post("/:id/submit", auth, async (req, res) => {
  try {
    const returnDoc = await D2.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { $set: { isSubmitted: true } },
      { new: true }
    );

    if (!returnDoc) {
      return res.status(404).json({ error: "D2 return record not found" });
    }

    res.json({ message: "D2 return marked as submitted", d2: returnDoc });
  } catch (error) {
    console.error("[D2 Submit Error]", error);
    res.status(500).json({ error: "Failed to submit D2 return", details: error.message });
  }
});

// ============================================================
// DELETE /api/d2/:id — Delete a D2 record
// ============================================================
router.delete("/:id", auth, async (req, res) => {
  try {
    const returnDoc = await D2.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!returnDoc) {
      return res.status(404).json({ error: "D2 return record not found" });
    }
    res.json({ message: "D2 return deleted" });
  } catch (error) {
    console.error("[D2 Delete Error]", error);
    res.status(500).json({ error: "Failed to delete D2 return", details: error.message });
  }
});

module.exports = router;
