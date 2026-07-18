import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * MilesPro v2 Badge
 * Three styles per semantic color: solid, subtle (translucent fill), outline.
 *
 * Variants kept backwards-compatible: default / secondary / destructive / outline.
 * New: success / warning / info / neutral, each in solid|subtle|outline via `tone`.
 */
const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        // Legacy / shadcn-compatible
        default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/90",
        secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "text-foreground border-[hsl(var(--border))]",

        // v2 — Solid
        "solid-success": "border-transparent bg-[hsl(var(--mp-success))] text-white",
        "solid-warning": "border-transparent bg-[hsl(var(--mp-warning))] text-black",
        "solid-danger": "border-transparent bg-[hsl(var(--mp-danger))] text-white",
        "solid-info": "border-transparent bg-[hsl(var(--mp-info))] text-white",
        "solid-neutral": "border-transparent bg-[hsl(var(--mp-surface-5))] text-foreground",

        // v2 — Subtle (translucent)
        "subtle-success": "border-[hsl(var(--mp-success)/0.25)] bg-[hsl(var(--mp-success)/0.15)] text-[hsl(var(--mp-success))]",
        "subtle-warning": "border-[hsl(var(--mp-warning)/0.25)] bg-[hsl(var(--mp-warning)/0.15)] text-[hsl(var(--mp-warning))]",
        "subtle-danger": "border-[hsl(var(--mp-danger)/0.25)] bg-[hsl(var(--mp-danger)/0.15)] text-[hsl(var(--mp-danger))]",
        "subtle-info": "border-[hsl(var(--mp-info)/0.25)] bg-[hsl(var(--mp-info)/0.15)] text-[hsl(var(--mp-info))]",
        "subtle-neutral": "border-[hsl(var(--border))] bg-[hsl(var(--mp-surface-3))] text-muted-foreground",
        "subtle-primary": "border-[hsl(var(--primary)/0.25)] bg-[hsl(var(--primary)/0.12)] text-[hsl(var(--mp-orange-300))]",

        // v2 — Outline
        "outline-success": "bg-transparent border-[hsl(var(--mp-success)/0.5)] text-[hsl(var(--mp-success))]",
        "outline-warning": "bg-transparent border-[hsl(var(--mp-warning)/0.5)] text-[hsl(var(--mp-warning))]",
        "outline-danger": "bg-transparent border-[hsl(var(--mp-danger)/0.5)] text-[hsl(var(--mp-danger))]",
        "outline-info": "bg-transparent border-[hsl(var(--mp-info)/0.5)] text-[hsl(var(--mp-info))]",
        "outline-neutral": "bg-transparent border-[hsl(var(--border))] text-muted-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
