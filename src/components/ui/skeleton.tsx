import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-md",
        "bg-gradient-to-r from-[hsl(var(--shimmer-from))] via-[hsl(var(--shimmer-via))] to-[hsl(var(--shimmer-to))]",
        "bg-[length:200%_100%]",
        "animate-shimmer",
        className
      )}
      {...props}
    />
  );
}

export { Skeleton };
