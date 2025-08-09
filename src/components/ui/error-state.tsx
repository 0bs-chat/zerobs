import * as React from "react";
import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import { AlertCircleIcon } from "lucide-react";

const errorStateVariants = cva(
  "relative w-full rounded-md border transition-colors flex gap-2 sm:flex-row flex-col sm:items-center items-start",
  {
    variants: {
      variant: {
        subtle: "bg-destructive/10 text-destructive border-destructive/20",
        solid: "bg-destructive text-destructive-foreground border-destructive",
        outline: "bg-transparent text-destructive border-destructive",
      },
      density: {
        compact: "p-2 text-sm",
        comfy: "p-3",
      },
      align: {
        left: "justify-start",
        center: "justify-center",
      },
    },
    defaultVariants: {
      variant: "subtle",
      density: "compact",
      align: "left",
    },
  }
);

export interface ErrorStateProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof errorStateVariants> {
  error?: unknown;
  title?: string;
  description?: string;
  multiLineDescription?: boolean;
  showIcon?: boolean;
  showTitle?: boolean;
  showDescription?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
}

const ErrorState = React.forwardRef<HTMLDivElement, ErrorStateProps>(
  (
    {
      className,
      variant,
      density,
      align,
      error,
      title = "Something went wrong",
      description,
      multiLineDescription = false,
      showIcon = true,
      showTitle = true,
      showDescription = true,
      icon: Icon = AlertCircleIcon,
      ...props
    },
    ref
  ) => {
    const errorMessage = React.useMemo(() => {
      if (description) return description;
      if (error instanceof Error) return error.message;
      if (error) return String(error);
      return "";
    }, [error, description]);

    // Only return null if nothing at all would render
    if (
      !showIcon &&
      (!showTitle || !title) &&
      (!showDescription || !errorMessage)
    ) {
      return null;
    }

    return (
      <div
        ref={ref}
        role="alert"
        aria-live="polite"
        className={cn(
          errorStateVariants({ variant, density, align }),
          className
        )}
        {...props}
      >
        {showIcon && (
          <span className="flex items-center justify-center shrink-0">
            <Icon className="h-5 w-5" />
          </span>
        )}
        <div className="flex flex-col justify-center flex-1 min-w-0">
          {showTitle && title && (
            <div className="font-medium py-1 leading-none tracking-tight text-left">
              {title}
            </div>
          )}
          {showDescription && errorMessage && (
            <div
              className={cn(
                "text-destructive/60 leading-tight",
                multiLineDescription
                  ? "break-words whitespace-normal"
                  : "truncate"
              )}
            >
              {errorMessage}
            </div>
          )}
        </div>
      </div>
    );
  }
);

ErrorState.displayName = "ErrorState";

export { ErrorState, errorStateVariants };
