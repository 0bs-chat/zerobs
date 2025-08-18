import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useMemo } from "react";
import { useMutation } from "@tanstack/react-query";
import { useConvexMutation } from "@convex-dev/react-query";
import { api } from "../../../convex/_generated/api";
import { toast } from "sonner";
import { useAuthToken } from "@convex-dev/auth/react";
import { providers } from "../../../convex/utils/oauth/providers";
import { useAtomValue } from "jotai";
import { apiKeysAtom } from "@/hooks/use-apikeys";

export const Route = createFileRoute("/settings/integrations")({
  component: RouteComponent,
});

function RouteComponent() {
  const existingKeys = useAtomValue(apiKeysAtom);
  const { mutateAsync: removeApiKey } = useMutation({
    mutationFn: useConvexMutation(api.apiKeys.mutations.remove),
  });
  const token = useAuthToken();

  const hasKey = useMemo(() => {
    const set = new Set((existingKeys ?? []).map((k) => k.key));
    return (key: string) => set.has(key);
  }, [existingKeys]);

  const handleConnect = async (providerKey: string) => {
    const url = import.meta.env.VITE_CONVEX_SITE_URL;
    const res = await fetch(`${url}/integrations/redirect`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        state: JSON.stringify({
          provider: providerKey,
          token,
        }),
      }),
    });

    if (!res.ok) {
      toast.error(`Failed to start ${providerKey} OAuth`);
      return;
    }

    const { redirect } = (await res.json()) as { redirect?: string };
    if (redirect) window.location.href = redirect;
  };

  const handleDisconnect = async (
    accessKey: string,
    refreshKey: string,
    providerName: string,
  ) => {
    try {
      await Promise.all([
        removeApiKey({ key: accessKey }).catch(() => {}),
        removeApiKey({ key: refreshKey }).catch(() => {}),
      ]);
      toast.success(`Disconnected ${providerName}`);
    } catch {
      toast.error(`Failed to disconnect ${providerName}`);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {Object.entries(providers).map(([key, provider]) => {
        const accessKey = provider.accessKeyKey;
        const refreshKey = provider.refreshKeyKey;
        const isConnected = hasKey(accessKey);

        return (
          <Card key={key}>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <img
                  src={provider.icon}
                  alt={provider.title}
                  className="w-4 h-4"
                />
                {provider.title}
              </CardTitle>
              <CardDescription>{provider.description}</CardDescription>
            </CardHeader>
            <CardContent>
              {isConnected ? (
                <Button
                  variant="destructive"
                  onClick={() =>
                    handleDisconnect(accessKey, refreshKey, provider.title)
                  }
                >
                  Disconnect {provider.title}
                </Button>
              ) : (
                <Button onClick={() => handleConnect(key)}>
                  Connect with {provider.title}
                </Button>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
