import { memo } from "react";

interface UtilsBarProps {
  // Add props as needed
}

export const UtilsBar = memo(({ }: UtilsBarProps) => {
  return (
    <div className="flex items-center gap-2 p-2">
      {/* Add utility components here */}
    </div>
  );
});

UtilsBar.displayName = "UtilsBar";
