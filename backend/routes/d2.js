const express = require("express");
const ExcelJS = require("exceljs");
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
// GET /api/d2/:id — Get D2 return detail with ledger info
// ============================================================
router.get("/:id", auth, async (req, res) => {
  try {
    const d2 = await D2.findOne({ _id: req.params.id, userId: req.user._id });
    if (!d2) {
      return res.status(404).json({ error: "D2 return record not found" });
    }

    // Query all sales and purchases for the given period to build the ledgers
    const sales = await Receipt.find({
      userId: req.user._id,
      fiscalYear: d2.fiscalYear,
      nepaliMonth: d2.month,
      type: "sale"
    }).sort({ date: 1 });

    const purchases = await Receipt.find({
      userId: req.user._id,
      fiscalYear: d2.fiscalYear,
      nepaliMonth: d2.month,
      type: "purchase"
    }).sort({ date: 1 });

    res.json({
      d2,
      sales,
      purchases
    });
  } catch (error) {
    console.error("[D2 Detail Error]", error);
    res.status(500).json({ error: "Failed to fetch D2 detail", details: error.message });
  }
});

// ============================================================
// GET /api/d2/:id/export — Export D2 return audit details to Excel
// ============================================================
router.get("/:id/export", auth, async (req, res) => {
  try {
    const d2 = await D2.findOne({ _id: req.params.id, userId: req.user._id });
    if (!d2) {
      return res.status(404).json({ error: "D2 return record not found" });
    }

    const receipts = await Receipt.find({
      userId: req.user._id,
      fiscalYear: d2.fiscalYear,
      nepaliMonth: d2.month
    }).sort({ date: 1 });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Kaji.ai";
    workbook.created = new Date();

    const sheet = workbook.addWorksheet("Audit Details");

    sheet.columns = [
      { header: "SNo / क्र.सं.", key: "sn", width: 10 },
      { header: "PAN / प्यान", key: "pan", width: 15 },
      { header: "TradeName / व्यापारको नाम", key: "tradeName", width: 30 },
      { header: "TradeNameType / प्रकार", key: "tradeNameType", width: 25 },
      { header: "SORP", key: "sorp", width: 15 },
      { header: "TaxableAmount / करयोग्य रकम", key: "taxableAmount", width: 25 },
      { header: "ExemptedAmount / छुट रकम", key: "exemptedAmount", width: 25 },
      { header: "Remarks / कैफियत", key: "remarks", width: 20 }
    ];

    // Style header row
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, size: 10 };
    headerRow.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    headerRow.height = 30;
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFD9E1F2" },
      };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });

    let totalTaxable = 0;
    let totalExempt = 0;

    receipts.forEach((r, index) => {
      const taxableAmount = r.items
        .filter((i) => i.vatApplicable)
        .reduce((sum, i) => sum + i.amount, 0);

      const exemptAmount = r.items
        .filter((i) => !i.vatApplicable)
        .reduce((sum, i) => sum + i.amount, 0);

      totalTaxable += taxableAmount;
      totalExempt += exemptAmount;

      const dataRow = sheet.addRow({
        sn: index + 1,
        pan: r.partyPAN || "N/A",
        tradeName: r.partyName || "N/A",
        tradeNameType: "English",
        sorp: r.type === "sale" ? "Sales" : "Purchase",
        taxableAmount: taxableAmount,
        exemptedAmount: exemptAmount,
        remarks: ""
      });

      dataRow.eachCell((cell) => {
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      });
    });

    // Add totals row
    const totalRow = sheet.addRow({
      sn: "",
      pan: "",
      tradeName: "TOTAL",
      tradeNameType: "",
      sorp: "",
      taxableAmount: totalTaxable,
      exemptedAmount: totalExempt,
      remarks: ""
    });
    totalRow.font = { bold: true };
    totalRow.eachCell((cell) => {
      cell.border = {
        top: { style: "double" },
        left: { style: "thin" },
        bottom: { style: "double" },
        right: { style: "thin" },
      };
    });

    // Format number columns
    ["taxableAmount", "exemptedAmount"].forEach((key) => {
      const col = sheet.getColumn(key);
      col.numFmt = "#,##0.00";
    });

    const filename = `D2_Audit_${d2.fiscalYear}_M${d2.month}.xlsx`.replace(/[/]/g, "-");

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("[D2 Export Error]", error);
    res.status(500).json({ error: "Failed to export Excel", details: error.message });
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
