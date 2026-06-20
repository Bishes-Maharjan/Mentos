const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require("fs");
const path = require("path");

// Support multiple API keys (comma-separated in GEMINI_API_KEYS) or single GEMINI_API_KEY
const getApiKeys = () => {
  const keysEnv = process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || "";
  return keysEnv.split(",").map(k => k.trim()).filter(k => k.length > 0);
};

let currentKeyIndex = 0;

/**
 * Wrapper to execute a Gemini call. If a quota/rate-limit error occurs,
 * it catches the error, swaps to the next API key, and continues trying
 * until it exhausts all available keys.
 */
async function withKeyRotation(actionFn) {
  const keys = getApiKeys();
  if (keys.length === 0) {
    throw new Error("No Gemini API keys configured in environment.");
  }

  let lastError;

  for (let attempt = 0; attempt < keys.length; attempt++) {
    try {
      const activeKey = keys[currentKeyIndex];
      const genAI = new GoogleGenerativeAI(activeKey);
      
      // Attempt the call with the current key
      return await actionFn(genAI);
      
    } catch (error) {
      lastError = error;
      const keySnippet = keys[currentKeyIndex].slice(-4);
      console.error(`[Gemini] Error with key ending in ...${keySnippet}: ${error.message}`);
      
      // Check if it's a rate limit or quota error
      const isRateLimit = error.status === 429 
        || error.message.includes("429") 
        || error.message.includes("quota")
        || error.message.includes("exhausted")
        || error.message.includes("limit");

      if (isRateLimit) {
        console.log(`[Gemini] Hit rate limit/quota. Swapping to next API key...`);
        // Rotate to the next key and 'continue' the loop
        currentKeyIndex = (currentKeyIndex + 1) % keys.length;
        continue;
      }
      
      // If it's not a rate limit error (e.g. bad prompt, validation error), throw immediately
      throw error;
    }
  }

  throw new Error(`All ${keys.length} Gemini API keys failed (Rate Limit). Last error: ${lastError.message}`);
}

/**
 * Step 1: Raw OCR — extract all visible text from the receipt image.
 * Uses Gemini 2.5 Flash with vision.
 */
async function extractRawText(imagePath) {
  return await withKeyRotation(async (genAI) => {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString("base64");

    const ext = path.extname(imagePath).toLowerCase();
    const mimeMap = {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".webp": "image/webp",
    };
    const mimeType = mimeMap[ext] || "image/jpeg";

    const prompt = `You are an OCR system. Extract ALL visible text from this receipt/invoice image exactly as it appears.
Include every line of text you can see — headers, item descriptions, quantities, prices, totals, dates, PAN numbers, invoice numbers, tax breakdowns, etc.
Preserve the original layout structure as much as possible using line breaks.
Do NOT interpret, summarize, or restructure the text. Just transcribe everything you see.
If any text is in Devanagari (Nepali), transliterate it to English alongside the original.`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Image,
          mimeType,
        },
      },
    ]);

    const response = await result.response;
    return response.text();
  });
}

/**
 * Step 2: Structure the raw OCR text into the receipt JSON schema.
 * Text-only call — no image needed.
 */
async function structureReceiptData(rawText) {
  return await withKeyRotation(async (genAI) => {
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
      },
    });

    // Read rules for invoice compliance
    let rulesData = "{}";
    let rulesData2 = "{}";
    try {
      rulesData = fs.readFileSync(path.join(__dirname, "../data/rules.json"), "utf8");
      rulesData2 = fs.readFileSync(path.join(__dirname, "../data/rules2.json"), "utf8");
    } catch (err) {
      console.error("[Gemini] Could not read rules.json", err);
    }

    const prompt = `You are a Nepali tax document parser and auditor. Analyze the following OCR text from a Nepali business receipt or invoice and extract structured data.
Additionally, you MUST audit the invoice against the provided "Nepal Tax Invoice Audit Rules" and list any violations in the "notes" array.

Context:
- Nepal uses 13% VAT on taxable goods/services
- PAN (Permanent Account Number) is a 9-digit number
- Dates may be in BS (Bikram Sambat) Nepali calendar or AD (Gregorian).
- For "date", convert the date to AD Gregorian YYYY-MM-DD format if possible.
- For "date_bs", extract the Nepali Bikram Sambat date (e.g. 2080-03-15 or 2081/01/12) exactly as it appears or as a normalized YYYY-MM-DD string.
- Amounts are in NPR (Nepali Rupees)
- "Bill No" or "Invoice No" or "बिल नं" refers to the invoice number
- If vatAmount is 0 on a sales invoice, classify transactionType as "export".

Audit Rules Context1 (JSON):
${rulesData}
Audit Rules Context2 (JSON):
${rulesData2}

Extract and return valid JSON matching this exact schema:
{
  "party_name": "string — the counterparty business/shop name (the seller for purchase receipts, the buyer for sales invoices)",
  "party_pan": "string (exactly 9 digits) or null if not found/not valid",
  "invoice_number": "string or null",
  "date": "string in YYYY-MM-DD format (AD) or null if unparseable",
  "date_bs": "string in YYYY-MM-DD format (BS) or null if not found",
  "items": [
    {
      "description": "string — item name/description",
      "quantity": "number (default 1 if not specified)",
      "unit_price": "number",
      "amount": "number — total for this line item",
      "vat_applicable": "boolean — true if VAT was charged on this item"
    }
  ],
  "subtotal": "number — amount before VAT, or null",
  "vat_amount": "number — the VAT/tax amount, or 0 if no VAT found",
  "total": "number — final total amount",
  "transaction_type": "domestic | export | exempt | import",
  "confidence": "high | medium | low",
  "notes": ["string — list of compliance violations found based on the provided Audit Rules. If the invoice violates a rule (e.g., missing 'Tax Invoice' text, missing exactly 9-digit PAN, etc.), explain what is wrong here."]
}

Rules:
- If you cannot confidently extract a field, set it to null
- If the receipt has no clear item breakdown, create a single item with the total amount
- Set confidence to "high" if most fields are clearly readable, "medium" if some fields required interpretation, "low" if major fields are missing or unclear
- party_pan must be exactly 9 digits if present, otherwise null
- Compute subtotal as (total - vat_amount) if not explicitly stated
- If no VAT is mentioned, set vat_amount to 0 and all items to vat_applicable: false
- Determine transaction_type: default is "domestic". Set to "exempt" if no VAT is applicable, "import" if from outside Nepal, or "export" if sent outside Nepal.
- In "notes", carefully evaluate the raw OCR text against the Audit Rules. Include clear, concise explanations of any rule violations found. If no violations exist, return an empty array.

OCR Text:
---
${rawText}
---

Return ONLY the JSON object, no markdown formatting.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    try {
      return JSON.parse(text);
    } catch (parseError) {
      // Try to extract JSON from potential markdown code blocks
      const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1].trim());
      }
      throw new Error(`Failed to parse Gemini response as JSON: ${text.substring(0, 200)}`);
    }
  });
}

/**
 * Full pipeline: image → raw text → structured JSON
 */
async function processReceipt(imagePath) {
  console.log(`[Gemini] Step 1: Extracting raw text from ${imagePath}`);
  const rawText = await extractRawText(imagePath);
  console.log(`[Gemini] Raw text extracted (${rawText.length} chars)`);

  console.log(`[Gemini] Step 2: Structuring receipt data`);
  const structured = await structureReceiptData(rawText);
  console.log(`[Gemini] Structured data extracted, confidence: ${structured.confidence}`);

  return { rawText, structured };
}

module.exports = {
  extractRawText,
  structureReceiptData,
  processReceipt,
};
