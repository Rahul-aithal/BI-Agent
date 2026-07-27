import { Agent } from "./orchestrator";
import { MondayDataService } from "./tools";
import { env } from "../env";

const monday = new MondayDataService(
  env.MONDAY_API_TOKEN,
  env.DEALS_BOARD_ID,
  env.WORK_ORDERS_BOARD_ID,
);

export const agent = new Agent(env.GEMINI_API_KEY, monday);
