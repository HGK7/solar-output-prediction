"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { FileText, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  fetchSourceDocument,
  formatSourceLabel,
  type SourceDocumentPayload,
} from "@/lib/source-documents";

interface SourceDocumentModalProps {
  filename: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  excerpt?: string;
}

export function SourceDocumentModal({
  filename,
  open,
  onOpenChange,
  excerpt,
}: SourceDocumentModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [markdown, setMarkdown] = useState<SourceDocumentPayload | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !filename) {
      setMarkdown(null);
      setPdfUrl(null);
      setError(null);
      return;
    }

    let cancelled = false;
    let objectUrl: string | null = null;

    async function load() {
      setLoading(true);
      setError(null);
      setMarkdown(null);
      setPdfUrl(null);

      try {
        const doc = await fetchSourceDocument(filename);
        if (cancelled) return;

        if (doc.format === "pdf") {
          objectUrl = doc.url;
          setPdfUrl(doc.url);
        } else {
          setMarkdown(doc);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load document.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [open, filename]);

  const title = filename ? formatSourceLabel(filename) : "Source document";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(88vh,900px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
        <DialogHeader className="border-b px-6 py-4 text-left">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5 text-amber-600" />
            {title}
          </DialogTitle>
          <DialogDescription className="text-left">
            Indexed knowledge-base document used for grounded answers.
          </DialogDescription>
        </DialogHeader>

        {excerpt && (
          <div className="border-b bg-amber-50/80 px-6 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-amber-800/80">
              Retrieved excerpt
            </p>
            <p className="mt-1 text-sm text-foreground/85 leading-relaxed">{excerpt}</p>
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          {loading && (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading document…
            </div>
          )}

          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          )}

          {pdfUrl && !loading && (
            <iframe
              title={title}
              src={pdfUrl}
              className="h-[min(70vh,720px)] w-full rounded-lg border bg-white"
            />
          )}

          {markdown && !loading && (
            <article className="prose prose-sm max-w-none prose-headings:text-foreground prose-p:text-foreground/85">
              <ReactMarkdown>{markdown.content}</ReactMarkdown>
            </article>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
