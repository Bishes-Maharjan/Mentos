const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require("fs");
const path = require("path");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Step 1: Raw OCR — extract all visible text from the receipt image.
 * Uses Gemini 2.5 Flash with vision.
 */
async function extractRawText(imagePath) {
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
}

/**
 * Step 2: Structure the raw OCR text into the receipt JSON schema.
 * Text-only call — no image needed.
 */
async function structureReceiptData(rawText) {
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
      responseMimeType: "application/json",
    },
  });

  const prompt = `You are a Nepali tax document parser. Analyze the following OCR text from a Nepali business receipt or invoice and extract structured data.

Context:
- Nepal uses 13% VAT on taxable goods/services
- PAN (Permanent Account Number) is a 9-digit number
- Dates may be in BS (Bikram Sambat) Nepali calendar or AD (Gregorian) — convert to ISO format (YYYY-MM-DD) if possible. If the date is in BS format, try to convert it to AD. If you cannot convert, keep the BS date as a string.
- Amounts are in NPR (Nepali Rupees)
- "Bill No" or "Invoice No" or "बिल नं" refers to the invoice number

Extract and return valid JSON matching this exact schema:
{
  "vendor_name": "string — the business/shop name",
  "vendor_pan": "string (exactly 9 digits) or null if not found/not valid",
  "invoice_number": "string or null",
  "date": "string in YYYY-MM-DD format or null if unparseable",
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
  "confidence": "high | medium | low"
}

Rules:
- If you cannot confidently extract a field, set it to null
- If the receipt has no clear item breakdown, create a single item with the total amount
- Set confidence to "high" if most fields are clearly readable, "medium" if some fields required interpretation, "low" if major fields are missing or unclear
- vendor_pan must be exactly 9 digits if present, otherwise null
- Compute subtotal as (total - vat_amount) if not explicitly stated
- If no VAT is mentioned, set vat_amount to 0 and all items to vat_applicable: false

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
