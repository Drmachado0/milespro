import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { hapticButton } from "@/lib/haptics";

/**
 * MilesPro v2 Button
 * - Solid orange primary with subtle glow
 * - Glass secondary (bg + border)
 * - Outline / ghost / destructive / link / glass variants
 * - Orange focus ring (--ring)
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold ring-offset-background transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 touch-manipulation active:scale-[0.97] select-none",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[0_1px_0_rgba(255,255,255,0.18)_inset,0_8px_24px_-12px_hsl(var(--primary)/0.55)] hover:bg-[hsl(var(--mp-orange-400))] active:bg-[hsl(var(--mp-orange-600))]",
        destructive:
          "bg-destructive text-destructive-foreground shadow-raised hover:bg-destructive/90 active:bg-destructive/80",
        outline:
          "border border-[hsl(var(--border))] bg-transparent text-foreground hover:bg-accent hover:border-[hsl(228_13%_22%)] active:bg-accent/80",
        secondary:
          "bg-[hsl(var(--mp-surface-3))] text-foreground border border-[hsl(var(--border))] backdrop-blur-sm hover:bg-[hsl(var(--mp-surface-4))] active:bg-[hsl(var(--mp-surface-5))]",
        ghost:
          "text-foreground hover:bg-accent hover:text-accent-foreground active:bg-accent/80",
        link:
          "text-primary underline-offset-4 hover:underline active:opacity-70",
        glass:
          "bg-[hsl(var(--mp-surface-4)/0.62)] backdrop-blur-[20px] backdrop-saturate-150 text-foreground border border-[hsl(var(--border))] hover:bg-[hsl(var(--mp-surface-4)/0.8)]",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-12 rounded-md px-6 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  haptic?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, haptic = true, onClick, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";

    const handleClick = React.useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
      if (haptic) {
        hapticButton();
      }
      onClick?.(e);
    }, [haptic, onClick]);

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        onClick={handleClick}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
