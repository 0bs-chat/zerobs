import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
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
    "https://www.googleapis.com/auth/drive.file",
  ];
  const hasRequiredScopes =
    requiredScopes.every((scope) => googleToken?.scopes?.includes(scope)) &&
    googleToken?.expiresAt &&
    new Date(googleToken.expiresAt) > new Date();

  return (
    <div className="flex flex-col gap-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg gap-4 flex items-center">
            <div className="flex items-center gap-2">
              <img src="/google.svg" alt="Google" className="w-4 h-4" />
              Connect with Google
            </div>
          </CardTitle>
          <CardDescription>
            Connect with google to get access to your calendar, email in the
            chat.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {hasRequiredScopes ? (
            <Button disabled>Connected</Button>
          ) : (
            <Button
              onClick={() =>
                authClient.linkSocial({
                  provider: "google",
                  scopes: requiredScopes,
                })
              }
            >
              Connect
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
