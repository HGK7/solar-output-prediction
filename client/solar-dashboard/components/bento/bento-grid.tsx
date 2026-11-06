import * as React from "react";

import { cn } from "@/lib/utils";

export interface BentoGridProps extends React.ComponentProps<"div"> {}

export function BentoGrid({ className, children, ...props }: BentoGridProps) {
  return (
    <div data-slot="bento-grid" className={cn("bento-grid", className)} {...props}>
      {children}
    </div>
  );
}
