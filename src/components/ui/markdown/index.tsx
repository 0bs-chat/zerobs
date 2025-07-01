import React, { memo, useMemo, useCallback, useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import "katex/dist/katex.min.css";
import { MermaidChart } from "./mermaid";
import { Button } from "../button";
import { CopyIcon, TextIcon, WrapTextIcon, CheckIcon } from "lucide-react";
import { createHighlighter, bundledLanguages, type Highlighter } from "shiki";
import { useCopy } from "@/hooks/use-copy";
import { wrapLongLinesAtom } from "@/store/chatStore";
import { useAtom } from "jotai";
import { themeAtom } from "@/store/settings";

// Memoized constants to prevent recreation on every render
const REMARK_PLUGINS = [remarkMath, remarkGfm, remarkBreaks];
const REHYPE_PLUGINS = [rehypeKatex];

const PROSE_STYLE = {
  fontFamily: "Rubik, sans-serif",
} as React.CSSProperties;

// Create a singleton highlighter instance
let highlighterInstance: Highlighter | null = null;
const getHighlighterInstance = async (): Promise<Highlighter> => {
  if (!highlighterInstance) {
    highlighterInstance = await createHighlighter({
      themes: ['catppuccin-mocha'],
      langs: Object.keys(bundledLanguages) // Load all bundled languages
    });
  }
  return highlighterInstance;
};

export const Markdown = memo(
  ({ content, className }: { content: string; className?: string }) => {
    const mermaidChartId = React.useRef(0);
    const { copy, copied } = useCopy({ duration: 500 });
    const [wrapLongLines, setWrapLongLines] = useAtom(wrapLongLinesAtom);
    const [theme] = useAtom(themeAtom);

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
                  wrapLongLines={wrapLongLines}
                  theme={theme}
                >
                  {codeText}
                </CodeBlock>
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
      [copied, wrapLongLines, handleCopy, handleToggleWrap, theme]
    );

    return (
      <div
        className={`prose font-normal max-w-none dark:prose-invert prose-pre:m-0 prose-pre:bg-transparent prose-pre:p-0 ${className || ""}`}
        style={PROSE_STYLE}
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
    theme,
  }: {
    children: string;
    language: string;
    wrapLongLines: boolean;
    theme: string;
  }) => {
    const [highlightedCode, setHighlightedCode] = useState<string>("");
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
      const highlightCode = async () => {
        try {
          const highlighter = await getHighlighterInstance();
          const shikiTheme = theme === "dark" ? "github-dark" : "github-light";
          
          // Try to use the specified language, fallback to 'text' if not supported
          let lang = language;
          const loadedLanguages = highlighter.getLoadedLanguages();
          if (!loadedLanguages.includes(language as any)) {
            lang = 'text';
          }
          
          const html = highlighter.codeToHtml(children, {
            lang: lang as any,
            theme: shikiTheme,
            transformers: []
          });
          
          setHighlightedCode(html);
        } catch (error) {
          console.error('Error highlighting code:', error);
          // Fallback to plain text
          setHighlightedCode(`<pre><code>${children}</code></pre>`);
        } finally {
          setIsLoading(false);
        }
      };

      highlightCode();
    }, [children, language, theme]);

    if (isLoading) {
      return (
        <div className="flex items-center justify-center p-4">
          <div className="text-sm text-muted-foreground">Loading...</div>
        </div>
      );
    }

    return (
      <div
        className={`prose max-w-auto font-mono prose-pre:m-0 prose-pre:bg-transparent prose-pre:p-0 w-full max-w-auto bg-card min-w-0 ${
          wrapLongLines
            ? "syntax-highlighter-wrap"
            : "syntax-highlighter-nowrap"
        }`}
      >
        <div 
          className="p-0 m-0 [&>pre]:p-4 [&>pre]:m-0 [&>pre]:bg-transparent [&>pre]:overflow-x-auto"
          style={{
            whiteSpace: wrapLongLines ? 'pre-wrap' : 'pre',
            wordBreak: wrapLongLines ? 'break-word' : 'normal',
            overflowWrap: wrapLongLines ? 'break-word' : 'normal'
          }}
          dangerouslySetInnerHTML={{ __html: highlightedCode }}
        />
      </div>
    );
  }
);

CodeBlock.displayName = "CodeBlock";
