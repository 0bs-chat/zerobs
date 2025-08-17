import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { X, EyeIcon, CodeIcon, BarChart3Icon, RefreshCw, ExternalLink } from "lucide-react";
import { useAtomValue, useSetAtom } from "jotai";
import { selectedVibzMcpAtom, chatIdAtom } from "@/store/chatStore";
import { useState, useEffect, useRef } from "react";
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

  // Refs for iframes to enable refresh functionality
  const previewIframeRef = useRef<HTMLIFrameElement>(null);
  const codeIframeRef = useRef<HTMLIFrameElement>(null);
  const dashboardIframeRef = useRef<HTMLIFrameElement>(null);

  const createJwtAction = useAction(api.utils.encryption.createJwtAction);

  useEffect(() => {
    if (!selectedVibzMcp || !chatId) {
      setUrls(null);
      return;
    }

    const generateUrls = async () => {
      const oauthToken = await createJwtAction({
        key: "OAUTH_TOKEN",
        value: selectedVibzMcp._id,
        skipTimestamp: true,
      });

      const mcpName = `${chatId}-${selectedVibzMcp._id}`.slice(0, 62);
      
      setUrls({
        previewUrl: `https://${mcpName}.fly.dev/`,
        codeUrl: `https://${mcpName}.fly.dev/8080${oauthToken}/`,
        dashboardUrl: `https://${mcpName}.fly.dev/dashboard?auth=${oauthToken}`,
      });
      console.log(urls);
    };

    generateUrls();
  }, [selectedVibzMcp, chatId, createJwtAction]);

  if (!selectedVibzMcp || !chatId || !urls) {
    return null;
  }

  const handleClose = () => {
    setSelectedVibzMcp(undefined);
  };

  const handleRefresh = () => {
    // Refresh the currently active iframe
    const currentIframe = view === "preview" ? previewIframeRef.current :
                         view === "code" ? codeIframeRef.current :
                         dashboardIframeRef.current;
    
    if (currentIframe) {
      currentIframe.src = currentIframe.src;
    }
  };

  const handleExternalLink = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="w-full h-full grid grid-rows-[auto_1fr]">
      {/* Header */}
      <div className="flex items-center justify-between p-1 pl-3">
        <h2 className="text-lg font-semibold">{selectedVibzMcp.name}</h2>

        <div className="flex items-center gap-1">
          <Tabs
            value={view}
            onValueChange={(v) => setView(v as "preview" | "code" | "dashboard")}
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

      {/* Content - Keep all iframes loaded but only show active one */}
      <div className="min-h-0 min-w-0 relative">
        {/* Preview iframe - always loaded */}
        <iframe
          ref={previewIframeRef}
          src={urls.previewUrl}
          className={`w-full h-full absolute inset-0 transition-opacity duration-200 ${
            view === "preview" ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
          }`}
          title={`${selectedVibzMcp.name} Preview`}
        />
        
        {/* Code iframe - always loaded */}
        <iframe
          ref={codeIframeRef}
          src={urls.codeUrl}
          className={`w-full h-full absolute inset-0 transition-opacity duration-200 ${
            view === "code" ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
          }`}
          title={`${selectedVibzMcp.name} Code`}
        />
        
        {/* Dashboard iframe - always loaded */}
        <iframe
          ref={dashboardIframeRef}
          src={urls.dashboardUrl}
          className={`w-full h-full absolute inset-0 transition-opacity duration-200 ${
            view === "dashboard" ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
          }`}
          title={`${selectedVibzMcp.name} Dashboard`}
        />
      </div>
    </div>
  );
};

