const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

export interface SourceDocumentPayload {
  filename: string;
  format: "markdown" | "text";
  content: string;
}

/** Map citation/source label to a file in backend/rag/documents/. */
export function resolveSourceFilename(
  source?: string | null,
  sourcePath?: string | null,
): string | null {
  const raw = (sourcePath || source || "").trim();
  if (!raw) return null;

  const base = raw.split(/[/\\]/).pop() ?? raw;
  if (/\.(md|txt|pdf)$/i.test(base)) return base;

  const withMd = `${base.replace(/\.md$/i, "")}.md`;
  return withMd;
}

export function sourceDocumentUrl(filename: string): string {
  return `${API_BASE}/rag/documents/${encodeURIComponent(filename)}`;
}

export async function fetchSourceDocument(
  filename: string,
): Promise<SourceDocumentPayload | { format: "pdf"; url: string }> {
  const res = await fetch(sourceDocumentUrl(filename));
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Document not found." }));
    throw new Error(err.error ?? "Document not found.");
  }

  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("application/pdf")) {
    const blob = await res.blob();
    return { format: "pdf", url: URL.createObjectURL(blob) };
  }

  return res.json();
}

export function formatSourceLabel(filename: string): string {
  return filename.replace(/\.(md|txt|pdf)$/i, "").replace(/_/g, " ");
}
