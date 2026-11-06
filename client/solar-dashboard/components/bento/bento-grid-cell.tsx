"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { BentoMotion } from "./bento-motion";

export interface BentoGridCellProps {
  children: ReactNode;
  index?: number;
  className?: string;
  /** Stretch tile to fill a multi-row grid cell (e.g. chart hero). */
  stretch?: boolean;
}

/** Grid child wrapper. Default: content height. Use stretch for tall row-span cells. */
export function BentoGridCell({
  children,
  index = 0,
  className,
  stretch = false,
}: BentoGridCellProps) {
  return (
    <BentoMotion
      index={index}
      className={cn(
        "min-h-0 [&_[data-slot=bento-tile]]:min-h-0",
        stretch && "h-full min-h-full [&_[data-slot=bento-tile]]:h-full",
        className,
      )}
    >
      {children}
    </BentoMotion>
  );
}
