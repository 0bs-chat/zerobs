import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { XIcon, RefreshCwIcon } from "lucide-react";
import { useAuth, useUser } from "@clerk/clerk-react";
import { toast } from "sonner";

export const IntegrationsTab = () => {
  const { isLoaded: authLoaded } = useAuth();
  const { user, isLoaded: userLoaded } = useUser();
  const [isConnecting, setIsConnecting] = useState(false);

  const isLoaded = authLoaded && userLoaded;

  // Check if user has alternative authentication methods
  const hasAlternativeAuth = () => {
    if (!user) return false;
    const hasPassword = user.passwordEnabled;
    const hasOtherExternalAccounts = (user.externalAccounts?.length || 0) > 1;
    const hasBackupCodes = user.backupCodeEnabled;

    return hasPassword || hasOtherExternalAccounts || hasBackupCodes;
  };

  // Helper function to find Google account with flexible provider matching
  const findGoogleAccount = () => {
    if (!isLoaded || !user) return null;
    return user.externalAccounts?.find(
      (account) => account.provider === "custom_google",
    );
  };

  // Check if user has Google connected via custom provider
  const isGoogleConnected = () => {
    const googleAccount = findGoogleAccount();
    return googleAccount !== null && googleAccount !== undefined;
  };

  const handleConnect = async () => {
    setIsConnecting(true);

    try {
      if (!user) {
        toast.error("User not found");
        return;
      }

      const redirectUrl = window.location.href;

      // Create new Google external account with required scopes
      const result = await user.createExternalAccount({
        strategy: "oauth_custom_google",
        redirectUrl: redirectUrl,
        oidcPrompt: "consent",
      });

      // Redirect to the external verification URL
      if (result.verification?.externalVerificationRedirectURL?.href) {
        window.location.href =
          result.verification.externalVerificationRedirectURL.href;
      } else {
        toast.error("No verification URL provided by Clerk");
      }
    } catch (error: any) {
      console.error("Error connecting Google account:", error);

      if (
        error?.errors?.[0]?.code === "verification_required" ||
        error?.message?.includes("verification") ||
        error?.message?.includes("additional verification")
      ) {
        toast.error(
          "Additional verification required. Please sign out and back in, then try connecting Google again.",
        );
      } else if (
        error?.errors?.[0]?.code === "external_account_already_exists"
      ) {
        toast.error("Google account is already connected to another user.");
      } else if (error?.errors?.[0]?.code === "oauth_access_denied") {
        toast.error(
          "Google access was denied. Please try again and grant the necessary permissions.",
        );
      } else {
        toast.error(
          `Failed to connect Google: ${error.message || "Unknown error"}`,
        );
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    setIsConnecting(true);

    try {
      if (!user) {
        toast.error("User not found");
        return;
      }

      const googleAccount = findGoogleAccount();

      if (!googleAccount) {
        toast.error("No Google account found to disconnect");
        return;
      }

      // Check if user has alternative authentication methods
      if (!hasAlternativeAuth()) {
        toast.error(
          "Cannot disconnect Google account. Please set up a password in your account settings first to maintain access to your account.",
        );
        return;
      }

      await googleAccount.destroy();

      await user.reload();

      toast.success("Google disconnected successfully");
    } catch (error: any) {
      if (error?.errors?.[0]?.code === "external_account_not_found") {
        toast.error(
          "Google account not found. It may already be disconnected.",
        );
      } else if (
        error?.errors?.[0]?.code === "external_account_cannot_be_deleted"
      ) {
        toast.error(
          "Cannot disconnect Google account. It may be required for your sign-in method.",
        );
      } else if (error?.errors?.[0]?.code === "form_password_pwned") {
        toast.error("Cannot disconnect. This account is required for sign-in.");
      } else if (
        error?.errors?.[0]?.code === "verification_required" ||
        error?.message?.includes("verification") ||
        error?.message?.includes("additional verification")
      ) {
        // For verification required errors, show a more helpful message
        toast.error(
          "To disconnect Google, please verify your identity first. Try signing out and back in, then attempt to disconnect again.",
        );
      } else {
        toast.error(
          `Failed to disconnect Google: ${error.message || "Unknown error"}`,
        );
      }
    } finally {
      setIsConnecting(false);
    }
  };

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCwIcon className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  const connected = isGoogleConnected();

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
                  {connected
                    ? "Gmail and Calendar integration with read/write access"
                    : "Gmail and Calendar integration with read/write access"}
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            {connected ? (
              <>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDisconnect}
                  disabled={isConnecting}
                >
                  {isConnecting ? (
                    <RefreshCwIcon className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <XIcon className="h-4 w-4 mr-2" />
                  )}
                  Disconnect
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleConnect}
                  disabled={isConnecting}
                >
                  <RefreshCwIcon className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </>
            ) : (
              <Button onClick={handleConnect} disabled={isConnecting} size="sm">
                {isConnecting ? (
                  <RefreshCwIcon className="h-4 w-4 mr-2 animate-spin" />
                ) : null}
                Connect Google Workspace
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
