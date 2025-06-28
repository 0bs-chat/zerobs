import React, { memo, useMemo, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import "katex/dist/katex.min.css";
import { MermaidChart } from "./mermaid";
import { Button } from "../button";
import { CopyIcon, TextIcon, WrapTextIcon, CheckIcon } from "lucide-react";
import { PrismAsyncLight as SyntaxHighlighter } from "react-syntax-highlighter";

import {
  oneDark,
  oneLight,
} from "react-syntax-highlighter/dist/esm/styles/prism";
import { useCopy } from "@/hooks/use-copy";
import { themeAtom, wrapLongLinesAtom } from "@/store/chatStore";
import { useAtom } from "jotai";

// Memoized constants to prevent recreation on every render
const CUSTOM_STYLE = {
  backgroundColor: "transparent",
  background: "transparent",
} as const;

const REMARK_PLUGINS = [remarkMath, remarkGfm, remarkBreaks];
const REHYPE_PLUGINS = [rehypeKatex];

const PROSE_STYLE = {
  fontFamily: "Rubik, sans-serif",
} as React.CSSProperties;

export const Markdown = memo(
  ({ content, className }: { content: string; className?: string }) => {
    const mermaidChartId = React.useRef(0);
    const { copy, copied } = useCopy({ duration: 500 });
    const [wrapLongLines, setWrapLongLines] = useAtom(wrapLongLinesAtom);

    const handleCopy = useCallback(
      (text: string) => {
        copy(text);
      },
      [copy]
    );

    const handleToggleWrap = useCallback(() => {
      setWrapLongLines(!wrapLongLines);
    }, [wrapLongLines, setWrapLongLines]);

    const components = useMemo(
      () => ({
        code({ inline, className, children }: any) {
          const match = /language-(\w+)/.exec(className || "");
          const isCodeBlock = String(children).split("\n").length > 1;
          const language = match ? match[1] : isCodeBlock ? "text" : null;
          const codeText = String(children).replace(/\n$/, "");

          return !inline ? (
            language === "mermaid" ? (
              <MermaidChart
                chart={codeText}
                id={`chart-${++mermaidChartId.current}`}
              />
            ) : language ? (
              <div className="flex flex-col overflow-hidden bg-card rounded-md max-w-full">
                <div className="flex items-center justify-between rounded-t-md bg-accent px-2 py-1 text-secondary-foreground ">
                  <span className="text-sm text-muted-foreground">
                    {language}
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleToggleWrap}
                    >
                      {wrapLongLines ? (
                        <TextIcon className="w-4 h-4" />
                      ) : (
                        <WrapTextIcon className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleCopy(codeText)}
                      className={copied ? "text-green-500" : ""}
                    >
                      {copied ? (
                        <CheckIcon className="w-4 h-4" />
                      ) : (
                        <CopyIcon className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
                <CodeBlock
                  language={language}
                  style={atomDark}
                  lineProps={{
                    style: { wordBreak: "break-all", whiteSpace: "pre-wrap" },
                  }}
                  wrapLines={wrapLongLines}
                >
                  {children}
                </SyntaxHighlighter>
              </div>
            ) : (
              <span className="bg-muted p-1 font-mono font-medium rounded-md text-sm">
                {children}
              </span>
            )
          ) : (
            <code className={className} />
          );
        },
      }),
      [copied, wrapLongLines, handleCopy, handleToggleWrap]
    );

    return (
      <div
        className={`prose font-normal max-w-none dark:prose-invert prose-pre:m-0 prose-pre:bg-transparent prose-pre:p-0 ${className || ""}`}
        style={
          {
            fontFamily: "Rubik, sans-serif",
          } as React.CSSProperties
        }
      >
        <ReactMarkdown
          remarkPlugins={REMARK_PLUGINS}
          rehypePlugins={REHYPE_PLUGINS}
          components={components}
        >
          {content}
        </ReactMarkdown>
      </div>
    );
  }
);

Markdown.displayName = "Markdown";

const CodeBlock = memo(
  ({
    children,
    language,
    wrapLongLines,
  }: {
    children: string;
    language: string;
    wrapLongLines: boolean;
  }) => {
    const [theme] = useAtom(themeAtom);
    const codeTheme = theme === "dark" ? oneDark : oneLight;

    return (
      <div
        className={`prose max-w-auto font-mono prose-pre:m-0 prose-pre:bg-transparent prose-pre:p-0 w-full max-w-auto bg-card min-w-0 ${
          wrapLongLines
            ? "syntax-highlighter-wrap"
            : "syntax-highlighter-nowrap"
        }`}
      >
        <SyntaxHighlighter
          PreTag="div"
          customStyle={CUSTOM_STYLE}
          language={language}
          style={codeTheme}
          lineProps={{
            className: "bg-card",
          }}
          wrapLines={true}
          wrapLongLines={true}
        >
          {children}
        </SyntaxHighlighter>
      </div>
    );
  }
);
