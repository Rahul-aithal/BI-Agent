import { MondayItem } from "./client";
import {
  CleaningIssue,
  normalizeCurrency,
  normalizeDate,
  normalizeSector,
  normalizeStatusText,
  parseQuantityWithUnit,
} from "../agent/dataCleaning";

/**
 * monday.com returns column_values keyed by column id, each carrying
 * its own column.title. We look values up BY TITLE (not id) because
 * titles are what's documented in README.md / the board-setup guide,
 * and remain stable even if the user recreates the board and gets new
 * column ids. Titles must match what's specified in README's "Board
 * Setup" section.
 */
function byTitle(item: MondayItem): Record<string, string | null> {
  const map: Record<string, string | null> = {};
  for (const cv of item.column_values) {
    const title = cv.column?.title ?? cv.id;
    map[title] = cv.text && cv.text.trim() !== "" ? cv.text : null;
  }
  return map;
}

export interface CleanDeal {
  itemId: string;
  itemName: string; // "Deal Name" (pseudonymized, not unique)
  ownerCode: string | null;
  clientCode: string | null;
  dealStatus: string | null; // Open / On Hold / Dead
  tentativeCloseDate: string | null;
  closureProbability: string | null; // High / Medium / Low
  dealValue: number | null;
  dealStage: string | null; // funnel stage, e.g. "E. Proposal/Commercials Sent"
  productDeal: string | null;
  sector: string;
  createdDate: string | null;
}

export function cleanDeals(items: MondayItem[]): {
  records: CleanDeal[];
  issues: CleaningIssue[];
} {
  const issues: CleaningIssue[] = [];
  const records: CleanDeal[] = [];

  for (const item of items) {
    const f = byTitle(item);
    const id = item.id;
    const name = item.name || f["Deal Name"] || "(unnamed)";

    // Skip corrupted rows where a header row was accidentally imported as data
    if (
      f["Deal Status"] === "Deal Status" ||
      f["Deal Stage"] === "Deal Stage"
    ) {
      issues.push({
        itemId: id,
        itemName: name,
        field: "row",
        issue:
          "row appears to be a duplicated header row, not real data - excluded",
        rawValue: null,
      });
      continue;
    }

    records.push({
      itemId: id,
      itemName: name,
      ownerCode: f["Owner code"] ?? null,
      clientCode: f["Client Code"] ?? null,
      dealStatus: f["Deal Status"] ?? null,
      tentativeCloseDate: normalizeDate(
        f["Tentative Close Date"],
        issues,
        id,
        name,
        "Tentative Close Date",
      ),
      closureProbability: f["Closure Probability"] ?? null,
      dealValue: normalizeCurrency(
        f["Masked Deal value"],
        issues,
        id,
        name,
        "Masked Deal value",
      ),
      dealStage: f["Deal Stage"] ?? null,
      productDeal: f["Product deal"] ?? null,
      sector: normalizeSector(f["Sector/service"], issues, id, name),
      createdDate: normalizeDate(
        f["Created Date"],
        issues,
        id,
        name,
        "Created Date",
      ),
    });
  }

  return { records, issues };
}

export interface CleanWorkOrder {
  itemId: string;
  itemName: string;
  customerCode: string | null;
  serialNo: string | null;
  natureOfWork: string | null;
  executionStatus: string | null;
  poDate: string | null;
  probableStartDate: string | null;
  probableEndDate: string | null;
  ownerCode: string | null;
  sector: string;
  typeOfWork: string | null;
  amountExclGst: number | null;
  amountInclGst: number | null;
  billedValueInclGst: number | null;
  collectedAmountInclGst: number | null;
  amountReceivable: number | null;
  invoiceStatus: string | null;
  woStatus: string | null; // Open / Closed
  billingStatus: string | null;
  quantityPO: number | null;
  quantityPOUnit: string | null;
}

export function cleanWorkOrders(items: MondayItem[]): {
  records: CleanWorkOrder[];
  issues: CleaningIssue[];
} {
  const issues: CleaningIssue[] = [];
  const records: CleanWorkOrder[] = [];

  for (const item of items) {
    const f = byTitle(item);
    const id = item.id;
    const name = item.name || f["Deal name masked"] || "(unnamed)";

    const qty = parseQuantityWithUnit(
      f["Quantities as per PO"],
      issues,
      id,
      name,
      "Quantities as per PO",
    );

    records.push({
      itemId: id,
      itemName: name,
      customerCode: f["Customer Name Code"] ?? null,
      serialNo: f["Serial #"] ?? null,
      natureOfWork: f["Nature of Work"] ?? null,
      executionStatus: f["Execution Status"] ?? null,
      poDate: normalizeDate(
        f["Date of PO/LOI"],
        issues,
        id,
        name,
        "Date of PO/LOI",
      ),
      probableStartDate: normalizeDate(
        f["Probable Start Date"],
        issues,
        id,
        name,
        "Probable Start Date",
      ),
      probableEndDate: normalizeDate(
        f["Probable End Date"],
        issues,
        id,
        name,
        "Probable End Date",
      ),
      ownerCode: f["BD/KAM Personnel code"] ?? null,
      sector: normalizeSector(f["Sector"], issues, id, name),
      typeOfWork: f["Type of Work"] ?? null,
      amountExclGst: normalizeCurrency(
        f["Amount in Rupees (Excl of GST) (Masked)"],
        issues,
        id,
        name,
        "Amount (Excl GST)",
      ),
      amountInclGst: normalizeCurrency(
        f["Amount in Rupees (Incl of GST) (Masked)"],
        issues,
        id,
        name,
        "Amount (Incl GST)",
      ),
      billedValueInclGst: normalizeCurrency(
        f["Billed Value in Rupees (Incl of GST.) (Masked)"],
        issues,
        id,
        name,
        "Billed Value (Incl GST)",
      ),
      collectedAmountInclGst: normalizeCurrency(
        f["Collected Amount in Rupees (Incl of GST.) (Masked)"],
        issues,
        id,
        name,
        "Collected Amount",
      ),
      amountReceivable: normalizeCurrency(
        f["Amount Receivable (Masked)"],
        issues,
        id,
        name,
        "Amount Receivable",
      ),
      invoiceStatus: normalizeStatusText(f["Invoice Status"]),
      woStatus: f["WO Status (billed)"] ?? null,
      billingStatus: normalizeStatusText(f["Billing Status"]),
      quantityPO: qty.value,
      quantityPOUnit: qty.unit,
    });
  }

  return { records, issues };
}
