import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { KeyIcon, CreditCardIcon, PlugIcon } from "lucide-react";
import { ApiKeysTab } from "./api-keys";
import { BillingTab } from "./billing";
import { IntegrationsTab } from "./integrations";

export const SettingsPanel = () => {
  return (
    <div className="flex flex-col gap-4 h-full">
      <div>
        <h2 className="text-lg font-semibold">Settings</h2>
        <p className="text-sm text-muted-foreground">
          Configure your application settings and preferences.
        </p>
      </div>

      <Separator />

      <Tabs defaultValue="api-keys">
        <TabsList className="w-full">
          <TabsTrigger value="api-keys">
            <div className="flex flex-row items-center gap-2">
              <KeyIcon className="h-4 w-4" />
              API Keys
            </div>
          </TabsTrigger>
          <TabsTrigger value="integrations">
            <div className="flex flex-row items-center gap-2">
              <PlugIcon className="h-4 w-4" />
              Integrations
            </div>
          </TabsTrigger>
          <TabsTrigger value="billing">
            <div className="flex flex-row items-center gap-2">
              <CreditCardIcon className="h-4 w-4" />
              Billing
            </div>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="api-keys">
          <ApiKeysTab />
        </TabsContent>
        
        <TabsContent value="integrations">
          <IntegrationsTab />
        </TabsContent>
        
        <TabsContent value="billing">
          <BillingTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};
