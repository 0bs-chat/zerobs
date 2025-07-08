"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { motion, AnimatePresence } from "motion/react";

import { cn } from "@/lib/utils";

function Tabs({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn("flex flex-col gap-2", className)}
      {...props}
    />
  );
}

function TabsList({
  className,
  children,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  const [indicatorStyle, setIndicatorStyle] = React.useState({ left: 0, width: 0 });
  const listRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const updateIndicator = () => {
      if (!listRef.current) return;
      
      const activeElement = listRef.current.querySelector('[data-state="active"]') as HTMLElement;
      if (activeElement) {
        const listRect = listRef.current.getBoundingClientRect();
        const activeRect = activeElement.getBoundingClientRect();
        
        setIndicatorStyle({
          left: activeRect.left - listRect.left,
          width: activeRect.width,
        });
      }
    };

    updateIndicator();
    
    // Use ResizeObserver to handle dynamic sizing
    const resizeObserver = new ResizeObserver(updateIndicator);
    if (listRef.current) {
      resizeObserver.observe(listRef.current);
    }

    // Also listen for tab changes
    const interval = setInterval(updateIndicator, 100);

    return () => {
      resizeObserver.disconnect();
      clearInterval(interval);
    };
  }, [children]);

  return (
    <TabsPrimitive.List
      ref={listRef}
      data-slot="tabs-list"
      className={cn(
        "bg-muted text-muted-foreground inline-flex h-9 w-fit items-center justify-center rounded-lg p-[3px] relative",
        className,
      )}
      {...props}
    >
      {/* Animated background indicator */}
      <motion.div
        className="absolute bg-background dark:bg-input/30 rounded-md shadow-sm z-0"
        style={{
          height: "calc(100% - 6px)",
          top: "3px",
        }}
        animate={{
          left: indicatorStyle.left,
          width: indicatorStyle.width,
        }}
        transition={{
          type: "spring",
          stiffness: 500,
          damping: 30,
        }}
      />
      {children}
    </TabsPrimitive.List>
  );
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  const [isActive, setIsActive] = React.useState(false);
  
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "data-[state=active]:bg-transparent dark:data-[state=active]:text-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-ring dark:data-[state=active]:border-transparent dark:data-[state=active]:bg-transparent text-foreground dark:text-muted-foreground inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-2 py-1 text-sm font-medium whitespace-nowrap transition-[color,box-shadow] focus-visible:ring-[3px] focus-visible:outline-1 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:shadow-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 relative z-10",
        className,
      )}
      onFocus={() => setIsActive(true)}
      onBlur={() => setIsActive(false)}
      {...props}
    >
      <motion.span
        initial={{ scale: 0.95, opacity: 0.8 }}
        animate={{ 
          scale: isActive ? 1.02 : 1, 
          opacity: 1,
        }}
        transition={{ 
          duration: 0.2, 
          ease: "easeOut"
        }}
      >
        {props.children}
      </motion.span>
    </TabsPrimitive.Trigger>
  );
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <AnimatePresence mode="wait">
      <TabsPrimitive.Content
        data-slot="tabs-content"
        className={cn("flex-1 outline-none", className)}
        {...props}
        asChild
      >
        <motion.div
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          transition={{
            duration: 0.2,
            ease: "easeInOut"
          }}
        >
          {props.children}
        </motion.div>
      </TabsPrimitive.Content>
    </AnimatePresence>
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
