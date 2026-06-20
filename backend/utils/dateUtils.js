// Helper: Estimate BS date from Gregorian/AD date (rough approximation)
function estimateBSFromAD(adDate) {
  if (!adDate) return "";
  const d = new Date(adDate);
  if (isNaN(d.getTime())) return "";
  const adYear = d.getFullYear();
  const adMonth = d.getMonth() + 1; // 1-12
  const adDay = d.getDate();

  let bsYear = adYear + 57;
  let bsMonth = 1;
  let bsDay = adDay;

  if (adMonth === 1) {
    if (adDay < 15) { bsYear = adYear + 56; bsMonth = 9; }
    else { bsYear = adYear + 56; bsMonth = 10; }
  } else if (adMonth === 2) {
    if (adDay < 13) { bsYear = adYear + 56; bsMonth = 10; }
    else { bsYear = adYear + 56; bsMonth = 11; }
  } else if (adMonth === 3) {
    if (adDay < 14) { bsYear = adYear + 56; bsMonth = 11; }
    else { bsYear = adYear + 56; bsMonth = 12; }
  } else if (adMonth === 4) {
    if (adDay < 14) { bsYear = adYear + 56; bsMonth = 12; }
    else { bsYear = adYear + 57; bsMonth = 1; }
  } else if (adMonth === 5) {
    if (adDay < 15) { bsYear = adYear + 57; bsMonth = 1; }
    else { bsYear = adYear + 57; bsMonth = 2; }
  } else if (adMonth === 6) {
    if (adDay < 15) { bsYear = adYear + 57; bsMonth = 2; }
    else { bsYear = adYear + 57; bsMonth = 3; }
  } else if (adMonth === 7) {
    if (adDay < 16) { bsYear = adYear + 57; bsMonth = 3; }
    else { bsYear = adYear + 57; bsMonth = 4; }
  } else if (adMonth === 8) {
    if (adDay < 17) { bsYear = adYear + 57; bsMonth = 4; }
    else { bsYear = adYear + 57; bsMonth = 5; }
  } else if (adMonth === 9) {
    if (adDay < 17) { bsYear = adYear + 57; bsMonth = 5; }
    else { bsYear = adYear + 57; bsMonth = 6; }
  } else if (adMonth === 10) {
    if (adDay < 17) { bsYear = adYear + 57; bsMonth = 6; }
    else { bsYear = adYear + 57; bsMonth = 7; }
  } else if (adMonth === 11) {
    if (adDay < 16) { bsYear = adYear + 57; bsMonth = 7; }
    else { bsYear = adYear + 57; bsMonth = 8; }
  } else if (adMonth === 12) {
    if (adDay < 16) { bsYear = adYear + 57; bsMonth = 8; }
    else { bsYear = adYear + 57; bsMonth = 9; }
  }

  return `${bsYear}-${bsMonth.toString().padStart(2, "0")}-${bsDay.toString().padStart(2, "0")}`;
}

// Helper: Parse BS date YYYY-MM-DD to extract fiscal year and nepali month
function parseBSDate(dateBSStr) {
  if (!dateBSStr) return { fiscalYear: "", nepaliMonth: null };
  const parts = dateBSStr.split(/[-/]/);
  if (parts.length < 2) return { fiscalYear: "", nepaliMonth: null };
  const year = parseInt(parts[0]);
  const month = parseInt(parts[1]);
  if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
    return { fiscalYear: "", nepaliMonth: null };
  }

  // Nepal fiscal year runs Shrawan (month 4) to Ashad (month 3)
  let fiscalYear = "";
  if (month >= 4) {
    const nextYearShort = (year + 1) % 100;
    fiscalYear = `${year}/${nextYearShort.toString().padStart(2, "0")}`;
  } else {
    const prevYear = year - 1;
    const currentYearShort = year % 100;
    fiscalYear = `${prevYear}/${currentYearShort.toString().padStart(2, "0")}`;
  }
  return { fiscalYear, nepaliMonth: month };
}

module.exports = { estimateBSFromAD, parseBSDate };
