import { NextRequest, NextResponse } from "next/server";

type NewsItem = {
  title: string;
  link: string;
  pubDate: string;
  source?: string;
  image?: string;
};

const FEED_URL = "https://renewablesnow.com/news/news_feed/?source=solar";

function decodeEntities(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function extractTag(block: string, tag: string): string {
  const match = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return decodeEntities(match?.[1]?.trim() ?? "");
}

function extractImage(block: string): string | undefined {
  const mediaMatch = block.match(/<media:content[^>]*url="([^"]+)"[^>]*>/i);
  if (mediaMatch?.[1]) return mediaMatch[1].trim();

  const enclosureMatch = block.match(/<enclosure[^>]*url="([^"]+)"[^>]*>/i);
  if (enclosureMatch?.[1]) return enclosureMatch[1].trim();

  return undefined;
}

function parseFeed(xml: string): NewsItem[] {
  const items = Array.from(xml.matchAll(/<item>([\s\S]*?)<\/item>/gi));
  return items.map((match) => {
    const block = match[1] ?? "";
    return {
      title: extractTag(block, "title") || "Untitled",
      link: extractTag(block, "link") || "#",
      pubDate: extractTag(block, "pubDate"),
      source: extractTag(block, "source") || undefined,
      image: extractImage(block),
    };
  });
}

export async function GET(request: NextRequest) {
  const page = Math.max(Number(request.nextUrl.searchParams.get("page") ?? 1), 1);
  const pageSize = Math.min(Math.max(Number(request.nextUrl.searchParams.get("pageSize") ?? 4), 1), 12);

  try {
    const response = await fetch(FEED_URL, {
      next: { revalidate: 300 },
      headers: {
        "User-Agent": "SolarDashboard/1.0 (+https://renewablesnow.com/news/solar/)",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Feed fetch failed with status ${response.status}` },
        { status: 502 },
      );
    }

    const xml = await response.text();
    const allItems = parseFeed(xml);
    const totalItems = allItems.length;
    const totalPages = Math.max(Math.ceil(totalItems / pageSize), 1);
    const safePage = Math.min(page, totalPages);

    const start = (safePage - 1) * pageSize;
    const items = allItems.slice(start, start + pageSize);

    return NextResponse.json({
      items,
      page: safePage,
      pageSize,
      totalItems,
      totalPages,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
