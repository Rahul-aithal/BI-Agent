import {
  GoogleGenerativeAI,
  Content,
  Part,
  FunctionDeclaration,
} from "@google/generative-ai";
import { SYSTEM_PROMPT } from "./systemPrompt";
import {
  GEMINI_TOOL_DEFINITIONS,
  executeTool,
  MondayDataService,
} from "./tools";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

// NOTE: swapped from Claude to Gemini temporarily (no API billing access during
// dev/exam period) - see DECISION_LOG.md. Production intent is Claude Sonnet;
// swap this file + tools.ts back to restore that.
const MODEL = "gemini-3.6-flash";
const MAX_TOOL_ROUNDS = 6; // safety cap so a confused loop can't run forever

export class Agent {
  private genAI: GoogleGenerativeAI;
  private dataService: MondayDataService;

  constructor(geminiApiKey: string, dataService: MondayDataService) {
    this.genAI = new GoogleGenerativeAI(geminiApiKey);
    this.dataService = dataService;
  }

  /**
   * Runs one full turn of the agent: sends the conversation to Gemini,
   * executes any function calls it makes against monday.com, feeds results
   * back, and repeats until Gemini produces a final text answer.
   */
  async respond(history: ChatMessage[]): Promise<string> {
    const model = this.genAI.getGenerativeModel({
      model: MODEL,
      systemInstruction: SYSTEM_PROMPT,
      tools: [
        {
          functionDeclarations:
            GEMINI_TOOL_DEFINITIONS as FunctionDeclaration[],
        },
      ],
    });

    // Gemini has no separate "tool_result" role - function responses go in
    // as a "user" turn, same as Anthropic's tool_result-in-user-message shape.
    const contents: Content[] = history.map((m) => ({
      role: m.role === "user" ? "user" : "model",
      parts: [{ text: m.content }],
    }));

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      let result;
      try {
        result = await model.generateContent({ contents });
      } catch (err: any) {
        return `I hit an error calling the Gemini API: ${err?.message ?? String(err)}. Please check GEMINI_API_KEY and try again.`;
      }

      const response = result.response;
      const functionCalls = response.functionCalls();

      if (!functionCalls || functionCalls.length === 0) {
        return response
          .text()
          .replace(/\r\n/g, "\n")
          .replace(/[ \t]+$/gm, "")
          .replace(/\n{3,}/g, "\n\n")
          .trim();
      }

      // ✅ FIX: Push the raw model response content object directly into history.
      // This preserves the required `thought_signature` and candidate metadata.
      const candidateContent = response.candidates?.[0]?.content;
      if (candidateContent) {
        contents.push(candidateContent);
      } else {
        const modelParts: Part[] = functionCalls.map((fc) => ({
          functionCall: {
            name: fc.name,
            args: fc.args as Record<string, unknown>,
          },
        }));
        contents.push({ role: "model", parts: modelParts });
      }

      // Execute each requested tool call and collect the responses
      const responseParts: Part[] = [];
      for (const fc of functionCalls) {
        let resultPayload: unknown;
        try {
          resultPayload = await executeTool(
            fc.name,
            (fc.args as Record<string, unknown>) ?? {},
            this.dataService,
          );
        } catch (err: any) {
          resultPayload = {
            error: true,
            message: `Tool "${fc.name}" failed: ${err?.message ?? String(err)}`,
          };
        }
        responseParts.push({
          functionResponse: {
            name: fc.name,
            response: { result: resultPayload },
          },
        });
      }
      contents.push({ role: "user", parts: responseParts });
    }

    return "I wasn't able to settle on an answer within the allowed number of tool calls - try narrowing the question a bit.";
  }
}
