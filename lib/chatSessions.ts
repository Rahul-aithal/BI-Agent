import { env } from "./env";
import mongoClientPromise from "./mongodb";
import type { ChatMessage } from "./agent/orchestrator";

type ChatSessionDocument = {
  userEmail: string;
  sessionId: string;
  history: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
};

const COLLECTION_NAME = "chat_sessions";

async function getCollection() {
  const client = await mongoClientPromise;
  return client
    .db(env.MONGODB_DB_NAME)
    .collection<ChatSessionDocument>(COLLECTION_NAME);
}

export async function getChatHistory(userEmail: string, sessionId: string) {
  const collection = await getCollection();
  const document = await collection.findOne({
    userEmail,
    sessionId,
  });

  return document?.history ?? [];
}

export async function saveChatHistory(
  userEmail: string,
  sessionId: string,
  history: ChatMessage[],
) {
  const collection = await getCollection();
  const now = new Date();

  await collection.updateOne(
    {
      userEmail,
      sessionId,
    },
    {
      $set: {
        history,
        updatedAt: now,
      },
      $setOnInsert: {
        userEmail,
        sessionId,
        createdAt: now,
      },
    },
    {
      upsert: true,
    },
  );
}

export async function clearChatHistory(userEmail: string, sessionId: string) {
  const collection = await getCollection();
  await collection.deleteOne({
    userEmail,
    sessionId,
  });
}
