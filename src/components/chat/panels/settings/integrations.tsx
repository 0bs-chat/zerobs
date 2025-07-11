import { authClient } from "@/lib/auth-client"
import { api } from "../../../../../convex/_generated/api";
import { useQuery } from "convex/react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button";
import { useEffect } from "react";


export const IntegrationsTab = () => {
  const googleToken = useQuery(api.auth.getToken, { providerId: "google" });
  const requiredScopes = [
    "https://www.googleapis.com/auth/calendar",
    "https://mail.google.com/"
  ]
  const hasRequiredScopes = requiredScopes.every(scope => googleToken?.scopes?.includes(scope));

  useEffect(() => {
    if (googleToken?.expiresAt && new Date(googleToken.expiresAt) < new Date()) {
      authClient.refreshToken({ providerId: "google" });
    }
  }, [googleToken]);

  return (
    <div className="flex flex-col gap-2">
      <Card>
        <CardHeader>
          <CardTitle>Google</CardTitle>
        </CardHeader>
        <CardContent>
          {hasRequiredScopes ? (
            <Button disabled>Connected</Button>
          ) : (
            <Button onClick={() => authClient.linkSocial({
              provider: "google",
              scopes: requiredScopes,
            })}>Connect</Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
