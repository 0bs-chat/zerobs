import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  XIcon,
  CopyIcon,
  CheckIcon,
  ExternalLinkIcon,
  EyeIcon,
  CodeIcon,
} from "lucide-react";
import { Markdown } from "@/components/ui/markdown";
import { MermaidChart } from "@/components/ui/markdown/mermaid";
import type { Artifact } from "./utils";
import { useState, useEffect } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import {
  atomDark,
  oneLight,
} from "react-syntax-highlighter/dist/esm/styles/prism";
import { useAtomValue } from "jotai";
import { themeAtom } from "@/store/settings";

const prepareReactCode = (code: string): string => {
  const importRegex = /import\s+(.*?)\s+from\s+['"](.*?)['"];?/g;
  const importedIdentifiers = new Set<string>();

  const codeWithoutImportsAndExports = code
    .replace(importRegex, (match, specifiers, module) => {
      if (
        module !== "react" &&
        module !== "react-dom" &&
        !module.startsWith("https://")
      ) {
        if (specifiers) {
          specifiers
            .replace(/\{|\}/g, "")
            .split(",")
            .forEach((spec: string) => {
              const trimmed = spec.trim();
              if (trimmed) {
                // handles "MyComponent as MyAlias"
                const asParts = trimmed.split(/\s+as\s+/);
                const identifier = asParts[asParts.length - 1];
                if (identifier && identifier !== "default") {
                  importedIdentifiers.add(identifier);
                }
              }
            });
        }
      }
      // Remove all imports except for http-based ones for CDNs
      if (!module.startsWith("https://")) {
        return "";
      }
      return match;
    })
    .replace(/export\s+default\s+App;?/, "");

  const mockDefinitions = Array.from(importedIdentifiers)
    .map(
      (id) =>
        `const ${id} = ({ children, ...props }) => {
      const style = {
        border: '1px dashed #d8dde7',
        padding: '0.5rem',
        margin: '0.25rem',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '0.25rem',
        color: '#4b5563'
      };
      // Simple mock: render a box with the component name.
      return <div style={style} {...props}><strong>${id}</strong>{children && <span style={{ marginLeft: '0.25rem' }}>{children}</span>}</div>;
    };`
    )
    .join("\n");

  return mockDefinitions + "\n" + codeWithoutImportsAndExports;
};

const ReactComponentRenderer = ({ content }: { content: string }) => {
  const processedCode = prepareReactCode(content);

  const iframeContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <script src="https://cdn.tailwindcss.com"></script>
        <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
        <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
        <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
        <style>
          html, body, #root {
            height: 100%;
            margin: 0;
          }
          body {
            font-family: Rubik, system-ui, -apple-system, sans-serif; 
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
            background:rgb(233, 220, 220);
            box-sizing: border-box;
          }
        </style>
      </head>
      <body>
        <div id="root">Loading...</div>
        <script type="text/babel">
          console.log('Starting React component render...');
          
          try {
            // Check if React is loaded
            if (typeof React === 'undefined') {
              throw new Error('React is not loaded');
            }
            if (typeof ReactDOM === 'undefined') {
              throw new Error('ReactDOM is not loaded');
            }
            
            const { useState, useEffect, useReducer, useCallback, useMemo, useRef, Fragment } = React;
            
            // Component code injection
            ${processedCode}
            
            // Check if App component is defined
            if (typeof App === 'undefined') {
              throw new Error('App component is not defined. Make sure your component exports a function named "App".');
            }
            
            console.log('Rendering App component...');
            const root = ReactDOM.createRoot(document.getElementById('root'));
            root.render(React.createElement(App));
            
          } catch (e) {
            console.error('React render error:', e);
            const root = ReactDOM.createRoot(document.getElementById('root'));
            root.render(
              React.createElement('div', {
                style: { 
                  color: '#dc2626', 
                  padding: '20px', 
                  backgroundColor: '#fef2f2', 
                  border: '1px solid #fecaca', 
                  borderRadius: '8px',
                  fontFamily: 'monospace',
                  fontSize: '14px'
                }
              }, [
                React.createElement('h4', { key: 'title' }, 'React Component Error:'),
                React.createElement('pre', { 
                  key: 'error',
                  style: { 
                    whiteSpace: 'pre-wrap', 
                    wordBreak: 'break-word',
                    marginTop: '10px',
                    fontSize: '12px'
                  }
                }, e.message || String(e))
              ])
            );
          }
        </script>
      </body>
    </html>
  `;

  return (
    <iframe
      srcDoc={iframeContent}
      className="w-full h-full"
      title="React Preview"
      sandbox="allow-scripts allow-same-origin"
    />
  );
};

const HTMLRenderer = ({ content }: { content: string }) => {
  return (
    <iframe
      srcDoc={content}
      className="w-full h-full"
      title="HTML Preview"
      sandbox="allow-scripts allow-same-origin"
    />
  );
};

const CodeRenderer = ({
  content,
  language,
}: {
  content: string;
  language?: string;
}) => {
  const theme = useAtomValue(themeAtom);
  return (
    <div className="flex flex-col h-full border text-card-foreground overflow-x-auto text-sm">
      <SyntaxHighlighter
        customStyle={{
          backgroundColor: "transparent",
          padding: "1rem",
          margin: "0",
          height: "100%",
        }}
        language={language || "text"}
        style={theme === "light" ? oneLight : atomDark}
        wrapLines={true}
      >
        {content}
      </SyntaxHighlighter>
    </div>
  );
};

const SVGRenderer = ({ content }: { content: string }) => {
  return (
    <div className="border p-4 bg-background flex items-center justify-center">
      <div dangerouslySetInnerHTML={{ __html: content }} />
    </div>
  );
};

const MarkdownRenderer = ({ content }: { content: string }) => {
  return (
    <div className="h-full border p-4 bg-background overflow-y-auto">
      <Markdown
        content={content}
        id={`artifact-${Date.now()}`}
        className="text-sm text-muted-foreground"
      />
    </div>
  );
};

const MermaidRenderer = ({ content }: { content: string }) => {
  return (
    <div className="border p-4 bg-background">
      <MermaidChart chart={content} id={`artifact-${Date.now()}`} />
    </div>
  );
};

const renderArtifactContent = (
  artifact: Artifact,
  view: "preview" | "source"
) => {
  if (view === "source" && artifact.type !== "application/vnd.ant.code") {
    let language = artifact.language;
    if (!language) {
      switch (artifact.type) {
        case "application/vnd.ant.react":
          language = "jsx";
          break;
        case "text/html":
          language = "html";
          break;
        case "text/markdown":
          language = "markdown";
          break;
        case "image/svg+xml":
          language = "xml";
          break;
        case "application/vnd.ant.mermaid":
          language = "mermaid";
          break;
      }
    }
    return <CodeRenderer content={artifact.content} language={language} />;
  }

  switch (artifact.type) {
    case "application/vnd.ant.react":
      return <ReactComponentRenderer content={artifact.content} />;
    case "text/html":
      return <HTMLRenderer content={artifact.content} />;
    case "application/vnd.ant.code":
      return (
        <CodeRenderer content={artifact.content} language={artifact.language} />
      );
    case "text/markdown":
      return <MarkdownRenderer content={artifact.content} />;
    case "image/svg+xml":
      return <SVGRenderer content={artifact.content} />;
    case "application/vnd.ant.mermaid":
      return <MermaidRenderer content={artifact.content} />;
    default:
      return <MarkdownRenderer content={artifact.content} />;
  }
};

export const ArtifactViewer = ({
  artifact,
  onClose,
}: {
  artifact: Artifact;
  onClose: () => void;
}) => {
  const [copied, setCopied] = useState(false);
  const [view, setView] = useState<"preview" | "source">("source");

  useEffect(() => {
    if (artifact.type === "application/vnd.ant.code") {
      setView("source");
    } else {
      setView("preview");
    }
  }, [artifact.type, artifact.id]);

  const handleCopy = () => {
    navigator.clipboard.writeText(artifact.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1000);
  };

  const handleOpenInNewTab = () => {
    if (artifact.type === "text/html") {
      const newWindow = window.open();
      if (newWindow) {
        newWindow.document.write(artifact.content);
        newWindow.document.close();
      }
    }
  };

  return (
    <div className="w-full h-full grid grid-rows-[auto_1fr]">
      {/* Header */}
      <div className="flex items-center justify-between p-1 pl-3">
        <h2 className="text-lg font-semibold">{artifact.title}</h2>

        <div className="flex items-center gap-1">
          {artifact.type !== "application/vnd.ant.code" && (
            <Tabs
              value={view}
              onValueChange={(v) => setView(v as "preview" | "source")}
            >
              <TabsList>
                <TabsTrigger value="preview">
                  <EyeIcon className="w-4 h-4" />
                </TabsTrigger>
                <TabsTrigger value="source">
                  <CodeIcon className="w-4 h-4" />
                </TabsTrigger>
              </TabsList>
            </Tabs>
          )}

          {artifact.type === "text/html" && (
            <Button variant="outline" size="icon" onClick={handleOpenInNewTab}>
              <ExternalLinkIcon className="w-4 h-4" />
            </Button>
          )}
          <Button variant="outline" size="icon" onClick={handleCopy}>
            {copied ? (
              <CheckIcon className="w-4 h-4" />
            ) : (
              <CopyIcon className="w-4 h-4" />
            )}
          </Button>
          <Button variant="outline" size="icon" onClick={onClose}>
            <XIcon className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="min-h-0 min-w-0">
        {renderArtifactContent(artifact, view)}
      </div>
    </div>
  );
};
