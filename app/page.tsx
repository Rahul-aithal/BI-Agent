"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { chat, health } from "@/lib/api";

type Message = {
  id: string;
  role: "user" | "agent";
  content: string;
};

const suggestions = [
  "How's our pipeline looking for the Mining sector right now?",
  "Which deals are stuck in negotiation the longest?",
  "Summarize outstanding receivables across work orders, by sector.",
  "Prepare a leadership update on this quarter's pipeline health and any data quality caveats.",
];

export default function HomePage() {
  const sessionId = useMemo(() => crypto.randomUUID(), []);

  const bottomRef = useRef<HTMLDivElement>(null);

  const [input, setInput] = useState("");

  const [messages, setMessages] = useState<Message[]>([]);

  const { isLoading: healthLoading, isError: healthError } = useQuery({
    queryKey: ["health"],
    queryFn: health,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const mutation = useMutation({
    mutationFn: chat,

    onSuccess(data) {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "agent",
          content: data.reply,
        },
      ]);
    },

    onError() {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "agent",
          content: "Network error reaching the agent. Please try again.",
        },
      ]);
    },
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, mutation.isPending]);

  async function send(text?: string) {
    const message = (text ?? input).trim();

    if (!message) return;

    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        role: "user",
        content: message,
      },
    ]);

    setInput("");

    mutation.mutate({
      sessionId,
      message,
    });
  }

  return (
    <div className="flex h-screen flex-col bg-[#0e1512] text-[#e8ede9]">
      <header className="border-b border-[#223028] px-7 py-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-end gap-4">
            <div className="rounded border border-orange-700 px-2 py-1 font-mono text-xs tracking-[0.15em] text-orange-400">
              SDPL / BI
            </div>

            <div>
              <h1 className="text-xl font-semibold">Skylark BI Agent</h1>

              <p className="mt-1 text-sm text-[#8fa39a]">
                Founder-level answers from the Deals & Work Orders boards
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-[#8fa39a]">
            <div
              className={`h-2 w-2 rounded-full ${
                healthLoading
                  ? "bg-gray-500"
                  : healthError
                    ? "bg-red-500"
                    : "bg-green-500"
              }`}
            />

            {healthLoading
              ? "checking connection..."
              : healthError
                ? "connection issue"
                : "connected to monday.com"}
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-4xl flex-col gap-6 px-6 py-8">
          {messages.length === 0 && (
            <div className="mt-10">
              <p className="leading-7 text-[#8fa39a]">
                Ask anything about pipeline, revenue, sectors, execution status
                or billing — pulled live from monday.com.
              </p>

              <div className="mt-8 space-y-3">
                {suggestions.map((question) => (
                  <button
                    key={question}
                    onClick={() => send(question)}
                    className="block w-full rounded-lg border border-[#223028] bg-[#131c18] px-4 py-3 text-left text-sm transition hover:border-orange-600 hover:bg-[#172018]"
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[85%] ${
                  message.role === "user"
                    ? "rounded-xl border border-[#223028] bg-[#1c2b23]"
                    : "rounded-xl border border-[#223028] bg-[#17211c]"
                }`}
              >
                {message.role === "agent" && (
                  <div className="px-4 pt-3 font-mono text-[11px] tracking-widest text-orange-400">
                    BI AGENT
                  </div>
                )}

                <div className="markdown w-fit! ">
                  {message.role === "agent" ? (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {message.content}
                    </ReactMarkdown>
                  ) : (
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  )}
                </div>
              </div>
            </div>
          ))}

          {mutation.isPending && (
            <div className="flex">
              <div className="rounded-xl border border-[#223028] bg-[#17211c] px-5 py-4">
                <div className="mb-2 font-mono text-[11px] tracking-widest text-orange-400">
                  BI AGENT
                </div>

                <div className="flex gap-2">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:150ms]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:300ms]" />
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </main>
      <footer className="border-t border-[#223028] bg-[#0e1512] px-5 py-5">
        <div className="mx-auto flex max-w-4xl items-end gap-3">
          <textarea
            rows={1}
            value={input}
            placeholder="Ask a business question... (Shift + Enter for newline)"
            disabled={mutation.isPending}
            onChange={(e) => {
              setInput(e.target.value);

              e.currentTarget.style.height = "auto";
              e.currentTarget.style.height = `${Math.min(
                e.currentTarget.scrollHeight,
                140,
              )}px`;
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            className="
              max-h-[140px]
              min-h-[48px]
              flex-1
              resize-none
              rounded-xl
              border
              border-[#223028]
              bg-[#131c18]
              px-4
              py-3
              text-sm
              outline-none
              transition
              placeholder:text-[#8fa39a]
              focus:border-orange-500
            "
          />

          <button
            disabled={mutation.isPending || !input.trim()}
            onClick={() => send()}
            className="
              h-12
              rounded-xl
              bg-orange-500
              px-6
              font-semibold
              text-black
              transition
              hover:bg-orange-400
              disabled:cursor-not-allowed
              disabled:bg-neutral-700
              disabled:text-neutral-400
            "
          >
            {mutation.isPending ? "Sending..." : "Ask"}
          </button>
        </div>
      </footer>
    </div>
  );
}
