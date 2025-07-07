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
import { Separator } from "@/components/ui/separator";
import { SaveIcon, TrashIcon, SettingsIcon, GlobeIcon } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";

export const SettingsPanel = () => {
  const [openAIKey, setOpenAIKey] = useState("");
  const [exaKey, setExaKey] = useState("");
  const [openAIBaseUrl, setOpenAIBaseUrl] = useState("");
  const [openAIEmbeddingBaseUrl, setOpenAIEmbeddingBaseUrl] = useState("");

  // Get existing API keys
  const existingKeys = useQuery(api.apiKeys.queries.getAll);
  const createApiKey = useMutation(api.apiKeys.mutations.create);
  const removeApiKey = useMutation(api.apiKeys.mutations.remove);

  // Find existing keys
  const existingOpenAIKey = existingKeys?.find(
    (key) => key.key === "OPENAI_API_KEY",
  );
  const existingExaKey = existingKeys?.find((key) => key.key === "EXA_API_KEY");
  const existingOpenAIBaseUrl = existingKeys?.find(
    (key) => key.key === "OPENAI_BASE_URL",
  );
  const existingOpenAIEmbeddingBaseUrl = existingKeys?.find(
    (key) => key.key === "OPENAI_EMBEDDING_BASE_URL",
  );

  const handleSaveOpenAIKey = async () => {
    if (!openAIKey.trim()) {
      toast.error("Please enter a valid OpenAI API key");
      return;
    }

    try {
      await createApiKey({
        key: "OPENAI_API_KEY",
        value: openAIKey.trim(),
      });
      toast.success("OpenAI API key saved successfully");
      setOpenAIKey("");
    } catch (error) {
      toast.error("Failed to save OpenAI API key");
      console.error(error);
    }
  };

  const handleSaveExaKey = async () => {
    if (!exaKey.trim()) {
      toast.error("Please enter a valid Exa API key");
      return;
    }

    try {
      await createApiKey({
        key: "EXA_API_KEY",
        value: exaKey.trim(),
      });
      toast.success("Exa API key saved successfully");
      setExaKey("");
    } catch (error) {
      toast.error("Failed to save Exa API key");
      console.error(error);
    }
  };

  const handleSaveOpenAIBaseUrl = async () => {
    if (!openAIBaseUrl.trim()) {
      toast.error("Please enter a valid OpenAI Base URL");
      return;
    }

    try {
      await createApiKey({
        key: "OPENAI_BASE_URL",
        value: openAIBaseUrl.trim(),
      });
      toast.success("OpenAI Base URL saved successfully");
      setOpenAIBaseUrl("");
    } catch (error) {
      toast.error("Failed to save OpenAI Base URL");
      console.error(error);
    }
  };

  const handleSaveOpenAIEmbeddingBaseUrl = async () => {
    if (!openAIEmbeddingBaseUrl.trim()) {
      toast.error("Please enter a valid OpenAI Embedding Base URL");
      return;
    }

    try {
      await createApiKey({
        key: "OPENAI_EMBEDDING_BASE_URL",
        value: openAIEmbeddingBaseUrl.trim(),
      });
      toast.success("OpenAI Embedding Base URL saved successfully");
      setOpenAIEmbeddingBaseUrl("");
    } catch (error) {
      toast.error("Failed to save OpenAI Embedding Base URL");
      console.error(error);
    }
  };

  const handleRemoveOpenAIKey = async () => {
    try {
      await removeApiKey({ key: "OPENAI_API_KEY" });
      toast.success("OpenAI API key removed successfully");
    } catch (error) {
      toast.error("Failed to remove OpenAI API key");
      console.error(error);
    }
  };

  const handleRemoveExaKey = async () => {
    try {
      await removeApiKey({ key: "EXA_API_KEY" });
      toast.success("Exa API key removed successfully");
    } catch (error) {
      toast.error("Failed to remove Exa API key");
      console.error(error);
    }
  };

  const handleRemoveOpenAIBaseUrl = async () => {
    try {
      await removeApiKey({ key: "OPENAI_BASE_URL" });
      toast.success("OpenAI Base URL removed successfully");
    } catch (error) {
      toast.error("Failed to remove OpenAI Base URL");
      console.error(error);
    }
  };

  const handleRemoveOpenAIEmbeddingBaseUrl = async () => {
    try {
      await removeApiKey({ key: "OPENAI_EMBEDDING_BASE_URL" });
      toast.success("OpenAI Embedding Base URL removed successfully");
    } catch (error) {
      toast.error("Failed to remove OpenAI Embedding Base URL");
      console.error(error);
    }
  };

  const maskKey = (key: string) => {
    return "*".repeat(key.length);
  };

  const renderConfigField = (
    title: string,
    description: React.ReactNode,
    icon: React.ReactNode,
    currentValue: string | undefined,
    inputValue: string,
    setInputValue: (value: string) => void,
    onSave: () => void,
    onRemove: () => void,
    placeholder: string,
    isPassword: boolean = false,
  ) => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-1 h-full">
        {currentValue ? (
          <div className="flex items-center justify-between p-3 bg-input/80 rounded-md">
            <div className="flex items-center gap-1 truncate">
              <span className="text-sm font-medium">Current Value:</span>
              <span className="text-sm font-mono ">
                {isPassword ? maskKey(currentValue) : currentValue}
              </span>
            </div>
            <Button variant="ghost" size="sm" onClick={onRemove}>
              <TrashIcon className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">{title}</Label>
              <Input
                type={isPassword ? "password" : "text"}
                placeholder={placeholder}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
              />
            </div>
            <Button onClick={onSave} className="w-full">
              <SaveIcon className="h-4 w-4 mr-2" />
              Save {title}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="flex flex-col gap-4 h-full">
      <div>
        <h2 className="text-lg font-semibold">API Keys</h2>
        <p className="text-sm text-muted-foreground">
          Configure your API keys to enable AI models and web search
          functionality.
        </p>
      </div>

      <Separator />

      <ScrollArea
        type="always"
        className="flex-grow h-[calc(100vh-10rem)] pr-3"
      >
        <div className="flex flex-col gap-1">
          {/* OpenAI API Key */}
          {renderConfigField(
            "OpenAI API Key",
            <>
              Required for GPT models and AI-powered features. Get your API key
              from{" "}
              <a
                href="https://platform.openai.com/api-keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline"
              >
                OpenAI Platform
              </a>
            </>,
            <div className="w-6 h-6 bg-green-500 rounded-sm flex items-center justify-center">
              <span className="text-white text-xs font-bold">AI</span>
            </div>,
            existingOpenAIKey?.value,
            openAIKey,
            setOpenAIKey,
            handleSaveOpenAIKey,
            handleRemoveOpenAIKey,
            "sk-...",
            true,
          )}
          {/* OpenAI Base URL */}
          {renderConfigField(
            "OpenAI Base URL",
            "Custom base URL for OpenAI-compatible APIs (e.g., OpenRouter, local deployments). Defaults to OpenRouter if not set.",
            <div className="w-6 h-6 bg-purple-500 rounded-sm flex items-center justify-center">
              <GlobeIcon className="h-3 w-3 text-white" />
            </div>,
            existingOpenAIBaseUrl?.value,
            openAIBaseUrl,
            setOpenAIBaseUrl,
            handleSaveOpenAIBaseUrl,
            handleRemoveOpenAIBaseUrl,
            "https://api.openai.com/v1",
          )}
          {/* OpenAI Embedding Base URL */}
          {renderConfigField(
            "OpenAI Embedding Base URL",
            "Custom base URL for OpenAI embedding models. Leave empty to use the same as OpenAI Base URL.",
            <div className="w-6 h-6 bg-indigo-500 rounded-sm flex items-center justify-center">
              <SettingsIcon className="h-3 w-3 text-white" />
            </div>,
            existingOpenAIEmbeddingBaseUrl?.value,
            openAIEmbeddingBaseUrl,
            setOpenAIEmbeddingBaseUrl,
            handleSaveOpenAIEmbeddingBaseUrl,
            handleRemoveOpenAIEmbeddingBaseUrl,
            "https://api.openai.com/v1",
          )}
          {/* Exa API Key */}
          {renderConfigField(
            "Exa API Key",
            <>
              Required for enhanced web search capabilities. Get your API key
              from{" "}
              <a
                href="https://exa.ai"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline"
              >
                Exa
              </a>
            </>,
            <div className="w-6 h-6 bg-blue-500 rounded-sm flex items-center justify-center">
              <span className="text-white text-xs font-bold">E</span>
            </div>,
            existingExaKey?.value,
            exaKey,
            setExaKey,
            handleSaveExaKey,
            handleRemoveExaKey,
            "Enter your Exa API key...",
            true,
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
