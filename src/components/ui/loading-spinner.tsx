import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  sizeClassName?: string;
  className?: string;
  label?: string;
  containerClassName?: string;
}

export function LoadingSpinner({
  sizeClassName = "h-5 w-5",
  className,
  label,
  containerClassName,
}: LoadingSpinnerProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-center gap-2",
        containerClassName
      )}
    >
      <Loader2
        aria-label="loading"
        className={cn(
          "animate-spin text-muted-foreground",
          sizeClassName,
          className
        )}
      />
      {label ? <p className="text-muted-foreground">{label}</p> : null}
    </div>
  );
}
