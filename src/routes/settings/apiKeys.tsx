import { createFileRoute } from "@tanstack/react-router";

import { useState } from "react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { SaveIcon, TrashIcon } from "lucide-react";
import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "../../../convex/_generated/api";
import { toast } from "sonner";

const Icons = {
  OpenAI: () => (
    <div className="w-6 h-6 rounded-sm flex items-center justify-center">
      <img src="https://www.google.com/s2/favicons?sz=256&domain_url=https%3A%2F%2Fopenai.com%2F" alt="OpenAI" className="w-4 h-4 dark:invert" />
    </div>
  ),
  Google: () => (
    <div className="w-6 h-6 rounded-sm flex items-center justify-center">
      <img src="https://www.google.com/s2/favicons?sz=256&domain_url=https%3A%2F%2Fgoogle.com%2F" alt="Google" className="w-4 h-4" />
    </div>
  ),
  Exa: () => (
    <div className="w-6 h-6 bg-[#03037A] rounded-sm flex items-center justify-center">
      <img src="https://www.google.com/s2/favicons?sz=256&domain_url=https%3A%2F%2Fexa.ai%2F" alt="Exa" className="w-4 h-4" />
    </div>
  ),
  OpenRouter: () => (
    <div className="w-6 h-6 rounded-sm flex items-center justify-center">
      <img src="https://www.google.com/s2/favicons?sz=256&domain_url=https%3A%2F%2Fopenrouter.ai%2F" alt="OpenRouter" className="w-4 h-4" />
    </div>
  ),
};

// Common link component
const ExternalLink = ({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className="text-blue-500/80 hover:underline"
  >
    {children}
  </a>
);

// Common input field component
const ApiKeyInput = ({
  config,
  value,
  onChange,
  onSave,
}: {
  config: ApiKeyConfig;
  value: string;
  onChange: (value: string) => void;
  onSave: () => void;
}) => (
  <div className="flex flex-row gap-1.5 w-full items-end">
    <div className="flex flex-col flex-[3]">
      <Label className="text-xs text-muted-foreground py-2">
        {config.title}
      </Label>
      <Input
        type={config.isPassword ? "password" : "text"}
        placeholder={config.placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full focus:ring-0 focus:ring-offset-0 border-border focus-visible:ring-0 focus-visible:ring-offset-0 outline-none"
      />
    </div>
    <Button
      variant="default"
      onClick={onSave}
      className="flex-1 min-w-0"
      style={{ flexBasis: "25%" }}
    >
      <SaveIcon className="h-4 w-4 mr-2" />
      Save {config.title}
    </Button>
  </div>
);

// Common existing key display component
const ExistingKeyDisplay = ({
  config,
  existingKey,
  onRemove,
}: {
  config: ApiKeyConfig;
  existingKey: { value: string };
  onRemove: () => void;
}) => {
  const maskKey = (key: string) => "*".repeat(key.length);

  return (
    <div className="flex items-center justify-between p-3 bg-input/80 rounded-md">
      <div className="flex items-center gap-1 truncate">
        <span className="text-sm font-medium">Current Value:</span>
        <span className="text-sm font-mono">
          {config.isPassword ? maskKey(existingKey.value) : existingKey.value}
        </span>
      </div>
      <Button variant="ghost" size="sm" onClick={onRemove}>
        <TrashIcon className="h-4 w-4" />
      </Button>
    </div>
  );
};

type ApiKeyConfig = {
  key: string;
  title: string;
  description: React.ReactNode;
  icon: React.ReactNode;
  placeholder: string;
  isPassword?: boolean;
};

const API_KEY_CONFIGS: ApiKeyConfig[] = [
  {
    key: "OPENAI_API_KEY",
    title: "OpenRouter API Key",
    description: (
      <>
        Required for GPT models and AI-powered features. Get your API key from{" "}
        <ExternalLink href="https://openrouter.ai/settings/keys">
          OpenRouter
        </ExternalLink>
      </>
    ),
    icon: <Icons.OpenRouter />,
    placeholder: "sk-...",
    isPassword: true,
  },
  {
    key: "GOOGLE_EMBEDDING_API_KEY",
    title: "Google Embedding API Key",
    description:
      "Required for Google embedding models. Get your API key from Google Cloud Console.",
    icon: <Icons.Google />,
    placeholder: "sk-...",
    isPassword: true,
  },
  {
    key: "OPENAI_EMBEDDING_API_KEY",
    title: "OpenAI Embedding API Key",
    description:
      "Required for OpenAI embedding models. Get your API key from OpenAI Platform.",
    icon: <Icons.OpenAI />,
    placeholder: "sk-...",
    isPassword: true,
  },
  {
    key: "EXA_API_KEY",
    title: "Exa API Key",
    description: (
      <>
        Required for enhanced web search capabilities. Get your API key from{" "}
        <ExternalLink href="https://exa.ai">Exa</ExternalLink>
      </>
    ),
    icon: <Icons.Exa />,
    placeholder: "Enter your Exa API key...",
    isPassword: true,
  },
];

export const Route = createFileRoute("/settings/apiKeys")({
  component: RouteComponent,
});

function RouteComponent() {
  const [inputValues, setInputValues] = useState<Record<string, string>>({});

  // Get existing API keys
  const {
    data: existingKeys,
    error,
    isError,
  } = useQuery(convexQuery(api.apiKeys.queries.getAll, {}));
  const { mutateAsync: createApiKey } = useMutation({
    mutationFn: useConvexMutation(api.apiKeys.mutations.create),
  });
  const { mutateAsync: updateApiKey } = useMutation({
    mutationFn: useConvexMutation(api.apiKeys.mutations.update),
  });
  const { mutateAsync: removeApiKey } = useMutation({
    mutationFn: useConvexMutation(api.apiKeys.mutations.remove),
  });

  const updateInputValue = (key: string, value: string) => {
    setInputValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async (config: ApiKeyConfig) => {
    const value = inputValues[config.key]?.trim();
    if (!value) {
      toast.error(`Please enter a valid ${config.title}`);
      return;
    }

    try {
      await createApiKey({
        key: config.key,
        value,
        enabled: true,
      });
      toast.success(`${config.title} saved successfully`);
      updateInputValue(config.key, "");
    } catch (error) {
      toast.error(`Failed to save ${config.title}`);
      console.error(error);
    }
  };

  const handleToggle = async (config: ApiKeyConfig, enabled: boolean) => {
    await updateApiKey({
      key: config.key,
      enabled,
    });
    toast.success(
      `${config.title} ${enabled ? "enabled" : "disabled"} successfully`
    );
  };

  const handleRemove = async (config: ApiKeyConfig) => {
    await removeApiKey({ key: config.key });
    toast.success(`${config.title} removed successfully`);
  };

  const getExistingKey = (key: string) => {
    return existingKeys?.find((existingKey) => existingKey.key === key);
  };

  const renderConfigField = (config: ApiKeyConfig) => {
    const existingKey = getExistingKey(config.key);
    const inputValue = inputValues[config.key] || "";
    const isEnabled = existingKey ? existingKey.enabled : false;

    return (
      <Card key={config.key}>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex flex-col gap-1">
            <CardTitle className="flex items-center gap-1.5">
              {config.icon}
              {config.title}
            </CardTitle>
            <CardDescription>{config.description}</CardDescription>
          </div>
          <div className="flex items-center justify-end">
            <Switch
              id={`toggle-${config.key}`}
              checked={isEnabled}
              onCheckedChange={(checked) => handleToggle(config, checked)}
            />
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 h-full">
          {existingKey?.value ? (
            <ExistingKeyDisplay
              config={config}
              existingKey={existingKey}
              onRemove={() => handleRemove(config)}
            />
          ) : (
            <ApiKeyInput
              config={config}
              value={inputValue}
              onChange={(value) => updateInputValue(config.key, value)}
              onSave={() => handleSave(config)}
            />
          )}
        </CardContent>
      </Card>
    );
  };

  // Show error state if API keys failed to load
  if (error && isError) {
    return (
      <div className="flex flex-col gap-4 h-full">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-destructive font-medium">
                Failed to load API keys
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                {error?.message || "An unexpected error occurred"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="flex flex-col gap-3 h-full overflow-y-auto pr-1">
        {API_KEY_CONFIGS.map(renderConfigField)}
      </div>
    </div>
  );
}
