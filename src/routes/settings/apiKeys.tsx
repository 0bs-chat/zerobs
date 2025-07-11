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
import { SaveIcon, TrashIcon, SettingsIcon, GlobeIcon } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { toast } from "sonner";

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
    title: "OpenAI API Key",
    description: (
      <>
        Required for GPT models and AI-powered features. Get your API key from{" "}
        <a
          href="https://platform.openai.com/api-keys"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 hover:underline"
        >
          OpenAI Platform
        </a>
      </>
    ),
    icon: (
      <div className="w-6 h-6 bg-green-500 rounded-sm flex items-center justify-center">
        <span className="text-white text-xs font-bold">AI</span>
      </div>
    ),
    placeholder: "sk-...",
    isPassword: true,
  },
  {
    key: "OPENAI_BASE_URL",
    title: "OpenAI Base URL",
    description:
      "Custom base URL for OpenAI-compatible APIs (e.g., OpenRouter, local deployments). Defaults to OpenRouter if not set.",
    icon: (
      <div className="w-6 h-6 bg-purple-500 rounded-sm flex items-center justify-center">
        <GlobeIcon className="h-3 w-3 text-white" />
      </div>
    ),
    placeholder: "https://api.openai.com/v1",
  },
  {
    key: "OPENAI_EMBEDDING_BASE_URL",
    title: "OpenAI Embedding Base URL",
    description:
      "Custom base URL for OpenAI embedding models. Leave empty to use the same as OpenAI Base URL.",
    icon: (
      <div className="w-6 h-6 bg-indigo-500 rounded-sm flex items-center justify-center">
        <SettingsIcon className="h-3 w-3 text-white" />
      </div>
    ),
    placeholder: "https://api.openai.com/v1",
  },
  {
    key: "GOOGLE_EMBEDDING_API_KEY",
    title: "Google Embedding API Key",
    description:
      "Required for Google embedding models. Get your API key from Google Cloud Console.",
    icon: (
      <div className="w-6 h-6 bg-red-500 rounded-sm flex items-center justify-center">
        <span className="text-white text-xs font-bold">G</span>
      </div>
    ),
    placeholder: "sk-...",
    isPassword: true,
  },
  {
    key: "OPENAI_EMBEDDING_API_KEY",
    title: "OpenAI Embedding API Key",
    description:
      "Required for OpenAI embedding models. Get your API key from OpenAI Platform.",
    icon: (
      <div className="w-6 h-6 bg-indigo-500 rounded-sm flex items-center justify-center">
        <SettingsIcon className="h-3 w-3 text-white" />
      </div>
    ),
    placeholder: "sk-...",
    isPassword: true,
  },
  {
    key: "EXA_API_KEY",
    title: "Exa API Key",
    description: (
      <>
        Required for enhanced web search capabilities. Get your API key from{" "}
        <a
          href="https://exa.ai"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 hover:underline"
        >
          Exa
        </a>
      </>
    ),
    icon: (
      <div className="w-6 h-6 bg-blue-500 rounded-sm flex items-center justify-center">
        <span className="text-white text-xs font-bold">E</span>
      </div>
    ),
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
  const existingKeys = useQuery(api.apiKeys.queries.getAll);
  const createApiKey = useMutation(api.apiKeys.mutations.create);
  const removeApiKey = useMutation(api.apiKeys.mutations.remove);

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
      });
      toast.success(`${config.title} saved successfully`);
      updateInputValue(config.key, "");
    } catch (error) {
      toast.error(`Failed to save ${config.title}`);
      console.error(error);
    }
  };

  const handleRemove = async (config: ApiKeyConfig) => {
    try {
      await removeApiKey({ key: config.key });
      toast.success(`${config.title} removed successfully`);
    } catch (error) {
      toast.error(`Failed to remove ${config.title}`);
      console.error(error);
    }
  };

  const maskKey = (key: string) => {
    return "*".repeat(key.length);
  };

  const getExistingKey = (key: string) => {
    return existingKeys?.find((existingKey) => existingKey.key === key);
  };

  const renderConfigField = (config: ApiKeyConfig) => {
    const existingKey = getExistingKey(config.key);
    const inputValue = inputValues[config.key] || "";

    return (
      <Card key={config.key}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {config.icon}
            {config.title}
          </CardTitle>
          <CardDescription>{config.description}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-1 h-full">
          {existingKey?.value ? (
            <div className="flex items-center justify-between p-3 bg-input/80 rounded-md">
              <div className="flex items-center gap-1 truncate">
                <span className="text-sm font-medium">Current Value:</span>
                <span className="text-sm font-mono ">
                  {config.isPassword
                    ? maskKey(existingKey.value)
                    : existingKey.value}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRemove(config)}
              >
                <TrashIcon className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-muted-foreground">
                  {config.title}
                </Label>
                <Input
                  type={config.isPassword ? "password" : "text"}
                  placeholder={config.placeholder}
                  value={inputValue}
                  onChange={(e) => updateInputValue(config.key, e.target.value)}
                />
              </div>
              <Button onClick={() => handleSave(config)} className="w-full">
                <SaveIcon className="h-4 w-4 mr-2" />
                Save {config.title}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="flex flex-col gap-4 h-full ">
      <div className="flex flex-col gap-3 h-full overflow-y-auto pr-1">
        {API_KEY_CONFIGS.map(renderConfigField)}
      </div>
    </div>
  );
}
