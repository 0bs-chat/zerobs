import { themeAtom } from "@/store/settings";
import { useAtomValue } from "jotai";
import { memo, useEffect, useRef, useState } from "react";
import { TransformComponent, TransformWrapper } from "react-zoom-pan-pinch";

export const MermaidChart = memo(
  ({ chart, id }: { chart: string; id: string }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const isDark = useAtomValue(themeAtom) === "dark";
    const [mermaidHTML, setMermaidHTML] = useState<string | null>(null);

    useEffect(() => {
      (async () => {
        try {
          const mermaid = await import("mermaid");

          // Hardcoded colors based on globals.css
          const lightTheme = {
            primary: "#10b981", // Green equivalent of oklch(0.5234 0.1347 144.1672)
            primaryText: "#1f2937", // Dark gray for text on light backgrounds
            background: "#fefefe", // Near white equivalent of oklch(0.9711 0.0074 80.7211)
            foreground: "#1f2937", // Dark gray equivalent of oklch(0.3 0.0358 30.2042)
            border: "#e5e7eb", // Light gray equivalent of oklch(0.8805 0.0208 74.6428)
            muted: "#f3f4f6", // Light gray equivalent of oklch(0.937 0.0142 74.4218)
            secondary: "#f0fdf4", // Very light green equivalent of oklch(0.9571 0.021 147.636)
          };

          const darkTheme = {
            primary: "#10b981", // Green equivalent of oklch(0.4365 0.1044 156.7556)
            primaryText: "#ecfdf5", // Light green equivalent of oklch(0.9213 0.0135 167.1556)
            background: "#000000", // Black
            foreground: "#f9fafb", // Near white equivalent of oklch(0.9288 0.0126 255.5078)
            border: "#374151", // Dark gray equivalent of oklch(0.2264 0 0)
            muted: "#1f2937", // Dark gray equivalent of oklch(0.2393 0 0)
            secondary: "#111827", // Very dark gray equivalent of oklch(0.2603 0 0)
          };

          const colors = isDark ? darkTheme : lightTheme;

          mermaid.default.initialize({
            startOnLoad: false,
            securityLevel: "loose",
            suppressErrorRendering: true,
            theme: "base",
            themeVariables: {
              primaryColor: colors.primary,
              primaryTextColor: colors.primaryText,
              primaryBorderColor: colors.border,
              lineColor: colors.border,
              secondaryColor: colors.secondary,
              tertiaryColor: colors.muted,
              background: colors.background,
              mainBkg: colors.background,
              secondBkg: colors.muted,
              tertiaryBkg: colors.muted,
              // Text colors
              textColor: colors.foreground,
              mainContrastColor: colors.foreground,
              darkTextColor: colors.foreground,
              altBackground: colors.muted,
              // Node colors
              nodeBkg: colors.primary,
              nodeTextColor: colors.primaryText,
              // Edge colors
              edgeLabelBackground: colors.background,
              // Class diagram colors
              classText: colors.foreground,
            },
          });

          const { svg } = await mermaid.default.render(
            `mermaid-${id}-${isDark ? "dark" : "light"}`,
            chart,
          );
          setMermaidHTML(svg);
          setError(null);
        } catch (err) {
          setMermaidHTML(null);
          setError(
            err instanceof Error ? err.message : "Failed to render diagram",
          );
        } finally {
          setIsLoading(false);
        }
      })();
    }, [chart, id, isDark]);

    if (error) {
      return (
        <div className="flex items-center justify-center p-8 text-destructive">
          <div className="text-center">
            <p className="font-medium">Failed to render diagram</p>
            <p className="text-muted-foreground text-sm">{error}</p>
          </div>
        </div>
      );
    }

    if (isLoading) {
      return (
        <div className="flex items-center justify-center p-8">
          <div className="h-8 w-8 animate-spin rounded-full border-primary border-b-2" />
        </div>
      );
    }

    return (
      <div className="w-full [&>.react-transform-wrapper]:!w-full">
        <TransformWrapper
          initialScale={1}
          minScale={0.5}
          maxScale={3}
          doubleClick={{ disabled: false, mode: "reset" }}
          wheel={{ step: 0.1 }}
          panning={{ velocityDisabled: true }}
          limitToBounds={false}
        >
          <TransformComponent
            wrapperClass="flex items-center justify-center bg-background p-4 h-96 overflow-hidden"
            contentClass="max-w-full"
          >
            <div
              ref={containerRef}
              className="max-w-full"
              // biome-ignore lint/security/noDangerouslySetInnerHtml: <explanation>
              dangerouslySetInnerHTML={{ __html: mermaidHTML ?? "" }}
            />
          </TransformComponent>
        </TransformWrapper>
      </div>
    );
  },
);

MermaidChart.displayName = "MermaidChart";
