"use client";

import { useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type SearchResult = {
  source: "meeting" | "knowledge";
  id: string;
  chunkId: string;
  title: string;
  content: string;
  score: number;
};

export function SemanticSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function runSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`);
      const data = (await response.json()) as { results?: SearchResult[]; error?: string };
      if (!response.ok) {
        setError(data.error ?? "Search failed.");
        setResults([]);
      } else {
        setResults(data.results ?? []);
      }
    } catch {
      setError("Search could not reach the API.");
      setResults([]);
    }
    setLoading(false);
  }

  return (
    <div className="space-y-3">
      <form onSubmit={runSearch} className="flex gap-2">
        <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search meetings and knowledge..." />
        <Button type="submit" size="icon" aria-label="Search" disabled={loading}>
          <Search className="h-4 w-4" />
        </Button>
      </form>
      <div className="space-y-2">
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {!error && query && !loading && results.length === 0 ? (
          <p className="text-sm text-muted-foreground">No vector matches yet. Index meetings or add knowledge to expand search coverage.</p>
        ) : null}
        {results.map((result) => (
          <Link
            key={`${result.source}-${result.chunkId}`}
            href={result.source === "meeting" ? `/meetings/${result.id}` : "/knowledge"}
            className="block rounded-md border p-3 transition-colors hover:bg-accent"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="truncate text-sm font-medium">{result.title}</p>
              <span className="shrink-0 text-xs text-muted-foreground">{Math.round(result.score * 100)}%</span>
            </div>
            <p className="mt-1 text-xs uppercase tracking-normal text-muted-foreground">{result.source}</p>
            <p className="mt-1 line-clamp-3 text-xs leading-5 text-muted-foreground">{result.content}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
