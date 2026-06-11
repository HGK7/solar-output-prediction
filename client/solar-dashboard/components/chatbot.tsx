"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  MessageCircle,
  Sparkles,
  SendHorizontal,
  Loader2,
  WifiOff,
} from "lucide-react";
import { ChatMessage } from "@/components/chat-message";
import { askQuestion, RAGUnavailableError } from "@/lib/api";
import type { ChatMessage as ChatMessageType } from "@/types";

const SUGGESTED_QUESTIONS = [
  "How does humidity affect solar panel output?",
  "What payback period is typical for rooftop solar?",
  "How much does panel efficiency degrade per year?",
  "Why does temperature reduce panel efficiency?",
];

interface ChatbotProps {
  /** Short summary of the user's current analysis (location, prediction, config). */
  siteContext?: string;
}

export function Chatbot({ siteContext }: ChatbotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [ragOffline, setRagOffline] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, isLoading]);

  const sendQuestion = useCallback(
    async (question: string) => {
      const trimmed = question.trim();
      if (!trimmed || isLoading) return;

      setInput("");
      setMessages((prev) => [
        ...prev,
        {
          id: `user-${Date.now()}`,
          role: "user",
          content: trimmed,
          timestamp: new Date(),
        },
      ]);
      setIsLoading(true);

      try {
        const response = await askQuestion(trimmed, siteContext);
        setRagOffline(false);
        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            role: "assistant",
            content: response.answer,
            citations: response.is_refusal ? [] : response.citations,
            timestamp: new Date(),
          },
        ]);
      } catch (err) {
        if (err instanceof RAGUnavailableError) {
          setRagOffline(true);
        } else {
          setMessages((prev) => [
            ...prev,
            {
              id: `assistant-${Date.now()}`,
              role: "assistant",
              content:
                "Something went wrong answering that. Please try again.",
              timestamp: new Date(),
            },
          ]);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, siteContext],
  );

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          size="lg"
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-amber-400 hover:bg-amber-500 text-foreground shadow-lg shadow-amber-200/50 z-50"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:w-105 p-0 flex flex-col">
        <SheetHeader className="px-4 pt-4 pb-3 border-b border-white/30">
          <SheetTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-5 w-5 text-amber-400" />
            Solar Knowledge Assistant
          </SheetTitle>
        </SheetHeader>

        {ragOffline ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6 text-center">
            <div className="h-16 w-16 rounded-2xl bg-slate-100/60 flex items-center justify-center">
              <WifiOff className="h-8 w-8 text-slate-400" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-foreground">
                Knowledge Base Offline
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
                The grounded Q&amp;A service is not available on this
                deployment. Predictions and analysis still work normally.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRagOffline(false)}
            >
              Try again
            </Button>
          </div>
        ) : (
          <>
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
            >
              {messages.length === 0 && (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Ask anything about solar energy — answers are grounded in
                    the indexed knowledge base with citations you can open.
                  </p>
                  <div className="flex flex-col gap-2">
                    {SUGGESTED_QUESTIONS.map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => sendQuestion(q)}
                        className="text-left text-xs rounded-xl border border-amber-200/60 bg-amber-50/50 px-3 py-2 text-amber-800 hover:bg-amber-100/60 transition-colors"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((message) => (
                <ChatMessage key={message.id} message={message} />
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="rounded-2xl rounded-bl-md bg-white/70 backdrop-blur-sm border border-white/40 px-4 py-2.5">
                    <Loader2 className="h-4 w-4 animate-spin text-amber-500" />
                  </div>
                </div>
              )}
            </div>

            <form
              className="border-t border-white/30 p-3 flex items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                sendQuestion(input);
              }}
            >
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about solar energy…"
                maxLength={1000}
                disabled={isLoading}
                className="flex-1"
              />
              <Button
                type="submit"
                size="icon"
                disabled={isLoading || !input.trim()}
                className="bg-amber-400 hover:bg-amber-500 text-foreground shrink-0"
              >
                <SendHorizontal className="h-4 w-4" />
              </Button>
            </form>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
