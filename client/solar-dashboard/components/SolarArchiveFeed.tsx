"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowRight, ChartColumn, CircleUserRound, ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

type NewsItem = {
  title: string;
  link: string;
  pubDate: string;
  source?: string;
  image?: string;
};

const NEWS_PAGE_URL = "https://renewablesnow.com/news/solar/";
const PAGE_SIZE = 4;
const MIN_VISIBLE_ROWS = 4;

function SkeletonItem() {
  return (
    <div className="animate-pulse rounded-xl border border-border/50 bg-white p-3 md:grid md:grid-cols-[180px_minmax(0,1fr)]">
      <div className="h-28 w-full rounded-lg bg-muted" />
      <div className="mt-2 flex-1 space-y-2 md:mt-0 md:ml-3">
        <div className="h-4 w-24 rounded bg-muted" />
        <div className="h-5 w-3/4 rounded bg-muted" />
        <div className="h-3 w-1/2 rounded bg-muted" />
      </div>
    </div>
  );
}

export function SolarArchiveFeed() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [newsError, setNewsError] = useState<string | null>(null);
  const [newsLoading, setNewsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const loadNews = useCallback(async (page: number) => {
    setNewsLoading(true);
    setNewsError(null);

    try {
      const res = await fetch(`/api/solar-news?page=${page}&pageSize=${PAGE_SIZE}`, { cache: "no-store" });
      const payload = await res.json();

      if (!res.ok) {
        throw new Error(payload?.error ?? `Failed to load feed (${res.status})`);
      }

      setNews(payload.items ?? []);
      setCurrentPage(payload.page ?? page);
      setTotalPages(payload.totalPages ?? 1);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load live headlines.";
      setNewsError(message);
      setNews([]);
    } finally {
      setNewsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadNews(1);
  }, [loadNews]);

  const minHeight = `${MIN_VISIBLE_ROWS * 112}px`;

  return (
    <Card className="rounded-2xl border-border/60 bg-white/80 p-4">
      <CardContent className="space-y-3 p-0">
        <div className="min-h-112">
          {newsLoading && (
            <div className="space-y-3">
              {Array.from({ length: MIN_VISIBLE_ROWS }).map((_, idx) => (
                <SkeletonItem key={`skeleton-${idx}`} />
              ))}
            </div>
          )}

          {!newsLoading && news.length === 0 && !newsError && (
            <div className="rounded-xl border border-border/50 p-4 text-sm text-muted-foreground">
              No headlines available right now.
            </div>
          )}

          {!newsLoading && news.length > 0 && (
            <div className="space-y-3">
              {news.map((item, index) => (
                <article
                  key={`${item.link}-${index}`}
                  className="grid gap-4 rounded-xl border border-border/50 p-3 md:grid-cols-[180px_minmax(0,1fr)]"
                >
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.title}
                      className="h-28 w-full rounded-lg object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-28 w-full items-center justify-center rounded-lg bg-muted text-muted-foreground">
                      <ChartColumn className="h-5 w-5" />
                    </div>
                  )}

                  <div>
                    <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="secondary" className="text-[10px]">
                        Solar latest
                      </Badge>
                      <span>{item.pubDate}</span>
                    </div>
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xl font-bold leading-snug text-foreground hover:text-amber-600"
                    >
                      {item.title}
                    </a>
                    <div className="mt-2 flex items-center gap-1 text-sm text-muted-foreground">
                      <CircleUserRound className="h-4 w-4" />
                      <span>{item.source ?? "Renewables Now"}</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}

          {newsError && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
              {newsError}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
          <Button
            variant="outline"
            onClick={() => {
              void loadNews(currentPage);
            }}
            disabled={newsLoading}
          >
            Refresh
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const prevPage = Math.max(currentPage - 1, 1);
                void loadNews(prevPage);
              }}
              disabled={newsLoading || currentPage <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs text-muted-foreground">
              Page {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const nextPage = Math.min(currentPage + 1, totalPages);
                void loadNews(nextPage);
              }}
              disabled={newsLoading || currentPage >= totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <Button asChild variant="outline">
            <a href={NEWS_PAGE_URL} target="_blank" rel="noreferrer">
              View all archives
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
