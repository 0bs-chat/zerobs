import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  sizeClassName?: string;
  className?: string;
  label?: string;
}

export function LoadingSpinner({
  sizeClassName = "h-5 w-5",
  className,
  label,
}: LoadingSpinnerProps) {
  return (
    <div className="flex items-center justify-center gap-2">
      <Loader2
        aria-label="loading"
        className={cn(
          "animate-spin text-muted-foreground",
          sizeClassName,
          className
        )}
      />
      <p className="text-muted-foreground">{label}</p>
    </div>
  );
}
