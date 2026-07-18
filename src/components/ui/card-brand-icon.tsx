import { cn } from "@/lib/utils";

export type CardBrand = 
  | "visa" 
  | "mastercard" 
  | "amex" 
  | "elo" 
  | "hipercard" 
  | "diners" 
  | "discover"
  | "other";

interface CardBrandIconProps {
  brand: CardBrand;
  className?: string;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "h-6 w-10",
  md: "h-8 w-12",
  lg: "h-10 w-16",
};

export const cardBrands: { value: CardBrand; label: string }[] = [
  { value: "visa", label: "Visa" },
  { value: "mastercard", label: "Mastercard" },
  { value: "amex", label: "American Express" },
  { value: "elo", label: "Elo" },
  { value: "hipercard", label: "Hipercard" },
  { value: "diners", label: "Diners Club" },
  { value: "discover", label: "Discover" },
  { value: "other", label: "Outro" },
];

export function CardBrandIcon({ brand, className, size = "md" }: CardBrandIconProps) {
  const baseClass = cn(
    "inline-flex items-center justify-center rounded",
    sizeClasses[size],
    className
  );

  switch (brand) {
    case "visa":
      return (
        <div className={cn(baseClass, "bg-[#1A1F71]")}>
          <svg viewBox="0 0 48 16" className="h-3 w-8">
            <text
              x="50%"
              y="50%"
              dominantBaseline="middle"
              textAnchor="middle"
              fill="white"
              fontSize="12"
              fontWeight="bold"
              fontStyle="italic"
              fontFamily="Arial, sans-serif"
            >
              VISA
            </text>
          </svg>
        </div>
      );

    case "mastercard":
      return (
        <div className={cn(baseClass, "bg-[#f5f5f5]")}>
          <svg viewBox="0 0 48 32" className="h-full w-full p-1">
            <circle cx="18" cy="16" r="12" fill="#EB001B" />
            <circle cx="30" cy="16" r="12" fill="#F79E1B" />
            <path
              d="M24 6.5a12 12 0 0 0 0 19"
              fill="#FF5F00"
            />
          </svg>
        </div>
      );

    case "amex":
      return (
        <div className={cn(baseClass, "bg-[#006FCF]")}>
          <svg viewBox="0 0 48 16" className="h-3 w-8">
            <text
              x="50%"
              y="50%"
              dominantBaseline="middle"
              textAnchor="middle"
              fill="white"
              fontSize="8"
              fontWeight="bold"
              fontFamily="Arial, sans-serif"
            >
              AMEX
            </text>
          </svg>
        </div>
      );

    case "elo":
      return (
        <div className={cn(baseClass, "bg-black")}>
          <svg viewBox="0 0 48 16" className="h-3 w-8">
            <text
              x="50%"
              y="50%"
              dominantBaseline="middle"
              textAnchor="middle"
              fill="#FFCB05"
              fontSize="11"
              fontWeight="bold"
              fontFamily="Arial, sans-serif"
            >
              elo
            </text>
          </svg>
        </div>
      );

    case "hipercard":
      return (
        <div className={cn(baseClass, "bg-[#822124]")}>
          <svg viewBox="0 0 48 16" className="h-3 w-8">
            <text
              x="50%"
              y="50%"
              dominantBaseline="middle"
              textAnchor="middle"
              fill="white"
              fontSize="7"
              fontWeight="bold"
              fontFamily="Arial, sans-serif"
            >
              HIPERCARD
            </text>
          </svg>
        </div>
      );

    case "diners":
      return (
        <div className={cn(baseClass, "bg-[#0079BE]")}>
          <svg viewBox="0 0 48 16" className="h-3 w-8">
            <text
              x="50%"
              y="50%"
              dominantBaseline="middle"
              textAnchor="middle"
              fill="white"
              fontSize="7"
              fontWeight="bold"
              fontFamily="Arial, sans-serif"
            >
              DINERS
            </text>
          </svg>
        </div>
      );

    case "discover":
      return (
        <div className={cn(baseClass, "bg-[#FF6600]")}>
          <svg viewBox="0 0 48 16" className="h-3 w-8">
            <text
              x="50%"
              y="50%"
              dominantBaseline="middle"
              textAnchor="middle"
              fill="white"
              fontSize="7"
              fontWeight="bold"
              fontFamily="Arial, sans-serif"
            >
              DISCOVER
            </text>
          </svg>
        </div>
      );

    default:
      return (
        <div className={cn(baseClass, "bg-muted border border-border")}>
          <svg viewBox="0 0 24 24" className="h-4 w-4 text-muted-foreground">
            <rect x="2" y="5" width="20" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
            <line x1="2" y1="10" x2="22" y2="10" stroke="currentColor" strokeWidth="2" />
          </svg>
        </div>
      );
  }
}

export function getBrandFromName(name: string): CardBrand {
  const lowerName = name.toLowerCase();
  if (lowerName.includes("visa")) return "visa";
  if (lowerName.includes("master")) return "mastercard";
  if (lowerName.includes("amex") || lowerName.includes("american")) return "amex";
  if (lowerName.includes("elo")) return "elo";
  if (lowerName.includes("hiper")) return "hipercard";
  if (lowerName.includes("diners")) return "diners";
  if (lowerName.includes("discover")) return "discover";
  return "other";
}
