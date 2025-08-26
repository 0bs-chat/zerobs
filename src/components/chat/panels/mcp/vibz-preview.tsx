import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
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
import { useRef, useState, useEffect } from "react";
import { useAction } from "convex/react";
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

  const previewIframeRef = useRef<HTMLIFrameElement>(null);
  const codeIframeRef = useRef<HTMLIFrameElement>(null);
  const dashboardIframeRef = useRef<HTMLIFrameElement>(null);

  const createJwtAction = useAction(api.utils.encryption.createJwtAction);
  const getMachineId = useAction(api.mcps.actions.getMachineId);

  useEffect(() => {
    const initializeUrls = async () => {
      if (!selectedVibzMcp?._id || !chatId) return;

      try {
        const oauthToken = await createJwtAction({
          key: "OAUTH_TOKEN",
          value: selectedVibzMcp._id,
          skipTimestamp: true,
        });

        const machineId = await getMachineId({
          mcpId: selectedVibzMcp._id,
          chatId,
        });

        const appName = selectedVibzMcp._id;

        setUrls({
          previewUrl: `https://${appName}.fly.dev/${machineId}/preview/`,
          codeUrl: `https://${appName}.fly.dev/${machineId}/8080/${oauthToken}/`,
          dashboardUrl: `https://${appName}.fly.dev/${machineId}/dashboard?auth=${oauthToken}`,
        });
      } catch (error) {
        console.error("Error initializing URLs:", error);
      }
    };

    initializeUrls();
  }, [selectedVibzMcp?._id, chatId, createJwtAction, getMachineId]);

  const handleClose = () => {
    setSelectedVibzMcp(undefined);
  };

  const handleExternalLink = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleRefresh = () => {
    if (!urls) return;

    if (previewIframeRef.current) {
      previewIframeRef.current.src = urls.previewUrl;
    }
    if (codeIframeRef.current) {
      codeIframeRef.current.src = urls.codeUrl;
    }
    if (dashboardIframeRef.current) {
      dashboardIframeRef.current.src = urls.dashboardUrl;
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

  console.log(urls);

  return (
    <div className="w-full h-full grid grid-rows-[auto_1fr]">
      {/* Header */}
      <div className="flex items-center justify-between p-1 pl-3">
        <h2 className="text-lg font-semibold">{selectedVibzMcp?.name}</h2>

        <div className="flex items-center gap-1">
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
          src={urls.previewUrl}
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
