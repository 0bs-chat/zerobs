import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { api } from "../../../convex/_generated/api";
import { useQuery } from "convex/react";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/settings/integrations")({
  component: RouteComponent,
});

function RouteComponent() {
  const googleToken = useQuery(api.auth.getToken, { providerId: "google" });
  const requiredScopes = [
    "https://www.googleapis.com/auth/calendar",
    "https://mail.google.com/",
    "https://www.googleapis.com/auth/drive.file"
  ]
  const hasRequiredScopes = requiredScopes.every(scope => googleToken?.scopes?.includes(scope))
    && googleToken?.expiresAt && new Date(googleToken.expiresAt) > new Date();
  
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