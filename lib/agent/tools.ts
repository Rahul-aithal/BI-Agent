import { SchemaType } from "@google/generative-ai";
import { MondayClient } from "../monday/client";
import {
  cleanDeals,
  cleanWorkOrders,
  CleanDeal,
  CleanWorkOrder,
} from "../monday/boards";
import { CleaningIssue } from "./dataCleaning";

/**
 * In-memory cache of cleaned board data, refreshed on a TTL.
 * We deliberately do NOT cache forever - monday.com is the live source
 * of truth (per the assignment: "do not hardcode CSV data... query
 * monday.com dynamically"). A short TTL keeps the agent responsive
 * without hammering the API on every single chat turn.
 */
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface Cache {
  deals: {
    records: CleanDeal[];
    issues: CleaningIssue[];
    fetchedAt: number;
  } | null;
  workOrders: {
    records: CleanWorkOrder[];
    issues: CleaningIssue[];
    fetchedAt: number;
  } | null;
}

const cache: Cache = { deals: null, workOrders: null };

export class MondayDataService {
  private client: MondayClient;
  private dealsBoardId: string;
  private workOrdersBoardId: string;

  constructor(token: string, dealsBoardId: string, workOrdersBoardId: string) {
    this.client = new MondayClient(token);
    this.dealsBoardId = dealsBoardId;
    this.workOrdersBoardId = workOrdersBoardId;
  }

  async getDeals(
    forceRefresh = false,
  ): Promise<{ records: CleanDeal[]; issues: CleaningIssue[] }> {
    if (
      !forceRefresh &&
      cache.deals &&
      Date.now() - cache.deals.fetchedAt < CACHE_TTL_MS
    ) {
      return cache.deals;
    }
    const items = await this.client.getAllItems(this.dealsBoardId);
    const { records, issues } = cleanDeals(items);
    cache.deals = { records, issues, fetchedAt: Date.now() };
    return cache.deals;
  }

  async getWorkOrders(
    forceRefresh = false,
  ): Promise<{ records: CleanWorkOrder[]; issues: CleaningIssue[] }> {
    if (
      !forceRefresh &&
      cache.workOrders &&
      Date.now() - cache.workOrders.fetchedAt < CACHE_TTL_MS
    ) {
      return cache.workOrders;
    }
    const items = await this.client.getAllItems(this.workOrdersBoardId);
    const { records, issues } = cleanWorkOrders(items);
    cache.workOrders = { records, issues, fetchedAt: Date.now() };
    return cache.workOrders;
  }
}

/**
 * Tool schemas exposed to Gemini, in functionDeclarations format
 * (SchemaType.OBJECT / SchemaType.STRING etc. instead of Anthropic's
 * plain JSON-Schema "type": "object" strings). Kept deliberately small
 * in number - two data-fetch tools plus a data-quality tool - because
 * the agent's real job is reasoning over the returned JSON, not calling
 * dozens of narrow endpoints.
 */
export const GEMINI_TOOL_DEFINITIONS = [
  {
    name: "get_deals",
    description:
      "Fetch all records from the Deals (sales pipeline) board on monday.com, cleaned and normalized. " +
      "Returns every deal with fields: itemId, itemName (pseudonymized, not unique), ownerCode, clientCode, " +
      "dealStatus (Open/On Hold/Dead), tentativeCloseDate, closureProbability (High/Medium/Low), dealValue (numeric, INR), " +
      "dealStage (funnel stage e.g. 'E. Proposal/Commercials Sent'), productDeal, sector, createdDate. " +
      "Use this for any question about pipeline, revenue forecast, deal stages, sectors, sales performance, or owners.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {},
    },
  },
  {
    name: "get_work_orders",
    description:
      "Fetch all records from the Work Orders (project execution) board on monday.com, cleaned and normalized. " +
      "Returns every work order with fields: itemId, itemName, customerCode, natureOfWork, executionStatus, poDate, " +
      "probableStartDate, probableEndDate, ownerCode, sector, typeOfWork, amountExclGst, amountInclGst, billedValueInclGst, " +
      "collectedAmountInclGst, amountReceivable, invoiceStatus, woStatus (Open/Closed), billingStatus, quantityPO, quantityPOUnit. " +
      "Use this for any question about executed projects, billing, collections, receivables, or operational status.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {},
    },
  },
  {
    name: "get_data_quality_report",
    description:
      "Get a summary of data quality issues (missing values, unparseable fields, corrupted rows, etc.) found while " +
      "cleaning the Deals and/or Work Orders boards. Use this when the user asks about data quality, or when you need " +
      "to caveat an answer because relevant fields had missing/bad data.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        board: {
          type: SchemaType.STRING,
          enum: ["deals", "work_orders", "both"],
          description: "Which board's issues to report",
        },
      },
      required: ["board"],
    },
  },
];

export async function executeTool(
  toolName: string,
  toolInput: Record<string, unknown>,
  dataService: MondayDataService,
): Promise<unknown> {
  switch (toolName) {
    case "get_deals": {
      const { records } = await dataService.getDeals();
      return { count: records.length, records };
    }
    case "get_work_orders": {
      const { records } = await dataService.getWorkOrders();
      return { count: records.length, records };
    }
    case "get_data_quality_report": {
      const board = (toolInput.board as string) ?? "both";
      const result: Record<string, unknown> = {};
      if (board === "deals" || board === "both") {
        const { issues, records } = await dataService.getDeals();
        result.deals = {
          totalRecords: records.length,
          totalIssues: issues.length,
          issues: issues.slice(0, 50),
        };
      }
      if (board === "work_orders" || board === "both") {
        const { issues, records } = await dataService.getWorkOrders();
        result.workOrders = {
          totalRecords: records.length,
          totalIssues: issues.length,
          issues: issues.slice(0, 50),
        };
      }
      return result;
    }
    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}
