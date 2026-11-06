import * as React from "react";

import { cn } from "@/lib/utils";

type BentoTileVariant = "default" | "elevated" | "inset" | "ai";

const variantClass: Record<BentoTileVariant, string> = {
  default: "bento-tile",
  elevated: "bento-tile-elevated",
  inset: "bento-tile-inset",
  ai: "bento-tile bento-tile-ai",
};

export interface BentoTileProps extends React.ComponentProps<"div"> {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  variant?: BentoTileVariant;
  colSpan?: 1 | 2 | 3 | 4;
  rowSpan?: 1 | 2;
  /** Dashboard tiles: no hover lift */
  interactive?: boolean;
  /** Heading level for title. Default 3. Use 2 under a page h1. */
  headingLevel?: 2 | 3 | 4;
}

const colSpanClass = {
  1: "col-span-1",
  2: "col-span-1 sm:col-span-2",
  3: "col-span-1 sm:col-span-2 lg:col-span-3",
  4: "col-span-1 sm:col-span-2 lg:col-span-4",
} as const;

const rowSpanClass = {
  1: "row-span-1",
  2: "row-span-1 lg:row-span-2",
} as const;

export function BentoTile({
  title,
  description,
  icon,
  action,
  variant = "default",
  colSpan,
  rowSpan,
  interactive = false,
  headingLevel = 3,
  className,
  children,
  ...props
}: BentoTileProps) {
  const hasHeader = title || description || icon || action;
  const HeadingTag = headingLevel === 2 ? "h2" : headingLevel === 4 ? "h4" : "h3";

  return (
    <div
      data-slot="bento-tile"
      className={cn(
        "flex min-h-0 flex-col gap-4 p-5 overflow-hidden",
        interactive && "transition-transform duration-150 hover:-translate-y-px",
        variantClass[variant],
        colSpan && colSpanClass[colSpan],
        rowSpan && rowSpanClass[rowSpan],
        className,
      )}
      {...props}
    >
      {hasHeader ? (
        <div className="flex items-start gap-3">
          {icon ? (
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-tile-inset text-primary">
              {icon}
            </div>
          ) : null}
          <div className="min-w-0 flex-1 space-y-1">
            {title ? (
              <HeadingTag className="text-lg font-semibold leading-none tracking-tight">
                {title}
              </HeadingTag>
            ) : null}
            {description ? (
              <p className="text-sm text-muted-foreground">{description}</p>
            ) : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      ) : null}
      {children}
    </div>
  );
}
