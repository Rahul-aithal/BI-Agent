/**
 * Data cleaning / normalization layer.
 *
 * This module exists because the source data (Deals + Work Orders) is
 * real-world messy in specific, observed ways. Each function below maps
 * to a concrete pattern found in the sample data - see DECISION_LOG.md
 * for the full list. We normalize once, here, so the agent's reasoning
 * layer always works with clean, typed values and never has to guess.
 */

export interface CleaningIssue {
  itemId: string;
  itemName: string;
  field: string;
  issue: string;
  rawValue: string | null;
}

export interface CleanRecord {
  [key: string]: string | number | null;
}

/** Known sector taxonomy. Anything outside this set gets flagged, not silently dropped. */
export const KNOWN_SECTORS = [
  "mining",
  "renewables",
  "powerline",
  "railways",
  "construction",
  "security and surveillance",
  "dsp",
  "others",
];

/**
 * "Sector/service" on the Deals board sometimes contains "Tender" - a
 * deal-source/channel value, not a sector. We keep it but flag it so
 * sector-level rollups don't silently misclassify these deals.
 */
export function normalizeSector(
  raw: string | null,
  issues: CleaningIssue[],
  itemId: string,
  itemName: string,
): string {
  if (!raw || raw.trim() === "") {
    issues.push({
      itemId,
      itemName,
      field: "sector",
      issue: "missing sector",
      rawValue: raw,
    });
    return "Unknown";
  }
  const trimmed = raw.trim();
  if (
    !KNOWN_SECTORS.includes(trimmed.toLowerCase()) &&
    trimmed.toLowerCase() !== "tender"
  ) {
    issues.push({
      itemId,
      itemName,
      field: "sector",
      issue: `unrecognized sector value: "${trimmed}"`,
      rawValue: raw,
    });
  }
  if (trimmed.toLowerCase() === "tender") {
    issues.push({
      itemId,
      itemName,
      field: "sector",
      issue:
        '"Tender" appears to be a deal-source/channel, not a sector - excluded from sector rollups',
      rawValue: raw,
    });
  }
  return trimmed;
}

/**
 * Dates in the source are mostly ISO (YYYY-MM-DD) but some fields are
 * entirely blank (e.g. "Close Date (A)" on Deals) and some monday.com
 * date columns return "" instead of null. Returns null (not a fake date)
 * when unparseable so downstream math never silently includes garbage.
 */
export function normalizeDate(
  raw: string | null,
  issues: CleaningIssue[],
  itemId: string,
  itemName: string,
  field: string,
): string | null {
  if (!raw || raw.trim() === "") return null;
  const trimmed = raw.trim();
  const isoMatch = /^\d{4}-\d{2}-\d{2}/.exec(trimmed);
  if (isoMatch) return isoMatch[0];
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }
  issues.push({
    itemId,
    itemName,
    field,
    issue: `unparseable date: "${trimmed}"`,
    rawValue: raw,
  });
  return null;
}

/**
 * Currency/numeric fields sometimes contain Excel error strings like
 * "#VALUE!" or long float artifacts from masking. We coerce to number,
 * flag errors, and never throw - a single bad row must not break a
 * portfolio-wide query.
 */
export function normalizeCurrency(
  raw: string | null,
  issues: CleaningIssue[],
  itemId: string,
  itemName: string,
  field: string,
): number | null {
  if (!raw || raw.trim() === "") return null;
  const trimmed = raw.trim().replace(/,/g, "");
  if (/^#[A-Z!]+$/.test(trimmed)) {
    issues.push({
      itemId,
      itemName,
      field,
      issue: `Excel error value in numeric field: "${trimmed}"`,
      rawValue: raw,
    });
    return null;
  }
  const num = parseFloat(trimmed);
  if (isNaN(num)) {
    issues.push({
      itemId,
      itemName,
      field,
      issue: `non-numeric value in numeric field: "${trimmed}"`,
      rawValue: raw,
    });
    return null;
  }
  return num;
}

/**
 * "Quantities as per PO" and similar fields mix a number with a free-text
 * unit in the SAME cell (e.g. "5360 HA", "2 location", "45 days", "36 AU",
 * "7 mines"). We split number + unit so the number is usable for math and
 * the unit is preserved for display/context.
 */
export function parseQuantityWithUnit(
  raw: string | null,
  issues: CleaningIssue[],
  itemId: string,
  itemName: string,
  field: string,
): { value: number | null; unit: string | null } {
  if (!raw || raw.trim() === "" || raw.trim().toUpperCase() === "NA") {
    return { value: null, unit: null };
  }
  const trimmed = raw.trim();
  const match = /^([\d,.]+)\s*([A-Za-z][A-Za-z /]*)?$/.exec(trimmed);
  if (!match) {
    issues.push({
      itemId,
      itemName,
      field,
      issue: `unparseable quantity: "${trimmed}"`,
      rawValue: raw,
    });
    return { value: null, unit: null };
  }
  const value = parseFloat(match[1].replace(/,/g, ""));
  const unit = match[2] ? match[2].trim() : null;
  if (isNaN(value)) {
    issues.push({
      itemId,
      itemName,
      field,
      issue: `unparseable quantity number: "${trimmed}"`,
      rawValue: raw,
    });
    return { value: null, unit };
  }
  return { value, unit };
}

/**
 * Free-text status fields have inconsistent capitalization
 * (e.g. "BIlled" vs "Billed"). Normalize case, preserve the semantic value.
 */
export function normalizeStatusText(raw: string | null): string | null {
  if (!raw || raw.trim() === "") return null;
  const trimmed = raw.trim();
  // Title-case each word, but keep acronyms like "GST", "PO" intact if fully uppercase already
  return trimmed
    .split(/\s+/)
    .map((word) =>
      word === word.toUpperCase() && word.length <= 3
        ? word
        : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
    )
    .join(" ");
}

/**
 * Deal names in the sample data are pseudonymized (e.g. "Naruto",
 * "Sasuke") and are NOT unique per deal - the same name recurs across
 * many distinct deals for different companies. Client Code (e.g.
 * COMPANY089) is the actual stable identifier. We surface this so the
 * agent never treats "Deal Name" as a unique key.
 */
export const DEAL_IDENTITY_NOTE =
  "Deal Name values are pseudonymized labels and are NOT unique - use Client Code + Deal Stage/Created Date to distinguish individual deals.";
