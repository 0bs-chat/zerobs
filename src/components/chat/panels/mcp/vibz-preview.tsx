import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  X,
  EyeIcon,
  CodeIcon,
  BarChart3Icon,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { useAtomValue, useSetAtom } from "jotai";
import { selectedVibzMcpAtom, chatIdAtom } from "@/store/chatStore";
import { getMcpAppData } from "@/hooks/chats/use-mcp";
import { useRef, useState, useEffect } from "react";
import { useAction, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";

export const VibzPreview = () => {
  const selectedVibzMcp = useAtomValue(selectedVibzMcpAtom);
  const chatId = useAtomValue(chatIdAtom);
  const setSelectedVibzMcp = useSetAtom(selectedVibzMcpAtom);
  const [view, setView] = useState<"preview" | "code" | "dashboard">("preview");
  const [urls, setUrls] = useState<{
    previewUrl: string;
    codeUrl: string;
    dashboardUrl: string;
  } | null>(null);
  const [currentPath, setCurrentPath] = useState("/");

  const previewIframeRef = useRef<HTMLIFrameElement>(null);
  const codeIframeRef = useRef<HTMLIFrameElement>(null);
  const dashboardIframeRef = useRef<HTMLIFrameElement>(null);

  const createJwtAction = useAction(api.utils.encryption.createJwtAction);

  // Fetch assigned MCP app if chatId is not 'new'
  const assignedMcpApp = useQuery(
    api.mcps.queries.getAssignedMcpAppForChat,
    chatId !== "new" && selectedVibzMcp?._id && chatId
      ? { mcpId: selectedVibzMcp._id, chatId }
      : "skip",
  );

  useEffect(() => {
    const initializeUrls = async () => {
      if (!selectedVibzMcp?._id || !chatId) return;

      try {
        // Determine which MCP data to use
        let mcpToUse = selectedVibzMcp;

        // If chatId is not 'new' and we have an assigned app, use that instead
        if (chatId !== "new" && assignedMcpApp) {
          mcpToUse = assignedMcpApp;
        }

        const oauthToken = await createJwtAction({
          key: "OAUTH_TOKEN",
          value: mcpToUse._id,
          skipTimestamp: true,
        });

        // Use the first app for vibz preview
        const { url } = getMcpAppData(mcpToUse);
        if (!url) return;

        const appName = mcpToUse.apps?.[0]?._id;
        if (!appName) return;

        const basePreviewUrl = `https://${appName}.fly.dev`;
        const baseCodeUrl = `https://${appName}.fly.dev/8080/${oauthToken}/`;
        const baseDashboardUrl = `https://${appName}.fly.dev/dashboard?auth=${oauthToken}`;

        setUrls({
          previewUrl: basePreviewUrl,
          codeUrl: baseCodeUrl,
          dashboardUrl: baseDashboardUrl,
        });
      } catch (error) {
        console.error("Error initializing URLs:", error);
      }
    };

    initializeUrls();
  }, [selectedVibzMcp?._id, chatId, assignedMcpApp, createJwtAction]);

  const handleClose = () => {
    setSelectedVibzMcp(undefined);
  };

  const handleExternalLink = (url: string) => {
    const fullUrl =
      view === "dashboard"
        ? urls!.dashboardUrl
        : `${url}${currentPath === "/" ? "" : currentPath}`;
    window.open(fullUrl, "_blank", "noopener,noreferrer");
  };

  const handleRefresh = () => {
    if (!urls) return;

    const previewUrl =
      view === "preview"
        ? `${urls.previewUrl}${currentPath === "/" ? "" : currentPath}`
        : urls.previewUrl;
    const codeUrl = urls.codeUrl;
    const dashboardUrl = urls.dashboardUrl;

    if (previewIframeRef.current) {
      previewIframeRef.current.src = previewUrl;
    }
    if (codeIframeRef.current) {
      codeIframeRef.current.src = codeUrl;
    }
    if (dashboardIframeRef.current) {
      dashboardIframeRef.current.src = dashboardUrl;
    }
  };

  const handlePathChange = (newPath: string) => {
    if (!newPath.startsWith("/")) {
      newPath = "/" + newPath;
    }
    setCurrentPath(newPath);
  };

  const navigateToPath = (path: string) => {
    handlePathChange(path);
    // Update preview iframe immediately if in preview mode
    if (!urls || view !== "preview") return;

    const previewUrl = `${urls.previewUrl}${path === "/" ? "" : path}`;

    if (previewIframeRef.current) {
      previewIframeRef.current.src = previewUrl;
    }
  };

  if (!urls) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full grid grid-rows-[auto_1fr]">
      {/* Header */}
      <div className="flex items-center p-1 pl-3">
        {/* Left section */}
        <div className="flex items-center flex-1">
          <h2 className="text-lg font-semibold">{selectedVibzMcp?.name}</h2>
        </div>

        {/* Center section - ONLY path input */}
        <div className="flex items-center justify-center flex-1">
          {/* Path input - Only show for preview view */}
          {view === "preview" && (
            <Input
              value={currentPath}
              onChange={(e) => handlePathChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  navigateToPath(currentPath);
                }
              }}
              placeholder="/path"
              className="font-mono text-sm w-48"
            />
          )}
        </div>

        {/* Right section */}
        <div className="flex items-center gap-1 flex-1 justify-end">
          <Tabs
            value={view}
            onValueChange={(v) =>
              setView(v as "preview" | "code" | "dashboard")
            }
          >
            <TabsList>
              <TabsTrigger value="preview">
                <EyeIcon className="w-4 h-4" />
              </TabsTrigger>
              <TabsTrigger value="code">
                <CodeIcon className="w-4 h-4" />
              </TabsTrigger>
              <TabsTrigger value="dashboard">
                <BarChart3Icon className="w-4 h-4" />
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Refresh button */}
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            title="Refresh current view"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>

          {/* External link buttons */}
          <Button
            variant="outline"
            size="icon"
            onClick={() => handleExternalLink(urls.previewUrl)}
            title="Open preview in new tab"
          >
            <ExternalLink className="w-4 h-4" />
          </Button>

          <Button variant="outline" size="icon" onClick={handleClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="min-h-0 min-w-0 relative">
        <iframe
          ref={previewIframeRef}
          src={
            view === "preview"
              ? `${urls.previewUrl}${currentPath === "/" ? "" : currentPath}`
              : urls.previewUrl
          }
          className={`w-full h-full absolute inset-0 transition-opacity duration-200 ${
            view === "preview"
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none"
          }`}
          title={`${selectedVibzMcp?.name} Preview`}
        />

        {/* Code iframe - always loaded */}
        <iframe
          ref={codeIframeRef}
          src={urls.codeUrl}
          className={`w-full h-full absolute inset-0 transition-opacity duration-200 ${
            view === "code"
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none"
          }`}
          title={`${selectedVibzMcp?.name} Code`}
        />

        {/* Dashboard iframe - always loaded */}
        <iframe
          ref={dashboardIframeRef}
          src={urls.dashboardUrl}
          className={`w-full h-full absolute inset-0 transition-opacity duration-200 ${
            view === "dashboard"
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none"
          }`}
          title={`${selectedVibzMcp?.name} Dashboard`}
        />
      </div>
    </div>
  );
};
