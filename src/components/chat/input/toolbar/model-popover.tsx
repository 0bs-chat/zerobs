import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Hammer, ChevronDownIcon, Search } from "lucide-react";
import { useSetAtom } from "jotai";
import { models } from "../../../../../convex/langchain/models";
import { getTagInfo, hammerTagInfo, thinkingTagInfo } from "@/lib/helpers";
import { api } from "../../../../../convex/_generated/api";
import { useMutation } from "convex/react";
import { newChatAtom } from "@/store/chatStore";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { useState } from "react";

// Placeholder for SearchInput (not found in codebase)
const SearchInput = ({
  searchModel,
  setSearchModel,
}: {
  searchModel: string;
  setSearchModel: (v: string) => void;
}) => (
  <div className="py-2 px-4 flex flex-row items-center gap-0 sticky top-0 z-10 bg-background/70 backdrop-blur-lg border-b border-border">
    <Search className="h-4 w-4 text-muted-foreground" />
    <input
      className="w-full px-2 py-1 outline-none focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none "
      placeholder="Search models..."
      value={searchModel}
      onChange={(e) => setSearchModel(e.target.value)}
    />
  </div>
);

export function ModelPopover({
  selectedModel,
  chatId,
}: {
  selectedModel: string;
  chatId: Id<"chats">;
}) {
  const setNewChat = useSetAtom(newChatAtom);
  const updateChatMutation = useMutation(api.chats.mutations.update);
  const selectedModelConfig = models.find(
    (m) => m.model_name === selectedModel
  );
  const [searchModel, setSearchModel] = useState("");
  const [popoverOpen, setPopoverOpen] = useState(false);

  const handleModelSelect = async (modelName: string) => {
    if (
      chatId === undefined ||
      chatId === null ||
      chatId === "" ||
      chatId === "new"
    ) {
      setNewChat((prev) => ({ ...prev, model: modelName }));
    } else {
      await updateChatMutation({
        chatId,
        updates: { model: modelName },
      });
    }
    setPopoverOpen(false);
  };

  return (
    <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="justify-between gap-2 cursor-pointer bg-muted"
          onClick={() => setPopoverOpen(!popoverOpen)}
        >
          {selectedModelConfig?.label || selectedModel}
          <ChevronDownIcon className="h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-96 h-96 overflow-y-auto p-0 scrollbar-none relative bg-background"
        align="end"
      >
        <SearchInput
          searchModel={searchModel}
          setSearchModel={setSearchModel}
        />

        <div className="space-y-1 p-1">
          {models
            .filter((model) => !model.hidden)
            .filter((model) =>
              model.model_name.toLowerCase().includes(searchModel.toLowerCase())
            )
            .map((model) => (
              <div
                key={model.model}
                className={`flex items-center gap-2 px-3 py-3 cursor-pointer rounded-sm transition-colors justify-between hover:bg-accent/25 dark:hover:bg-accent/60`}
                onClick={() => handleModelSelect(model.model_name)}
              >
                <div className="text-foreground flex gap-2 items-center justify-center ">
                  <img
                    src={model.image}
                    alt={model.label}
                    className={`h-4 w-4 ${
                      ["openai", "x-ai", "openrouter", "anthropic"].includes(
                        model.owner
                      )
                        ? "dark:invert"
                        : ""
                    } `}
                  />
                  {model.label}
                </div>
                <div className="flex flex-row gap-1 items-center opacity-75">
                  {model.modalities
                    ?.filter((modality) => modality !== "text")
                    .map((modality) => {
                      const {
                        icon: Icon,
                        className: IconClassName,
                        parentClassName,
                      } = getTagInfo(modality);
                      return (
                        <div
                          key={modality}
                          className={`p-1 rounded-md ${parentClassName}`}
                        >
                          <Icon className={`h-4 w-4 ${IconClassName}`} />
                        </div>
                      );
                    })}
                  {model.toolSupport && (
                    <div
                      className={`p-1 rounded-md ${hammerTagInfo.parentClassName}`}
                    >
                      <Hammer
                        className={`h-4 w-4 ${hammerTagInfo.className}`}
                      />
                    </div>
                  )}
                  {model.isThinking && (
                    <div
                      className={`p-1 rounded-md ${thinkingTagInfo.parentClassName}`}
                    >
                      <thinkingTagInfo.icon
                        className={`h-4 w-4 ${thinkingTagInfo.className}`}
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
