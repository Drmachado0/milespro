import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * MilesPro v2 Input
 * - Surface raised (input token = surface-4)
 * - Subtle border, orange focus ring + glow
 * - aria-invalid → danger border + ring
 */
const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-[hsl(var(--border))] bg-input px-3 py-2 text-base text-foreground ring-offset-background transition-colors duration-150",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
          "placeholder:text-muted-foreground",
          "hover:border-[hsl(228_13%_22%)]",
          "focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:shadow-[0_0_0_3px_hsl(var(--primary)/0.15)]",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "aria-[invalid=true]:border-destructive aria-[invalid=true]:focus-visible:ring-destructive/30",
          "md:text-sm",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
