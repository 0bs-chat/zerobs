import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  XIcon,
  CopyIcon,
  CheckIcon,
  ExternalLinkIcon,
  EyeIcon,
  CodeIcon,
} from "lucide-react";
import { useCopy } from "@/hooks/use-copy";
import { Markdown } from "@/components/ui/markdown";
import { MermaidChart } from "@/components/ui/markdown/mermaid";
import type { Artifact } from "../../artifacts/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ArtifactViewerProps {
  artifact: Artifact;
  onClose: () => void;
}

const TabbedRenderer = ({
  preview,
  source,
  language,
}: {
  preview: React.ReactNode;
  source: string;
  language: string;
}) => (
  <Tabs defaultValue="preview" className="w-full">
    <TabsList className="overflow-x-auto">
      <TabsTrigger value="preview">
        <EyeIcon className="w-4 h-4" />
      </TabsTrigger>
      <TabsTrigger value="source">
        <CodeIcon className="w-4 h-4" />
      </TabsTrigger>
    </TabsList>
    <TabsContent value="preview">{preview}</TabsContent>
    <TabsContent value="source">
      <Markdown content={`\`\`\`${language || "text"}\n${source}\n\`\`\``} id={`artifact-${Date.now()}`} />
    </TabsContent>
  </Tabs>
);

const prepareReactCode = (code: string): string => {
  const withoutImports = code.replace(
    /import\s+(?:React(?:,\s*)?)?(?:\{[^}]*\})?\s+from\s+['"]react['"];?/g,
    "",
  );
  const withoutExports = withoutImports.replace(/export\s+default\s+App;?/, "");
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

  const preview = (
    <iframe
      srcDoc={iframeContent}
      className="w-full h-[600px] border-0 rounded"
      title="React Preview"
      sandbox="allow-scripts allow-same-origin"
      onLoad={(e) => {
        console.log("Iframe loaded");
        const iframe = e.target as HTMLIFrameElement;
        try {
          console.log("Iframe content window:", iframe.contentWindow);
        } catch (err) {
          console.log("Cannot access iframe content:", err);
        }
      }}
    />
  );

  return <TabbedRenderer preview={preview} source={content} language="jsx" />;
};

const HTMLRenderer = ({ content }: { content: string }) => {
  const preview = (
    <iframe
      srcDoc={content}
      className="w-full h-[600px] border-0 rounded"
      title="HTML Preview"
      sandbox="allow-scripts allow-same-origin"
    />
  );
  return <TabbedRenderer preview={preview} source={content} language="html" />;
};

const CodeRenderer = ({
  content,
  language,
}: {
  content: string;
  language?: string;
}) => {
  return (
    <Markdown content={`\`\`\`${language || "text"}\n${content}\n\`\`\``} id={`artifact-${Date.now()}`} />
  );
};

const SVGRenderer = ({ content }: { content: string }) => {
  const preview = (
    <div className="border rounded-lg p-4 bg-background flex items-center justify-center">
      <div dangerouslySetInnerHTML={{ __html: content }} />
    </div>
  );
  return <TabbedRenderer preview={preview} source={content} language="xml" />;
};

const MarkdownRenderer = ({ content }: { content: string }) => {
  const preview = (
    <div className="border rounded-lg p-4 bg-background">
      <Markdown content={content} id={`artifact-${Date.now()}`} />
    </div>
  );
  return (
    <TabbedRenderer preview={preview} source={content} language="markdown" />
  );
};

const MermaidRenderer = ({ content }: { content: string }) => {
  const preview = (
    <div className="border rounded-lg p-4 bg-background">
      <MermaidChart chart={content} id={`artifact-${Date.now()}`} />
    </div>
  );
  return (
    <TabbedRenderer preview={preview} source={content} language="mermaid" />
  );
};

const renderArtifactContent = (artifact: Artifact) => {
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
      return (
        <CodeRenderer content={artifact.content} language="text" />
      );
  }
};

export const ArtifactViewer = ({ artifact, onClose }: ArtifactViewerProps) => {
  const { copy, copied } = useCopy({ duration: 500 });

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
    <div className="w-full h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <h2 className="text-lg font-semibold">{artifact.title}</h2>

        <div className="flex items-center gap-2">
          {artifact.type === "text/html" && (
            <Button variant="outline" size="sm" onClick={handleOpenInNewTab}>
              <ExternalLinkIcon className="w-4 h-4" />
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleCopy}>
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

      <Separator />

      {/* Content */}
      <ScrollArea className="flex-1 p-4">
        {renderArtifactContent(artifact)}
      </ScrollArea>
    </div>
  );
};
