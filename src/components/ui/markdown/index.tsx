import React, { memo, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import "katex/dist/katex.min.css";
import { MermaidChart } from "./mermaid";
import { Button } from "../button";
import { CopyIcon, TextIcon, WrapTextIcon, CheckIcon } from "lucide-react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import {
  oneDark,
  oneLight,
} from "react-syntax-highlighter/dist/esm/styles/prism";
import { useCopy } from "@/hooks/use-copy";
import { themeAtom, wrapLongLinesAtom } from "@/store/chatStore";
import { useAtom } from "jotai";

export const Markdown = memo(
  ({ content, className }: { content: string; className?: string }) => {
    const mermaidChartId = React.useRef(0);
    const { copy, copied } = useCopy({ duration: 1000 });
    const [wrapLongLines, setWrapLongLines] = useAtom(wrapLongLinesAtom);
    const [theme] = useAtom(themeAtom);
    console.log(theme);
    const codeTheme = theme === "dark" ? oneDark : oneLight;

    const components = useMemo(
      () => ({
        code({ inline, className, children, ...props }: any) {
          const match = /language-(\w+)/.exec(className || "");
          const isCodeBlock = String(children).split("\n").length > 1;
          const language = match ? match[1] : isCodeBlock ? "text" : null;

          const handleCopy = () => {
            copy(String(children).replace(/\n$/, ""));
          };

          return !inline ? (
            language === "mermaid" ? (
              <MermaidChart
                chart={String(children).replace(/\n$/, "")}
                id={`chart-${++mermaidChartId.current}`}
              />
            ) : language ? (
              <div className="flex flex-col bg-card rounded-md overflow-x-auto my-2">
                <div className="flex items-center justify-between rounded-t bg-secondary px-2 py-1 text-sm text-secondary-foreground">
                  <span className="text-sm text-muted-foreground">
                    {language}
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setWrapLongLines(!wrapLongLines)}
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
                      onClick={handleCopy}
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
                <SyntaxHighlighter
                  {...props}
                  PreTag="div"
                  customStyle={{
                    backgroundColor: "transparent",
                    background: "transparent",
                    padding: "0.5rem",
                    margin: "0",
                  }}
                  language={language}
                  style={codeTheme}
                  lineProps={{
                    className: "bg-card font-mono overflow-x-auto ",
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
      [copy, copied, wrapLongLines]
    );

    return (
      <div
        className={`prose font-normal max-w-full dark:prose-invert prose-pre:m-0 prose-pre:bg-transparent prose-pre:p-0 ${className || ""}`}
        style={
          {
            fontFamily: "Rubik, sans-serif",
          } as React.CSSProperties
        }
      >
        <ReactMarkdown
          remarkPlugins={[remarkMath, remarkGfm, remarkBreaks]}
          rehypePlugins={[rehypeKatex]}
          components={components}
        >
          {content}
        </ReactMarkdown>
      </div>
    );
  }
);

Markdown.displayName = "Markdown";
