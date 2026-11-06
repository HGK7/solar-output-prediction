"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronDown,
  ChevronUp,
  MapPin,
  MessageSquare,
  RotateCcw,
  ShieldCheck,
  X,
} from "lucide-react";
import {
  PALETTE,
  useZenithPreferences,
} from "@/context/zenith-preferences-context";
import { askQuestion, RAGUnavailableError } from "@/lib/api";
import { LOCATIONS_CHANGED_EVENT, readLocationsStore } from "@/lib/locations-store";
import { Skeleton } from "@/components/ui/skeleton";
import { SourceDocumentTrigger } from "@/components/source-document-trigger";

const NOTICE_DISMISSED_KEY = "zenith:disclaimer-dismissed";

const REFUSAL_TEXT: Record<string, string> = {
  insufficient_context:
    "The Zenith guides don't cover this well enough to answer reliably. Try a question about sizing, batteries, subsidies, costs, or weather effects.",
  outside_scope: "This question is outside solar planning, so the Solar Guide can't answer it.",
  ambiguous_question: "Please add a little more detail, such as the system size, bill, or location.",
};

export function TopNav() {
  const pathname = usePathname();
  const {
    assistantOpen,
    setAssistantOpen,
    assistantMessages,
    setAssistantMessages,
    assistantSiteContext,
    setAssistantSiteContext,
    assistantDraft,
    setAssistantDraft,
  } = useZenithPreferences();

  const [expandedCalcId, setExpandedCalcId] = useState<string | null>(null);
  const [showNotice, setShowNotice] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      try {
        setShowNotice(!window.localStorage.getItem(NOTICE_DISMISSED_KEY));
      } catch {
        setShowNotice(true);
      }
    });
    return () => cancelAnimationFrame(id);
  }, []);
  const dismissNotice = () => {
    try {
      window.localStorage.setItem(NOTICE_DISMISSED_KEY, "true");
    } catch {
      // storage unavailable: notice returns next visit
    }
    setShowNotice(false);
  };
  // Read the store directly; a useLocationsStore copy here would go stale and write back old data.
  const [latestSiteId, setLatestSiteId] = useState<string | null>(null);
  useEffect(() => {
    const refresh = () => {
      const latest = [...readLocationsStore().locations].sort((a, b) =>
        b.updatedAt.localeCompare(a.updatedAt),
      )[0];
      setLatestSiteId(latest?.id ?? null);
    };
    refresh();
    window.addEventListener(LOCATIONS_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(LOCATIONS_CHANGED_EVENT, refresh);
  }, []);
  const [assistantInput, setAssistantInput] = useState("");
  const [isAsking, setIsAsking] = useState(false);

  useEffect(() => {
    if (!assistantDraft) return;
    setAssistantInput(assistantDraft);
    setAssistantDraft(null);
  }, [assistantDraft, setAssistantDraft]);

  const navItems = [
    {
      id: "landing",
      label: "Overview",
      href: "/",
      active: pathname === "/",
    },
    {
      id: "dashboard",
      label: "Solar Planner",
      href: "/dashboard",
      active: pathname === "/dashboard" || pathname.startsWith("/dashboard/"),
    },
    {
      id: "location_detail",
      label: "Site Analysis",
      href: latestSiteId ? `/location/${latestSiteId}` : null,
      disabledReason: "Save an analysis to open Site Analysis.",
      active: pathname.startsWith("/location/"),
    },
    {
      id: "portfolio",
      label: "Portfolio",
      href: "/locations",
      active:
        pathname === "/locations" ||
        pathname.startsWith("/locations/") ||
        pathname === "/analytics" ||
        pathname.startsWith("/analytics/"),
    },
    {
      id: "profile",
      label: "Preferences",
      href: "/preferences",
      active:
        pathname === "/preferences" ||
        pathname.startsWith("/preferences/") ||
        pathname === "/profile" ||
        pathname.startsWith("/profile/"),
    },
  ];

  const handleAskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assistantInput.trim() || isAsking) return;

    const q = assistantInput.trim();
    setAssistantInput("");
    const userMsgId = "u-" + Date.now();
    const calcId = "calc-" + Date.now();

    setAssistantMessages((prev) => [
      ...prev,
      { id: userMsgId, role: "user", text: q },
    ]);
    setIsAsking(true);

    try {
      const res = await askQuestion(q, assistantSiteContext?.summary);
      if (res.is_refusal || /^[a-z_]+$/.test((res.answer ?? "").trim())) {
        const reason = res.refusal_reason ?? res.answer?.trim();
        setAssistantMessages((prev) => [
          ...prev,
          {
            id: "a-" + Date.now(),
            role: "assistant",
            text: REFUSAL_TEXT[reason ?? ""] ?? REFUSAL_TEXT.insufficient_context,
          },
        ]);
        return;
      }
      const calcs = (res.tool_calls ?? []).filter(
        (t) => t.tool !== "retrieve_knowledge_base",
      );
      const cited = new Set((res.citations ?? []).map((c) => c.source).filter(Boolean));
      const seen = new Set<string>();
      const sources = (res.retrieved_documents ?? [])
        .filter((d) => (cited.size === 0 || cited.has(d.source)) && !seen.has(d.source) && seen.add(d.source))
        .map((d) => ({ source: d.source, sourcePath: d.source_path, excerpt: d.snippet }));

      setAssistantMessages((prev) => [
        ...prev,
        {
          id: "a-" + Date.now(),
          role: "assistant",
          text: res.answer || "No answer was returned. Try rephrasing the question.",
          verifiedCalc: calcs.length
            ? {
                id: calcId,
                badge: `Verified calculation · ${calcs.map((t) => t.tool.replace(/_/g, " ")).join(", ")}`,
                results: calcs.map((t) => t.result_summary),
              }
            : undefined,
          sources,
        },
      ]);
      if (calcs.length) setExpandedCalcId(calcId);
    } catch (err) {
      setAssistantMessages((prev) => [
        ...prev,
        {
          id: "a-" + Date.now(),
          role: "assistant",
          text:
            err instanceof RAGUnavailableError
              ? "The knowledge base is unavailable right now. Planner figures are not affected."
              : err instanceof Error && err.message
                ? err.message
                : "The Solar Guide could not answer right now. Try again later.",
        },
      ]);
    } finally {
      setIsAsking(false);
    }
  };

  return (
    <>
      <header
        className={`sticky top-0 z-40 ${PALETTE.plane} border-b ${PALETTE.rule}`}
      >
        <div className="max-w-360 mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between min-h-15 py-2 gap-3">
            {/* Brand Identity */}
            <Link
              href="/"
              className="flex items-center gap-3 text-left focus:outline-none group"
            >
              <Image
                src="/zenith-mark.png"
                alt=""
                width={32}
                height={32}
                priority
                unoptimized
                className="w-8 h-8 shrink-0"
              />
              <div className="flex items-center gap-2.5">
                <span className="font-editorial text-xl font-semibold tracking-tight text-[#18181B]">
                  Zenith
                </span>
                <span className={`text-xs ${PALETTE.subInk} hidden sm:inline`}>
                  Solar Intelligence
                </span>
              </div>
            </Link>

            {/* Primary Navigation */}
            <nav aria-label="Primary" className="flex items-center overflow-x-auto">
              <div
                className={`inline-flex border ${PALETTE.rule} ${PALETTE.well} p-0.5`}
              >
                {navItems.map((item) =>
                  item.href ? (
                    <Link
                      key={item.id}
                      href={item.href}
                      aria-current={item.active ? "page" : undefined}
                      className={`px-3.5 py-1.5 text-xs transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                        item.active
                          ? "bg-[#F59E0B] text-[#18181B] font-semibold"
                          : `${PALETTE.subInk} hover:text-[#18181B]`
                      }`}
                    >
                      <span>{item.label}</span>
                    </Link>
                  ) : (
                    <span
                      key={item.id}
                      role="link"
                      aria-disabled="true"
                      title={item.disabledReason}
                      className={`px-3.5 py-1.5 text-xs whitespace-nowrap cursor-not-allowed opacity-50 ${PALETTE.subInk}`}
                    >
                      {item.label}
                    </span>
                  ),
                )}
              </div>
            </nav>

          </div>
        </div>
      </header>

      {showNotice && (
        <aside aria-label="Project notice" className={`border-b ${PALETTE.rule} ${PALETTE.well}`}>
          <div className={`max-w-[1440px] mx-auto flex items-center justify-between gap-3 px-4 py-1.5 text-[11px] sm:px-6 lg:px-8 ${PALETTE.subInk}`}>
            <p>
              Zenith is an exploratory planning tool under active development. Results are
              estimates and are not financial, tax, or engineering advice.{" "}
              <Link href="/disclaimer" className="underline underline-offset-2 hover:text-[#18181B]">
                Methodology &amp; disclaimer
              </Link>
            </p>
            <button
              type="button"
              onClick={dismissNotice}
              aria-label="Dismiss project notice"
              className="shrink-0 p-1 hover:text-[#18181B]"
            >
              <X className="h-3.5 w-3.5" aria-hidden />
            </button>
          </div>
        </aside>
      )}

      {!assistantOpen && (
        <button
          type="button"
          onClick={() => setAssistantOpen(true)}
          aria-label="Open Solar Guide"
          className="fixed bottom-5 right-5 z-40 flex items-center gap-2 bg-[#F59E0B] px-4 py-3 text-sm font-semibold text-[#18181B] shadow-[0_12px_32px_-8px_rgba(24,24,27,0.35)] transition-colors hover:bg-[#D97706] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#18181B]"
        >
          <MessageSquare className="h-4 w-4" aria-hidden />
          <span className="hidden sm:inline">Solar Guide</span>
        </button>
      )}

      {/* Slide-Over Drawer: Cited Solar Guide & Engineering Q&A */}
      {assistantOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-[#18181B]/60 backdrop-blur-[1px]">
          <div
            className={`w-full max-w-lg h-full ${PALETTE.plane} border-l ${PALETTE.rule} flex flex-col justify-between shadow-2xl`}
          >
            <div className="p-5 bg-[#18181B] text-[#FAF8F5] border-b border-white/10 flex items-center justify-between">
              <div>
                <h2 className="font-editorial text-xl font-medium">
                  Solar Guide &amp; Cited Engineering Q&amp;A
                </h2>
                <p className="text-xs text-[#A1A1AA] mt-0.5">
                  Answers cite the Zenith knowledge base. Figures come from Zenith
                  calculators.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setAssistantMessages([]);
                    setAssistantSiteContext(null);
                    setAssistantInput("");
                  }}
                  disabled={assistantMessages.length === 0 && !assistantSiteContext}
                  className="flex items-center gap-1.5 border border-white/15 px-2.5 py-1.5 text-xs text-[#A1A1AA] hover:text-white disabled:opacity-40"
                >
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                  New conversation
                </button>
                <button
                  type="button"
                  onClick={() => setAssistantOpen(false)}
                  className="p-1.5 border border-white/15 text-[#A1A1AA] hover:text-white"
                  aria-label="Close Solar Guide"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div
              className={`flex items-center justify-between gap-3 border-b px-5 py-2.5 text-xs ${PALETTE.rule} ${PALETTE.well}`}
            >
              {assistantSiteContext ? (
                <>
                  <span className="flex min-w-0 items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-[#D97706]" aria-hidden />
                    <span className="truncate">
                      Using <span className="font-semibold">{assistantSiteContext.label}</span>
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setAssistantSiteContext(null)}
                    className="shrink-0 underline underline-offset-2 hover:text-[#D97706]"
                  >
                    Remove
                  </button>
                </>
              ) : (
                <span className={PALETTE.subInk}>
                  No run attached. Answers use general guidance. Use &quot;Ask about
                  this&quot; on a result or a saved site to attach one.
                </span>
              )}
            </div>

            <div className={`flex-1 overflow-y-auto divide-y ${PALETTE.divide}`}>
              {assistantMessages.length === 0 ? (
                <p className={`p-5 text-sm leading-relaxed ${PALETTE.subInk}`}>
                  Ask about sizing, batteries, subsidies, or how weather affects
                  output.
                </p>
              ) : null}
              {assistantMessages.map((m) => (
                <div key={m.id} className="p-5 space-y-3">
                  <div className="font-mono tabular-nums text-[11px] font-semibold text-[#D97706]">
                    {m.role === "assistant" ? "ZENITH SOLAR GUIDE" : "YOUR QUESTION"}
                  </div>
                  <p className="text-sm leading-relaxed">{m.text}</p>
                  {m.sources?.length ? (
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                      <span className={PALETTE.subInk}>Sources:</span>
                      {m.sources.map((s) => (
                        <SourceDocumentTrigger
                          key={s.source}
                          source={s.source}
                          sourcePath={s.sourcePath}
                          excerpt={s.excerpt}
                          variant="badge"
                        />
                      ))}
                    </div>
                  ) : null}

                  {m.verifiedCalc && (
                    <div
                      className={`border-y ${PALETTE.rule} ${PALETTE.well} py-2.5 px-3`}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedCalcId(
                            expandedCalcId === m.verifiedCalc!.id
                              ? null
                              : m.verifiedCalc!.id,
                          )
                        }
                        className="w-full flex items-center justify-between text-left font-mono tabular-nums text-xs"
                      >
                        <span className="flex items-center gap-1.5 text-[#16A34A] font-semibold">
                          <ShieldCheck className="w-4 h-4" />
                          {m.verifiedCalc.badge}
                        </span>
                        {expandedCalcId === m.verifiedCalc.id ? (
                          <ChevronUp className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </button>

                      {expandedCalcId === m.verifiedCalc.id && (
                        <div
                          className={`mt-2.5 pt-2.5 border-t ${PALETTE.rule} space-y-1.5 font-mono tabular-nums text-xs`}
                        >
                          {m.verifiedCalc.results.map((r) => (
                            <div key={r} className="text-[#16A34A] font-semibold">
                              → {r}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {isAsking ? (
                <div role="status" aria-live="polite" className="p-5 space-y-3">
                  <div className="font-mono tabular-nums text-[11px] font-semibold text-[#D97706]">
                    ZENITH SOLAR GUIDE
                  </div>
                  <p className={`text-sm ${PALETTE.subInk}`}>
                    Checking the reference guides and calculators…
                  </p>
                  <div className="space-y-2" aria-hidden>
                    <Skeleton className="h-3.5 w-full rounded-sm bg-[#F3F1EC] motion-reduce:animate-none" />
                    <Skeleton className="h-3.5 w-3/4 rounded-sm bg-[#F3F1EC] motion-reduce:animate-none" />
                  </div>
                </div>
              ) : null}

              <div className="p-5 space-y-2">
                <div className={`text-xs font-medium ${PALETTE.subInk}`}>
                  Suggested Questions:
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    "Is my roof large enough to cover 100% of my bill?",
                    "How does adding an LFP battery affect payback years?",
                    "How much does monsoon cloud cover reduce July output?",
                  ].map((promptText) => (
                    <button
                      key={promptText}
                      type="button"
                      onClick={() => setAssistantInput(promptText)}
                      className={`text-left text-xs px-2.5 py-1.5 border ${PALETTE.rule} ${PALETTE.well} ${PALETTE.hoverPlane}`}
                    >
                      {promptText}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <form
              onSubmit={handleAskSubmit}
              className={`p-4 border-t ${PALETTE.rule} ${PALETTE.well}`}
            >
              <div className="flex gap-2">
                <input
                  type="text"
                  value={assistantInput}
                  onChange={(e) => setAssistantInput(e.target.value)}
                  placeholder="Ask about your solar plan, roof fit, or savings..."
                  className={`flex-1 px-3 py-2 text-xs ${PALETTE.plane} border ${PALETTE.rule} focus:outline-none focus:border-[#F59E0B]`}
                />
                <button
                  type="submit"
                  disabled={isAsking}
                  className="px-4 py-2 bg-[#F59E0B] text-[#18181B] text-xs font-semibold disabled:opacity-60"
                >
                  {isAsking ? "Asking…" : "Ask"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
