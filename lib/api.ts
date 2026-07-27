import { api } from "./axios";

export interface ChatRequest {
  sessionId: string;
  message: string;
}

export interface ChatResponse {
  reply: string;
}

export async function health() {
  const { data } = await api.get("/health");
  return data;
}

export async function chat(payload: ChatRequest) {
  const { data } = await api.post<ChatResponse>("/chat", payload);

  return data;
}
