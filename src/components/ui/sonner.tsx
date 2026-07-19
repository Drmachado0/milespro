import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      position="top-right"
      closeButton
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          // Readable neutral surface + subtle semantic border + colored icon,
          // instead of a full-saturation fill (the old bg-success + text-success
          // rendered green-on-green — the "giant green blob").
          success: "group-[.toaster]:border-success/50 group-[.toaster]:[&_[data-icon]]:text-success",
          error: "group-[.toaster]:border-destructive/50 group-[.toaster]:[&_[data-icon]]:text-destructive",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
