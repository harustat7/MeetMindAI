"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ChatMessage = {
  role: "USER" | "ASSISTANT";
  content: string;
  citations?: Array<{
    source: "meeting" | "knowledge";
    title: string;
    content: string;
    score: number;
  }>;
};

export function MeetingChat({ meetingId }: { meetingId: string }) {
  const [sessionId, setSessionId] = useState<string>();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function sendMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = message.trim();
    if (!content) return;

    setMessage("");
    setLoading(true);
    setMessages((current) => [...current, { role: "USER", content }]);

    let data: any;
    let response: Response;
    try {
      response = await fetch(`/api/meetings/${meetingId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: content, sessionId })
      });
      data = await response.json();
    } catch {
      setMessages((current) => [...current, { role: "ASSISTANT", content: "The AI chat request could not be completed." }]);
      setLoading(false);
      return;
    }

    if (!response.ok) {
      setMessages((current) => [...current, { role: "ASSISTANT", content: data.error ?? "The AI chat request failed." }]);
      setLoading(false);
      return;
    }

    if (data.sessionId) setSessionId(data.sessionId);
    setMessages((current) => [
      ...current,
      { role: "ASSISTANT", content: data.message?.content ?? "No answer returned.", citations: data.citations ?? [] }
    ]);
    setLoading(false);
  }

  return (
    <div className="space-y-3">
      <div className="max-h-[360px] space-y-3 overflow-y-auto rounded-md border bg-background p-3">
        {messages.length === 0 ? (
          <p className="text-sm text-muted-foreground">Ask about decisions, action owners, risks, or related knowledge.</p>
        ) : (
          messages.map((item, index) => (
            <div key={`${item.role}-${index}`} className={item.role === "USER" ? "text-right" : "text-left"}>
              <div className="inline-block max-w-[92%] rounded-md border bg-muted px-3 py-2 text-sm leading-6 text-foreground">
                <p className="whitespace-pre-wrap">{item.content}</p>
                {item.citations?.length ? (
                  <div className="mt-3 space-y-2 border-t pt-2 text-left">
                    {item.citations.slice(0, 3).map((citation, citationIndex) => (
                      <div key={`${citation.title}-${citationIndex}`} className="text-xs leading-5 text-muted-foreground">
                        <span className="font-medium text-foreground">[{citationIndex + 1}] {citation.title}</span>
                        <span> - {citation.source}, {Math.round(citation.score * 100)}%</span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>
      <form onSubmit={sendMessage} className="flex gap-2">
        <Input value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Ask this meeting..." />
        <Button type="submit" size="icon" aria-label="Send message" disabled={loading}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
