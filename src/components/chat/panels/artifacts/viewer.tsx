import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  XIcon, 
  CopyIcon, 
  CheckIcon,
  ExternalLinkIcon,
} from "lucide-react";
import { useCopy } from "@/hooks/use-copy";
import { Markdown } from "@/components/ui/markdown";
import { MermaidChart } from "@/components/ui/markdown/mermaid";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { atomDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import type { Artifact } from "./index";

interface ArtifactViewerProps {
  artifact: Artifact;
  onClose: () => void;
}

const prepareReactCode = (code: string): string => {
  const withoutImports = code.replace(/import\s+(?:React(?:,\s*)?)?(?:\{[^}]*\})?\s+from\s+['"]react['"];?/g, '');
  const withoutExports = withoutImports.replace(/export\s+default\s+App;?/, '');
  return withoutExports;
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
          body { 
            margin: 0; 
            padding: 16px;
            font-family: Inter, system-ui, -apple-system, sans-serif; 
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
            background: white;
          }
          #root {
            min-height: 100%;
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
    <div className="space-y-4">
       <div className="border rounded-lg p-1">
        <Badge variant="secondary" className="mb-2">
          Live Preview
        </Badge>
        <p className="text-xs text-muted-foreground px-1 pb-2">
          Note: This is a sandboxed preview. Imports for external libraries are not supported yet.
          {processedCode.length === 0 && (
            <span className="text-red-500 block mt-1">⚠️ No valid React code found after processing</span>
          )}
        </p>
        <div className="border rounded bg-white">
          <iframe
            srcDoc={iframeContent}
            className="w-full h-96 border-0 rounded"
            title="React Preview"
            sandbox="allow-scripts allow-same-origin"
            onLoad={(e) => {
              console.log('Iframe loaded');
              const iframe = e.target as HTMLIFrameElement;
              try {
                console.log('Iframe content window:', iframe.contentWindow);
              } catch (err) {
                console.log('Cannot access iframe content:', err);
              }
            }}
          />
        </div>
      </div>
      <div>
        <Badge variant="outline" className="mb-2">
          Source Code
        </Badge>
        <SyntaxHighlighter
          language="jsx"
          style={atomDark}
          customStyle={{
            backgroundColor: "transparent",
            padding: "1rem",
            fontSize: "0.875rem",
            maxHeight: "300px",
          }}
        >
          {content}
        </SyntaxHighlighter>
      </div>
    </div>
  );
};

const HTMLRenderer = ({ content }: { content: string }) => {
  return (
    <div className="space-y-4">
      <div className="border rounded-lg p-1">
        <Badge variant="secondary" className="mb-2">
          Live Preview
        </Badge>
        <div className="border rounded bg-white">
          <iframe
            srcDoc={content}
            className="w-full h-96 border-0 rounded"
            title="HTML Preview"
            sandbox="allow-scripts allow-same-origin"
          />
        </div>
      </div>
      <div>
        <Badge variant="outline" className="mb-2">
          Source Code
        </Badge>
        <SyntaxHighlighter
          language="html"
          style={atomDark}
          customStyle={{
            backgroundColor: "transparent",
            padding: "1rem",
            fontSize: "0.875rem",
            maxHeight: "300px",
          }}
        >
          {content}
        </SyntaxHighlighter>
      </div>
    </div>
  );
};

const CodeRenderer = ({ content, language }: { content: string; language?: string }) => {
  return (
    <SyntaxHighlighter
      language={language || "text"}
      style={atomDark}
      customStyle={{
        backgroundColor: "transparent",
        padding: "1rem",
        fontSize: "0.875rem",
      }}
      showLineNumbers
    >
      {content}
    </SyntaxHighlighter>
  );
};

const SVGRenderer = ({ content }: { content: string }) => {
  return (
    <div className="space-y-4">
      <div className="border rounded-lg p-4 bg-background flex items-center justify-center">
        <div dangerouslySetInnerHTML={{ __html: content }} />
      </div>
      <div>
        <Badge variant="outline" className="mb-2">
          SVG Code
        </Badge>
        <SyntaxHighlighter
          language="xml"
          style={atomDark}
          customStyle={{
            backgroundColor: "transparent",
            padding: "1rem",
            fontSize: "0.875rem",
            maxHeight: "200px",
          }}
        >
          {content}
        </SyntaxHighlighter>
      </div>
    </div>
  );
};

const MarkdownRenderer = ({ content }: { content: string }) => {
  return (
    <div className="space-y-4">
      <div className="border rounded-lg p-4 bg-background">
        <Badge variant="secondary" className="mb-2">
          Rendered Preview
        </Badge>
        <Markdown content={content} />
      </div>
      <div>
        <Badge variant="outline" className="mb-2">
          Markdown Source
        </Badge>
        <SyntaxHighlighter
          language="markdown"
          style={atomDark}
          customStyle={{
            backgroundColor: "transparent",
            padding: "1rem",
            fontSize: "0.875rem",
            maxHeight: "200px",
          }}
        >
          {content}
        </SyntaxHighlighter>
      </div>
    </div>
  );
};

const MermaidRenderer = ({ content }: { content: string }) => {
  return (
    <div className="space-y-4">
      <div className="border rounded-lg p-4 bg-background">
        <Badge variant="secondary" className="mb-2">
          Diagram Preview
        </Badge>
        <MermaidChart chart={content} id={`artifact-${Date.now()}`} />
      </div>
      <div>
        <Badge variant="outline" className="mb-2">
          Mermaid Code
        </Badge>
        <SyntaxHighlighter
          language="mermaid"
          style={atomDark}
          customStyle={{
            backgroundColor: "transparent",
            padding: "1rem",
            fontSize: "0.875rem",
          }}
        >
          {content}
        </SyntaxHighlighter>
      </div>
    </div>
  );
};

const renderArtifactContent = (artifact: Artifact) => {
  switch (artifact.type) {
    case "application/vnd.ant.react":
      return <ReactComponentRenderer content={artifact.content} />;
    case "text/html":
      return <HTMLRenderer content={artifact.content} />;
    case "application/vnd.ant.code":
      return <CodeRenderer content={artifact.content} language={artifact.language} />;
    case "text/markdown":
      return <MarkdownRenderer content={artifact.content} />;
    case "image/svg+xml":
      return <SVGRenderer content={artifact.content} />;
    case "application/vnd.ant.mermaid":
      return <MermaidRenderer content={artifact.content} />;
    default:
      return <CodeRenderer content={artifact.content} language="text" />;
  }
};

const getTypeName = (type: string, language?: string): string => {
  switch (type) {
    case "application/vnd.ant.react":
      return "React Component";
    case "text/html":
      return "HTML Page";
    case "application/vnd.ant.code":
      return language ? `${language.toUpperCase()} Code` : "Code";
    case "text/markdown":
      return "Markdown Document";
    case "image/svg+xml":
      return "SVG Image";
    case "application/vnd.ant.mermaid":
      return "Mermaid Diagram";
    default:
      return "Artifact";
  }
};

export const ArtifactViewer = ({ artifact, onClose }: ArtifactViewerProps) => {
  const { copy, copied } = useCopy({ duration: 2000 });

  const handleCopy = () => {
    copy(artifact.content);
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
    <div className="flex flex-col gap-4 h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">{artifact.title}</h2>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              {getTypeName(artifact.type, artifact.language)}
            </Badge>
            <span className="text-xs text-muted-foreground">
              ID: {artifact.id}
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {artifact.type === "text/html" && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenInNewTab}
            >
              <ExternalLinkIcon className="w-4 h-4 mr-2" />
              Open in New Tab
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
          >
            {copied ? (
              <CheckIcon className="w-4 h-4 mr-2" />
            ) : (
              <CopyIcon className="w-4 h-4 mr-2" />
            )}
            {copied ? "Copied!" : "Copy"}
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={onClose}
          >
            <XIcon className="w-4 h-4" />
          </Button>
        </div>
      </div>
      
      <Separator />
      
      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="space-y-4">
          {renderArtifactContent(artifact)}
        </div>
      </ScrollArea>
    </div>
  );
}; 