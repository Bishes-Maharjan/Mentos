const express = require("express");
const ExcelJS = require("exceljs");
const Receipt = require("../models/Receipt");
const { auth } = require("../middleware/auth");

const router = express.Router();

/**
 * Build a date range filter for a given month/year.
 */
function buildDateFilter(month, year) {
  if (!month || !year) return {};
  const prefix = `${year}-${String(month).padStart(2, "0")}`;
  return { dateBS: { $regex: `^${prefix}` } };
}

/**
 * Format receipts into IRD Annex rows.
 * Annex 10 (Sales Register) and Annex 13 (Purchase Register)
 * share a similar column structure.
 */
function formatAnnexRows(receipts) {
  return receipts.map((r, index) => {
    const taxableAmount = r.items
      .filter((i) => i.vatApplicable)
      .reduce((sum, i) => sum + i.amount, 0);

    const exemptAmount = r.items
      .filter((i) => !i.vatApplicable)
      .reduce((sum, i) => sum + i.amount, 0);

    return {
      sn: index + 1,
      buyerSellerName: r.partyName || "N/A",
      pan: r.partyPAN || "N/A",
      invoiceNumber: r.invoiceNumber || "N/A",
      date: r.dateBS || "N/A",
      totalSalesAmount: r.total || 0,
      taxableAmount,
      vatAmount: r.vatAmount || 0,
      exemptAmount,
      exportAmount: 0, // Not applicable for MVP
      receiptId: r._id,
      transactionType: r.transactionType || 'domestic',
      exportAmount: r.exportAmount || 0,
    };
  });
}

// ============================================================
// GET /api/annex/sales — Annex 10 (Sales Register)
// ============================================================
router.get("/sales", auth, async (req, res) => {
  try {
    const { month, year } = req.query;
    const dateFilter = buildDateFilter(month, year);
    const receipts = await Receipt.find({ type: "sale", userId: req.user._id, ...dateFilter }).sort({ date: 1 });
    const rows = formatAnnexRows(receipts);

    // Compute totals
    const totals = rows.reduce(
      (acc, row) => ({
        totalSalesAmount: acc.totalSalesAmount + row.totalSalesAmount,
        taxableAmount: acc.taxableAmount + row.taxableAmount,
        vatAmount: acc.vatAmount + row.vatAmount,
        exemptAmount: acc.exemptAmount + row.exemptAmount,
        exportAmount: acc.exportAmount + row.exportAmount,
      }),
      { totalSalesAmount: 0, taxableAmount: 0, vatAmount: 0, exemptAmount: 0, exportAmount: 0 }
    );

    res.json({
      annex: "10",
      title: "Sales Register (Annex 10 / अनुसूची १०)",
      period: month && year ? `${year}-${String(month).padStart(2, "0")}` : "All",
      rows,
      totals,
      count: rows.length,
    });
  } catch (error) {
    console.error("[Annex Sales Error]", error);
    res.status(500).json({ error: "Failed to generate Annex 10", details: error.message });
  }
});

// ============================================================
// GET /api/annex/purchases — Annex 13 (Purchase Register)
// ============================================================
router.get("/purchases", auth, async (req, res) => {
  try {
    const { month, year } = req.query;
    const dateFilter = buildDateFilter(month, year);
    const receipts = await Receipt.find({ type: "purchase", userId: req.user._id, ...dateFilter }).sort({ date: 1 });
    const rows = formatAnnexRows(receipts);

    const totals = rows.reduce(
      (acc, row) => ({
        totalSalesAmount: acc.totalSalesAmount + row.totalSalesAmount,
        taxableAmount: acc.taxableAmount + row.taxableAmount,
        vatAmount: acc.vatAmount + row.vatAmount,
        exemptAmount: acc.exemptAmount + row.exemptAmount,
      }),
      { totalSalesAmount: 0, taxableAmount: 0, vatAmount: 0, exemptAmount: 0 }
    );

    res.json({
      annex: "13",
      title: "Purchase Register (Annex 13 / अनुसूची १३)",
      period: month && year ? `${year}-${String(month).padStart(2, "0")}` : "All",
      rows,
      totals,
      count: rows.length,
    });
  } catch (error) {
    console.error("[Annex Purchases Error]", error);
    res.status(500).json({ error: "Failed to generate Annex 13", details: error.message });
  }
});

// ============================================================
// GET /api/annex/export/:type — Download Annex as Excel (.xlsx)
// type = "sales" | "purchases"
// ============================================================
router.get("/export/:type", auth, async (req, res) => {
  try {
    const { type } = req.params;
    const { month, year } = req.query;

    if (!["sales", "purchases"].includes(type)) {
      return res.status(400).json({ error: 'Type must be "sales" or "purchases"' });
    }

    const receiptType = type === "sales" ? "sale" : "purchase";
    const annexNumber = type === "sales" ? "10" : "13";
    const dateFilter = buildDateFilter(month, year);

    const receipts = await Receipt.find({ type: receiptType, userId: req.user._id, ...dateFilter }).sort({ date: 1 });
    const rows = formatAnnexRows(receipts);

    // Build Excel workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Kaji.ai";
    workbook.created = new Date();

    const sheet = workbook.addWorksheet(`Annex ${annexNumber}`);

    // IRD-style column headers
    sheet.columns = [
      { header: "S.N.", key: "sn", width: 6 },
      { header: "Buyer/Seller Name\n(खरिदकर्ता/विक्रेताको नाम)", key: "buyerSellerName", width: 30 },
      { header: "PAN\n(स्थायी लेखा नं.)", key: "pan", width: 15 },
      { header: "Invoice No.\n(बिजक नं.)", key: "invoiceNumber", width: 15 },
      { header: "Date\n(मिति)", key: "date", width: 14 },
      { header: "Total Amount\n(कुल बिक्री/खरिद रकम)", key: "totalSalesAmount", width: 18 },
      { header: "Taxable Amount\n(कर योग्य रकम)", key: "taxableAmount", width: 18 },
      { header: "VAT Amount\n(मूअकर रकम)", key: "vatAmount", width: 15 },
      { header: "Exempt Amount\n(कर छुट रकम)", key: "exemptAmount", width: 15 },
      { header: "Export Amount\n(निर्यात रकम)", key: "exportAmount", width: 15 }
    ];

    // Style header row
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, size: 10 };
    headerRow.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    headerRow.height = 40;
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

    // Add data rows
    rows.forEach((row) => {
      const dataRow = sheet.addRow({
        sn: row.sn,
        buyerSellerName: row.buyerSellerName,
        pan: row.pan,
        invoiceNumber: row.invoiceNumber,
        date: row.date,
        totalSalesAmount: row.totalSalesAmount,
        taxableAmount: row.taxableAmount,
        vatAmount: row.vatAmount,
        exemptAmount: row.exemptAmount,
        exportAmount: row.exportAmount
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
    const totals = rows.reduce(
      (acc, row) => ({
        totalSalesAmount: acc.totalSalesAmount + row.totalSalesAmount,
        taxableAmount: acc.taxableAmount + row.taxableAmount,
        vatAmount: acc.vatAmount + row.vatAmount,
        exemptAmount: acc.exemptAmount + row.exemptAmount,
        exportAmount: acc.exportAmount + row.exportAmount,
      }),
      { totalSalesAmount: 0, taxableAmount: 0, vatAmount: 0, exemptAmount: 0, exportAmount: 0 }
    );

    const totalRow = sheet.addRow({
      sn: "",
      buyerSellerName: "TOTAL",
      pan: "",
      invoiceNumber: "",
      date: "",
      totalSalesAmount: totals.totalSalesAmount,
      taxableAmount: totals.taxableAmount,
      vatAmount: totals.vatAmount,
      exemptAmount: totals.exemptAmount,
      exportAmount: totals.exportAmount,
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
    ["totalSalesAmount", "taxableAmount", "vatAmount", "exemptAmount", "exportAmount"].forEach((key) => {
      const col = sheet.getColumn(key);
      col.numFmt = "#,##0.00";
    });

    // Send as download
    const period = month && year ? `${year}-${String(month).padStart(2, "0")}` : "all";
    const filename = `Annex_${annexNumber}_${period}.xlsx`;

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("[Excel Export Error]", error);
    res.status(500).json({ error: "Failed to export Excel", details: error.message });
  }
});

module.exports = router;
