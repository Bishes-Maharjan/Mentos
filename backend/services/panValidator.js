/**
 * PAN (Permanent Account Number) validation utilities for Nepal IRD.
 *
 * NOTE: This is FORMAT validation only — there is no public API
 * to verify PANs against the IRD registry in real-time.
 */

// Demo list of "known suspended" PANs for pitch purposes
const SUSPENDED_PANS_DEMO = new Set([
  "999999999",
  "000000000",
  "123456789",
  "111111111",
]);

/**
 * Validates the format of a Nepal PAN.
 * @param {string} pan
 * @returns {{ valid: boolean, message: string, suspended?: boolean }}
 */
function validatePAN(pan) {
  if (!pan || typeof pan !== "string") {
    return { valid: false, message: "PAN is empty or not provided" };
  }

  const cleaned = pan.trim();

  if (!/^\d{9}$/.test(cleaned)) {
    return {
      valid: false,
      message: `PAN must be exactly 9 digits. Got "${cleaned}" (${cleaned.length} chars)`,
    };
  }

  // Check against demo suspended list
  if (SUSPENDED_PANS_DEMO.has(cleaned)) {
    return {
      valid: true,
      suspended: true,
      message:
        "PAN format is valid but appears in suspended list (DEMO DATA — not a live IRD check)",
    };
  }

  return {
    valid: true,
    suspended: false,
    message: "PAN format is valid (format check only — not verified with IRD)",
  };
}

module.exports = { validatePAN, SUSPENDED_PANS_DEMO };
