'use client';

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RefreshCwIcon } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { useEffect, useState } from "react";

export const IntegrationsTab = () => {
  const [accounts, setAccounts] = useState<Awaited<
    ReturnType<typeof authClient.listAccounts>
  > | null>(null);

  useEffect(() => {
    const fetchAccounts = async () => {
      const accs = await authClient.listAccounts();
      setAccounts(accs);
    };
    fetchAccounts();
  }, []);

  const scopes = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/calendar.readonly",
    "https://www.googleapis.com/auth/calendar.events",
  ];

  const handleConnect = async () => {
    await authClient.linkSocial({
      provider: "google",
      scopes,
    });
  };

  if (!accounts) {
    return <div>Loading...</div>;
  }

  const googleAccountHasScopes = accounts.data?.some(
    (account: { provider: string; scopes: string[] }) => {
      if (account.provider !== "google") return false;
      return scopes.every((scope) => account.scopes.includes(scope));
    },
  );

  return (
    <div className="flex flex-col gap-2">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                <span className="text-lg font-bold text-red-500">G</span>
              </div>
              <div>
                <CardTitle className="text-base">Google Workspace</CardTitle>
                <CardDescription>
                  {googleAccountHasScopes
                    ? "Gmail and Calendar integration with read/write access"
                    : "Gmail and Calendar integration with read/write access"}
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            {googleAccountHasScopes ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleConnect}
              >
                <RefreshCwIcon className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            ) : (
              <Button onClick={handleConnect} size="sm">
                Connect Google Workspace
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
