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
import { atomDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { marked } from "marked";
import { useCopy } from "@/hooks/use-copy";
import { wrapLongLinesAtom } from "@/store/chatStore";
import { useAtom } from "jotai";

// Parse markdown into discrete blocks for memoization
function parseMarkdownIntoBlocks(markdown: string): string[] {
  try {
    const tokens = marked.lexer(markdown);
    return tokens.map((token) => token.raw);
  } catch (error) {
    // Fallback: if parsing fails, return the whole content as a single block
    return [markdown];
  }
}

// Memoized markdown block component
const MemoizedMarkdownBlock = memo(
  ({ content, className }: { content: string; className?: string }) => {
    const mermaidChartId = React.useRef(0);
    const { copy, copied } = useCopy({ duration: 1000 });
    const [wrapLongLines, setWrapLongLines] = useAtom(wrapLongLinesAtom);

    const customStyle = useMemo(
      () => ({
        backgroundColor: "transparent",
        padding: "0.5rem",
        margin: "0",
        wrapLongLines: wrapLongLines,
      }),
      [wrapLongLines]
    );

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
              <div className="flex flex-col bg-card rounded-md overflow-auto">
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
                  customStyle={customStyle}
                  language={language}
                  style={atomDark}
                >
                  {children}
                </SyntaxHighlighter>
              </div>
            ) : (
              <code
                className="bg-muted px-1 py-0.5 rounded-md text-sm"
                {...props}
              >
                {children}
              </code>
            )
          ) : (
            <code className={className} {...props} />
          );
        },
        pre({ children, ...props }: any) {
          if (
            React.isValidElement(children) &&
            children.type === MermaidChart
          ) {
            return <>{children}</>;
          }
          return (
            <pre className="bg-card p-0 rounded-md overflow-auto" {...props}>
              {children}
            </pre>
          );
        },
        blockquote({ children, ...props }: any) {
          return (
            <blockquote
              className="border-l-4 border-primary pl-4 italic text-muted-foreground"
              {...props}
            >
              {children}
            </blockquote>
          );
        },
        table({ children, ...props }: any) {
          return (
            <div className="overflow-auto">
              <table
                className="border-collapse border border-border w-full"
                {...props}
              >
                {children}
              </table>
            </div>
          );
        },
        th({ children, ...props }: any) {
          return (
            <th
              className="border border-border px-4 py-2 bg-muted font-semibold text-left"
              {...props}
            >
              {children}
            </th>
          );
        },
        td({ children, ...props }: any) {
          return (
            <td className="border border-border px-4 py-2" {...props}>
              {children}
            </td>
          );
        },
      }),
      [copy, copied, wrapLongLines, setWrapLongLines]
    );

    return (
      <div
        className={`prose prose-default font-normal max-w-none dark:prose-invert ${className || ""}`}
        style={{
          fontFamily: "Rubik, sans-serif",
        }}
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
  },
  (prevProps, nextProps) => {
    // Only re-render if content actually changed
    return (
      prevProps.content === nextProps.content &&
      prevProps.className === nextProps.className
    );
  }
);

MemoizedMarkdownBlock.displayName = "MemoizedMarkdownBlock";

// Main memoized markdown component
export const Markdown = memo(
  ({
    content,
    className,
    id,
  }: {
    content: string;
    className?: string;
    id?: string;
  }) => {
    const blocks = useMemo(() => parseMarkdownIntoBlocks(content), [content]);

    return (
      <>
        {blocks.map((block, index) => (
          <MemoizedMarkdownBlock
            content={block}
            className={className}
            key={id ? `${id}-block_${index}` : `block_${index}`}
          />
        ))}
      </>
    );
  }
);

Markdown.displayName = "Markdown";
