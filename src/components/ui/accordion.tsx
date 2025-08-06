import * as React from "react";
import { useState, createContext, useContext } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDownIcon } from "lucide-react";

import { cn } from "@/lib/utils";

interface AccordionContextType {
  type?: "single" | "multiple";
  collapsible?: boolean;
  value?: string | string[];
  onValueChange?: (value: string | string[]) => void;
  expandedItems: Set<string>;
  toggleItem: (value: string) => void;
}

const AccordionContext = createContext<AccordionContextType | undefined>(
  undefined
);

function useAccordion() {
  const context = useContext(AccordionContext);
  if (!context) {
    throw new Error("Accordion components must be used within an Accordion");
  }
  return context;
}

interface AccordionProps {
  type?: "single" | "multiple";
  collapsible?: boolean;
  value?: string | string[];
  defaultValue?: string | string[];
  onValueChange?: (value: string | string[]) => void;
  className?: string;
  children?: React.ReactNode;
}

function Accordion({
  type = "single",
  collapsible = false,
  value,
  defaultValue,
  onValueChange,
  className,
  children,
  ...props
}: AccordionProps) {
  const [internalValue, setInternalValue] = useState<string | string[]>(() => {
    if (value !== undefined) return value;
    if (defaultValue !== undefined) return defaultValue;
    return type === "multiple" ? [] : "";
  });

  const currentValue = value !== undefined ? value : internalValue;
  const expandedItems = new Set(
    Array.isArray(currentValue) ? currentValue : [currentValue].filter(Boolean)
  );

  const toggleItem = (itemValue: string) => {
    let newValue: string | string[];

    if (type === "multiple") {
      const currentArray = Array.isArray(currentValue) ? currentValue : [];
      if (currentArray.includes(itemValue)) {
        newValue = currentArray.filter((v) => v !== itemValue);
      } else {
        newValue = [...currentArray, itemValue];
      }
    } else {
      if (currentValue === itemValue && collapsible) {
        newValue = "";
      } else {
        newValue = itemValue;
      }
    }

    if (value === undefined) {
      setInternalValue(newValue);
    }
    onValueChange?.(newValue);
  };

  return (
    <AccordionContext.Provider
      value={{
        type,
        collapsible,
        value: currentValue,
        onValueChange,
        expandedItems,
        toggleItem,
      }}
    >
      <div data-slot="accordion" className={className} {...props}>
        {children}
      </div>
    </AccordionContext.Provider>
  );
}

interface AccordionItemProps {
  value: string;
  className?: string;
  children?: React.ReactNode;
}

interface AccordionTriggerProps {
  className?: string;
  children?: React.ReactNode;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
}

function AccordionTrigger({
  className,
  children,
  onClick,
  ...props
}: AccordionTriggerProps) {
  const { expandedItems, toggleItem } = useAccordion();
  const accordionItem = React.useContext(AccordionItemContext);

  if (!accordionItem) {
    throw new Error("AccordionTrigger must be used within an AccordionItem");
  }

  const isOpen = expandedItems.has(accordionItem.value);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    toggleItem(accordionItem.value);
    onClick?.(event);
  };

  return (
    <div className="flex">
      <motion.button
        data-slot="accordion-trigger"
        className={cn(
          "focus-visible:border-ring focus-visible:ring-ring/50 flex flex-1 items-start justify-between gap-4 rounded-md py-4 text-left text-sm font-medium transition-all outline-none hover:underline focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50",
          className
        )}
        data-state={isOpen ? "open" : "closed"}
        onClick={handleClick}
        {...props}
      >
        <motion.div
          animate={{ rotate: isOpen ? 0 : 180 }}
          transition={{ duration: 0.25 }}
          className="items-center flex justify-center "
        >
          <ChevronDownIcon className="text-muted-foreground pointer-events-none size-4" />
        </motion.div>
        {children}
      </motion.button>
    </div>
  );
}

interface AccordionContentProps {
  className?: string;
  children?: React.ReactNode;
}

function AccordionContent({
  className,
  children,
  ...props
}: AccordionContentProps) {
  const { expandedItems } = useAccordion();
  const accordionItem = React.useContext(AccordionItemContext);

  if (!accordionItem) {
    throw new Error("AccordionContent must be used within an AccordionItem");
  }

  const isOpen = expandedItems.has(accordionItem.value);

  return (
    <AnimatePresence initial={false}>
      {isOpen && (
        <motion.div
          data-slot="accordion-content"
          className="overflow-hidden text-sm"
          initial="collapsed"
          animate="open"
          exit="collapsed"
          variants={{
            open: { opacity: 1, height: "auto" },
            collapsed: { opacity: 0, height: 0 },
          }}
          transition={{ duration: 0.2, ease: [0.04, 0.62, 0.23, 0.98] }}
          {...props}
        >
          <div className={cn("pt-0 pb-4", className)}>{children}</div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Context for AccordionItem to pass value to children
const AccordionItemContext = createContext<{ value: string } | undefined>(
  undefined
);

// Enhanced AccordionItem with context
function AccordionItemEnhanced({
  value,
  className,
  children,
  ...props
}: AccordionItemProps) {
  return (
    <AccordionItemContext.Provider value={{ value }}>
      <div
        data-slot="accordion-item"
        className={cn("border-b", className)}
        data-value={value}
        {...props}
      >
        {children}
      </div>
    </AccordionItemContext.Provider>
  );
}

export {
  Accordion,
  AccordionItemEnhanced as AccordionItem,
  AccordionTrigger,
  AccordionContent,
};
