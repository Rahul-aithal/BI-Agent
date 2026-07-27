import { api } from "./axios";

export async function health() {
  const { data } = await api.get("/health");
  return data;
}

export async function chat(payload: { message: string; sessionId: string }) {
  const { data } = await api.post("/chat", payload);
  return data;
}
