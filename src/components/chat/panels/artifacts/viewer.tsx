import { Button } from "@/components/ui/button";
// import { Separator } from "@/components/ui/separator";

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

import { iframeContent } from "./utils";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ArtifactViewerProps {
  artifact: Artifact;
  onClose: () => void;
}

const buildContent = (artifact: Artifact) => {
  const codeBlock = (lang = "text") => (
    <Markdown content={`\`\`\`${lang}\n${artifact.content}\n\`\`\``} />
  );

  switch (artifact.type) {
    case "application/vnd.ant.react": {
      const processed = iframeContent(
        artifact.content.replace(/import\s+.*from\s+['"]react['"];?/g, "")
      );
      return {
        language: "jsx",
        preview: (
          <iframe
            srcDoc={processed}
            className="w-full h-full border-0 flex-1"
            sandbox="allow-scripts allow-same-origin"
          />
        ),
        source: codeBlock("jsx"),
      };
    }
    case "text/html":
      return {
        language: "html",
        preview: (
          <iframe
            srcDoc={artifact.content}
            className="w-full h-full border-0 flex-1"
            sandbox="allow-scripts allow-same-origin"
          />
        ),
        source: codeBlock("html"),
      };
    case "application/vnd.ant.code":
      return {
        language: artifact.language ?? "text",
        preview: codeBlock(artifact.language),
        source: codeBlock(artifact.language),
      };
    case "text/markdown":
      return {
        language: "markdown",
        preview: <Markdown content={artifact.content} />,
        source: codeBlock("markdown"),
      };
    case "image/svg+xml":
      return {
        language: "xml",
        preview: (
          <div
            className="w-full h-full"
            dangerouslySetInnerHTML={{ __html: artifact.content }}
          />
        ),
        source: codeBlock("xml"),
      };
    case "application/vnd.ant.mermaid":
      return {
        language: "mermaid",
        preview: (
          <MermaidChart
            chart={artifact.content}
            id={`artifact-${Date.now()}`}
          />
        ),
        source: codeBlock("mermaid"),
      };
    default:
      return {
        language: "text",
        preview: codeBlock("text"),
        source: codeBlock("text"),
      };
  }
};

export const ArtifactViewer = ({ artifact, onClose }: ArtifactViewerProps) => {
  const { copy, copied } = useCopy({ duration: 500 });
  const { preview, source } = buildContent(artifact);

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
    <Tabs defaultValue="preview" className="w-full h-full flex">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <TabsList className="flex gap-1">
          <TabsTrigger value="preview">
            <EyeIcon className="w-4 h-4" />
          </TabsTrigger>
          <TabsTrigger value="source">
            <CodeIcon className="w-4 h-4" />
          </TabsTrigger>
        </TabsList>

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

      {/* <Separator /> */}

      <TabsContent value="preview" className="flex min-h-0 max-w-full">
        {artifact.type === "text/markdown" ? (
          <ScrollArea className="h-full flex w-full">{preview}</ScrollArea>
        ) : (
          preview
        )}
      </TabsContent>
      <TabsContent
        value="source"
        className="flex min-h-0 overflow-y-auto max-w-full"
      >
        {source}
      </TabsContent>
    </Tabs>
  );
};
