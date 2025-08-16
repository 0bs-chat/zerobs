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
import { useCopy } from "@/hooks/chats/use-copy";
import { Markdown } from "@/components/ui/markdown";
import { MermaidChart } from "@/components/ui/markdown/mermaid";
import type { Artifact } from "./utils";
import { useState, useEffect, memo } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import {
  atomDark,
  oneLight,
} from "react-syntax-highlighter/dist/esm/styles/prism";
import { useAtomValue } from "jotai";
import { themeAtom } from "@/store/settings";
import {
  SandpackProvider,
  SandpackLayout,
  SandpackPreview,
  useSandpack,
} from "@codesandbox/sandpack-react";

const SandpackContent = memo(() => {
  const { sandpack } = useSandpack();

  return (
    <SandpackLayout style={{ height: "100%" }}>
      <SandpackPreview
        showRefreshButton={false}
        showOpenInCodeSandbox={false}
        style={{ height: "100%" }}
      />
      {sandpack.error && (
        <div className="absolute bottom-4 left-4 z-10 rounded-md bg-destructive/90 p-3 text-destructive-foreground shadow-lg">
          <div className="font-medium text-sm">Rendering Error</div>
          <div className="text-xs opacity-90">{sandpack.error.message}</div>
        </div>
      )}
    </SandpackLayout>
  );
});
SandpackContent.displayName = "SandpackContent";

const ReactComponentRenderer = memo(({ content }: { content: string }) => {
  const theme = useAtomValue(themeAtom);

  return (
    <SandpackProvider
      template="react"
      customSetup={{
        dependencies: {
          recharts: "2.15.0",
          "lucide-react": "latest",
          clsx: "latest",
          "tailwind-merge": "latest",
          "class-variance-authority": "latest",
          three: "latest",
          d3: "latest",
          tone: "latest",
          lodash: "latest",
          mathjs: "latest",
          papaparse: "latest",
          sheetjs: "latest",
          zustand: "latest",
        },
      }}
      files={{
        "/App.js": content,
      }}
      options={{
        externalResources: ["https://cdn.tailwindcss.com"],
      }}
      theme={theme === "light" ? "light" : "dark"}
      style={{ height: "100%" }}
    >
      <SandpackContent />
    </SandpackProvider>
  );
});
ReactComponentRenderer.displayName = "ReactComponentRenderer";

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
    <div className="flex flex-col h-full text-card-foreground overflow-x-auto text-sm font-mono">
      <SyntaxHighlighter
        customStyle={{
          backgroundColor: "transparent",
          padding: "1rem",
          margin: "0",
          height: "100%",
        }}
        language={language || "text"}
        style={theme === "light" ? oneLight : atomDark}
        PreTag="div"
        codeTagProps={{
          style: {
            backgroundColor: "transparent",
            display: "block",
            whiteSpace: "pre",
          },
        }}
        lineProps={{
          style: {
            backgroundColor: "transparent",
            display: "block",
            whiteSpace: "pre",
          },
        }}
        wrapLines={true}
      >
        {content}
      </SyntaxHighlighter>
    </div>
  );
};

const SVGRenderer = ({ content }: { content: string }) => {
  return (
    <div
      className="p-4 bg-background flex items-center justify-center"
      style={{ height: "100%" }}
    >
      <div dangerouslySetInnerHTML={{ __html: content }} />
    </div>
  );
};

const MarkdownRenderer = ({ content }: { content: string }) => {
  return (
    <div className="h-full p-4 bg-background overflow-y-auto">
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
    <div className="p-4 bg-background">
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
  const { copy, copied } = useCopy({ duration: 500 });
  const [view, setView] = useState<"preview" | "source">("preview");

  useEffect(() => {
    if (artifact.type === "application/vnd.ant.code") {
      setView("source");
    } else {
      setView("preview");
    }
  }, [artifact.type, artifact.id]);

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
