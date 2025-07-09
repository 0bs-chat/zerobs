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
import { useAuth, useUser, useReverification } from "@clerk/clerk-react";
import { toast } from "sonner";

export const IntegrationsTab = () => {
  const { isLoaded: authLoaded } = useAuth();
  const { user, isLoaded: userLoaded } = useUser();
  const [isConnecting, setIsConnecting] = useState(false);

  const isLoaded = authLoaded && userLoaded;

  // Use reverification hook for secure operations
  const createExternalAccount = useReverification((params: any) =>
    user?.createExternalAccount(params)
  );

  // Helper function to find Google account with flexible provider matching
  const findGoogleAccount = () => {
    if (!isLoaded || !user) return null;
    return user.externalAccounts?.find((account) => 
      account.provider === "custom_google_poogle"
    );
  };

  // Check if user has Google connected via custom provider
  const isGoogleConnected = () => {
    const googleAccount = findGoogleAccount();
    return googleAccount && googleAccount.verification?.status === "verified";
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    
    try {
      if (!user) throw new Error("User not found");
      
      const redirectUrl = window.location.href;
      const existingGoogleAccount = findGoogleAccount();

      if (existingGoogleAccount) {
        // User has Google connected but needs additional scopes
        const result = await existingGoogleAccount.reauthorize({
          additionalScopes: [
            'https://www.googleapis.com/auth/gmail.readonly',
            'https://www.googleapis.com/auth/gmail.modify',
            'https://www.googleapis.com/auth/calendar.readonly',
            'https://www.googleapis.com/auth/calendar.events'
          ],
          redirectUrl: redirectUrl,
        });

        if (result?.verification?.externalVerificationRedirectURL) {
          window.location.href = result.verification.externalVerificationRedirectURL.href;
        } else {
          throw new Error("No redirect URL received for reauthorization");
        }
      } else {
        // Create new Google external account with required scopes using reverification
        const result = await createExternalAccount({
          strategy: "oauth_custom_google_poogle" as any,
          redirectUrl: redirectUrl,
          additionalScopes: [
            'https://www.googleapis.com/auth/gmail.readonly',
            'https://www.googleapis.com/auth/gmail.modify',
            'https://www.googleapis.com/auth/calendar.readonly',
            'https://www.googleapis.com/auth/calendar.events'
          ]
        });
        
        if (result?.verification?.externalVerificationRedirectURL) {
          window.location.href = result.verification.externalVerificationRedirectURL.href;
        } else {
          throw new Error("No redirect URL received");
        }
      }
    } catch (error: any) {
      console.error("Connection failed:", error);
      
      // Handle specific Clerk errors
      if (error?.errors?.[0]?.code === "verification_required") {
        toast.error("Please complete verification to connect Google account.");
      } else if (error?.errors?.[0]?.code === "external_account_exists") {
        toast.error("Google account is already connected. Try refreshing the page.");
      } else {
        toast.error("Google OAuth connection failed. Please try again.");
      }
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    setIsConnecting(true);
    
    try {
      if (!user) throw new Error("User not found");
      
      const googleAccount = findGoogleAccount();
      
      if (googleAccount) {
        await googleAccount.destroy();
        toast.success("Google disconnected");
        await user.reload();
      }
    } catch (error) {
      console.error("Disconnect failed:", error);
      toast.error("Failed to disconnect Google");
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
                  {connected ? 
                    "Gmail and Calendar integration with read/write access" :
                    "Gmail and Calendar integration with read/write access"
                  }
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
              </>
            ) : (
              <Button
                onClick={handleConnect}
                disabled={isConnecting}
                size="sm"
              >
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