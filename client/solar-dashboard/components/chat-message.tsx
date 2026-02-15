"use client";

import { Badge } from "@/components/ui/badge";
import { BookOpen } from "lucide-react";
import type { ChatMessage as ChatMessageType } from "@/types";

interface ChatMessageProps {
  message: ChatMessageType;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          isUser
            ? "bg-amber-400/90 text-foreground rounded-br-md"
            : "bg-white/70 backdrop-blur-sm border border-white/40 text-foreground/80 rounded-bl-md"
        }`}
      >
        <p className="whitespace-pre-wrap">{message.content}</p>

        {/* Citations */}
        {message.citations && message.citations.length > 0 && (
          <div className="mt-2 pt-2 border-t border-white/30 flex flex-wrap gap-1">
            {message.citations.map((citation, i) => (
              <Badge
                key={i}
                variant="outline"
                className="text-[10px] bg-sky-50/50 text-sky-600 border-sky-200/50 gap-1"
              >
                <BookOpen className="h-2.5 w-2.5" />
                {citation.source}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
