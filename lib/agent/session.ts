import type { ChatMessage } from "./orchestrator";

export const sessions = new Map<string, ChatMessage[]>();
