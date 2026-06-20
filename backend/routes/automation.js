const express = require("express");
const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");
const { auth } = require("../middleware/auth");
const D2 = require("../models/D2");
const Receipt = require("../models/Receipt");

const router = express.Router();

router.post("/ird", auth, async (req, res) => {
  let browser;
  try {
    const { fiscalYear, month } = req.body;

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
    // 1.1 Taxable Sales → karobar (transaction value)
    await setField("१.१_k", taxableSales);
    // 1.1 Taxable Sales → bikriDebit (tax debit on sales)
    await setField("१.१_d", totalOutputVat);

    // 1.2 Exports → karobar
    await setField("१.२_k", exportSales);

    // 1.3 Exempt Sales → karobar
    await setField("१.३_k", exemptSales);

    // ── Section 2: Purchases ──
    // 2.1 Taxable Purchases → karobar
    await setField("२.१_k", taxablePurchases);
    // 2.1 Taxable Purchases → kharidCredit (tax credit on purchases)
    await setField("२.१_c", totalInputVat);

    // 2.3 Exempt Purchases → karobar
    await setField("२.३_k", exemptPurchases);

    // ── Summary Section ──
    // 6. Previous month credit brought forward
    await setField("6", prevCredit);

    // Give it a moment for the user to see the filled values
    await page.waitForTimeout(2000);

    // Proceed to next page (IRD Transactions)
    await page.click('button.ird-btn--primary');
    
    // Wait for the next page to load and the new React bridge to initialize
    await page.waitForTimeout(1000);
    await page.waitForFunction(() => window.__irdTxnReady === true, { timeout: 10000 });

    // 5. Fill Transactions Page visually line by line
    const setTxnField = async (index, key, value) => {
      if (value == null) return;
      await page.evaluate(({ i, k, v }) => {
        window.__setIRDTxnValue(i, k, v);
      }, { i: index, k: key, v: value.toString() });
      await page.waitForTimeout(500); // Visual delay
    };

    const addTxnRow = async () => {
      await page.evaluate(() => window.__addIRDTxnRow());
      await page.waitForTimeout(400);
    };

    // As per user instructions:
    // 1. PAN and Trade Name come from logged-in user details
    // 2. Taxable amount = (output tax - input tax) - credit carry forward
    const userPan = req.user.pan || "";
    const userTradeName = req.user.businessName || "";
    const calculatedTaxableAmount = (totalOutputVat - totalInputVat) - prevCredit;

    // Fill exactly ONE row with the consolidated calculation
    await setTxnField(0, "pan", userPan);
    await setTxnField(0, "tradeName", userTradeName);
    await setTxnField(0, "tradeNameType", "Company");
    await setTxnField(0, "sorp", "S"); // Default to Sales
    await setTxnField(0, "taxableAmount", calculatedTaxableAmount);

    // ── PAUSE AUTOMATION FOR MANUAL ENTRY ──
    console.log("⏸  Pausing automation for manual user review/entry...");
    await page.evaluate(() => window.pauseForManualEntry());
    console.log("▶️  Automation resumed by user!");
    
    await page.waitForTimeout(500);

    // Next page has "Proceed" button again to success
    if (await page.locator('.ird-actions--between .ird-btn--primary').count() > 0) {
      await page.click('.ird-actions--between .ird-btn--primary');
    }
    
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
