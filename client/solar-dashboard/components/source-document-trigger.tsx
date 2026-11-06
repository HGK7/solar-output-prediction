"use client";

import { useState } from "react";
import { FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SourceDocumentModal } from "@/components/source-document-modal";
import { formatSourceLabel, resolveSourceFilename } from "@/lib/source-documents";

interface SourceDocumentTriggerProps {
  source: string;
  sourcePath?: string | null;
  excerpt?: string;
  variant?: "badge" | "button" | "link";
  className?: string;
  label?: string;
}

export function SourceDocumentTrigger({
  source,
  sourcePath,
  excerpt,
  variant = "badge",
  className,
  label,
}: SourceDocumentTriggerProps) {
  const [open, setOpen] = useState(false);
  const filename = resolveSourceFilename(source, sourcePath);
  const display = label ?? formatSourceLabel(source);

  if (!filename) {
    return (
      <Badge variant="outline" className={`text-xs ${className ?? ""}`}>
        {display}
      </Badge>
    );
  }

  const openModal = () => setOpen(true);

  const trigger =
    variant === "button" ? (
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={`h-auto gap-1.5 text-xs ${className ?? ""}`}
        onClick={openModal}
      >
        <FileText className="h-3.5 w-3.5" />
        {display}
      </Button>
    ) : variant === "link" ? (
      <button
        type="button"
        onClick={openModal}
        className={`text-xs text-primary inline-flex items-center gap-1 hover:underline ${className ?? ""}`}
      >
        <FileText className="h-3.5 w-3.5" />
        View source
      </button>
    ) : (
      <button type="button" onClick={openModal} className="inline-flex">
        <Badge
          variant="outline"
          className={`cursor-pointer text-xs hover:bg-amber-50 gap-1 ${className ?? ""}`}
        >
          <FileText className="h-3 w-3" />
          {display}
        </Badge>
      </button>
    );

  return (
    <>
      {trigger}
      <SourceDocumentModal
        filename={filename}
        open={open}
        onOpenChange={setOpen}
        excerpt={excerpt}
      />
    </>
  );
}
