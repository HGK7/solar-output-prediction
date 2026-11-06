"use client";

import React, { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ExternalLink, Sun } from "lucide-react";
import {
  FALLBACK_SOLAR_HEADLINES,
  PALETTE,
} from "@/context/zenith-preferences-context";

export interface SolarHeadlineItem {
  title: string;
  link: string;
  pubDate: string;
  source?: string;
  image?: string;
}

const RSS_FEED_URL = "https://renewablesnow.com/news/news_feed/?source=solar";

export function SolarNewsFeed() {
  const newsScrollRef = useRef<HTMLDivElement | null>(null);
  const [rssItems, setRssItems] = useState<SolarHeadlineItem[]>(
    FALLBACK_SOLAR_HEADLINES,
  );

  useEffect(() => {
    let isMounted = true;

    async function loadRss() {
      // 1. Try Next.js local API proxy first (/api/solar-news)
      try {
        const res = await fetch("/api/solar-news?pageSize=6");
        if (res.ok) {
          const data = (await res.json()) as { items?: SolarHeadlineItem[] };
          if (isMounted && data.items && data.items.length > 0) {
            setRssItems(
              data.items.map((item, i) => ({
                title:
                  item.title ||
                  FALLBACK_SOLAR_HEADLINES[i % FALLBACK_SOLAR_HEADLINES.length]
                    .title,
                link: item.link || "https://renewablesnow.com/news/",
                pubDate: item.pubDate
                  ? new Date(item.pubDate).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  : "Nov 3, 2026",
                source: item.source || "Renewables Now",
                image:
                  item.image ||
                  FALLBACK_SOLAR_HEADLINES[i % FALLBACK_SOLAR_HEADLINES.length]
                    .image,
              })),
            );
            return;
          }
        }
      } catch {
        // Fallback to allorigins or static headlines below
      }

      // 2. Fallback to allorigins XML parser (matching reference prototype)
      try {
        const res = await fetch(
          `https://api.allorigins.win/get?url=${encodeURIComponent(RSS_FEED_URL)}`,
        );
        const data = await res.json();
        if (!isMounted || !data?.contents) return;
        const parser = new DOMParser();
        const xml = parser.parseFromString(data.contents, "text/xml");
        const nodes = Array.from(xml.querySelectorAll("item")).slice(0, 6);
        if (nodes.length > 0) {
          const parsed = nodes.map((node, i) => {
            const title =
              node.querySelector("title")?.textContent ||
              FALLBACK_SOLAR_HEADLINES[i % FALLBACK_SOLAR_HEADLINES.length]
                .title;
            const link =
              node.querySelector("link")?.textContent ||
              "https://renewablesnow.com/news/";
            const rawDate = node.querySelector("pubDate")?.textContent;
            const pubDate = rawDate
              ? new Date(rawDate).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })
              : "Nov 3, 2026";
            const enclosure = node
              .querySelector("enclosure")
              ?.getAttribute("url");
            return {
              title,
              link,
              pubDate,
              source: "Renewables Now",
              image:
                enclosure ||
                FALLBACK_SOLAR_HEADLINES[i % FALLBACK_SOLAR_HEADLINES.length]
                  .image,
            };
          });
          setRssItems(parsed);
        }
      } catch {
        // Retain FALLBACK_SOLAR_HEADLINES
      }
    }

    void loadRss();
    return () => {
      isMounted = false;
    };
  }, []);

  const scrollNews = (dir: number) => {
    if (!newsScrollRef.current) return;
    newsScrollRef.current.scrollBy({
      left: dir * 360,
      behavior: "smooth",
    });
  };

  return (
    <section
      className={`p-8 sm:p-12 border-b ${PALETTE.rule} ${PALETTE.canvas}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-semibold tracking-tight">
            Solar industry headlines
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => scrollNews(-1)}
            className={`p-2 border ${PALETTE.rule} ${PALETTE.plane} ${PALETTE.hoverPlane}`}
            aria-label="Previous headlines"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => scrollNews(1)}
            className={`p-2 border ${PALETTE.rule} ${PALETTE.plane} ${PALETTE.hoverPlane}`}
            aria-label="Next headlines"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div
        ref={newsScrollRef}
        className="flex gap-5 overflow-x-auto pb-3 snap-x snap-mandatory"
        style={{ scrollbarWidth: "thin" }}
      >
        {rssItems.map((item, idx) => (
          <a
            key={idx}
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            className={`snap-start shrink-0 w-[290px] sm:w-[310px] rounded-xl overflow-hidden border ${PALETTE.rule} ${PALETTE.plane} hover:border-[#F59E0B] transition-all flex flex-col justify-between group shadow-xs`}
          >
            <div>
              <div className="h-44 w-full overflow-hidden bg-[#18181B] relative">
                {item.image ? (
                  // eslint-disable-next-line @next/next/no-img-element -- external RSS news images
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[#F59E0B]">
                    <Sun className="w-10 h-10" />
                  </div>
                )}
              </div>

              <div className="p-4">
                <h3 className="font-semibold text-sm leading-snug line-clamp-3 group-hover:text-[#D97706] transition-colors">
                  {item.title}
                </h3>
              </div>
            </div>

            <div
              className={`px-4 pb-4 pt-1 flex items-center justify-between text-xs ${PALETTE.subInk}`}
            >
              <span>
                {item.pubDate}
                {item.source ? ` · ${item.source}` : ""}
              </span>
              <ExternalLink className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 text-[#F59E0B] transition-opacity" />
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}
