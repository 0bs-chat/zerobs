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
  atomDark,
  oneLight,
} from "react-syntax-highlighter/dist/esm/styles/prism";
import { useCopy } from "@/hooks/chats/use-copy";
import { wrapLongLinesAtom } from "@/store/chatStore";
import { useAtom, useAtomValue } from "jotai";
import { themeAtom } from "@/store/settings";
import { marked } from "marked";
import rehypeSanitize from "rehype-sanitize";

const sanitizeSchema = {
  tagNames: [
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "p",
    "blockquote",
    "ul",
    "ol",
    "li",
    "strong",
    "em",
    "del",
    "code",
    "pre",
    "hr",
    "br",
    "a",
    "img",
    "table",
    "thead",
    "tbody",
    "tr",
    "th",
    "td",
  ],
  attributes: {
    "*": ["className", "id", "data-theme"],
    a: ["href", "title", "target", "rel"],
    img: ["src", "alt", "title", "width", "height"],
    card: ["title", "subtext", "largeText", "id", "caption"],
    financialchart: ["*"],
  },
  protocols: {
    href: ["http", "https", "mailto"],
    src: ["http", "https"],
  },
};

function parseMarkdownIntoBlocks(markdown: string): string[] {
  const tokens = marked.lexer(markdown);
  return tokens.map((token) => token.raw);
}

export const MarkdownBlock = memo(
  ({ content, className }: { content: string; className?: string }) => {
    const mermaidChartId = React.useRef(0);
    const { copy, copied } = useCopy({ duration: 1000 });
    const [wrapLongLines, setWrapLongLines] = useAtom(wrapLongLinesAtom);
    const theme = useAtomValue(themeAtom);
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
              <div className="my-2 flex flex-col overflow-auto rounded-md bg-card">
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
                        <TextIcon className="h-4 w-4" />
                      ) : (
                        <WrapTextIcon className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleCopy}
                      className={copied ? "text-green-500" : ""}
                    >
                      {copied ? (
                        <CheckIcon className="h-4 w-4" />
                      ) : (
                        <CopyIcon className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                <SyntaxHighlighter
                  {...props}
                  PreTag="div"
                  customStyle={customStyle}
                  language={language}
                  style={theme === "light" ? oneLight : atomDark}
                >
                  {children}
                </SyntaxHighlighter>
              </div>
            ) : (
              <span className="rounded-md bg-muted p-1 font-mono text-sm font-medium">
                {children}
              </span>
            )
          ) : (
            <code className={className} />
          );
        },
      }),
      [copy, copied, wrapLongLines, setWrapLongLines, theme]
    );

    return (
      <article
        className={`prose max-w-none dark:prose-invert prose-pre:m-0 prose-pre:bg-transparent
          prose-pre:p-0 prose-h1:mb-2 prose-h2:mb-2 prose-h3:mb-2 prose-h3:mt-6 prose-h4:my-2 prose-h5:my-2 prose-h6:my-2
          prose-p:mt-2 prose-hr:my-12 prose-hr:border-primary/20 prose-blockquote:border-primary/20 prose-blockquote:text-muted-foreground/70
          ${className}`}
        style={{
          fontFamily: "Rubik",
          wordBreak: "break-word",
        }}
      >
        <ReactMarkdown
          remarkPlugins={[remarkMath, remarkGfm, remarkBreaks]}
          rehypePlugins={[
            [rehypeSanitize, sanitizeSchema],
            [rehypeKatex, { output: "html" }],
          ]}
          components={components}
        >
          {content}
        </ReactMarkdown>
      </article>
    );
  }
);

MarkdownBlock.displayName = "MarkdownBlock";

export const Markdown = memo(
  ({
    content,
    id,
    className,
  }: {
    content: string;
    id: string;
    className?: string;
  }) => {
    const blocks = useMemo(() => parseMarkdownIntoBlocks(content), [content]);

    return blocks.map((block, index) => (
      <MarkdownBlock
        content={block}
        key={`block_${id}_${index}`}
        className={className}
      />
    ));
  }
);

Markdown.displayName = "Markdown";
