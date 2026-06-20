const express = require("express");
const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");
const ExcelJS = require("exceljs");
const { auth } = require("../middleware/auth");
const D2 = require("../models/D2");
const Receipt = require("../models/Receipt");

const router = express.Router();

router.post("/ird", auth, async (req, res) => {
  let browser;
  try {
    const { fiscalYear, month, mode } = req.body; // mode: 'manual' | 'auto'

    if (!fiscalYear || !month) {
      return res.status(400).json({ error: "fiscalYear and month are required" });
    }

    // 1. Fetch D2 record for this period
    const d2Return = await D2.findOne({
      userId: req.user._id,
      fiscalYear,
      month: parseInt(month),
    });

    if (!d2Return) {
      return res.status(404).json({ error: "D2 return not found for this period. Please calculate it first." });
    }

    // 2. Fetch all receipts to calculate detailed IRD fields
    const receipts = await Receipt.find({
      userId: req.user._id,
      fiscalYear,
      nepaliMonth: parseInt(month),
    });

    let taxableSales = 0;
    let exportSales = 0;
    let exemptSales = 0;

    let taxablePurchases = 0;
    let importPurchases = 0; // Not fully tracked yet, but we'll leave 0
    let exemptPurchases = 0;

    let totalOutputVat = 0;
    let totalInputVat = 0;

    receipts.forEach((r) => {
      if (r.type === "sale") {
        if (r.transactionType === "export") {
          exportSales += r.subtotal;
        } else if (r.transactionType === "exempt") {
          exemptSales += r.subtotal;
        } else {
          taxableSales += r.subtotal;
          totalOutputVat += r.vatAmount;
        }
      } else {
        if (r.transactionType === "exempt") {
          exemptPurchases += r.subtotal;
        } else if (r.transactionType === "import") {
          importPurchases += r.subtotal;
          totalInputVat += r.vatAmount;
        } else {
          taxablePurchases += r.subtotal;
          totalInputVat += r.vatAmount;
        }
      }
    });

    // We also need previous credit (d2Return.creditBroughtForward)
    const prevCredit = d2Return.creditBroughtForward || 0;

    // ── DIAGNOSTIC LOGGING ──
    console.log("\n╔═══════════════════════════════════════════════════════╗");
    console.log("║         IRD AUTOMATION DIAGNOSTIC LOG                ║");
    console.log("╠═══════════════════════════════════════════════════════╣");
    console.log(`║  Fiscal Year: ${fiscalYear}  |  Month: ${month}`);
    console.log(`║  Receipts found: ${receipts.length}`);
    console.log("╠───────────────────────────────────────────────────────╣");
    console.log(`║  taxableSales:     ${taxableSales}`);
    console.log(`║  exportSales:      ${exportSales}`);
    console.log(`║  exemptSales:      ${exemptSales}`);
    console.log(`║  taxablePurchases: ${taxablePurchases}`);
    console.log(`║  exemptPurchases:  ${exemptPurchases}`);
    console.log(`║  importPurchases:  ${importPurchases}`);
    console.log(`║  totalOutputVat:   ${totalOutputVat}`);
    console.log(`║  totalInputVat:    ${totalInputVat}`);
    console.log(`║  prevCredit (B/F): ${prevCredit}`);
    console.log("╚═══════════════════════════════════════════════════════╝\n");

    const allZero = taxableSales === 0 && exportSales === 0 && exemptSales === 0
      && taxablePurchases === 0 && exemptPurchases === 0
      && totalOutputVat === 0 && totalInputVat === 0 && prevCredit === 0;

    if (allZero) {
      console.warn("⚠️  ALL VALUES ARE ZERO — all fields will be filled with 0.");
    }

    // 3. Launch Playwright
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";

    // Use headless: false so the user can visually see the automation occurring!
    browser = await chromium.launch({
      headless: false,
      slowMo: 50, // slow down operations so they are visible
      args: ['--start-maximized']
    });

    const context = await browser.newContext({
      viewport: null
    });
    const page = await context.newPage();
    await page.goto(`${frontendUrl}/ird`, { waitUntil: "networkidle" });

    // 4. Fill the form using the React Automation Bridge
    // ──────────────────────────────────────────────────────────────────
    // The IRDVatForm component exposes window.__setIRDValue(key, value)
    // which directly calls React's setState. This guarantees the UI
    // visually updates because React itself owns the render cycle.
    // No DOM typing, no event simulation, no race conditions.
    // ──────────────────────────────────────────────────────────────────

    // Wait for React to mount and expose the automation bridge
    await page.waitForFunction(() => window.__irdReady === true, { timeout: 10000 });

    // Helper: set a single field with a visual delay between each
    const setField = async (key, value) => {
      const val = value != null ? value : 0;
      await page.evaluate(({ k, v }) => {
        window.__setIRDValue(k, v);
      }, { k: key, v: val.toString() });
      // Wait so the user can see the yellow highlight + value appear
      await page.waitForTimeout(800);
    };

    // ── Section 1: Sales ──
    await setField("१.१_k", taxableSales);
    await setField("१.१_d", totalOutputVat);
    await setField("१.२_k", exportSales);
    await setField("१.३_k", exemptSales);

    // ── Section 2: Purchases ──
    await setField("२.१_k", taxablePurchases);
    await setField("२.१_c", totalInputVat);
    await setField("२.३_k", exemptPurchases);

    // ── Summary Section ──
    await setField("6", prevCredit);

    // ═══════════════════════════════════════════════════════════
    // PHASE 1 PAUSE: VAT form is filled. Wait for user to review
    // and manually click "Proceed" to go to transactions page.
    // ═══════════════════════════════════════════════════════════
    console.log("⏸  PHASE 1: VAT form filled. Waiting for user to review and click Proceed...");
    
    // Wait for the user to navigate to /ird/transactions by clicking Proceed themselves
    await page.waitForURL('**/ird/transactions', { timeout: 300000 }); // 5 min timeout
    console.log("▶️  User proceeded to transactions page!");

    // Wait for the transactions React bridge to initialize
    await page.waitForFunction(() => window.__irdTxnReady === true, { timeout: 10000 });

    // ── PHASE 2: Build and upload Excel ──
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Audit Details");

    sheet.columns = [
      { header: "SNo / क्र.सं.", key: "sn" },
      { header: "PAN / प्यान", key: "pan" },
      { header: "TradeName / व्यापारको नाम", key: "tradeName" },
      { header: "TradeNameType / प्रकार", key: "tradeNameType" },
      { header: "SORP", key: "sorp" },
      { header: "TaxableAmount / करयोग्य रकम", key: "taxableAmount" },
      { header: "ExemptedAmount / छुट रकम", key: "exemptedAmount" },
      { header: "Remarks / कैफियत", key: "remarks" }
    ];

    receipts.forEach((r, index) => {
      const taxableAmount = r.items.filter((i) => i.vatApplicable).reduce((sum, i) => sum + i.amount, 0);
      const exemptAmount = r.items.filter((i) => !i.vatApplicable).reduce((sum, i) => sum + i.amount, 0);

      sheet.addRow({
        sn: index + 1,
        pan: r.partyPAN || "",
        tradeName: r.partyName || "",
        tradeNameType: "Company",
        sorp: r.type === "sale" ? "Sales" : "Purchase",
        taxableAmount: taxableAmount,
        exemptedAmount: exemptAmount,
        remarks: ""
      });
    });

    // Write to a temporary file
    const tmpDir = path.join(__dirname, "..", "tmp");
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }
    const tempExcelPath = path.join(tmpDir, `d2_auto_${req.user._id}_${Date.now()}.xlsx`);
    await workbook.xlsx.writeFile(tempExcelPath);

    console.log("📥 Auto-selecting Excel file and loading...");
    const fileInput = page.locator('.ird-excel-input');
    await fileInput.setInputFiles(tempExcelPath);
    
    await page.waitForTimeout(500);
    await page.click('#ird-load-btn');
    await page.waitForTimeout(1000);

    // Cleanup temp file
    try { fs.unlinkSync(tempExcelPath); } catch(e) {}

    // ═══════════════════════════════════════════════════════════
    // PHASE 2 PAUSE: Excel is loaded. Wait for user to review
    // and manually click "Proceed" to go to success page.
    // ═══════════════════════════════════════════════════════════
    console.log("⏸  PHASE 2: Excel loaded into transactions. Waiting for user to review and click Proceed...");

    // Wait for the user to navigate to /ird/success by clicking Proceed themselves
    await page.waitForURL('**/ird/success', { timeout: 300000 }); // 5 min timeout
    console.log("▶️  User proceeded to success page!");
    
    await page.waitForTimeout(1500);

    // Take screenshot of success
    const screenshotsDir = path.join(__dirname, "..", "uploads", "automation");
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }

    const screenshotFilename = `ird_success_${req.user._id}_${Date.now()}.png`;
    const screenshotPath = path.join(screenshotsDir, screenshotFilename);
    await page.screenshot({ path: screenshotPath, fullPage: true });

    await browser.close();

    // Mark D2 as submitted
    await D2.findOneAndUpdate(
      { userId: req.user._id, fiscalYear, month: parseInt(month) },
      { $set: { isSubmitted: true } },
      { new: true }
    );
    console.log("✅ D2 marked as submitted.");

    res.json({
      message: "IRD Automation completed successfully",
      screenshotUrl: `/uploads/automation/${screenshotFilename}`
    });

  } catch (error) {
    if (browser) await browser.close();
    console.error("[IRD Automation Error]", error);
    res.status(500).json({ error: "Failed to run IRD automation", details: error.message });
  }
});

module.exports = router;
